import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { Prisma, InvestorStatus, ContributionStatus } from '@prisma/client';
import { MlmService } from '@server/engines/mlm/mlm.service';

@Injectable()
export class InvestorsService {
  private readonly logger = new Logger(InvestorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mlmService: MlmService,
  ) {}

  /**
   * Fetch latest active Profit Configuration
   */
  async getLatestProfitConfig() {
    const latest = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });

    if (!latest) {
      return {
        id: 'default',
        version: 1,
        maxReferralLevels: 7,
        levelOpeningVolumes: { "1": 10000, "2": 25000, "3": 50000, "4": 100000, "5": 200000, "6": 500000, "7": 1000000 },
        levelPercentages: { "1": 0.05, "2": 0.03, "3": 0.02, "4": 0.015, "5": 0.01, "6": 0.005, "7": 0.0025 },
        effectiveDate: new Date(),
        status: 'ACTIVE',
      };
    }

    const maxReferralLevels = (latest.referralLevelSettings as any)?.levels ?? 7;
    const levelOpeningVolumes = (latest.levelOpeningVolume as any) || {};
    const levelPercentages = (latest.levelWiseProfitSharing as any) || {};

    return {
      id: latest.id,
      version: latest.version,
      maxReferralLevels,
      levelOpeningVolumes,
      levelPercentages,
      effectiveDate: latest.createdAt,
      status: 'ACTIVE',
    };
  }

  /**
   * Sync contribution summary and investor profile status for a shareholder
   */
  async syncInvestorProfileAndSummary(shareholderId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      include: { investorProfile: true },
    });

    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }

    const contributions = await this.prisma.contribution.findMany({
      where: { shareholderId },
    });

    let approvedSum = new Prisma.Decimal(0);
    let pendingSum = new Prisma.Decimal(0);
    let rejectedSum = new Prisma.Decimal(0);

    for (const c of contributions) {
      if (c.status === ContributionStatus.APPROVED) {
        approvedSum = approvedSum.add(c.amount);
      } else if (c.status === ContributionStatus.PENDING) {
        pendingSum = pendingSum.add(c.amount);
      } else if (c.status === ContributionStatus.REJECTED) {
        rejectedSum = rejectedSum.add(c.amount);
      }
    }

    // Upsert contribution summary
    const summary = await this.prisma.contributionSummary.upsert({
      where: { shareholderId },
      create: {
        shareholderId,
        totalApproved: approvedSum,
        totalPending: pendingSum,
        totalRejected: rejectedSum,
        lastUpdated: new Date(),
      },
      update: {
        totalApproved: approvedSum,
        totalPending: pendingSum,
        totalRejected: rejectedSum,
        lastUpdated: new Date(),
      },
    });

    // Automatically classify as Investor if they have their first approved contribution
    if (approvedSum.gt(0)) {
      if (!shareholder.investorProfile) {
        await this.prisma.investorProfile.create({
          data: {
            shareholderId,
            status: InvestorStatus.ACTIVE,
            activatedAt: new Date(),
            investorType: 'STANDARD',
          },
        });
        this.logger.log(`Automatically classified shareholder ${shareholderId} as ACTIVE Investor.`);
      } else if (shareholder.investorProfile.status === InvestorStatus.INACTIVE) {
        await this.prisma.investorProfile.update({
          where: { shareholderId },
          data: {
            status: InvestorStatus.ACTIVE,
            activatedAt: new Date(),
          },
        });
        this.logger.log(`Activated Investor profile for shareholder ${shareholderId}.`);
      }
    }

    return summary;
  }

  /**
   * Approve a contribution fund, activating Investor status and propagating MLM volumes
   */
  async approveContribution(contributionId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    if (contribution.status === ContributionStatus.APPROVED) {
      throw new BadRequestException('Contribution is already approved');
    }

    // Update status to APPROVED
    const updatedContribution = await this.prisma.contribution.update({
      where: { id: contributionId },
      data: { status: ContributionStatus.APPROVED },
    });

    this.logger.log(`Contribution ${contributionId} approved.`);

    // Sync profile & summary
    await this.syncInvestorProfileAndSummary(contribution.shareholderId);

    // Propagate MLM thresholds now that the contribution is APPROVED
    await this.mlmService.processContributionMlm(contributionId);

    return updatedContribution;
  }

  /**
   * Reject a contribution
   */
  async rejectContribution(contributionId: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    if (contribution.status !== ContributionStatus.PENDING) {
      throw new BadRequestException('Only pending contributions can be rejected');
    }

    const updated = await this.prisma.contribution.update({
      where: { id: contributionId },
      data: { status: ContributionStatus.REJECTED },
    });

    await this.syncInvestorProfileAndSummary(contribution.shareholderId);
    return updated;
  }

  /**
   * Get Investor Profile details
   */
  async getInvestorProfile(shareholderId: string) {
    const profile = await this.prisma.investorProfile.findUnique({
      where: { shareholderId },
      include: {
        shareholder: {
          select: {
            id: true,
            name: true,
            shareholderId: true,
            
            status: true,
          },
        },
      },
    });

    const summary = await this.prisma.contributionSummary.findUnique({
      where: { shareholderId },
    });

    return {
      profile: profile || {
        shareholderId,
        status: InvestorStatus.INACTIVE,
        activatedAt: null,
        investorType: 'STANDARD',
      },
      summary: summary || {
        totalApproved: 0,
        totalPending: 0,
        totalRejected: 0,
      },
    };
  }

  /**
   * Dynamically build virtual referral tree for an investor (temp Root Member)
   */
  async getInvestorTree(shareholderId: string) {
    const root = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      include: { investorProfile: true },
    });

    if (!root) {
      throw new NotFoundException('Shareholder not found');
    }

    const config = await this.getLatestProfitConfig();
    const maxDepth = config.maxReferralLevels;

    const userMap = new Map<string, any>();
    const treeNodes: any[] = [];

    let currentParentIds = [shareholderId];
    let currentDepth = 1;

    while (currentParentIds.length > 0 && currentDepth <= maxDepth) {
      const children = await this.prisma.shareholder.findMany({
        where: { parentId: { in: currentParentIds } },
        include: {
          investorProfile: true,
          contributions: {
            where: { status: ContributionStatus.APPROVED },
          },
        },
      });

      if (children.length === 0) break;

      children.forEach((u) => {
        const totalContr = u.contributions.reduce((acc, c) => acc + Number(c.amount), 0);
        const node = {
          id: u.id,
          name: u.name,
          shareholderId: u.shareholderId,
          status: u.status, // UserStatus
          depth: currentDepth,
          parentId: u.parentId,
          investorStatus: u.investorProfile?.status || 'INACTIVE',
          investorType: u.investorProfile?.investorType || 'STANDARD',
          contributionsSum: totalContr,
          children: [],
        };
        userMap.set(u.id, node);
      });

      children.forEach((u) => {
        const node = userMap.get(u.id);
        if (u.parentId === shareholderId) {
          treeNodes.push(node);
        } else {
          const parent = u.parentId ? userMap.get(u.parentId) : null;
          if (parent) {
            parent.children.push(node);
          }
        }
      });

      currentParentIds = children.map((c) => c.id);
      currentDepth++;
    }

    // Build the virtual root details
    const rootTotalContr = await this.prisma.contribution.aggregate({
      where: { shareholderId, status: ContributionStatus.APPROVED },
      _sum: { amount: true },
    });

    return {
      id: root.id,
      name: root.name,
      shareholderId: root.shareholderId,
      status: root.status,
      investorStatus: root.investorProfile?.status || 'INACTIVE',
      investorType: root.investorProfile?.investorType || 'STANDARD',
      contributionsSum: Number(rootTotalContr._sum.amount || 0),
      children: treeNodes,
    };
  }

  /**
   * Dynamically calculate level-wise Business Volume for an investor
   */
  async getBusinessVolume(shareholderId: string) {
    const root = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!root) {
      throw new NotFoundException('Shareholder not found');
    }

    const config = await this.getLatestProfitConfig();
    const maxDepth = config.maxReferralLevels;

    const levelVolumes: { [level: number]: number } = {};
    for (let l = 1; l <= maxDepth; l++) {
      levelVolumes[l] = 0;
    }

    let currentParentIds = [shareholderId];
    let currentDepth = 1;

    while (currentParentIds.length > 0 && currentDepth <= maxDepth) {
      const children = await this.prisma.shareholder.findMany({
        where: {
          parentId: { in: currentParentIds },
          status: { notIn: ['DELETED', 'DISABLED', 'BLOCKED'] },
        },
        include: {
          contributions: {
            where: { status: ContributionStatus.APPROVED },
          },
        },
      });

      if (children.length === 0) break;

      children.forEach((d) => {
        const sum = d.contributions.reduce((acc, c) => acc + Number(c.amount), 0);
        levelVolumes[currentDepth] += sum;
      });

      currentParentIds = children.map((c) => c.id);
      currentDepth++;
    }

    // Format & Cache results in database
    const results = Object.keys(levelVolumes).map((lvl) => {
      const level = parseInt(lvl);
      const totalVolume = levelVolumes[level];
      return { level, totalVolume };
    });

    // Write to BusinessVolume cache table
    for (const r of results) {
      await this.prisma.businessVolume.upsert({
        where: { shareholderId_level: { shareholderId, level: r.level } },
        create: {
          shareholderId,
          level: r.level,
          totalVolume: new Prisma.Decimal(r.totalVolume),
        },
        update: {
          totalVolume: new Prisma.Decimal(r.totalVolume),
        },
      });
    }

    return results;
  }

  /**
   * Evaluate dynamic level eligibility for profit sharing
   */
  async getLevelEligibility(shareholderId: string) {
    const volumes = await this.getBusinessVolume(shareholderId);
    const config = await this.getLatestProfitConfig();
    const thresholds = config.levelOpeningVolumes as Record<string, number>;

    const latestBC = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });
    const systemDefaults = (latestBC?.systemDefaults as any) || {};
    const isSequential = systemDefaults.sequentialLevelQualification !== false;

    // Sort volumes by level to evaluate sequentially
    const sortedVolumes = [...volumes].sort((a, b) => a.level - b.level);

    let previousLevelQualified = true;

    return sortedVolumes.map((v) => {
      const threshold = thresholds[String(v.level)] ?? 0;
      let status = 'INCOMPLETE';

      if (isSequential && !previousLevelQualified) {
        status = 'LOCKED';
      } else {
        const isEligible = v.totalVolume >= threshold;
        if (isEligible) {
          status = 'ELIGIBLE';
        } else {
          status = 'INCOMPLETE';
          previousLevelQualified = false;
        }
      }

      return {
        level: v.level,
        volume: v.totalVolume,
        threshold,
        isEligible: status === 'ELIGIBLE',
        status,
      };
    });
  }

  /**
   * Get Referral Volume Summary
   */
  async getReferralVolume(shareholderId: string) {
    const volumes = await this.getBusinessVolume(shareholderId);
    const totalVolume = volumes.reduce((acc, v) => acc + v.totalVolume, 0);

    const directReferrals = await this.prisma.shareholder.count({
      where: {
        parentId: shareholderId,
        status: { notIn: ['DELETED'] },
      },
    });

    return {
      shareholderId,
      totalReferralVolume: totalVolume,
      directReferralsCount: directReferrals,
      levelWiseVolumes: volumes,
    };
  }

  /**
   * Get Investor's own profit summary (from approved Contribution Funds / ROI)
   */
  async getInvestorProfitSummary(shareholderId: string) {
    const ledgers = await this.prisma.profitLedger.findMany({
      where: { shareholderId },
      orderBy: { createdAt: 'desc' },
    });

    const totalProfit = ledgers.reduce((acc, l) => acc + Number(l.amount), 0);

    return {
      shareholderId,
      totalOwnProfit: totalProfit,
      history: ledgers,
    };
  }

  /**
   * Get Referral tree profit summary
   */
  async getReferralProfitSummary(shareholderId: string) {
    const calculations = await this.prisma.profitCalculation.findMany({
      where: { shareholderId },
      orderBy: { createdAt: 'desc' },
    });

    const totalReferralProfit = calculations.reduce((acc, c) => acc + Number(c.profitAmount), 0);

    return {
      shareholderId,
      totalReferralProfit,
      history: calculations,
    };
  }

  /**
   * Get level-wise profit sharing details
   */
  async getLevelWiseProfitSharing(shareholderId: string) {
    const calculations = await this.prisma.profitCalculation.findMany({
      where: { shareholderId },
      orderBy: { level: 'asc' },
    });

    const config = await this.getLatestProfitConfig();
    const percentages = config.levelPercentages as Record<string, number>;

    const levelProfitMap: { [level: number]: { totalProfit: number; percentage: number; calculations: any[] } } = {};
    const maxDepth = config.maxReferralLevels;

    for (let l = 1; l <= maxDepth; l++) {
      levelProfitMap[l] = {
        totalProfit: 0,
        percentage: percentages[String(l)] ?? 0,
        calculations: [],
      };
    }

    calculations.forEach((c) => {
      if (levelProfitMap[c.level]) {
        levelProfitMap[c.level].totalProfit += Number(c.profitAmount);
        levelProfitMap[c.level].calculations.push(c);
      }
    });

    return Object.keys(levelProfitMap).map((lvl) => {
      const level = parseInt(lvl);
      return {
        level,
        ...levelProfitMap[level],
      };
    });
  }

  /**
   * Dynamic Profit Engine traversal and calculation run
   */
  async runProfitSharingCalculationCycle(batchId: string) {
    this.logger.log(`Running dynamic Profit Sharing calculation cycle for batch: ${batchId}`);
    
    // Fetch latest active Profit Configuration
    const config = await this.getLatestProfitConfig();

    if (!config || config.id === 'default') {
      // If config is missing or fallback, verify we have a config in DB.
      const dbConfig = await this.prisma.profitConfiguration.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { version: 'desc' },
      });
      
      if (!dbConfig) {
        const errorMsg = 'Profit configuration is missing or not active';
        this.logger.error(errorMsg);

        // Notify administrators
        const admins = await this.prisma.shareholder.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        });
        for (const admin of admins) {
          await this.prisma.notification.create({
            data: {
              shareholderId: admin.id,
              title: 'Profit Sharing Run Aborted',
              message: `Profit sharing calculation was aborted: ${errorMsg}`,
              type: 'SYSTEM',
              priority: 'HIGH',
            },
          });
        }
        throw new Error(errorMsg);
      }
    }

    const maxDepth = config.maxReferralLevels;
    const thresholds = config.levelOpeningVolumes as Record<string, number>;
    const percentages = config.levelPercentages as Record<string, number>;

    // Verify configuration details are complete for all levels
    for (let l = 1; l <= maxDepth; l++) {
      if (thresholds[String(l)] === undefined || percentages[String(l)] === undefined) {
        const errorMsg = `Profit configuration is incomplete. Level ${l} is missing opening volume or percentage.`;
        this.logger.error(errorMsg);

        const admins = await this.prisma.shareholder.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        });
        for (const admin of admins) {
          await this.prisma.notification.create({
            data: {
              shareholderId: admin.id,
              title: 'Profit Sharing Run Aborted',
              message: `Profit sharing calculation was aborted: ${errorMsg}`,
              type: 'SYSTEM',
              priority: 'HIGH',
            },
          });
        }
        throw new Error(errorMsg);
      }
    }

    // Fetch all ACTIVE investors
    const activeInvestors = await this.prisma.investorProfile.findMany({
      where: { status: InvestorStatus.ACTIVE },
      include: { shareholder: true },
    });

    const latestBC = await this.prisma.businessConfiguration.findFirst({
      orderBy: { version: 'desc' },
    });
    const systemDefaults = (latestBC?.systemDefaults as any) || {};
    const isSequential = systemDefaults.sequentialLevelQualification !== false;

    let totalCalculatedSharing = 0;

    for (const investor of activeInvestors) {
      const shareholderId = investor.shareholderId;
      
      // Calculate volumes for this shareholder
      const volumes = await this.getBusinessVolume(shareholderId);
      const volumeMap = new Map<number, number>();
      for (const v of volumes) {
        volumeMap.set(v.level, v.totalVolume);
      }

      let sequenceTerminated = false;
      let terminationReason = '';

      for (let level = 1; level <= maxDepth; level++) {
        const pct = percentages[String(level)] ?? 0;
        const reqVolume = thresholds[String(level)] ?? 0;
        const achVolume = volumeMap.get(level) ?? 0;

        if (isSequential && sequenceTerminated) {
          // Record skip in Audit Log for sequential tracking
          await this.prisma.auditLog.create({
            data: {
              shareholderId: 'system',
              action: 'PROFIT_DISTRIBUTION_SKIP',
              entityType: 'ProfitCalculation',
              entityId: shareholderId,
              newValue: JSON.stringify({
                investorId: shareholderId,
                batchId,
                level,
                businessVolume: achVolume,
                requiredVolume: reqVolume,
                eligible: false,
                profitPercentage: pct,
                profitAmount: 0,
                reasonIfSkipped: `Skipped because the previous level calculation was terminated. Reason: ${terminationReason}`,
                timestamp: new Date(),
              }),
            },
          });
          continue;
        }

        // Compare Achieved Business Volume >= Configured Opening Business Volume
        const isEligible = achVolume >= reqVolume;

        if (isEligible) {
          const profitAmount = achVolume * pct;

          // Save ProfitCalculation record
          const calcRecord = await this.prisma.profitCalculation.create({
            data: {
              shareholderId,
              level,
              volume: new Prisma.Decimal(achVolume),
              profitAmount: new Prisma.Decimal(profitAmount),
              status: 'PROCESSED',
              batchId,
            },
          });

          // Also log a direct commission into the CommissionLedger table for audit/payout batch integration
          await this.prisma.commissionLedger.create({
            data: {
              shareholderId,
              fromInvestmentId: null, // Dynamic tree commissions are aggregates, not linked to a single investment
              level,
              rate: new Prisma.Decimal(pct),
              amount: new Prisma.Decimal(profitAmount),
              status: 'CONFIRMED',
            },
          });

          // Record distribution in Audit Log
          await this.prisma.auditLog.create({
            data: {
              shareholderId: 'system',
              action: 'PROFIT_DISTRIBUTION_SUCCESS',
              entityType: 'ProfitCalculation',
              entityId: calcRecord.id,
              newValue: JSON.stringify({
                investorId: shareholderId,
                batchId,
                level,
                businessVolume: achVolume,
                requiredVolume: reqVolume,
                eligible: true,
                profitPercentage: pct,
                profitAmount,
                reasonIfSkipped: '',
                timestamp: new Date(),
              }),
            },
          });

          totalCalculatedSharing += profitAmount;
        } else {
          // This level failed. Set termination flags.
          sequenceTerminated = true;
          terminationReason = `Level ${level} not eligible: Achieved volume ${achVolume} < Required volume ${reqVolume}.`;

          if (isSequential) {
            // Record failure in Audit Log
            await this.prisma.auditLog.create({
              data: {
                shareholderId: 'system',
                action: 'PROFIT_DISTRIBUTION_BLOCKED',
                entityType: 'ProfitCalculation',
                entityId: shareholderId,
                newValue: JSON.stringify({
                  investorId: shareholderId,
                  batchId,
                  level,
                  businessVolume: achVolume,
                  requiredVolume: reqVolume,
                  eligible: false,
                  profitPercentage: pct,
                  profitAmount: 0,
                  reasonIfSkipped: terminationReason,
                  timestamp: new Date(),
                }),
              },
            });
          }
        }
      }
    }

    this.logger.log(`Successfully completed profit sharing cycle. Total sharing distributed: $${totalCalculatedSharing}`);
    return totalCalculatedSharing;
  }
}
