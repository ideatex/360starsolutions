import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { NotificationService } from '@server/engines/notification/notification.service';
import { PayoutCycleService, PayoutCycleDefinition } from './payout-cycle.service';
import { FirstPayoutProrationService, ProrationCalculationResult } from './first-payout-proration.service';
import { BusinessConfigService } from '@server/business-config/business-config.service';
import { ReferralTreeService } from '@server/engines/referral-tree/referral-tree.service';
import { HoldingBalanceService } from '@server/engines/holding-balance/holding-balance.service';
import { CommissionService } from '@server/engines/commission/commission.service';
import { Prisma, BatchStatus, PayoutStatus, CommissionStatus, UserStatus, ContributionStatus, AccountType } from '@prisma/client';

export interface PayoutPreviewItem {
  shareholderId: string;
  shareholderCode: string;
  name: string;
  phone: string;
  accountType: AccountType;
  effectiveLevel: number;
  unlockedLevel: number;
  hasOverride: boolean;
  
  // Profit calculations
  principalAmount: number;
  isFirstPayout: boolean;
  activeDays: number;
  dailyRate: number;
  prorationBasis: string;
  grossProfitShare: number;
  
  // Gratitude calculations
  grossGratitudeShare: number;
  withheldAmount: number;
  netGratitudeShare: number;
  withholdingPercentage?: number;
  gratitudeDetails?: any[];
  
  // Final Net
  netPayable: number;
  holdingBalanceBefore: number;
  holdingBalanceAfter: number;
  willAutoConvert: boolean;
}

export interface ExcludedAccountItem {
  shareholderId: string;
  shareholderCode: string;
  name: string;
  reason: string;
  details: string;
}

