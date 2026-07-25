import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/prisma/prisma.module';
import { CommissionService } from '@server/engines/commission/commission.service';

@Module({
  imports: [PrismaModule],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
