import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { SmsService } from '@server/sms/sms.service';
import { CommissionService } from '@server/engines/commission/commission.service';
import { BusinessConfigService } from '@server/business-config/business-config.service';
import { ReferralTreeService } from '@server/engines/referral-tree/referral-tree.service';
import { InvestorsService } from '@server/engines/investors/investors.service';
import { Prisma, RegistrationStatus, AccountType, UserStatus, ContributionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export interface SubmitRegistrationDto {
  name: string;
  phone: string;
  accountType?: AccountType;
  referrerId?: string;
  contributionAmount?: number;
  paymentProofUrl?: string;
  paymentProofFileName?: string;
  notes?: string;
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  // Active status set eligible for referring new members
  private readonly ELIGIBLE_REFERRER_STATUSES: UserStatus[] = [
    UserStatus.ACTIVE,
    UserStatus.ZERO_ACTIVE,
    UserStatus.CONTRIBUTION_ACTIVE,
    UserStatus.RESTORED,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly smsService: SmsService,
    private readonly commissionService: CommissionService,
    private readonly businessConfigService: BusinessConfigService,
    private readonly referralTreeService: ReferralTreeService,
    private readonly investorsService: InvestorsService,
  ) {}

  /**
   * Helper to normalize and validate 10-digit Indian phone numbers
   */
  private normalizePhone(rawPhone: string): string {
    let cleaned = (rawPhone || '').replace(/[^0-9]/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = cleaned.slice(2);
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
    if (cleaned.length !== 10) {
      throw new BadRequestException(`Invalid phone number: ${rawPhone}. Please provide a valid 10-digit mobile number.`);
    }
    return cleaned;
  }

  /**
   * Public or Authenticated Submissions: Prospective members or sponsors submit registration request
   */
  async submitRegistration(dto: SubmitRegistrationDto, actorId?: string) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Applicant full name is required.');
    }
    const name = dto.name.trim();
    if (name.length < 2) {
      throw new BadRequestException('Applicant name must be at least 2 characters long.');
    }

    const phone = this.normalizePhone(dto.phone);
    const accountType = dto.accountType || AccountType.CONTRIBUTION;

    // Check if phone number is already registered to an active shareholder account
    const existingUser = await this.prisma.shareholder.findFirst({
      where: { phone },
    });
    if (existingUser) {
      throw new ConflictException(`An account with phone number ${phone} is already registered (User ID: ${existingUser.shareholderId}).`);
    }

    // Check if a registration request is already pending review for this phone
    const existingRequest = await this.prisma.registrationRequest.findFirst({
      where: {
        phone,
        status: {
          in: [RegistrationStatus.PENDING_REVIEW, RegistrationStatus.PENDING_ADMIN_REVIEW],
        },
      },
    });
    if (existingRequest) {
      throw new ConflictException(`A registration request for phone ${phone} is already pending admin review.`);
    }

    // Validate contribution amount strictly on the server
    let contribDecimal: Prisma.Decimal | null = null;
    let paymentProofUrl: string | null = null;
    let paymentProofFileName: string | null = null;

    if (accountType === AccountType.CONTRIBUTION) {
      const amount = Number(dto.contributionAmount);
      if (
        !amount ||
        !Number.isFinite(amount) ||
        !Number.isInteger(amount) ||
        amount < 100000 ||
        amount % 100000 !== 0 ||
        amount > 1000000000
      ) {
        throw new BadRequestException(
          'Contribution amount must be at least ₹1,00,000 and an exact integer multiple of ₹1,00,000 (e.g., ₹1,00,000, ₹2,00,000).'
        );
      }
      contribDecimal = new Prisma.Decimal(amount);
      paymentProofUrl = dto.paymentProofUrl || null;
      paymentProofFileName = dto.paymentProofFileName || null;
    } else if (accountType === AccountType.ZERO_CONTRIBUTION) {
      // Zero Contribution accounts must NOT have an initial contribution fund
      contribDecimal = null;
      paymentProofUrl = null;
      paymentProofFileName = null;
    } else {
      throw new BadRequestException(`Unsupported account type: ${accountType}`);
    }

    // Validate referrer strictly if provided
    let verifiedReferrerId: string | null = null;
    if (dto.referrerId && dto.referrerId.trim()) {
      const refQuery = dto.referrerId.trim();
      const referrer = await this.prisma.shareholder.findFirst({
        where: {
          OR: [
            { id: refQuery },
            { shareholderId: { equals: refQuery, mode: 'insensitive' } },
            { referralCode: { equals: refQuery, mode: 'insensitive' } },
          ],
        },
      });

      if (!referrer) {
        throw new BadRequestException(`Referrer code or ID "${refQuery}" was not found.`);
      }

      if (!this.ELIGIBLE_REFERRER_STATUSES.includes(referrer.status)) {
        throw new BadRequestException(
          `Referrer ${referrer.shareholderId} (${referrer.name}) has status "${referrer.status}" and cannot sponsor new members.`
        );
      }

      verifiedReferrerId = referrer.id;
    }

    // Persist registration request with status PENDING_ADMIN_REVIEW
    const request = await this.prisma.registrationRequest.create({
      data: {
        name,
        phone,
        accountType,
        referrerId: verifiedReferrerId,
        contributionAmount: contribDecimal,
        paymentProofUrl,
        paymentProofFileName,
        status: RegistrationStatus.PENDING_ADMIN_REVIEW,
      },
      include: {
        referrer: {
          select: { id: true, shareholderId: true, name: true, phone: true },
        },
      },
    });

    await this.auditService.logAction({
      shareholderId: actorId || verifiedReferrerId || 'PUBLIC',
      action: 'SUBMIT_REGISTRATION_REQUEST',
      entityType: 'RegistrationRequest',
      entityId: request.id,
      newValue: `Name: ${name}, Phone: ${phone}, Type: ${accountType}, Amount: ${dto.contributionAmount || 0}, Referrer: ${verifiedReferrerId || 'NONE'}`,
    });

    this.logger.log(`Registration request #${request.id} submitted for ${name} (${phone}) [PENDING_ADMIN_REVIEW].`);
    return request;
  }

  /**
   * Helper to verify a referrer in real-time for frontend UI
   */
  async verifyReferrer(codeOrId: string) {
    if (!codeOrId || !codeOrId.trim()) {
      return { valid: false, message: 'Referrer code is required' };
    }
    const q = codeOrId.trim();
    const referrer = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { id: q },
          { shareholderId: { equals: q, mode: 'insensitive' } },
          { referralCode: { equals: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, shareholderId: true, name: true, status: true },
    });

    if (!referrer) {
      return { valid: false, message: 'Referrer not found' };
    }

    if (!this.ELIGIBLE_REFERRER_STATUSES.includes(referrer.status)) {
      return {
        valid: false,
        message: `Referrer account is ${referrer.status}`,
      };
    }

    return {
      valid: true,
      id: referrer.id,
      shareholderId: referrer.shareholderId,
      name: referrer.name,
    };
  }

  /**
   * List registration requests with filtering, searching, and pagination
   */
  async getRegistrations(
    status?: RegistrationStatus | string,
    search?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status && status !== 'ALL') {
      if (status === 'PENDING_REVIEW' || status === 'PENDING_ADMIN_REVIEW') {
        where.status = {
          in: [RegistrationStatus.PENDING_REVIEW, RegistrationStatus.PENDING_ADMIN_REVIEW],
        };
      } else {
        where.status = status;
      }
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.registrationRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: {
            select: { id: true, shareholderId: true, name: true, phone: true },
          },
          reviewedBy: {
            select: { id: true, shareholderId: true, name: true },
          },
        },
      }),
      this.prisma.registrationRequest.count({ where }),
    ]);

    // Query SMS delivery logs for approved items to show SMS delivery status in queue
    const itemsWithSms = await Promise.all(
      items.map(async (item) => {
        let lastSms: any = null;
        if (item.status === RegistrationStatus.APPROVED && item.createdShareholderId) {
          lastSms = await this.prisma.smsLog.findFirst({
            where: { shareholderId: item.createdShareholderId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, status: true, retryCount: true, createdAt: true },
          });
        }
        return {
          ...item,
          smsStatus: lastSms?.status || null,
          smsLogId: lastSms?.id || null,
          smsRetryCount: lastSms?.retryCount || 0,
        };
      })
    );

    return {
      items: itemsWithSms,
      total,
      page,
      lastPage: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get registration request details by ID
   */
  async getRegistrationById(id: string) {
    const request = await this.prisma.registrationRequest.findUnique({
      where: { id },
      include: {
        referrer: {
          select: { id: true, shareholderId: true, name: true, phone: true, status: true },
        },
        reviewedBy: {
          select: { id: true, shareholderId: true, name: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Registration request ${id} not found`);
    }

    let smsLogs: any[] = [];
    if (request.createdShareholderId) {
      smsLogs = await this.prisma.smsLog.findMany({
        where: { shareholderId: request.createdShareholderId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    }

    return {
      ...request,
      smsLogs,
    };
  }

  /**
   * Helper to generate a temporary alphanumeric password
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = 'Star@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  /**
   * Authoritative Admin Approval:
   * 1. Idempotent check (returns existing account if already approved)
   * 2. Re-validates referrer status
   * 3. Atomically claims request with conditional row update
   * 4. Sequential ID generated via BusinessConfigService
   * 5. Creates Shareholder, ReferralRelationship edge, and Contribution inside unified transaction
   * 6. Syncs ContributionSummary & InvestorProfile
   * 7. Dispatches SMS with isolated error handling
   * 8. Sanitizes response (NEVER returns plaintext password or passwordHash)
   */
  async approveRegistration(id: string, adminId: string) {
    const request = await this.prisma.registrationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Registration request ${id} not found.`);
    }

    // Idempotency: If already approved, return the existing shareholder safely without duplicate creation
    if (request.status === RegistrationStatus.APPROVED) {
      if (request.createdShareholderId) {
        const existing = await this.prisma.shareholder.findUnique({
          where: { id: request.createdShareholderId },
          select: {
            id: true,
            shareholderId: true,
            name: true,
            phone: true,
            role: true,
            status: true,
            accountType: true,
            referralCode: true,
            parentId: true,
            createdAt: true,
          },
        });
        return {
          success: true,
          alreadyApproved: true,
          message: 'Registration request has already been approved.',
          shareholderId: existing?.shareholderId,
          createdShareholder: existing,
        };
      }
      return {
        success: true,
        alreadyApproved: true,
        message: 'Registration request was already approved.',
      };
    }

    if (request.status === RegistrationStatus.REJECTED) {
      throw new BadRequestException('Cannot approve a registration request that has already been rejected.');
    }

    // Re-verify referrer is still active and valid at approval time
    if (request.referrerId) {
      const parent = await this.prisma.shareholder.findUnique({
        where: { id: request.referrerId },
      });
      if (!parent || !this.ELIGIBLE_REFERRER_STATUSES.includes(parent.status)) {
        throw new BadRequestException(
          `Referrer ${parent?.shareholderId || request.referrerId} is no longer active and cannot sponsor this account.`
        );
      }
    }

    // Generate sequential Shareholder ID via BusinessConfigService
    const shareholderId = await this.businessConfigService.generateNextUserId();
    const referralCode = shareholderId; // Standard: referralCode equals shareholderId
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const now = new Date();

    const isZeroContribution = request.accountType === AccountType.ZERO_CONTRIBUTION;
    const initialStatus = isZeroContribution ? UserStatus.ZERO_ACTIVE : UserStatus.CONTRIBUTION_ACTIVE;

    // Execute atomic creation inside a unified Prisma transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic conditional update to claim request and eliminate race conditions
      const claim = await tx.registrationRequest.updateMany({
        where: {
          id,
          status: { in: [RegistrationStatus.PENDING_REVIEW, RegistrationStatus.PENDING_ADMIN_REVIEW] },
        },
        data: {
          status: RegistrationStatus.APPROVED,
          reviewedById: adminId,
          reviewedAt: now,
        },
      });

      if (claim.count === 0) {
        // Another concurrent approval transaction beat us to claiming this request
        const current = await tx.registrationRequest.findUnique({ where: { id } });
        if (current?.status === RegistrationStatus.APPROVED && current.createdShareholderId) {
          const existing = await tx.shareholder.findUnique({
            where: { id: current.createdShareholderId },
            select: {
              id: true,
              shareholderId: true,
              name: true,
              phone: true,
              role: true,
              status: true,
              accountType: true,
              referralCode: true,
              parentId: true,
              createdAt: true,
            },
          });
          return {
            alreadyProcessed: true,
            shareholderId: existing?.shareholderId,
            newShareholder: existing,
            contributionRecord: null,
          };
        }
        throw new BadRequestException(`Registration request is not in pending review state (current status: ${current?.status})`);
      }

      // 1. Create Shareholder record
      const newShareholder = await tx.shareholder.create({
        data: {
          shareholderId,
          name: request.name,
          phone: request.phone,
          passwordHash,
          referralCode,
          parentId: request.referrerId,
          accountType: request.accountType,
          status: initialStatus,
          holdingBalance: new Prisma.Decimal(0),
        },
      });

      // 2. Create authoritative edge in ReferralRelationship table
      if (request.referrerId) {
        await tx.referralRelationship.upsert({
          where: { childId: newShareholder.id },
          create: {
            parentId: request.referrerId,
            childId: newShareholder.id,
            referralDate: now,
            status: 'ACTIVE',
          },
          update: {
            parentId: request.referrerId,
            status: 'ACTIVE',
          },
        });
      }

      // 3. If standard CONTRIBUTION account, create approved Contribution, Investment, and sync ContributionSummary
      let contributionRecord: any = null;
      if (!isZeroContribution && request.contributionAmount) {
        contributionRecord = await tx.contribution.create({
          data: {
            shareholderId: newShareholder.id,
            amount: request.contributionAmount,
            mode: 'BANK_TRANSFER',
            date: now,
            effectiveDate: now,
            activeDate: now,
            status: ContributionStatus.APPROVED,
            approvedById: adminId,
            approvedAt: now,
            paymentProofUrl: request.paymentProofUrl,
            validityMonths: 12,
          },
        });

        // Investment for legacy dashboard compatibility
        await tx.investment.create({
          data: {
            shareholderId: newShareholder.id,
            amount: request.contributionAmount,
            dailyProfitRate: new Prisma.Decimal('0.001667'),
            status: 'ACTIVE',
            startDate: now,
            validityMonths: 12,
          },
        });

        // Initialize ContributionSummary
        await tx.contributionSummary.upsert({
          where: { shareholderId: newShareholder.id },
          create: {
            shareholderId: newShareholder.id,
            totalApproved: request.contributionAmount,
            totalPending: new Prisma.Decimal(0),
            totalRejected: new Prisma.Decimal(0),
            lastUpdated: now,
          },
          update: {
            totalApproved: request.contributionAmount,
            lastUpdated: now,
          },
        });
      }

      // 4. Link created shareholder to registration request
      await tx.registrationRequest.update({
        where: { id },
        data: {
          createdShareholderId: newShareholder.id,
        },
      });

      // 5. Insert immutable Audit Log
      await tx.auditLog.create({
        data: {
          shareholderId: adminId,
          action: 'APPROVE_REGISTRATION_REQUEST',
          entityType: 'RegistrationRequest',
          entityId: id,
          oldValue: request.status,
          newValue: `APPROVED: User ${shareholderId} (${newShareholder.id})`,
          createdAt: now,
        },
      });

      return {
        alreadyProcessed: false,
        shareholderId,
        newShareholder,
        contributionRecord,
      };
    });

    if (result.alreadyProcessed) {
      return {
        success: true,
        alreadyApproved: true,
        shareholderId: result.shareholderId,
        createdShareholder: result.newShareholder,
      };
    }

    // 6. Post-transaction financial syncs (isolated from core account creation)
    try {
      await this.investorsService.syncInvestorProfileAndSummary(result.newShareholder.id);
    } catch (syncErr: any) {
      this.logger.error(`Error syncing investor profile for ${result.newShareholder.id}: ${syncErr.message}`);
    }

    if (result.contributionRecord) {
      try {
        await this.commissionService.calculateGratitudeShareForContribution(result.contributionRecord.id);
      } catch (commErr: any) {
        this.logger.error(`Error calculating Gratitude Share for new contribution ${result.contributionRecord.id}: ${commErr.message}`);
      }
    }

    // 7. SMS dispatch with provider failure isolation (account creation remains successful if SMS fails)
    let smsStatus = 'PENDING';
    try {
      await this.smsService.sendCredentialsSms(request.phone, shareholderId, tempPassword, result.newShareholder.id);
      smsStatus = 'SENT';
      if (result.contributionRecord) {
        await this.smsService.sendPaymentReceiptSms(
          request.phone,
          shareholderId,
          Number(result.contributionRecord.amount),
          result.newShareholder.id,
        );
      }
    } catch (smsErr: any) {
      smsStatus = 'FAILED';
      this.logger.error(`SMS dispatch failed upon approving registration ${id}: ${smsErr.message}`);
    }

    this.logger.log(`Registration #${id} successfully approved. Created User ${shareholderId}. SMS: ${smsStatus}.`);

    // 8. Security: Sanitize output; NEVER expose tempPassword or passwordHash in API response
    const sanitizedShareholder = { ...result.newShareholder };
    delete (sanitizedShareholder as any).passwordHash;

    return {
      success: true,
      shareholderId,
      smsStatus,
      createdShareholder: sanitizedShareholder,
    };
  }

  /**
   * Rejects a registration request with an optional reason (Idempotent & Audited)
   */
  async rejectRegistration(id: string, adminId: string, reason?: string) {
    const request = await this.prisma.registrationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Registration request ${id} not found.`);
    }

    // Idempotency: If already rejected, return gracefully
    if (request.status === RegistrationStatus.REJECTED) {
      return {
        success: true,
        alreadyRejected: true,
        message: 'Registration request was already rejected.',
        request,
      };
    }

    if (request.status === RegistrationStatus.APPROVED) {
      throw new BadRequestException('Cannot reject a registration request that has already been approved and activated.');
    }

    const updated = await this.prisma.registrationRequest.update({
      where: { id },
      data: {
        status: RegistrationStatus.REJECTED,
        rejectionReason: reason || 'Application rejected by administrator',
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'REJECT_REGISTRATION_REQUEST',
      entityType: 'RegistrationRequest',
      entityId: id,
      oldValue: request.status,
      newValue: 'REJECTED',
      reason: reason || 'Application rejected by admin',
    });

    this.logger.log(`Rejected registration request #${id}`);
    return {
      success: true,
      request: updated,
    };
  }
}
