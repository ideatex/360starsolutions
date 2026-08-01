import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PayoutService } from '@server/engines/payout/payout.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

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
  async generateBatch(@Body() body: { cycleStart: string; cycleEnd: string }) {
    return this.payoutService.generatePayoutBatch(new Date(body.cycleStart), new Date(body.cycleEnd));
  }

  @Post('batches/:id/approve')
  @Roles('SUPER_ADMIN')
  async approveBatch(@Param('id') id: string) {
    await this.payoutService.approveBatch(id);
    return { success: true };
  }

  @Post('batches/:id/release')
  @Roles('SUPER_ADMIN')
  async releaseBatch(@Param('id') id: string) {
    await this.payoutService.releaseBatch(id);
    return { success: true };
  }

  @Post('batches/:id/reprocess')
  @Roles('SUPER_ADMIN')
  async reprocessBatch(@Request() req: any, @Param('id') id: string) {
    return this.payoutService.reprocessBatch(id, req.shareholder.id);
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
