import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ProfitSharingService } from './profit-sharing.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('profit-sharing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfitSharingController {
  constructor(private readonly profitSharingService: ProfitSharingService) {}

  @Get('current-cycle')
  getCurrentCycle() {
    return this.profitSharingService.getCycleBoundariesForDate(new Date());
  }

  @Get('preview')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async preview(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      const cycle = this.profitSharingService.getCycleBoundariesForDate(new Date());
      start = cycle.cycleStart;
      end = cycle.cycleEnd;
    }

    return this.profitSharingService.previewProfits(start, end);
  }

  @Post('calculate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async calculate(@Body() body: { startDate?: string; endDate?: string }) {
    let start: Date;
    let end: Date;

    if (body.startDate && body.endDate) {
      start = new Date(body.startDate);
      end = new Date(body.endDate);
    } else {
      const cycle = this.profitSharingService.getCycleBoundariesForDate(new Date());
      start = cycle.cycleStart;
      end = cycle.cycleEnd;
    }

    return this.profitSharingService.calculateAndPersistProfits(start, end);
  }
}
