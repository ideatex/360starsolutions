import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('gratitude-share')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get('rates')
  async getRates() {
    return this.commissionService.getGratitudeRates();
  }

  @Get('summary')
  async getSummary(@Request() req: any, @Query('shareholderId') shareholderId?: string) {
    let targetUser = shareholderId;
    if (req.shareholder.role === 'SHAREHOLDER') {
      targetUser = req.shareholder.id;
    }
    return this.commissionService.getGratitudeSummary(targetUser || req.shareholder.id);
  }

  @Get('preview')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async preview(
    @Query('contributorId') contributorId: string,
    @Query('amount') amount: string,
  ) {
    return this.commissionService.previewGratitudeShare(contributorId, Number(amount) || 100000);
  }
}
