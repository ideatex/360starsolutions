import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createAnnouncement(data: any, adminId: string) {
    const isScheduled = data.scheduledFor && new Date(data.scheduledFor) > new Date();
    const status = isScheduled ? 'DRAFT' : (data.status || 'PUBLISHED');

    const announcement = await this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl,
        attachmentUrl: data.attachmentUrl,
        priority: data.priority || 'MEDIUM',
        audience: data.audience || 'EVERYONE',
        targetUserId: data.targetUserId,
        pinned: !!data.pinned,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        status,
        createdBy: adminId,
      },
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'CREATE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: announcement.id,
      newValue: JSON.stringify(announcement),
    });

    if (status === 'PUBLISHED') {
      await this.dispatchNotificationsForAnnouncement(announcement);
    }

    return announcement;
  }

  async getAnnouncementsForUser(shareholderId: string, userRole: string) {
    const now = new Date();
    const me = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      select: { id: true, shareholderId: true },
    });
    const customShareholderId = me?.shareholderId;

    // Query active published announcements
    const announcements = await this.prisma.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        AND: [
          { OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        ],
      },
      include: {
        reads: {
          where: { shareholderId },
        },
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Adjust audience filtering by role & targeted IDs explicitly
    return announcements.filter(a => {
      if (a.audience === 'EVERYONE') return true;
      if (a.audience === 'ADMINS') return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      if (a.audience === 'SHAREHOLDERS') return true;
      if (a.audience === 'INDIVIDUAL_USER' || a.audience === 'TARGETED_SHAREHOLDERS') {
        if (!a.targetUserId) return false;
        let targetIds: string[] = [];
        try {
          if (a.targetUserId.trim().startsWith('[')) {
            targetIds = JSON.parse(a.targetUserId);
          } else {
            targetIds = a.targetUserId.split(',').map((s: string) => s.trim());
          }
        } catch {
          targetIds = [a.targetUserId.trim()];
        }
        return targetIds.includes(shareholderId) || (customShareholderId ? targetIds.includes(customShareholderId) : false);
      }
      return true;
    });
  }

  async getAdminAnnouncements() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAnnouncement(id: string, updates: any, adminId: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: updates.title !== undefined ? updates.title : announcement.title,
        content: updates.content !== undefined ? updates.content : announcement.content,
        imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : announcement.imageUrl,
        attachmentUrl: updates.attachmentUrl !== undefined ? updates.attachmentUrl : announcement.attachmentUrl,
        priority: updates.priority !== undefined ? updates.priority : announcement.priority,
        audience: updates.audience !== undefined ? updates.audience : announcement.audience,
        targetUserId: updates.targetUserId !== undefined ? updates.targetUserId : announcement.targetUserId,
        pinned: updates.pinned !== undefined ? !!updates.pinned : announcement.pinned,
        scheduledFor: updates.scheduledFor !== undefined ? (updates.scheduledFor ? new Date(updates.scheduledFor) : null) : announcement.scheduledFor,
        expiresAt: updates.expiresAt !== undefined ? (updates.expiresAt ? new Date(updates.expiresAt) : null) : announcement.expiresAt,
        status: updates.status !== undefined ? updates.status : announcement.status,
      },
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'UPDATE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: id,
      oldValue: JSON.stringify(announcement),
      newValue: JSON.stringify(updated),
    });

    if (announcement.status !== 'PUBLISHED' && updated.status === 'PUBLISHED') {
      await this.dispatchNotificationsForAnnouncement(updated);
    }

    return updated;
  }

  async markAsRead(announcementId: string, shareholderId: string) {
    const existing = await this.prisma.announcementRead.findUnique({
      where: {
        announcementId_shareholderId: { announcementId, shareholderId },
      },
    });
    if (!existing) {
      await this.prisma.announcementRead.create({
        data: { announcementId, shareholderId },
      });
      // Also find corresponding Notification for this shareholder and mark as read
      const notification = await this.prisma.notification.findFirst({
        where: {
          shareholderId,
          title: 'New Announcement',
          message: { contains: announcementId }, // Or matching by message content
        },
      });
      if (notification) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { isRead: true },
        });
      }
    }
    return { success: true };
  }

  async deleteAnnouncement(id: string, adminId: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    await this.prisma.announcement.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'ARCHIVE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: id,
    });

    return { success: true };
  }

  // Cron job to publish scheduled announcements every minute
  @Cron('* * * * *')
  async publishScheduledAnnouncements() {
    const now = new Date();
    const scheduled = await this.prisma.announcement.findMany({
      where: {
        status: 'DRAFT',
        scheduledFor: {
          lte: now,
        },
      },
    });

    for (const a of scheduled) {
      const updated = await this.prisma.announcement.update({
        where: { id: a.id },
        data: { status: 'PUBLISHED' },
      });
      await this.dispatchNotificationsForAnnouncement(updated);
      console.log(`Published scheduled announcement: ${a.title}`);
    }
  }

  private async dispatchNotificationsForAnnouncement(announcement: any) {
    // Determine shareholder list based on audience
    let shareholders: any[] = [];
    if (announcement.audience === 'EVERYONE') {
      shareholders = await this.prisma.shareholder.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    } else if (announcement.audience === 'ADMINS') {
      shareholders = await this.prisma.shareholder.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
        },
        select: { id: true },
      });
    } else if (announcement.audience === 'SHAREHOLDERS') {
      shareholders = await this.prisma.shareholder.findMany({
        where: { role: 'SHAREHOLDER', status: 'ACTIVE' },
        select: { id: true },
      });
    } else if ((announcement.audience === 'INDIVIDUAL_USER' || announcement.audience === 'TARGETED_SHAREHOLDERS') && announcement.targetUserId) {
      let targetIds: string[] = [];
      try {
        if (announcement.targetUserId.trim().startsWith('[')) {
          targetIds = JSON.parse(announcement.targetUserId);
        } else {
          targetIds = announcement.targetUserId.split(',').map((s: string) => s.trim());
        }
      } catch {
        targetIds = [announcement.targetUserId.trim()];
      }
      targetIds = targetIds.filter(Boolean);

      if (targetIds.length > 0) {
        shareholders = await this.prisma.shareholder.findMany({
          where: {
            OR: [
              { id: { in: targetIds } },
              { shareholderId: { in: targetIds } },
            ],
            status: 'ACTIVE',
          },
          select: { id: true },
        });
      }
    }

    const priorityMap: Record<string, any> = {
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
    };

    // Bulk create notifications
    const notificationData = shareholders.map(u => ({
      shareholderId: u.id,
      title: announcement.title,
      message: `${announcement.content.substring(0, 100)}... (Ref: ${announcement.id})`,
      priority: priorityMap[announcement.priority] || 'MEDIUM',
      type: 'SYSTEM' as any,
    }));

    if (notificationData.length > 0) {
      await this.prisma.notification.createMany({
        data: notificationData,
      });
    }
  }
}
