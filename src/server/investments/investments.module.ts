import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/prisma/prisma.module';
import { SystemSettingsModule } from '@server/system-settings/system-settings.module';
import { CommissionModule } from '@server/engines/commission/commission.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { InvestmentsService } from '@server/investments/investments.service';
import { InvestmentsController } from '@server/investments/investments.controller';

@Module({
  imports: [PrismaModule, SystemSettingsModule, CommissionModule, AuditModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
