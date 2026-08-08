import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { NotificationService } from '@server/engines/notification/notification.service';
import { InvestorsService } from '@server/engines/investors/investors.service';
import { WithdrawalType, Prisma } from '@prisma/client';

@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly investorsService: InvestorsService,
  ) {}

  /**
   * Process Partial or Full Withdrawal of Shareholder Contribution Fund
   */
  async processWithdrawal(dto: {
    shareholderId: string;
    type: WithdrawalType;
    amount?: number;
    remarks?: string;
    adminId: string;
  }) {
    const { shareholderId, type, remarks, adminId } = dto;

    const shareholder = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { id: shareholderId },
          { shareholderId: shareholderId },
          { shareholderId: shareholderId.toUpperCase() },
        ],
      },
      include: {
        investments: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found.');
    }

    if (shareholder.status === 'BLOCKED' || shareholder.status === 'DELETED') {
      throw new BadRequestException('Cannot process withdrawal for blocked or deleted shareholder.');
    }

    const activeInvestments = shareholder.investments;
    const previousActiveFund = activeInvestments.reduce(
      (acc, inv) => acc + Number(inv.amount),
      0,
    );

    if (previousActiveFund <= 0) {
      throw new BadRequestException('No active Contribution Fund balance available for withdrawal.');
    }

    let withdrawalAmount = 0;
    let remainingActiveFund = 0;

    if (type === WithdrawalType.FULL) {
      withdrawalAmount = previousActiveFund;
      remainingActiveFund = 0;
    } else {
      withdrawalAmount = Number(dto.amount || 0);
      if (withdrawalAmount <= 0) {
        throw new BadRequestException('Partial withdrawal amount must be greater than 0.');
      }
      if (withdrawalAmount > previousActiveFund) {
        throw new BadRequestException(
          `Withdrawal amount (₹${withdrawalAmount.toLocaleString()}) exceeds active Contribution Fund (₹${previousActiveFund.toLocaleString()}).`,
        );
      }
      remainingActiveFund = previousActiveFund - withdrawalAmount;
    }

    // Generate Unique Sequential Withdrawal ID (e.g. WTH100001)
    const totalCount = await this.prisma.withdrawal.count();
    const withdrawalId = `WTH${String(100001 + totalCount).padStart(6, '0')}`;

    // Execute database transaction
    const withdrawal = await this.prisma.$transaction(async (tx) => {
      let amountToDeduct = withdrawalAmount;
      let targetInvestmentId: string | null = null;

      for (const inv of activeInvestments) {
        const invAmount = Number(inv.amount);
        if (invAmount <= 0) continue;

        targetInvestmentId = inv.id;

        if (type === WithdrawalType.FULL) {
          await tx.investment.update({
            where: { id: inv.id },
            data: {
              amount: new Prisma.Decimal(0),
              status: 'FULLY_WITHDRAWN',
            },
          });
        } else {
          if (amountToDeduct >= invAmount) {
            amountToDeduct -= invAmount;
            await tx.investment.update({
              where: { id: inv.id },
              data: {
                amount: new Prisma.Decimal(0),
                status: 'FULLY_WITHDRAWN',
              },
            });
          } else {
            const newInvAmount = invAmount - amountToDeduct;
            amountToDeduct = 0;
            await tx.investment.update({
              where: { id: inv.id },
              data: {
                amount: new Prisma.Decimal(newInvAmount),
              },
            });
            break;
          }
        }
      }

      // Create Withdrawal Record
      const newWithdrawal = await tx.withdrawal.create({
        data: {
          withdrawalId,
          shareholderId: shareholder.id,
          investmentId: targetInvestmentId,
          type,
          amount: new Prisma.Decimal(withdrawalAmount),
          previousActiveFund: new Prisma.Decimal(previousActiveFund),
          remainingActiveFund: new Prisma.Decimal(remainingActiveFund),
          processedById: adminId,
          remarks: remarks || `${type === WithdrawalType.FULL ? 'Full' : 'Partial'} withdrawal processed.`,
        },
        include: {
          shareholder: {
            select: { id: true, shareholderId: true, name: true, phone: true },
          },
          processedBy: {
            select: { id: true, shareholderId: true, name: true },
          },
        },
      });

      // Update ContributionSummary if present
      await tx.contributionSummary.upsert({
        where: { shareholderId: shareholder.id },
        update: {
          lastUpdated: new Date(),
        },
        create: {
          shareholderId: shareholder.id,
          totalApproved: new Prisma.Decimal(remainingActiveFund),
          totalPending: new Prisma.Decimal(0),
          totalRejected: new Prisma.Decimal(0),
        },
      });

      return newWithdrawal;
    });

    // Recalculate dynamic Business Volumes for referral tree hierarchy
    try {
      await this.investorsService.getBusinessVolume(shareholder.id);
    } catch (e) {}

    // Audit Logging
    await this.auditService.logAction({
      shareholderId: adminId,
      action: `WITHDRAWAL_${type}`,
      entityType: 'Withdrawal',
      entityId: withdrawal.id,
      oldValue: JSON.stringify({ activeFund: previousActiveFund }),
      newValue: JSON.stringify({
        withdrawalId: withdrawal.withdrawalId,
        withdrawnAmount: withdrawalAmount,
        remainingActiveFund,
        type,
      }),
    });

    // Notify Shareholder
    await this.notificationService.createNotification({
      shareholderId: shareholder.id,
      title: `${type === WithdrawalType.FULL ? 'Full' : 'Partial'} Withdrawal Processed`,
      message: `Your ${type.toLowerCase()} withdrawal of ₹${withdrawalAmount.toLocaleString()} has been processed. Remaining Active Contribution Fund: ₹${remainingActiveFund.toLocaleString()}.`,
      type: 'FINANCE',
      priority: 'HIGH',
    });

    return withdrawal;
  }

  /**
   * Get Active Contribution Funds & Withdrawal Summary for a Shareholder
   */
  async getShareholderActiveFunds(identifier: string) {
    const shareholder = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { id: identifier },
          { shareholderId: identifier },
          { shareholderId: identifier.toUpperCase() },
        ],
      },
      include: {
        investments: {
          where: { status: 'ACTIVE' },
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found.');
    }

    const activeFund = shareholder.investments.reduce(
      (acc, inv) => acc + Number(inv.amount),
      0,
    );

    return {
      shareholder: {
        id: shareholder.id,
        shareholderId: shareholder.shareholderId,
        name: shareholder.name,
        phone: shareholder.phone,
        status: shareholder.status,
      },
      activeContributionFund: activeFund,
      activeInvestmentsCount: shareholder.investments.length,
      recentWithdrawals: shareholder.withdrawals,
    };
  }

  /**
   * Get Paginated Withdrawal History
   */
  async getWithdrawals(params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: WithdrawalType;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.type) {
      where.type = params.type;
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    if (params.search) {
      const query = params.search.trim();
      where.OR = [
        { withdrawalId: { contains: query, mode: 'insensitive' } },
        { shareholder: { shareholderId: { contains: query, mode: 'insensitive' } } },
        { shareholder: { name: { contains: query, mode: 'insensitive' } } },
        { remarks: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [data, total, aggregates] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shareholder: {
            select: { id: true, shareholderId: true, name: true, phone: true },
          },
          processedBy: {
            select: { id: true, shareholderId: true, name: true },
          },
        },
      }),
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      summary: {
        totalWithdrawnAmount: Number(aggregates._sum.amount || 0),
      },
    };
  }

  /**
   * Export all matching Withdrawal records (un-paginated)
   */
  async exportWithdrawals(params: {
    search?: string;
    type?: WithdrawalType;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};

    if (params.type) {
      where.type = params.type;
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    if (params.search) {
      const query = params.search.trim();
      where.OR = [
        { withdrawalId: { contains: query, mode: 'insensitive' } },
        { shareholder: { shareholderId: { contains: query, mode: 'insensitive' } } },
        { shareholder: { name: { contains: query, mode: 'insensitive' } } },
        { remarks: { contains: query, mode: 'insensitive' } },
      ];
    }

    const withdrawals = await this.prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        shareholder: {
          select: { shareholderId: true, name: true, phone: true },
        },
        processedBy: {
          select: { shareholderId: true, name: true },
        },
      },
    });

    const headers = [
      'Withdrawal ID',
      'Shareholder ID',
      'Shareholder Name',
      'Withdrawal Type',
      'Withdrawal Amount (₹)',
      'Previous Active Fund (₹)',
      'Remaining Active Fund (₹)',
      'Withdrawal Date',
      'Processed By',
      'Remarks',
    ];

    const rows = withdrawals.map((w) => [
      w.withdrawalId,
      w.shareholder?.shareholderId || '-',
      `"${(w.shareholder?.name || '').replace(/"/g, '""')}"`,
      w.type,
      Number(w.amount).toFixed(2),
      Number(w.previousActiveFund).toFixed(2),
      Number(w.remainingActiveFund).toFixed(2),
      new Date(w.createdAt).toLocaleString('en-IN'),
      w.processedBy?.name || w.processedBy?.shareholderId || 'Admin',
      `"${(w.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return {
      csv: csvContent,
      withdrawals,
    };
  }
}
