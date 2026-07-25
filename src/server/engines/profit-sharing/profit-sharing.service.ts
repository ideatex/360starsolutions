import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { PayoutService } from '@server/engines/payout/payout.service';

@Injectable()
export class ProfitSharingService {
  private readonly logger = new Logger(ProfitSharingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutService: PayoutService,
  ) {}

  @Cron('0 0 14 * *')
  async handleCycleOne() {
    this.logger.log('Starting Profit Calculation for Cycle One (1st to 14th)');
    await this.calculateProfitsForCycle(1, 14);
  }

  @Cron('0 0 28-31 * *')
  async handleCycleTwo() {
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const today = new Date().getDate();
    
    if (today === lastDay) {
        this.logger.log(`Starting Profit Calculation for Cycle Two (15th to ${lastDay}th)`);
        await this.calculateProfitsForCycle(15, lastDay);
    }
  }

  async calculateProfitsForCycle(startDay: number, endDay: number) {
    const today = new Date();
    const cycleStart = new Date(today.getFullYear(), today.getMonth(), startDay);
    const cycleEnd = new Date(today.getFullYear(), today.getMonth(), endDay, 23, 59, 59);

    const activeInvestments = await this.prisma.investment.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: {
          lte: cycleEnd
        }
      }
    });

    for (const investment of activeInvestments) {
      const effectiveStart = investment.createdAt > cycleStart ? investment.createdAt : cycleStart;
      
      const diffTime = Math.abs(cycleEnd.getTime() - effectiveStart.getTime());
      const eligibleDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (eligibleDays > 0) {
        const profitAmount = (Number(investment.amount) * Number(investment.dailyProfitRate)) * eligibleDays;

        await this.prisma.profitLedger.create({
          data: {
            shareholderId: investment.shareholderId,
            investmentId: investment.id,
            cycleStart,
            cycleEnd,
            eligibleDays,
            amount: profitAmount
          }
        });
        
        this.logger.log(`Generated profit ledger entry for investment ${investment.id}`);
      }
    }

    // Automatically generate the payout batch which also runs dynamic MLM commissions calculation
    this.logger.log(`Generating Payout Batch for cycle ${cycleStart.toLocaleDateString()} to ${cycleEnd.toLocaleDateString()}`);
    await this.payoutService.generatePayoutBatch(cycleStart, cycleEnd);
    this.logger.log('Profit sharing cycle calculations and batch generation complete.');
  }
}
