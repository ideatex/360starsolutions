import { Module } from '@nestjs/common';
import { PayoutService } from '@server/engines/payout/payout.service';
import { PayoutController } from '@server/engines/payout/payout.controller';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { NotificationModule } from '@server/engines/notification/notification.module';
import { InvestorsModule } from '@server/engines/investors/investors.module';

@Module({
  imports: [PrismaModule, AuditModule, NotificationModule, InvestorsModule],
  providers: [PayoutService],
  controllers: [PayoutController],
  exports: [PayoutService],
})
export class PayoutModule {}
