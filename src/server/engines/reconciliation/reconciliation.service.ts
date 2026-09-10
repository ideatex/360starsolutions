import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { HoldingLedgerType, Prisma } from '@prisma/client';

export interface ReconciliationCheckResult {
  checkType: string;
  expectedValue: number;
  actualValue: number;
  difference: number;
  isBalanced: boolean;
  notes: string;
  discrepancies?: any[];
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprehensive System Financial Audit & Reconciliation
   */
  async runFullReconciliation() {
    this.logger.log('Starting comprehensive financial reconciliation audit...');

    const results: ReconciliationCheckResult[] = [];

    // 1. Reconcile Holding Balances for all Zero-Contribution and active accounts
    const holdingResult = await this.reconcileHoldingBalances();
    results.push(holdingResult);

    // 2. Reconcile Payout Batches vs Payout Details
    const payoutResult = await this.reconcilePayoutBatches();
    results.push(payoutResult);

    // 3. Reconcile Contribution Fund summaries
    const contribResult = await this.reconcileContributions();
    results.push(contribResult);

    // 4. Reconcile Commission Ledger math
    const commissionResult = await this.reconcileCommissions();
    results.push(commissionResult);

    // Log to ReconciliationLog table
    for (const res of results) {
      await this.prisma.reconciliationLog.create({
        data: {
          checkType: res.checkType,
          expectedValue: new Prisma.Decimal(res.expectedValue),
          actualValue: new Prisma.Decimal(res.actualValue),
          difference: new Prisma.Decimal(res.difference),
          status: res.isBalanced ? 'BALANCED' : 'DISCREPANCY',
          details: res.discrepancies && res.discrepancies.length > 0 ? res.discrepancies : undefined,
        },
      });
    }

    this.logger.log(
      `Reconciliation audit completed. Total checks: ${results.length}. Balanced: ${results.filter((r) => r.isBalanced).length}`
    );

    return {
      timestamp: new Date(),
      totalChecks: results.length,
      allBalanced: results.every((r) => r.isBalanced),
      checks: results,
    };
  }

  /**
   * Verify holdingBalance == sum(WITHHOLDING) - sum(AUTO_CONVERSION)
   */
  async reconcileHoldingBalances(): Promise<ReconciliationCheckResult> {
    const shareholders = await this.prisma.shareholder.findMany({
      select: { id: true, shareholderId: true, holdingBalance: true },
    });

    let totalExpected = 0;
    let totalActual = 0;
    const discrepancies: any[] = [];

    for (const sh of shareholders) {
      const actualBalance = Number(sh.holdingBalance || 0);
      totalActual += actualBalance;

      const [withheldAgg, convertedAgg] = await Promise.all([
        this.prisma.holdingLedger.aggregate({
          where: { shareholderId: sh.id, type: HoldingLedgerType.WITHHOLDING },
          _sum: { amount: true },
        }),
        this.prisma.holdingLedger.aggregate({
          where: { shareholderId: sh.id, type: HoldingLedgerType.AUTO_CONVERSION },
          _sum: { amount: true },
        }),
      ]);

      const expectedBalance =
        Math.round((Number(withheldAgg._sum.amount || 0) - Number(convertedAgg._sum.amount || 0)) * 100) / 100;
      totalExpected += expectedBalance;

      const diff = Math.abs(actualBalance - expectedBalance);
      if (diff > 0.01) {
        discrepancies.push({
          shareholderId: sh.shareholderId,
          actual: actualBalance,
          expected: expectedBalance,
          difference: diff,
        });
      }
    }

    const totalDiff = Math.abs(totalActual - totalExpected);

    return {
      checkType: 'HOLDING_BALANCE_INTEGRITY',
      expectedValue: totalExpected,
      actualValue: totalActual,
      difference: totalDiff,
      isBalanced: totalDiff <= 0.05 && discrepancies.length === 0,
      notes: discrepancies.length === 0
        ? 'All holding balances perfectly match append-only holding ledger records.'
        : `Discrepancies found in ${discrepancies.length} shareholder accounts.`,
      discrepancies,
    };
  }

