import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { PayoutService } from '@server/engines/payout/payout.service';
import { BusinessConfigService } from '@server/business-config/business-config.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProfitSharingService {
  private readonly logger = new Logger(ProfitSharingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutService: PayoutService,
    private readonly businessConfigService: BusinessConfigService,
  ) {}

  @Cron('0 0 * * *')
  async handleDailyCycleCheck() {
    const today = new Date();
    const currentDay = today.getDate();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    let config;
    try {
      config = await this.businessConfigService.getLatest();
    } catch (e) {
      this.logger.warn('Business config not initialized yet. Skipping cycle check.');
      return;
    }

    let cycleDates: any[] = [15, 'LAST_DAY'];
    if (config?.systemDefaults && (config.systemDefaults as any).payout_cycle_dates) {
      cycleDates = (config.systemDefaults as any).payout_cycle_dates;
    }

    const numCycles = cycleDates.length || 2;
    const profitSharingPct = config.profitSharingPercentage ? Number(config.profitSharingPercentage) : 0.10;

    let isCycleEnd = false;
    let cycleStartDay = 1;

    for (let i = 0; i < cycleDates.length; i++) {
      let dateVal = cycleDates[i];
      if (dateVal === 'LAST_DAY') dateVal = lastDayOfMonth;
      
      if (currentDay === dateVal) {
        isCycleEnd = true;
        
        let prevDateVal = i === 0 ? cycleDates[cycleDates.length - 1] : cycleDates[i - 1];
        if (prevDateVal === 'LAST_DAY') {
            cycleStartDay = 1; 
        } else {
            cycleStartDay = prevDateVal + 1;
        }
        break;
      }
    }

    if (!isCycleEnd) {
      return; 
    }

    this.logger.log(`Starting Profit Calculation for Cycle End: ${currentDay}`);
    
    let cycleStart: Date;
    if (cycleStartDay === 1 && currentDay !== 1) {
        cycleStart = new Date(today.getFullYear(), today.getMonth(), cycleStartDay);
    } else if (cycleStartDay > currentDay) {
        cycleStart = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
        cycleStart = new Date(today.getFullYear(), today.getMonth(), cycleStartDay);
    }
    
    const cycleEnd = new Date(today.getFullYear(), today.getMonth(), currentDay, 23, 59, 59);

    await this.calculateProfitsForCycle(cycleStart, cycleEnd, profitSharingPct, numCycles);
  }

  async calculateProfitsForCycle(cycleStart: Date, cycleEnd: Date, profitSharingPct: number, numCycles: number) {
    const contributions = await this.prisma.contribution.findMany({
      where: {
        status: 'APPROVED',
        date: {
          lte: cycleEnd
        }
      },
      include: {
        shareholder: {
           include: { investments: { where: { status: 'ACTIVE' } } }
        }
      }
    });

    for (const contribution of contributions) {
      const contribDate = new Date(contribution.date);
      const expiryDate = new Date(contribDate);
      expiryDate.setMonth(expiryDate.getMonth() + contribution.validityMonths);

      if (cycleStart > expiryDate) {
        continue;
      }

      const isFirstCycle = contribDate >= cycleStart && contribDate <= cycleEnd;

      const monthlyProfit = Number(contribution.amount) * profitSharingPct;
      const dailyProfit = monthlyProfit / 30; // 30 day fixed basis
      let profitAmount = 0;
      let eligibleDays = 0;

      if (isFirstCycle) {
        const timeDiffMs = cycleEnd.getTime() - contribDate.getTime();
        eligibleDays = Math.max(0, Math.floor(timeDiffMs / (1000 * 60 * 60 * 24)));
        
        if (eligibleDays > 0) {
            profitAmount = eligibleDays * dailyProfit;
        }
      } else {
        profitAmount = monthlyProfit / numCycles;
      }

      if (profitAmount > 0) {
        await this.prisma.profitLedger.create({
          data: {
            shareholderId: contribution.shareholderId,
            investmentId: contribution.shareholder.investments?.[0]?.id || null,
            cycleStart: isFirstCycle ? contribDate : cycleStart,
            cycleEnd,
            eligibleDays: isFirstCycle ? eligibleDays : Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / (1000*60*60*24)),
            amount: new Prisma.Decimal(profitAmount),
            status: 'PENDING', 
          }
        });
      }
    }

    this.logger.log(`Generating Payout Batch for cycle ${cycleStart.toLocaleDateString()} to ${cycleEnd.toLocaleDateString()}`);
    await this.payoutService.generatePayoutBatch(cycleStart, cycleEnd);
    this.logger.log('Profit sharing cycle calculations and batch generation complete.');
  }
}
