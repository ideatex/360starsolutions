import { PrismaClient, RegistrationStatus, AccountType, UserStatus, ContributionStatus, SmsStatus } from '@prisma/client';
import { RegistrationService } from './registration.service';
import { SmsService } from '../sms/sms.service';
import { AuditService } from '../engines/audit/audit.service';
import { CommissionService } from '../engines/commission/commission.service';
import { BusinessConfigService } from '../business-config/business-config.service';
import { ReferralTreeService } from '../engines/referral-tree/referral-tree.service';
import { InvestorsService } from '../engines/investors/investors.service';

const prisma = new PrismaClient();

interface AuditTestResult {
  category: string;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const auditResults: AuditTestResult[] = [];

function assert(category: string, name: string, condition: boolean, message: string, details?: any) {
  auditResults.push({
    category,
    name,
    passed: condition,
    message: condition ? `PASS: ${message}` : `FAIL: ${message}`,
    details,
  });
  const symbol = condition ? '✅' : '❌';
  console.log(`${symbol} [${category}] ${name}: ${message}`);
  if (!condition && details) {
    console.error('   Details:', details);
  }
}

async function runAuditSuite() {
  console.log('\n================================================================');
  console.log('🚀 PRODUCT 360: SIGNUP & ACCOUNT ACTIVATION AUDIT TEST SUITE');
  console.log('================================================================\n');

  // Initialize service dependencies
  const auditService = new AuditService(prisma as any);
  const smsService = new SmsService(prisma as any);
  const businessConfigService = new BusinessConfigService(prisma as any, auditService);
  const referralTreeService = new ReferralTreeService(prisma as any, auditService, businessConfigService);
  const commissionService = new CommissionService(prisma as any, businessConfigService, referralTreeService);
  const investorsService = new InvestorsService(prisma as any, {} as any);

  const registrationService = new RegistrationService(
    prisma as any,
    auditService,
    smsService,
    commissionService,
    businessConfigService,
    referralTreeService,
    investorsService
  );

  // Ensure BusinessConfiguration is initialized
  let config = await prisma.businessConfiguration.findFirst({ orderBy: { version: 'desc' } });
  if (!config) {
    config = await prisma.businessConfiguration.create({
      data: {
        userIdPrefix: 'USR',
        userIdStartingNumber: 100001,
        userIdNextNumber: 100001,
        userIdLength: 6,
        createdById: 'SYSTEM_INIT',
      },
    });
  }

  // Setup Admin user for testing
  let testAdmin = await prisma.shareholder.findFirst({ where: { role: 'ADMIN' } });
  if (!testAdmin) {
    testAdmin = await prisma.shareholder.create({
      data: {
        shareholderId: 'ADM999999',
        name: 'System Test Admin',
        phone: '9999999999',
        passwordHash: 'dummy_hash',
        role: 'ADMIN',
        status: UserStatus.ACTIVE,
        referralCode: 'ADM999999',
      },
    });
  }

  // Setup Sponsor user for testing
  const sponsorPhone = '9888888881';
  let testSponsor = await prisma.shareholder.findFirst({ where: { phone: sponsorPhone } });
  if (!testSponsor) {
    testSponsor = await prisma.shareholder.create({
      data: {
        shareholderId: 'SPON001',
        name: 'Master Sponsor',
        phone: sponsorPhone,
        passwordHash: 'dummy_hash',
        status: UserStatus.ACTIVE,
        referralCode: 'SPON001',
      },
    });
  }

  // Setup Suspended user for negative testing
  const suspendedPhone = '9888888882';
  let testSuspended = await prisma.shareholder.findFirst({ where: { phone: suspendedPhone } });
  if (!testSuspended) {
    testSuspended = await prisma.shareholder.create({
      data: {
        shareholderId: 'SUSP001',
        name: 'Suspended Sponsor',
        phone: suspendedPhone,
        passwordHash: 'dummy_hash',
        status: UserStatus.SUSPENDED,
        referralCode: 'SUSP001',
      },
    });
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: SERVER-SIDE CONTRIBUTION VALIDATION
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 1: Server-Side Contribution Amount Validation');

  // 1.1 Sub-minimum rejection (< 1,00,000)
  try {
    await registrationService.submitRegistration({
      name: 'Sub Min Test',
      phone: '9811111101',
      accountType: AccountType.CONTRIBUTION,
      contributionAmount: 50000,
    });
    assert('Validation', 'Reject Sub-Minimum', false, 'Sub-minimum amount was not rejected!');
  } catch (err: any) {
    assert('Validation', 'Reject Sub-Minimum (₹50,000)', err.status === 400, 'Correctly threw BadRequestException: ' + err.message);
  }

  // 1.2 Non-multiple rejection (e.g. ₹1,50,000)
  try {
    await registrationService.submitRegistration({
      name: 'Non Multiple Test',
      phone: '9811111102',
      accountType: AccountType.CONTRIBUTION,
      contributionAmount: 150000,
    });
    assert('Validation', 'Reject Non-Multiple', false, 'Non-multiple amount was not rejected!');
  } catch (err: any) {
    assert('Validation', 'Reject Non-Multiple (₹1,50,000)', err.status === 400, 'Correctly threw BadRequestException: ' + err.message);
  }

  // 1.3 Negative amount rejection
  try {
    await registrationService.submitRegistration({
      name: 'Negative Amount Test',
      phone: '9811111103',
      accountType: AccountType.CONTRIBUTION,
      contributionAmount: -100000,
    });
    assert('Validation', 'Reject Negative Amount', false, 'Negative amount was not rejected!');
  } catch (err: any) {
    assert('Validation', 'Reject Negative Amount (-₹1,00,000)', err.status === 400, 'Correctly threw BadRequestException: ' + err.message);
  }

  // 1.4 Decimal / float amount rejection
  try {
    await registrationService.submitRegistration({
      name: 'Decimal Amount Test',
      phone: '9811111104',
      accountType: AccountType.CONTRIBUTION,
      contributionAmount: 100000.5,
    });
    assert('Validation', 'Reject Decimal Float', false, 'Decimal amount was not rejected!');
  } catch (err: any) {
    assert('Validation', 'Reject Decimal Amount (₹100,000.50)', err.status === 400, 'Correctly rejected float decimal: ' + err.message);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: REFERRER VALIDATION & INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 2: Sponsor / Referrer Validation');

  // 2.1 Non-existent referrer rejection
  try {
    await registrationService.submitRegistration({
      name: 'Invalid Referrer Test',
      phone: '9811111105',
      accountType: AccountType.ZERO_CONTRIBUTION,
      referrerId: 'NON_EXISTENT_REFERRER_XYZ',
    });
    assert('Referrer Validation', 'Reject Non-Existent Referrer', false, 'Non-existent referrer was silently accepted!');
  } catch (err: any) {
    assert('Referrer Validation', 'Reject Non-Existent Referrer', err.status === 400, 'Correctly threw BadRequestException: ' + err.message);
  }

  // 2.2 Suspended referrer rejection
  try {
    await registrationService.submitRegistration({
      name: 'Suspended Referrer Test',
      phone: '9811111106',
      accountType: AccountType.ZERO_CONTRIBUTION,
      referrerId: testSuspended.shareholderId,
    });
    assert('Referrer Validation', 'Reject Suspended Referrer', false, 'Suspended referrer was accepted!');
  } catch (err: any) {
    assert('Referrer Validation', 'Reject Suspended Referrer', err.status === 400, 'Correctly rejected inactive sponsor: ' + err.message);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 3: ZERO CONTRIBUTION ACCOUNT WORKFLOW
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 3: Zero Contribution Account End-to-End');

  // Safe cleanup helper to delete test users without foreign key constraint violations
  async function cleanupTestUser(phone: string) {
    const users = await prisma.shareholder.findMany({ where: { phone } });
    for (const u of users) {
      await prisma.smsLog.deleteMany({ where: { shareholderId: u.id } });
      await prisma.contributionSummary.deleteMany({ where: { shareholderId: u.id } });
      await prisma.investorProfile.deleteMany({ where: { shareholderId: u.id } });
      await prisma.referralRelationship.deleteMany({ where: { OR: [{ childId: u.id }, { parentId: u.id }] } });
      await prisma.contribution.deleteMany({ where: { shareholderId: u.id } });
      await prisma.investment.deleteMany({ where: { shareholderId: u.id } });
      await prisma.commissionLedger.deleteMany({ where: { OR: [{ shareholderId: u.id }, { sourceShareholderId: u.id }] } });
      await prisma.auditLog.deleteMany({ where: { shareholderId: u.id } });
      await prisma.registrationRequest.deleteMany({ where: { createdShareholderId: u.id } });
      await prisma.shareholder.delete({ where: { id: u.id } });
    }
    await prisma.registrationRequest.deleteMany({ where: { phone } });
  }

  const zeroPhone = '9822222201';
  await cleanupTestUser(zeroPhone);

  // 3.1 Submit Zero Contribution Registration
  const zeroReg = await registrationService.submitRegistration({
    name: 'Anand Sharma (Zero Contrib)',
    phone: zeroPhone,
    accountType: AccountType.ZERO_CONTRIBUTION,
    referrerId: testSponsor.shareholderId,
  });

  assert('Zero Contribution', 'Registration Created', !!zeroReg.id, 'Registration request created successfully');
  assert('Zero Contribution', 'Status is PENDING_ADMIN_REVIEW', zeroReg.status === RegistrationStatus.PENDING_ADMIN_REVIEW, 'Status matches PENDING_ADMIN_REVIEW');
  assert('Zero Contribution', 'Contribution Amount is Null', zeroReg.contributionAmount === null, 'No initial contribution stored');

  // 3.2 Verify NO Premature Account Creation
  const prematureUser = await prisma.shareholder.findFirst({ where: { phone: zeroPhone } });
  assert('Premature Account Test', 'No Shareholder before approval', prematureUser === null, 'Shareholder table has no premature active record');

  // 3.3 Duplicate Submission Blocked
  try {
    await registrationService.submitRegistration({
      name: 'Anand Sharma Duplicate',
      phone: zeroPhone,
      accountType: AccountType.ZERO_CONTRIBUTION,
    });
    assert('Duplicate Prevention', 'Block duplicate pending phone', false, 'Duplicate pending submission was allowed!');
  } catch (dupErr: any) {
    assert('Duplicate Prevention', 'Block duplicate pending phone', dupErr.status === 409, 'Duplicate rejected with 409 Conflict: ' + dupErr.message);
  }

  // 3.4 Admin Approval of Zero Contribution Account
  const zeroApproval = await registrationService.approveRegistration(zeroReg.id, testAdmin.id);

  assert('Zero Contribution', 'Approval Succeeded', zeroApproval.success === true, 'Approval succeeded');
  assert('Zero Contribution', 'Assigned Shareholder ID', !!zeroApproval.shareholderId, `User ID: ${zeroApproval.shareholderId}`);
  assert('Zero Contribution', 'Status is ZERO_ACTIVE', zeroApproval.createdShareholder.status === UserStatus.ZERO_ACTIVE, 'Status is ZERO_ACTIVE');
  assert('Zero Contribution', 'AccountType is ZERO_CONTRIBUTION', zeroApproval.createdShareholder.accountType === AccountType.ZERO_CONTRIBUTION, 'AccountType is ZERO_CONTRIBUTION');

  // 3.5 Verify Database State for Zero Contribution Account
  const dbZeroUser = await prisma.shareholder.findUnique({
    where: { id: zeroApproval.createdShareholder.id },
    include: { contributions: true, referredRelation: true },
  });

  assert('Zero Contribution', 'No Contribution records created', dbZeroUser?.contributions.length === 0, 'Zero contribution records in database');
  assert('Zero Contribution', 'ReferralRelationship edge created', dbZeroUser?.referredRelation?.parentId === testSponsor.id, 'ReferralRelationship points to sponsor');

  // 3.6 Credential Security Check: tempPassword must NOT be returned in API
  assert('Security', 'No plaintext password in API response', !(zeroApproval as any).tempPassword, 'tempPassword is not leaked in API response');
  assert('Security', 'No passwordHash in createdShareholder', !(zeroApproval.createdShareholder as any).passwordHash, 'passwordHash is stripped from response');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: STANDARD CONTRIBUTION ACCOUNT WORKFLOW
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 4: Standard Contribution Account End-to-End');

  const contribPhone = '9833333301';
  await cleanupTestUser(contribPhone);

  // 4.1 Submit Contribution Registration
  const contribReg = await registrationService.submitRegistration({
    name: 'Vikram Mehta (Contributor)',
    phone: contribPhone,
    accountType: AccountType.CONTRIBUTION,
    contributionAmount: 200000,
    paymentProofUrl: '/api/v1/registrations/proof/mock-receipt.pdf',
    paymentProofFileName: 'bank_transfer_receipt.pdf',
    referrerId: testSponsor.shareholderId,
  });

  assert('Contribution Flow', 'Registration Request created', !!contribReg.id, 'Request ID: ' + contribReg.id);
  assert('Contribution Flow', 'Contribution Amount preserved', Number(contribReg.contributionAmount) === 200000, 'Contribution amount is ₹2,00,000');
  assert('Contribution Flow', 'Payment proof linked', contribReg.paymentProofUrl === '/api/v1/registrations/proof/mock-receipt.pdf', 'Proof URL is stored');

  // 4.2 Admin Approval of Contribution Account
  const contribApproval = await registrationService.approveRegistration(contribReg.id, testAdmin.id);

  assert('Contribution Flow', 'Approval Succeeded', contribApproval.success === true, 'Approval succeeded');
  assert('Contribution Flow', 'Status is CONTRIBUTION_ACTIVE', contribApproval.createdShareholder.status === UserStatus.CONTRIBUTION_ACTIVE, 'Status is CONTRIBUTION_ACTIVE');

  // 4.3 Verify DB Integrity: Contribution, Summary & InvestorProfile
  const dbContribUser = await prisma.shareholder.findUnique({
    where: { id: contribApproval.createdShareholder.id },
    include: {
      contributions: true,
      contributionSummary: true,
      investorProfile: true,
      referredRelation: true,
    },
  });

  assert('DB Integrity', 'Contribution record created', dbContribUser?.contributions.length === 1, 'Contribution record exists');
  assert('DB Integrity', 'Contribution status is APPROVED', dbContribUser?.contributions[0]?.status === ContributionStatus.APPROVED, 'Contribution is APPROVED');
  assert('DB Integrity', 'Contribution amount matches ₹2,00,000', Number(dbContribUser?.contributions[0]?.amount) === 200000, 'Amount is ₹2,00,000');
  assert('DB Integrity', 'ContributionSummary totalApproved matches ₹2,00,000', Number(dbContribUser?.contributionSummary?.totalApproved) === 200000, 'Summary is synced with ₹2,00,000');
  assert('DB Integrity', 'InvestorProfile created and ACTIVE', dbContribUser?.investorProfile?.status === 'ACTIVE', 'InvestorProfile status is ACTIVE');
  assert('DB Integrity', 'ReferralRelationship edge exists', dbContribUser?.referredRelation?.parentId === testSponsor.id, 'Referral edge linked to sponsor');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: DOUBLE APPROVAL & IDEMPOTENCY RESILIENCE
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 5: Double Approval & Concurrency Idempotency');

  // Call approveRegistration again on the already approved registration
  const duplicateApproval = await registrationService.approveRegistration(contribReg.id, testAdmin.id);

  assert('Idempotency', 'Double approval does not fail', duplicateApproval.success === true, 'Returned success response');
  assert('Idempotency', 'Flagged as already approved', duplicateApproval.alreadyApproved === true, 'Flagged as alreadyApproved');
  assert('Idempotency', 'Preserves original Shareholder ID', duplicateApproval.shareholderId === contribApproval.shareholderId, 'Same Shareholder ID: ' + duplicateApproval.shareholderId);

  // Verify no duplicate users or contributions created in database
  const countUsers = await prisma.shareholder.count({ where: { phone: contribPhone } });
  assert('Idempotency', 'Exactly 1 Shareholder in DB', countUsers === 1, 'No duplicate Shareholder created');

  const countContribs = await prisma.contribution.count({ where: { shareholderId: contribApproval.createdShareholder.id } });
  assert('Idempotency', 'Exactly 1 Contribution in DB', countContribs === 1, 'No duplicate Contribution created');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: REJECTION WORKFLOW & DOUBLE REJECTION
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 6: Rejection Workflow & Idempotency');

  const rejectPhone = '9844444401';
  await cleanupTestUser(rejectPhone);

  const rejectReg = await registrationService.submitRegistration({
    name: 'Rejected Applicant',
    phone: rejectPhone,
    accountType: AccountType.ZERO_CONTRIBUTION,
  });

  const rejectionRes = await registrationService.rejectRegistration(rejectReg.id, testAdmin.id, 'Illegible documents submitted');
  assert('Rejection', 'Rejection succeeded', rejectionRes.success === true, 'Status set to REJECTED');

  const dbRejected = await prisma.registrationRequest.findUnique({ where: { id: rejectReg.id } });
  assert('Rejection', 'DB Status is REJECTED', dbRejected?.status === RegistrationStatus.REJECTED, 'Status is REJECTED');
  assert('Rejection', 'Rejection reason preserved', dbRejected?.rejectionReason === 'Illegible documents submitted', 'Reason stored in DB');
  assert('Rejection', 'Reviewer ID stored', dbRejected?.reviewedById === testAdmin.id, 'Reviewed by Admin ID');

  // Double rejection idempotency
  const dupRejection = await registrationService.rejectRegistration(rejectReg.id, testAdmin.id, 'Second rejection attempt');
  assert('Rejection', 'Double rejection handled gracefully', dupRejection.alreadyRejected === true, 'Gracefully returned alreadyRejected');

  // Attempt to approve a rejected request must fail
  try {
    await registrationService.approveRegistration(rejectReg.id, testAdmin.id);
    assert('State Machine', 'Block approve on rejected', false, 'Approved a rejected request!');
  } catch (err: any) {
    assert('State Machine', 'Block approve on rejected', err.status === 400, 'Correctly blocked: ' + err.message);
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 7: SMS FAILURE ISOLATION & RETRY CAPABILITY
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 7: SMS Isolation & Retry Engine');

  // Create a simulated FAILED SMS log
  const failedLog = await prisma.smsLog.create({
    data: {
      recipient: '9855555501',
      message: 'Welcome to 360 Star Solutions! Your User ID is USR999 and password is ********.',
      provider: 'MOCK_FAIL_PROVIDER',
      status: SmsStatus.FAILED,
      providerResponse: JSON.stringify({ error: 'Gateway timeout 504' }),
    },
  });

  assert('SMS Isolation', 'Failed SMS Log Created', failedLog.status === SmsStatus.FAILED, 'Failed SMS status recorded');

  // Test Retry SMS
  const retryResult = await smsService.retrySms(failedLog.id);
  assert('SMS Retry', 'Retry method succeeded', retryResult.success === true, 'Retry dispatched successfully');
  assert('SMS Retry', 'Status updated to SENT', retryResult.log.status === SmsStatus.SENT, 'Status updated to SENT');
  assert('SMS Retry', 'Retry count incremented to 1', retryResult.log.retryCount === 1, 'Retry count is 1');

  // --------------------------------------------------------------------------
  // TEST GROUP 8: SENSITIVE CREDENTIAL MASKING IN SMS LOGS
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 8: Credential Masking in SMS Logs');

  await smsService.sendCredentialsSms('9866666601', 'USR100099', 'Star@9X2K');
  const latestCredSms = await prisma.smsLog.findFirst({
    where: { recipient: '9866666601' },
    orderBy: { createdAt: 'desc' },
  });

  assert('Security', 'SMS message does not contain plaintext password', !latestCredSms?.message.includes('Star@9X2K'), 'Plaintext password not in message column');
  assert('Security', 'SMS message has masked password', latestCredSms?.message.includes('********'), 'Message has ******** mask: ' + latestCredSms?.message);

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  const total = auditResults.length;
  const passed = auditResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`AUDIT TEST SUMMARY: Total: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed === 0) {
    console.log('🎉 ALL AUDIT & GAP-FIX VERIFICATION SCENARIOS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${failed} TEST SCENARIOS FAILED! Check detailed logs above.`);
  }
  console.log('================================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runAuditSuite().catch(async (e) => {
  console.error('Fatal Error during Audit Suite:', e);
  await prisma.$disconnect();
  process.exit(1);
});
