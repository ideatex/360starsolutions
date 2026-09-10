import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('admin/sms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Get('logs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('recipient') recipient?: string,
  ) {
    return this.smsService.getLogs(Number(page), Number(limit), recipient);
  }

  @Post(':id/retry')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async retry(@Param('id') id: string) {
    return this.smsService.retrySms(id);
  }
}
