import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { convertToCSV } from '@server/engines/report/reports-export.utility';
import { Prisma, UserStatus } from '@prisma/client';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboardMetrics() {
    const activeShareholders = await this.prisma.shareholder.count({ where: { status: 'ACTIVE' } });
    const totalShareholders = await this.prisma.shareholder.count();
    
    const activeCapital = await this.prisma.investment.aggregate({
      where: { shareholder: { status: 'ACTIVE' } },
      _sum: { amount: true },
    });

    const overallCapital = await this.prisma.investment.aggregate({
      _sum: { amount: true },
    });

    const grossPayouts = await this.prisma.profitLedger.aggregate({
      _sum: { amount: true },
    });

    const releasedFunds = await this.prisma.payoutBatch.aggregate({
      where: { status: 'RELEASED' },
      _sum: { totalAmount: true },
    });

    return {
      activeShareholders,
      totalShareholders,
      activeCapital: Number(activeCapital._sum.amount || 0),
      overallCapital: Number(overallCapital._sum.amount || 0),
      grossPayouts: Number(grossPayouts._sum.amount || 0),
      releasedFunds: Number(releasedFunds._sum.totalAmount || 0),
    };
  }

  private sortResult(result: any[], sortBy?: string, sortOrder?: string, defaultSort = 'createdAt') {
    const field = sortBy || defaultSort;
    const order = sortOrder === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      let vA = a[field];
      let vB = b[field];

      if (vA instanceof Date) vA = vA.getTime();
      if (vB instanceof Date) vB = vB.getTime();

      if (vA < vB) return -1 * order;
      if (vA > vB) return 1 * order;
      return 0;
    });

    return result;
  }

  async getUsersReport(filters: any = {}) {
    const where: Prisma.ShareholderWhereInput = {};
    
    if (filters.status) where.status = filters.status as UserStatus;
    
    // Only fetch SHAREHOLDERs by default in the admin users dashboard, unless they filter by a specific role
    if (filters.role) {
      where.role = filters.role;
    } else {
      where.role = 'SHAREHOLDER';
    }

    if (filters.month) {
      const [y, m] = filters.month.split('-');
      const start = new Date(Number(y), Number(m) - 1, 1);
      const end = new Date(Number(y), Number(m), 1);
      where.createdAt = { gte: start, lt: end };
    }

    if (filters.search) {
      where.OR = [
        { shareholderId: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.agreementIssued === 'true' || filters.chequeIssued === 'true') {
      where.contributions = { some: {} };
      if (filters.agreementIssued === 'true') (where.contributions.some as any).issuedAgreement = true;
      if (filters.chequeIssued === 'true') (where.contributions.some as any).issuedCheque = true;
    }

    const shareholders = await this.prisma.shareholder.findMany({
      where,
      include: {
        investments: { where: { status: 'ACTIVE' } },
        children: true,
      },
    });

    let result = shareholders.map(u => ({
      id: u.id,
      name: u.name,
      shareholderId: u.shareholderId,
      phone: u.phone ?? '',
      role: u.role,
      status: u.status,
      activeInvestmentsCount: u.investments.length,
      activeInvestmentsVolume: u.investments.reduce((sum, inv) => sum + Number(inv.amount), 0),
      referralsCount: u.children.length,
      createdAt: u.createdAt,
    }));

    if (filters.minAmount) result = result.filter(u => u.activeInvestmentsVolume >= Number(filters.minAmount));
    if (filters.maxAmount) result = result.filter(u => u.activeInvestmentsVolume <= Number(filters.maxAmount));

    return this.sortResult(result, filters.sortBy, filters.sortOrder);
  }

  async getInvestmentsReport(filters: any = {}) {
    const where: Prisma.InvestmentWhereInput = {};

    if (filters.status) where.status = filters.status as any;
    if (filters.month) {
      const [y, m] = filters.month.split('-');
      const start = new Date(Number(y), Number(m) - 1, 1);
      const end = new Date(Number(y), Number(m), 1);
      where.startDate = { gte: start, lt: end };
    }

    if (filters.search) {
      where.shareholder = {
        OR: [
          { shareholderId: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } },
        ]
      };
    }
    
    // In our system, Investments map 1:1 with Contributions but are separate. 
    // If they filter by cheque/agreement on investments, we filter the shareholder's contributions.
    if (filters.agreementIssued === 'true' || filters.chequeIssued === 'true') {
      where.shareholder = where.shareholder || {};
      where.shareholder.contributions = { some: {} };
      if (filters.agreementIssued === 'true') (where.shareholder.contributions.some as any).issuedAgreement = true;
      if (filters.chequeIssued === 'true') (where.shareholder.contributions.some as any).issuedCheque = true;
    }

    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = Number(filters.minAmount);
      if (filters.maxAmount) where.amount.lte = Number(filters.maxAmount);
    }

    const investments = await this.prisma.investment.findMany({
      where,
      include: { shareholder: { select: { shareholderId: true, name: true } } },
    });

    let result = investments.map(i => ({
      id: i.id,
      userShareholderId: i.shareholder.shareholderId,
      userName: i.shareholder.name,
      amount: Number(i.amount),
      dailyProfitRate: Number(i.dailyProfitRate),
      status: i.status,
      startDate: i.startDate,
      createdAt: i.createdAt,
    }));

    return this.sortResult(result, filters.sortBy, filters.sortOrder);
  }

  async getProfitsReport(filters: any = {}) {
    const where: Prisma.ProfitLedgerWhereInput = {};

    if (filters.month) {
      const [y, m] = filters.month.split('-');
      const start = new Date(Number(y), Number(m) - 1, 1);
      const end = new Date(Number(y), Number(m), 1);
      where.createdAt = { gte: start, lt: end };
    }

    if (filters.search) {
      where.shareholder = {
        OR: [
          { shareholderId: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } },
        ]
      };
    }

    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = Number(filters.minAmount);
      if (filters.maxAmount) where.amount.lte = Number(filters.maxAmount);
    }

    const profits = await this.prisma.profitLedger.findMany({
      where,
      include: { shareholder: { select: { shareholderId: true, name: true } }, investment: { select: { amount: true } } },
    });

    let result = profits.map(p => ({
      id: p.id,
      userShareholderId: p.shareholder.shareholderId,
      userName: p.shareholder.name,
      investmentAmount: Number(p.investment.amount),
      cycleStart: p.cycleStart,
      cycleEnd: p.cycleEnd,
      eligibleDays: p.eligibleDays,
      amount: Number(p.amount),
      createdAt: p.createdAt,
    }));

    return this.sortResult(result, filters.sortBy, filters.sortOrder);
  }

  async getCommissionsReport(filters: any = {}) {
    const where: Prisma.CommissionLedgerWhereInput = {};

    if (filters.month) {
      const [y, m] = filters.month.split('-');
      const start = new Date(Number(y), Number(m) - 1, 1);
      const end = new Date(Number(y), Number(m), 1);
      where.createdAt = { gte: start, lt: end };
    }

    if (filters.search) {
      where.shareholder = {
        OR: [
          { shareholderId: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } },
        ]
      };
    }

    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = Number(filters.minAmount);
      if (filters.maxAmount) where.amount.lte = Number(filters.maxAmount);
    }

    const commissions = await this.prisma.commissionLedger.findMany({
      where,
      include: {
        shareholder: { select: { shareholderId: true, name: true } },
        sourceShareholder: { select: { shareholderId: true, name: true } },
        fromInvestment: { include: { shareholder: { select: { shareholderId: true, name: true } } } },
      },
    });

    let result = commissions.map(c => ({
      id: c.id,
      recipientShareholderId: c.shareholder.shareholderId,
      recipientName: c.shareholder.name,
      sourceShareholderId: c.sourceShareholder?.shareholderId || c.fromInvestment?.shareholder?.shareholderId || 'N/A',
      sourceName: c.sourceShareholder?.name || c.fromInvestment?.shareholder?.name || 'N/A',
      investmentAmount: c.fromInvestment ? Number(c.fromInvestment.amount) : 0,
      level: c.level,
      rate: Number(c.rate),
      amount: Number(c.amount),
      status: c.status,
      createdAt: c.createdAt,
    }));

    return this.sortResult(result, filters.sortBy, filters.sortOrder);
  }

  async getExportFile(type: string, filters: any = {}): Promise<{ data: string; filename: string }> {
    let reportData: any[] = [];
    const date = new Date().toISOString().split('T')[0];

    switch (type) {
      case 'shareholders':
        reportData = await this.getUsersReport(filters);
        break;
      case 'investments':
        reportData = await this.getInvestmentsReport(filters);
        break;
      case 'profits':
        reportData = await this.getProfitsReport(filters);
        break;
      case 'commissions':
        reportData = await this.getCommissionsReport(filters);
        break;
      default:
        throw new BadRequestException('Invalid report type');
    }

    const csv = convertToCSV(reportData);
    return {
      data: csv,
      filename: `${type}_report_${date}.csv`,
    };
  }
}
