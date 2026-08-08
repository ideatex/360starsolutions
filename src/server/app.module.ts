import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from '@server/app.controller';
import { AppService } from '@server/app.service';
import { PrismaModule } from '@server/prisma/prisma.module';
import { AuthModule } from '@server/auth/auth.module';
import { UsersModule } from '@server/shareholders/shareholders.module';
import { PayoutModule } from '@server/engines/payout/payout.module';
import { AuditModule } from '@server/engines/audit/audit.module';
import { NotificationModule } from '@server/engines/notification/notification.module';
import { ReportModule } from '@server/engines/report/report.module';
import { SystemSettingsModule } from '@server/system-settings/system-settings.module';
import { InvestmentsModule } from '@server/investments/investments.module';
import { CommissionModule } from '@server/engines/commission/commission.module';
import { ProfitSharingModule } from '@server/engines/profit-sharing/profit-sharing.module';
import { ReferralTreeModule } from '@server/engines/referral-tree/referral-tree.module';
import { BusinessConfigModule } from '@server/business-config/business-config.module';
import { AnnouncementsModule } from '@server/announcements/announcements.module';
import { MessagingModule } from '@server/messaging/messaging.module';
import { FounderCmsModule } from '@server/founder-cms/founder-cms.module';
import { MlmModule } from '@server/engines/mlm/mlm.module';
import { InvestorsModule } from '@server/engines/investors/investors.module';
import { ReferralProgressModule } from '@server/engines/referral-progress/referral-progress.module';
import { WithdrawalsModule } from '@server/withdrawals/withdrawals.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
      exclude: ['/api/{*splat}'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'src', 'client', 'public'),
      serveRoot: '/',
      exclude: ['/api/{*splat}'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api/{*splat}'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule, 
    AuthModule, 
    UsersModule, 
    PayoutModule,
    AuditModule,
    NotificationModule,
    ReportModule,
    SystemSettingsModule,
    InvestmentsModule,
    CommissionModule,
    ProfitSharingModule,
    ReferralTreeModule,
    BusinessConfigModule,
    AnnouncementsModule,
    MessagingModule,
    FounderCmsModule,
    MlmModule,
    InvestorsModule,
    ReferralProgressModule,
    WithdrawalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
