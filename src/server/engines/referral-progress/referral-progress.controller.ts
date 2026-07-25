import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ReferralProgressService } from '@server/engines/referral-progress/referral-progress.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard } from '@server/auth/roles.guard';

@Controller('referral-progress')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralProgressController {
  constructor(private readonly referralProgressService: ReferralProgressService) {}

  @Get()
  async getReferralProgress(@Request() req: any) {
    return this.referralProgressService.getReferralProgress(req.shareholder.id);
  }
}
