import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { BusinessConfigService } from '@server/business-config/business-config.service';

export interface UnlockedLevelResult {
  effectiveLevel: number;
  systemLevel: number;
  overrideLevel: number | null;
  isOverridden: boolean;
  directReferralsCount: number;
  overrideDetails?: {
    reason: string;
    remark?: string | null;
    createdAt: Date;
    createdById: string;
  } | null;
}

@Injectable()
export class ReferralTreeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly businessConfigService: BusinessConfigService,
  ) {}

  /**
   * Adds or reassigns a shareholder in the tree under a specific parent.
   * Prevents self-referral, circular references, and invalid parent references.
   */
  async assignParent(shareholderId: string, parentId: string, adminId?: string) {
    if (shareholderId === parentId) {
      throw new BadRequestException('Self-referral is not allowed.');
    }

    const parent = await this.prisma.shareholder.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true, shareholderId: true, status: true }
    });

    if (!parent) {
      throw new BadRequestException('Parent referrer not found.');
    }

    if (parent.status === 'DELETED') {
      throw new BadRequestException('Cannot assign parent under a deleted account.');
    }

    // Check for circular dependency dynamically
    let currentParentId: string | null = parent.parentId;
    const visited = new Set<string>([parentId]);

    while (currentParentId) {
      if (currentParentId === shareholderId) {
        throw new BadRequestException('Circular referral relationship detected. Assignment rejected.');
      }
      if (visited.has(currentParentId)) {
        throw new BadRequestException('Existing circular loop in referral tree detected.');
      }
      visited.add(currentParentId);

      const ancestor = await this.prisma.shareholder.findUnique({
        where: { id: currentParentId },
        select: { parentId: true }
      });
      currentParentId = ancestor?.parentId || null;
    }

    const previousUser = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: { parentId: true }
    });

    const updated = await this.prisma.shareholder.update({
      where: { id: shareholderId },
      data: { parentId }
    });

    // Enforce relationship record in ReferralRelationship table
    await this.prisma.referralRelationship.upsert({
      where: { childId: shareholderId },
      create: {
        parentId,
        childId: shareholderId,
        referralDate: new Date(),
        status: 'ACTIVE'
      },
      update: {
        parentId,
        status: 'ACTIVE'
      }
    });

    if (adminId) {
      await this.auditService.logAction({
        shareholderId: adminId,
        action: 'ASSIGN_REFERRAL_PARENT',
        entityType: 'Shareholder',
        entityId: shareholderId,
        oldValue: previousUser?.parentId || 'None',
        newValue: parentId,
        reason: 'Referral tree hierarchy assignment/reassignment',
      });
    }

    return updated;
  }

  /**
   * Retrieves the direct children of a shareholder.
   */
  async getChildren(shareholderId: string) {
    return this.prisma.shareholder.findMany({
      where: {
        parentId: shareholderId,
        status: { notIn: ['DELETED'] },
      },
      select: {
        id: true,
        shareholderId: true,
        name: true,
        role: true,
        status: true,
        accountType: true,
        referralCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Counts valid direct referrals for an account.
   */
  async getDirectReferralsCount(shareholderId: string): Promise<number> {
    return this.prisma.shareholder.count({
      where: {
        parentId: shareholderId,
        status: { notIn: ['DELETED', 'PENDING_APPROVAL'] },
      },
    });
  }

  /**
   * Evaluates dynamic level unlock for an account according to Product 360:
   * 1 direct -> L3
   * 2 directs -> L6
   * 3 directs -> L9
   * 4+ directs -> L12
   * Also integrates Account-Level Unlock Override with full audit transparency.
   */
  async getUnlockedLevel(shareholderId: string): Promise<UnlockedLevelResult> {
    const user = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: {
        id: true,
        unlockedLevelOverride: true,
        status: true,
        accountType: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Shareholder not found');
    }

    // Accounts in PENDING_APPROVAL or CLOSED_EXPIRED have 0 unlock level
    if (user.status === 'PENDING_APPROVAL' || user.status === 'CLOSED_EXPIRED') {
      return {
        effectiveLevel: 0,
        systemLevel: 0,
        overrideLevel: null,
        isOverridden: false,
        directReferralsCount: 0,
      };
    }

    const directsCount = await this.getDirectReferralsCount(shareholderId);
    const unlockRules = await this.businessConfigService.getLevelUnlockRules();

    let systemLevel = 0;
    if (directsCount >= 4) {
      systemLevel = unlockRules[4] ?? 12;
    } else if (directsCount === 3) {
      systemLevel = unlockRules[3] ?? 9;
    } else if (directsCount === 2) {
      systemLevel = unlockRules[2] ?? 6;
    } else if (directsCount === 1) {
      systemLevel = unlockRules[1] ?? 3;
    }

    const overrideLevel = user.unlockedLevelOverride ?? null;
    const isOverridden = overrideLevel !== null;
    const effectiveLevel = isOverridden ? overrideLevel : systemLevel;

    let overrideDetails: any = null;
    if (isOverridden) {
      const latestOverride = await this.prisma.accountUnlockOverride.findFirst({
        where: { shareholderId },
        orderBy: { createdAt: 'desc' },
      });
      if (latestOverride) {
        overrideDetails = {
          reason: latestOverride.reason,
          remark: latestOverride.remark,
          createdAt: latestOverride.createdAt,
          createdById: latestOverride.createdById,
        };
      }
    }

    return {
      effectiveLevel,
      systemLevel,
      overrideLevel,
      isOverridden,
      directReferralsCount: directsCount,
      overrideDetails,
    };
  }

  /**
   * Sets or clears an account-level unlock override.
   * Every override must store account, previous level, new level, reason, remark, createdBy.
   */
  async setAccountLevelOverride(
    shareholderId: string,
    newLevel: number | null,
    reason: string,
    remark: string | null,
    adminId: string
  ) {
    const user = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: { id: true, unlockedLevelOverride: true, shareholderId: true },
    });

    if (!user) {
      throw new NotFoundException('Shareholder not found');
    }

    if (newLevel !== null && (newLevel < 1 || newLevel > 12)) {
      throw new BadRequestException('Override level must be between 1 and 12');
    }

    const previousLevel = user.unlockedLevelOverride ?? 0;

    // Update shareholder override field
    await this.prisma.shareholder.update({
      where: { id: shareholderId },
      data: { unlockedLevelOverride: newLevel },
    });

    // Record audit trail in AccountUnlockOverride
    if (newLevel !== null) {
      await this.prisma.accountUnlockOverride.create({
        data: {
          shareholderId,
          previousLevel,
          newLevel,
          reason,
          remark,
          createdById: adminId,
        },
      });
    }

    await this.auditService.logAction({
      shareholderId: adminId,
      action: newLevel !== null ? 'SET_LEVEL_OVERRIDE' : 'CLEAR_LEVEL_OVERRIDE',
      entityType: 'Shareholder',
      entityId: shareholderId,
      oldValue: String(previousLevel),
      newValue: String(newLevel),
      reason,
    });

    return this.getUnlockedLevel(shareholderId);
  }

  /**
   * Retrieves the full downline of a shareholder up to 12 levels dynamically.
   */
  async getFullDownline(shareholderId: string, maxDepth = 12) {
    const searchId = (shareholderId || '').trim();
    let rootId = searchId;
    const rootUser = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { id: searchId },
          { shareholderId: searchId },
          { shareholderId: searchId.toUpperCase() },
        ],
      },
      select: { id: true },
    });
    if (rootUser) {
      rootId = rootUser.id;
    }

    const downline: any[] = [];
    let currentLevelIds = [rootId];
    let currentDepth = 1;

    while (currentLevelIds.length > 0 && currentDepth <= maxDepth) {
      const children = await this.prisma.shareholder.findMany({
        where: {
          parentId: { in: currentLevelIds },
          status: { notIn: ['DELETED'] },
        },
        select: {
          id: true,
          shareholderId: true,
          name: true,
          parentId: true,
          role: true,
          status: true,
          accountType: true,
          currentRank: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (children.length === 0) break;

      children.forEach((child) => {
        (child as any).relativeDepth = currentDepth;
        downline.push(child);
      });

      currentLevelIds = children.map((c) => c.id);
      currentDepth++;
    }

    return downline;
  }

  /**
   * Walks up the hierarchy chain dynamically from an account up to maxLevels (default 12).
   * Used by Gratitude Share Engine to identify all upstream beneficiaries with their exact level distance.
   */
  async getUpstreamAncestors(shareholderId: string, maxLevels = 12) {
    const ancestors: Array<{ level: number; shareholder: any }> = [];
    const visited = new Set<string>([shareholderId]);

    const user = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: { parentId: true },
    });

    let currentParentId = user?.parentId;
    let level = 1;

    while (currentParentId && level <= maxLevels) {
      if (visited.has(currentParentId)) break;
      visited.add(currentParentId);

      const parent = await this.prisma.shareholder.findUnique({
        where: { id: currentParentId },
        select: {
          id: true,
          shareholderId: true,
          name: true,
          status: true,
          accountType: true,
          holdingBalance: true,
          unlockedLevelOverride: true,
          parentId: true,
        },
      });

      if (!parent) break;

      ancestors.push({
        level,
        shareholder: parent,
      });

      currentParentId = parent.parentId;
      level++;
    }

    return ancestors;
  }
}
