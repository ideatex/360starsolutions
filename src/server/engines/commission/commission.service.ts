import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { BusinessConfigService } from '@server/business-config/business-config.service';
import { ReferralTreeService } from '@server/engines/referral-tree/referral-tree.service';
import { Prisma, UserStatus, CommissionStatus } from '@prisma/client';

export interface GratitudeLevelDetail {
  level: number;
  rate: number;
  percentageString: string;
  ancestorId: string | null;
  ancestorShareholderId: string | null;
  ancestorName: string | null;
  unlockedLevel: number;
  isUnlocked: boolean;
  baseAmount: number;
  gratitudeAmount: number;
  status: 'ELIGIBLE' | 'LEVEL_LOCKED' | 'ACCOUNT_INACTIVE' | 'NO_UPLINE';
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  // Authoritative Product 360 default Gratitude Share percentages (L1-L12)
  public static readonly DEFAULT_GRATITUDE_RATES: Record<number, number> = {
    1: 0.01,    // 1.00%
    2: 0.005,   // 0.50%
    3: 0.005,   // 0.50%
    4: 0.0025,  // 0.25%
    5: 0.0025,  // 0.25%
    6: 0.0025,  // 0.25%
    7: 0.0015,  // 0.15%
    8: 0.0015,  // 0.15%
    9: 0.0015,  // 0.15%
    10: 0.001,  // 0.10%
    11: 0.001,  // 0.10%
    12: 0.001,  // 0.10%
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessConfigService: BusinessConfigService,
    private readonly referralTreeService: ReferralTreeService,
  ) {}

  /**
   * Retrieves configured Gratitude Share rates from BusinessConfiguration or falls back to Product 360 defaults.
   */
  async getGratitudeRates(): Promise<Record<number, number>> {
    try {
      const config = await this.businessConfigService.getLatest();
      if (config?.gratitudeShareConfig && typeof config.gratitudeShareConfig === 'object') {
        const ratesObj = config.gratitudeShareConfig as Record<string, number>;
        const rates: Record<number, number> = {};
        for (let l = 1; l <= 12; l++) {
          rates[l] = ratesObj[String(l)] !== undefined
            ? Number(ratesObj[String(l)])
            : CommissionService.DEFAULT_GRATITUDE_RATES[l] || 0;
        }
        return rates;
      }
    } catch {
      this.logger.warn('Could not load dynamic gratitude config, using Product 360 defaults.');
    }
    return { ...CommissionService.DEFAULT_GRATITUDE_RATES };
  }

