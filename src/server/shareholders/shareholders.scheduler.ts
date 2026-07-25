import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@server/prisma/prisma.service';
import { UsersService } from '@server/shareholders/shareholders.service';
import { AuditService } from '@server/engines/audit/audit.service';

@Injectable()
export class UsersScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  // Runs daily at midnight
  @Cron('0 0 * * *')
  async handleAutoArchival() {
    console.log('--- RUNNING AUTO-EXPIRATION & ARCHIVAL SCHEDULED JOB ---');
    const today = new Date();

    // 1. Expire investments whose validity date has passed
    const activeInvestments = await this.prisma.investment.findMany({
      where: { status: 'ACTIVE' },
    });

    let expiredCount = 0;
    for (const inv of activeInvestments) {
      const expiryDate = new Date(inv.startDate);
      expiryDate.setMonth(expiryDate.getMonth() + (inv.validityMonths ?? 12));
      if (today > expiryDate) {
        await this.prisma.investment.update({
          where: { id: inv.id },
          data: { status: 'COMPLETED' },
        });
        expiredCount++;
        console.log(`Expired investment ${inv.id} for shareholder ${inv.shareholderId}`);
      }
    }
    console.log(`Auto-expiration complete. Expired ${expiredCount} investments.`);

    // 2. Auto-disable shareholders who have 0 active investments after their validity date
    const activeShareholders = await this.prisma.shareholder.findMany({
      where: {
        status: { in: ['ACTIVE', 'RESTORED'] },
      },
      include: {
        investments: true,
      },
    });

    let disabledCount = 0;
    for (const u of activeShareholders) {
      const activeInvs = u.investments.filter(i => i.status === 'ACTIVE');
      if (activeInvs.length === 0 && u.investments.length > 0) {
        // Shareholder has no active investments but has completed ones
        // Find latest expiry date
        let latestExpiry: Date | null = null;
        for (const inv of u.investments) {
          const expiry = new Date(inv.startDate);
          expiry.setMonth(expiry.getMonth() + (inv.validityMonths ?? 12));
          if (!latestExpiry || expiry > latestExpiry) {
            latestExpiry = expiry;
          }
        }

        if (latestExpiry && today > latestExpiry) {
          await this.prisma.shareholder.update({
            where: { id: u.id },
            data: {
              status: 'DISABLED',
              disabledAt: today,
            },
          });
          disabledCount++;

          // Log audit
          await this.auditService.logAction({
            shareholderId: 'system',
            action: 'AUTO_DISABLE_USER',
            entityType: 'Shareholder',
            entityId: u.id,
            oldValue: u.status,
            newValue: 'DISABLED',
          });

          // Create Notification
          await this.prisma.notification.create({
            data: {
              shareholderId: u.id,
              title: 'Account Disabled',
              message: 'Your account has been automatically disabled because you have no active investments.',
              type: 'SECURITY',
              priority: 'HIGH',
            },
          });

          console.log(`Auto-disabled shareholder: ${u.shareholderId} due to expired investments.`);
        }
      }
    }
    console.log(`Auto-disable complete. Disabled ${disabledCount} shareholders.`);

    // 3. Soft-delete shareholders disabled for 30 days
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 30);

    const usersToDelete = await this.prisma.shareholder.findMany({
      where: {
        status: 'DISABLED',
        disabledAt: {
          lte: thresholdDate,
        },
      },
    });

    for (const u of usersToDelete) {
      await this.prisma.shareholder.update({
        where: { id: u.id },
        data: { status: 'DELETED' },
      });

      // Log audit
      await this.auditService.logAction({
        shareholderId: 'system',
        action: 'AUTO_DELETE_USER',
        entityType: 'Shareholder',
        entityId: u.id,
        oldValue: 'DISABLED',
        newValue: 'DELETED',
      });

      // Create Notification
      await this.prisma.notification.create({
        data: {
          shareholderId: u.id,
          title: 'Account Soft Deleted',
          message: 'Your account has been automatically soft-deleted after being disabled for 30 days.',
          type: 'SECURITY',
          priority: 'HIGH',
        },
      });

      console.log(`Auto-deleted shareholder: ${u.shareholderId}`);
    }
    console.log(`Auto-deletion complete. Soft-deleted ${usersToDelete.length} shareholders.`);
  }
}
