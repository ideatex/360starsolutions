import { Controller, Get, Param, Patch, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { InvestorsService } from '@server/engines/investors/investors.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller('investors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvestorsController {
  constructor(private readonly investorsService: InvestorsService) {}

  private checkAccess(req: any, targetUserId: string) {
    const isSelf = targetUserId === req.shareholder.id;
    const isAdmin = req.shareholder.role === 'SUPER_ADMIN' || req.shareholder.role === 'ADMIN';
    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }
  }

  @Patch('contributions/:id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async approveContribution(@Param('id') id: string) {
    return this.investorsService.approveContribution(id);
  }

  @Patch('contributions/:id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async rejectContribution(@Param('id') id: string) {
    return this.investorsService.rejectContribution(id);
  }

  @Get(':shareholderId/profile')
  async getProfile(@Param('shareholderId') shareholderId: string, @Request() req: any) {
    const targetId = shareholderId === 'me' ? req.shareholder.id : shareholderId;
    this.checkAccess(req, targetId);
    return this.investorsService.getInvestorProfile(targetId);
  }

  @Get(':shareholderId/tree')
  async getInvestorTree(@Param('shareholderId') shareholderId: string, @Request() req: any) {
    const targetId = shareholderId === 'me' ? req.shareholder.id : shareholderId;
    this.checkAccess(req, targetId);
    return this.investorsService.getInvestorTree(targetId);
  }

  @Get(':shareholderId/business-volume')
  async getBusinessVolume(@Param('shareholderId') shareholderId: string, @Request() req: any) {
    const targetId = shareholderId === 'me' ? req.shareholder.id : shareholderId;
    this.checkAccess(req, targetId);
    return this.investorsService.getBusinessVolume(targetId);
  }

  @Get(':shareholderId/level-eligibility')
  async getLevelEligibility(@Param('shareholderId') shareholderId: string, @Request() req: any) {
    const targetId = shareholderId === 'me' ? req.shareholder.id : shareholderId;
    this.checkAccess(req, targetId);
    return this.investorsService.getLevelEligibility(targetId);
  }

  @Get(':shareholderId/referral-volume')
  async getReferralVolume(@Param('shareholderId') shareholderId: string, @Request() req: any) {
    const targetId = shareholderId === 'me' ? req.shareholder.id : shareholderId;
    this.checkAccess(req, targetId);
    return this.investorsService.getReferralVolume(targetId);
  }

  @Get(':shareholderId/investor-profit-summary')
  async getInvestorProfitSummary(@Param('shareholderId') shareholderId: string, @Request() req: any) {
    const targetId = shareholderId === 'me' ? req.shareholder.id : shareholderId;
    this.checkAccess(req, targetId);
    return this.investorsService.getInvestorProfitSummary(targetId);
  }

  @Get(':shareholderId/referral-profit-summary')
  async getReferralProfitSummary(@Param('shareholderId') shareholderId: string, @Request() req: any) {
    const targetId = shareholderId === 'me' ? req.shareholder.id : shareholderId;
    this.checkAccess(req, targetId);
    return this.investorsService.getReferralProfitSummary(targetId);
  }

  @Get(':shareholderId/level-wise-profit-sharing')
  async getLevelWiseProfitSharing(@Param('shareholderId') shareholderId: string, @Request() req: any) {
    const targetId = shareholderId === 'me' ? req.shareholder.id : shareholderId;
    this.checkAccess(req, targetId);
    return this.investorsService.getLevelWiseProfitSharing(targetId);
  }
}
