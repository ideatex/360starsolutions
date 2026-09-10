import { Module } from '@nestjs/common';
import { PayoutService } from '@server/engines/payout/payout.service';
import { PayoutController } from '@server/engines/payout/payout.controller';
import { PayoutCycleService } from '@server/engines/payout/payout-cycle.service';
import { FirstPayoutProrationService } from '@server/engines/payout/first-payout-proration.service';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { NotificationModule } from '@server/engines/notification/notification.module';
import { ProfitSharingModule } from '@server/engines/profit-sharing/profit-sharing.module';
import { HoldingBalanceModule } from '@server/engines/holding-balance/holding-balance.module';
import { ReferralTreeModule } from '@server/engines/referral-tree/referral-tree.module';
import { BusinessConfigModule } from '@server/business-config/business-config.module';
import { CommissionModule } from '@server/engines/commission/commission.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationModule,
    ProfitSharingModule,
    HoldingBalanceModule,
    ReferralTreeModule,
    BusinessConfigModule,
    CommissionModule,
  ],
  providers: [PayoutService, PayoutCycleService, FirstPayoutProrationService],
  controllers: [PayoutController],
  exports: [PayoutService, PayoutCycleService, FirstPayoutProrationService],
})
export class PayoutModule {}
