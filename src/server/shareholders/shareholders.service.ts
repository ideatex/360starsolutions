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

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referralTreeService: ReferralTreeService,
    private readonly auditService: AuditService,
    private readonly businessConfigService: BusinessConfigService,
    private readonly mlmService: MlmService,
    private readonly investorsService: InvestorsService,
  ) {}

  async getUsers(search?: string, role?: Role, status?: UserStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (role) where.role = role;
    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'DELETED' };
    }
    if (search) {
      where.OR = [
        { shareholderId: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { shareholderId: { contains: search, mode: 'insensitive' } },
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
  
          createdAt: true,
          disabledAt: true,
          
          
          dob: true,
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

    // shareholderId uniqueness validation
    if (!shareholderId) {
      errors.shareholderId = 'Shareholder ID is required';
    } else {
      const existingshareholderId = await this.prisma.shareholder.findFirst({
        where: { shareholderId },
      });
      if (existingshareholderId) {
        // Only error if the ID already exists in the system (though it will be regenerated on save anyway)
        errors.shareholderId = 'Shareholder ID already exists';
      }
    }

    // Phone validation
    if (!phone) {
      if (!isAdminRole) {
        errors.phone = 'Phone number is required';
        errors.phoneNumber = 'Phone number is required';
      }
    } else {
      const digitsOnly = phone.replace('+', '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        errors.phone = 'Phone number must be between 10 and 15 digits';
        errors.phoneNumber = 'Phone number must be between 10 and 15 digits';
      } else {
        const existingPhone = await this.prisma.shareholder.findFirst({
          where: { phone },
        });
        if (existingPhone) {
          errors.phone = 'Phone number already exists';
          errors.phoneNumber = 'Phone number already exists';
        }
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
    if (data.referrerId) {
      const parentUser = await this.prisma.shareholder.findFirst({
        where: {
          OR: [
            { id: data.referrerId },
            { shareholderId: data.referrerId },
            { referralCode: data.referrerId },
            { shareholderId: data.referrerId },
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
    if (data.referrerId) {
      parentUser = await this.prisma.shareholder.findFirst({
        where: {
          OR: [
            { id: data.referrerId },
            { shareholderId: data.referrerId },
            { referralCode: data.referrerId },
            { shareholderId: data.referrerId }
          ]
        }
      });
    }

    // Use provided Shareholder ID or auto-generate based on business config sequential rules
    const finalShareholderId = data.shareholderId?.trim() ? data.shareholderId.trim().toUpperCase() : await this.businessConfigService.generateNextUserId();
    // Referral code is equal to Shareholder ID
    const referralCode = finalShareholderId;

    const shareholder = await this.prisma.shareholder.create({
      data: {
        shareholderId: finalShareholderId,
        passwordHash: data.passwordHash,
        name: data.name,
        phone: data.phone,
        dob: data.dob ? new Date(data.dob) : null,
        role: data.role ?? 'SHAREHOLDER',
        status: data.status ?? 'ACTIVE',
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
      },
    });

    if (parentUser) {
      await this.referralTreeService.assignParent(shareholder.id, parentUser.id);
    }

    // Save Contribution & Investment records if contribution details are provided
    if (data.contributionAmount && Number(data.contributionAmount) > 0) {
      const validityMonths = data.validityMonths ? Number(data.validityMonths) : 12;
      const contribution = await this.prisma.contribution.create({
        data: {
          shareholderId: shareholder.id,
          amount: new Prisma.Decimal(data.contributionAmount),
          mode: data.contributionMode || 'Cash',
          date: data.contributionDate ? new Date(data.contributionDate) : new Date(),
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
          startDate: data.contributionDate ? new Date(data.contributionDate) : new Date(),
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

  async updateUser(id: string, updates: any, adminId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }


    // Validate IFSC format if provided
    if (updates.bankIfsc) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(updates.bankIfsc)) {
        throw new BadRequestException('Invalid IFSC format. Expected pattern: ABCD0123456');
      }
    }

    // Handle referral circular reference checks
    let parentUser = null;
    if (updates.referrerId !== undefined) {
      if (updates.referrerId) {
        parentUser = await this.prisma.shareholder.findFirst({
          where: {
            OR: [
              { id: updates.referrerId },
              { shareholderId: updates.referrerId },
              { referralCode: updates.referrerId },
              { shareholderId: updates.referrerId }
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
      'shareholderId', 'name', 'phone', 'role', 'status', 'dob',
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

  async resetPassword(id: string, newPasswordText: string, adminId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    const passwordHash = await bcrypt.hash(newPasswordText, 10);

    await this.prisma.shareholder.update({
      where: { id },
      data: { passwordHash },
    });

    // Create Audit Log
    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'RESET_PASSWORD',
      entityType: 'Shareholder',
      entityId: id,
      newValue: 'Password successfully reset by Admin',
    });

    // Send Notification to shareholder
    await this.prisma.notification.create({
      data: {
        shareholderId: id,
        title: 'Password Reset',
        message: 'Your account password has been successfully reset by an Administrator.',
        type: 'SECURITY',
        priority: 'HIGH',
      },
    });

    return { success: true };
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
        investorProfile: { select: { investorType: true, status: true } }
      },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    const contributions = await this.prisma.contribution.aggregate({
      where: { shareholderId, status: 'APPROVED' },
      _sum: { amount: true },
    });

    const profits = await this.prisma.profitLedger.aggregate({
      where: { shareholderId },
      _sum: { amount: true },
    });

    const commissions = await this.prisma.commissionLedger.aggregate({
      where: { shareholderId },
      _sum: { amount: true },
    });

    const totalApprovedContribution = Number(contributions._sum.amount || 0);
    const profitSharingOwn = Number(profits._sum.amount || 0);
    const profitSharingReferral = Number(commissions._sum.amount || 0);
    
    // Calculate Distribution Dates
    const today = new Date();
    let lastDistributionDate = new Date(today.getFullYear(), today.getMonth(), 1);
    let nextDistributionDate = new Date(today.getFullYear(), today.getMonth(), 16);
    
    if (today.getDate() < 16) {
      lastDistributionDate = new Date(today.getFullYear(), today.getMonth() - 1, 16);
      nextDistributionDate = new Date(today.getFullYear(), today.getMonth(), 16);
    } else {
      lastDistributionDate = new Date(today.getFullYear(), today.getMonth(), 16);
      nextDistributionDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }

    return {
      shareholder: {
        name: shareholder.name || shareholder.shareholderId,
        shareholderId: shareholder.shareholderId || shareholder.id.split('-')[0].toUpperCase(),
        accountType: totalApprovedContribution > 0 ? 'Investor' : 'Non-Investor',
      },
      metrics: {
        totalApprovedContribution,
        profitSharingOwn,
        profitSharingReferral,
        totalProfitReceived: profitSharingOwn + profitSharingReferral,
        lastDistributionDate: lastDistributionDate.toISOString(),
        nextDistributionDate: nextDistributionDate.toISOString(),
      }
    };
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

  async getProfileDetails(shareholderId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      include: {
        parent: { select: {  shareholderId: true, name: true } },
        investorProfile: true,
      }
    });

    if (!shareholder) throw new NotFoundException('Shareholder not found');

    const contributions = await this.prisma.contribution.aggregate({
      where: { shareholderId, status: 'APPROVED' },
      _sum: { amount: true },
    });

    const accountType = Number(contributions._sum.amount || 0) > 0 ? 'Investor' : 'Non-Investor';

    return {
      id: shareholder.id,
      shareholderId: shareholder.shareholderId,
      investorId: shareholder.investorProfile?.id || '-',
      name: shareholder.name || shareholder.shareholderId,
      phone: shareholder.phone || 'N/A',
      address: [shareholder.addressBuilding, shareholder.addressArea, shareholder.addressCity, shareholder.addressDistrict, shareholder.addressState, shareholder.addressPincode].filter(Boolean).join(', ') || 'N/A',
      bankDetails: {
        accountName: shareholder.bankAccountName || 'N/A',
        accountNumber: shareholder.bankAccountNumber || 'N/A',
        bankName: shareholder.bankName || 'N/A',
        branch: shareholder.bankBranch || 'N/A',
        ifsc: shareholder.bankIfsc || 'N/A',
      },
      referrer: shareholder.parent ? `${shareholder.parent.name || shareholder.parent.shareholderId} (${shareholder.parent.shareholderId || 'No ID'})` : 'None',
      accountType,
      status: shareholder.status,
    };
  }

  async getMeProfits(shareholderId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.profitLedger.findMany({
        where: { shareholderId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.profitLedger.count({ where: { shareholderId } }),
    ]);
    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }

  async getMeCommissions(shareholderId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.commissionLedger.findMany({
        where: { shareholderId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { fromInvestment: { include: { shareholder: { select: { shareholderId: true } } } } },
      }),
      this.prisma.commissionLedger.count({ where: { shareholderId } }),
    ]);
    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }

  async getMePayouts(shareholderId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payoutDetail.findMany({
        where: { shareholderId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { batch: true },
      }),
      this.prisma.payoutDetail.count({ where: { shareholderId } }),
    ]);
    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }
}

