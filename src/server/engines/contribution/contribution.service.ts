import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { CommissionService } from '@server/engines/commission/commission.service';
import { Prisma, ContributionStatus } from '@prisma/client';

export const MIN_CONTRIBUTION = 100000;
export const CONTRIBUTION_MULTIPLE = 100000;

@Injectable()
export class ContributionService {
  private readonly logger = new Logger(ContributionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Authoritative validation according to Product 360:
   * Minimum: Rs. 1,00,000
   * Exact multiple of Rs. 1,00,000
   */
  validateContributionAmount(amount: number | Prisma.Decimal): boolean {
    const num = typeof amount === 'number' ? amount : Number(amount);
    if (!num || isNaN(num) || num < MIN_CONTRIBUTION) {
      return false;
    }
    return num % CONTRIBUTION_MULTIPLE === 0;
  }

  /**
   * Assert validity or throw 400 BadRequestException
   */
  assertValidContributionAmount(amount: number | Prisma.Decimal) {
    if (!this.validateContributionAmount(amount)) {
      throw new BadRequestException(
        `Contribution amount must be at least ₹${MIN_CONTRIBUTION.toLocaleString('en-IN')} and an exact multiple of ₹${CONTRIBUTION_MULTIPLE.toLocaleString('en-IN')}. Examples: ₹1,00,000, ₹2,00,000, ₹5,00,000.`
      );
    }
  }

  /**
   * Creates a new Contribution Fund record.
   * New contributions start in PENDING state until verified and approved by an administrator.
   */
  async createContribution(data: {
    shareholderId: string;
    amount: number | Prisma.Decimal;
    mode?: string;
    date?: Date;
    paymentProofUrl?: string;
    paymentProofFile?: string;
    issuedAgreement?: boolean;
    issuedCheque?: boolean;
    validityMonths?: number;
  }, actorId?: string) {
    this.assertValidContributionAmount(data.amount);

    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: data.shareholderId },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder account not found');
    }

    if (shareholder.status === 'BLOCKED' || shareholder.status === 'DELETED') {
      throw new BadRequestException('Cannot create contribution for a blocked or deleted account');
    }

    const contribution = await this.prisma.contribution.create({
      data: {
        shareholderId: data.shareholderId,
        amount: new Prisma.Decimal(data.amount),
        mode: data.mode || 'Bank Transfer',
        date: data.date ? new Date(data.date) : new Date(),
        status: ContributionStatus.PENDING,
        paymentProofUrl: data.paymentProofUrl || null,
        paymentProofFile: data.paymentProofFile || null,
        issuedAgreement: !!data.issuedAgreement,
        issuedCheque: !!data.issuedCheque,
        validityMonths: data.validityMonths ?? 12,
      },
    });

    await this.syncContributionSummary(data.shareholderId);

    if (actorId) {
      await this.auditService.logAction({
        shareholderId: actorId,
        action: 'CREATE_CONTRIBUTION_REQUEST',
        entityType: 'Contribution',
        entityId: contribution.id,
        newValue: JSON.stringify({
          shareholderId: data.shareholderId,
          amount: Number(data.amount),
          status: 'PENDING',
        }),
      });
    }

