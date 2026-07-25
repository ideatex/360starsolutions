import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/prisma/prisma.module';
import { ProfitSharingService } from '@server/engines/profit-sharing/profit-sharing.service';
import { PayoutModule } from '@server/engines/payout/payout.module';

@Module({
  imports: [PrismaModule, PayoutModule],
  providers: [ProfitSharingService],
  exports: [ProfitSharingService],
})
export class ProfitSharingModule {}
