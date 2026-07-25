import { Module } from '@nestjs/common';
import { NotificationService } from '@server/engines/notification/notification.service';
import { NotificationController } from '@server/engines/notification/notification.controller';
import { PrismaModule } from '@server/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
