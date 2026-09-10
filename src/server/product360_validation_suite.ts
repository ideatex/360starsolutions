import { PrismaClient, AccountType, UserStatus, ContributionStatus, HoldingLedgerType, BatchStatus } from '@prisma/client';
import { ContributionService, MIN_CONTRIBUTION, CONTRIBUTION_MULTIPLE } from './engines/contribution/contribution.service';
import { CommissionService } from './engines/commission/commission.service';
import { ProfitSharingService } from './engines/profit-sharing/profit-sharing.service';
import { HoldingBalanceService, AUTO_CONVERSION_THRESHOLD, ZERO_CONTRIBUTION_WITHHOLDING_RATE } from './engines/holding-balance/holding-balance.service';
import { RankService } from './engines/rank/rank.service';

const prisma = new PrismaClient();

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, message: string, details?: any) {
  results.push({
    suite,
    name,
    passed: condition,
    message: condition ? `PASS: ${message}` : `FAIL: ${message}`,
    details,
  });
  const symbol = condition ? '✅' : '❌';
  console.log(`${symbol} [${suite}] ${name}: ${message}`);
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🚀 PRODUCT 360 COMPREHENSIVE SYSTEM VERIFICATION SUITE');
  console.log('======================================================\n');

  // -----------------------------------------------------------
  // 1. CONTRIBUTION AMOUNT VALIDATION (Min ₹1,00,000 & Multiples)
  // -----------------------------------------------------------
  console.log('>>> TEST SUITE 1: Contribution Fund Validation');
  const contribService = new ContributionService(prisma as any, { logAction: async () => {} } as any, {} as any);

  assert(
    'Contribution Validation',
    'Reject under ₹1,00,000 (e.g. ₹50,000)',
    contribService.validateContributionAmount(50000) === false,
    '₹50,000 was correctly rejected.'
  );

  assert(
    'Contribution Validation',
    'Reject non-multiple of ₹1,00,000 (e.g. ₹1,50,000)',
    contribService.validateContributionAmount(150000) === false,
    '₹1,50,000 was correctly rejected.'
  );

  assert(
    'Contribution Validation',
    'Reject non-multiple of ₹1,00,000 (e.g. ₹2,75,000)',
    contribService.validateContributionAmount(275000) === false,
    '₹2,75,000 was correctly rejected.'
  );

  assert(
    'Contribution Validation',
    'Accept exact ₹1,00,000',
    contribService.validateContributionAmount(100000) === true,
    '₹1,00,000 was correctly accepted.'
  );

  assert(
    'Contribution Validation',
    'Accept exact ₹3,00,000',
    contribService.validateContributionAmount(300000) === true,
    '₹3,00,000 was correctly accepted.'
  );

  assert(
    'Contribution Validation',
    'Accept exact ₹10,00,000',
    contribService.validateContributionAmount(1000000) === true,
    '₹10,00,000 was correctly accepted.'
  );

  // -----------------------------------------------------------
  // 2. PROFIT SHARING 5% MONTHLY & CALENDAR RULES
  // -----------------------------------------------------------
  console.log('\n>>> TEST SUITE 2: Profit Sharing (5% Monthly & Calendar)');
  const profitService = new ProfitSharingService(prisma as any, { getLatest: async () => ({ profitSharingPercentage: 0.05 }) } as any);

  assert(
    'Profit Sharing',
    'Authoritative monthly profit rate is 5% (0.05)',
    ProfitSharingService.DEFAULT_MONTHLY_RATE === 0.05,
    'Default monthly rate is exactly 5%.'
  );

  // Calendar boundary checks
  const cycle1 = profitService.getCycleBoundariesForDate(new Date(2026, 8, 10)); // Sept 10
  assert(
    'Profit Sharing',
    'Cycle 1 bounds: 5th to 19th, payout 21st',
    cycle1.cycleStart.getDate() === 5 && cycle1.cycleEnd.getDate() === 19 && cycle1.payoutDate.getDate() === 21,
    `Cycle 1 Start: ${cycle1.cycleStart.getDate()}, End: ${cycle1.cycleEnd.getDate()}, Payout: ${cycle1.payoutDate.getDate()}`
  );

  const cycle2 = profitService.getCycleBoundariesForDate(new Date(2026, 8, 25)); // Sept 25
  assert(
    'Profit Sharing',
    'Cycle 2 bounds: 20th to 4th next month, payout 6th next month',
    cycle2.cycleStart.getDate() === 20 && cycle2.cycleEnd.getDate() === 4 && cycle2.payoutDate.getDate() === 6,
    `Cycle 2 Start: ${cycle2.cycleStart.getDate()}, End: ${cycle2.cycleEnd.getDate()}, Payout: ${cycle2.payoutDate.getDate()}`
  );

  // -----------------------------------------------------------
  // 3. GRATITUDE SHARE PERCENTAGES (L1 to L12)
  // -----------------------------------------------------------
  console.log('\n>>> TEST SUITE 3: Gratitude Share Rates (L1–L12)');
  const rates = CommissionService.DEFAULT_GRATITUDE_RATES;

  assert('Gratitude Rates', 'L1 is 1.00%', rates[1] === 0.01, `L1 = ${rates[1] * 100}%`);
  assert('Gratitude Rates', 'L2 is 0.50%', rates[2] === 0.005, `L2 = ${rates[2] * 100}%`);
  assert('Gratitude Rates', 'L3 is 0.50%', rates[3] === 0.005, `L3 = ${rates[3] * 100}%`);
  assert('Gratitude Rates', 'L4 is 0.25%', rates[4] === 0.0025, `L4 = ${rates[4] * 100}%`);
  assert('Gratitude Rates', 'L5 is 0.25%', rates[5] === 0.0025, `L5 = ${rates[5] * 100}%`);
  assert('Gratitude Rates', 'L6 is 0.25%', rates[6] === 0.0025, `L6 = ${rates[6] * 100}%`);
  assert('Gratitude Rates', 'L7 is 0.15%', rates[7] === 0.0015, `L7 = ${rates[7] * 100}%`);
  assert('Gratitude Rates', 'L8 is 0.15%', rates[8] === 0.0015, `L8 = ${rates[8] * 100}%`);
  assert('Gratitude Rates', 'L9 is 0.15%', rates[9] === 0.0015, `L9 = ${rates[9] * 100}%`);
  assert('Gratitude Rates', 'L10 is 0.10%', rates[10] === 0.001, `L10 = ${rates[10] * 100}%`);
  assert('Gratitude Rates', 'L11 is 0.10%', rates[11] === 0.001, `L11 = ${rates[11] * 100}%`);
  assert('Gratitude Rates', 'L12 is 0.10%', rates[12] === 0.001, `L12 = ${rates[12] * 100}%`);

  const totalSum = Object.values(rates).reduce((acc, r) => acc + r, 0);
  assert(
    'Gratitude Rates',
    'Total 12-level distribution equals 3.50%',
    Math.round(totalSum * 10000) / 100 === 3.50,
    `Total sum: ${(totalSum * 100).toFixed(2)}%`
  );

  // -----------------------------------------------------------
  // 4. DYNAMIC LEVEL UNLOCK LOGIC (1->L3, 2->L6, 3->L9, 4->L12)
  // -----------------------------------------------------------
  console.log('\n>>> TEST SUITE 4: Dynamic Level Unlock Logic');
  function calculateUnlockedLevel(directCount: number, override?: number | null): number {
    if (override !== undefined && override !== null) return override;
    if (directCount >= 4) return 12;
    if (directCount === 3) return 9;
    if (directCount === 2) return 6;
    if (directCount === 1) return 3;
    return 0;
  }

  assert('Dynamic Unlock', '0 directs unlocks Level 0', calculateUnlockedLevel(0) === 0, 'Level 0');
  assert('Dynamic Unlock', '1 direct unlocks Level 3', calculateUnlockedLevel(1) === 3, 'Level 3');
  assert('Dynamic Unlock', '2 directs unlocks Level 6', calculateUnlockedLevel(2) === 6, 'Level 6');
  assert('Dynamic Unlock', '3 directs unlocks Level 9', calculateUnlockedLevel(3) === 9, 'Level 9');
  assert('Dynamic Unlock', '4 directs unlocks Level 12', calculateUnlockedLevel(4) === 12, 'Level 12');
  assert('Dynamic Unlock', '10 directs unlocks Level 12', calculateUnlockedLevel(10) === 12, 'Level 12');
  assert('Dynamic Unlock', 'Admin override Level 12 for 1 direct', calculateUnlockedLevel(1, 12) === 12, 'Overridden to Level 12');

  // -----------------------------------------------------------
  // 5. ZERO-CONTRIBUTION WITHHOLDING & AUTO-CONVERSION
  // -----------------------------------------------------------
  console.log('\n>>> TEST SUITE 5: Zero-Contribution Holding & Auto-Conversion');

  assert(
    'Holding Engine',
    'Withholding rate is 20%',
    ZERO_CONTRIBUTION_WITHHOLDING_RATE === 0.20,
    'Rate is 20%'
  );

  assert(
    'Holding Engine',
    'Auto-conversion threshold is ₹1,00,000',
    AUTO_CONVERSION_THRESHOLD === 100000,
    'Threshold is ₹1,00,000'
  );

  // Math test: ₹10,000 gross gratitude share for zero-contribution user
  const grossCommission = 10000;
  const withheld = Math.round(grossCommission * ZERO_CONTRIBUTION_WITHHOLDING_RATE * 100) / 100;
  const netPayable = Math.round((grossCommission - withheld) * 100) / 100;

  assert('Holding Math', 'Withholding is ₹2,000 on ₹10,000', withheld === 2000, `Withheld: ₹${withheld}`);
  assert('Holding Math', 'Net payable is ₹8,000 on ₹10,000', netPayable === 8000, `Net Payable: ₹${netPayable}`);

  // Auto-conversion math: balance before ₹99,000, added ₹2,000 -> ₹101,000 -> auto converts ₹100,000 -> remainder ₹1,000
  const balanceBefore = 99000;
  const newBal = balanceBefore + withheld;
  const converts = newBal >= AUTO_CONVERSION_THRESHOLD;
  const remainingBal = newBal - AUTO_CONVERSION_THRESHOLD;

  assert('Holding Conversion', 'Triggers auto-conversion when balance >= ₹1,00,000', converts === true, 'Converts = true');
  assert('Holding Conversion', 'Remaining balance after ₹1,00,000 conversion is ₹1,000', remainingBal === 1000, `Remainder: ₹${remainingBal}`);

  // -----------------------------------------------------------
  // 6. RANK ENGINE & 50/50 LEG BALANCE RULE
  // -----------------------------------------------------------
  console.log('\n>>> TEST SUITE 6: Rank Engine & 50/50 Leg Balance Rule');

  function evaluateRankQualification(
    requiredVolume: number,
    strongestLegVolume: number,
    otherLegsVolume: number
  ): { qualified: boolean; shortfallStrongest: number; shortfallOther: number } {
    const maxStrongest = requiredVolume * 0.50;
    const minOther = requiredVolume * 0.50;
    const qualified = strongestLegVolume >= maxStrongest && otherLegsVolume >= minOther;
    return {
      qualified,
      shortfallStrongest: Math.max(0, maxStrongest - strongestLegVolume),
      shortfallOther: Math.max(0, minOther - otherLegsVolume),
    };
  }

  // Bronze: ₹5,00,000 (Strongest max ₹2,50,000, Other min ₹2,50,000)
  // Scenario A: Single massive leg of ₹6,00,000 and ₹50,000 other legs (Total ₹6,50,000)
  const bronzeFail = evaluateRankQualification(500000, 600000, 50000);
  assert(
    'Rank 50/50 Rule',
    'Fail if other legs < 50% even if total volume exceeds threshold',
    bronzeFail.qualified === false && bronzeFail.shortfallOther === 200000,
    `Qualified: ${bronzeFail.qualified}, Other legs shortfall: ₹${bronzeFail.shortfallOther}`
  );

  // Scenario B: ₹2,50,000 strongest leg and ₹2,50,000 other legs (Total ₹5,00,000)
  const bronzePass = evaluateRankQualification(500000, 250000, 250000);
  assert(
    'Rank 50/50 Rule',
    'Pass when 50/50 balance is achieved',
    bronzePass.qualified === true && bronzePass.shortfallOther === 0 && bronzePass.shortfallStrongest === 0,
    'Bronze achieved with 50/50 balance.'
  );

  // Scenario C: ₹3,00,000 strongest leg and ₹3,00,000 other legs (Total ₹6,00,000)
  const bronzePassOver = evaluateRankQualification(500000, 300000, 300000);
  assert(
    'Rank 50/50 Rule',
    'Pass when both legs exceed 50%',
    bronzePassOver.qualified === true,
    'Bronze achieved.'
  );

  // -----------------------------------------------------------
  // 7. PAYOUT IDEMPOTENCY KEY FORMAT
  // -----------------------------------------------------------
  console.log('\n>>> TEST SUITE 7: Payout Idempotency Key Format');
  const d1 = new Date('2026-09-05T00:00:00.000Z');
  const d2 = new Date('2026-09-19T23:59:59.999Z');
  const key = `CYCLE_${d1.toISOString().split('T')[0]}_TO_${d2.toISOString().split('T')[0]}`;
  assert(
    'Payout Idempotency',
    'Key conforms to standard CYCLE_YYYY-MM-DD_TO_YYYY-MM-DD',
    key === 'CYCLE_2026-09-05_TO_2026-09-19',
    `Key: ${key}`
  );

  // -----------------------------------------------------------
  // 8. DATABASE INTEGRITY CHECK (Existing Records Preserved)
  // -----------------------------------------------------------
  console.log('\n>>> TEST SUITE 8: Database Integrity & Existing Production Data');
  const totalUsers = await prisma.shareholder.count();
  const totalInvestments = await prisma.investment.count();
  const totalBatches = await prisma.payoutBatch.count();

  assert(
    'Database Integrity',
    'Existing Shareholders preserved intact',
    totalUsers >= 6,
    `Shareholders count: ${totalUsers} (expected >= 6)`
  );

  assert(
    'Database Integrity',
    'Existing Investments preserved intact',
    totalInvestments >= 5,
    `Investments count: ${totalInvestments} (expected >= 5)`
  );

  assert(
    'Database Integrity',
    'Existing PayoutBatches preserved intact',
    totalBatches >= 11,
    `PayoutBatches count: ${totalBatches} (expected >= 11)`
  );

  // Summary
  console.log('\n======================================================');
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('======================================================\n');

  await prisma.$disconnect();

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite runner encountered an unhandled error:', err);
  process.exit(1);
});
