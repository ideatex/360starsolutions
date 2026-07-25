import { Injectable } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(data: {
    shareholderId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: string;
    newValue?: string;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data,
    });
  }

  private getDateRangeForPeriod(period?: string, startDate?: string, endDate?: string) {
    if (startDate || endDate) {
      return {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const now = new Date();
    if (period === 'this_week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      return { gte: startOfWeek };
    }

    if (period === 'last_week') {
      const startOfLastWeek = new Date(now);
      const day = startOfLastWeek.getDay();
      const diff = startOfLastWeek.getDate() - day + (day === 0 ? -6 : 1) - 7;
      startOfLastWeek.setDate(diff);
      startOfLastWeek.setHours(0, 0, 0, 0);

      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);

      return { gte: startOfLastWeek, lte: endOfLastWeek };
    }

    if (period === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { gte: startOfMonth };
    }

    if (period === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { gte: startOfLastMonth, lte: endOfLastMonth };
    }

    return undefined;
  }

  async getLogs(page = 1, limit = 50, period?: string, startDate?: string, endDate?: string) {
    const skip = (page - 1) * limit;
    const dateFilter = this.getDateRangeForPeriod(period, startDate, endDate);
    const where = dateFilter ? { createdAt: dateFilter } : {};

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      period,
    };
  }

  async exportLogs(period?: string, startDate?: string, endDate?: string) {
    const dateFilter = this.getDateRangeForPeriod(period, startDate, endDate);
    const where = dateFilter ? { createdAt: dateFilter } : {};

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Shareholder ID', 'Old Value', 'New Value', 'IP Address'];
    const rows = logs.map(log => [
      log.id,
      new Date(log.createdAt).toISOString(),
      `"${(log.action || '').replace(/"/g, '""')}"`,
      `"${(log.entityType || '').replace(/"/g, '""')}"`,
      `"${(log.entityId || '').replace(/"/g, '""')}"`,
      `"${(log.shareholderId || '').replace(/"/g, '""')}"`,
      `"${(log.oldValue || '').replace(/"/g, '""')}"`,
      `"${(log.newValue || '').replace(/"/g, '""')}"`,
      `"${(log.ipAddress || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    return {
      period: period || 'all',
      count: logs.length,
      csv: csvContent,
      logs,
    };
  }
}
