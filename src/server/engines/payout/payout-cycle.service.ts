import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface PayoutCycleDefinition {
  cycleIdentifier: string; // e.g. "2026-09-CYCLE-1", "2026-09-CYCLE-2"
  payoutYear: number;
  payoutMonth: number; // 1-12
  cycleNumber: 1 | 2;
  periodStart: Date;
  periodEnd: Date;
  cutoffDate: Date;
  payoutDate: Date;
  totalCycleDays: number;
  label: string;
}

@Injectable()
export class PayoutCycleService {
  private readonly logger = new Logger(PayoutCycleService.name);

  /**
   * Returns the exact number of days in a given month and year dynamically.
   * Handles leap years (e.g. Feb 2028 -> 29, Feb 2026 -> 28), 30-day, and 31-day months.
   * @param year 4-digit year (e.g. 2026)
   * @param month 1-indexed month (1 = Jan, ..., 12 = Dec)
   */
  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  /**
   * Formats a canonical cycle identifier: YYYY-MM-CYCLE-1 or YYYY-MM-CYCLE-2
   */
  formatCycleIdentifier(payoutYear: number, payoutMonth: number, cycleNumber: 1 | 2): string {
    const mm = String(payoutMonth).padStart(2, '0');
    return `${payoutYear}-${mm}-CYCLE-${cycleNumber}`;
  }

  /**
   * Generates the precise PayoutCycleDefinition for a specific payout year, payout month, and cycle number.
   * - Cycle 1: 5th (00:00:00) to 19th (23:59:59.999), Cutoff 19th, Payout 21st.
   * - Cycle 2: 20th of previous month (00:00:00) to 4th of current month (23:59:59.999), Cutoff 4th, Payout 6th.
   */
  createCycleDefinition(payoutYear: number, payoutMonth: number, cycleNumber: 1 | 2): PayoutCycleDefinition {
    const cycleIdentifier = this.formatCycleIdentifier(payoutYear, payoutMonth, cycleNumber);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[payoutMonth - 1];

    if (cycleNumber === 1) {
      // Cycle 1: 5th to 19th of current payout month
      const periodStart = new Date(payoutYear, payoutMonth - 1, 5, 0, 0, 0, 0);
      const periodEnd = new Date(payoutYear, payoutMonth - 1, 19, 23, 59, 59, 999);
      const cutoffDate = new Date(periodEnd);
      const payoutDate = new Date(payoutYear, payoutMonth - 1, 21, 0, 0, 0, 0);
      const totalCycleDays = 19 - 5 + 1; // 15 days

      return {
        cycleIdentifier,
        payoutYear,
        payoutMonth,
        cycleNumber: 1,
        periodStart,
        periodEnd,
        cutoffDate,
        payoutDate,
        totalCycleDays,
        label: `${monthName} ${payoutYear} - Cycle 1 (5th - 19th ${monthName}, Payout: 21st ${monthName})`,
      };
    } else {
      // Cycle 2: 20th of previous month to 4th of current payout month
      let prevYear = payoutYear;
      let prevMonth = payoutMonth - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }

      const prevMonthDays = this.getDaysInMonth(prevYear, prevMonth);
      const prevMonthName = monthNames[prevMonth - 1];

      const periodStart = new Date(prevYear, prevMonth - 1, 20, 0, 0, 0, 0);
      const periodEnd = new Date(payoutYear, payoutMonth - 1, 4, 23, 59, 59, 999);
      const cutoffDate = new Date(periodEnd);
      const payoutDate = new Date(payoutYear, payoutMonth - 1, 6, 0, 0, 0, 0);
      
      // Days from 20th to end of prevMonth inclusive + 4 days of current month
      const daysInPrevMonthSpan = prevMonthDays - 20 + 1;
      const totalCycleDays = daysInPrevMonthSpan + 4;

      return {
        cycleIdentifier,
        payoutYear,
        payoutMonth,
        cycleNumber: 2,
        periodStart,
        periodEnd,
        cutoffDate,
        payoutDate,
        totalCycleDays,
        label: `${monthName} ${payoutYear} - Cycle 2 (20th ${prevMonthName} - 4th ${monthName}, Payout: 6th ${monthName})`,
      };
    }
  }

  /**
   * Resolves an arbitrary date to its authoritative payout cycle.
   * - Date 5th to 19th -> Cycle 1 of current month (Payout 21st)
   * - Date 20th to end of month -> Cycle 2 of next month (Payout 6th of next month)
   * - Date 1st to 4th -> Cycle 2 of current month (Payout 6th of current month)
   */
  resolvePayoutCycle(targetDate: Date): PayoutCycleDefinition {
    const d = new Date(targetDate);
    const day = d.getDate();
    const currentMonth = d.getMonth() + 1; // 1-12
    const currentYear = d.getFullYear();

    if (day >= 5 && day <= 19) {
      // Cycle 1 of current month
      return this.createCycleDefinition(currentYear, currentMonth, 1);
    } else if (day >= 20) {
      // Cycle 2 of following month
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      return this.createCycleDefinition(nextYear, nextMonth, 2);
    } else {
      // day is 1 to 4: Cycle 2 of current month
      return this.createCycleDefinition(currentYear, currentMonth, 2);
    }
  }

  /**
   * Parses and returns a PayoutCycleDefinition from its canonical identifier (e.g. "2026-09-CYCLE-1")
   */
  getCycleByIdentifier(cycleIdentifier: string): PayoutCycleDefinition {
    const match = cycleIdentifier.trim().match(/^(\d{4})-(\d{2})-CYCLE-(1|2)$/);
    if (!match) {
      throw new BadRequestException(
        `Invalid cycle identifier format '${cycleIdentifier}'. Expected format: YYYY-MM-CYCLE-1 or YYYY-MM-CYCLE-2.`
      );
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const cycleNum = parseInt(match[3], 10) as 1 | 2;

    if (month < 1 || month > 12) {
      throw new BadRequestException(`Invalid month '${month}' in cycle identifier.`);
    }

    return this.createCycleDefinition(year, month, cycleNum);
  }

  /**
   * Returns all 24 canonical fortnightly cycles for a given year.
   */
  getCanonicalCycleMatrix(year: number): PayoutCycleDefinition[] {
    const cycles: PayoutCycleDefinition[] = [];
    for (let month = 1; month <= 12; month++) {
      cycles.push(this.createCycleDefinition(year, month, 1));
      cycles.push(this.createCycleDefinition(year, month, 2));
    }
    return cycles;
  }

  /**
   * Returns available cycles relative to the current date (e.g. recent past and upcoming cycles).
   */
  getAvailableCycles(pastMonths = 3, futureMonths = 3): PayoutCycleDefinition[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const list: PayoutCycleDefinition[] = [];
    const seen = new Set<string>();

    for (let offset = -pastMonths; offset <= futureMonths; offset++) {
      let y = currentYear;
      let m = currentMonth + offset;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      while (m > 12) {
        m -= 12;
        y += 1;
      }

      for (const num of [1, 2] as const) {
        const cycle = this.createCycleDefinition(y, m, num);
        if (!seen.has(cycle.cycleIdentifier)) {
          seen.add(cycle.cycleIdentifier);
          list.push(cycle);
        }
      }
    }

    // Sort chronologically by cutoffDate
    return list.sort((a, b) => a.cutoffDate.getTime() - b.cutoffDate.getTime());
  }
}
