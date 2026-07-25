import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { InvestmentsService } from '@server/investments/investments.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';
import { InvestmentStatus } from '@prisma/client';

@Controller('investments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  async create(@Request() req: any, @Body() body: { shareholderId: string; amount: number; startDate?: string }) {
    // If standard shareholder, they can only create investment for themselves
    if (req.shareholder.role === 'SHAREHOLDER' && body.shareholderId !== req.shareholder.id) {
      throw new ForbiddenException('You cannot create investments for another shareholder');
    }
    return this.investmentsService.createInvestment(body.shareholderId, body.amount, body.startDate);
  }

  @Get()
  async getList(
    @Request() req: any,
    @Query('shareholderId') shareholderId?: string,
    @Query('status') status?: InvestmentStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    // Standard shareholder can only fetch their own list
    let targetUser = shareholderId;
    if (req.shareholder.role === 'SHAREHOLDER') {
      targetUser = req.shareholder.id;
    }
    return this.investmentsService.getInvestments(targetUser, status, Number(page), Number(limit));
  }

  @Get(':id')
  async getDetails(@Request() req: any, @Param('id') id: string) {
    const investment = await this.investmentsService.getInvestmentDetails(id);
    if (req.shareholder.role === 'SHAREHOLDER' && investment.shareholderId !== req.shareholder.id) {
      throw new ForbiddenException('Access denied');
    }
    return investment;
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { startDate?: string; status?: InvestmentStatus; dailyProfitRate?: number },
  ) {
    return this.investmentsService.updateInvestment(id, body, req.shareholder.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.investmentsService.deleteInvestment(id, req.shareholder.id);
  }
}
