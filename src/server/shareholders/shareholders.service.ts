import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { ReferralTreeService } from '@server/engines/referral-tree/referral-tree.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { BusinessConfigService } from '@server/business-config/business-config.service';
import { Role, UserStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { MlmService } from '@server/engines/mlm/mlm.service';
import { InvestorsService } from '@server/engines/investors/investors.service';
import { SmsService } from '@server/sms/sms.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referralTreeService: ReferralTreeService,
    private readonly auditService: AuditService,
    private readonly businessConfigService: BusinessConfigService,
    private readonly mlmService: MlmService,
    private readonly investorsService: InvestorsService,
    private readonly smsService: SmsService,
  ) {}

  async getUsers(search?: string, role?: Role, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (role) where.role = role;
    if (status === 'DELETED') {
      where.status = 'DELETED';
    } else if (status === 'ZERO_CONTRIBUTION') {
      where.accountType = 'ZERO_CONTRIBUTION';
      where.status = { not: 'DELETED' };
    } else if (status === 'ACTIVE') {
      where.accountType = 'CONTRIBUTION';
      where.status = { not: 'DELETED' };
    } else if (status) {
      where.status = status as UserStatus;
    } else {
      where.status = { not: 'DELETED' };
    }
    if (search) {
      where.OR = [
        { shareholderId: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { referralCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.shareholder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          
          name: true,
          shareholderId: true,
          phone: true,
          role: true,
          status: true,
          referralCode: true,
          parentId: true,
          parent: {
            select: {
              id: true,
              shareholderId: true,
              name: true,
            },
          },
  
          createdAt: true,
          disabledAt: true,
          
          
          accountType: true,
          withholdingPercentage: true,
          dob: true,
          pan: true,
          permissions: true,
          addressBuilding: true,
          addressArea: true,
          addressCity: true,
          addressDistrict: true,
          addressPincode: true,
          addressState: true,
          bankAccountName: true,
          bankAccountNumber: true,
          bankName: true,
          bankBranch: true,
          bankIfsc: true,
          contributions: true,
        },
      }),
      this.prisma.shareholder.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async checkCircularReference(shareholderId: string, proposedParentId: string): Promise<boolean> {
    if (shareholderId === proposedParentId) return true;
    let currentId: string | null = proposedParentId;
    while (currentId) {
      const parent: { parentId: string | null } | null = await this.prisma.shareholder.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      if (!parent) break;
      if (parent.parentId === shareholderId) return true;
      currentId = parent.parentId;
    }
    return false;
  }

  async validateReferral(code: string) {
    const searchCode = (code || '').trim();
    if (!searchCode) {
      throw new NotFoundException('Referrer ID / Code is required');
    }

    if (['none', 'null', 'root', '-', 'direct'].includes(searchCode.toLowerCase())) {
      return { name: 'None (Direct / Root)', shareholderId: '', referralCode: '' };
    }

    const parent = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { shareholderId: { equals: searchCode, mode: 'insensitive' } },
          { referralCode: { equals: searchCode, mode: 'insensitive' } },
          { id: searchCode },
        ],
      },
      select: { name: true, shareholderId: true, referralCode: true }
    });

    if (!parent) {
      throw new NotFoundException('Invalid Referral ID / Shareholder ID');
    }
    return { name: parent.name, shareholderId: parent.shareholderId, referralCode: parent.referralCode || parent.shareholderId };
  }

  async generateNextShareholderId() {
    try {
      const nextId = await this.businessConfigService.previewNextUserId();
      return { nextId };
    } catch (e) {
      return { nextId: 'SH100001' };
    }
  }

  async validateUserData(data: any) {
    const errors: Record<string, string> = {};

    // Trim whitespace
    const name = typeof data.name === 'string' ? data.name.trim() : (
      `${data.firstName || ''} ${data.lastName || ''}`.trim()
    );
    const shareholderId = typeof data.shareholderId === 'string' ? data.shareholderId.trim().toLowerCase() : '';
    const phone = typeof data.phone === 'string' ? data.phone.replace(/[^0-9+]/g, '') : '';

    // Address combination
    const building = typeof data.addressBuilding === 'string' ? data.addressBuilding.trim() : '';
    const area = typeof data.addressArea === 'string' ? data.addressArea.trim() : '';
    const city = typeof data.addressCity === 'string' ? data.addressCity.trim() : '';
    const district = typeof data.addressDistrict === 'string' ? data.addressDistrict.trim() : '';
    const state = typeof data.addressState === 'string' ? data.addressState.trim() : '';
    const pincode = typeof data.addressPincode === 'string' ? data.addressPincode.trim() : '';
    const combinedAddress = [building, area, city, district, state, pincode].filter(Boolean).join(', ');

    // Name validation
    if (!name) {
      errors.name = 'Name is required';
    } else {
      const alphaRegex = /^[A-Za-z\s.'-]+$/;
      if (!alphaRegex.test(name)) {
        errors.name = 'Only alphabets and spaces allowed in Name';
      } else if (name.length < 2 || name.length > 100) {
        errors.name = 'Name must be between 2 and 100 characters';
      }
    }

    const isAdminRole = data.role === 'ADMIN' || data.role === 'SUPER_ADMIN';

    // PAN Card validation (AAAAA9999A) & Uniqueness
    if (data.pan) {
      const panClean = data.pan.trim().toUpperCase();
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(panClean)) {
        errors.pan = 'Invalid PAN format. Standard format: AAAAA9999A (e.g. ABCDE1234F)';
      } else {
        const existingPan = await this.prisma.shareholder.findFirst({
          where: {
            pan: { equals: panClean, mode: 'insensitive' },
            ...(data.excludeUserId ? { id: { not: data.excludeUserId } } : {}),
          },
        });
        if (existingPan) {
          errors.pan = `PAN card "${panClean}" is already registered to shareholder ${existingPan.shareholderId}. Every shareholder must use a unique PAN card.`;
        }
      }
    }

    // Date of birth validation
    if (!data.dob) {
      if (!isAdminRole) {
        errors.dob = 'Date of birth is required';
      }
    } else {
      const dobDate = new Date(data.dob);
      if (isNaN(dobDate.getTime())) {
        errors.dob = 'Must be valid date format';
      } else {
        const today = new Date();
        if (dobDate > today) {
          errors.dob = 'Cannot be a future date';
        } else {
          let age = today.getFullYear() - dobDate.getFullYear();
          const m = today.getMonth() - dobDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
            age--;
          }
          if (age < 18) {
            errors.dob = 'Shareholder must be 18 years or older';
          }
        }
      }
    }

    // shareholderId uniqueness validation (if explicitly supplied)
    if (shareholderId) {
      const existingshareholderId = await this.prisma.shareholder.findFirst({
        where: {
          shareholderId: { equals: shareholderId, mode: 'insensitive' },
          ...(data.excludeUserId ? { id: { not: data.excludeUserId } } : {}),
        },
      });
      if (existingshareholderId) {
        errors.shareholderId = `Shareholder ID "${shareholderId.toUpperCase()}" already exists. Please choose a different ID.`;
      }
    }


    // Phone validation & Uniqueness (Strictly 10 digits starting with 6-9)
    if (!phone) {
      if (!isAdminRole) {
        errors.phone = 'Phone number is required';
        errors.phoneNumber = 'Phone number is required';
      }
    } else {
      let digitsOnly = phone.replace(/[^0-9]/g, '');
      if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        digitsOnly = digitsOnly.slice(2);
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
        digitsOnly = digitsOnly.slice(1);
      }

      if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
        errors.phone = 'Phone number must be exactly 10 digits starting with 6, 7, 8, or 9';
        errors.phoneNumber = errors.phone;
      } else {
        const existingPhone = await this.prisma.shareholder.findFirst({
          where: {
            OR: [
              { phone: digitsOnly },
              { phone: `+91${digitsOnly}` },
            ],
            ...(data.excludeUserId ? { id: { not: data.excludeUserId } } : {}),
          },
        });
        if (existingPhone) {
          errors.phone = `Phone number ${digitsOnly} is already registered to shareholder ${existingPhone.shareholderId}. Every shareholder must use a unique mobile number.`;
          errors.phoneNumber = errors.phone;
        }
      }
    }

    // Bank Account Number validation: only numbers, 10 to 16 digits
    if (data.bankAccountNumber && String(data.bankAccountNumber).trim()) {
      const cleanAcc = String(data.bankAccountNumber).trim().replace(/\D/g, '');
      if (!/^\d{10,16}$/.test(cleanAcc)) {
        errors.bankAccountNumber = 'Bank account number must be between 10 and 16 digits containing only numbers.';
      }
    }

    // Address validation
    if (!isAdminRole) {
      if (!combinedAddress || combinedAddress.length < 10) {
        errors.address = 'Complete address must be at least 10 characters';
      } else if (combinedAddress.length > 255) {
        errors.address = 'Complete address must not exceed 255 characters';
      }
    }

    // Referrer validation
    const refId = typeof data.referrerId === 'string' ? data.referrerId.trim() : '';
    if (refId && !['none', 'null', 'root', '-', 'direct'].includes(refId.toLowerCase())) {
      const parentUser = await this.prisma.shareholder.findFirst({
        where: {
          OR: [
            { id: refId },
            { shareholderId: { equals: refId, mode: 'insensitive' } },
            { referralCode: { equals: refId, mode: 'insensitive' } },
          ],
        },
      });

      if (!parentUser) {
        errors.referrerId = 'Referrer not found';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitized: {
        name,
        shareholderId,
        phone,
      },
    };
  }

  async createUser(data: any, adminId: string) {
    // Run validators
    const validation = await this.validateUserData(data);
    if (!validation.isValid) {
      throw new BadRequestException({
        success: false,
        errors: validation.errors,
      });
    }

    // Sanitize & Normalize properties
    data.name = validation.sanitized.name;
    data.shareholderId = validation.sanitized.shareholderId;
    data.phone = validation.sanitized.phone;

    // Validate IFSC Code format if present
    if (data.bankIfsc) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(data.bankIfsc)) {
        throw new BadRequestException({
          success: false,
          errors: { bankIfsc: 'Invalid IFSC format. Expected pattern: ABCD0123456' },
        });
      }
    }

    // Fetch parent shareholder
    let parentUser = null;
    const refId = typeof data.referrerId === 'string' ? data.referrerId.trim() : '';
    if (refId && !['none', 'null', 'root', '-', 'direct'].includes(refId.toLowerCase())) {
      parentUser = await this.prisma.shareholder.findFirst({
        where: {
          OR: [
            { id: refId },
            { shareholderId: { equals: refId, mode: 'insensitive' } },
            { referralCode: { equals: refId, mode: 'insensitive' } },
          ]
        }
      });
    }

    // Default unentered referrer to the Super Admin / Company root account (SH000000)
    if (!parentUser) {
      parentUser = await this.prisma.shareholder.findFirst({
        where: { role: 'SUPER_ADMIN', status: { not: 'DELETED' } },
        orderBy: { createdAt: 'asc' },
      }) || await this.prisma.shareholder.findUnique({ where: { shareholderId: 'SH000000' } });
    }

    // Use provided Shareholder ID or auto-generate based on business config sequential rules
    const finalShareholderId = data.shareholderId?.trim() ? data.shareholderId.trim().toUpperCase() : await this.businessConfigService.generateNextUserId();
    // Referral code is equal to Shareholder ID
    const referralCode = finalShareholderId;

    const accountType = data.accountType || (data.contributionAmount && Number(data.contributionAmount) > 0 ? 'CONTRIBUTION' : 'ZERO_CONTRIBUTION');
    const withholdingPercentage = accountType === 'ZERO_CONTRIBUTION'
      ? (data.withholdingPercentage !== undefined && data.withholdingPercentage !== null && data.withholdingPercentage !== ''
          ? Number(data.withholdingPercentage)
          : 20)
      : 0;

    const shareholder = await this.prisma.shareholder.create({
      data: {
        shareholderId: finalShareholderId,
        passwordHash: data.passwordHash,
        name: data.name,
        phone: data.phone,
        pan: data.pan ? data.pan.trim().toUpperCase() : null,
        permissions: data.permissions || null,
        dob: data.dob ? new Date(data.dob) : null,
        role: data.role ?? 'SHAREHOLDER',
        status: data.status ?? (accountType === 'ZERO_CONTRIBUTION' ? 'ZERO_ACTIVE' : 'ACTIVE'),
        accountType: accountType as any,
        withholdingPercentage: new Prisma.Decimal(withholdingPercentage),
        referralCode: finalShareholderId,
        addressBuilding: data.addressBuilding || '',
        addressArea: data.addressArea || '',
        addressCity: data.addressCity || '',
        addressDistrict: data.addressDistrict || '',
        addressPincode: data.addressPincode || '',
        addressState: data.addressState || '',
        bankAccountName: data.bankAccountName || '',
        bankAccountNumber: data.bankAccountNumber || '',
        bankName: data.bankName || '',
        bankBranch: data.bankBranch || '',
        bankIfsc: data.bankIfsc || '',
      } as any,
    });

    if (parentUser) {
      await this.referralTreeService.assignParent(shareholder.id, parentUser.id);
    }

    // Save Contribution & Investment records if contribution details are provided
    if (data.contributionAmount && Number(data.contributionAmount) > 0) {
      const validityMonths = data.validityMonths ? Number(data.validityMonths) : 12;
      const invDate = data.contributionDate ? new Date(data.contributionDate) : new Date();
      const contribution = await this.prisma.contribution.create({
        data: {
          shareholderId: shareholder.id,
          amount: new Prisma.Decimal(data.contributionAmount),
          mode: data.contributionMode || 'Cash',
          date: invDate,
          effectiveDate: invDate,
          activeDate: invDate,
          createdAt: invDate,
          issuedAgreement: !!data.issuedAgreement,
          issuedCheque: !!data.issuedCheque,
          status: 'APPROVED',
          validityMonths,
        }
      });

      // Also create an active Investment record so they start earning
      await this.prisma.investment.create({
        data: {
          shareholderId: shareholder.id,
          amount: new Prisma.Decimal(data.contributionAmount),
          dailyProfitRate: new Prisma.Decimal('0.0033'),
          status: 'ACTIVE',
          startDate: invDate,
          createdAt: invDate,
          validityMonths,
        }
      });

      // Sync contribution summary and automatically classify shareholder as Investor
      await this.investorsService.syncInvestorProfileAndSummary(shareholder.id);

      // Process MLM thresholds
      await this.mlmService.processContributionMlm(contribution.id);
    }

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'ADMIN_CREATE_USER',
      entityType: 'Shareholder',
      entityId: shareholder.id,
      newValue: JSON.stringify({ shareholderId: shareholder.shareholderId, role: shareholder.role }),
    });

    return shareholder;
  }

  /**
   * Dedicated Admin Account Creation
   * Strictly separates Admin creation from Shareholder creation.
   * Requires only Admin ID, Password, and Permission matrix.
   */
  async createAdminUser(data: { adminId: string; password: string; permissions?: any }, superAdminId: string) {
    const adminIdClean = (data.adminId || '').trim().toUpperCase();
    if (!adminIdClean) {
      throw new BadRequestException('Admin ID is required.');
    }

    const existing = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { shareholderId: adminIdClean },
          { referralCode: adminIdClean },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException(`Account with ID "${adminIdClean}" already exists.`);
    }

    if (!data.password || data.password.length < 6) {
      throw new BadRequestException('Admin password must be at least 6 characters long.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const admin = await this.prisma.shareholder.create({
      data: {
        shareholderId: adminIdClean,
        name: `Admin (${adminIdClean})`,
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        referralCode: adminIdClean,
        permissions: data.permissions || {
          shareholderManagement: { view: true, create: true, edit: true, delete: true, approve: true },
          registrationQueue: { view: true, create: true, edit: false, delete: false, approve: true },
          rankEngine: { view: true, create: false, edit: false, delete: false, approve: true },
          payoutBatches: { view: true, create: false, edit: false, delete: false, approve: true },
          withdrawals: { view: true, create: false, edit: false, delete: false, approve: true },
          businessConfiguration: { view: true, create: true, edit: true, delete: false, approve: true },
          reports: { view: true, create: false, edit: false, delete: false, approve: false },
        },
      },
    });

    await this.auditService.logAction({
      shareholderId: superAdminId,
      action: 'CREATE_ADMIN_ACCOUNT',
      entityType: 'Shareholder',
      entityId: admin.id,
      newValue: JSON.stringify({ adminId: admin.shareholderId, permissions: admin.permissions }),
    });

    return admin;
  }

  async updateUser(id: string, updates: any, adminId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    // Validate PAN if provided & enforce uniqueness
    if (updates.pan) {
      const panClean = updates.pan.trim().toUpperCase();
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(panClean)) {
        throw new BadRequestException('Invalid PAN format. Standard format: AAAAA9999A (e.g. ABCDE1234F)');
      }
      const existingPan = await this.prisma.shareholder.findFirst({
        where: {
          pan: { equals: panClean, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existingPan) {
        throw new BadRequestException(`PAN card "${panClean}" is already registered to shareholder ${existingPan.shareholderId}. Every shareholder must use a unique PAN card.`);
      }
      updates.pan = panClean;
    }

    // Validate Phone if provided & enforce uniqueness
    // Validate Phone if provided & enforce uniqueness (strictly 10 digits starting with 6-9)
    if (updates.phone) {
      let digitsOnly = updates.phone.replace(/[^0-9]/g, '');
      if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        digitsOnly = digitsOnly.slice(2);
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
        digitsOnly = digitsOnly.slice(1);
      }

      if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
        throw new BadRequestException('Phone number must be exactly 10 digits starting with 6, 7, 8, or 9');
      }
      const existingPhone = await this.prisma.shareholder.findFirst({
        where: {
          OR: [
            { phone: digitsOnly },
            { phone: `+91${digitsOnly}` },
          ],
          id: { not: id },
        },
      });
      if (existingPhone) {
        throw new BadRequestException(`Phone number ${digitsOnly} is already registered to shareholder ${existingPhone.shareholderId}. Every shareholder must use a unique mobile number.`);
      }
      updates.phone = digitsOnly;
    }

    // Validate Bank Account Number if provided (only numbers, 10 to 16 digits)
    if (updates.bankAccountNumber && String(updates.bankAccountNumber).trim()) {
      const cleanAcc = String(updates.bankAccountNumber).trim().replace(/\D/g, '');
      if (!/^\d{10,16}$/.test(cleanAcc)) {
        throw new BadRequestException('Bank account number must be between 10 and 16 digits containing only numbers.');
      }
      updates.bankAccountNumber = cleanAcc;
    }

    // Validate IFSC format if provided
    if (updates.bankIfsc) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(updates.bankIfsc.trim().toUpperCase())) {
        throw new BadRequestException('Invalid IFSC format. Expected pattern: ABCD0123456');
      }
    }

    // Handle referral circular reference checks
    let parentUser = null;
    if (updates.referrerId !== undefined) {
      const refId = typeof updates.referrerId === 'string' ? updates.referrerId.trim() : '';
      if (refId && !['none', 'null', 'root', '-', 'direct'].includes(refId.toLowerCase())) {
        parentUser = await this.prisma.shareholder.findFirst({
          where: {
            OR: [
              { id: refId },
              { shareholderId: { equals: refId, mode: 'insensitive' } },
              { referralCode: { equals: refId, mode: 'insensitive' } },
            ]
          }
        });
        if (!parentUser) {
          throw new BadRequestException('Referrer not found');
        }

        if (parentUser.id === id) {
          throw new BadRequestException('Cannot refer yourself');
        }

        const isCircular = await this.checkCircularReference(id, parentUser.id);
        if (isCircular) {
          throw new BadRequestException('Circular referral detected. This assignment is not allowed.');
        }
      }
    }

    const oldData = { ...shareholder };
    const data: any = {};

    // Copy updates to clean data object
    const fields = [
      'shareholderId', 'name', 'phone', 'role', 'status', 'accountType', 'dob', 'pan', 'permissions',
      'addressBuilding', 'addressArea', 'addressCity', 'addressDistrict', 'addressPincode', 'addressState',
      'bankAccountName', 'bankAccountNumber', 'bankName', 'bankBranch', 'bankIfsc'
    ];
    for (const f of fields) {
      if (updates[f] !== undefined) {
        if (f === 'dob') {
          if (updates[f] === '' || updates[f] === null) {
            data[f] = null;
          } else {
            const parsedDate = new Date(updates[f]);
            data[f] = isNaN(parsedDate.getTime()) ? null : parsedDate;
          }
        } else {
          data[f] = updates[f];
        }
      }
    }

    if (updates.withholdingPercentage !== undefined && updates.withholdingPercentage !== null && updates.withholdingPercentage !== '') {
      data.withholdingPercentage = new Prisma.Decimal(updates.withholdingPercentage);
    }

    if (updates.status !== undefined) {
      if (updates.status === 'DISABLED') {
        data.disabledAt = new Date();
      } else if (updates.status === 'ACTIVE' || updates.status === 'RESTORED') {
        data.disabledAt = null;
      }
    }

    // Enforce name formatting
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const fn = updates.firstName !== undefined ? updates.firstName : '';
      const ln = updates.lastName !== undefined ? updates.lastName : '';
      data.name = `${fn || ''} ${ln || ''}`.trim() || data.name || shareholder.name;
    } else if (updates.name !== undefined) {
      data.name = updates.name;
    }

    const updated = await this.prisma.shareholder.update({
      where: { id },
      data,
    });

    // Re-assign parent if changed
    if (updates.referrerId !== undefined) {
      if (updates.referrerId === null || updates.referrerId === '') {
        await this.prisma.shareholder.update({
          where: { id },
          data: { parentId: null },
        });
      } else if (parentUser && parentUser.id !== shareholder.parentId) {
        await this.referralTreeService.assignParent(id, parentUser.id);
      }
    }

    // Save contribution update if present
    if (updates.contributionAmount && Number(updates.contributionAmount) > 0) {
      const validityMonths = updates.validityMonths ? Number(updates.validityMonths) : 12;
      
      // Auto-convert Zero Contribution account to Standard Contribution & Active status
      await this.prisma.shareholder.update({
        where: { id },
        data: {
          accountType: 'CONTRIBUTION',
          status: 'ACTIVE',
          withholdingPercentage: new Prisma.Decimal(0),
        },
      });

      // Contributions are separate ledger records. We always insert a new record for contribution updates.
      const contribution = await this.prisma.contribution.create({
        data: {
          shareholderId: id,
          amount: new Prisma.Decimal(updates.contributionAmount),
          mode: updates.contributionMode || 'Cash',
          date: updates.contributionDate ? new Date(updates.contributionDate) : new Date(),
          issuedAgreement: !!updates.issuedAgreement,
          issuedCheque: !!updates.issuedCheque,
          status: 'APPROVED',
          validityMonths,
        }
      });
      // Add corresponding active investment
      await this.prisma.investment.create({
        data: {
          shareholderId: id,
          amount: new Prisma.Decimal(updates.contributionAmount),
          dailyProfitRate: new Prisma.Decimal('0.0033'),
          status: 'ACTIVE',
          startDate: updates.contributionDate ? new Date(updates.contributionDate) : new Date(),
          validityMonths,
        }
      });

      // Sync contribution summary and automatically classify shareholder as Investor
      await this.investorsService.syncInvestorProfileAndSummary(id);

      // Process MLM thresholds
      await this.mlmService.processContributionMlm(contribution.id);
    }

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'UPDATE_USER',
      entityType: 'Shareholder',
      entityId: id,
      oldValue: JSON.stringify(oldData),
      newValue: JSON.stringify(updates),
    });

    return updated;
  }

  async setStatus(id: string, status: UserStatus, adminId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    const data: any = { status };
    if (status === 'DISABLED') {
      data.disabledAt = new Date();
    } else if (status === 'ACTIVE' || status === 'RESTORED') {
      data.disabledAt = null;
    }

    const updated = await this.prisma.shareholder.update({
      where: { id },
      data,
    });

    if (status === 'DELETED') {
      // Reassign all direct children (level 1 accounts) of the deleted shareholder to the company main account (Super Admin)
      const mainAccount = await this.prisma.shareholder.findFirst({
        where: { role: 'SUPER_ADMIN', status: { not: 'DELETED' } },
        orderBy: { createdAt: 'asc' },
      }) || await this.prisma.shareholder.findUnique({ where: { shareholderId: 'SH000000' } });

      if (mainAccount && mainAccount.id !== id) {
        // 1. Record previousParentId on direct children and set parentId to mainAccount.id
        await this.prisma.shareholder.updateMany({
          where: { parentId: id },
          data: {
            previousParentId: id,
            parentId: mainAccount.id,
          },
        });

        // 2. Update referral relationships where this user was the direct referrer
        await this.prisma.referralRelationship.updateMany({
          where: { parentId: id },
          data: { parentId: mainAccount.id },
        });
      }
    }

    if (status === 'ACTIVE' || status === 'RESTORED') {
      // Restore direct referral accounts that were previously linked to super admin when this user was deleted
      const childrenToRestore = await this.prisma.shareholder.findMany({
        where: { previousParentId: id },
        select: { id: true },
      });

      if (childrenToRestore.length > 0) {
        const childIds = childrenToRestore.map((c) => c.id);

        // 1. Restore parentId on direct children and clear previousParentId
        await this.prisma.shareholder.updateMany({
          where: { id: { in: childIds } },
          data: {
            parentId: id,
            previousParentId: null,
          },
        });

        // 2. Update referral relationships for restored children to point back to this referrer
        await this.prisma.referralRelationship.updateMany({
          where: { childId: { in: childIds } },
          data: { parentId: id },
        });
      }
    }

    await this.auditService.logAction({
      shareholderId: adminId,
      action: `SET_STATUS_${status}`,
      entityType: 'Shareholder',
      entityId: id,
      oldValue: shareholder.status,
      newValue: status,
    });

    return updated;
  }

  async resetPassword(id: string, newPassword: string, adminId: string) {
    if (!newPassword || newPassword.trim().length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    const cleanPassword = newPassword.trim();
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);

    await this.prisma.shareholder.update({
      where: { id },
      data: { passwordHash },
    });

    // Create Audit Log
    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'ADMIN_RESET_PASSWORD',
      entityType: 'Shareholder',
      entityId: id,
      newValue: `Password reset by admin for shareholder ${shareholder.shareholderId} (${shareholder.name})`,
    });

    // Send Notification to shareholder
    try {
      await this.prisma.notification.create({
        data: {
          shareholderId: id,
          title: 'Account Password Reset',
          message: 'Your account password has been reset by the system administrator.',
          type: 'SECURITY',
          priority: 'HIGH',
        },
      });
    } catch (notifErr) {}

    // Dispatch SMS with new credentials if phone is available
    let smsStatus = 'SKIPPED';
    if (shareholder.phone) {
      try {
        await this.smsService.sendCredentialsSms(
          shareholder.phone,
          shareholder.shareholderId,
          cleanPassword,
          shareholder.id,
        );
        smsStatus = 'SENT';
      } catch (smsErr: any) {
        smsStatus = 'FAILED';
      }
    }

    return {
      success: true,
      shareholderId: shareholder.shareholderId,
      name: shareholder.name,
      smsStatus,
      message: `Password for shareholder ${shareholder.shareholderId} (${shareholder.name}) has been reset successfully.`,
    };
  }

  async changeMyPassword(shareholderId: string, currentPasswordText: string, newPasswordText: string) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!shareholder) throw new NotFoundException('Shareholder not found');

    const isValid = await bcrypt.compare(currentPasswordText, shareholder.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Incorrect current password.');
    }
    const passwordHash = await bcrypt.hash(newPasswordText, 10);
    await this.prisma.shareholder.update({
      where: { id: shareholderId },
      data: { passwordHash },
    });

    await this.prisma.notification.create({
      data: {
        shareholderId,
        title: 'Password Changed',
        message: 'Your account password has been successfully updated.',
        type: 'SECURITY',
        priority: 'HIGH',
      },
    });

    return { success: true };
  }

  async getDashboardMetrics(shareholderId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: {
        id: true,
        name: true,
        shareholderId: true,
        role: true,
        status: true,
        accountType: true,
        holdingBalance: true,
        currentRank: true,
        unlockedLevelOverride: true,
        referralCode: true,
        investorProfile: { select: { investorType: true, status: true } },
      },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    const [contributions, profits, commissions, unlockInfo] = await Promise.all([
      this.prisma.contribution.aggregate({
        where: { shareholderId, status: 'APPROVED' },
        _sum: { amount: true },
      }),
      this.prisma.profitLedger.aggregate({
        where: {
          shareholderId,
          status: { not: 'REVERSED' },
          OR: [
            { payoutBatchId: null },
            { payoutBatch: { status: { notIn: ['REVERSED', 'REJECTED'] } } },
          ],
        },
        _sum: { amount: true },
      }),
      this.prisma.commissionLedger.aggregate({
        where: {
          shareholderId,
          status: { not: 'REVERSED' },
          OR: [
            { payoutBatchId: null },
            { payoutBatch: { status: { notIn: ['REVERSED', 'REJECTED'] } } },
          ],
        },
        _sum: { amount: true },
      }),
      this.referralTreeService.getUnlockedLevel(shareholderId),
    ]);

    const totalApprovedContribution = Number(contributions._sum.amount || 0);
    const profitSharingOwn = Number(profits._sum.amount || 0);
    const profitSharingReferral = Number(commissions._sum.amount || 0);
    const holdingBalance = Number(shareholder.holdingBalance || 0);
    const holdingShortfall = Math.max(0, 100000 - holdingBalance);
    const holdingProgress = Math.min(100, Math.round((holdingBalance / 100000) * 10000) / 100);

    // Product 360 Payout Calendar Distribution Dates (6th and 21st)
    const today = new Date();
    const day = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth();

    let lastDistributionDate: Date;
    let nextDistributionDate: Date;

    if (day < 6) {
      lastDistributionDate = new Date(year, month - 1, 21);
      nextDistributionDate = new Date(year, month, 6);
    } else if (day < 21) {
      lastDistributionDate = new Date(year, month, 6);
      nextDistributionDate = new Date(year, month, 21);
    } else {
      lastDistributionDate = new Date(year, month, 21);
      nextDistributionDate = new Date(year, month + 1, 6);
    }

    const displayStatus = shareholder.accountType === 'ZERO_CONTRIBUTION' 
      ? 'ZERO_CONTRIBUTION' 
      : (shareholder.status === 'DELETED' ? 'DELETED' : 'ACTIVE');

    return {
      shareholder: {
        id: shareholder.id,
        name: shareholder.name || shareholder.shareholderId,
        shareholderId: shareholder.shareholderId,
        role: shareholder.role,
        status: displayStatus,
        accountType: shareholder.accountType, // ZERO_CONTRIBUTION or CONTRIBUTION
        referralCode: shareholder.referralCode,
        currentRank: shareholder.currentRank || 'Unranked',
        holdingBalance,
        unlockedLevel: unlockInfo.effectiveLevel,
        directReferralsCount: unlockInfo.directReferralsCount,
        isLevelOverridden: unlockInfo.isOverridden,
      },
      metrics: {
        totalApprovedContribution,
        profitSharingOwn,
        profitSharingReferral,
        totalProfitReceived: profitSharingOwn + profitSharingReferral,
        holdingBalance,
        holdingShortfall,
        holdingProgress,
        isZeroContribution: shareholder.accountType === 'ZERO_CONTRIBUTION',
        lastDistributionDate: lastDistributionDate.toISOString(),
        nextDistributionDate: nextDistributionDate.toISOString(),
      },
    };
  }

  // ==========================================
  // Detailed Profile View for Shareholders
  // ==========================================

  async getShareholderProfile(shareholderId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      include: {
        parent: {
          select: {
            id: true,
            shareholderId: true,
            name: true,
          },
        },
        contributions: {
          where: { status: 'APPROVED' },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    const activeInvestmentsVolume = shareholder.contributions.reduce((sum, c) => sum + Number(c.amount), 0);
    const activeInvestmentsCount = shareholder.contributions.length;
    const accountType = shareholder.accountType;

    return {
      id: shareholder.id,
      shareholderId: shareholder.shareholderId,
      name: shareholder.name,
      phone: shareholder.phone || 'N/A',
      dob: shareholder.dob ? shareholder.dob.toISOString().split('T')[0] : 'N/A',
      pan: shareholder.pan || 'N/A',
      role: shareholder.role,
      activeInvestmentsCount,
      activeInvestmentsVolume,
      personalReferralCode: shareholder.referralCode || 'N/A',
      referralLink: `https://360star.in/register?ref=${shareholder.referralCode}`,
      address: {
        building: shareholder.addressBuilding || '',
        area: shareholder.addressArea || '',
        city: shareholder.addressCity || '',
        district: shareholder.addressDistrict || '',
        state: shareholder.addressState || '',
        pincode: shareholder.addressPincode || '',
      },
      bankDetails: {
        accountName: shareholder.bankAccountName || 'N/A',
        accountNumber: shareholder.bankAccountNumber || 'N/A',
        bankName: shareholder.bankName || 'N/A',
        branch: shareholder.bankBranch || 'N/A',
        ifsc: shareholder.bankIfsc || 'N/A',
      },
      referrer: shareholder.parent ? `${shareholder.parent.name || shareholder.parent.shareholderId} (${shareholder.parent.shareholderId || 'No ID'})` : 'None',
      accountType,
      status: shareholder.accountType === 'ZERO_CONTRIBUTION' ? 'ZERO_CONTRIBUTION' : (shareholder.status === 'DELETED' ? 'DELETED' : 'ACTIVE'),
    };
  }

  async getMeProfits(shareholderId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.ProfitLedgerWhereInput = {
      shareholderId,
      status: { not: 'REVERSED' },
      OR: [
        { payoutBatchId: null },
        { payoutBatch: { status: { notIn: ['REVERSED', 'REJECTED'] } } },
      ],
    };
    const [data, total] = await Promise.all([
      this.prisma.profitLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.profitLedger.count({ where }),
    ]);
    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }

  async getMeCommissions(shareholderId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.CommissionLedgerWhereInput = {
      shareholderId,
      status: { not: 'REVERSED' },
      OR: [
        { payoutBatchId: null },
        { payoutBatch: { status: { notIn: ['REVERSED', 'REJECTED'] } } },
      ],
    };
    const [data, total] = await Promise.all([
      this.prisma.commissionLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromInvestment: { include: { shareholder: { select: { shareholderId: true, name: true } } } },
          fromContribution: { include: { shareholder: { select: { shareholderId: true, name: true } } } },
          sourceShareholder: { select: { shareholderId: true, name: true } },
        },
      }),
      this.prisma.commissionLedger.count({ where }),
    ]);
    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }

  async getMePayouts(shareholderId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.PayoutDetailWhereInput = {
      shareholderId,
      status: { not: 'REVERSED' },
      batch: { status: { notIn: ['REVERSED', 'REJECTED'] } },
    };
    const [data, total] = await Promise.all([
      this.prisma.payoutDetail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { batch: true },
      }),
      this.prisma.payoutDetail.count({ where }),
    ]);
    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }

  async getReferralTree(shareholderId: string) {
    const searchId = (shareholderId || '').trim();
    const shareholder = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { id: searchId },
          { shareholderId: searchId },
          { shareholderId: searchId.toUpperCase() },
        ],
      },
      select: {
        id: true,
        shareholderId: true,
        name: true,
      },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    const actualId = shareholder.id;
    const children = await this.referralTreeService.getFullDownline(actualId);

    // Collect all shareholder IDs (root + downline) to query amounts
    const allShareholderIds = [actualId, ...children.map(c => c.id)];

    const approvedContributions = await this.prisma.contribution.groupBy({
      by: ['shareholderId'],
      where: {
        shareholderId: { in: allShareholderIds },
        status: 'APPROVED',
      },
      _sum: {
        amount: true,
      },
    });

    const amountMap = new Map<string, number>();
    approvedContributions.forEach(ac => {
      amountMap.set(ac.shareholderId, Number(ac._sum.amount || 0));
    });

    const rootAmount = amountMap.get(actualId) || 0;

    const formattedDownline = children.map(c => ({
      ...c,
      name: c.name || c.shareholderId,
      amount: amountMap.get(c.id) || 0,
    }));

    return {
      shareholder: {
        ...shareholder,
        name: shareholder.name || shareholder.shareholderId,
        amount: rootAmount,
      },
      downline: formattedDownline,
    };
  }



  // ==========================================
  // Financial Information Change Request Workflow
  // ==========================================

  /**
   * Shareholder submits request to update financial info
   */
  async requestFinancialChange(shareholderId: string, dto: {
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankName?: string;
    bankBranch?: string;
    bankIfsc?: string;
    pan?: string;
  }) {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    // Shareholder PAN card is permanent and cannot be altered via change requests
    const pan = shareholder.pan;

    // Cancel any previous PENDING request
    await this.prisma.financialChangeRequest.updateMany({
      where: { shareholderId, status: 'PENDING' },
      data: { status: 'REJECTED', rejectionReason: 'Superseded by a new change request.' },
    });

    const request = await this.prisma.financialChangeRequest.create({
      data: {
        shareholderId,
        bankAccountName: dto.bankAccountName || shareholder.bankAccountName,
        bankAccountNumber: dto.bankAccountNumber || shareholder.bankAccountNumber,
        bankName: dto.bankName || shareholder.bankName,
        bankBranch: dto.bankBranch || shareholder.bankBranch,
        bankIfsc: dto.bankIfsc ? dto.bankIfsc.trim().toUpperCase() : shareholder.bankIfsc,
        pan,
        status: 'PENDING',
      },
    });

    // Notify Super Admins
    const superAdmins = await this.prisma.shareholder.findMany({
      where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } },
      select: { id: true },
    });

    for (const admin of superAdmins) {
      await this.prisma.notification.create({
        data: {
          shareholderId: admin.id,
          title: 'Financial Info Change Request',
          message: `Shareholder ${shareholder.name || shareholder.shareholderId} (${shareholder.shareholderId}) has requested a financial information change.`,
          type: 'FINANCE',
          priority: 'HIGH',
        },
      });
    }

    return {
      success: true,
      message: 'Financial information change request submitted successfully. Awaiting Super Admin approval.',
      request,
    };
  }

  /**
   * Get latest financial change request for logged-in shareholder
   */
  async getMyFinancialChangeRequest(shareholderId: string) {
    return this.prisma.financialChangeRequest.findFirst({
      where: { shareholderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Super Admin: List all financial information change requests
   */
  async getFinancialRequests(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.financialChangeRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shareholder: {
            select: {
              id: true,
              shareholderId: true,
              name: true,
              phone: true,
              pan: true,
              bankAccountName: true,
              bankAccountNumber: true,
              bankName: true,
              bankBranch: true,
              bankIfsc: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              shareholderId: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.financialChangeRequest.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * Super Admin: Approve Financial Information Change Request
   */
  async approveFinancialRequest(requestId: string, adminId: string) {
    const request = await this.prisma.financialChangeRequest.findUnique({
      where: { id: requestId },
      include: { shareholder: true },
    });

    if (!request) {
      throw new NotFoundException('Financial change request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    // Apply changes to Shareholder record
    await this.prisma.$transaction(async (tx) => {
      await tx.shareholder.update({
        where: { id: request.shareholderId },
        data: {
          bankAccountName: request.bankAccountName,
          bankAccountNumber: request.bankAccountNumber,
          bankName: request.bankName,
          bankBranch: request.bankBranch,
          bankIfsc: request.bankIfsc,
          pan: request.pan,
        },
      });

      await tx.financialChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
    });

    // Audit Log
    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'APPROVE_FINANCIAL_CHANGE',
      entityType: 'Shareholder',
      entityId: request.shareholderId,
      oldValue: JSON.stringify({
        bankAccountName: request.shareholder.bankAccountName,
        bankAccountNumber: request.shareholder.bankAccountNumber,
        bankName: request.shareholder.bankName,
        pan: request.shareholder.pan,
      }),
      newValue: JSON.stringify({
        bankAccountName: request.bankAccountName,
        bankAccountNumber: request.bankAccountNumber,
        bankName: request.bankName,
        pan: request.pan,
      }),
    });

    // Notify Shareholder
    await this.prisma.notification.create({
      data: {
        shareholderId: request.shareholderId,
        title: 'Financial Information Updated',
        message: 'Your requested financial information changes have been approved and applied to your profile.',
        type: 'FINANCE',
        priority: 'HIGH',
      },
    });

    return {
      success: true,
      message: 'Financial information changes approved and activated successfully.',
    };
  }

  /**
   * Super Admin: Reject Financial Information Change Request
   */
  async rejectFinancialRequest(requestId: string, adminId: string, reason?: string) {
    const request = await this.prisma.financialChangeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Financial change request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    await this.prisma.financialChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Financial details could not be verified by Admin.',
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    // Audit Log
    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'REJECT_FINANCIAL_CHANGE',
      entityType: 'FinancialChangeRequest',
      entityId: requestId,
      reason: reason || 'Rejected by administrator',
    });

    // Notify Shareholder
    await this.prisma.notification.create({
      data: {
        shareholderId: request.shareholderId,
        title: 'Financial Information Request Rejected',
        message: `Your financial information change request was rejected: ${reason || 'Details could not be verified.'}`,
        type: 'FINANCE',
        priority: 'HIGH',
      },
    });

    return {
      success: true,
      message: 'Financial change request rejected.',
    };
  }
}

