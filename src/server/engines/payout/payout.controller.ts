import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { PayoutService } from '@server/engines/payout/payout.service';
import { PayoutCycleService } from '@server/engines/payout/payout-cycle.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly payoutCycleService: PayoutCycleService,
  ) {}

  @Get('cycles')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getCycles() {
    return this.payoutService.getAvailableCycles();
  }

  @Get('preview')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async previewBatch(@Query('cycleIdentifier') cycleIdentifier?: string) {
    if (!cycleIdentifier) {
      throw new BadRequestException('cycleIdentifier query parameter is required (e.g. 2026-09-CYCLE-1).');
    }
    return this.payoutService.previewPayoutBatch(cycleIdentifier);
  }

  @Get('batches')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getBatches(@Query('page') page = '1', @Query('limit') limit = '15') {
    return this.payoutService.getBatches(Number(page), Number(limit));
  }

  @Get('batches/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getBatchDetails(@Param('id') id: string) {
    return this.payoutService.getBatchDetails(id);
  }

  @Get('batches/:id/reconciliation')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getBatchReconciliation(@Param('id') id: string) {
    return this.payoutService.getBatchReconciliation(id);
  }

  @Get('statements/:payoutDetailId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getPayoutStatement(@Param('payoutDetailId') payoutDetailId: string) {
    return this.payoutService.getPayoutStatement(payoutDetailId);
  }

  @Get('shareholder-payouts')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAllShareholderPayouts(
    @Query('search') search?: string,
    @Query('batchId') batchId?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.payoutService.getAllShareholderPayouts(search, batchId, status, Number(page), Number(limit));
  }

  @Post('batches/generate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async generateBatch(
    @Request() req: any,
    @Body() body: { cycleIdentifier?: string; cycleStart?: string; cycleEnd?: string }
  ) {
    let identifier = body.cycleIdentifier;
    if (!identifier && body.cycleStart) {
      const cycle = this.payoutCycleService.resolvePayoutCycle(new Date(body.cycleStart));
      identifier = cycle.cycleIdentifier;
    }
    if (!identifier) {
      throw new BadRequestException('cycleIdentifier is required (e.g. 2026-09-CYCLE-1).');
    }

    return this.payoutService.generatePayoutBatch(identifier, req.shareholder?.id);
  }

  @Post('batches/:id/approve')
  @Roles('SUPER_ADMIN')
  async approveBatch(@Request() req: any, @Param('id') id: string) {
    return this.payoutService.approveBatch(id, req.shareholder.id);
  }

  @Post('batches/:id/release')
  @Roles('SUPER_ADMIN')
  async releaseBatch(@Request() req: any, @Param('id') id: string) {
    return this.payoutService.releaseBatch(id, req.shareholder.id);
  }

  @Post('batches/:id/reverse')
  @Roles('SUPER_ADMIN')
  async reverseBatch(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    return this.payoutService.reverseBatch(id, req.shareholder.id, body.reason || 'Admin initiated reversal');
  }

  @Patch('commissions/:id/reverse')
  @Roles('SUPER_ADMIN')
  async reverseCommission(@Request() req: any, @Param('id') id: string) {
    return this.payoutService.reverseCommission(id, req.shareholder.id);
  }

  @Patch('commissions/:id/reprocess')
  @Roles('SUPER_ADMIN')
  async reprocessCommission(@Request() req: any, @Param('id') id: string) {
    return this.payoutService.reprocessCommission(id, req.shareholder.id);
  }
}
