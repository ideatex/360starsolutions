import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BusinessConfigService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    const count = await this.prisma.businessConfiguration.count();
    if (count === 0) {
      await this.prisma.businessConfiguration.create({
        data: {
          version: 1,
          userIdPrefix: 'SH',
          userIdStartingNumber: 100001,
          userIdNextNumber: 100001,
          userIdLength: 6,
          levelOpeningVolume: {
            "1": 10000,
            "2": 25000,
            "3": 50000,
          },
          profitSharingPercentage: new Prisma.Decimal('0.1000'),
          levelWiseProfitSharing: {
            "1": 0.05,
            "2": 0.03,
            "3": 0.02,
          },
          referralLevelSettings: {
            levels: 7,
          },
          systemDefaults: {
            daily_profit_rate: "0.0033",
            payout_cycle_days: 30,
          },
          futureBusinessParameters: {},
          createdById: 'system',
        },
      });
      console.log('Seeded initial BusinessConfiguration (version 1)');
    }

    const profitConfigCount = await this.prisma.profitConfiguration.count();
    if (profitConfigCount === 0) {
      await this.prisma.profitConfiguration.create({
        data: {
          version: 1,
          maxReferralLevels: 7,
          levelOpeningVolumes: {
            "1": 10000,
            "2": 25000,
            "3": 50000,
          },
          levelPercentages: {
            "1": 0.05,
            "2": 0.03,
            "3": 0.02,
          },
          status: 'ACTIVE',
          effectiveDate: new Date(),
        },
      });
      console.log('Seeded initial ProfitConfiguration (version 1)');
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

  async getVersionHistory() {
    return this.prisma.businessConfiguration.findMany({
      orderBy: { version: 'desc' },
    });
  }

  async createNewVersion(data: any, adminId: string) {
    const latest = await this.getLatest();
    const nextVersion = latest.version + 1;

    // Use current userIdNextNumber from the database to keep continuity
    const nextNum = data.resetCounter ? 1 : latest.userIdNextNumber;

    const newConfig = await this.prisma.businessConfiguration.create({
      data: {
        version: nextVersion,
        userIdPrefix: data.userIdPrefix ?? latest.userIdPrefix,
        userIdStartingNumber: data.userIdStartingNumber ?? latest.userIdStartingNumber,
        userIdNextNumber: nextNum,
        userIdLength: data.userIdLength ?? latest.userIdLength,
        levelOpeningVolume: data.levelOpeningVolume ?? latest.levelOpeningVolume ?? Prisma.JsonNull,
        profitSharingPercentage: data.profitSharingPercentage 
          ? new Prisma.Decimal(data.profitSharingPercentage) 
          : latest.profitSharingPercentage,
        levelWiseProfitSharing: data.levelWiseProfitSharing ?? latest.levelWiseProfitSharing ?? Prisma.JsonNull,
        referralLevelSettings: data.referralLevelSettings ?? latest.referralLevelSettings ?? Prisma.JsonNull,
        systemDefaults: data.systemDefaults ?? latest.systemDefaults ?? Prisma.JsonNull,
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

      // Update the running number on the latest record
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
