import { Controller, Get, Post, Param, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ContributionService } from './contribution.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';
import { ContributionStatus } from '@prisma/client';

@Controller('contributions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body() body: {
      shareholderId: string;
      amount: number;
      mode?: string;
      date?: string;
      paymentProofUrl?: string;
      paymentProofFile?: string;
      issuedAgreement?: boolean;
      issuedCheque?: boolean;
      validityMonths?: number;
    },
  ) {
    if (req.shareholder.role === 'SHAREHOLDER' && body.shareholderId !== req.shareholder.id) {
      throw new ForbiddenException('You cannot create contributions for another shareholder');
    }
    return this.contributionService.createContribution(
      {
        shareholderId: body.shareholderId,
        amount: body.amount,
        mode: body.mode,
        date: body.date ? new Date(body.date) : new Date(),
        paymentProofUrl: body.paymentProofUrl,
        paymentProofFile: body.paymentProofFile,
        issuedAgreement: body.issuedAgreement,
        issuedCheque: body.issuedCheque,
        validityMonths: body.validityMonths,
      },
      req.shareholder.id,
    );
  }

  @Get()
  async list(
    @Request() req: any,
    @Query('shareholderId') shareholderId?: string,
    @Query('status') status?: ContributionStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    let targetUser = shareholderId;
    if (req.shareholder.role === 'SHAREHOLDER') {
      targetUser = req.shareholder.id;
    }
    return this.contributionService.getContributions(targetUser, status, Number(page), Number(limit));
  }

  @Get('summary')
  async summary(@Request() req: any, @Query('shareholderId') shareholderId?: string) {
    let targetUser = shareholderId;
    if (req.shareholder.role === 'SHAREHOLDER') {
      targetUser = req.shareholder.id;
    }
    return this.contributionService.getSummary(targetUser || req.shareholder.id);
  }

  @Get(':id')
  async getById(@Request() req: any, @Param('id') id: string) {
    const contribution = await this.contributionService.getContributionById(id);
    if (req.shareholder.role === 'SHAREHOLDER' && contribution.shareholderId !== req.shareholder.id) {
      throw new ForbiddenException('You cannot view contributions for another shareholder');
    }
    return contribution;
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async approve(@Request() req: any, @Param('id') id: string) {
    return this.contributionService.approveContribution(id, req.shareholder.id);
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async reject(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.contributionService.rejectContribution(id, req.shareholder.id, body.reason);
  }
}
