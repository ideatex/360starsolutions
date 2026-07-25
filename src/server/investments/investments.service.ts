import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { SystemSettingsService } from '@server/system-settings/system-settings.service';
import { CommissionService } from '@server/engines/commission/commission.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { InvestmentStatus } from '@prisma/client';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SystemSettingsService,
    private readonly commissionService: CommissionService,
    private readonly auditService: AuditService,
  ) {}

  async createInvestment(shareholderId: string, amount: number, startDateStr?: string) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!shareholder) {
      throw new NotFoundException('Shareholder not found');
    }
    if (shareholder.status !== 'ACTIVE') {
      throw new BadRequestException('Inactive or blocked shareholders cannot create investments');
    }
    if (amount <= 0) {
      throw new BadRequestException('Investment amount must be greater than zero');
    }

    const defaultRate = await this.settingsService.get('daily_profit_rate', '0.0033');
    const startDate = startDateStr ? new Date(startDateStr) : new Date();

    const investment = await this.prisma.investment.create({
      data: {
        shareholderId,
        amount,
        dailyProfitRate: Number(defaultRate),
        status: 'ACTIVE', // Automatically active as per standard workflow
        startDate,
      },
    });

    // Run commission calculation immediately
    await this.commissionService.calculateCommissionsForInvestment(investment.id);

    // Audit Log
    await this.auditService.logAction({
      shareholderId,
      action: 'CREATE_INVESTMENT',
      entityType: 'Investment',
      entityId: investment.id,
      newValue: JSON.stringify({ amount, startDate, status: 'ACTIVE' }),
    });

    return investment;
  }

  async getInvestments(shareholderId?: string, status?: InvestmentStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (shareholderId) where.shareholderId = shareholderId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.investment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { shareholder: { select: { shareholderId: true } } },
      }),
      this.prisma.investment.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getInvestmentDetails(id: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id },
      include: { shareholder: { select: { shareholderId: true, id: true } } },
    });
    if (!investment) {
      throw new NotFoundException('Investment not found');
    }
    return investment;
  }

  async updateInvestment(id: string, updates: { startDate?: string; status?: InvestmentStatus; dailyProfitRate?: number }, adminId: string) {
    const investment = await this.prisma.investment.findUnique({ where: { id } });
    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    const data: any = {};
    if (updates.startDate) data.startDate = new Date(updates.startDate);
    if (updates.status) data.status = updates.status;
    if (updates.dailyProfitRate !== undefined) data.dailyProfitRate = updates.dailyProfitRate;

    const updated = await this.prisma.investment.update({
      where: { id },
      data,
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'UPDATE_INVESTMENT',
      entityType: 'Investment',
      entityId: id,
      oldValue: JSON.stringify({
        startDate: investment.startDate,
        status: investment.status,
        dailyProfitRate: Number(investment.dailyProfitRate),
      }),
      newValue: JSON.stringify(updates),
    });

    return updated;
  }

  async deleteInvestment(id: string, adminId: string) {
    const investment = await this.prisma.investment.findUnique({ where: { id } });
    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    // Instead of raw delete, mark as CANCELLED or CLOSED as per soft delete guidelines
    const cancelled = await this.prisma.investment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'CANCEL_INVESTMENT',
      entityType: 'Investment',
      entityId: id,
      oldValue: investment.status,
      newValue: 'CANCELLED',
    });

    return cancelled;
  }
}
