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

  async getShareholderSummaryReport(filters: any = {}) {
    const where: Prisma.ShareholderWhereInput = {};
    if (filters.status) where.status = filters.status as UserStatus;
    if (filters.search) {
      where.OR = [
        { shareholderId: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
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
        contributions: true,
        profitLedgers: true,
        commissionLedgers: true,
      },
    });

    let result = shareholders.map((u) => {
      const activeFund = u.investments.reduce((acc, inv) => acc + Number(inv.amount), 0);
      const overallProfit = u.profitLedgers.reduce((acc, p) => acc + Number(p.amount), 0);
      const overallCommission = u.commissionLedgers.reduce((acc, c) => acc + Number(c.amount), 0);
      const overallPayout = overallProfit + overallCommission;
      const chequeIssued = u.contributions.some((c) => c.issuedCheque) ? 'Yes' : 'No';
      const agreementIssued = u.contributions.some((c) => c.issuedAgreement) ? 'Yes' : 'No';

      const fullAddress = [
        u.addressBuilding,
        u.addressArea,
        u.addressCity,
        u.addressDistrict,
        u.addressState,
        u.addressPincode,
      ].filter(Boolean).join(', ');

      return {
        id: u.id,
        shareholderId: u.shareholderId,
        name: u.name,
        activeContributionFund: activeFund,
        phone: u.phone || '-',
        dob: u.dob ? new Date(u.dob).toLocaleDateString('en-IN') : '-',
        address: fullAddress || '-',
        bankName: u.bankName || '-',
        bankAccountNumber: u.bankAccountNumber || '-',
        bankBranch: u.bankBranch || '-',
        bankIfsc: u.bankIfsc || '-',
        chequeIssued,
        agreementIssued,
        status: u.status,
        overallProfit,
        overallCommission,
        overallPayout,
        createdAt: u.createdAt,
      };
    });

    return this.sortResult(result, filters.sortBy, filters.sortOrder, 'shareholderId');
  }

  async getTransactionReport(filters: any = {}) {
    const contrWhere: Prisma.ContributionWhereInput = { status: 'APPROVED' };
    const withWhere: Prisma.WithdrawalWhereInput = {};

    if (filters.search) {
      const query = filters.search.trim();
      contrWhere.shareholder = {
        OR: [
          { shareholderId: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      };
      withWhere.OR = [
        { withdrawalId: { contains: query, mode: 'insensitive' } },
        { shareholder: { shareholderId: { contains: query, mode: 'insensitive' } } },
        { shareholder: { name: { contains: query, mode: 'insensitive' } } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      contrWhere.createdAt = {};
      withWhere.createdAt = {};
      if (filters.startDate) {
        contrWhere.createdAt.gte = new Date(filters.startDate);
        withWhere.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        contrWhere.createdAt.lte = new Date(filters.endDate);
        withWhere.createdAt.lte = new Date(filters.endDate);
      }
    }

    let contributionsList: any[] = [];
    let withdrawalsList: any[] = [];

    if (!filters.type || filters.type === 'Contribution Fund') {
      contributionsList = await this.prisma.contribution.findMany({
        where: contrWhere,
        include: { shareholder: { select: { shareholderId: true, name: true } } },
      });
    }

    if (!filters.type || filters.type === 'Withdrawal') {
      withdrawalsList = await this.prisma.withdrawal.findMany({
        where: withWhere,
        include: { shareholder: { select: { shareholderId: true, name: true } } },
      });
    }

    const contrMapped = contributionsList.map((c) => ({
      transactionId: `CON-${c.id.substring(0, 8).toUpperCase()}`,
      shareholderId: c.shareholder?.shareholderId || '-',
      shareholderName: c.shareholder?.name || '-',
      type: 'Contribution Fund',
      amount: Number(c.amount),
      date: c.createdAt,
      activeContributionFund: Number(c.amount),
    }));

    const withMapped = withdrawalsList.map((w) => ({
      transactionId: w.withdrawalId,
      shareholderId: w.shareholder?.shareholderId || '-',
      shareholderName: w.shareholder?.name || '-',
      type: 'Withdrawal',
      amount: Number(w.amount),
      date: w.createdAt,
      activeContributionFund: Number(w.remainingActiveFund),
    }));

    let merged = [...contrMapped, ...withMapped];
    return this.sortResult(merged, filters.sortBy || 'date', filters.sortOrder || 'desc', 'date');
  }

  async getPayoutCycleReport(filters: any = {}) {
    const where: Prisma.PayoutDetailWhereInput = {};

    if (filters.batchId) {
      where.batchId = filters.batchId;
    }

    if (filters.search) {
      where.shareholder = {
        OR: [
          { shareholderId: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const details = await this.prisma.payoutDetail.findMany({
      where,
      include: {
        shareholder: {
          select: {
            id: true,
            shareholderId: true,
            name: true,
            bankName: true,
            bankAccountNumber: true,
            bankIfsc: true,
          },
        },
        batch: {
          select: {
            id: true,
            cycleStart: true,
            cycleEnd: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const shareholderIds = details.map((d) => d.shareholderId);
    const batchIds = Array.from(new Set(details.map((d) => d.batchId)));

    const levelCommissions = await this.prisma.commissionLedger.findMany({
      where: {
        shareholderId: { in: shareholderIds },
        payoutBatchId: { in: batchIds },
      },
    });

    const levelMap = new Map<string, Record<number, number>>();
    for (const c of levelCommissions) {
      const key = `${c.payoutBatchId}_${c.shareholderId}`;
      if (!levelMap.has(key)) {
        levelMap.set(key, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });
      }
      const mapObj = levelMap.get(key)!;
      if (c.level >= 1 && c.level <= 7) {
        mapObj[c.level] = (mapObj[c.level] || 0) + Number(c.amount);
      }
    }

    let result = details.map((d) => {
      const key = `${d.batchId}_${d.shareholderId}`;
      const levels = levelMap.get(key) || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
      const profit = Number(d.profitAmount);
      const l1 = levels[1] || 0;
      const l2 = levels[2] || 0;
      const l3 = levels[3] || 0;
      const l4 = levels[4] || 0;
      const l5 = levels[5] || 0;
      const l6 = levels[6] || 0;
      const l7 = levels[7] || 0;

      const totalCommission = l1 + l2 + l3 + l4 + l5 + l6 + l7;
      const totalPayout = profit + totalCommission;

      return {
        id: d.id,
        shareholderId: d.shareholder?.shareholderId || '-',
        shareholderName: d.shareholder?.name || '-',
        cycleRange: d.batch
          ? `${new Date(d.batch.cycleStart).toLocaleDateString()} - ${new Date(d.batch.cycleEnd).toLocaleDateString()}`
          : '-',
        payoutDate: d.createdAt,
        bankName: d.shareholder?.bankName || '-',
        bankAccountNumber: d.shareholder?.bankAccountNumber || '-',
        bankIfsc: d.shareholder?.bankIfsc || '-',
        profitAmount: profit,
        l1Commission: l1,
        l2Commission: l2,
        l3Commission: l3,
        l4Commission: l4,
        l5Commission: l5,
        l6Commission: l6,
        l7Commission: l7,
        totalCommission,
        totalPayout,
        status: d.status,
      };
    });

    return this.sortResult(result, filters.sortBy, filters.sortOrder, 'shareholderId');
  }
}
