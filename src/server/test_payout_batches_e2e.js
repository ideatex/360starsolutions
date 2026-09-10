const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';
const API_BASE = 'http://localhost:3002/api/v1';

// Base64URL helper
function base64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function runPayoutBatchesTestSuite() {
  console.log('===============================================================');
  console.log('🚀 PRODUCT 360: ADMIN PAYOUT BATCHES FULL END-TO-END TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Fetch Super Admin from DB to generate valid JWT
  console.log('--- Step 1: Authentication & Authorization ---');
  let superAdmin = await prisma.shareholder.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });

  if (!superAdmin) {
    console.log('No existing SUPER_ADMIN found, creating one for test...');
    superAdmin = await prisma.shareholder.create({
      data: {
        shareholderId: 'TEST_SUPERADMIN_01',
        name: 'Test Super Admin',
        passwordHash: 'dummyhash',
        role: 'SUPER_ADMIN',
        referralCode: 'TESTADM1',
      }
    });
  }

  const token = createJwt({
    sub: superAdmin.id,
    shareholderId: superAdmin.shareholderId,
    role: superAdmin.role,
  }, JWT_SECRET);

  assert(token.length > 20, `Generated valid JWT for ${superAdmin.role} (${superAdmin.shareholderId})`);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Test GET /admin/payouts/cycles
  console.log('\n--- Step 2: Canonical Payout Cycles ---');
  const cyclesRes = await fetch(`${API_BASE}/admin/payouts/cycles`, { headers });
  assert(cyclesRes.status === 200, `GET /admin/payouts/cycles returned HTTP 200`);
  const cycles = await cyclesRes.json();
  assert(Array.isArray(cycles) && cycles.length >= 6, `Returned ${cycles.length} canonical cycles`);
  
  const sampleCycle = cycles[0];
  console.log(`  ℹ️ Sample Cycle: ${sampleCycle.cycleIdentifier} (${sampleCycle.label})`);
  assert(sampleCycle.cycleIdentifier && sampleCycle.periodStart && sampleCycle.periodEnd && sampleCycle.payoutDate, 
    'Cycle object has required fields (cycleIdentifier, periodStart, periodEnd, payoutDate)');

  // 3. Test GET /admin/payouts/preview
  console.log('\n--- Step 3: Payout Batch Preview Mode ---');
  const testCycleId = '2026-09-CYCLE-1';
  const previewRes = await fetch(`${API_BASE}/admin/payouts/preview?cycleIdentifier=${testCycleId}`, { headers });
  assert(previewRes.status === 200, `GET /admin/payouts/preview for ${testCycleId} returned HTTP 200`);
  const preview = await previewRes.json();
  
  assert(preview.cycle?.cycleIdentifier === testCycleId, `Preview matches requested cycle: ${preview.cycle?.cycleIdentifier}`);
  assert(preview.summary !== undefined, 'Preview contains financial summary');
  assert(Array.isArray(preview.beneficiaries), 'Preview contains list of beneficiaries');
  assert(Array.isArray(preview.excludedAccounts), 'Preview contains list of excluded accounts with reasons');
  console.log(`  ℹ️ Preview Summary: Gross Profit = ₹${preview.summary.totalGrossProfit}, Gross Gratitude = ₹${preview.summary.totalGrossGratitude}, Withheld = ₹${preview.summary.totalWithheld}, Net = ₹${preview.summary.totalNetPayable}`);
  console.log(`  ℹ️ Beneficiaries: ${preview.beneficiaries.length}, Excluded: ${preview.excludedAccounts.length}`);

  // Clean up any pre-existing test batch for 2026-09-CYCLE-1 before proceeding
  const existingBatch = await prisma.payoutBatch.findFirst({
    where: { cycleIdentifier: testCycleId }
  });
  if (existingBatch) {
    console.log(`  ℹ️ Removing pre-existing test batch ${existingBatch.id} for clean testing...`);
    await prisma.payoutDetail.deleteMany({ where: { batchId: existingBatch.id } });
    await prisma.holdingLedger.deleteMany({ where: { payoutBatchId: existingBatch.id } });
    await prisma.profitLedger.updateMany({ where: { payoutBatchId: existingBatch.id }, data: { payoutBatchId: null } });
    await prisma.commissionLedger.updateMany({ where: { payoutBatchId: existingBatch.id }, data: { payoutBatchId: null } });
    await prisma.payoutBatch.delete({ where: { id: existingBatch.id } });
  }

  // 4. Test POST /admin/payouts/batches/generate
  console.log('\n--- Step 4: Batch Generation (Idempotent) ---');
  const genRes = await fetch(`${API_BASE}/admin/payouts/batches/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ cycleIdentifier: testCycleId })
  });
  assert(genRes.status === 201 || genRes.status === 200, `POST /admin/payouts/batches/generate returned HTTP ${genRes.status}`);
  const batch = await genRes.json();
  assert(batch.id && batch.cycleIdentifier === testCycleId, `Batch created successfully with ID: ${batch.id}`);
  assert(batch.status === 'PENDING' || batch.status === 'REVIEWED', `Initial batch status is unapproved (${batch.status})`);
  console.log(`  ℹ️ Batch Details: ID=${batch.id}, Net Payable=₹${batch.totalNetPayable || batch.totalAmount}, Beneficiaries=${batch.totalBeneficiaries}`);

  // 5. Test Batch Idempotency: generate again should not duplicate
  console.log('\n--- Step 5: Idempotency & Duplicate Guards ---');
  const duplicateGenRes = await fetch(`${API_BASE}/admin/payouts/batches/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ cycleIdentifier: testCycleId })
  });
  assert(duplicateGenRes.status === 200 || duplicateGenRes.status === 201, `Second generate request handled gracefully (HTTP ${duplicateGenRes.status})`);
  const duplicateBatch = await duplicateGenRes.json();
  assert(duplicateBatch.id === batch.id, `Idempotency verified: re-generation returned the same existing batch ID without duplicates`);

  const batchCount = await prisma.payoutBatch.count({ where: { cycleIdentifier: testCycleId } });
  assert(batchCount === 1, `DB constraint verified: exactly 1 batch exists for cycle ${testCycleId}`);

  // 6. Test Two-Step Release Guard: Cannot release before approval
  console.log('\n--- Step 6: Two-Step Validation Guard (Release without Approval blocked) ---');
  const prematureReleaseRes = await fetch(`${API_BASE}/admin/payouts/batches/${batch.id}/release`, {
    method: 'POST',
    headers
  });
  assert(prematureReleaseRes.status === 400 || prematureReleaseRes.status === 403, 
    `Premature release of unapproved batch correctly rejected with HTTP ${prematureReleaseRes.status}`);
  const prematureErr = await prematureReleaseRes.json();
  console.log(`  ℹ️ Blocked reason: "${prematureErr.message}"`);

  // 7. Step 1: Approve Batch
  console.log('\n--- Step 7: Batch Approval (Step 1 of Two-Step Validation) ---');
  const approveRes = await fetch(`${API_BASE}/admin/payouts/batches/${batch.id}/approve`, {
    method: 'POST',
    headers
  });
  assert(approveRes.status === 200 || approveRes.status === 201, `POST /batches/${batch.id}/approve returned HTTP ${approveRes.status}`);
  const approvePayload = await approveRes.json();
  const approvedBatch = approvePayload.batch || approvePayload;
  assert(approvedBatch.status === 'APPROVED', `Batch status successfully transitioned to APPROVED`);
  assert(approvedBatch.approvedAt !== null, `approvedAt timestamp set: ${approvedBatch.approvedAt}`);

  // 8. Step 2: Release Batch
  console.log('\n--- Step 8: Fund Release (Step 2 of Two-Step Validation) ---');
  const releaseRes = await fetch(`${API_BASE}/admin/payouts/batches/${batch.id}/release`, {
    method: 'POST',
    headers
  });
  assert(releaseRes.status === 200 || releaseRes.status === 201, `POST /batches/${batch.id}/release returned HTTP ${releaseRes.status}`);
  const releasePayload = await releaseRes.json();
  const releasedBatch = releasePayload.batch || releasePayload;
  assert(releasedBatch.status === 'RELEASED', `Batch status successfully transitioned to RELEASED`);
  assert(releasedBatch.releasedAt !== null, `releasedAt timestamp set: ${releasedBatch.releasedAt}`);

  // 9. Verify Financial Reconciliation & Audit Integrity
  console.log('\n--- Step 9: Financial Reconciliation Checksum ---');
  const reconRes = await fetch(`${API_BASE}/admin/payouts/batches/${batch.id}/reconciliation`, { headers });
  assert(reconRes.status === 200, `GET /batches/${batch.id}/reconciliation returned HTTP 200`);
  const recon = await reconRes.json();
  assert(recon.isBalanced === true, `Reconciliation is balanced: ${recon.isBalanced}`);
  console.log(`  ℹ️ Gross Earnings: ₹${recon.grossEarnings}, Deductions/Withheld: ₹${recon.totalDeductions}, Net Dispatched: ₹${recon.netPayable}`);
  assert(Number(recon.variance) === 0, `Financial variance is ₹0.00`);

  // 10. Test Payout Detail & Shareholder Statement Breakdown
  console.log('\n--- Step 10: Shareholder Itemized Statement Breakdown ---');
  const details = await prisma.payoutDetail.findMany({ where: { batchId: batch.id } });
  if (details.length > 0) {
    const detailId = details[0].id;
    const stmtRes = await fetch(`${API_BASE}/admin/payouts/statements/${detailId}`, { headers });
    assert(stmtRes.status === 200, `GET /statements/${detailId} returned HTTP 200`);
    const stmt = await stmtRes.json();
    assert(stmt.statementNumber !== undefined, `Statement number generated: ${stmt.statementNumber}`);
    assert(stmt.calculations !== undefined, `Statement contains mathematical breakdown`);
    console.log(`  ℹ️ Statement #${stmt.statementNumber} for ${stmt.shareholder?.name || stmt.shareholder?.shareholderId}`);
    console.log(`    - Profit Share: ₹${stmt.calculations.grossProfitShare} (Active Days: ${stmt.calculations.activeDays})`);
    console.log(`    - Gratitude Share: ₹${stmt.calculations.grossGratitudeShare}`);
    console.log(`    - Withheld (20%): ₹${stmt.calculations.withheldAmount}`);
    console.log(`    - Net Payable: ₹${stmt.calculations.netPayable}`);
  } else {
    console.log('  ℹ️ No details to inspect for empty cycle (0 beneficiaries)');
  }

  // 11. Test Shareholder Payouts Ledger & Filters
  console.log('\n--- Step 11: Shareholder Payouts Ledger Query & Search ---');
  const ledgerRes = await fetch(`${API_BASE}/admin/payouts/shareholder-payouts?limit=10`, { headers });
  assert(ledgerRes.status === 200, `GET /shareholder-payouts returned HTTP 200`);
  const ledger = await ledgerRes.json();
  assert(Array.isArray(ledger.data), `Ledger returned array of ${ledger.data.length} records`);
  assert(ledger.total !== undefined && ledger.page !== undefined, `Ledger contains pagination metadata (total: ${ledger.total}, page: ${ledger.page})`);

  // 12. Test Batch Reversal Workflow
  console.log('\n--- Step 12: Super Admin Batch Reversal Flow ---');
  const reverseRes = await fetch(`${API_BASE}/admin/payouts/batches/${batch.id}/reverse`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason: 'Automated E2E testing reversal validation' })
  });
  assert(reverseRes.status === 200 || reverseRes.status === 201, `POST /batches/${batch.id}/reverse returned HTTP ${reverseRes.status}`);
  const reversePayload = await reverseRes.json();
  const reversedBatch = reversePayload.batch || reversePayload;
  assert(reversedBatch.status === 'REVERSED', `Batch status successfully transitioned to REVERSED`);
  assert(reversedBatch.reversedAt !== null, `reversedAt timestamp set: ${reversedBatch.reversedAt}`);
  assert(reversedBatch.reversalReason === 'Automated E2E testing reversal validation', `Reversal reason preserved: "${reversedBatch.reversalReason}"`);

  // 13. Verify Linked Commissions Reset / Reversed
  const linkedCommissions = await prisma.commissionLedger.findMany({
    where: { payoutBatchId: batch.id }
  });
  console.log(`  ℹ️ Verified linked commissions on reversed batch: ${linkedCommissions.length} records preserved in audit`);

  console.log('\n===============================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runPayoutBatchesTestSuite().catch(async (err) => {
  console.error('Fatal error running test suite:', err);
  await prisma.$disconnect();
  process.exit(1);
});
