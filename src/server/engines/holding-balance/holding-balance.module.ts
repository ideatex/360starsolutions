import { Module } from '@nestjs/common';
import { HoldingBalanceService } from './holding-balance.service';
import { HoldingBalanceController } from './holding-balance.controller';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [HoldingBalanceController],
  providers: [HoldingBalanceService],
  exports: [HoldingBalanceService],
})
export class HoldingBalanceModule {}
