import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { BusinessConfigService } from '@server/business-config/business-config.service';
import { Prisma, ContributionStatus, UserStatus } from '@prisma/client';

export interface ProfitShareCycleResult {
  shareholderId: string;
  contributionId: string;
  contributionAmount: number;
  monthlyRate: number;
  cycleRate: number;
  eligibleDays: number;
  totalCycleDays: number;
  isFirstCycle: boolean;
  profitAmount: number;
}

@Injectable()
export class ProfitSharingService {
  private readonly logger = new Logger(ProfitSharingService.name);

  // Default Product 360 monthly profit share: 5% (0.05)
  public static readonly DEFAULT_MONTHLY_RATE = 0.05;

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessConfigService: BusinessConfigService,
  ) {}

  /**
   * Helper: Determine active payout cycle boundaries for a given date
   * Product 360 Calendar:
   * Cycle 1: 5th (00:00:00) to 19th (23:59:59) -> Payout Date: 21st
   * Cycle 2: 20th (00:00:00) to 4th of following month (23:59:59) -> Payout Date: 6th
   */
  getCycleBoundariesForDate(targetDate: Date = new Date()): {
    cycleNumber: 1 | 2;
    cycleStart: Date;
    cycleEnd: Date;
    payoutDate: Date;
  } {
    const day = targetDate.getDate();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed

    if (day >= 5 && day <= 19) {
      // Cycle 1: 5th to 19th of current month
      return {
        cycleNumber: 1,
        cycleStart: new Date(year, month, 5, 0, 0, 0, 0),
        cycleEnd: new Date(year, month, 19, 23, 59, 59, 999),
        payoutDate: new Date(year, month, 21),
      };
    } else if (day >= 20) {
      // Cycle 2 (first half): 20th of current month to 4th of next month
      return {
        cycleNumber: 2,
        cycleStart: new Date(year, month, 20, 0, 0, 0, 0),
        cycleEnd: new Date(year, month + 1, 4, 23, 59, 59, 999),
        payoutDate: new Date(year, month + 1, 6),
      };
    } else {
      // day is 1 to 4: Cycle 2 (second half): 20th of PREVIOUS month to 4th of current month
      return {
        cycleNumber: 2,
        cycleStart: new Date(year, month - 1, 20, 0, 0, 0, 0),
        cycleEnd: new Date(year, month, 4, 23, 59, 59, 999),
        payoutDate: new Date(year, month, 6),
      };
    }
  }

  /**
   * Cron job checking daily at 00:05 UTC if yesterday closed a cycle.
   * Cycle 1 closes on the 19th at 23:59:59 (detected on 20th morning).
   * Cycle 2 closes on the 4th at 23:59:59 (detected on 5th morning).
   */
  @Cron('5 0 * * *')
  async handleDailyCycleTrigger() {
    const now = new Date();
    const day = now.getDate();

    if (day === 20) {
      // Cycle 1 just closed on the 19th
      const cycle = this.getCycleBoundariesForDate(new Date(now.getFullYear(), now.getMonth(), 19));
      this.logger.log(`[CRON] Cycle 1 closed. Processing profit share for ${cycle.cycleStart.toISOString()} - ${cycle.cycleEnd.toISOString()}`);
      await this.calculateAndPersistProfits(cycle.cycleStart, cycle.cycleEnd);
    } else if (day === 5) {
      // Cycle 2 just closed on the 4th
      const cycle = this.getCycleBoundariesForDate(new Date(now.getFullYear(), now.getMonth(), 4));
      this.logger.log(`[CRON] Cycle 2 closed. Processing profit share for ${cycle.cycleStart.toISOString()} - ${cycle.cycleEnd.toISOString()}`);
      await this.calculateAndPersistProfits(cycle.cycleStart, cycle.cycleEnd);
    }
  }

  /**
   * Authoritative calculation of 5% monthly profit share for a given cycle.
   * Does NOT persist to DB; used for preview and inside the persistence workflow.
   */
  async computeProfitsForCycle(cycleStart: Date, cycleEnd: Date): Promise<ProfitShareCycleResult[]> {
    let config;
    try {
      config = await this.businessConfigService.getLatest();
    } catch {
      this.logger.warn('Business config not ready, using default 5% rate.');
    }

    // Authoritative Product 360 rate: 5% monthly = 0.05
    const monthlyRate = config?.profitSharingPercentage
      ? Number(config.profitSharingPercentage)
      : ProfitSharingService.DEFAULT_MONTHLY_RATE;

    // Semi-monthly cycle rate = 5% / 2 = 2.5% (0.025) per full cycle
    const fullCycleRate = monthlyRate / 2;

    // Days in this cycle
    const cycleDurationMs = cycleEnd.getTime() - cycleStart.getTime();
    const totalCycleDays = Math.max(1, Math.round(cycleDurationMs / (1000 * 60 * 60 * 24)));

    // Fetch only active shareholders with APPROVED contributions
    const contributions = await this.prisma.contribution.findMany({
      where: {
        status: ContributionStatus.APPROVED,
        date: { lte: cycleEnd },
        shareholder: {
          status: { notIn: [UserStatus.BLOCKED, UserStatus.DELETED] },
          accountType: { not: 'ZERO_CONTRIBUTION' }, // Zero contribution accounts do not have contribution funds
        },
      },
      include: {
        shareholder: {
          select: {
            id: true,
            shareholderId: true,
            name: true,
            status: true,
            accountType: true,
          },
        },
      },
    });

    const results: ProfitShareCycleResult[] = [];

    for (const contribution of contributions) {
      const contribAmount = Number(contribution.amount);
      if (contribAmount <= 0) continue;

      const contribDate = new Date(contribution.date);
      const validityMonths = contribution.validityMonths || 12;

      // Check expiry
      const expiryDate = new Date(contribDate);
      expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
      if (cycleStart >= expiryDate) {
        // Contribution has expired
        continue;
      }

      const isFirstCycle = contribDate >= cycleStart && contribDate <= cycleEnd;
      let profitAmount = 0;
      let eligibleDays = totalCycleDays;
      let effectiveCycleRate = fullCycleRate;

      if (isFirstCycle) {
        // Mid-cycle activation proration:
        // [PENDING CLIENT CLARIFICATION]: Proration base (actual cycle days vs 15-day fixed vs 30-day month).
        // Standard high-precision implementation: Actual elapsed days in cycle / total days in cycle * full cycle rate.
        const elapsedMs = cycleEnd.getTime() - contribDate.getTime();
        eligibleDays = Math.max(1, Math.min(totalCycleDays, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1));
        const prorationRatio = eligibleDays / totalCycleDays;
        effectiveCycleRate = fullCycleRate * prorationRatio;
        profitAmount = Math.round((contribAmount * effectiveCycleRate) * 100) / 100;
      } else {
        // Standard full cycle: exactly 2.5% of contribution amount
        profitAmount = Math.round((contribAmount * fullCycleRate) * 100) / 100;
      }

      if (profitAmount > 0) {
        results.push({
          shareholderId: contribution.shareholderId,
          contributionId: contribution.id,
          contributionAmount: contribAmount,
          monthlyRate,
          cycleRate: effectiveCycleRate,
          eligibleDays,
          totalCycleDays,
          isFirstCycle,
          profitAmount,
        });
      }
    }

    return results;
  }

  /**
   * Computes and writes ProfitLedger entries for the cycle with PENDING status.
   * Ensures idempotency: skips contributions that already have a ProfitLedger record for this cycle.
   */
  async calculateAndPersistProfits(cycleStart: Date, cycleEnd: Date) {
    const calculations = await this.computeProfitsForCycle(cycleStart, cycleEnd);
    let createdCount = 0;
    let totalProfitSum = 0;

    for (const calc of calculations) {
      // Check if already calculated for this contribution and cycle
      const existing = await this.prisma.profitLedger.findFirst({
        where: {
          shareholderId: calc.shareholderId,
          contributionId: calc.contributionId,
          cycleStart: { gte: new Date(cycleStart.getTime() - 1000) },
          cycleEnd: { lte: new Date(cycleEnd.getTime() + 1000) },
        },
      });

      if (existing) {
        this.logger.debug(`ProfitLedger already exists for shareholder ${calc.shareholderId}, contribution ${calc.contributionId}, skipping.`);
        continue;
      }

      await this.prisma.profitLedger.create({
        data: {
          shareholderId: calc.shareholderId,
          contributionId: calc.contributionId,
          cycleStart,
          cycleEnd,
          eligibleDays: calc.eligibleDays,
          amount: new Prisma.Decimal(calc.profitAmount),
          status: 'PENDING',
        },
      });

      createdCount++;
      totalProfitSum += calc.profitAmount;
    }

    this.logger.log(
      `Persisted ${createdCount} ProfitLedger entries totaling ₹${totalProfitSum.toLocaleString('en-IN')} for cycle ${cycleStart.toLocaleDateString()} - ${cycleEnd.toLocaleDateString()}`
    );

    return {
      cycleStart,
      cycleEnd,
      entriesCreated: createdCount,
      totalAmount: totalProfitSum,
    };
  }

  /**
   * Manual preview endpoint for Super Admin / Admin inspection prior to payout generation
   */
  async previewProfits(cycleStart: Date, cycleEnd: Date) {
    const calculations = await this.computeProfitsForCycle(cycleStart, cycleEnd);
    const totalAmount = calculations.reduce((sum, c) => sum + c.profitAmount, 0);

    return {
      cycleStart,
      cycleEnd,
      monthlyRatePercentage: (ProfitSharingService.DEFAULT_MONTHLY_RATE * 100).toFixed(2) + '%',
      totalShareholders: new Set(calculations.map((c) => c.shareholderId)).size,
      totalContributions: calculations.length,
      totalProfitAmount: totalAmount,
      items: calculations,
    };
  }
}
