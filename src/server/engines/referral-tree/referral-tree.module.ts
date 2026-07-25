import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/prisma/prisma.module';
import { ReferralTreeService } from '@server/engines/referral-tree/referral-tree.service';

@Module({
  imports: [PrismaModule],
  providers: [ReferralTreeService],
  exports: [ReferralTreeService],
})
export class ReferralTreeModule {}
