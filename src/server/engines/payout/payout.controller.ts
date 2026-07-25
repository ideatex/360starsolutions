import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
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
}
