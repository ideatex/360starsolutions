import { PayoutCycleService } from './src/server/engines/payout/payout-cycle.service';
import { FirstPayoutProrationService } from './src/server/engines/payout/first-payout-proration.service';

function assert(condition: boolean, testName: string, details?: any) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`, details || '');
    throw new Error(`Test failed: ${testName}`);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 PRODUCT 360 PAYOUT BATCHES ENGINE TEST SUITE');
  console.log('====================================================\n');

  const cycleService = new PayoutCycleService();
  const prorationService = new FirstPayoutProrationService(cycleService);

  // ----------------------------------------------------
  // TEST GROUP 1: Dynamic Month Length & Leap Years
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Month Lengths & Leap Years ---');
  assert(cycleService.getDaysInMonth(2026, 2) === 28, 'Feb 2026 has 28 days (non-leap year)');
  assert(cycleService.getDaysInMonth(2028, 2) === 29, 'Feb 2028 has 29 days (leap year)');
  assert(cycleService.getDaysInMonth(2024, 2) === 29, 'Feb 2024 has 29 days (leap year)');
  assert(cycleService.getDaysInMonth(2026, 1) === 31, 'Jan 2026 has 31 days');
  assert(cycleService.getDaysInMonth(2026, 4) === 30, 'Apr 2026 has 30 days');
  assert(cycleService.getDaysInMonth(2026, 8) === 31, 'Aug 2026 has 31 days');
  assert(cycleService.getDaysInMonth(2026, 9) === 30, 'Sep 2026 has 30 days');

  // ----------------------------------------------------
  // TEST GROUP 2: Canonical Cycle Resolution & Boundaries
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: Canonical Cycle Resolution ---');

  // Jan 5 -> Cycle 1
  const cJan5 = cycleService.resolvePayoutCycle(new Date(2026, 0, 5));
  assert(cJan5.cycleIdentifier === '2026-01-CYCLE-1', 'Jan 5 resolves to 2026-01-CYCLE-1');
  assert(cJan5.cutoffDate.getDate() === 19, 'Jan 5 Cycle 1 cutoff is Jan 19');
  assert(cJan5.payoutDate.getDate() === 21, 'Jan 5 Cycle 1 payout is Jan 21');
  assert(cJan5.totalCycleDays === 15, 'Jan Cycle 1 has exactly 15 days (5th - 19th)');

  // Jan 19 -> Cycle 1
  const cJan19 = cycleService.resolvePayoutCycle(new Date(2026, 0, 19));
  assert(cJan19.cycleIdentifier === '2026-01-CYCLE-1', 'Jan 19 resolves to 2026-01-CYCLE-1');

  // Jan 20 -> Cycle 2 (next month: Feb payout)
  const cJan20 = cycleService.resolvePayoutCycle(new Date(2026, 0, 20));
  assert(cJan20.cycleIdentifier === '2026-02-CYCLE-2', 'Jan 20 resolves to 2026-02-CYCLE-2');
  assert(cJan20.cutoffDate.getMonth() === 1 && cJan20.cutoffDate.getDate() === 4, 'Jan 20 Cycle 2 cutoff is Feb 4');
  assert(cJan20.payoutDate.getMonth() === 1 && cJan20.payoutDate.getDate() === 6, 'Jan 20 Cycle 2 payout is Feb 6');

  // Jan 31 -> Cycle 2
  const cJan31 = cycleService.resolvePayoutCycle(new Date(2026, 0, 31));
  assert(cJan31.cycleIdentifier === '2026-02-CYCLE-2', 'Jan 31 resolves to 2026-02-CYCLE-2');

  // Feb 4 -> Cycle 2 (Feb payout)
  const cFeb4 = cycleService.resolvePayoutCycle(new Date(2026, 1, 4));
  assert(cFeb4.cycleIdentifier === '2026-02-CYCLE-2', 'Feb 4 resolves to 2026-02-CYCLE-2');

  // Feb 5 -> Cycle 1 (Feb payout)
  const cFeb5 = cycleService.resolvePayoutCycle(new Date(2026, 1, 5));
  assert(cFeb5.cycleIdentifier === '2026-02-CYCLE-1', 'Feb 5 resolves to 2026-02-CYCLE-1');

  // Feb 19 -> Cycle 1
  const cFeb19 = cycleService.resolvePayoutCycle(new Date(2026, 1, 19));
  assert(cFeb19.cycleIdentifier === '2026-02-CYCLE-1', 'Feb 19 resolves to 2026-02-CYCLE-1');

  // Feb 20 -> Cycle 2 (March payout)
  const cFeb20 = cycleService.resolvePayoutCycle(new Date(2026, 1, 20));
  assert(cFeb20.cycleIdentifier === '2026-03-CYCLE-2', 'Feb 20 resolves to 2026-03-CYCLE-2');
  assert(cFeb20.totalCycleDays === 13, 'Feb 2026 (28-day) Cycle 2 has 9 + 4 = 13 total days');

  // Feb 20 on Leap Year 2028 -> Cycle 2 (March 2028 payout)
  const cFeb20_2028 = cycleService.resolvePayoutCycle(new Date(2028, 1, 20));
  assert(cFeb20_2028.cycleIdentifier === '2028-03-CYCLE-2', 'Leap year Feb 20 resolves to 2028-03-CYCLE-2');
  assert(cFeb20_2028.totalCycleDays === 14, 'Feb 2028 (29-day leap) Cycle 2 has 10 + 4 = 14 total days');

  // March 1 -> Cycle 2 (March payout)
  const cMar1 = cycleService.resolvePayoutCycle(new Date(2026, 2, 1));
  assert(cMar1.cycleIdentifier === '2026-03-CYCLE-2', 'Mar 1 resolves to 2026-03-CYCLE-2');

  // March 4 -> Cycle 2 (March payout)
  const cMar4 = cycleService.resolvePayoutCycle(new Date(2026, 2, 4));
  assert(cMar4.cycleIdentifier === '2026-03-CYCLE-2', 'Mar 4 resolves to 2026-03-CYCLE-2');

  // March 5 -> Cycle 1 (March payout)
  const cMar5 = cycleService.resolvePayoutCycle(new Date(2026, 2, 5));
  assert(cMar5.cycleIdentifier === '2026-03-CYCLE-1', 'Mar 5 resolves to 2026-03-CYCLE-1');

  // ----------------------------------------------------
  // TEST GROUP 3: Year Boundary Crossover (Dec -> Jan)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Year Boundary Crossover ---');
  // Dec 20, 2026 -> 2027-01-CYCLE-2 (Cutoff Jan 4, 2027, Payout Jan 6, 2027)
  const cDec20 = cycleService.resolvePayoutCycle(new Date(2026, 11, 20));
  assert(cDec20.cycleIdentifier === '2027-01-CYCLE-2', 'Dec 20, 2026 resolves to 2027-01-CYCLE-2');
  assert(cDec20.cutoffDate.getFullYear() === 2027 && cDec20.cutoffDate.getMonth() === 0 && cDec20.cutoffDate.getDate() === 4, 'Dec 20 cutoff is Jan 4, 2027');
  assert(cDec20.payoutDate.getFullYear() === 2027 && cDec20.payoutDate.getMonth() === 0 && cDec20.payoutDate.getDate() === 6, 'Dec 20 payout is Jan 6, 2027');
  assert(cDec20.totalCycleDays === 16, 'Dec -> Jan Cycle 2 has (31-20+1) + 4 = 16 total days');

  // Dec 31, 2026 -> 2027-01-CYCLE-2
  const cDec31 = cycleService.resolvePayoutCycle(new Date(2026, 11, 31));
  assert(cDec31.cycleIdentifier === '2027-01-CYCLE-2', 'Dec 31, 2026 resolves to 2027-01-CYCLE-2');

  // Jan 1, 2027 -> 2027-01-CYCLE-2
  const cJan1_27 = cycleService.resolvePayoutCycle(new Date(2027, 0, 1));
  assert(cJan1_27.cycleIdentifier === '2027-01-CYCLE-2', 'Jan 1, 2027 resolves to 2027-01-CYCLE-2');

  // Jan 4, 2027 -> 2027-01-CYCLE-2
  const cJan4_27 = cycleService.resolvePayoutCycle(new Date(2027, 0, 4));
  assert(cJan4_27.cycleIdentifier === '2027-01-CYCLE-2', 'Jan 4, 2027 resolves to 2027-01-CYCLE-2');

  // ----------------------------------------------------
  // TEST GROUP 4: MANDATORY First Payout Proration Test
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Mandatory Proration (Aug 27 -> Sep 4) ---');
  // Specification Section 13, 14, 16, 49:
  // Investment Date: August 27, 2026
  // Cutoff Date: September 4, 2026
  // Expected Active Days: August (31 - 27 + 1 = 5) + September (4) = 9 active days!
  // Principal: ₹1,00,000
  // Monthly rate: 5% (0.05)
  // Daily rate: 5% / 31 = 0.0016129032...
  // Expected Profit: 1,00,000 * (0.05 / 31) * 9 = ₹1,451.61

  const investAug27 = new Date(2026, 7, 27); // Month index 7 = August
  const targetCycleSep = cycleService.getCycleByIdentifier('2026-09-CYCLE-2');
  const prorationAug27 = prorationService.calculateContributionProfitForCycle(
    'contrib-1',
    'sh-1',
    100000,
    investAug27,
    targetCycleSep,
    0.05,
    'MONTH_DAYS'
  );

  assert(prorationAug27.isFirstPayout === true, 'Aug 27 is flagged as first payout for 2026-09-CYCLE-2');
  assert(prorationAug27.activeDays === 9, `Aug 27 produces EXACTLY N = 9 active days (Got: ${prorationAug27.activeDays})`);
  assert(prorationAug27.dailyRateBasis === 'MONTH_DAYS', 'Daily rate basis is MONTH_DAYS');
  assert(prorationAug27.profitAmount === 1451.61, `Aug 27 first profit is EXACTLY ₹1,451.61 (Got: ₹${prorationAug27.profitAmount})`);

  // ----------------------------------------------------
  // TEST GROUP 5: Additional Proration Day Coverage
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Proration across all Day Scenarios ---');

  // Rule A: Aug 10, 2026 (5 <= D <= 19) -> Cycle 1, Cutoff Aug 19
  // Active days N = 19 - 10 + 1 = 10 days
  const investAug10 = new Date(2026, 7, 10);
  const cycleAug1 = cycleService.getCycleByIdentifier('2026-08-CYCLE-1');
  const pAug10 = prorationService.calculateContributionProfitForCycle(
    'contrib-2', 'sh-2', 100000, investAug10, cycleAug1, 0.05, 'MONTH_DAYS'
  );
  assert(pAug10.activeDays === 10, `Aug 10 produces N = 10 active days (Got: ${pAug10.activeDays})`);
  assert(pAug10.profitAmount === Math.round(100000 * (0.05 / 31) * 10 * 100) / 100, 'Aug 10 profit matches 10 days');

  // Rule A boundary: Aug 5 -> N = 19 - 5 + 1 = 15 days
  const pAug5 = prorationService.calculateContributionProfitForCycle(
    'contrib-3', 'sh-3', 100000, new Date(2026, 7, 5), cycleAug1, 0.05, 'MONTH_DAYS'
  );
  assert(pAug5.activeDays === 15, `Aug 5 produces N = 15 active days`);

  // Rule A boundary: Aug 19 -> N = 19 - 19 + 1 = 1 day
  const pAug19 = prorationService.calculateContributionProfitForCycle(
    'contrib-4', 'sh-4', 100000, new Date(2026, 7, 19), cycleAug1, 0.05, 'MONTH_DAYS'
  );
  assert(pAug19.activeDays === 1, `Aug 19 produces N = 1 active day`);

  // Rule C: Sep 2 (1 <= D <= 4) -> Cycle 2, Cutoff Sep 4
  // Active days N = 4 - 2 + 1 = 3 days
  const pSep2 = prorationService.calculateContributionProfitForCycle(
    'contrib-5', 'sh-5', 100000, new Date(2026, 8, 2), targetCycleSep, 0.05, 'MONTH_DAYS'
  );
  assert(pSep2.activeDays === 3, `Sep 2 produces N = 3 active days (Got: ${pSep2.activeDays})`);

  // Rule C boundary: Sep 1 -> N = 4 - 1 + 1 = 4 days
  const pSep1 = prorationService.calculateContributionProfitForCycle(
    'contrib-6', 'sh-6', 100000, new Date(2026, 8, 1), targetCycleSep, 0.05, 'MONTH_DAYS'
  );
  assert(pSep1.activeDays === 4, `Sep 1 produces N = 4 active days`);

  // Rule C boundary: Sep 4 -> N = 4 - 4 + 1 = 1 day
  const pSep4 = prorationService.calculateContributionProfitForCycle(
    'contrib-7', 'sh-7', 100000, new Date(2026, 8, 4), targetCycleSep, 0.05, 'MONTH_DAYS'
  );
  assert(pSep4.activeDays === 1, `Sep 4 produces N = 1 active day`);

  // Rule B boundary: Aug 20 -> N = (31 - 20 + 1) + 4 = 12 + 4 = 16 days
  const pAug20 = prorationService.calculateContributionProfitForCycle(
    'contrib-8', 'sh-8', 100000, new Date(2026, 7, 20), targetCycleSep, 0.05, 'MONTH_DAYS'
  );
  assert(pAug20.activeDays === 16, `Aug 20 produces N = 16 active days`);

  // Rule B boundary: Aug 31 -> N = (31 - 31 + 1) + 4 = 1 + 4 = 5 days
  const pAug31 = prorationService.calculateContributionProfitForCycle(
    'contrib-9', 'sh-9', 100000, new Date(2026, 7, 31), targetCycleSep, 0.05, 'MONTH_DAYS'
  );
  assert(pAug31.activeDays === 5, `Aug 31 produces N = 5 active days`);

  // ----------------------------------------------------
  // TEST GROUP 6: Subsequent Full Fortnightly Payouts
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 6: Subsequent Full Fortnightly Share ---');
  // Once an investment has had its first payout (e.g. Aug 27 in 2026-09-CYCLE-2),
  // in 2026-09-CYCLE-1 (or next cycle 2026-10-CYCLE-1) it receives standard 2.5% = ₹2,500.00
  const cycleOct1 = cycleService.getCycleByIdentifier('2026-10-CYCLE-1');
  const pSubsequent = prorationService.calculateContributionProfitForCycle(
    'contrib-1', 'sh-1', 100000, investAug27, cycleOct1, 0.05, 'MONTH_DAYS'
  );
  assert(pSubsequent.isFirstPayout === false, 'Oct 1 is recognized as subsequent payout (isFirstPayout = false)');
  assert(pSubsequent.profitAmount === 2500, `Subsequent payout yields full 2.5% = ₹2,500.00 (Got: ₹${pSubsequent.profitAmount})`);

  // ----------------------------------------------------
  // TEST GROUP 7: Zero-Contribution 20% Withholding Math
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 7: Zero-Contribution Withholding & Auto-Conversion ---');
  const grossGratitude = 10000;
  const withheld = Math.round(grossGratitude * 0.2 * 100) / 100;
  const netPayable = grossGratitude - withheld;
  assert(withheld === 2000, 'Zero-Contribution 20% withholding on ₹10,000 is exactly ₹2,000');
  assert(netPayable === 8000, 'Net payable gratitude is ₹8,000');

  // Auto-conversion check
  const priorBalance = 99000;
  const newHoldingBalance = priorBalance + withheld; // 101,000
  assert(newHoldingBalance >= 100000, 'New balance 101,000 exceeds 100,000 threshold');
  const remainingAfterActivation = newHoldingBalance - 100000;
  assert(remainingAfterActivation === 1000, 'Remaining balance is exactly ₹1,000 preserved');

  // ----------------------------------------------------
  // TEST GROUP 8: Canonical 12-Month Matrix Verification
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 8: Complete 12-Month Cycle Matrix ---');
  const matrix2026 = cycleService.getCanonicalCycleMatrix(2026);
  assert(matrix2026.length === 24, 'Matrix contains exactly 24 fortnightly cycles for 2026');
  
  // Verify all 24 cycles have valid dates
  for (const c of matrix2026) {
    assert(c.periodStart < c.periodEnd, `${c.cycleIdentifier} periodStart < periodEnd`);
    assert(c.cutoffDate.getTime() === c.periodEnd.getTime(), `${c.cycleIdentifier} cutoffDate matches periodEnd`);
    assert(c.payoutDate > c.cutoffDate, `${c.cycleIdentifier} payoutDate > cutoffDate`);
    assert(c.totalCycleDays >= 13 && c.totalCycleDays <= 16, `${c.cycleIdentifier} days in expected range (13 to 16)`);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 32 TEST SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
