import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ReportService } from '@server/engines/report/report.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';
import * as express from 'express';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getDashboardMetrics() {
    return this.reportService.getAdminDashboardMetrics();
  }

  @Get('shareholders')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getUsersReport(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('month') month?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('status') status?: string,
    @Query('agreementIssued') agreementIssued?: string,
    @Query('chequeIssued') chequeIssued?: string
  ) {
    return this.reportService.getUsersReport({ search, sortBy, sortOrder, month, minAmount, maxAmount, status, agreementIssued, chequeIssued });
  }

  @Get('investments')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getInvestmentsReport(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('month') month?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('status') status?: string,
    @Query('agreementIssued') agreementIssued?: string,
    @Query('chequeIssued') chequeIssued?: string
  ) {
    return this.reportService.getInvestmentsReport({ search, sortBy, sortOrder, month, minAmount, maxAmount, status, agreementIssued, chequeIssued });
  }

  @Get('profits')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getProfitsReport(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('month') month?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string
  ) {
    return this.reportService.getProfitsReport({ search, sortBy, sortOrder, month, minAmount, maxAmount });
  }

  @Get('commissions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getCommissionsReport(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('month') month?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string
  ) {
    return this.reportService.getCommissionsReport({ search, sortBy, sortOrder, month, minAmount, maxAmount });
  }

  @Get('shareholder-summary')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getShareholderSummaryReport(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('status') status?: string,
    @Query('agreementIssued') agreementIssued?: string,
    @Query('chequeIssued') chequeIssued?: string,
  ) {
    return this.reportService.getShareholderSummaryReport({ search, sortBy, sortOrder, status, agreementIssued, chequeIssued });
  }

  @Get('transactions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getTransactionReport(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getTransactionReport({ search, sortBy, sortOrder, type, startDate, endDate });
  }

  @Get('payout-cycle-summary')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getPayoutCycleReport(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.reportService.getPayoutCycleReport({ search, sortBy, sortOrder, batchId });
  }

  @Get('export')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async exportReport(
    @Query('type') type: string, 
    @Query('search') search: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: string,
    @Query('month') month: string,
    @Query('minAmount') minAmount: string,
    @Query('maxAmount') maxAmount: string,
    @Query('status') status: string,
    @Query('agreementIssued') agreementIssued: string,
    @Query('chequeIssued') chequeIssued: string,
    @Res() res: express.Response
  ) {
    const filters = { search, sortBy, sortOrder, month, minAmount, maxAmount, status, agreementIssued, chequeIssued };
    const file = await this.reportService.getExportFile(type, filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${file.filename}`);
    return res.status(200).send(file.data);
  }
}

