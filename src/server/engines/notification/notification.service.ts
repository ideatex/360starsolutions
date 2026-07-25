import { Injectable } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: { shareholderId: string; title: string; message: string; type?: any; priority?: any }) {
    return this.prisma.notification.create({
      data: {
        shareholderId: data.shareholderId,
        title: data.title,
        message: data.message,
        type: data.type || 'SYSTEM',
        priority: data.priority || 'MEDIUM',
      },
    });
  }

  async getUserNotifications(shareholderId: string) {
    return this.prisma.notification.findMany({
      where: { 
        shareholderId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(shareholderId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, shareholderId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(shareholderId: string) {
    return this.prisma.notification.updateMany({
      where: { shareholderId, isRead: false },
      data: { isRead: true },
    });
  }

  async archiveNotification(shareholderId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, shareholderId },
      data: { isArchived: true },
    });
  }

  async deleteNotification(shareholderId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, shareholderId },
      data: { isDeleted: true },
    });
  }
}
