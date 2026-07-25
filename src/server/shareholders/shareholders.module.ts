import { Module } from '@nestjs/common';
import { UsersController } from '@server/shareholders/shareholders.controller';
import { UsersService } from '@server/shareholders/shareholders.service';
import { UsersScheduler } from '@server/shareholders/shareholders.scheduler';
import { PrismaModule } from '@server/prisma/prisma.module';
import { ReferralTreeModule } from '@server/engines/referral-tree/referral-tree.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { BusinessConfigModule } from '@server/business-config/business-config.module';
import { MlmModule } from '@server/engines/mlm/mlm.module';
import { InvestorsModule } from '@server/engines/investors/investors.module';

@Module({
  imports: [PrismaModule, ReferralTreeModule, AuditModule, BusinessConfigModule, MlmModule, InvestorsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersScheduler],
  exports: [UsersService],
})
export class UsersModule {}
