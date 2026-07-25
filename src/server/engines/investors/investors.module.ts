import { Module } from '@nestjs/common';
import { InvestorsService } from '@server/engines/investors/investors.service';
import { InvestorsController } from '@server/engines/investors/investors.controller';
import { PrismaModule } from '@server/prisma/prisma.module';
import { MlmModule } from '@server/engines/mlm/mlm.module';

@Module({
  imports: [PrismaModule, MlmModule],
  controllers: [InvestorsController],
  providers: [InvestorsService],
  exports: [InvestorsService],
})
export class InvestorsModule {}
