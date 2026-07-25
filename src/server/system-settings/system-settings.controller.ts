import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SystemSettingsService } from '@server/system-settings/system-settings.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('system/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAll() {
    return this.settingsService.getAll();
  }

  @Patch()
  @Roles('SUPER_ADMIN')
  async update(@Body() body: Record<string, string>) {
    for (const [key, value] of Object.entries(body)) {
      await this.settingsService.set(key, String(value));
    }
    return { success: true };
  }
}
