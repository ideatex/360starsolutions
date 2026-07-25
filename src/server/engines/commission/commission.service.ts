import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates and persists referral commissions immutably based on a new investment.
   */
  async calculateCommissionsForInvestment(investmentId: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: { shareholder: true }
    });

    if (!investment) {
      return;
    }

    // Fetch dynamic rates from active BusinessConfiguration
    const latestConfig = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });

    const maxLevels = (latestConfig?.referralLevelSettings as any)?.levels ?? 7;
    const rates: Record<string, number> = {};
    const levelWiseProfitSharing = (latestConfig?.levelWiseProfitSharing as any) || {};
    for (let l = 1; l <= maxLevels; l++) {
      rates[String(l)] = levelWiseProfitSharing[String(l)] !== undefined 
        ? Number(levelWiseProfitSharing[String(l)]) 
        : (l === 1 ? 0.05 : l === 2 ? 0.03 : l === 3 ? 0.02 : l === 4 ? 0.015 : l === 5 ? 0.01 : l === 6 ? 0.005 : 0.0025);
    }

    let currentParentId = investment.shareholder.parentId;
    let level = 1;

    while (currentParentId && level <= maxLevels) {
      const parentId = currentParentId;
      const rate = rates[String(level)] ?? 0;
      
      if (rate > 0) {
        const amount = Number(investment.amount) * rate;

        await this.prisma.commissionLedger.create({
          data: {
            shareholderId: parentId,
            fromInvestmentId: investment.id,
            level: level,
            rate: new Prisma.Decimal(rate),
            amount: amount,
            status: 'PENDING'
          }
        });

        this.logger.log(`Created dynamic commission ledger for shareholder ${parentId}, level ${level} at rate ${rate}`);
      }

      const ancestorRecord = await this.prisma.shareholder.findUnique({
        where: { id: parentId },
        select: { parentId: true }
      });
      currentParentId = ancestorRecord?.parentId || null;
      level++;
    }
  }
}
