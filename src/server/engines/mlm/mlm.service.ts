import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { ProfitSharingType, CalculationStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class MlmService implements OnModuleInit {
  private readonly logger = new Logger(MlmService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.levelConfiguration.count();
    if (count === 0) {
      const defaults = [
        { levelNumber: 1, volumeThreshold: 10000, profitType: 'PERCENT' as const, profitValue: 0.05 },
        { levelNumber: 2, volumeThreshold: 25000, profitType: 'PERCENT' as const, profitValue: 0.03 },
        { levelNumber: 3, volumeThreshold: 50000, profitType: 'PERCENT' as const, profitValue: 0.02 },
        { levelNumber: 4, volumeThreshold: 100000, profitType: 'PERCENT' as const, profitValue: 0.015 },
        { levelNumber: 5, volumeThreshold: 200000, profitType: 'PERCENT' as const, profitValue: 0.01 },
        { levelNumber: 6, volumeThreshold: 500000, profitType: 'PERCENT' as const, profitValue: 0.005 },
        { levelNumber: 7, volumeThreshold: 1000000, profitType: 'PERCENT' as const, profitValue: 0.0025 },
      ];

      for (const def of defaults) {
        await this.prisma.levelConfiguration.create({
          data: {
            levelNumber: def.levelNumber,
            volumeThreshold: new Prisma.Decimal(def.volumeThreshold),
            profitType: def.profitType,
            profitValue: new Prisma.Decimal(def.profitValue),
            isActive: true,
          },
        });
      }
      this.logger.log('Seeded 7 default LevelConfigurations');
    }
  }

  // 1. Get Level Configurations
  async getLevelConfigs() {
    return this.prisma.levelConfiguration.findMany({
      orderBy: { levelNumber: 'asc' },
    });
  }

  // 2. Create Level Configuration
  async createLevelConfig(dto: {
    levelNumber: number;
    volumeThreshold: number;
    profitType: ProfitSharingType;
    profitValue: number;
    isActive?: boolean;
  }) {
    const config = await this.prisma.levelConfiguration.upsert({
      where: { levelNumber: dto.levelNumber },
      create: {
        levelNumber: dto.levelNumber,
        volumeThreshold: new Prisma.Decimal(dto.volumeThreshold),
        profitType: dto.profitType,
        profitValue: new Prisma.Decimal(dto.profitValue),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      update: {
        volumeThreshold: new Prisma.Decimal(dto.volumeThreshold),
        profitType: dto.profitType,
        profitValue: new Prisma.Decimal(dto.profitValue),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    // Sync to BusinessConfiguration
    const latestBC = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });
    if (latestBC) {
      const levelOpeningVolume = (latestBC.levelOpeningVolume as any) || {};
      levelOpeningVolume[String(dto.levelNumber)] = Number(dto.volumeThreshold);

      const levelWiseProfitSharing = (latestBC.levelWiseProfitSharing as any) || {};
      levelWiseProfitSharing[String(dto.levelNumber)] = Number(dto.profitValue);

      const referralLevelSettings = (latestBC.referralLevelSettings as any) || {};
      const activeMap = referralLevelSettings.active || {};
      activeMap[String(dto.levelNumber)] = dto.isActive !== false;
      referralLevelSettings.active = activeMap;
      referralLevelSettings.levels = Math.max(referralLevelSettings.levels || 7, dto.levelNumber);

      await this.prisma.businessConfiguration.update({
        where: { id: latestBC.id },
        data: {
          levelOpeningVolume,
          levelWiseProfitSharing,
          referralLevelSettings,
        },
      });
    }

    return config;
  }

  // 3. Update Level Configuration
  async updateLevelConfig(
    id: string,
    dto: {
      volumeThreshold?: number;
      profitType?: ProfitSharingType;
      profitValue?: number;
      isActive?: boolean;
    },
  ) {
    const config = await this.prisma.levelConfiguration.findUnique({ where: { id } });
    if (!config) {
      throw new NotFoundException('Level Configuration not found');
    }

    const data: any = {};
    if (dto.volumeThreshold !== undefined) data.volumeThreshold = new Prisma.Decimal(dto.volumeThreshold);
    if (dto.profitType !== undefined) data.profitType = dto.profitType;
    if (dto.profitValue !== undefined) data.profitValue = new Prisma.Decimal(dto.profitValue);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.levelConfiguration.update({
      where: { id },
      data,
    });

    // Sync to BusinessConfiguration
    const latestBC = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });
    if (latestBC) {
      const levelOpeningVolume = (latestBC.levelOpeningVolume as any) || {};
      if (dto.volumeThreshold !== undefined) {
        levelOpeningVolume[String(updated.levelNumber)] = Number(dto.volumeThreshold);
      }

      const levelWiseProfitSharing = (latestBC.levelWiseProfitSharing as any) || {};
      if (dto.profitValue !== undefined) {
        levelWiseProfitSharing[String(updated.levelNumber)] = Number(dto.profitValue);
      }

      const referralLevelSettings = (latestBC.referralLevelSettings as any) || {};
      const activeMap = referralLevelSettings.active || {};
      if (dto.isActive !== undefined) {
        activeMap[String(updated.levelNumber)] = dto.isActive;
      }
      referralLevelSettings.active = activeMap;

      await this.prisma.businessConfiguration.update({
        where: { id: latestBC.id },
        data: {
          levelOpeningVolume,
          levelWiseProfitSharing,
          referralLevelSettings,
        },
      });
    }

    return updated;
  }

  // 4. Toggle Level Activation Status
  async toggleLevelActive(id: string) {
    const config = await this.prisma.levelConfiguration.findUnique({ where: { id } });
    if (!config) {
      throw new NotFoundException('Level Configuration not found');
    }
    const nextActive = !config.isActive;
    
    const updated = await this.prisma.levelConfiguration.update({
      where: { id },
      data: { isActive: nextActive },
    });

    // Sync to BusinessConfiguration
    const latestBC = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });
    if (latestBC) {
      const referralLevelSettings = (latestBC.referralLevelSettings as any) || {};
      const activeMap = referralLevelSettings.active || {};
      activeMap[String(updated.levelNumber)] = nextActive;
      referralLevelSettings.active = activeMap;

      await this.prisma.businessConfiguration.update({
        where: { id: latestBC.id },
        data: { referralLevelSettings },
      });
    }

    return updated;
  }

  // 5. Fetch Business Volume
  async getBusinessVolumes(shareholderId: string) {
    return this.prisma.businessVolume.findMany({
      where: { shareholderId },
      orderBy: { level: 'asc' },
    });
  }

  // 6. Fetch calculations
  async getCalculations(shareholderId?: string) {
    const where: any = {};
    if (shareholderId) where.shareholderId = shareholderId;
    return this.prisma.profitCalculation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // 7. Recalculate Business Volume for an ancestor at a specific level depth
  async recalculateBusinessVolume(ancestorId: string, levelDepth: number) {
    const ancestor = await this.prisma.shareholder.findUnique({ where: { id: ancestorId } });
    if (!ancestor) return 0;

    let currentParentIds = [ancestorId];
    let currentDepth = 1;
    let levelDescendants: any[] = [];

    while (currentParentIds.length > 0 && currentDepth <= levelDepth) {
      const children = await this.prisma.shareholder.findMany({
        where: { parentId: { in: currentParentIds } }
      });
      
      if (children.length === 0) break;
      
      if (currentDepth === levelDepth) {
        levelDescendants = children;
      }
      
      currentParentIds = children.map(c => c.id);
      currentDepth++;
    }

    if (levelDescendants.length === 0) {
      await this.prisma.businessVolume.upsert({
        where: { shareholderId_level: { shareholderId: ancestorId, level: levelDepth } },
        create: { shareholderId: ancestorId, level: levelDepth, totalVolume: 0 },
        update: { totalVolume: 0 },
      });
      return 0;
    }

    // Sum all approved contributions
    const contributionSum = await this.prisma.contribution.aggregate({
      where: {
        shareholderId: { in: levelDescendants.map((d) => d.id) },
        status: 'APPROVED',
      },
      _sum: { amount: true },
    });

    const totalVolume = Number(contributionSum._sum.amount || 0);

    // Upsert Business Volume
    await this.prisma.businessVolume.upsert({
      where: { shareholderId_level: { shareholderId: ancestorId, level: levelDepth } },
      create: { shareholderId: ancestorId, level: levelDepth, totalVolume },
      update: { totalVolume },
    });

    return totalVolume;
  }

  // 8. Main handler to recalculate tree and compute profit calculations
  async processContributionMlm(contributionId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: { shareholder: true },
    });

    if (!contribution || contribution.status !== 'APPROVED') {
      return;
    }

    this.logger.log(`Processing MLM thresholds for contribution ${contributionId} by shareholder ${contribution.shareholderId}`);

    // Fetch latest active BusinessConfiguration to know max levels
    const latestConfig = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });
    const maxLevels = (latestConfig?.referralLevelSettings as any)?.levels ?? 7;

    let currentParentId = contribution.shareholder.parentId;
    let depthDiff = 1;

    // Walk up the hierarchy chain dynamically
    while (currentParentId && depthDiff <= maxLevels) {
      const ancestorId = currentParentId;

      // Recalculate Business Volume at this level depth
      const totalVolume = await this.recalculateBusinessVolume(ancestorId, depthDiff);

      if (latestConfig) {
        const activeMap = (latestConfig.referralLevelSettings as any)?.active || {};
        const isActive = activeMap[String(depthDiff)] !== false;

        const thresholds = (latestConfig.levelOpeningVolume as any) || {};
        const volumeThreshold = thresholds[String(depthDiff)] !== undefined 
          ? Number(thresholds[String(depthDiff)]) 
          : 0;

        const percentages = (latestConfig.levelWiseProfitSharing as any) || {};
        const profitValue = percentages[String(depthDiff)] !== undefined 
          ? Number(percentages[String(depthDiff)]) 
          : 0;

        let previousLevelsQualified = true;
        const systemDefaults = (latestConfig.systemDefaults as any) || {};
        const isSequential = systemDefaults.sequentialLevelQualification !== false;

        if (isSequential) {
          for (let prevL = 1; prevL < depthDiff; prevL++) {
            const prevThreshold = thresholds[String(prevL)] ?? 0;
            const prevVolume = await this.recalculateBusinessVolume(ancestorId, prevL);
            if (prevVolume < prevThreshold) {
              previousLevelsQualified = false;
              break;
            }
          }
        }

        if (isActive && previousLevelsQualified && totalVolume >= volumeThreshold) {
          const profitAmount = totalVolume * profitValue;

          // Store result in ProfitCalculation table matching 9.4 spec
          await this.prisma.profitCalculation.create({
            data: {
              shareholderId: ancestorId,
              level: depthDiff,
              volume: totalVolume,
              profitAmount: profitAmount,
              status: 'PENDING',
            },
          });

          this.logger.log(
            `Level ${depthDiff} Active for shareholder ${ancestorId}: Profit sharing generated: $${profitAmount}`,
          );
        }
      }

      // Move up to the next parent
      const ancestorRecord = await this.prisma.shareholder.findUnique({
        where: { id: ancestorId },
        select: { parentId: true }
      });
      currentParentId = ancestorRecord?.parentId || null;
      depthDiff++;
    }
  }
}
