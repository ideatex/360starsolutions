import { Injectable, Logger } from '@nestjs/common';
import { PayoutCycleService, PayoutCycleDefinition } from './payout-cycle.service';

export interface ProrationCalculationResult {
  contributionId: string;
  shareholderId: string;
  principalAmount: number;
  investmentDate: Date;
  isFirstPayout: boolean;
  activeDays: number;
  monthlyRate: number;
  dailyRate: number;
  dailyRateBasis: 'MONTH_DAYS' | 'CYCLE_DAYS';
  profitAmount: number;
  cycleIdentifier: string;
  cutoffDate: Date;
  payoutDate: Date;
}

@Injectable()
export class FirstPayoutProrationService {
  private readonly logger = new Logger(FirstPayoutProrationService.name);

  // Authoritative monthly profit share rate: 5%
  public static readonly DEFAULT_MONTHLY_RATE = 0.05;

  constructor(private readonly payoutCycleService: PayoutCycleService) {}

  /**
   * Identifies which cycle a newly activated Contribution Fund first participates in.
   * Enforces Product 360 Rules A, B, and C:
   * - Rule A: 5 <= D <= 19 -> Cycle 1 of Month M (Cutoff 19th, Payout 21st)
   * - Rule B: 20 <= D <= endOfMonth -> Cycle 2 of Month M + 1 (Cutoff 4th of M+1, Payout 6th of M+1)
   * - Rule C: 1 <= D <= 4 -> Cycle 2 of Month M (Cutoff 4th of M, Payout 6th of M)
   */
  getFirstPayoutCycle(investmentDate: Date): PayoutCycleDefinition {
    const d = new Date(investmentDate);
    const day = d.getDate();
    const month = d.getMonth() + 1; // 1-12
    const year = d.getFullYear();

    if (day >= 5 && day <= 19) {
      // Rule A: Belongs to Cycle 1 of current Month M
      return this.payoutCycleService.createCycleDefinition(year, month, 1);
    } else if (day >= 20) {
      // Rule B: Belongs to Cycle 2 of next applicable Month M + 1
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      return this.payoutCycleService.createCycleDefinition(nextYear, nextMonth, 2);
    } else {
      // Rule C: 1 <= D <= 4: Belongs to Cycle 2 of current Month M
      return this.payoutCycleService.createCycleDefinition(year, month, 2);
    }
  }

  /**
   * Calculates inclusive active days (N) for a first payout.
   * Preserves inclusive day counting: day of investment counts as an active day.
   *
   * Example: Investment on August 27, Cutoff September 4:
   * August days: 31 - 27 + 1 = 5
   * September days: 4
   * Total N = 5 + 4 = 9 days.
   */
  calculateFirstPayoutActiveDays(investmentDate: Date, targetCycle: PayoutCycleDefinition): number {
    const d = new Date(investmentDate);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    if (targetCycle.cycleNumber === 1) {
      // Rule A: Investment was made between 5th and 19th of targetCycle's month
      // Cutoff is 19th: N = 19 - D + 1
      return Math.max(1, 19 - day + 1);
    } else {
      // Cycle 2: Cutoff is 4th of targetCycle's payout month
      if (day >= 20) {
        // Rule B: Invested in second half of previous month (20th to endOfMonth)
        const daysInInvestMonth = this.payoutCycleService.getDaysInMonth(year, month);
        const daysInInvestMonthSpan = daysInInvestMonth - day + 1; // inclusive
        const daysInCutoffMonth = 4; // 1st through 4th inclusive
        return Math.max(1, daysInInvestMonthSpan + daysInCutoffMonth);
      } else {
        // Rule C: Invested between 1st and 4th of targetCycle's payout month
        return Math.max(1, 4 - day + 1); // inclusive
      }
    }
  }

