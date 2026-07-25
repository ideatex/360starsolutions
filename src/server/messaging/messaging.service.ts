import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';
import { MessagingGateway } from '@server/messaging/messaging.gateway';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly gateway: MessagingGateway,
  ) {}

  async sendMessage(senderId: string, data: any) {
    // Validate recipient
    const recipient = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { id: data.recipientId },
          { shareholderId: data.recipientId },
          { shareholderId: data.recipientId }
        ]
      }
    });

    if (!recipient) {
      throw new BadRequestException('Recipient not found');
    }

    const isDraft = !!data.isDraft;

    const message = await this.prisma.message.create({
      data: {
        senderId,
        recipientId: recipient.id,
        subject: data.subject || 'No Subject',
        content: data.content,
        parentMessageId: data.parentMessageId || null,
        isDraft,
        isRead: false,
      },
    });

    // Handle attachments if any
    if (data.attachments && Array.isArray(data.attachments)) {
      const attachments = data.attachments.map((att: any) => ({
        messageId: message.id,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize || 0,
        mimeType: att.mimeType || 'application/octet-stream',
      }));
      if (attachments.length > 0) {
        await this.prisma.messageAttachment.createMany({
          data: attachments,
        });
      }
    }

    const messageWithAttachments = await this.prisma.message.findUnique({
      where: { id: message.id },
      include: {
        attachments: true,
        sender: { select: { id: true, shareholderId: true, name: true } },
        recipient: { select: { id: true, shareholderId: true, name: true } },
      },
    });

    if (!isDraft) {
      // Send real-time notification via WebSocket
      this.gateway.sendMessageToUser(recipient.id, 'message:received', messageWithAttachments);
    }

    return messageWithAttachments;
  }

  async getInbox(shareholderId: string, search?: string, folder = 'inbox') {
    const where: any = {
      recipientId: shareholderId,
      isDraft: false,
    };

    if (folder === 'starred') {
      where.isStarredByRecipient = true;
      where.isDeletedByRecipient = false;
    } else if (folder === 'archived') {
      where.isArchivedByRecipient = true;
      where.isDeletedByRecipient = false;
    } else if (folder === 'deleted') {
      where.isDeletedByRecipient = true;
    } else {
      // Default inbox
      where.isArchivedByRecipient = false;
      where.isDeletedByRecipient = false;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { sender: { name: { contains: search, mode: 'insensitive' } } },
        { sender: { shareholderId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.message.findMany({
      where,
      include: {
        attachments: true,
        sender: { select: { id: true, name: true, shareholderId: true,  } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSent(shareholderId: string, search?: string) {
    const where: any = {
      senderId: shareholderId,
      isDraft: false,
      isDeletedBySender: false,
    };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { recipient: { name: { contains: search, mode: 'insensitive' } } },
        { recipient: { shareholderId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.message.findMany({
      where,
      include: {
        attachments: true,
        recipient: { select: { id: true, name: true, shareholderId: true,  } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDrafts(shareholderId: string) {
    return this.prisma.message.findMany({
      where: {
        senderId: shareholderId,
        isDraft: true,
        isDeletedBySender: false,
      },
      include: {
        attachments: true,
        recipient: { select: { id: true, name: true, shareholderId: true,  } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMessageDetails(id: string, shareholderId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: {
        attachments: true,
        sender: { select: { id: true, name: true, shareholderId: true,  } },
        recipient: { select: { id: true, name: true, shareholderId: true,  } },
        replies: {
          include: {
            attachments: true,
            sender: { select: { id: true, name: true, shareholderId: true,  } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify permission
    if (message.senderId !== shareholderId && message.recipientId !== shareholderId) {
      throw new BadRequestException('Unauthorized to view this message');
    }

    // Mark as read if current shareholder is recipient and it's unread
    if (message.recipientId === shareholderId && !message.isRead) {
      await this.prisma.message.update({
        where: { id },
        data: { isRead: true },
      });
      message.isRead = true;
    }

    return message;
  }

  async updateFlags(id: string, shareholderId: string, flags: { starred?: boolean, archived?: boolean, deleted?: boolean, read?: boolean }) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const data: any = {};
    const isSender = message.senderId === shareholderId;
    const isRecipient = message.recipientId === shareholderId;

    if (!isSender && !isRecipient) {
      throw new BadRequestException('Unauthorized');
    }

    if (flags.starred !== undefined) {
      if (isSender) data.isStarredBySender = flags.starred;
      if (isRecipient) data.isStarredByRecipient = flags.starred;
    }

    if (flags.archived !== undefined) {
      if (isSender) data.isArchivedBySender = flags.archived;
      if (isRecipient) data.isArchivedByRecipient = flags.archived;
    }

    if (flags.deleted !== undefined) {
      if (isSender) data.isDeletedBySender = flags.deleted;
      if (isRecipient) data.isDeletedByRecipient = flags.deleted;
    }

    if (flags.read !== undefined && isRecipient) {
      data.isRead = flags.read;
    }

    return this.prisma.message.update({
      where: { id },
      data,
    });
  }

  async updateDraft(id: string, senderId: string, updates: any) {
    const draft = await this.prisma.message.findUnique({ where: { id } });
    if (!draft || !draft.isDraft || draft.senderId !== senderId) {
      throw new BadRequestException('Draft not found or unauthorized');
    }

    const recipient = updates.recipientId 
      ? await this.prisma.shareholder.findFirst({
          where: {
            OR: [
              { id: updates.recipientId },
              { shareholderId: updates.recipientId },
              { shareholderId: updates.recipientId }
            ]
          }
        })
      : null;

    const data: any = {
      subject: updates.subject !== undefined ? updates.subject : draft.subject,
      content: updates.content !== undefined ? updates.content : draft.content,
      isDraft: updates.isDraft !== undefined ? !!updates.isDraft : draft.isDraft,
    };
    if (recipient) {
      data.recipientId = recipient.id;
    }

    const updated = await this.prisma.message.update({
      where: { id },
      data,
    });

    if (updated.isDraft === false) {
      // Send WebSocket event if sent
      const fullMsg = await this.prisma.message.findUnique({
        where: { id: updated.id },
        include: {
          attachments: true,
          sender: { select: { id: true, shareholderId: true, name: true } },
          recipient: { select: { id: true, shareholderId: true, name: true } },
        },
      });
      this.gateway.sendMessageToUser(updated.recipientId, 'message:received', fullMsg);
    }

    return updated;
  }
}
