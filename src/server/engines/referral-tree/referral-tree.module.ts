import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { BusinessConfigModule } from '@server/business-config/business-config.module';
import { ReferralTreeService } from '@server/engines/referral-tree/referral-tree.service';

@Module({
  imports: [PrismaModule, AuditModule, BusinessConfigModule],
  providers: [ReferralTreeService],
  exports: [ReferralTreeService],
})
export class ReferralTreeModule {}
