import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
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

  @Put('configurations')
  @Roles('SUPER_ADMIN')
  async updateConfigurations(@Request() req: any, @Body() body: any) {
    const list = body?.configs || body?.configurations || (Array.isArray(body) ? body : []);
    return this.rankService.updateRankConfigurations(list, req.shareholder.id);
  }

  @Get('members-status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getMembersRankStatus(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.rankService.getMembersRankStatus(search, Number(page), Number(limit));
  }

  @Post('manual-allot')
  @Roles('SUPER_ADMIN')
  async manuallyAllotRank(
    @Request() req: any,
    @Body() body: { shareholderId: string; rankName: string; remarks?: string },
  ) {
    return this.rankService.manuallyAllotRank({
      shareholderId: body.shareholderId,
      rankName: body.rankName,
      remarks: body.remarks,
      adminId: req.shareholder.id,
    });
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

