import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { ReferralTreeService } from '@server/engines/referral-tree/referral-tree.service';
import { CommissionService } from '@server/engines/commission/commission.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class ReferralProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly referralTreeService: ReferralTreeService,
  ) {}

  async getReferralProgress(shareholderId: string) {
    const searchId = (shareholderId || '').trim();
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
    const maxReferralLevels = 12;

    // Get dynamic level unlock status
    const unlockInfo = await this.referralTreeService.getUnlockedLevel(actualId);
    const effectiveUnlockedLevel = unlockInfo.effectiveLevel;

    // Gratitude rates for L1-L12
    const rates = CommissionService.DEFAULT_GRATITUDE_RATES;

    // Calculate level volumes across downline up to 12 levels
    const levelVolumes: Record<number, number> = {};
    const levelMembersCount: Record<number, number> = {};
    for (let l = 1; l <= maxReferralLevels; l++) {
      levelVolumes[l] = 0;
      levelMembersCount[l] = 0;
    }

    let currentParentIds = [actualId];
    let currentDepth = 1;

    while (currentParentIds.length > 0 && currentDepth <= maxReferralLevels) {
      const children = await this.prisma.shareholder.findMany({
        where: {
          parentId: { in: currentParentIds },
          status: { notIn: [UserStatus.DELETED] },
        },
        include: {
          contributions: {
            where: { status: 'APPROVED' },
            select: { amount: true },
          },
        },
      });

      if (children.length === 0) break;

      children.forEach((child) => {
        const sum = child.contributions.reduce((acc, c) => acc + Number(c.amount), 0);
        levelVolumes[currentDepth] += sum;
        levelMembersCount[currentDepth]++;
      });

      currentParentIds = children.map((c) => c.id);
      currentDepth++;
    }

    // Own approved contributions
    const ownContributions = await this.prisma.contribution.aggregate({
      where: { shareholderId: actualId, status: 'APPROVED' },
      _sum: { amount: true },
    });
    const ownVolume = Number(ownContributions._sum.amount || 0);

    let overallBusinessVolume = ownVolume;
    const progress = [];

    for (let level = 1; level <= maxReferralLevels; level++) {
      const currentVolume = levelVolumes[level] || 0;
      overallBusinessVolume += currentVolume;
      const rate = rates[level] || 0;
      const profitPercentage = rate * 100;
      const isUnlocked = level <= effectiveUnlockedLevel;

      // Determine direct referrals requirement for this tier
      let requiredDirects = 1;
      if (level > 9) requiredDirects = 4;
      else if (level > 6) requiredDirects = 3;
      else if (level > 3) requiredDirects = 2;

      progress.push({
        level,
        levelName: `Level ${level}`,
        rate,
        profitPercentage,
        currentVolume,
        membersCount: levelMembersCount[level] || 0,
        requiredDirects,
        status: isUnlocked ? 'UNLOCKED' : 'LOCKED',
      });
    }

    // Next unlock target calculation
    let nextUnlockTarget = 0;
    let nextTargetLevelRange = '';
    let additionalDirectsNeeded = 0;

    if (effectiveUnlockedLevel < 3) {
      nextUnlockTarget = 3;
      nextTargetLevelRange = 'Levels 1 to 3';
      additionalDirectsNeeded = Math.max(0, 1 - unlockInfo.directReferralsCount);
    } else if (effectiveUnlockedLevel < 6) {
      nextUnlockTarget = 6;
      nextTargetLevelRange = 'Levels 4 to 6';
      additionalDirectsNeeded = Math.max(0, 2 - unlockInfo.directReferralsCount);
    } else if (effectiveUnlockedLevel < 9) {
      nextUnlockTarget = 9;
      nextTargetLevelRange = 'Levels 7 to 9';
      additionalDirectsNeeded = Math.max(0, 3 - unlockInfo.directReferralsCount);
    } else if (effectiveUnlockedLevel < 12) {
      nextUnlockTarget = 12;
      nextTargetLevelRange = 'Levels 10 to 12';
      additionalDirectsNeeded = Math.max(0, 4 - unlockInfo.directReferralsCount);
    }

    const overallProgressPercentage = Math.round((effectiveUnlockedLevel / maxReferralLevels) * 10000) / 100;

    await this.auditService.logAction({
      shareholderId,
      action: 'VIEW_REFERRAL_PROGRESS',
      entityType: 'ReferralProgress',
      entityId: shareholderId,
      newValue: `EffectiveUnlocked: ${effectiveUnlockedLevel}, Directs: ${unlockInfo.directReferralsCount}, TotalVolume: ₹${overallBusinessVolume}`,
    });

    return {
      summary: {
        totalQualifiedLevels: effectiveUnlockedLevel,
        currentActiveLevel: effectiveUnlockedLevel,
        currentActiveLevelName: `Unlocked up to Level ${effectiveUnlockedLevel}`,
        overallBusinessVolume,
        overallProgressPercentage,
        directReferralsCount: unlockInfo.directReferralsCount,
        isOverridden: unlockInfo.isOverridden,
        nextUnlockTarget,
        nextTargetLevelRange,
        additionalDirectsNeeded,
        ownVolume,
      },
      progress,
      configurationVersion: 1,
    };
  }
}