  /**
   * Calculates and persists Gratitude Share (Referral Commissions) for an approved Contribution.
   * Walks up to 12 levels upstream.
   * Enforces dynamic level unlocking (1 direct -> L3, 2 -> L6, 3 -> L9, 4 -> L12 or override).
   */
  async calculateGratitudeShareForContribution(contributionId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: { shareholder: true },
    });

    if (!contribution) {
      throw new NotFoundException(`Contribution ${contributionId} not found`);
    }

    const contribAmount = Number(contribution.amount);
    if (contribAmount <= 0) return [];

    const rates = await this.getGratitudeRates();
    const ancestors = await this.referralTreeService.getUpstreamAncestors(contribution.shareholderId, 12);
    const createdLedgers: any[] = [];

    for (const item of ancestors) {
      const { level, shareholder: ancestor } = item;
      const rate = rates[level] || 0;

      if (rate <= 0) continue;

      // Check account validity
      if (ancestor.status === UserStatus.BLOCKED || ancestor.status === UserStatus.DELETED) {
        this.logger.debug(`Ancestor ${ancestor.id} at level ${level} is ${ancestor.status}, skipping Gratitude Share.`);
        continue;
      }

      // Check dynamic level unlock qualification (1->L3, 2->L6, 3->L9, 4->L12 or admin override)
      const unlockInfo = await this.referralTreeService.getUnlockedLevel(ancestor.id);
      if (unlockInfo.effectiveLevel < level) {
        this.logger.debug(
          `Ancestor ${ancestor.shareholderId} has unlocked up to level ${unlockInfo.effectiveLevel}, but downline is at level ${level}. Ineligible for Gratitude Share.`
        );
        continue;
      }

      // Check if commission already recorded for this ancestor and contribution
      const existing = await this.prisma.commissionLedger.findFirst({
        where: {
          shareholderId: ancestor.id,
          sourceShareholderId: contribution.shareholderId,
          level,
          calculationBase: contribution.amount,
        },
      });

      if (existing) {
        this.logger.debug(`Commission ledger already exists for ancestor ${ancestor.id} at level ${level}. Skipping.`);
        continue;
      }

      const gratitudeAmount = Math.round(contribAmount * rate * 100) / 100;

      if (gratitudeAmount > 0) {
        const ledger = await this.prisma.commissionLedger.create({
          data: {
            shareholderId: ancestor.id,
            sourceShareholderId: contribution.shareholderId,
            level,
            rate: new Prisma.Decimal(rate),
            amount: new Prisma.Decimal(gratitudeAmount),
            gratitudeShareRate: new Prisma.Decimal(rate),
            calculationBase: contribution.amount,
            status: CommissionStatus.PENDING,
          },
        });
        createdLedgers.push(ledger);
      }
    }

    this.logger.log(
      `Generated ${createdLedgers.length} Gratitude Share ledgers across upstream levels for contribution #${contribution.id}`
    );

    return createdLedgers;
  }

  /**
   * Preview Gratitude Share distribution across up to 12 levels for an investment or contribution amount
   */
  async previewGratitudeShare(contributorShareholderId: string, amount: number): Promise<GratitudeLevelDetail[]> {
    const rates = await this.getGratitudeRates();
    const ancestors = await this.referralTreeService.getUpstreamAncestors(contributorShareholderId, 12);
    const ancestorMap = new Map<number, any>();
    for (const a of ancestors) {
      ancestorMap.set(a.level, a.shareholder);
    }

    const previewList: GratitudeLevelDetail[] = [];

    for (let level = 1; level <= 12; level++) {
      const rate = rates[level] || 0;
      const ancestor = ancestorMap.get(level);

      if (!ancestor) {
        previewList.push({
          level,
          rate,
          percentageString: (rate * 100).toFixed(2) + '%',
          ancestorId: null,
          ancestorShareholderId: null,
          ancestorName: null,
          unlockedLevel: 0,
          isUnlocked: false,
          baseAmount: amount,
          gratitudeAmount: 0,
          status: 'NO_UPLINE',
        });
        continue;
      }

      if (ancestor.status === UserStatus.BLOCKED || ancestor.status === UserStatus.DELETED) {
        previewList.push({
          level,
          rate,
          percentageString: (rate * 100).toFixed(2) + '%',
          ancestorId: ancestor.id,
          ancestorShareholderId: ancestor.shareholderId,
          ancestorName: ancestor.name,
          unlockedLevel: 0,
          isUnlocked: false,
          baseAmount: amount,
          gratitudeAmount: 0,
          status: 'ACCOUNT_INACTIVE',
        });
        continue;
      }

      const unlockInfo = await this.referralTreeService.getUnlockedLevel(ancestor.id);
      const isUnlocked = unlockInfo.effectiveLevel >= level;
      const gratitudeAmount = isUnlocked ? Math.round(amount * rate * 100) / 100 : 0;

      previewList.push({
        level,
        rate,
        percentageString: (rate * 100).toFixed(2) + '%',
        ancestorId: ancestor.id,
        ancestorShareholderId: ancestor.shareholderId,
        ancestorName: ancestor.name,
        unlockedLevel: unlockInfo.effectiveLevel,
        isUnlocked,
        baseAmount: amount,
        gratitudeAmount,
        status: isUnlocked ? 'ELIGIBLE' : 'LEVEL_LOCKED',
      });
    }

    return previewList;
  }

  /**
   * Retrieves summary of Gratitude Share earnings for a shareholder, broken down by L1-L12
   */
  async getGratitudeSummary(shareholderId: string) {
    const rates = await this.getGratitudeRates();
    const ledgers = await this.prisma.commissionLedger.findMany({
      where: { shareholderId },
      include: {
        sourceShareholder: {
          select: { id: true, shareholderId: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const unlockInfo = await this.referralTreeService.getUnlockedLevel(shareholderId);

    const levelBreakdown: Record<number, { count: number; totalEarned: number; rate: number; isUnlocked: boolean }> = {};
    for (let l = 1; l <= 12; l++) {
      levelBreakdown[l] = {
        count: 0,
        totalEarned: 0,
        rate: rates[l] || 0,
        isUnlocked: unlockInfo.effectiveLevel >= l,
      };
    }

    let totalEarned = 0;
    let pendingEarned = 0;
    let paidEarned = 0;

    for (const ledger of ledgers) {
      const amt = Number(ledger.amount);
      totalEarned += amt;
      if (ledger.status === CommissionStatus.PAID) {
        paidEarned += amt;
      } else if (ledger.status === CommissionStatus.PENDING || ledger.status === CommissionStatus.CONFIRMED) {
        pendingEarned += amt;
      }

      if (levelBreakdown[ledger.level]) {
        levelBreakdown[ledger.level].count++;
        levelBreakdown[ledger.level].totalEarned += amt;
      }
    }

    return {
      shareholderId,
      unlockedLevel: unlockInfo.effectiveLevel,
      directReferralsCount: unlockInfo.directReferralsCount,
      isOverridden: unlockInfo.isOverridden,
      totalEarned,
      pendingEarned,
      paidEarned,
      levelBreakdown,
      recentTransactions: ledgers.slice(0, 20),
    };
  }

  /**
   * Backward compatibility hook for legacy investment creations
   */
  async calculateCommissionsForInvestment(investmentId: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
    });
    if (!investment) return;

    // Use dynamic rates and ancestors
    const rates = await this.getGratitudeRates();
    const ancestors = await this.referralTreeService.getUpstreamAncestors(investment.shareholderId, 12);

    for (const { level, shareholder: ancestor } of ancestors) {
      const rate = rates[level] || 0;
      if (rate <= 0) continue;

      const unlockInfo = await this.referralTreeService.getUnlockedLevel(ancestor.id);
      if (unlockInfo.effectiveLevel < level) continue;

      const amount = Math.round(Number(investment.amount) * rate * 100) / 100;
      if (amount > 0) {
        await this.prisma.commissionLedger.create({
          data: {
            shareholderId: ancestor.id,
            fromInvestmentId: investment.id,
            sourceShareholderId: investment.shareholderId,
            level,
            rate: new Prisma.Decimal(rate),
            amount: new Prisma.Decimal(amount),
            gratitudeShareRate: new Prisma.Decimal(rate),
            calculationBase: investment.amount,
            status: CommissionStatus.PENDING,
          },
        });
      }
    }
  }
}
