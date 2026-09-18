import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { Prisma } from '@prisma/client';

export const DEFAULT_GRATITUDE_SHARE_RATES: Record<number, number> = {
  1: 0.01,    // 1.00%
  2: 0.005,   // 0.50%
  3: 0.005,   // 0.50%
  4: 0.0025,  // 0.25%
  5: 0.0025,  // 0.25%
  6: 0.005,   // 0.50%
  7: 0.0025,  // 0.25%
  8: 0.0025,  // 0.25%
  9: 0.005,   // 0.50%
  10: 0.0025, // 0.25%
  11: 0.0025, // 0.25%
  12: 0.005,  // 0.50%
};

export const DEFAULT_DYNAMIC_LEVEL_UNLOCKS: Record<number, number> = {
  1: 3,   // 1 direct -> through L3
  2: 6,   // 2 directs -> through L6
  3: 9,   // 3 directs -> through L9
  4: 12,  // 4 directs -> through L12
};

export const DEFAULT_RANKS = [
  { name: 'Bronze', requiredVolume: 2500000, maxStrongestLeg: 1250000, minOtherLegs: 1250000, orderIndex: 1 },
  { name: 'Silver', requiredVolume: 5000000, maxStrongestLeg: 2500000, minOtherLegs: 2500000, orderIndex: 2 },
  { name: 'Gold', requiredVolume: 10000000, maxStrongestLeg: 5000000, minOtherLegs: 5000000, orderIndex: 3 },
  { name: 'Diamond', requiredVolume: 50000000, maxStrongestLeg: 25000000, minOtherLegs: 25000000, orderIndex: 4 },
];

export const DEFAULT_LEVEL_OPENING_VOLUMES: Record<number, number> = {
  1: 10000,
  2: 25000,
  3: 50000,
  4: 100000,
  5: 200000,
  6: 500000,
  7: 1000000,
  8: 2000000,
  9: 3000000,
  10: 5000000,
  11: 7500000,
  12: 10000000,
};

export const DEFAULT_LEVEL_WISE_PROFIT_SHARING: Record<number, number> = {
  1: 0.05,
  2: 0.03,
  3: 0.02,
  4: 0.015,
  5: 0.01,
  6: 0.005,
  7: 0.0025,
  8: 0.0025,
  9: 0.0025,
  10: 0.0025,
  11: 0.0025,
  12: 0.0025,
};

export const DEFAULT_REFERRAL_ACTIVE_MAP: Record<number, boolean> = {
  1: true, 2: true, 3: true, 4: true, 5: true, 6: true,
  7: true, 8: true, 9: true, 10: true, 11: true, 12: true,
};

export const DEFAULT_REFERRAL_DESCRIPTIONS: Record<number, string> = {
  1: 'Direct Referral',
  2: 'Referral of Level 1',
  3: 'Referral of Level 2',
  4: 'Referral of Level 3',
  5: 'Referral of Level 4',
  6: 'Referral of Level 5',
  7: 'Referral of Level 6',
  8: 'Referral of Level 7',
  9: 'Referral of Level 8',
  10: 'Referral of Level 9',
  11: 'Referral of Level 10',
  12: 'Referral of Level 11',
};

