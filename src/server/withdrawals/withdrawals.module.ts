import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { NotificationModule } from '@server/engines/notification/notification.module';
import { InvestorsModule } from '@server/engines/investors/investors.module';
import { WithdrawalsService } from '@server/withdrawals/withdrawals.service';
import { WithdrawalsController } from '@server/withdrawals/withdrawals.controller';

@Module({
  imports: [PrismaModule, AuditModule, NotificationModule, InvestorsModule],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
