import { Module } from '@nestjs/common';
import { MlmService } from '@server/engines/mlm/mlm.service';
import { MlmController } from '@server/engines/mlm/mlm.controller';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [MlmService],
  controllers: [MlmController],
  exports: [MlmService],
})
export class MlmModule {}
