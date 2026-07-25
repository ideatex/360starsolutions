import { Module } from '@nestjs/common';
import { FounderCmsService } from '@server/founder-cms/founder-cms.service';
import { FounderCmsController } from '@server/founder-cms/founder-cms.controller';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [FounderCmsService],
  controllers: [FounderCmsController],
  exports: [FounderCmsService],
})
export class FounderCmsModule {}
