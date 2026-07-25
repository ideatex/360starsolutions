import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { MlmService } from '@server/engines/mlm/mlm.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MlmController {
  constructor(private readonly mlmService: MlmService) {}

  @Get(['mlm/levels', 'admin/mlm-levels'])
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getLevels() {
    const configs = await this.mlmService.getLevelConfigs();
    return configs.map(c => ({
      ...c,
      level: c.levelNumber,
      commissionRate: c.profitValue,
    }));
  }

  @Post('mlm/levels')
  @Roles('SUPER_ADMIN')
  async createLevel(@Body() body: any) {
    return this.mlmService.createLevelConfig(body);
  }

  @Put(['mlm/levels/:id', 'admin/mlm-levels/:id'])
  @Roles('SUPER_ADMIN')
  async updateLevel(@Param('id') id: string, @Body() body: any) {
    const mappedBody = {
      ...body,
      profitValue: body.commissionRate !== undefined ? Number(body.commissionRate) : body.profitValue,
    };
    const result = await this.mlmService.updateLevelConfig(id, mappedBody);
    return {
      ...result,
      level: result.levelNumber,
      commissionRate: result.profitValue,
    };
  }

  @Patch('mlm/levels/:id/toggle')
  @Roles('SUPER_ADMIN')
  async toggleLevel(@Param('id') id: string) {
    return this.mlmService.toggleLevelActive(id);
  }

  @Get('mlm/calculations')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getCalculations() {
    return this.mlmService.getCalculations();
  }

  @Get('mlm/my-volumes')
  async getMyVolumes(@Request() req: any) {
    const [volumes, calculations] = await Promise.all([
      this.mlmService.getBusinessVolumes(req.shareholder.id),
      this.mlmService.getCalculations(req.shareholder.id),
    ]);
    return { volumes, calculations };
  }
}
