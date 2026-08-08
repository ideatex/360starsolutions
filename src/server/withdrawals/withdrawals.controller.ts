import { Controller, Get, Post, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { WithdrawalsService } from '@server/withdrawals/withdrawals.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';
import { WithdrawalType } from '@prisma/client';

@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('process')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async processWithdrawal(
    @Request() req: any,
    @Body() body: {
      shareholderId: string;
      type: WithdrawalType;
      amount?: number;
      remarks?: string;
    },
  ) {
    return this.withdrawalsService.processWithdrawal({
      ...body,
      adminId: req.user?.sub || req.user?.id,
    });
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getWithdrawals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: WithdrawalType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.withdrawalsService.getWithdrawals({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      type,
      startDate,
      endDate,
    });
  }

  @Get('export')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async exportWithdrawals(
    @Query('search') search?: string,
    @Query('type') type?: WithdrawalType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.withdrawalsService.exportWithdrawals({
      search,
      type,
      startDate,
      endDate,
    });
  }

  @Get('active-funds/:shareholderId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getShareholderActiveFunds(@Param('shareholderId') shareholderId: string) {
    return this.withdrawalsService.getShareholderActiveFunds(shareholderId);
  }
}
