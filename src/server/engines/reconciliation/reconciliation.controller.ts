import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('admin/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('run')
  async runAudit() {
    return this.reconciliationService.runFullReconciliation();
  }

  @Get('logs')
  async getLogs(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.reconciliationService.getHistoricalLogs(Number(page), Number(limit));
  }
}
