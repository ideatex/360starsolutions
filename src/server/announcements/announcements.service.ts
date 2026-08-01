import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { MessagingGateway } from '@server/messaging/messaging.gateway';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly messagingGateway: MessagingGateway,
  ) { }

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
      if (a.audience === 'SHAREHOLDERS') return userRole === 'SHAREHOLDER';
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
        const normalizedTargets = targetIds.map(t => String(t).trim().toLowerCase());
        const matchId = shareholderId.toLowerCase();
        const matchCustomId = customShareholderId ? customShareholderId.toLowerCase() : null;

        return normalizedTargets.includes(matchId) || (matchCustomId ? normalizedTargets.includes(matchCustomId) : false);
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

    if (updated.status === 'PUBLISHED') {
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
          message: { contains: announcementId },
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
    let shareholders: any[] = [];

    if (announcement.audience === 'EVERYONE') {
      shareholders = await this.prisma.shareholder.findMany({
        where: { status: { notIn: ['DELETED', 'AUTO_ARCHIVED'] } },
        select: { id: true, shareholderId: true },
      });
    } else if (announcement.audience === 'ADMINS') {
      shareholders = await this.prisma.shareholder.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: { notIn: ['DELETED', 'AUTO_ARCHIVED'] },
        },
        select: { id: true, shareholderId: true },
      });
    } else if (announcement.audience === 'SHAREHOLDERS') {
      shareholders = await this.prisma.shareholder.findMany({
        where: {
          role: 'SHAREHOLDER',
          status: { notIn: ['DELETED', 'AUTO_ARCHIVED'] },
        },
        select: { id: true, shareholderId: true },
      });
    } else if ((announcement.audience === 'INDIVIDUAL_USER' || announcement.audience === 'TARGETED_SHAREHOLDERS') && announcement.targetUserId) {
      let rawTargetIds: string[] = [];
      try {
        if (announcement.targetUserId.trim().startsWith('[')) {
          rawTargetIds = JSON.parse(announcement.targetUserId);
        } else {
          rawTargetIds = announcement.targetUserId.split(',').map((s: string) => s.trim());
        }
      } catch {
        rawTargetIds = [announcement.targetUserId.trim()];
      }
      rawTargetIds = rawTargetIds.map(s => String(s).trim()).filter(Boolean);

      if (rawTargetIds.length > 0) {
        const uppercaseTargets = rawTargetIds.map(t => t.toUpperCase());
        const lowercaseTargets = rawTargetIds.map(t => t.toLowerCase());
        const allTargets = Array.from(new Set([...rawTargetIds, ...uppercaseTargets, ...lowercaseTargets]));

        const orConditions: any[] = [
          { id: { in: allTargets } },
          { shareholderId: { in: allTargets } }
        ];

        for (const target of rawTargetIds) {
          orConditions.push({ id: { equals: target, mode: 'insensitive' } });
          orConditions.push({ shareholderId: { equals: target, mode: 'insensitive' } });
        }

        shareholders = await this.prisma.shareholder.findMany({
          where: {
            OR: orConditions,
            status: { notIn: ['DELETED'] },
          },
          select: { id: true, shareholderId: true },
        });
      }
    }

    const priorityMap: Record<string, any> = {
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
    };

    const refTag = `(Ref: ${announcement.id})`;

    for (const u of shareholders) {
      // Check if notification already exists for this shareholder and announcement
      const existing = await this.prisma.notification.findFirst({
        where: {
          shareholderId: u.id,
          message: { contains: refTag },
        },
      });

      if (!existing) {
        const notif = await this.prisma.notification.create({
          data: {
            shareholderId: u.id,
            title: announcement.title,
            message: `${announcement.content} ${refTag}`,
            priority: priorityMap[announcement.priority] || 'MEDIUM',
            type: 'SYSTEM',
          },
        });

        // Notify client real-time via WebSocket
        if (this.messagingGateway) {
          this.messagingGateway.sendMessageToUser(u.id, 'notification:received', notif);
        }
      }
    }

    // Broadcast global notification update event to all connected sockets
    if (this.messagingGateway && this.messagingGateway.server) {
      this.messagingGateway.server.emit('notification:received', { announcementId: announcement.id });
    }
  }
}
