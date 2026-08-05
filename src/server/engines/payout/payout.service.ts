import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { NotificationService } from '@server/engines/notification/notification.service';
import { InvestorsService } from '@server/engines/investors/investors.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly investorsService: InvestorsService,
  ) {}

  async getBatches(page = 1, limit = 15) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payoutBatch.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payoutBatch.count(),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getBatchDetails(batchId: string) {
    return this.prisma.payoutDetail.findMany({
      where: { batchId },
      include: { 
        shareholder: { 
          select: { 
            id: true, 
            shareholderId: true, 
            name: true, 
            phone: true, 
            bankAccountName: true, 
            bankAccountNumber: true, 
            bankName: true, 
            bankBranch: true, 
            bankIfsc: true 
          } 
        },
        batch: {
          select: {
            cycleStart: true,
            cycleEnd: true,
            status: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllShareholderPayouts(search?: string, batchId?: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (batchId) where.batchId = batchId;
    if (status) where.status = status;
    if (search) {
      where.shareholder = {
        OR: [
          { shareholderId: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { bankAccountNumber: { contains: search, mode: 'insensitive' } },
        ]
      };
    }

    const [data, total, stats] = await Promise.all([
      this.prisma.payoutDetail.findMany({
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
              bankAccountName: true,
              bankAccountNumber: true,
              bankName: true,
              bankBranch: true,
              bankIfsc: true,
            }
          },
          batch: {
            select: {
              id: true,
              cycleStart: true,
              cycleEnd: true,
              status: true,
            }
          }
        }
      }),
      this.prisma.payoutDetail.count({ where }),
      this.prisma.payoutDetail.aggregate({
        where,
        _sum: {
          profitAmount: true,
          commissionAmount: true,
          totalAmount: true,
        }
      })
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      summary: {
        totalProfit: stats._sum.profitAmount || 0,
        totalCommission: stats._sum.commissionAmount || 0,
        totalPayout: stats._sum.totalAmount || 0,
      }
    };
  }

  /**
   * Generates a payout batch for a specific cycle.
   * Excludes commissions and profits that have already been included in a batch or processed/paid.
  /**
   * Generate Payout Batch for Individual Shareholders
   * Calculated via: ((End of cycle date - Contribution fund date in days) * Contribution Fund Amount * Calculated daily percentage)
   */
  async generatePayoutBatch(cycleStart: Date, cycleEnd: Date) {
    // Create the batch in PENDING state
    const batch = await this.prisma.payoutBatch.create({
      data: {
        cycleStart,
        cycleEnd,
        status: 'PENDING',
        totalAmount: 0
      }
    });

    // Run the dynamic MLM profit sharing calculation cycle for active investors.
    await this.investorsService.runProfitSharingCalculationCycle(batch.id);

    const userTotals = new Map<string, { profit: number, commission: number }>();

    // Query unassigned profits that are PENDING
    const profits = await this.prisma.profitLedger.findMany({
      where: {
        payoutBatchId: null,
        status: 'PENDING',
        cycleEnd: { lte: cycleEnd }
      }
    });

    for (const p of profits) {
      const current = userTotals.get(p.shareholderId) || { profit: 0, commission: 0 };
      current.profit += Number(p.amount);
      userTotals.set(p.shareholderId, current);
    }

    // Query unassigned commissions that are in eligible status (PENDING or CONFIRMED)
    const commissions = await this.prisma.commissionLedger.findMany({
      where: {
        createdAt: { lte: cycleEnd },
        payoutBatchId: null,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    for (const c of commissions) {
      const current = userTotals.get(c.shareholderId) || { profit: 0, commission: 0 };
      current.commission += Number(c.amount);
      userTotals.set(c.shareholderId, current);
    }

    let batchTotal = 0;

    // Create payout details for each individual shareholder
    for (const [shareholderId, totals] of userTotals.entries()) {
      const totalAmount = totals.profit + totals.commission;
      batchTotal += totalAmount;

      if (totalAmount > 0) {
        await this.prisma.payoutDetail.create({
          data: {
            batchId: batch.id,
            shareholderId,
            profitAmount: totals.profit,
            commissionAmount: totals.commission,
            totalAmount: totalAmount,
            status: 'PENDING'
          }
        });
      }
    }

    // Link processed ledgers to this batch to prevent duplicate inclusion in future batches
    if (profits.length > 0) {
      await this.prisma.profitLedger.updateMany({
        where: { id: { in: profits.map(p => p.id) } },
        data: { payoutBatchId: batch.id, status: 'PROCESSED' }
      });
    }

    if (commissions.length > 0) {
      await this.prisma.commissionLedger.updateMany({
        where: { id: { in: commissions.map(c => c.id) } },
        data: { payoutBatchId: batch.id, status: 'PROCESSED' }
      });
    }

    // Update batch total and transition status to REVIEWED
    await this.prisma.payoutBatch.update({
      where: { id: batch.id },
      data: { totalAmount: batchTotal, status: 'REVIEWED' }
    });

    await this.auditService.logAction({
      action: 'GENERATE_PAYOUT_BATCH',
      entityType: 'PayoutBatch',
      entityId: batch.id,
      newValue: `Total: $${batchTotal}, Shareholders: ${userTotals.size}, Formula: Aggregation`,
    });

    this.logger.log(`Payout Batch ${batch.id} generated with total $${batchTotal} for ${userTotals.size} individual shareholders.`);
    return batch;
  }

  /**
   * Approve a batch (Super Admin Only)
   */
  async approveBatch(batchId: string) {
    const batch = await this.prisma.payoutBatch.findUnique({ where: { id: batchId } });
    if (!batch || batch.status !== 'REVIEWED') {
      throw new BadRequestException('Batch must be in REVIEWED state to be approved');
    }
    await this.prisma.payoutBatch.update({
      where: { id: batchId },
      data: { status: 'APPROVED', approvedAt: new Date() }
    });
    
    await this.auditService.logAction({
      action: 'APPROVE_PAYOUT_BATCH',
      entityType: 'PayoutBatch',
      entityId: batchId,
      oldValue: 'REVIEWED',
      newValue: 'APPROVED',
    });

    this.logger.log(`Payout Batch ${batchId} approved successfully`);
  }

  /**
   * Release payout batch (Super Admin Only)
   */
  async releaseBatch(batchId: string) {
    const batch = await this.prisma.payoutBatch.findUnique({ where: { id: batchId } });
    
    if (!batch || batch.status !== 'APPROVED') {
      throw new BadRequestException('Batch must be approved before release');
    }

    // Mark batch as RELEASED
    await this.prisma.payoutBatch.update({
      where: { id: batchId },
      data: { status: 'RELEASED', releasedAt: new Date() }
    });

    // Update ledger details to PROCESSED
    await this.prisma.payoutDetail.updateMany({
      where: { batchId },
      data: { status: 'PROCESSED' }
    });

    // Mark attached commissions as PAID
    await this.prisma.commissionLedger.updateMany({
      where: { payoutBatchId: batchId },
      data: { status: 'PAID' }
    });

    await this.auditService.logAction({
      action: 'RELEASE_PAYOUT_BATCH',
      entityType: 'PayoutBatch',
      entityId: batchId,
      oldValue: 'APPROVED',
      newValue: 'RELEASED',
    });

    const details = await this.prisma.payoutDetail.findMany({ where: { batchId } });
    for (const detail of details) {
      await this.notificationService.createNotification({
        shareholderId: detail.shareholderId,
        title: 'Payout Released!',
        message: `Your payout of $${detail.totalAmount} has been released to your account.`
      });
    }

    this.logger.log(`Payout Batch ${batchId} released successfully`);
  }

  /**
   * Reverse a commission (Super Admin Only)
   */
  async reverseCommission(commissionId: string, superAdminId: string) {
    const admin = await this.prisma.shareholder.findUnique({ where: { id: superAdminId } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only Super Admins are authorized to reverse commissions');
    }

    const commission = await this.prisma.commissionLedger.findUnique({ where: { id: commissionId } });
    if (!commission) {
      throw new BadRequestException('Commission record not found');
    }

    await this.prisma.commissionLedger.update({
      where: { id: commissionId },
      data: {
        status: 'REVERSED',
        payoutBatchId: null,
      }
    });

    await this.auditService.logAction({
      action: 'REVERSE_COMMISSION',
      entityType: 'CommissionLedger',
      entityId: commissionId,
      oldValue: commission.status,
      newValue: 'REVERSED',
    });

    return { success: true, message: `Commission ${commissionId} has been reversed.` };
  }

  /**
   * Reprocess a commission (Super Admin Only)
   * Resets status to PENDING so it can be picked up in future batch generations.
   */
  async reprocessCommission(commissionId: string, superAdminId: string) {
    const admin = await this.prisma.shareholder.findUnique({ where: { id: superAdminId } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only Super Admins are authorized to reprocess commissions');
    }

    const commission = await this.prisma.commissionLedger.findUnique({ where: { id: commissionId } });
    if (!commission) {
      throw new BadRequestException('Commission record not found');
    }

    await this.prisma.commissionLedger.update({
      where: { id: commissionId },
      data: {
        status: 'PENDING',
        payoutBatchId: null,
      }
    });

    await this.auditService.logAction({
      action: 'REPROCESS_COMMISSION',
      entityType: 'CommissionLedger',
      entityId: commissionId,
      oldValue: commission.status,
      newValue: 'PENDING',
    });

    return { success: true, message: `Commission ${commissionId} reset to PENDING for reprocessing.` };
  }

  /**
   * Reprocess / Reset an entire payout batch (Super Admin Only)
   * Unlinks all commissions and profits in the batch so they become eligible for recalculation/re-batching.
   */
  async reprocessBatch(batchId: string, superAdminId: string) {
    const admin = await this.prisma.shareholder.findUnique({ where: { id: superAdminId } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only Super Admins are authorized to reprocess payout batches');
    }

    const batch = await this.prisma.payoutBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new BadRequestException('Payout batch not found');
    }

    // Unlink and reset all commissions in this batch to PENDING
    await this.prisma.commissionLedger.updateMany({
      where: { payoutBatchId: batchId },
      data: {
        payoutBatchId: null,
        status: 'PENDING',
      }
    });

    // Unlink and reset all profit ledgers in this batch to PENDING
    await this.prisma.profitLedger.updateMany({
      where: { payoutBatchId: batchId },
      data: {
        payoutBatchId: null,
        status: 'PENDING',
      }
    });

    // Set batch status to REJECTED
    await this.prisma.payoutBatch.update({
      where: { id: batchId },
      data: { status: 'REJECTED' }
    });

    await this.auditService.logAction({
      action: 'REPROCESS_PAYOUT_BATCH',
      entityType: 'PayoutBatch',
      entityId: batchId,
      oldValue: batch.status,
      newValue: 'REJECTED (REPROCESSED)',
    });

    return { success: true, message: `Payout batch ${batchId} reset and commissions unlinked for reprocessing.` };
  }
}
