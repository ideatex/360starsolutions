import { Controller, Get, Post, Put, Body, UseGuards, Request } from '@nestjs/common';
import { BusinessConfigService } from '@server/business-config/business-config.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller(['admin/business-config', 'admin/config'])
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessConfigController {
  constructor(private readonly configService: BusinessConfigService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  async getLatest() {
    const config = await this.configService.getLatest();
    return {
      ...config,
      userIdDigits: config.userIdLength,
    };
  }

  @Get('history')
  @Roles('SUPER_ADMIN')
  async getHistory() {
    return this.configService.getVersionHistory();
  }

  @Post()
  @Roles('SUPER_ADMIN')
  async createNewVersion(@Request() req: any, @Body() body: any) {
    const mappedBody = {
      ...body,
      userIdLength: body.userIdDigits !== undefined ? Number(body.userIdDigits) : body.userIdLength,
    };
    const config = await this.configService.createNewVersion(mappedBody, req.shareholder.id);
    return {
      ...config,
      userIdDigits: config.userIdLength,
    };
  }

  @Put()
  @Roles('SUPER_ADMIN')
  async updateConfig(@Request() req: any, @Body() body: any) {
    const mappedBody = {
      ...body,
      userIdLength: body.userIdDigits !== undefined ? Number(body.userIdDigits) : body.userIdLength,
    };
    const config = await this.configService.createNewVersion(mappedBody, req.shareholder.id);
    return {
      ...config,
      userIdDigits: config.userIdLength,
    };
  }
}

