const BACKEND_URL = 'http://localhost:3002/api/v1';

async function runTests() {
  console.log('ðŸš€ Starting Programmatic API Integration Smoke Test (Native Fetch)...');

  try {
    // 1. Auth Login (Super Admin)
    console.log('ðŸ”‘ Logging in as Super Admin...');
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shareholderId: 'superadmin@example.com',
        password: 'TestPassword123!',
      }),
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    }
    const loginData = await loginRes.json();
    const superAdminToken = loginData.access_token;
    console.log('âœ… Super Admin logged in successfully.');

    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    };

    // 2. Business Configuration
    console.log('âš™ï¸ Fetching current Business Configuration...');
    const currentConfigRes = await fetch(`${BACKEND_URL}/admin/business-config`, {
      headers: adminHeaders,
    });
    const currentConfig = await currentConfigRes.json();
    console.log('âœ… Current prefix:', currentConfig.userIdPrefix);

    console.log('âš™ï¸ Updating Business Configuration settings...');
    const updateConfigRes = await fetch(`${BACKEND_URL}/admin/business-config`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userIdPrefix: 'TEST',
        userIdStartingNumber: 100,
        userIdLength: 5,
        profitSharingPercentage: '0.15',
        referralLevelSettings: { levels: 7 },
      }),
    });
    if (!updateConfigRes.ok) {
      throw new Error(`Config update failed: ${updateConfigRes.status} ${await updateConfigRes.text()}`);
    }
    console.log('âœ… Business Configuration updated successfully.');

    // 3. Register Shareholder using Wizard fields (Sequential ID check)
    console.log('ðŸ‘¤ Registering a new shareholder via Admin/Super Admin...');
    const usershareholderId = `test_${Date.now()}@example.com`;
    const userRes = await fetch(`${BACKEND_URL}/shareholders`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        shareholderId: usershareholderId,
        password: 'Password123!',
        role: 'SHAREHOLDER',
        firstName: 'Integration',
        lastName: 'Test',
        phone: `+199${Date.now().toString().slice(-9)}`,
        dob: '1990-01-01',
        addressBuilding: 'Suite 101',
        addressArea: 'Tech District',
        addressCity: 'Servertown',
        addressDistrict: 'Cloud County',
        addressState: 'TS',
        addressPincode: '99999',
        bankAccountName: 'Integration Tester',
        bankAccountNumber: '987654321',
        bankName: 'Prisma Bank',
        bankBranch: 'Main',
        bankIfsc: 'PRIS0000001',
        contributionAmount: '5000',
        contributionMode: 'Bank Transfer',
        issuedAgreement: true,
        issuedCheque: true,
      }),
    });

    if (!userRes.ok) {
      throw new Error(`Shareholder registration failed: ${userRes.status} ${await userRes.text()}`);
    }
    const newUser = await userRes.json();
    console.log(`âœ… Shareholder registered successfully. Custom ID: ${newUser.shareholderId}`);
    if (!newUser.shareholderId.startsWith('TEST')) {
      throw new Error(`Expected Custom ID to start with TEST, got: ${newUser.shareholderId}`);
    }
    console.log(`ðŸŽ‰ Sequential ID confirmation: ${newUser.shareholderId} matches config criteria!`);

    // 4. Test Disable/Enable lifecycle
    console.log('ðŸ‘¤ Disabling shareholder...');
    const disableRes = await fetch(`${BACKEND_URL}/shareholders/${newUser.id}/disable`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    if (!disableRes.ok) {
      throw new Error(`Shareholder disable failed: ${disableRes.status}`);
    }
    console.log('âœ… Shareholder disabled.');

    console.log('ðŸ‘¤ Enabling shareholder...');
    const enableRes = await fetch(`${BACKEND_URL}/shareholders/${newUser.id}/enable`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    if (!enableRes.ok) {
      throw new Error(`Shareholder enable failed: ${enableRes.status}`);
    }
    console.log('âœ… Shareholder enabled.');

    // 5. Test Password Reset
    console.log('ðŸ”‘ Resetting shareholder password...');
    const resetRes = await fetch(`${BACKEND_URL}/shareholders/${newUser.id}/reset-password`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ password: 'NewPassword123!' }),
    });
    if (!resetRes.ok) {
      throw new Error(`Password reset failed: ${resetRes.status}`);
    }
    console.log('âœ… Shareholder password reset successful.');

    // 5.1. Test MLM Levels, Volumes, and Threshold-based Commission engine
    console.log('âš™ï¸ Super Admin creating MLM level 1 configuration rule...');
    const createMlmRes = await fetch(`${BACKEND_URL}/mlm/levels`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        levelNumber: 1,
        volumeThreshold: 2000,
        profitType: 'PERCENT',
        profitValue: 0.05,
        isActive: true,
      }),
    });
    if (!createMlmRes.ok) {
      throw new Error(`MLM Level Config creation failed: ${createMlmRes.status} ${await createMlmRes.text()}`);
    }
    console.log('âœ… MLM configuration created successfully.');

    // We need to log in as the parent shareholder to get their userToken for fetching MLM data
    console.log('ðŸ”‘ Logging in as the parent shareholder to get userToken...');
    const userLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shareholderId: usershareholderId,
        password: 'NewPassword123!',
      }),
    });
    if (!userLoginRes.ok) {
      throw new Error(`Shareholder login failed: ${userLoginRes.status}`);
    }
    const userLoginData = await userLoginRes.json();
    const userToken = userLoginData.access_token;
    console.log('âœ… Parent shareholder logged in.');

    const userHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    };

    console.log('ðŸ‘¤ Registering a child shareholder referred by the first shareholder...');
    const childshareholderId = `child_${Date.now()}@example.com`;
    const childRes = await fetch(`${BACKEND_URL}/shareholders`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        shareholderId: childshareholderId,
        password: 'Password123!',
        role: 'SHAREHOLDER',
        firstName: 'Child',
        lastName: 'Tester',
        phone: `+188${(Date.now() + 1).toString().slice(-9)}`,
        dob: '1995-05-15',
        addressBuilding: 'Apt 202',
        addressCity: 'Servertown',
        referrerId: newUser.shareholderId, // refer to the first shareholder
        contributionAmount: '3000', // exceeds threshold of 2000
        contributionMode: 'Bank Transfer',
      }),
    });
    if (!childRes.ok) {
      throw new Error(`Child shareholder registration failed: ${childRes.status} ${await childRes.text()}`);
    }
    const childUser = await childRes.json();
    console.log(`âœ… Child shareholder registered successfully. ID: ${childUser.id}`);

    console.log('ðŸ“ˆ Fetching first shareholder\'s MLM volumes and profit sharing...');
    const volumesRes = await fetch(`${BACKEND_URL}/mlm/my-volumes`, {
      headers: userHeaders,
    });
    if (!volumesRes.ok) {
      throw new Error(`MLM Volume fetch failed: ${volumesRes.status}`);
    }
    const myMlmData = await volumesRes.json();
    console.log('âœ… Fetch MLM volume data response:', JSON.stringify(myMlmData));

    const vol = myMlmData.volumes.find((v: any) => v.level === 1);
    if (!vol || Number(vol.totalVolume) !== 3000) {
      throw new Error(`Expected level 1 volume to be 3000, got: ${vol?.totalVolume}`);
    }
    console.log('âœ… Level 1 business volume correctly recalculated to $3,000!');

    const calc = myMlmData.calculations.find((c: any) => c.level === 1);
    if (!calc || Number(calc.profitAmount) !== 150) { // 3000 * 0.05 = 150
      throw new Error(`Expected profit amount to be 150 (5% of 3000), got: ${calc?.profitAmount}`);
    }
    console.log(`âœ… Level 1 profit commission of $150 verified successfully!`);

    // 6. Test Announcements
    console.log('ðŸ“¢ Publishing a Targeted Announcement...');
    const annRes = await fetch(`${BACKEND_URL}/admin/announcements`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'API Integration Test Announcement',
        content: 'This announcement is generated by smoke_test.ts',
        priority: 'HIGH',
        audience: 'EVERYONE',
        pinned: true,
      }),
    });
    if (!annRes.ok) {
      throw new Error(`Announcement creation failed: ${annRes.status}`);
    }
    console.log('âœ… Announcement published.');

    // Shareholder is already logged in, userHeaders is already configured.

    // 7. Verify notifications
    console.log('ðŸ”” Fetching shareholder notifications...');
    const notifsRes = await fetch(`${BACKEND_URL}/shareholders/me/notifications`, {
      headers: userHeaders,
    });
    const notifs = await notifsRes.json();
    const hasAnnNotif = notifs.some((n: any) => n.title === 'API Integration Test Announcement');
    if (!hasAnnNotif) {
      throw new Error('Announcement notification was not distributed to standard shareholder!');
    }
    console.log('âœ… Verified: Targeted announcement notification distributed successfully!');

    // 8. Test Messaging System
    console.log('ðŸ’¬ Sending a message to Super Admin...');
    const msgRes = await fetch(`${BACKEND_URL}/messages`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        recipientId: 'superadmin@example.com',
        subject: 'Inquiry from test shareholder',
        content: 'Hello admin, this is an automated testing thread.', // backend field is 'content'
      }),
    });
    if (!msgRes.ok) {
      throw new Error(`Message dispatch failed: ${msgRes.status} ${await msgRes.text()}`);
    }
    console.log('âœ… Message dispatched.');

    console.log('ðŸ’¬ Fetching Super Admin inbox...');
    const threadsRes = await fetch(`${BACKEND_URL}/messages/inbox?folder=inbox`, {
      headers: adminHeaders,
    });
    const threads = await threadsRes.json();
    const receivedThread = threads.find((t: any) => t.subject === 'Inquiry from test shareholder');
    if (!receivedThread) {
      throw new Error('Message was not received by Super Admin!');
    }
    console.log('âœ… Verified: Super Admin received the message thread.');

    console.log('ðŸ’¬ Super Admin replying to message thread...');
    const replyRes = await fetch(`${BACKEND_URL}/messages`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        recipientId: usershareholderId,
        subject: 'Re: Inquiry from test shareholder',
        content: 'Hello test shareholder, this is a reply.',
        parentMessageId: receivedThread.id,
      }),
    });
    if (!replyRes.ok) {
      throw new Error(`Reply dispatch failed: ${replyRes.status}`);
    }
    console.log('âœ… Reply sent.');

    // Log out shareholder
    console.log('ðŸ”‘ Logging out shareholder (revoking token)...');
    const logoutRes = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      headers: userHeaders,
    });
    if (!logoutRes.ok) {
      throw new Error(`Logout failed: ${logoutRes.status}`);
    }
    console.log('âœ… Token logged in blacklist.');

    // Verify revoked token is blocked
    console.log('ðŸ”’ Verifying token is blacklisted...');
    const blockedRes = await fetch(`${BACKEND_URL}/shareholders/me/notifications`, {
      headers: userHeaders,
    });
    if (blockedRes.status === 401) {
      console.log('ðŸ”’ Verified: JWT blacklisted token correctly blocked access after logout!');
    } else {
      throw new Error(`Revoked token was not blocked! Status received: ${blockedRes.status}`);
    }

    console.log('\nðŸŒŸ ALL PROGRAMMATIC INTEGRATION SMOKE TESTS PASSED SUCCESSFULLY! ðŸŒŸ');
  } catch (error: any) {
    console.error('âŒ Integration Test FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
