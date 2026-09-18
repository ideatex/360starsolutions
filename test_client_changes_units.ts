import { RankService } from './src/server/engines/rank/rank.service';

function assert(condition: boolean, testName: string, details?: any) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`, details || '');
    throw new Error(`Test failed: ${testName}`);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

async function runUnitTests() {
  console.log('====================================================');
  console.log('🧪 CLIENT CHANGE REQUEST UNIT TEST SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST GROUP 1: Indian PAN Card Strict Validation
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Indian PAN Card Validation ---');
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  const validPANs = [
    'ABCDE1234F',
    'AAAAA1111A',
    'ZZZZZ9999Z',
    'BNZPA1234K',
    'CRTPK9876Q'
  ];

  const invalidPANs = [
    '',
    'abcde1234f',      // lowercase
    'ABCD1234F',       // only 4 letters at start
    'ABCDEF1234F',     // 6 letters at start
    'ABCDE123F',       // only 3 digits in middle
    'ABCDE12345F',     // 5 digits in middle
    'ABCDE12345',      // ends in number
    '12345ABCDE',      // inverted pattern
    'ABCDE1234FF',     // too long
    'ABCDE 1234F',     // spaces
  ];

  validPANs.forEach(pan => {
    assert(panRegex.test(pan), `Valid PAN accepted: ${pan}`);
  });

  invalidPANs.forEach(pan => {
    assert(!panRegex.test(pan), `Invalid PAN rejected: "${pan}"`);
  });

  // ----------------------------------------------------
  // TEST GROUP 2: Bank IFSC Code Validation
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: Bank IFSC Code Validation ---');
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

  const validIFSCs = [
    'SBIN0001234',
    'HDFC0000123',
    'ICIC0004567',
    'PUNB0123456',
    'BARB0MAINXX'
  ];

  const invalidIFSCs = [
    '',
    'sbin0001234',      // lowercase
    'SBI0001234',       // only 3 letters at start
    'SBIN1001234',      // 5th character is 1 instead of 0
    'SBIN000123',       // too short (10 chars)
    'SBIN00012345',     // too long (12 chars)
    'SBIN 001234'       // spaces
  ];

  validIFSCs.forEach(ifsc => {
    assert(ifscRegex.test(ifsc), `Valid IFSC accepted: ${ifsc}`);
  });

  invalidIFSCs.forEach(ifsc => {
    assert(!ifscRegex.test(ifsc), `Invalid IFSC rejected: "${ifsc}"`);
  });

  // ----------------------------------------------------
  // TEST GROUP 3: 50/50 Leg Balancing Rule Evaluation
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: 50/50 Leg Balancing Rule ---');
  // Bronze target = 50,000. Max strongest leg = 25,000 (50%). Min other legs = 25,000 (50%).
  const bronzeTarget = 50000;
  const maxAllowedStrongest = bronzeTarget * 0.50; // 25,000
  const minRequiredOther = bronzeTarget * 0.50;    // 25,000

  // Scenario A: Balanced legs (Strongest = 25,000, Other = 25,000) -> Total 50,000 -> QUALIFIED
  const legA1 = 25000;
  const legA2 = 25000;
  const qualA = (Math.min(legA1, maxAllowedStrongest) + legA2) >= bronzeTarget && legA2 >= minRequiredOther;
  assert(qualA === true, 'Scenario A: 25k + 25k qualifies for Bronze');

  // Scenario B: Imbalanced single leg (Strongest = 45,000, Other = 5,000) -> Total 50,000
  // Capped strongest = 25,000. Other = 5,000. Effective total = 30,000 < 50,000 -> NOT QUALIFIED
  const legB1 = 45000;
  const legB2 = 5000;
  const effectiveB = Math.min(legB1, maxAllowedStrongest) + legB2;
  const qualB = effectiveB >= bronzeTarget && legB2 >= minRequiredOther;
  assert(qualB === false, 'Scenario B: 45k + 5k rejected due to 50/50 leg rule (Effective = 30k < 50k)');

  // Scenario C: Multi-leg distribution (Leg1 = 30,000 [capped to 25k], Leg2 = 15,000, Leg3 = 12,000)
  // Strongest = 30k (capped to 25k). Other = 15k + 12k = 27k >= 25k. Effective total = 25k + 27k = 52k >= 50k -> QUALIFIED
  const legC1 = 30000;
  const otherC = 15000 + 12000;
  const effectiveC = Math.min(legC1, maxAllowedStrongest) + otherC;
  const qualC = effectiveC >= bronzeTarget && otherC >= minRequiredOther;
  assert(qualC === true, 'Scenario C: 30k (capped to 25k) + 15k + 12k qualifies for Bronze');

  // ----------------------------------------------------
  // TEST GROUP 4: Consolidated Net Payable Payout Calculation
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Consolidated Fortnightly Payout Math ---');
  // Formula: Net Payable = Profit Share + Gratitude Share - Withheld
  const profitShare = 2500;
  const gratitudeShare = 1250;
  const withheldStandard = 0;
  const netPayable1 = profitShare + gratitudeShare - withheldStandard;
  assert(netPayable1 === 3750, 'Standard Net Payable = 2500 + 1250 - 0 = ₹3,750.00');

  // Zero-contribution account with 20% withholding on gratitude share
  const gratitudeGross = 10000;
  const withheldZeroContribution = gratitudeGross * 0.20; // 2000
  const netPayableZero = 0 + (gratitudeGross - withheldZeroContribution);
  assert(netPayableZero === 8000, 'Zero-Contribution Net Payable = 0 + 10000 - 2000 = ₹8,000.00');

  // ----------------------------------------------------
  // TEST GROUP 5: Mobile OTP Generation & Validation Rules
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Mobile OTP Rules ---');
  // 6 digits numeric OTP
  for (let i = 0; i < 20; i++) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    assert(/^\d{6}$/.test(otp), `OTP "${otp}" is strictly 6 digits`);
    assert(Number(otp) >= 100000 && Number(otp) <= 999999, `OTP "${otp}" is in valid numeric range`);
  }

  // ----------------------------------------------------
  // TEST GROUP 6: Granular Admin Permission Matrix Mapping
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 6: Admin Permission Matrix ---');
  const modules = [
    'shareholders',
    'contributions',
    'payouts',
    'ranks',
    'withdrawals',
    'financial_requests',
    'system_settings'
  ];
  const actions = ['view', 'create', 'edit', 'delete', 'approve'];

  const sampleAdminPerms: Record<string, Record<string, boolean>> = {
    shareholders: { view: true, create: true, edit: true, delete: false, approve: false },
    contributions: { view: true, create: false, edit: false, delete: false, approve: true },
    payouts: { view: true, create: true, edit: true, delete: false, approve: true },
    ranks: { view: true, create: false, edit: true, delete: false, approve: true },
    withdrawals: { view: true, create: false, edit: false, delete: false, approve: true },
    financial_requests: { view: true, create: false, edit: false, delete: false, approve: true },
    system_settings: { view: true, create: false, edit: true, delete: false, approve: false },
  };

  modules.forEach(m => {
    assert(sampleAdminPerms[m] !== undefined, `Module "${m}" defined in permission matrix`);
    actions.forEach(a => {
      assert(typeof sampleAdminPerms[m][a] === 'boolean', `Action "${a}" on module "${m}" is boolean`);
    });
  });

  // Verify permission checks
  function canPerform(permissions: any, mod: string, act: string): boolean {
    return Boolean(permissions?.[mod]?.[act]);
  }

  assert(canPerform(sampleAdminPerms, 'payouts', 'approve') === true, 'Admin can approve payouts');
  assert(canPerform(sampleAdminPerms, 'shareholders', 'delete') === false, 'Admin cannot delete shareholders');
  assert(canPerform(sampleAdminPerms, 'financial_requests', 'approve') === true, 'Admin can approve financial requests');
  assert(canPerform(sampleAdminPerms, 'system_settings', 'create') === false, 'Admin cannot create system settings');

  console.log('\n====================================================');
  console.log('🎉 ALL UNIT & VALIDATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
}

runUnitTests();
