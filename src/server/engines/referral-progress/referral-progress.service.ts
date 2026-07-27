import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';

@Injectable()
export class ReferralProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async getReferralProgress(shareholderId: string) {
    const startTime = Date.now();
    const searchId = (shareholderId || '').trim();
    // 1. Ensure shareholder exists
    const shareholder = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { id: searchId },
          { shareholderId: searchId },
          { shareholderId: searchId.toUpperCase() },
        ],
      },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    const actualId = shareholder.id;

    // 2. Read from BusinessConfiguration
    const config = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });

    if (!config) {
       throw new NotFoundException('Business configuration not found');
    }

    const maxReferralLevels = (config.referralLevelSettings as any)?.levels ?? 7;
    const levelOpeningVolumes = (config.levelOpeningVolume as any) || {};
    const levelPercentages = (config.levelWiseProfitSharing as any) || {};

    // 3. Dynamic BFS calculation in-memory
    const levelVolumes: { [level: number]: number } = {};
    for (let l = 1; l <= maxReferralLevels; l++) {
      levelVolumes[l] = 0;
    }

    // Own approved contributions (Personal Investment)
    const ownContributions = await this.prisma.contribution.aggregate({
      where: { shareholderId: actualId, status: 'APPROVED' },
      _sum: { amount: true },
    });
    const ownVolume = Number(ownContributions._sum.amount || 0);

    // Downline levels: Level 1 = Direct Referrals, Level 2 = Level 1 Downline, etc.
    let currentParentIds = [actualId];
    let currentDepth = 1;

    while (currentParentIds.length > 0 && currentDepth <= maxReferralLevels) {
      const children = await this.prisma.shareholder.findMany({
        where: {
          parentId: { in: currentParentIds },
        },
        include: {
          contributions: {
            where: { status: 'APPROVED' },
            select: { amount: true }
          },
        },
      });

      if (children.length === 0) break;

      children.forEach((child) => {
        const sum = child.contributions.reduce((acc, c) => acc + Number(c.amount), 0);
        levelVolumes[currentDepth] += sum;
      });

      currentParentIds = children.map((c) => c.id);
      currentDepth++;
    }

    // 4. Determine progress and sequential locking
    let previousUnlocked = true;
    let totalQualifiedLevels = 0;
    let overallBusinessVolume = ownVolume;
    let currentActiveLevel = 0;
    let nextUnlockTarget = 1;

    const progress = [];

    for (let level = 1; level <= maxReferralLevels; level++) {
      const currentVolume = levelVolumes[level] || 0;
      const requiredVolume = Number(levelOpeningVolumes[String(level)] || 0);
      const profitPercentage = Number(levelPercentages[String(level)] || 0) * 100;
      const remainingVolume = Math.max(0, requiredVolume - currentVolume);
      
      overallBusinessVolume += currentVolume;

      let status = 'LOCKED';

      if (previousUnlocked && currentVolume >= requiredVolume) {
        status = 'UNLOCKED';
        totalQualifiedLevels++;
        currentActiveLevel = level;
      } else if (previousUnlocked && currentVolume < requiredVolume) {
        status = 'IN PROGRESS';
        nextUnlockTarget = level;
        previousUnlocked = false;
      } else {
        status = 'LOCKED';
        previousUnlocked = false;
      }

      if (level === maxReferralLevels && status === 'UNLOCKED') {
        nextUnlockTarget = maxReferralLevels;
      }

      progress.push({
        level,
        levelName: `Level ${level}`,
        requiredVolume,
        currentVolume,
        remainingVolume,
        profitPercentage,
        status,
      });
    }

    let remainingVolumeToNextLevel = 0;
    if (nextUnlockTarget <= maxReferralLevels && progress[nextUnlockTarget - 1].status === 'IN PROGRESS') {
        remainingVolumeToNextLevel = progress[nextUnlockTarget - 1].remainingVolume;
    }

    const overallProgressPercentage = (totalQualifiedLevels / maxReferralLevels) * 100;

    const processingTimeMs = Date.now() - startTime;

    await this.auditService.logAction({
      shareholderId,
      action: 'VIEW_REFERRAL_PROGRESS',
      entityType: 'ReferralProgress',
      entityId: shareholderId,
      newValue: JSON.stringify({
        configVersion: config.version,
        processingTimeMs,
        overallBusinessVolume,
        totalQualifiedLevels
      })
    });

    return {
      summary: {
        totalQualifiedLevels,
        currentActiveLevel,
        currentActiveLevelName: currentActiveLevel > 0 ? `Level ${currentActiveLevel}` : 'None',
        overallBusinessVolume,
        overallProgressPercentage: Number(overallProgressPercentage.toFixed(2)),
        nextUnlockTarget,
        nextUnlockTargetName: nextUnlockTarget > 0 ? `Level ${nextUnlockTarget}` : 'Level 1',
        remainingVolumeToNextLevel,
        ownVolume,
      },
      progress,
      configurationVersion: config.version,
    };
  }
}
