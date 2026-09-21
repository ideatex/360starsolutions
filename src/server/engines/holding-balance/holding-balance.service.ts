import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { Prisma, HoldingLedgerType, AccountType, UserStatus, ContributionStatus } from '@prisma/client';

export const AUTO_CONVERSION_THRESHOLD = 100000; // Rs. 1,00,000
export const ZERO_CONTRIBUTION_WITHHOLDING_RATE = 0.20; // 20%

export interface WithholdingResult {
  shareholderId: string;
  grossAmount: number;
  withholdingRate: number;
  withheldAmount: number;
  netPayable: number;
  holdingBalanceBefore: number;
  holdingBalanceAfter: number;
  autoConverted: boolean;
  convertedContributionId?: string;
}

@Injectable()
export class HoldingBalanceService {
  private readonly logger = new Logger(HoldingBalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Applies Gratitude Share withholding rule according to Product 360:
   * - If account is ZERO_CONTRIBUTION:
   *     withhold 20% into holdingBalance
   *     pay out 80%
   *     if holdingBalance reaches >= Rs. 1,00,000, trigger auto-conversion
   * - If account is standard CONTRIBUTION:
   *     withhold 0%
   *     pay out 100%
   */
  async processCommissionWithholding(
    shareholderId: string,
    grossCommissionAmount: number,
    payoutBatchId?: string,
  ): Promise<WithholdingResult> {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
    });

    if (!shareholder) {
      throw new NotFoundException(`Shareholder ${shareholderId} not found`);
    }

    const currentBalance = Number(shareholder.holdingBalance || 0);

    // Standard contribution accounts receive 100% with no withholding
    if (shareholder.accountType !== AccountType.ZERO_CONTRIBUTION) {
      return {
        shareholderId,
        grossAmount: grossCommissionAmount,
        withholdingRate: 0,
        withheldAmount: 0,
        netPayable: grossCommissionAmount,
        holdingBalanceBefore: currentBalance,
        holdingBalanceAfter: currentBalance,
        autoConverted: false,
      };
    }

    // Zero-Contribution account dynamic withholding
    const withholdingPercent = Number((shareholder as any).withholdingPercentage ?? 20);
    const withholdingRate = withholdingPercent / 100;
    const withheldAmount = Math.round(grossCommissionAmount * withholdingRate * 100) / 100;
    const netPayable = Math.round((grossCommissionAmount - withheldAmount) * 100) / 100;
    const newBalance = Math.round((currentBalance + withheldAmount) * 100) / 100;

    // Persist withholding in HoldingLedger and update Shareholder holdingBalance
    await this.prisma.$transaction(async (tx) => {
      await tx.shareholder.update({
        where: { id: shareholderId },
        data: {
          holdingBalance: new Prisma.Decimal(newBalance),
        },
      });

      if (withheldAmount > 0) {
        await tx.holdingLedger.create({
          data: {
            shareholderId,
            payoutBatchId: payoutBatchId || null,
            amount: new Prisma.Decimal(withheldAmount),
            balanceBefore: new Prisma.Decimal(currentBalance),
            balanceAfter: new Prisma.Decimal(newBalance),
            type: HoldingLedgerType.WITHHOLDING,
            remarks: `${withholdingPercent}% Gratitude Share withholding for Zero-Contribution account. Batch: ${payoutBatchId || 'MANUAL'}`,
          },
        });
      }
    });

    this.logger.log(
      `Applied ${withholdingPercent}% withholding on ₹${grossCommissionAmount} for Zero-Contribution user ${shareholder.shareholderId}. Withheld: ₹${withheldAmount}, New Holding Balance: ₹${newBalance}`
    );

    // Check Auto-Conversion Threshold (>= ₹1,00,000)
    let autoConverted = false;
    let convertedContributionId: string | undefined;

    if (newBalance >= AUTO_CONVERSION_THRESHOLD) {
      const conversionResult = await this.triggerAutoConversion(shareholderId);
      autoConverted = true;
      convertedContributionId = conversionResult.contributionId;
    }

