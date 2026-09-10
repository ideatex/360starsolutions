import { Controller, Get, Post, Query, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { HoldingBalanceService } from './holding-balance.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('holding-balance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HoldingBalanceController {
  constructor(private readonly holdingBalanceService: HoldingBalanceService) {}

  @Get('summary')
  async getSummary(@Request() req: any, @Query('shareholderId') shareholderId?: string) {
    let targetUser = shareholderId;
    if (req.shareholder.role === 'SHAREHOLDER') {
      targetUser = req.shareholder.id;
    }
    return this.holdingBalanceService.getHoldingSummary(targetUser || req.shareholder.id);
  }

  @Get('ledger')
  async getLedger(
    @Request() req: any,
    @Query('shareholderId') shareholderId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    let targetUser = shareholderId;
    if (req.shareholder.role === 'SHAREHOLDER') {
      targetUser = req.shareholder.id;
    }
    return this.holdingBalanceService.getHoldingLedgerHistory(
      targetUser || req.shareholder.id,
      Number(page),
      Number(limit),
    );
  }

  @Post(':id/convert')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async triggerConversion(@Request() req: any, @Param('id') shareholderId: string) {
    return this.holdingBalanceService.triggerAutoConversion(shareholderId, req.shareholder.id);
  }
}
