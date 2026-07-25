import { Module } from '@nestjs/common';
import { AuditService } from '@server/engines/audit/audit.service';
import { AuditController } from '@server/engines/audit/audit.controller';
import { PrismaModule } from '@server/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
