import { Module } from '@nestjs/common';
import { AuthService } from '@server/auth/auth.service';
import { AuthController } from '@server/auth/auth.controller';
import { PrismaModule } from '@server/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@server/auth/jwt.strategy';

import { SmsModule } from '@server/sms/sms.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    SmsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-for-dev',
      signOptions: { expiresIn: '60m' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
