import { Module } from '@nestjs/common';
import { MessagingService } from '@server/messaging/messaging.service';
import { MessagingController } from '@server/messaging/messaging.controller';
import { MessagingGateway } from '@server/messaging/messaging.gateway';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { AuthModule } from '@server/auth/auth.module';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  providers: [MessagingService, MessagingGateway],
  controllers: [MessagingController],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