    const updatedShareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: { holdingBalance: true },
    });

    return {
      shareholderId,
      grossAmount: grossCommissionAmount,
      withholdingRate: ZERO_CONTRIBUTION_WITHHOLDING_RATE,
      withheldAmount,
      netPayable,
      holdingBalanceBefore: currentBalance,
      holdingBalanceAfter: Number(updatedShareholder?.holdingBalance || 0),
      autoConverted,
      convertedContributionId,
    };
  }

  /**
   * Auto-converts accumulated Holding Balance into a full active Contribution Fund
   * when threshold of Rs. 1,00,000 is met.
   * Decrements holdingBalance by Rs. 1,00,000, creates approved Contribution,
   * updates accountType to CONTRIBUTION and status to CONTRIBUTION_ACTIVE.
   */
  async triggerAutoConversion(shareholderId: string, actorId = 'SYSTEM') {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
    });

    if (!shareholder) {
      throw new NotFoundException(`Shareholder ${shareholderId} not found`);
    }

    const currentBalance = Number(shareholder.holdingBalance || 0);
    if (currentBalance < AUTO_CONVERSION_THRESHOLD) {
      throw new BadRequestException(
        `Holding balance (₹${currentBalance.toLocaleString('en-IN')}) is below threshold of ₹${AUTO_CONVERSION_THRESHOLD.toLocaleString('en-IN')}`
      );
    }

    const balanceAfterConversion = Math.round((currentBalance - AUTO_CONVERSION_THRESHOLD) * 100) / 100;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create approved Contribution fund of Rs. 1,00,000
      const contribution = await tx.contribution.create({
        data: {
          shareholderId,
          amount: new Prisma.Decimal(AUTO_CONVERSION_THRESHOLD),
          mode: 'HOLDING_ACTIVATION',
          date: new Date(),
          effectiveDate: new Date(),
          activeDate: new Date(),
          status: ContributionStatus.APPROVED,
          isAutoConverted: true,
          approvedById: actorId,
          approvedAt: new Date(),
          validityMonths: 12,
        },
      });

      // 2. Update Shareholder holding balance and transition state to active contributor
      await tx.shareholder.update({
        where: { id: shareholderId },
        data: {
          holdingBalance: new Prisma.Decimal(balanceAfterConversion),
          accountType: AccountType.CONTRIBUTION,
          status: UserStatus.CONTRIBUTION_ACTIVE,
        },
      });

      // 3. Append-only ledger record for AUTO_CONVERSION
      await tx.holdingLedger.create({
        data: {
          shareholderId,
          amount: new Prisma.Decimal(AUTO_CONVERSION_THRESHOLD),
          balanceBefore: new Prisma.Decimal(currentBalance),
          balanceAfter: new Prisma.Decimal(balanceAfterConversion),
          type: HoldingLedgerType.AUTO_CONVERSION,
          remarks: `Auto-converted ₹${AUTO_CONVERSION_THRESHOLD.toLocaleString('en-IN')} holding balance into active Contribution Fund #${contribution.id}`,
        },
      });

      // 4. Record audit log
      await this.auditService.logAction({
        action: 'HOLDING_AUTO_CONVERSION',
        entityType: 'Shareholder',
        entityId: shareholderId,
        oldValue: `Balance: ₹${currentBalance}, Type: ${shareholder.accountType}, Status: ${shareholder.status}`,
        newValue: `Balance: ₹${balanceAfterConversion}, Type: ${AccountType.CONTRIBUTION}, Status: ${UserStatus.CONTRIBUTION_ACTIVE}, ContributionId: ${contribution.id}`,
      });

      this.logger.log(
        `SUCCESS: Auto-converted ₹${AUTO_CONVERSION_THRESHOLD} for user ${shareholder.shareholderId}. Account is now CONTRIBUTION_ACTIVE.`
      );

      return {
        success: true,
        contributionId: contribution.id,
        convertedAmount: AUTO_CONVERSION_THRESHOLD,
        balanceRemaining: balanceAfterConversion,
      };
    });
  }

  /**
   * Get holding balance summary and progress toward Rs. 1,00,000 auto-activation
   */
  async getHoldingSummary(shareholderId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: {
        id: true,
        shareholderId: true,
        name: true,
        accountType: true,
        status: true,
        holdingBalance: true,
      },
    });

    if (!shareholder) {
      throw new NotFoundException(`Shareholder ${shareholderId} not found`);
    }

    const currentBalance = Number(shareholder.holdingBalance || 0);
    const progressPercentage = Math.min(100, Math.round((currentBalance / AUTO_CONVERSION_THRESHOLD) * 10000) / 100);
    const shortfall = Math.max(0, AUTO_CONVERSION_THRESHOLD - currentBalance);

    const totalWithheldAgg = await this.prisma.holdingLedger.aggregate({
      where: {
        shareholderId,
        type: HoldingLedgerType.WITHHOLDING,
      },
      _sum: { amount: true },
    });

    const totalConvertedAgg = await this.prisma.holdingLedger.aggregate({
      where: {
        shareholderId,
        type: HoldingLedgerType.AUTO_CONVERSION,
      },
      _sum: { amount: true },
    });

    return {
      shareholderId: shareholder.id,
      accountType: shareholder.accountType,
      status: shareholder.status,
      currentHoldingBalance: currentBalance,
      targetActivationThreshold: AUTO_CONVERSION_THRESHOLD,
      progressPercentage,
      shortfall,
      totalWithheldHistorical: Number(totalWithheldAgg._sum.amount || 0),
      totalConvertedHistorical: Number(totalConvertedAgg._sum.amount || 0),
      isEligibleForConversion: currentBalance >= AUTO_CONVERSION_THRESHOLD,
    };
  }

  /**
   * Get append-only holding ledger history for a shareholder
   */
  async getHoldingLedgerHistory(shareholderId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.holdingLedger.findMany({
        where: { shareholderId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.holdingLedger.count({ where: { shareholderId } }),
    ]);

    return {
      items,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
}
