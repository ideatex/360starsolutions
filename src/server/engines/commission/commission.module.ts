import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/prisma/prisma.module';
import { CommissionService } from './commission.service';
import { CommissionController } from './commission.controller';
import { BusinessConfigModule } from '@server/business-config/business-config.module';
import { ReferralTreeModule } from '@server/engines/referral-tree/referral-tree.module';

@Module({
  imports: [PrismaModule, BusinessConfigModule, ReferralTreeModule],
  controllers: [CommissionController],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
