import { Controller, Get, Post, Query, Param, UseGuards, Request } from '@nestjs/common';
import { RankService } from './rank.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('ranks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @Get('configurations')
  async getConfigurations() {
    return this.rankService.getRankConfigurations();
  }

  @Get('progress')
  async getProgress(@Request() req: any, @Query('shareholderId') shareholderId?: string) {
    let targetUser = shareholderId;
    if (req.shareholder.role === 'SHAREHOLDER') {
      targetUser = req.shareholder.id;
    }
    return this.rankService.evaluateUserRank(targetUser || req.shareholder.id);
  }

  @Get('history')
  async getHistory(@Request() req: any, @Query('shareholderId') shareholderId?: string) {
    let targetUser = shareholderId;
    if (req.shareholder.role === 'SHAREHOLDER') {
      targetUser = req.shareholder.id;
    }
    return this.rankService.getRankHistory(targetUser || req.shareholder.id);
  }

  @Post('recalculate-all')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async recalculateAll() {
    return this.rankService.reevaluateAllRanks();
  }
}
