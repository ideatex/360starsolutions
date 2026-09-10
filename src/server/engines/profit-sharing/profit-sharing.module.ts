import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/prisma/prisma.module';
import { ProfitSharingService } from '@server/engines/profit-sharing/profit-sharing.service';
import { ProfitSharingController } from '@server/engines/profit-sharing/profit-sharing.controller';
import { BusinessConfigModule } from '@server/business-config/business-config.module';

@Module({
  imports: [PrismaModule, BusinessConfigModule],
  controllers: [ProfitSharingController],
  providers: [ProfitSharingService],
  exports: [ProfitSharingService],
})
export class ProfitSharingModule {}
