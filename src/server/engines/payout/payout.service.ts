import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { NotificationService } from '@server/engines/notification/notification.service';
import { InvestorsService } from '@server/engines/investors/investors.service';

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
      include: { shareholder: { select: { shareholderId: true, id: true } } },
    });
  }

  /**
   * Generates a payout batch for a specific cycle.
   * Only Super Admins should be able to trigger this or release it.
   */
  async generatePayoutBatch(cycleStart: Date, cycleEnd: Date) {
    // Create the batch in PENDING state
    const batch = await this.prisma.payoutBatch.create({
      data: {
        cycleStart,
        cycleEnd,
        status: 'PENDING',
        totalAmount: 0 // Will update after details are aggregated
      }
    });

    // Run the dynamic MLM profit sharing calculation cycle for active investors.
    // This populates the CommissionLedger for dynamic tree calculations.
    await this.investorsService.runProfitSharingCalculationCycle(batch.id);

    const profits = await this.prisma.profitLedger.findMany({
      where: {
        cycleStart: { gte: cycleStart },
        cycleEnd: { lte: cycleEnd }
      }
    });

    const commissions = await this.prisma.commissionLedger.findMany({
      where: {
        createdAt: { gte: cycleStart, lte: cycleEnd }
      }
    });

    // Aggregate by shareholder
    const userTotals = new Map<string, { profit: number, commission: number }>();

    for (const p of profits) {
      const current = userTotals.get(p.shareholderId) || { profit: 0, commission: 0 };
      current.profit += Number(p.amount);
      userTotals.set(p.shareholderId, current);
    }

    for (const c of commissions) {
      const current = userTotals.get(c.shareholderId) || { profit: 0, commission: 0 };
      current.commission += Number(c.amount);
      userTotals.set(c.shareholderId, current);
    }

    let batchTotal = 0;

    // Create payout details for each shareholder
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

    // Update batch total
    await this.prisma.payoutBatch.update({
      where: { id: batch.id },
      data: { totalAmount: batchTotal, status: 'REVIEWED' }
    });

    await this.auditService.logAction({
      action: 'GENERATE_PAYOUT_BATCH',
      entityType: 'PayoutBatch',
      entityId: batch.id,
      newValue: `Total: ${batchTotal}`,
    });

    this.logger.log(`Payout Batch ${batch.id} generated with total ${batchTotal}`);
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

    // Mark as RELEASED
    await this.prisma.payoutBatch.update({
      where: { id: batchId },
      data: { status: 'RELEASED', releasedAt: new Date() }
    });

    // Here we would typically integrate with a third-party payment gateway or blockchain 
    // to actually dispatch funds. For the CRM, we just update the ledger status.
    await this.prisma.payoutDetail.updateMany({
      where: { batchId },
      data: { status: 'PROCESSED' }
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
}
