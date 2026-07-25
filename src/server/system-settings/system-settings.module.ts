import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/prisma/prisma.module';
import { SystemSettingsService } from '@server/system-settings/system-settings.service';
import { SystemSettingsController } from '@server/system-settings/system-settings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
