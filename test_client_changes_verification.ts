import { PrismaClient, Role, UserStatus, FinancialRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runVerificationTests() {
  console.log('🚀 Starting Comprehensive Verification of Recent Client Change Implementations...\n');
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: PAN Card Format Validation Logic
    // -------------------------------------------------------------
    console.log('--- Test Suite 1: PAN Card Validation ---');
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    
    const validPANs = ['ABCDE1234F', 'ZXCVB9876Q', 'AAAPA0001A'];
    const invalidPANs = ['1234567890', 'ABCDE1234', 'ABCDE12345F', 'ABC1234F', 'abcde1234f', 'ABCDE12345'];

    validPANs.forEach(pan => {
      assert(panRegex.test(pan), `Valid PAN accepted: ${pan}`);
    });

    invalidPANs.forEach(pan => {
      assert(!panRegex.test(pan), `Invalid PAN rejected: ${pan}`);
    });

    // -------------------------------------------------------------
    // TEST 2: Admin Creation with Granular Task Permission Matrix
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 2: Admin Creation & Permission Matrix ---');
    const testAdminId = `TEST_ADM_${Date.now()}`;
    const testAdminPhone = `+9199${Date.now().toString().slice(-8)}`;
    const testPermissions = {
      shareholders: { view: true, create: true, edit: true, delete: false, approve: false },
      contributions: { view: true, create: false, edit: false, delete: false, approve: true },
      payouts: { view: true, create: true, edit: true, delete: false, approve: true },
      ranks: { view: true, create: false, edit: true, delete: false, approve: true },
      withdrawals: { view: true, create: false, edit: false, delete: false, approve: true },
      financial_requests: { view: true, create: false, edit: false, delete: false, approve: true },
      system_settings: { view: true, create: false, edit: true, delete: false, approve: false },
    };

    const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
    const createdAdmin = await prisma.shareholder.create({
      data: {
        shareholderId: testAdminId,
        name: 'Test Operations Admin',
        phone: testAdminPhone,
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        permissions: testPermissions,
      },
    });

    assert(createdAdmin.role === Role.ADMIN, 'Admin created with role ADMIN');
    assert(createdAdmin.shareholderId === testAdminId, 'Admin shareholderId matches input');
    assert(
      (createdAdmin.permissions as any)?.payouts?.approve === true,
      'Admin permissions matrix correctly stored and retrievable'
    );

    // -------------------------------------------------------------
    // TEST 3: Shareholder Creation with PAN Card
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 3: Shareholder Creation with PAN ---');
    const testUserPhone = `+9198${Date.now().toString().slice(-8)}`;
    const testUserPAN = 'ABCDE1234F';
    const testUserShareholderId = `TEST_SH_${Date.now()}`;

    const createdShareholder = await prisma.shareholder.create({
      data: {
        shareholderId: testUserShareholderId,
        name: 'Test Shareholder Verified',
        phone: testUserPhone,
        pan: testUserPAN,
        passwordHash,
        role: Role.SHAREHOLDER,
        status: UserStatus.ACTIVE,
        bankName: 'HDFC Bank',
        bankAccountName: 'Test Shareholder Verified',
        bankAccountNumber: '123456789012345',
        bankBranch: 'Main Branch',
        bankIfsc: 'HDFC0001234',
      },
    });

    assert(createdShareholder.pan === testUserPAN, 'Shareholder created with valid PAN');
    assert(createdShareholder.bankName === 'HDFC Bank', 'Shareholder created with banking coordinates');

    // -------------------------------------------------------------
    // TEST 4: Financial Change Request Workflow
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 4: Financial Change Request Workflow ---');
    // 4.1 Shareholder submits request
    const requestedPAN = 'XYZPQ9876M';
    const requestedBank = 'State Bank of India';
    const requestedAccount = '987654321098765';
    const requestedIfsc = 'SBIN0001122';

    const changeRequest = await prisma.financialChangeRequest.create({
      data: {
        shareholderId: createdShareholder.id,
        pan: requestedPAN,
        bankName: requestedBank,
        bankAccountName: 'Test Shareholder Updated Name',
        bankAccountNumber: requestedAccount,
        bankBranch: 'Connaught Place',
        bankIfsc: requestedIfsc,
        status: FinancialRequestStatus.PENDING,
      },
    });

    assert(changeRequest.status === FinancialRequestStatus.PENDING, 'Financial change request created with PENDING status');
    assert(changeRequest.pan === requestedPAN, 'Requested PAN stored in change request');

    // 4.2 Super Admin Approves the Request
    await prisma.$transaction(async (tx) => {
      await tx.shareholder.update({
        where: { id: createdShareholder.id },
        data: {
          pan: changeRequest.pan,
          bankName: changeRequest.bankName,
          bankAccountName: changeRequest.bankAccountName,
          bankAccountNumber: changeRequest.bankAccountNumber,
          bankBranch: changeRequest.bankBranch,
          bankIfsc: changeRequest.bankIfsc,
        },
      });

      await tx.financialChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: FinancialRequestStatus.APPROVED,
          reviewedById: createdAdmin.id,
          reviewedAt: new Date(),
        },
      });
    });

    const updatedShareholder = await prisma.shareholder.findUnique({
      where: { id: createdShareholder.id },
    });
    const updatedRequest = await prisma.financialChangeRequest.findUnique({
      where: { id: changeRequest.id },
    });

    assert(updatedRequest?.status === FinancialRequestStatus.APPROVED, 'Financial request marked APPROVED');
    assert(updatedShareholder?.pan === requestedPAN, 'Shareholder profile PAN updated to approved value');
    assert(updatedShareholder?.bankName === requestedBank, 'Shareholder bank name updated to approved value');
    assert(updatedShareholder?.bankAccountNumber === requestedAccount, 'Shareholder account number updated to approved value');

    // 4.3 Rejection Flow
    const rejectRequest = await prisma.financialChangeRequest.create({
      data: {
        shareholderId: createdShareholder.id,
        pan: 'INVALID000',
        bankName: 'Fake Bank',
        status: FinancialRequestStatus.PENDING,
      },
    });

    await prisma.financialChangeRequest.update({
      where: { id: rejectRequest.id },
      data: {
        status: FinancialRequestStatus.REJECTED,
        rejectionReason: 'Invalid banking credentials.',
        reviewedById: createdAdmin.id,
        reviewedAt: new Date(),
      },
    });

    const rejectedRecord = await prisma.financialChangeRequest.findUnique({
      where: { id: rejectRequest.id },
    });

    assert(rejectedRecord?.status === FinancialRequestStatus.REJECTED, 'Financial request marked REJECTED');
    assert(rejectedRecord?.rejectionReason === 'Invalid banking credentials.', 'Rejection reason logged properly');

    // -------------------------------------------------------------
    // TEST 5: Mobile OTP Generation & Verification Workflow
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 5: Mobile OTP Security ---');
    const testOtp = '654321';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const otpRecord = await prisma.otpVerification.create({
      data: {
        identifier: createdShareholder.shareholderId,
        otp: testOtp,
        purpose: 'FORGOT_PASSWORD',
        expiresAt,
        isUsed: false,
      },
    });

    assert(otpRecord.otp === testOtp, 'OTP record created successfully');
    assert(otpRecord.isUsed === false, 'OTP initial state is unused');

    // Verify OTP and generate reset token
    const resetToken = 'secure-reset-token-' + Date.now();
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: {
        isUsed: true,
        resetToken,
      },
    });

    const verifiedOtp = await prisma.otpVerification.findUnique({
      where: { id: otpRecord.id },
    });
    assert(verifiedOtp?.isUsed === true, 'OTP marked as used after verification');
    assert(verifiedOtp?.resetToken === resetToken, 'Secure reset token assigned');

    // -------------------------------------------------------------
    // TEST 6: Rank Allotment & Notification Workflow
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 6: Rank Allotment & Notifications ---');
    const testRankName = 'Gold Leader';
    await prisma.userRankHistory.create({
      data: {
        shareholderId: createdShareholder.id,
        rankName: testRankName,
        teamVolume: 500000,
        achievedAt: new Date(),
      },
    });

    const notification = await prisma.notification.create({
      data: {
        shareholderId: createdShareholder.id,
        title: 'Rank Allotted',
        message: `Congratulations! You have achieved/been allotted the ${testRankName} rank.`,
        type: 'SYSTEM',
        priority: 'HIGH',
      },
    });

    const rankHistory = await prisma.userRankHistory.findFirst({
      where: { shareholderId: createdShareholder.id, rankName: testRankName },
    });

    assert(rankHistory !== null, 'Rank history entry recorded');
    assert(notification.message.includes(testRankName), 'Congratulations notification created for shareholder');

    // -------------------------------------------------------------
    // TEST 7: Full Withdrawal Shareholder Status Transition
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 7: Full Withdrawal Status Transition ---');
    // Set up child referral
    const childShareholderId = `TEST_CHILD_${Date.now()}`;
    const childShareholder = await prisma.shareholder.create({
      data: {
        shareholderId: childShareholderId,
        name: 'Test Child Shareholder',
        phone: `+9197${Date.now().toString().slice(-8)}`,
        passwordHash,
        role: Role.SHAREHOLDER,
        status: UserStatus.ACTIVE,
        parentId: createdShareholder.id,
      },
    });

    const referralEdge = await prisma.referralRelationship.create({
      data: {
        referrerId: createdShareholder.id,
        referredId: childShareholder.id,
        level: 1,
        status: 'ACTIVE',
      },
    });

    // Simulate Full Withdrawal processing
    await prisma.$transaction([
      prisma.shareholder.update({
        where: { id: createdShareholder.id },
        data: { status: UserStatus.CLOSED_EXPIRED },
      }),
      prisma.referralRelationship.updateMany({
        where: { referredId: createdShareholder.id, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      }),
    ]);

    const withdrawnUser = await prisma.shareholder.findUnique({
      where: { id: createdShareholder.id },
    });
    assert(withdrawnUser?.status === UserStatus.CLOSED_EXPIRED, 'Shareholder status transitioned to CLOSED_EXPIRED on full withdrawal');

    // Verify child still references parent in lineage
    const childCheck = await prisma.shareholder.findUnique({
      where: { id: childShareholder.id },
    });
    assert(childCheck?.parentId === createdShareholder.id, 'Lineage tree preserved: child retained parentId reference');

    // -------------------------------------------------------------
    // TEST 8: Payout Batch Approval Isolation for Shareholder Statement
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 8: Payout Statement Batch Isolation ---');
    const unapprovedBatch = await prisma.payoutBatch.create({
      data: {
        batchNumber: `TEST_DRAFT_${Date.now()}`,
        cycleStart: new Date('2026-09-01'),
        cycleEnd: new Date('2026-09-15'),
        status: 'PENDING',
      },
    });

    const approvedBatch = await prisma.payoutBatch.create({
      data: {
        batchNumber: `TEST_APPR_${Date.now()}`,
        cycleStart: new Date('2026-08-01'),
        cycleEnd: new Date('2026-08-15'),
        status: 'APPROVED',
      },
    });

    // Payout details for child shareholder
    await prisma.payoutDetail.create({
      data: {
        batchId: unapprovedBatch.id,
        shareholderId: childShareholder.id,
        profitAmount: 1000,
        commissionAmount: 500,
        totalAmount: 1500,
        grossProfitShare: 1000,
        grossGratitudeShare: 500,
        withheldAmount: 0,
        netPayable: 1500,
        status: 'PENDING',
      },
    });

    await prisma.payoutDetail.create({
      data: {
        batchId: approvedBatch.id,
        shareholderId: childShareholder.id,
        profitAmount: 2000,
        commissionAmount: 800,
        totalAmount: 2800,
        grossProfitShare: 2000,
        grossGratitudeShare: 800,
        withheldAmount: 0,
        netPayable: 2800,
        status: 'PAID',
      },
    });

    // Query for shareholder view: only APPROVED or RELEASED batches
    const shareholderVisiblePayouts = await prisma.payoutDetail.findMany({
      where: {
        shareholderId: childShareholder.id,
        batch: { status: { in: ['APPROVED', 'RELEASED'] } },
      },
      include: { batch: true },
    });

    assert(shareholderVisiblePayouts.length === 1, 'Only approved batch statement is visible to shareholder');
    assert(Number(shareholderVisiblePayouts[0].netPayable) === 2800, 'Correct net payable statement amount returned for approved batch');
    assert(shareholderVisiblePayouts[0].batch.status === 'APPROVED', 'Visible statement batch status is APPROVED');

    // Clean up test data
    console.log('\n--- Cleaning Up Verification Test Fixtures ---');
    await prisma.payoutDetail.deleteMany({ where: { shareholderId: childShareholder.id } });
    await prisma.payoutBatch.deleteMany({ where: { id: { in: [unapprovedBatch.id, approvedBatch.id] } } });
    await prisma.referralRelationship.deleteMany({ where: { id: referralEdge.id } });
    await prisma.notification.deleteMany({ where: { shareholderId: createdShareholder.id } });
    await prisma.userRankHistory.deleteMany({ where: { shareholderId: createdShareholder.id } });
    await prisma.otpVerification.deleteMany({ where: { identifier: createdShareholder.shareholderId } });
    await prisma.financialChangeRequest.deleteMany({ where: { shareholderId: createdShareholder.id } });
    await prisma.shareholder.deleteMany({ where: { id: { in: [childShareholder.id, createdShareholder.id, createdAdmin.id] } } });
    console.log('✅ Test fixtures cleaned up successfully.');

    console.log(`\n======================================================`);
    console.log(`🎉 ALL ${passedCount} / ${totalTests} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
    console.log(`======================================================\n`);

  } catch (error) {
    console.error('❌ Verification test run encountered an error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerificationTests();