@Injectable()
export class BusinessConfigService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    try {
      // Seed or update RankConfiguration
      const rankCount = await this.prisma.rankConfiguration.count();
      if (rankCount === 0) {
        for (const rank of DEFAULT_RANKS) {
          await this.prisma.rankConfiguration.create({
            data: {
              name: rank.name,
              requiredVolume: new Prisma.Decimal(rank.requiredVolume),
              maxStrongestLeg: new Prisma.Decimal(rank.maxStrongestLeg),
              minOtherLegs: new Prisma.Decimal(rank.minOtherLegs),
              orderIndex: rank.orderIndex,
              isActive: true,
            },
          });
        }
        console.log('Seeded 4 default RankConfigurations (Bronze, Silver, Gold, Diamond)');
      }
    } catch (err: any) {
      console.warn(`RankConfiguration seeding skipped: ${err.message}`);
    }

    try {
      // Seed or ensure latest BusinessConfiguration has 12 levels and Product 360 values
      const latestConfig = await this.prisma.businessConfiguration.findFirst({
        orderBy: { version: 'desc' },
      });

      if (!latestConfig) {
        await this.prisma.businessConfiguration.create({
          data: {
            version: 1,
            userIdPrefix: 'SH',
            userIdStartingNumber: 100001,
            userIdNextNumber: 100001,
            userIdLength: 6,
            profitSharingPercentage: new Prisma.Decimal('0.0500'), // 5% monthly
            gratitudeShareConfig: DEFAULT_GRATITUDE_SHARE_RATES,
            levelUnlockConfig: DEFAULT_DYNAMIC_LEVEL_UNLOCKS,
            rankConfig: DEFAULT_RANKS,
            levelOpeningVolume: DEFAULT_LEVEL_OPENING_VOLUMES,
            levelWiseProfitSharing: DEFAULT_LEVEL_WISE_PROFIT_SHARING,
            referralLevelSettings: {
              levels: 12,
              active: DEFAULT_REFERRAL_ACTIVE_MAP,
              descriptions: DEFAULT_REFERRAL_DESCRIPTIONS,
            },
            payoutConfig: {
              cycle1: { startDay: 5, cutoffDay: 19, payoutDay: 21 },
              cycle2: { startDay: 20, cutoffDay: 4, payoutDay: 6 },
            },
            prorationConfig: {
              status: 'PENDING_CLIENT_CONFIRMATION',
              basis: 'CALENDAR_DAYS',
            },
            systemDefaults: {
              minContribution: 100000,
              contributionMultiple: 100000,
              zeroContributionWithholding: 0.20,
              zeroContributionActivationThreshold: 100000,
              monthlyProfitRate: 0.05,
              sequentialLevelQualification: true,
            },
            createdById: 'system',
          },
        });
        console.log('Seeded initial Product 360 BusinessConfiguration with 12 fixed levels (version 1)');
      } else {
        const existingRefSettings = (latestConfig.referralLevelSettings as any) || {};
        const currentLevels = existingRefSettings.levels || 0;
        if (currentLevels < 12) {
          const mergedOpening = { ...DEFAULT_LEVEL_OPENING_VOLUMES, ...((latestConfig.levelOpeningVolume as any) || {}) };
          const mergedSharing = { ...DEFAULT_LEVEL_WISE_PROFIT_SHARING, ...((latestConfig.levelWiseProfitSharing as any) || {}) };
          const mergedActive = { ...DEFAULT_REFERRAL_ACTIVE_MAP, ...(existingRefSettings.active || {}) };
          const mergedDescs = { ...DEFAULT_REFERRAL_DESCRIPTIONS, ...(existingRefSettings.descriptions || {}) };

          await this.prisma.businessConfiguration.update({
            where: { id: latestConfig.id },
            data: {
              levelOpeningVolume: mergedOpening,
              levelWiseProfitSharing: mergedSharing,
              referralLevelSettings: {
                levels: 12,
                active: mergedActive,
                descriptions: mergedDescs,
              },
            },
          });
          console.log(`Updated BusinessConfiguration v${latestConfig.version} to 12 fixed referral levels.`);
        }
      }
    } catch (err: any) {
      console.warn(`BusinessConfiguration seeding skipped: ${err.message}`);
    }
  }

  async getLatest() {
    const config = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });
    if (!config) {
      throw new BadRequestException('No configuration found');
    }
    return config;
  }

  async getGratitudeShareRates(): Promise<Record<number, number>> {
    const config = await this.getLatest();
    const stored = (config.gratitudeShareConfig as Record<string, number>) || {};
    const rates: Record<number, number> = {};
    for (let l = 1; l <= 12; l++) {
      rates[l] = stored[String(l)] !== undefined ? Number(stored[String(l)]) : (DEFAULT_GRATITUDE_SHARE_RATES[l] ?? 0.0025);
    }
    return rates;
  }

  async getLevelUnlockRules(): Promise<Record<number, number>> {
    const config = await this.getLatest();
    const stored = (config.levelUnlockConfig as Record<string, number>) || {};
    const rules: Record<number, number> = {};
    for (let d = 1; d <= 4; d++) {
      rules[d] = stored[String(d)] !== undefined ? Number(stored[String(d)]) : (DEFAULT_DYNAMIC_LEVEL_UNLOCKS[d] ?? (d * 3));
    }
    return rules;
  }

  async getProfitShareRate(): Promise<number> {
    const config = await this.getLatest();
    return config.profitSharingPercentage ? Number(config.profitSharingPercentage) : 0.05;
  }

  async getVersionHistory() {
    return this.prisma.businessConfiguration.findMany({
      orderBy: { version: 'desc' },
    });
  }

  async createNewVersion(data: any, adminId: string) {
    const latest = await this.getLatest();
    const nextVersion = latest.version + 1;

    const nextNum = data.resetCounter ? 1 : latest.userIdNextNumber;

    const newConfig = await this.prisma.businessConfiguration.create({
      data: {
        version: nextVersion,
        userIdPrefix: data.userIdPrefix ?? latest.userIdPrefix,
        userIdStartingNumber: data.userIdStartingNumber ?? latest.userIdStartingNumber,
        userIdNextNumber: nextNum,
        userIdLength: data.userIdLength ?? latest.userIdLength,
        profitSharingPercentage: data.profitSharingPercentage 
          ? new Prisma.Decimal(data.profitSharingPercentage) 
          : latest.profitSharingPercentage,
        gratitudeShareConfig: data.gratitudeShareConfig ?? latest.gratitudeShareConfig ?? DEFAULT_GRATITUDE_SHARE_RATES,
        levelUnlockConfig: data.levelUnlockConfig ?? latest.levelUnlockConfig ?? DEFAULT_DYNAMIC_LEVEL_UNLOCKS,
        rankConfig: data.rankConfig ?? latest.rankConfig ?? DEFAULT_RANKS,
        payoutConfig: data.payoutConfig ?? latest.payoutConfig ?? {
          cycle1: { startDay: 5, cutoffDay: 19, payoutDay: 21 },
          cycle2: { startDay: 20, cutoffDay: 4, payoutDay: 6 },
        },
        prorationConfig: data.prorationConfig ?? latest.prorationConfig ?? {
          status: 'PENDING_CLIENT_CONFIRMATION',
          basis: 'CALENDAR_DAYS',
        },
        systemDefaults: data.systemDefaults ?? latest.systemDefaults ?? {
          minContribution: 100000,
          contributionMultiple: 100000,
          zeroContributionWithholding: 0.20,
          zeroContributionActivationThreshold: 100000,
          monthlyProfitRate: 0.05,
        },
        futureBusinessParameters: data.futureBusinessParameters ?? latest.futureBusinessParameters ?? Prisma.JsonNull,
        createdById: adminId,
      },
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'UPDATE_BUSINESS_CONFIG',
      entityType: 'BusinessConfiguration',
      entityId: newConfig.id,
      oldValue: JSON.stringify(latest),
      newValue: JSON.stringify(newConfig),
    });

    return newConfig;
  }

  async generateNextUserId(): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.businessConfiguration.findFirst({
        orderBy: { version: 'desc' },
      });
      if (!latest) {
        throw new BadRequestException('Business configuration not initialized');
      }
      const currentNum = latest.userIdNextNumber;
      const prefix = latest.userIdPrefix;
      const length = latest.userIdLength;
      
      const customId = `${prefix}${String(currentNum).padStart(length, '0')}`;

      await tx.businessConfiguration.update({
        where: { id: latest.id },
        data: { userIdNextNumber: currentNum + 1 },
      });

      return customId;
    });
  }

  async previewNextUserId(): Promise<string> {
    const latest = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });
    if (!latest) {
      throw new BadRequestException('Business configuration not initialized');
    }
    const currentNum = latest.userIdNextNumber;
    const prefix = latest.userIdPrefix;
    const length = latest.userIdLength;
    
    return `${prefix}${String(currentNum).padStart(length, '0')}`;
  }
}
