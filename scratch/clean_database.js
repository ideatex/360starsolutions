const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { parse } = require('pg-connection-string');

let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('sslmode=')) {
  connectionString = connectionString.replace(/sslmode=[^&]+&?/, '');
}
const config = parse(connectionString);
config.ssl = { rejectUnauthorized: false };

const client = new Client(config);

async function cleanDatabase() {
  await client.connect();
  console.log('✅ Connected to Supabase.');

  try {
    await client.query('BEGIN');

    // 1. Find existing super admin (SH000000) or any SUPER_ADMIN
    const adminRes = await client.query(`
      SELECT id, "shareholderId", name, role, phone 
      FROM "User" 
      WHERE "shareholderId" = '360SS001' OR role = 'SUPER_ADMIN' 
      ORDER BY CASE WHEN "shareholderId" = '360SS001' THEN 0 ELSE 1 END, "createdAt" ASC 
      LIMIT 1;
    `);

    if (adminRes.rows.length === 0) {
      throw new Error('No SUPER_ADMIN or SH000000 account found in database!');
    }

    const superAdmin = adminRes.rows[0];
    console.log(`Found Super Admin to preserve: ID=${superAdmin.id}, current shareholderId=${superAdmin.shareholderId}`);

    // 2. Clear self-referencing parentId and previousParentId in "User"
    console.log('Clearing hierarchy links on all users...');
    await client.query(`UPDATE "User" SET "parentId" = NULL, "previousParentId" = NULL;`);

    // 3. Clear all transaction, log, notification, and user child tables
    const tablesToTruncate = [
      'AccountUnlockOverride',
      'AnnouncementRead',
      'AuditLog',
      'BusinessVolume',
      'CommissionLedger',
      'Contribution',
      'ContributionSummary',
      'FinancialChangeRequest',
      'HoldingLedger',
      'Investment',
      'InvestorProfile',
      'JwtBlacklist',
      'MessageAttachment',
      'Message',
      'Notification',
      'OtpVerification',
      'PayoutDetail',
      'PayoutBatch',
      'ProfitCalculation',
      'ProfitLedger',
      'ReconciliationLog',
      'ReferralRelationship',
      'RegistrationRequest',
      'SmsLog',
      'UserRankHistory',
      'Withdrawal',
      'Announcement'
    ];

    console.log('Cleaning transactional and log tables...');
    for (const table of tablesToTruncate) {
      await client.query(`DELETE FROM "${table}";`);
      console.log(`  - Emptied table: ${table}`);
    }

    // 4. Delete all other users except the super admin
    console.log(`Deleting all users except Super Admin (${superAdmin.id})...`);
    const delRes = await client.query(`
      DELETE FROM "User" 
      WHERE id != $1;
    `, [superAdmin.id]);
    console.log(`  - Deleted ${delRes.rowCount} other user account(s).`);

    // 5. Update the preserved super admin to ID 360SS001 and password TestPassword123!
    const newPasswordHash = await bcrypt.hash('TestPassword123!', 10);
    console.log('Updating Super Admin account details to 360SS001 with password TestPassword123! ...');

    await client.query(`
      UPDATE "User"
      SET 
        "shareholderId" = '360SS001',
        "referralCode" = '360SS001',
        "passwordHash" = $1,
        "name" = 'Super Admin',
        "role" = 'SUPER_ADMIN',
        "status" = 'ACTIVE',
        "accountType" = 'CONTRIBUTION',
        "holdingBalance" = 0,
        "withholdingPercentage" = 20,
        "unlockedLevelOverride" = NULL,
        "currentRank" = NULL,
        "parentId" = NULL,
        "previousParentId" = NULL,
        "pan" = NULL,
        "permissions" = NULL,
        "bankAccountName" = NULL,
        "bankAccountNumber" = NULL,
        "bankName" = NULL,
        "bankBranch" = NULL,
        "bankIfsc" = NULL,
        "disabledAt" = NULL
      WHERE id = $2;
    `, [newPasswordHash, superAdmin.id]);

    // 6. Reset userIdNextNumber in BusinessConfiguration so next user starts from 2 (or 1)
    await client.query(`
      UPDATE "BusinessConfiguration"
      SET "userIdNextNumber" = 2
      WHERE id = (SELECT id FROM "BusinessConfiguration" ORDER BY version DESC LIMIT 1);
    `);
    console.log('Reset BusinessConfiguration userIdNextNumber to 2.');

    await client.query('COMMIT');
    console.log('\n🎉 DATABASE CLEANING COMPLETED SUCCESSFULLY!');

    // 7. Verify remaining records
    const finalUser = await client.query(`SELECT id, "shareholderId", name, role, status, "referralCode" FROM "User";`);
    console.log('\n--- Final User in Database ---');
    console.table(finalUser.rows);

    const userCount = await client.query(`SELECT COUNT(*) FROM "User";`);
    console.log(`Total remaining users: ${userCount.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clean database, transaction rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanDatabase();
