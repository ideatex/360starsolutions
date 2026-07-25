import { Module } from '@nestjs/common';
import { ReportService } from '@server/engines/report/report.service';
import { ReportController } from '@server/engines/report/report.controller';
import { PrismaModule } from '@server/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ReportService],
  controllers: [ReportController],
})
export class ReportModule {}