    return contribution;
  }

  /**
   * Approves a contribution fund.
   * Once approved, the record becomes financially immutable.
   * Activates the shareholder account state to CONTRIBUTION_ACTIVE.
   */
  async approveContribution(contributionId: string, adminId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: { shareholder: true },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution record not found');
    }

    if (contribution.status === ContributionStatus.APPROVED) {
      throw new BadRequestException('Contribution is already approved and immutable');
    }

    // Validate amount integrity again
    this.assertValidContributionAmount(contribution.amount);

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const contrib = await tx.contribution.update({
        where: { id: contributionId },
        data: {
          status: ContributionStatus.APPROVED,
          approvedById: adminId,
          approvedAt: now,
          activeDate: now,
          effectiveDate: now,
        },
      });

      // Update shareholder account state to CONTRIBUTION_ACTIVE
      await tx.shareholder.update({
        where: { id: contribution.shareholderId },
        data: {
          status: 'CONTRIBUTION_ACTIVE',
          accountType: 'CONTRIBUTION',
        },
      });

      // Also create/sync Investment record for legacy engine compatibility
      await tx.investment.create({
        data: {
          shareholderId: contribution.shareholderId,
          amount: contribution.amount,
          dailyProfitRate: new Prisma.Decimal('0.001667'), // 5% monthly equivalent
          status: 'ACTIVE',
          startDate: now,
          validityMonths: contribution.validityMonths ?? 12,
        },
      });

      return contrib;
    });

    await this.syncContributionSummary(contribution.shareholderId);

    // Calculate Gratitude Share for upstream ancestors up to 12 levels
    try {
      await this.commissionService.calculateGratitudeShareForContribution(contribution.id);
    } catch (err: any) {
      this.logger.error(`Error calculating Gratitude Share for contribution ${contribution.id}: ${err.message}`);
    }

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'APPROVE_CONTRIBUTION',
      entityType: 'Contribution',
      entityId: contribution.id,
      oldValue: 'PENDING',
      newValue: 'APPROVED',
      reason: 'Administrator verified payment receipt and activated Contribution Fund',
    });

    return updated;
  }

  /**
   * Rejects a pending contribution fund.
   */
  async rejectContribution(contributionId: string, reason: string, adminId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    if (contribution.status !== ContributionStatus.PENDING) {
      throw new BadRequestException('Only pending contributions can be rejected');
    }

    const updated = await this.prisma.contribution.update({
      where: { id: contributionId },
      data: {
        status: ContributionStatus.REJECTED,
        rejectionReason: reason || 'Contribution verification rejected by Administrator',
      },
    });

    await this.syncContributionSummary(contribution.shareholderId);

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'REJECT_CONTRIBUTION',
      entityType: 'Contribution',
      entityId: contribution.id,
      oldValue: 'PENDING',
      newValue: 'REJECTED',
      reason,
    });

    return updated;
  }

  /**
   * Get active approved contributions for an account.
   */
  async getActiveApprovedContributions(shareholderId: string) {
    return this.prisma.contribution.findMany({
      where: {
        shareholderId,
        status: ContributionStatus.APPROVED,
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Get total active contribution fund sum for an account.
   */
  async getTotalActiveContributionAmount(shareholderId: string): Promise<number> {
    const result = await this.prisma.contribution.aggregate({
      where: {
        shareholderId,
        status: ContributionStatus.APPROVED,
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount || 0);
  }

  /**
   * Syncs the ContributionSummary table.
   */
  async syncContributionSummary(shareholderId: string) {
    const contributions = await this.prisma.contribution.findMany({
      where: { shareholderId },
    });

    let approvedSum = new Prisma.Decimal(0);
    let pendingSum = new Prisma.Decimal(0);
    let rejectedSum = new Prisma.Decimal(0);

    for (const c of contributions) {
      if (c.status === ContributionStatus.APPROVED) {
        approvedSum = approvedSum.add(c.amount);
      } else if (c.status === ContributionStatus.PENDING) {
        pendingSum = pendingSum.add(c.amount);
      } else if (c.status === ContributionStatus.REJECTED) {
        rejectedSum = rejectedSum.add(c.amount);
      }
    }

    return this.prisma.contributionSummary.upsert({
      where: { shareholderId },
      create: {
        shareholderId,
        totalApproved: approvedSum,
        totalPending: pendingSum,
        totalRejected: rejectedSum,
        lastUpdated: new Date(),
      },
      update: {
        totalApproved: approvedSum,
        totalPending: pendingSum,
        totalRejected: rejectedSum,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * List contributions with optional filters and pagination
   */
  async getContributions(
    shareholderId?: string,
    status?: ContributionStatus,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (shareholderId) where.shareholderId = shareholderId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.contribution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          shareholder: {
            select: { id: true, shareholderId: true, name: true, phone: true },
          },
        },
      }),
      this.prisma.contribution.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * Get contribution details by ID
   */
  async getContributionById(id: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id },
      include: {
        shareholder: {
          select: { id: true, shareholderId: true, name: true, phone: true },
        },
      },
    });

    if (!contribution) {
      throw new NotFoundException(`Contribution ${id} not found`);
    }

    return contribution;
  }

  /**
   * Get contribution summary for a shareholder
   */
  async getSummary(shareholderId: string) {
    const summary = await this.prisma.contributionSummary.findUnique({
      where: { shareholderId },
    });

    if (!summary) {
      return {
        shareholderId,
        totalApproved: 0,
        totalPending: 0,
        totalRejected: 0,
      };
    }

    return summary;
  }
}

