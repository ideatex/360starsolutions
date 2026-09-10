import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { SmsModule } from '@server/sms/sms.module';
import { CommissionModule } from '@server/engines/commission/commission.module';

import { BusinessConfigModule } from '@server/business-config/business-config.module';
import { ReferralTreeModule } from '@server/engines/referral-tree/referral-tree.module';
import { InvestorsModule } from '@server/engines/investors/investors.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    SmsModule,
    CommissionModule,
    BusinessConfigModule,
    ReferralTreeModule,
    InvestorsModule,
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService],
  exports: [RegistrationService],
})
export class RegistrationModule {}
