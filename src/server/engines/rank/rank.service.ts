import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { NotificationService } from '@server/engines/notification/notification.service';
import { ContributionStatus, UserStatus, Prisma, Role } from '@prisma/client';

export interface DirectLegDetail {
  directChildId: string;
  directChildShareholderId: string;
  directChildName: string;
  legVolume: number;
  membersCount: number;
  percentageOfTotal: number;
}

export interface RankQualificationDetail {
  rankName: string;
  orderIndex: number;
  requiredVolume: number;
  maxStrongestLegAllowed: number;
  minOtherLegsRequired: number;
  actualStrongestLegVolume: number;
  actualOtherLegsVolume: number;
  qualified: boolean;
  shortfallStrongestLeg: number;
  shortfallOtherLegs: number;
  totalShortfall: number;
  progressPercentage: number;
}

export interface UserRankProgress {
  shareholderId: string;
  name: string;
  currentRank: string | null;
  totalTeamVolume: number;
  directLegsCount: number;
  legs: DirectLegDetail[];
  strongestLegVolume: number;
  otherLegsVolume: number;
  rankEvaluations: RankQualificationDetail[];
  nextRank: RankQualificationDetail | null;
}

@Injectable()
export class RankService {
  private readonly logger = new Logger(RankService.name);

  // Authoritative Product 360 default Ranks with 50/50 leg balance
  public static readonly DEFAULT_RANKS = [
    { name: 'Bronze', requiredVolume: 500000, orderIndex: 1 },
    { name: 'Silver', requiredVolume: 1500000, orderIndex: 2 },
    { name: 'Gold', requiredVolume: 5000000, orderIndex: 3 },
    { name: 'Diamond', requiredVolume: 15000000, orderIndex: 4 },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Initializes or fetches active RankConfiguration records
   */
  async getRankConfigurations() {
    const existing = await this.prisma.rankConfiguration.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });

    if (existing.length > 0) {
      return existing;
    }

    // Seed defaults if empty
    for (const r of RankService.DEFAULT_RANKS) {
      const half = r.requiredVolume * 0.50;
      await this.prisma.rankConfiguration.upsert({
        where: { name: r.name },
        create: {
          name: r.name,
          requiredVolume: new Prisma.Decimal(r.requiredVolume),
          maxStrongestLeg: new Prisma.Decimal(half),
          minOtherLegs: new Prisma.Decimal(half),
          orderIndex: r.orderIndex,
          isActive: true,
        },
        update: {},
      });
    }

