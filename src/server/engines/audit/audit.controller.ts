import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from '@server/engines/audit/audit.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getLogs(Number(page), Number(limit), period, startDate, endDate);
  }

  @Get('export')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async exportLogs(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.exportLogs(period, startDate, endDate);
  }
}
