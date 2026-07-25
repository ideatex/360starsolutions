import { Module } from '@nestjs/common';
import { BusinessConfigService } from '@server/business-config/business-config.service';
import { BusinessConfigController } from '@server/business-config/business-config.controller';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [BusinessConfigService],
  controllers: [BusinessConfigController],
  exports: [BusinessConfigService],
})
export class BusinessConfigModule {}