export interface PayoutPreviewResult {
  cycle: PayoutCycleDefinition;
  configSnapshot: {
    monthlyProfitRate: number;
    prorationBasis: string;
    gratitudeRates: Record<number, number>;
  };
  summary: {
    totalContributions: number;
    totalBeneficiaries: number;
    totalGrossProfit: number;
    totalGrossGratitude: number;
    totalWithheld: number;
    totalNetPayable: number;
    firstPayoutCount: number;
    fullCyclePayoutCount: number;
    zeroContributionCount: number;
  };
  beneficiaries: PayoutPreviewItem[];
  excludedAccounts: ExcludedAccountItem[];
}

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly payoutCycleService: PayoutCycleService,
    private readonly prorationService: FirstPayoutProrationService,
    private readonly businessConfigService: BusinessConfigService,
    private readonly referralTreeService: ReferralTreeService,
    private readonly holdingBalanceService: HoldingBalanceService,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Retrieves available canonical fortnightly payout cycles with batch status metadata.
   */
  async getAvailableCycles() {
    const canonicalCycles = this.payoutCycleService.getAvailableCycles(6, 6);
    const existingBatches = await this.prisma.payoutBatch.findMany({
      where: {
        cycleIdentifier: { in: canonicalCycles.map((c) => c.cycleIdentifier) },
      },
      select: {
        id: true,
        cycleIdentifier: true,
        status: true,
        totalAmount: true,
        totalNetPayable: true,
        totalBeneficiaries: true,
        createdAt: true,
        approvedAt: true,
        releasedAt: true,
      },
    });

    const batchMap = new Map<string, any>();
    for (const b of existingBatches) {
      if (b.cycleIdentifier) {
        batchMap.set(b.cycleIdentifier, b);
      }
    }

    return canonicalCycles.map((cycle) => {
      const batch = batchMap.get(cycle.cycleIdentifier);
      return {
        ...cycle,
        hasBatch: !!batch,
        batchId: batch?.id || null,
        batchStatus: batch?.status || 'NOT_GENERATED',
        totalNetPayable: batch ? Number(batch.totalNetPayable || batch.totalAmount) : 0,
        totalBeneficiaries: batch?.totalBeneficiaries || 0,
      };
    });
  }

  /**
   * Unified Calculation Engine: Computes complete payout figures for a canonical cycle.
   * Single source of truth used for PREVIEW and BATCH GENERATION.
   */
  async computePayoutDataForCycle(cycleIdentifier: string): Promise<PayoutPreviewResult> {
    const cycle = this.payoutCycleService.getCycleByIdentifier(cycleIdentifier);

    // 1. Fetch system business config
    let config: any = null;
    try {
      config = await this.businessConfigService.getLatest();
    } catch {
      this.logger.warn('Could not fetch latest BusinessConfig, falling back to defaults.');
    }

    const monthlyProfitRate = config?.profitSharingPercentage
      ? Number(config.profitSharingPercentage)
      : FirstPayoutProrationService.DEFAULT_MONTHLY_RATE;

    const prorationBasis: 'MONTH_DAYS' | 'CYCLE_DAYS' =
      config?.prorationConfig?.basis === 'CYCLE_DAYS' ? 'CYCLE_DAYS' : 'MONTH_DAYS';

    const gratitudeRates = await this.commissionService.getGratitudeRates();

    // 2. Query all shareholders with their relationships
    const shareholders = await this.prisma.shareholder.findMany({
      where: {
        status: { notIn: [UserStatus.DELETED] },
      },
      include: {
        contributions: {
          where: {
            status: ContributionStatus.APPROVED,
            date: { lte: cycle.cutoffDate },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    const excludedAccounts: ExcludedAccountItem[] = [];
    const profitCalculationsByShareholder = new Map<string, ProrationCalculationResult[]>();

    // 3. Evaluate Profit Share for each shareholder's active approved contributions
    for (const sh of shareholders) {
      // Check account-level suspension / pending status
      if (sh.status === UserStatus.PENDING_APPROVAL || sh.status === UserStatus.DISABLED) {
        excludedAccounts.push({
          shareholderId: sh.id,
          shareholderCode: sh.shareholderId,
          name: sh.name || 'N/A',
          reason: 'ACCOUNT_PENDING_OR_DISABLED',
          details: `Account status is ${sh.status}. Ineligible for Profit Share and Gratitude Share.`,
        });
        continue;
      }

      if (sh.status === UserStatus.BLOCKED) {
        excludedAccounts.push({
          shareholderId: sh.id,
          shareholderCode: sh.shareholderId,
          name: sh.name || 'N/A',
          reason: 'ACCOUNT_BLOCKED',
          details: 'Account is blocked by administrator. Earnings suspended.',
        });
        continue;
      }

      // Zero-contribution accounts do NOT receive Profit Share
      if (sh.accountType === AccountType.ZERO_CONTRIBUTION) {
        continue;
      }

      if (sh.contributions.length === 0) {
        // No approved contributions <= cutoffDate
        continue;
      }

      const contribCalcs: ProrationCalculationResult[] = [];
      for (const contrib of sh.contributions) {
        const principal = Number(contrib.amount);
        if (principal <= 0) continue;

        const calc = this.prorationService.calculateContributionProfitForCycle(
          contrib.id,
          sh.id,
          principal,
          contrib.date,
          cycle,
          monthlyProfitRate,
          prorationBasis,
        );

        if (calc.profitAmount > 0) {
          contribCalcs.push(calc);
        }
      }

      if (contribCalcs.length > 0) {
        profitCalculationsByShareholder.set(sh.id, contribCalcs);
      }
    }

    // 4. Evaluate Gratitude Share (L1–L12) across downline contributions
    const gratitudeByShareholder = new Map<string, { grossGratitude: number; details: any[] }>();

    for (const sh of shareholders) {
      if (sh.status === UserStatus.BLOCKED || sh.status === UserStatus.DELETED || sh.status === UserStatus.DISABLED) {
        continue;
      }

      for (const contrib of sh.contributions) {
        const contribAmount = Number(contrib.amount);
        if (contribAmount <= 0) continue;

        // Walk up to 12 levels upstream
        const ancestors = await this.referralTreeService.getUpstreamAncestors(sh.id, 12);
        for (const item of ancestors) {
          const { level, shareholder: ancestor } = item;
          const rate = gratitudeRates[level] || 0;
          if (rate <= 0) continue;

          // Ancestor must not be blocked or deleted
          if (ancestor.status === UserStatus.BLOCKED || ancestor.status === UserStatus.DELETED) {
            continue;
          }

          // Dynamic level unlock verification (1->L3, 2->L6, 3->L9, 4->L12 or admin override)
          const unlockInfo = await this.referralTreeService.getUnlockedLevel(ancestor.id);
          if (unlockInfo.effectiveLevel < level) {
            // Level is locked for ancestor
            continue;
          }

          const rawGratitude = contribAmount * rate;
          const roundedGratitude = Math.round(rawGratitude * 100) / 100;

          if (roundedGratitude > 0) {
            const current = gratitudeByShareholder.get(ancestor.id) || { grossGratitude: 0, details: [] };
            current.grossGratitude += roundedGratitude;
            current.details.push({
              sourceShareholderId: sh.id,
              sourceContributionId: contrib.id,
              level,
              rate,
              calculationBase: contribAmount,
              amount: roundedGratitude,
            });
            gratitudeByShareholder.set(ancestor.id, current);
          }
        }
      }
    }

    // 5. Aggregate beneficiaries and apply Zero-Contribution 20% withholding
    const allBeneficiaryIds = new Set<string>([
      ...profitCalculationsByShareholder.keys(),
      ...gratitudeByShareholder.keys(),
    ]);

    const beneficiaries: PayoutPreviewItem[] = [];
    let totalGrossProfit = 0;
    let totalGrossGratitude = 0;
    let totalWithheld = 0;
    let totalNetPayable = 0;
    let firstPayoutCount = 0;
    let fullCyclePayoutCount = 0;
    let zeroContributionCount = 0;

    for (const shId of allBeneficiaryIds) {
      const sh = shareholders.find((s) => s.id === shId);
      if (!sh) continue;

      const unlockInfo = await this.referralTreeService.getUnlockedLevel(sh.id);
      const profitCalcs = profitCalculationsByShareholder.get(sh.id) || [];
      const gratitudeData = gratitudeByShareholder.get(sh.id) || { grossGratitude: 0, details: [] };

      const grossProfit = profitCalcs.reduce((sum, p) => sum + p.profitAmount, 0);
      const grossGratitude = Math.round(gratitudeData.grossGratitude * 100) / 100;

      const isFirstPayout = profitCalcs.some((p) => p.isFirstPayout);
      const activeDays = profitCalcs.length > 0 ? profitCalcs[0].activeDays : cycle.totalCycleDays;
      const dailyRate = profitCalcs.length > 0 ? profitCalcs[0].dailyRate : 0;
      const totalPrincipal = profitCalcs.reduce((sum, p) => sum + p.principalAmount, 0);

      if (isFirstPayout) firstPayoutCount++;
      else if (grossProfit > 0) fullCyclePayoutCount++;

      // Zero Contribution dynamic withholding rule
      let withheldAmount = 0;
      let netGratitude = grossGratitude;
      const holdingBefore = Number(sh.holdingBalance || 0);
      const withholdingPercent = Number((sh as any).withholdingPercentage ?? 20);

      if (sh.accountType === AccountType.ZERO_CONTRIBUTION) {
        zeroContributionCount++;
        const withheldRate = withholdingPercent / 100;
        withheldAmount = Math.round(grossGratitude * withheldRate * 100) / 100;
        netGratitude = Math.round((grossGratitude - withheldAmount) * 100) / 100;
      }

      const netPayable = Math.round((grossProfit + netGratitude) * 100) / 100;
      const holdingAfter = holdingBefore + withheldAmount;
      const willAutoConvert = sh.accountType === AccountType.ZERO_CONTRIBUTION && holdingAfter >= 100000;

      totalGrossProfit += grossProfit;
      totalGrossGratitude += grossGratitude;
      totalWithheld += withheldAmount;
      totalNetPayable += netPayable;

      beneficiaries.push({
        shareholderId: sh.id,
        shareholderCode: sh.shareholderId,
        name: sh.name || 'Standard Shareholder',
        phone: sh.phone || '',
        accountType: sh.accountType,
        effectiveLevel: unlockInfo.effectiveLevel,
        unlockedLevel: unlockInfo.systemLevel,
        hasOverride: unlockInfo.isOverridden,
        principalAmount: totalPrincipal,
        isFirstPayout,
        activeDays,
        dailyRate,
        prorationBasis,
        grossProfitShare: grossProfit,
        grossGratitudeShare: grossGratitude,
        withheldAmount,
        netGratitudeShare: netGratitude,
        withholdingPercentage: withholdingPercent,
        gratitudeDetails: gratitudeData.details,
        netPayable,
        holdingBalanceBefore: holdingBefore,
        holdingBalanceAfter: holdingAfter,
        willAutoConvert,
      });
    }

    // Sort beneficiaries alphabetically by code
    beneficiaries.sort((a, b) => a.shareholderCode.localeCompare(b.shareholderCode));

    return {
      cycle,
      configSnapshot: {
        monthlyProfitRate,
        prorationBasis,
        gratitudeRates,
      },
      summary: {
        totalContributions: shareholders.reduce((sum, s) => sum + s.contributions.length, 0),
        totalBeneficiaries: beneficiaries.length,
        totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
        totalGrossGratitude: Math.round(totalGrossGratitude * 100) / 100,
        totalWithheld: Math.round(totalWithheld * 100) / 100,
        totalNetPayable: Math.round(totalNetPayable * 100) / 100,
        firstPayoutCount,
        fullCyclePayoutCount,
        zeroContributionCount,
      },
      beneficiaries,
      excludedAccounts,
    };
  }

  /**
   * Preview a canonical cycle batch before generation (Super Admin & Admin).
   */
  async previewPayoutBatch(cycleIdentifier: string): Promise<PayoutPreviewResult> {
    return this.computePayoutDataForCycle(cycleIdentifier);
  }

  /**
   * Generates or regenerates an idempotent Product 360 Payout Batch for a canonical cycle.
   * Concurrency-safe, transactional, and append-only.
   */
  async generatePayoutBatch(cycleIdentifier: string, actorId = 'SYSTEM') {
    const cycle = this.payoutCycleService.getCycleByIdentifier(cycleIdentifier);
    const idempotencyKey = `CYCLE_${cycleIdentifier}`;

    // Check if batch already exists
    const existingBatch = await this.prisma.payoutBatch.findUnique({
      where: { cycleIdentifier },
    });

    if (existingBatch) {
      if (existingBatch.status === BatchStatus.APPROVED || existingBatch.status === BatchStatus.RELEASED) {
        throw new BadRequestException(
          `Payout Batch for cycle '${cycleIdentifier}' is already ${existingBatch.status} (ID: ${existingBatch.id}). Historical paid/approved payouts cannot be re-generated.`
        );
      }
      this.logger.log(`Regenerating existing ${existingBatch.status} batch for ${cycleIdentifier}...`);
    }

    // Run unified calculation
    const previewData = await this.computePayoutDataForCycle(cycleIdentifier);
    const { summary, beneficiaries, cycle: cycleDef } = previewData;

    return await this.prisma.$transaction(
      async (tx) => {
        let batchId: string;

        if (existingBatch) {
          batchId = existingBatch.id;
          // Clean up prior unapproved details and ledgers linked to this pending batch
          await tx.payoutDetail.deleteMany({ where: { batchId } });
          await tx.profitLedger.deleteMany({ where: { payoutBatchId: batchId } });
          await tx.commissionLedger.deleteMany({ where: { payoutBatchId: batchId } });
          await tx.holdingLedger.deleteMany({ where: { payoutBatchId: batchId } });

          await tx.payoutBatch.update({
            where: { id: batchId },
            data: {
              status: BatchStatus.REVIEWED,
              totalAmount: new Prisma.Decimal(summary.totalNetPayable),
              totalGrossProfit: new Prisma.Decimal(summary.totalGrossProfit),
              totalGrossGratitude: new Prisma.Decimal(summary.totalGrossGratitude),
              totalWithheld: new Prisma.Decimal(summary.totalWithheld),
              totalNetPayable: new Prisma.Decimal(summary.totalNetPayable),
              totalBeneficiaries: summary.totalBeneficiaries,
              calculationVersion: { increment: 1 },
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new batch record
          const createdBatch = await tx.payoutBatch.create({
            data: {
              cycleIdentifier,
              idempotencyKey,
              cycleNumber: cycleDef.cycleNumber,
              cycleStart: cycleDef.periodStart,
              cycleEnd: cycleDef.periodEnd,
              cutoffDate: cycleDef.cutoffDate,
              payoutDate: cycleDef.payoutDate,
              status: BatchStatus.REVIEWED,
              totalAmount: new Prisma.Decimal(summary.totalNetPayable),
              totalGrossProfit: new Prisma.Decimal(summary.totalGrossProfit),
              totalGrossGratitude: new Prisma.Decimal(summary.totalGrossGratitude),
              totalWithheld: new Prisma.Decimal(summary.totalWithheld),
              totalNetPayable: new Prisma.Decimal(summary.totalNetPayable),
              totalBeneficiaries: summary.totalBeneficiaries,
            },
          });
          batchId = createdBatch.id;
        }

        // Process each beneficiary atomically
        for (const item of beneficiaries) {
          // Apply withholding & auto-conversion if Zero-Contribution
          if (item.withheldAmount > 0) {
            const sh = await tx.shareholder.findUnique({ where: { id: item.shareholderId } });
            if (sh) {
              const currentBal = Number(sh.holdingBalance || 0);
              const newBal = currentBal + item.withheldAmount;

              const withheldPct = item.withholdingPercentage ?? 20;
              await tx.holdingLedger.create({
                data: {
                  shareholderId: item.shareholderId,
                  payoutBatchId: batchId,
                  amount: new Prisma.Decimal(item.withheldAmount),
                  balanceBefore: new Prisma.Decimal(currentBal),
                  balanceAfter: new Prisma.Decimal(newBal),
                  type: 'WITHHOLDING',
                  remarks: `${withheldPct}% Gratitude Share withholding for cycle ${cycleIdentifier}`,
                },
              });

              if (newBal >= 100000 && sh.accountType === AccountType.ZERO_CONTRIBUTION) {
                // Auto-conversion of ₹1,00,000 threshold
                const remainingBal = newBal - 100000;
                await tx.shareholder.update({
                  where: { id: sh.id },
                  data: {
                    holdingBalance: new Prisma.Decimal(remainingBal),
                    accountType: AccountType.CONTRIBUTION,
                  },
                });

                await tx.contribution.create({
                  data: {
                    shareholderId: sh.id,
                    amount: new Prisma.Decimal(100000),
                    mode: 'Holding Activation',
                    date: new Date(),
                    status: ContributionStatus.APPROVED,
                    isAutoConverted: true,
                    activeDate: new Date(),
                    effectiveDate: new Date(),
                  },
                });

                await tx.holdingLedger.create({
                  data: {
                    shareholderId: sh.id,
                    payoutBatchId: batchId,
                    amount: new Prisma.Decimal(-100000),
                    balanceBefore: new Prisma.Decimal(newBal),
                    balanceAfter: new Prisma.Decimal(remainingBal),
                    type: 'AUTO_CONVERSION',
                    remarks: `Auto-converted ₹1,00,000 into active Contribution Fund from accumulated holding balance.`,
                  },
                });
              } else {
                await tx.shareholder.update({
                  where: { id: sh.id },
                  data: { holdingBalance: new Prisma.Decimal(newBal) },
                });
              }
            }
          }

          // Create PayoutDetail record
          await tx.payoutDetail.create({
            data: {
              batchId,
              shareholderId: item.shareholderId,
              profitAmount: new Prisma.Decimal(item.grossProfitShare),
              commissionAmount: new Prisma.Decimal(item.netGratitudeShare),
              totalAmount: new Prisma.Decimal(item.netPayable),
              grossProfitShare: new Prisma.Decimal(item.grossProfitShare),
              grossGratitudeShare: new Prisma.Decimal(item.grossGratitudeShare),
              withheldAmount: new Prisma.Decimal(item.withheldAmount),
              deductions: new Prisma.Decimal(item.withheldAmount),
              netPayable: new Prisma.Decimal(item.netPayable),
              isFirstPayout: item.isFirstPayout,
              activeDays: item.activeDays,
              dailyRate: item.dailyRate > 0 ? new Prisma.Decimal(item.dailyRate) : null,
              prorationBasis: item.prorationBasis,
              effectiveLevel: item.effectiveLevel,
              status: PayoutStatus.PENDING,
            },
          });

          // Persist ProfitLedger entry if profit > 0
          if (item.grossProfitShare > 0) {
            await tx.profitLedger.create({
              data: {
                shareholderId: item.shareholderId,
                cycleStart: cycleDef.periodStart,
                cycleEnd: cycleDef.periodEnd,
                cycleIdentifier,
                eligibleDays: item.activeDays,
                isFirstPayout: item.isFirstPayout,
                activeDays: item.activeDays,
                dailyRate: item.dailyRate > 0 ? new Prisma.Decimal(item.dailyRate) : null,
                rateBasis: item.prorationBasis,
                amount: new Prisma.Decimal(item.grossProfitShare),
                status: PayoutStatus.PROCESSED,
                payoutBatchId: batchId,
              },
            });
          }

          // Persist CommissionLedger entries for every level in gratitudeDetails (L1 through L12)
          if (item.gratitudeDetails && item.gratitudeDetails.length > 0) {
            for (const detail of item.gratitudeDetails) {
              await tx.commissionLedger.create({
                data: {
                  shareholderId: item.shareholderId,
                  sourceShareholderId: detail.sourceShareholderId,
                  fromContributionId: detail.sourceContributionId,
                  cycleIdentifier,
                  level: detail.level,
                  rate: new Prisma.Decimal(detail.rate),
                  amount: new Prisma.Decimal(detail.amount),
                  calculationBase: new Prisma.Decimal(detail.calculationBase),
                  status: CommissionStatus.PROCESSED,
                  payoutBatchId: batchId,
                },
              });
            }
          } else if (item.grossGratitudeShare > 0) {
            await tx.commissionLedger.create({
              data: {
                shareholderId: item.shareholderId,
                cycleIdentifier,
                level: item.effectiveLevel,
                rate: new Prisma.Decimal(item.grossGratitudeShare / (item.principalAmount || 100000)),
                amount: new Prisma.Decimal(item.grossGratitudeShare),
                status: CommissionStatus.PROCESSED,
                payoutBatchId: batchId,
              },
            });
          }
        }

        // Automated Reconciliation Check within Transaction
        const sumDetails = await tx.payoutDetail.aggregate({
          where: { batchId },
          _sum: {
            grossProfitShare: true,
            grossGratitudeShare: true,
            withheldAmount: true,
            netPayable: true,
          },
        });

        const sumProfit = Number(sumDetails._sum.grossProfitShare || 0);
        const sumGratitude = Number(sumDetails._sum.grossGratitudeShare || 0);
        const sumWithheld = Number(sumDetails._sum.withheldAmount || 0);
        const sumNet = Number(sumDetails._sum.netPayable || 0);

        const expectedNet = Math.round((sumProfit + (sumGratitude - sumWithheld)) * 100) / 100;
        const diff = Math.abs(sumNet - expectedNet);

        if (diff > 0.05) {
          throw new BadRequestException(
            `Reconciliation assertion failed: Sum of Net Payables (₹${sumNet}) does not match Gross Earnings less Withholding (₹${expectedNet}). Transaction aborted.`
          );
        }

        // Audit Trail
        await this.auditService.logAction({
          shareholderId: actorId,
          action: 'GENERATE_PAYOUT_BATCH',
          entityType: 'PayoutBatch',
          entityId: batchId,
          newValue: `Cycle: ${cycleIdentifier}, Beneficiaries: ${summary.totalBeneficiaries}, Net: ₹${summary.totalNetPayable.toLocaleString('en-IN')}, Withheld: ₹${summary.totalWithheld.toLocaleString('en-IN')}`,
        });

        return tx.payoutBatch.findUnique({
          where: { id: batchId },
          include: { details: true },
        });
      },
      { timeout: 30000 }
    );
  }

  /**
   * Super Admin Batch Approval
   */
  async approveBatch(batchId: string, superAdminId: string) {
    const admin = await this.prisma.shareholder.findUnique({ where: { id: superAdminId } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only Super Admins are authorized to approve payout batches.');
    }

    const batch = await this.prisma.payoutBatch.findUnique({ where: { id: batchId } });
    if (!batch || (batch.status !== BatchStatus.REVIEWED && batch.status !== BatchStatus.PENDING)) {
      throw new BadRequestException('Batch must be in PENDING or REVIEWED state to be approved.');
    }

    const updated = await this.prisma.payoutBatch.update({
      where: { id: batchId },
      data: { status: BatchStatus.APPROVED, approvedAt: new Date() },
    });

    await this.auditService.logAction({
      shareholderId: superAdminId,
      action: 'APPROVE_PAYOUT_BATCH',
      entityType: 'PayoutBatch',
      entityId: batchId,
      oldValue: batch.status,
      newValue: 'APPROVED',
    });

    return { success: true, message: `Batch ${batchId} marked as APPROVED.`, batch: updated };
  }

  /**
   * Super Admin Batch Fund Release (Disbursement)
   */
  async releaseBatch(batchId: string, superAdminId: string) {
    const admin = await this.prisma.shareholder.findUnique({ where: { id: superAdminId } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only Super Admins are authorized to release payout batches.');
    }

    const batch = await this.prisma.payoutBatch.findUnique({ where: { id: batchId } });
    if (!batch || batch.status !== BatchStatus.APPROVED) {
      throw new BadRequestException('Batch must be in APPROVED state before releasing funds.');
    }

    const updatedBatch = await this.prisma.$transaction(async (tx) => {
      const b = await tx.payoutBatch.update({
        where: { id: batchId },
        data: { status: BatchStatus.RELEASED, releasedAt: new Date() },
      });

      await tx.payoutDetail.updateMany({
        where: { batchId },
        data: { status: PayoutStatus.PAID },
      });

      await tx.profitLedger.updateMany({
        where: { payoutBatchId: batchId },
        data: { status: PayoutStatus.PAID },
      });

      await tx.commissionLedger.updateMany({
        where: { payoutBatchId: batchId },
        data: { status: CommissionStatus.PAID },
      });

      return b;
    });

    await this.auditService.logAction({
      shareholderId: superAdminId,
      action: 'RELEASE_PAYOUT_BATCH',
      entityType: 'PayoutBatch',
      entityId: batchId,
      oldValue: 'APPROVED',
      newValue: 'RELEASED',
    });

    // Notify beneficiaries
    const details = await this.prisma.payoutDetail.findMany({ where: { batchId } });
    for (const detail of details) {
      const amount = Number(detail.netPayable || detail.totalAmount);
      if (amount > 0) {
        await this.notificationService.createNotification({
          shareholderId: detail.shareholderId,
          title: 'Payout Dispatched!',
          message: `Your semi-monthly payout of ₹${amount.toLocaleString('en-IN')} for cycle ${batch.cycleIdentifier || ''} has been released.`,
        });
      }
    }

    return { success: true, message: `Batch ${batchId} funds released successfully.`, batch: updatedBatch };
  }

  /**
   * Super Admin Batch Reversal Workflow
   */
  async reverseBatch(batchId: string, superAdminId: string, reason: string) {
    const admin = await this.prisma.shareholder.findUnique({ where: { id: superAdminId } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only Super Admins are authorized to reverse payout batches.');
    }

    const batch = await this.prisma.payoutBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException('Payout batch not found.');
    }

    if (batch.status === BatchStatus.REVERSED) {
      throw new BadRequestException('Payout batch is already reversed.');
    }

    const updatedBatch = await this.prisma.$transaction(async (tx) => {
      const b = await tx.payoutBatch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.REVERSED,
          reversalReason: reason,
          reversedAt: new Date(),
          reversedById: superAdminId,
        },
      });

      await tx.payoutDetail.updateMany({
        where: { batchId },
        data: { status: PayoutStatus.REVERSED },
      });

      await tx.profitLedger.updateMany({
        where: { payoutBatchId: batchId },
        data: { status: PayoutStatus.REVERSED },
      });

      await tx.commissionLedger.updateMany({
        where: { payoutBatchId: batchId },
        data: { status: CommissionStatus.REVERSED },
      });

      return b;
    });

    await this.auditService.logAction({
      shareholderId: superAdminId,
      action: 'REVERSE_PAYOUT_BATCH',
      entityType: 'PayoutBatch',
      entityId: batchId,
      oldValue: batch.status,
      newValue: 'REVERSED',
      reason,
    });

    return { success: true, message: `Payout batch ${batchId} marked as REVERSED.`, batch: updatedBatch };
  }

  /**
   * Detailed Financial Reconciliation report for a batch
   */
  async getBatchReconciliation(batchId: string) {
    const batch = await this.prisma.payoutBatch.findUnique({
      where: { id: batchId },
      include: {
        details: true,
        profitLedgers: true,
        commissions: true,
        holdingLedgers: true,
      },
    });

    if (!batch) {
      throw new NotFoundException('Payout batch not found.');
    }

    const detailsSum = batch.details.reduce(
      (acc, d) => ({
        profit: acc.profit + Number(d.grossProfitShare || d.profitAmount),
        gratitude: acc.gratitude + Number(d.grossGratitudeShare || 0),
        withheld: acc.withheld + Number(d.withheldAmount || 0),
        net: acc.net + Number(d.netPayable || d.totalAmount),
      }),
      { profit: 0, gratitude: 0, withheld: 0, net: 0 }
    );

    const profitLedgerTotal = batch.profitLedgers.reduce((sum, p) => sum + Number(p.amount), 0);
    const commissionLedgerTotal = batch.commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const holdingLedgerTotal = batch.holdingLedgers
      .filter((h) => h.type === 'WITHHOLDING')
      .reduce((sum, h) => sum + Number(h.amount), 0);

    const batchTotalNet = Number(batch.totalNetPayable || batch.totalAmount);
    const expectedNet = Math.round((detailsSum.profit + (detailsSum.gratitude - detailsSum.withheld)) * 100) / 100;
    const discrepancy = Math.abs(detailsSum.net - batchTotalNet);

    return {
      batchId: batch.id,
      cycleIdentifier: batch.cycleIdentifier,
      cycleNumber: batch.cycleNumber,
      status: batch.status,
      isBalanced: discrepancy <= 0.05,
      discrepancy,
      variance: discrepancy,
      grossEarnings: Math.round((detailsSum.profit + detailsSum.gratitude) * 100) / 100,
      totalDeductions: Math.round(detailsSum.withheld * 100) / 100,
      netPayable: Math.round(detailsSum.net * 100) / 100,
      batchReported: {
        totalGrossProfit: Number(batch.totalGrossProfit),
        totalGrossGratitude: Number(batch.totalGrossGratitude),
        totalWithheld: Number(batch.totalWithheld),
        totalNetPayable: batchTotalNet,
      },
      detailsSummed: {
        grossProfit: Math.round(detailsSum.profit * 100) / 100,
        grossGratitude: Math.round(detailsSum.gratitude * 100) / 100,
        withheld: Math.round(detailsSum.withheld * 100) / 100,
        netPayable: Math.round(detailsSum.net * 100) / 100,
        expectedNet,
      },
      ledgersSummed: {
        profitLedgerTotal: Math.round(profitLedgerTotal * 100) / 100,
        commissionLedgerTotal: Math.round(commissionLedgerTotal * 100) / 100,
        holdingWithheldTotal: Math.round(holdingLedgerTotal * 100) / 100,
      },
    };
  }

  /**
   * Generates a formal Payout Statement for an individual beneficiary detail
   */
  async getPayoutStatement(payoutDetailId: string) {
    const detail = await this.prisma.payoutDetail.findUnique({
      where: { id: payoutDetailId },
      include: {
        shareholder: true,
        batch: true,
      },
    });

    if (!detail) {
      throw new NotFoundException('Payout detail statement record not found.');
    }

    const breakdownData = {
      isFirstPayout: detail.isFirstPayout,
      activeDays: detail.activeDays,
      dailyRate: detail.dailyRate ? Number(detail.dailyRate) : null,
      prorationBasis: detail.prorationBasis,
      effectiveLevel: detail.effectiveLevel,
      grossProfitShare: Number(detail.grossProfitShare || detail.profitAmount),
      grossGratitudeShare: Number(detail.grossGratitudeShare || 0),
      withheldAmount: Number(detail.withheldAmount || 0),
      deductions: Number(detail.deductions || 0),
      netPayable: Number(detail.netPayable || detail.totalAmount),
    };

    return {
      statementId: detail.id,
      statementNumber: `STMT-${detail.batch.cycleIdentifier || 'CYC'}-${detail.shareholder.shareholderId}`,
      batchId: detail.batchId,
      cycleIdentifier: detail.batch.cycleIdentifier,
      cycleNumber: detail.batch.cycleNumber,
      periodStart: detail.batch.cycleStart,
      periodEnd: detail.batch.cycleEnd,
      cutoffDate: detail.batch.cutoffDate,
      payoutDate: detail.batch.payoutDate,
      batchStatus: detail.batch.status,
      payoutStatus: detail.status,
      shareholder: {
        id: detail.shareholder.id,
        code: detail.shareholder.shareholderId,
        name: detail.shareholder.name,
        phone: detail.shareholder.phone,
        accountType: detail.shareholder.accountType,
        bankName: detail.shareholder.bankName,
        accountNumber: detail.shareholder.bankAccountNumber,
        ifsc: detail.shareholder.bankIfsc,
        branch: detail.shareholder.bankBranch,
      },
      breakdown: breakdownData,
      calculations: breakdownData,
      generatedAt: detail.createdAt,
    };
  }

  /**
   * Paged batch list
   */
  async getBatches(page = 1, limit = 15) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payoutBatch.findMany({
        skip,
        take: limit,
        orderBy: { cycleStart: 'desc' },
        include: {
          _count: { select: { details: true } },
        },
      }),
      this.prisma.payoutBatch.count(),
    ]);

    return {
      data: data.map((b) => ({
        ...b,
        totalNetPayable: Number(b.totalNetPayable || b.totalAmount),
        totalGrossProfit: Number(b.totalGrossProfit || 0),
        totalGrossGratitude: Number(b.totalGrossGratitude || 0),
        totalWithheld: Number(b.totalWithheld || 0),
        totalBeneficiaries: b.totalBeneficiaries || b._count.details,
      })),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * Batch details with all beneficiary lines
   */
  async getBatchDetails(batchId: string) {
    return this.prisma.payoutDetail.findMany({
      where: { batchId },
      include: {
        shareholder: {
          select: {
            id: true,
            shareholderId: true,
            name: true,
            phone: true,
            accountType: true,
            holdingBalance: true,
            currentRank: true,
            bankAccountName: true,
            bankAccountNumber: true,
            bankName: true,
            bankBranch: true,
            bankIfsc: true,
          },
        },
        batch: true,
      },
      orderBy: { netPayable: 'desc' },
    });
  }

  /**
   * Global shareholder payouts ledger with search, filtering, and pagination
   */
  async getAllShareholderPayouts(search?: string, batchId?: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (batchId) where.batchId = batchId;
    if (status) where.status = status;
    if (search) {
      where.shareholder = {
        OR: [
          { shareholderId: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { bankAccountNumber: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total, stats] = await Promise.all([
      this.prisma.payoutDetail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shareholder: {
            select: {
              id: true,
              shareholderId: true,
              name: true,
              phone: true,
              accountType: true,
              currentRank: true,
              bankAccountName: true,
              bankAccountNumber: true,
              bankName: true,
              bankBranch: true,
              bankIfsc: true,
            },
          },
          batch: {
            select: {
              id: true,
              cycleIdentifier: true,
              cycleNumber: true,
              cycleStart: true,
              cycleEnd: true,
              cutoffDate: true,
              payoutDate: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.payoutDetail.count({ where }),
      this.prisma.payoutDetail.aggregate({
        where,
        _sum: {
          profitAmount: true,
          commissionAmount: true,
          totalAmount: true,
          grossProfitShare: true,
          grossGratitudeShare: true,
          withheldAmount: true,
          netPayable: true,
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      summary: {
        totalProfit: Number(stats._sum.grossProfitShare || stats._sum.profitAmount || 0),
        totalCommission: Number(stats._sum.grossGratitudeShare || stats._sum.commissionAmount || 0),
        totalWithheld: Number(stats._sum.withheldAmount || 0),
        totalPayout: Number(stats._sum.netPayable || stats._sum.totalAmount || 0),
      },
    };
  }

  /**
   * Reverse individual commission (Super Admin Only)
   */
  async reverseCommission(commissionId: string, superAdminId: string) {
    const admin = await this.prisma.shareholder.findUnique({ where: { id: superAdminId } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only Super Admins are authorized to reverse commissions.');
    }

    const commission = await this.prisma.commissionLedger.findUnique({ where: { id: commissionId } });
    if (!commission) throw new NotFoundException('Commission record not found.');

    await this.prisma.commissionLedger.update({
      where: { id: commissionId },
      data: { status: CommissionStatus.REVERSED, payoutBatchId: null },
    });

    await this.auditService.logAction({
      shareholderId: superAdminId,
      action: 'REVERSE_COMMISSION',
      entityType: 'CommissionLedger',
      entityId: commissionId,
      oldValue: commission.status,
      newValue: 'REVERSED',
    });

    return { success: true, message: `Commission ${commissionId} reversed.` };
  }

  /**
   * Reprocess individual commission (Super Admin Only)
   */
  async reprocessCommission(commissionId: string, superAdminId: string) {
    const admin = await this.prisma.shareholder.findUnique({ where: { id: superAdminId } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only Super Admins are authorized to reprocess commissions.');
    }

    const commission = await this.prisma.commissionLedger.findUnique({ where: { id: commissionId } });
    if (!commission) throw new NotFoundException('Commission record not found.');

    await this.prisma.commissionLedger.update({
      where: { id: commissionId },
      data: { status: CommissionStatus.PENDING, payoutBatchId: null },
    });

    await this.auditService.logAction({
      shareholderId: superAdminId,
      action: 'REPROCESS_COMMISSION',
      entityType: 'CommissionLedger',
      entityId: commissionId,
      oldValue: commission.status,
      newValue: 'PENDING',
    });

    return { success: true, message: `Commission ${commissionId} reset to PENDING.` };
  }
}