    return this.prisma.rankConfiguration.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });
  }

  /**
   * Calculates the full subtree volume (all descendants + self) for a given shareholder.
   * Only APPROVED contributions from non-deleted accounts count toward team volume.
   */
  async calculateSubtreeVolume(rootShareholderId: string): Promise<{ totalVolume: number; membersCount: number }> {
    let currentLevel = [rootShareholderId];
    const visited = new Set<string>([rootShareholderId]);
    const allDescendantIds: string[] = [rootShareholderId];

    while (currentLevel.length > 0) {
      const children = await this.prisma.shareholder.findMany({
        where: {
          parentId: { in: currentLevel },
          status: { notIn: [UserStatus.DELETED] },
        },
        select: { id: true },
      });

      const nextLevel: string[] = [];
      for (const child of children) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          nextLevel.push(child.id);
          allDescendantIds.push(child.id);
        }
      }
      currentLevel = nextLevel;
    }

    // Aggregate contributions for all members in the subtree
    const aggregate = await this.prisma.contribution.aggregate({
      where: {
        shareholderId: { in: allDescendantIds },
        status: ContributionStatus.APPROVED,
      },
      _sum: { amount: true },
    });

    return {
      totalVolume: Number(aggregate._sum.amount || 0),
      membersCount: allDescendantIds.length,
    };
  }

  /**
   * Analyzes direct legs and computes 50/50 leg balance for a shareholder
   */
  async evaluateUserRank(shareholderId: string): Promise<UserRankProgress> {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: { id: true, shareholderId: true, name: true, currentRank: true },
    });

    if (!shareholder) {
      throw new NotFoundException(`Shareholder ${shareholderId} not found`);
    }

    // 1. Fetch direct children (the "legs")
    const directChildren = await this.prisma.shareholder.findMany({
      where: {
        parentId: shareholderId,
        status: { notIn: [UserStatus.DELETED] },
      },
      select: { id: true, shareholderId: true, name: true },
    });

    const legs: DirectLegDetail[] = [];
    let totalTeamVolume = 0;

    for (const child of directChildren) {
      const subtree = await this.calculateSubtreeVolume(child.id);
      legs.push({
        directChildId: child.id,
        directChildShareholderId: child.shareholderId,
        directChildName: child.name,
        legVolume: subtree.totalVolume,
        membersCount: subtree.membersCount,
        percentageOfTotal: 0,
      });
      totalTeamVolume += subtree.totalVolume;
    }

    // Calculate percentages
    for (const leg of legs) {
      leg.percentageOfTotal = totalTeamVolume > 0
        ? Math.round((leg.legVolume / totalTeamVolume) * 10000) / 100
        : 0;
    }

    // Sort legs descending by volume
    legs.sort((a, b) => b.legVolume - a.legVolume);

    const strongestLegVolume = legs.length > 0 ? legs[0].legVolume : 0;
    const otherLegsVolume = legs.slice(1).reduce((sum, leg) => sum + leg.legVolume, 0);

    // 2. Evaluate against Rank Configurations
    const rankConfigs = await this.getRankConfigurations();
    const rankEvaluations: RankQualificationDetail[] = [];
    let highestQualifiedRank: string | null = null;
    let nextRank: RankQualificationDetail | null = null;

    for (const config of rankConfigs) {
      const required = Number(config.requiredVolume);
      const maxStrongest = required * 0.50; // 50% max from strongest leg
      const minOther = required * 0.50;    // 50% min from remaining legs

      // 50/50 qualification rule
      // Strongest leg can contribute at most 50% of the requirement
      const effectiveStrongest = Math.min(strongestLegVolume, maxStrongest);
      // Other legs must provide the rest
      const isStrongestLegSatisfied = strongestLegVolume >= maxStrongest;
      const isOtherLegsSatisfied = otherLegsVolume >= minOther;
      const qualified = isStrongestLegSatisfied && isOtherLegsSatisfied;

      const shortfallStrongestLeg = Math.max(0, maxStrongest - strongestLegVolume);
      const shortfallOtherLegs = Math.max(0, minOther - otherLegsVolume);
      const totalShortfall = shortfallStrongestLeg + shortfallOtherLegs;

      // Progress: (effectiveStrongest + effectiveOther) / required
      const effectiveOther = Math.min(otherLegsVolume, minOther);
      const progressPercentage = Math.min(100, Math.round(((effectiveStrongest + effectiveOther) / required) * 10000) / 100);

      const evalDetail: RankQualificationDetail = {
        rankName: config.name,
        orderIndex: config.orderIndex,
        requiredVolume: required,
        maxStrongestLegAllowed: maxStrongest,
        minOtherLegsRequired: minOther,
        actualStrongestLegVolume: strongestLegVolume,
        actualOtherLegsVolume: otherLegsVolume,
        qualified,
        shortfallStrongestLeg,
        shortfallOtherLegs,
        totalShortfall,
        progressPercentage,
      };

      rankEvaluations.push(evalDetail);

      if (qualified) {
        highestQualifiedRank = config.name;
      } else if (!nextRank) {
        nextRank = evalDetail;
      }
    }

    // 3. If highest qualified rank is higher than currentRank, record promotion
    if (highestQualifiedRank && highestQualifiedRank !== shareholder.currentRank) {
      await this.promoteUserRank(shareholder.id, highestQualifiedRank, totalTeamVolume, strongestLegVolume, otherLegsVolume);
    }

    return {
      shareholderId: shareholder.id,
      name: shareholder.name,
      currentRank: highestQualifiedRank || shareholder.currentRank,
      totalTeamVolume,
      directLegsCount: legs.length,
      legs,
      strongestLegVolume,
      otherLegsVolume,
      rankEvaluations,
      nextRank,
    };
  }

  /**
   * Promotes a user to a new rank with audit and notification
   */
  private async promoteUserRank(
    shareholderId: string,
    newRank: string,
    teamVolume: number,
    strongestLeg: number,
    otherLegs: number,
  ) {
    const previous = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: { currentRank: true, shareholderId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.shareholder.update({
        where: { id: shareholderId },
        data: { currentRank: newRank },
      });

      await tx.userRankHistory.create({
        data: {
          shareholderId,
          rankName: newRank,
          teamVolume: new Prisma.Decimal(teamVolume),
          achievedAt: new Date(),
        },
      });
    });

    await this.auditService.logAction({
      shareholderId: 'SYSTEM',
      action: 'RANK_PROMOTION',
      entityType: 'Shareholder',
      entityId: shareholderId,
      oldValue: previous?.currentRank || 'None',
      newValue: newRank,
      reason: `Achieved ${newRank} with ₹${teamVolume.toLocaleString('en-IN')} Team Volume (50/50 Leg Balance verified). Strongest: ₹${strongestLeg.toLocaleString('en-IN')}, Other: ₹${otherLegs.toLocaleString('en-IN')}`,
    });

    await this.notificationService.createNotification({
      shareholderId,
      title: `Congratulations! Rank Promoted to ${newRank}`,
      message: `You have successfully achieved ${newRank} Rank with ₹${teamVolume.toLocaleString('en-IN')} Team Volume under Product 360 Leg Balancing rules!`,
      type: 'SYSTEM',
      priority: 'HIGH',
    });

    this.logger.log(`Promoted user ${previous?.shareholderId} to rank: ${newRank}`);
  }

  /**
   * Evaluates and updates ranks across all active shareholders
   */
  async reevaluateAllRanks() {
    const shareholders = await this.prisma.shareholder.findMany({
      where: { status: { notIn: [UserStatus.DELETED] } },
      select: { id: true, shareholderId: true },
    });

    this.logger.log(`Starting organization-wide Rank evaluation for ${shareholders.length} accounts...`);
    const results: any[] = [];

    for (const sh of shareholders) {
      try {
        const evalResult = await this.evaluateUserRank(sh.id);
        results.push({
          shareholderId: sh.shareholderId,
          rank: evalResult.currentRank,
          teamVolume: evalResult.totalTeamVolume,
        });
      } catch (err: any) {
        this.logger.error(`Error evaluating rank for ${sh.shareholderId}: ${err.message}`);
      }
    }

    return {
      evaluatedCount: results.length,
      results,
    };
  }

  /**
   * Updates Rank Configurations (Allows Super Admin to rename ranks and configure volumes)
   */
  async updateRankConfigurations(
    configs: Array<{ id?: string; name: string; requiredVolume: number; orderIndex?: number }>,
    adminId: string,
  ) {
    const updatedList: any[] = [];

    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      const required = Number(cfg.requiredVolume);
      const half = required * 0.50;
      const order = cfg.orderIndex ?? (i + 1);

      if (cfg.id) {
        const updated = await this.prisma.rankConfiguration.update({
          where: { id: cfg.id },
          data: {
            name: cfg.name.trim(),
            requiredVolume: new Prisma.Decimal(required),
            maxStrongestLeg: new Prisma.Decimal(half),
            minOtherLegs: new Prisma.Decimal(half),
            orderIndex: order,
          },
        });
        updatedList.push(updated);
      } else {
        const upserted = await this.prisma.rankConfiguration.upsert({
          where: { name: cfg.name.trim() },
          create: {
            name: cfg.name.trim(),
            requiredVolume: new Prisma.Decimal(required),
            maxStrongestLeg: new Prisma.Decimal(half),
            minOtherLegs: new Prisma.Decimal(half),
            orderIndex: order,
            isActive: true,
          },
          update: {
            requiredVolume: new Prisma.Decimal(required),
            maxStrongestLeg: new Prisma.Decimal(half),
            minOtherLegs: new Prisma.Decimal(half),
            orderIndex: order,
          },
        });
        updatedList.push(upserted);
      }
    }

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'UPDATE_RANK_CONFIGURATIONS',
      entityType: 'RankConfiguration',
      newValue: JSON.stringify(configs),
    });

    return updatedList;
  }

  /**
   * Lists all Shareholders with Current Business Volume, Required Volume, Current Rank, and Eligibility Status
   */
  async getMembersRankStatus(search?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = {
      status: { notIn: [UserStatus.DELETED] },
      role: Role.SHAREHOLDER,
    };

    if (search) {
      where.OR = [
        { shareholderId: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [shareholders, total] = await Promise.all([
      this.prisma.shareholder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, shareholderId: true, name: true, currentRank: true, phone: true },
      }),
      this.prisma.shareholder.count({ where }),
    ]);

    const rankConfigs = await this.getRankConfigurations();

    const members: any[] = [];
    for (const sh of shareholders) {
      try {
        const evalResult = await this.evaluateUserRank(sh.id);
        const nextRankReq = evalResult.nextRank ? evalResult.nextRank.requiredVolume : (rankConfigs[0]?.requiredVolume ? Number(rankConfigs[0].requiredVolume) : 500000);
        const nextRankName = evalResult.nextRank ? evalResult.nextRank.rankName : (rankConfigs[0]?.name || 'Bronze');
        
        // Determine rank eligibility/status
        let eligibilityStatus = 'In Progress';
        if (evalResult.nextRank) {
          if (evalResult.nextRank.qualified) {
            eligibilityStatus = `Qualified for ${evalResult.nextRank.rankName}`;
          } else {
            eligibilityStatus = `${evalResult.nextRank.progressPercentage}% to ${evalResult.nextRank.rankName}`;
          }
        } else if (evalResult.currentRank) {
          eligibilityStatus = `Achieved ${evalResult.currentRank}`;
        }

        members.push({
          id: sh.id,
          shareholderId: sh.shareholderId,
          name: sh.name || sh.shareholderId,
          phone: sh.phone || 'N/A',
          currentRank: sh.currentRank || 'Unranked',
          currentBusinessVolume: evalResult.totalTeamVolume,
          totalTeamVolume: evalResult.totalTeamVolume,
          strongestLegVolume: evalResult.strongestLegVolume,
          otherLegsVolume: evalResult.otherLegsVolume,
          requiredVolume: nextRankReq,
          volumeRequiredForNext: Math.max(0, nextRankReq - evalResult.totalTeamVolume),
          nextRankName,
          eligibilityStatus,
          eligibleForNextRank: evalResult.nextRank ? evalResult.nextRank.qualified : false,
          rankEvaluations: evalResult.rankEvaluations,
        });
      } catch (err: any) {
        members.push({
          id: sh.id,
          shareholderId: sh.shareholderId,
          name: sh.name || sh.shareholderId,
          phone: sh.phone || 'N/A',
          currentRank: sh.currentRank || 'Unranked',
          currentBusinessVolume: 0,
          totalTeamVolume: 0,
          strongestLegVolume: 0,
          otherLegsVolume: 0,
          requiredVolume: 500000,
          volumeRequiredForNext: 500000,
          nextRankName: 'Bronze',
          eligibilityStatus: 'Pending Calculation',
          eligibleForNextRank: false,
          rankEvaluations: [],
        });
      }
    }

    return {
      data: members,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      rankConfigurations: rankConfigs,
    };
  }

  /**
   * Super Admin: Manually Allot Rank to a Shareholder
   */
  async manuallyAllotRank(dto: { shareholderId: string; rankName: string; remarks?: string; adminId: string }) {
    const { shareholderId, rankName, remarks, adminId } = dto;

    const shareholder = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { id: shareholderId },
          { shareholderId: shareholderId },
          { shareholderId: shareholderId.toUpperCase() },
        ],
      },
      select: { id: true, shareholderId: true, name: true, currentRank: true },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    // Calculate current business volume at allocation time
    const subtree = await this.calculateSubtreeVolume(shareholder.id);
    const previousRank = shareholder.currentRank || 'Unranked';

    await this.prisma.$transaction(async (tx) => {
      await tx.shareholder.update({
        where: { id: shareholder.id },
        data: { currentRank: rankName },
      });

      await tx.userRankHistory.create({
        data: {
          shareholderId: shareholder.id,
          rankName,
          teamVolume: new Prisma.Decimal(subtree.totalVolume),
          achievedAt: new Date(),
        },
      });
    });

    // Record Audit Log
    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'MANUAL_RANK_ALLOTMENT',
      entityType: 'Shareholder',
      entityId: shareholder.id,
      oldValue: previousRank,
      newValue: rankName,
      reason: remarks || `Manually allotted ${rankName} rank by Super Admin. Team volume: ₹${subtree.totalVolume.toLocaleString('en-IN')}`,
    });

    // Send Notification to Shareholder
    await this.notificationService.createNotification({
      shareholderId: shareholder.id,
      title: `Congratulations! You have achieved ${rankName} Rank`,
      message: `Congratulations! You have achieved/been allotted the ${rankName} rank.`,
      type: 'SYSTEM',
      priority: 'HIGH',
    });

    return {
      success: true,
      message: `Rank "${rankName}" successfully allotted to ${shareholder.shareholderId}.`,
      shareholder: {
        id: shareholder.id,
        shareholderId: shareholder.shareholderId,
        previousRank,
        newRank: rankName,
        teamVolume: subtree.totalVolume,
      },
    };
  }

  /**
   * Retrieves rank history for a shareholder
   */
  async getRankHistory(shareholderId: string) {
    return this.prisma.userRankHistory.findMany({
      where: { shareholderId },
      orderBy: { achievedAt: 'desc' },
    });
  }
}
