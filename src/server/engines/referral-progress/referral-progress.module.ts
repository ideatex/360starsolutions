import { Module } from '@nestjs/common';
import { ReferralProgressController } from '@server/engines/referral-progress/referral-progress.controller';
import { ReferralProgressService } from '@server/engines/referral-progress/referral-progress.service';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { ReferralTreeModule } from '@server/engines/referral-tree/referral-tree.module';
import { CommissionModule } from '@server/engines/commission/commission.module';

@Module({
  imports: [PrismaModule, AuditModule, ReferralTreeModule, CommissionModule],
  controllers: [ReferralProgressController],
  providers: [ReferralProgressService],
  exports: [ReferralProgressService],
})
export class ReferralProgressModule {}