  /**
   * Verify payoutBatch.totalAmount == sum(payoutDetail.totalAmount)
   */
  async reconcilePayoutBatches(): Promise<ReconciliationCheckResult> {
    const batches = await this.prisma.payoutBatch.findMany({
      include: {
        details: true,
      },
    });

    let totalBatchAmount = 0;
    let totalDetailsSum = 0;
    const discrepancies: any[] = [];

    for (const batch of batches) {
      const batchAmount = Number(batch.totalAmount);
      totalBatchAmount += batchAmount;

      const sumDetails = batch.details.reduce((acc, d) => acc + Number(d.totalAmount), 0);
      totalDetailsSum += sumDetails;

      const diff = Math.abs(batchAmount - sumDetails);
      if (diff > 0.05) {
        discrepancies.push({
          batchId: batch.id,
          idempotencyKey: batch.idempotencyKey,
          batchTotal: batchAmount,
          detailsTotal: sumDetails,
          difference: diff,
        });
      }
    }

    const totalDiff = Math.abs(totalBatchAmount - totalDetailsSum);

    return {
      checkType: 'PAYOUT_BATCH_INTEGRITY',
      expectedValue: totalDetailsSum,
      actualValue: totalBatchAmount,
      difference: totalDiff,
      isBalanced: totalDiff <= 0.05 && discrepancies.length === 0,
      notes: discrepancies.length === 0
        ? 'All payout batches match statement details aggregate sums.'
        : `Discrepancies found in ${discrepancies.length} batches.`,
      discrepancies,
    };
  }

  /**
   * Verify contribution sum matches contributionSummary
   */
  async reconcileContributions(): Promise<ReconciliationCheckResult> {
    const approvedContribs = await this.prisma.contribution.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });

    const summaries = await this.prisma.contributionSummary.aggregate({
      _sum: { totalApproved: true },
    });

    const expected = Number(approvedContribs._sum.amount || 0);
    const actual = Number(summaries._sum.totalApproved || 0);
    const diff = Math.abs(actual - expected);

    return {
      checkType: 'CONTRIBUTION_SUMMARY_INTEGRITY',
      expectedValue: expected,
      actualValue: actual,
      difference: diff,
      isBalanced: diff <= 0.05,
      notes: diff <= 0.05
        ? 'Contribution summaries are in sync with approved contribution records.'
        : `Discrepancy of ₹${diff} between approved contributions and summaries.`,
    };
  }

  /**
   * Verify commission ledger amounts = base * rate
   */
  async reconcileCommissions(): Promise<ReconciliationCheckResult> {
    const commissions = await this.prisma.commissionLedger.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    let verifiedCount = 0;
    const discrepancies: any[] = [];

    for (const c of commissions) {
      if (c.calculationBase && c.rate) {
        const expected = Math.round(Number(c.calculationBase) * Number(c.rate) * 100) / 100;
        const actual = Number(c.amount);
        const diff = Math.abs(actual - expected);

        if (diff > 0.05) {
          discrepancies.push({
            id: c.id,
            base: Number(c.calculationBase),
            rate: Number(c.rate),
            expected,
            actual,
          });
        } else {
          verifiedCount++;
        }
      }
    }

    return {
      checkType: 'COMMISSION_MATH_INTEGRITY',
      expectedValue: verifiedCount + discrepancies.length,
      actualValue: verifiedCount,
      difference: discrepancies.length,
      isBalanced: discrepancies.length === 0,
      notes: discrepancies.length === 0
        ? `All ${verifiedCount} sampled commission records verify exact percentage math.`
        : `${discrepancies.length} commission calculation discrepancies detected.`,
      discrepancies,
    };
  }

  /**
   * Get historical audit logs from ReconciliationLog table
   */
  async getHistoricalLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.reconciliationLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reconciliationLog.count(),
    ]);

    return {
      logs,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
}