  /**
   * Calculates Profit Share for a contribution in a specific cycle:
   * - If this is the contribution's first payout cycle: applies Rule A/B/C proration.
   * - If this is a subsequent cycle: applies standard full fortnightly 2.5% share.
   * - If contribution was activated after cycle cutoff: returns profitAmount = 0.
   *
   * @param principal Principal contribution fund amount (Rs.)
   * @param investmentDate Date the contribution was activated
   * @param targetCycle The canonical cycle being processed
   * @param monthlyRate Monthly rate (default 0.05 = 5%)
   * @param basis 'MONTH_DAYS' (default, 5% / daysInMonth) or 'CYCLE_DAYS' (2.5% / cycleDays)
   */
  calculateContributionProfitForCycle(
    contributionId: string,
    shareholderId: string,
    principal: number,
    investmentDate: Date,
    targetCycle: PayoutCycleDefinition,
    monthlyRate = FirstPayoutProrationService.DEFAULT_MONTHLY_RATE,
    basis: 'MONTH_DAYS' | 'CYCLE_DAYS' = 'MONTH_DAYS',
  ): ProrationCalculationResult {
    const investDate = new Date(investmentDate);
    const firstCycle = this.getFirstPayoutCycle(investDate);

    // If investment belongs to a future cycle, it is not eligible in this cycle
    if (firstCycle.cutoffDate.getTime() > targetCycle.cutoffDate.getTime()) {
      return {
        contributionId,
        shareholderId,
        principalAmount: principal,
        investmentDate: investDate,
        isFirstPayout: false,
        activeDays: 0,
        monthlyRate,
        dailyRate: 0,
        dailyRateBasis: basis,
        profitAmount: 0,
        cycleIdentifier: targetCycle.cycleIdentifier,
        cutoffDate: targetCycle.cutoffDate,
        payoutDate: targetCycle.payoutDate,
      };
    }

    const isFirstPayout = firstCycle.cycleIdentifier === targetCycle.cycleIdentifier;

    if (isFirstPayout) {
      // First Payout Proration
      const activeDays = this.calculateFirstPayoutActiveDays(investDate, targetCycle);
      const investYear = investDate.getFullYear();
      const investMonth = investDate.getMonth() + 1;
      const daysInInvestMonth = this.payoutCycleService.getDaysInMonth(investYear, investMonth);

      let dailyRate: number;
      if (basis === 'MONTH_DAYS') {
        // Daily Rate = Monthly Rate (5%) / Total Days in Active Month of investment
        dailyRate = monthlyRate / daysInInvestMonth;
      } else {
        // Daily Rate = Fortnightly Rate (2.5%) / Total Days in Cycle
        const cycleRate = monthlyRate / 2;
        dailyRate = cycleRate / targetCycle.totalCycleDays;
      }

      // Preserve full internal precision, round to 2 decimal places at final currency stage
      const rawProfit = principal * dailyRate * activeDays;
      const profitAmount = Math.round(rawProfit * 100) / 100;

      return {
        contributionId,
        shareholderId,
        principalAmount: principal,
        investmentDate: investDate,
        isFirstPayout: true,
        activeDays,
        monthlyRate,
        dailyRate,
        dailyRateBasis: basis,
        profitAmount,
        cycleIdentifier: targetCycle.cycleIdentifier,
        cutoffDate: targetCycle.cutoffDate,
        payoutDate: targetCycle.payoutDate,
      };
    } else {
      // Second and subsequent payouts: Standard Full Fortnightly 2.5% Share
      const cycleRate = monthlyRate / 2; // 0.025 (2.5%)
      const rawProfit = principal * cycleRate;
      const profitAmount = Math.round(rawProfit * 100) / 100;

      return {
        contributionId,
        shareholderId,
        principalAmount: principal,
        investmentDate: investDate,
        isFirstPayout: false,
        activeDays: targetCycle.totalCycleDays,
        monthlyRate,
        dailyRate: cycleRate / targetCycle.totalCycleDays,
        dailyRateBasis: basis,
        profitAmount,
        cycleIdentifier: targetCycle.cycleIdentifier,
        cutoffDate: targetCycle.cutoffDate,
        payoutDate: targetCycle.payoutDate,
      };
    }
  }

  /**
   * Calculates Gratitude Share for a downline contribution in a specific cycle:
   * - If this is the contribution's first payout cycle: applies Rule A/B/C proration based on monthly gratitude rate.
   * - If this is a subsequent cycle: applies standard fortnightly cycle rate (monthlyRate / 2).
   * - If contribution was activated after cycle cutoff: returns 0.
   */
  calculateContributionGratitudeForCycle(
    principal: number,
    investmentDate: Date,
    targetCycle: PayoutCycleDefinition,
    monthlyGratitudeRate: number,
    basis: 'MONTH_DAYS' | 'CYCLE_DAYS' = 'MONTH_DAYS',
  ): { gratitudeAmount: number; isFirstPayout: boolean; activeDays: number; cycleRate: number } {
    const investDate = new Date(investmentDate);
    const firstCycle = this.getFirstPayoutCycle(investDate);

    // If investment belongs to a future cycle, it is not eligible in this cycle
    if (firstCycle.cutoffDate.getTime() > targetCycle.cutoffDate.getTime()) {
      return { gratitudeAmount: 0, isFirstPayout: false, activeDays: 0, cycleRate: 0 };
    }

    const isFirstPayout = firstCycle.cycleIdentifier === targetCycle.cycleIdentifier;

    if (isFirstPayout) {
      const activeDays = this.calculateFirstPayoutActiveDays(investDate, targetCycle);
      const investYear = investDate.getFullYear();
      const investMonth = investDate.getMonth() + 1;
      const daysInInvestMonth = this.payoutCycleService.getDaysInMonth(investYear, investMonth);

      let dailyRate: number;
      if (basis === 'MONTH_DAYS') {
        dailyRate = monthlyGratitudeRate / daysInInvestMonth;
      } else {
        const cycleRate = monthlyGratitudeRate / 2;
        dailyRate = cycleRate / targetCycle.totalCycleDays;
      }

      const effectiveRate = dailyRate * activeDays;
      const rawGratitude = principal * effectiveRate;
      const gratitudeAmount = Math.round(rawGratitude * 100) / 100;
      return { gratitudeAmount, isFirstPayout: true, activeDays, cycleRate: effectiveRate };
    } else {
      // Subsequent cycles: Fortnightly cycle rate = monthlyGratitudeRate / 2
      const cycleRate = monthlyGratitudeRate / 2;
      const rawGratitude = principal * cycleRate;
      const gratitudeAmount = Math.round(rawGratitude * 100) / 100;
      return { gratitudeAmount, isFirstPayout: false, activeDays: targetCycle.totalCycleDays, cycleRate };
    }
  }
}

