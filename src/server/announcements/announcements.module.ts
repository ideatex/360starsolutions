import { Module } from '@nestjs/common';
import { AnnouncementsService } from '@server/announcements/announcements.service';
import { AnnouncementsController } from '@server/announcements/announcements.controller';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { MessagingModule } from '@server/messaging/messaging.module';

@Module({
  imports: [PrismaModule, AuditModule, MessagingModule],
  providers: [AnnouncementsService],
  controllers: [AnnouncementsController],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
