import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(shareholderId: string, password: string, referralCode?: string) {
    const existingUser = await this.prisma.shareholder.findUnique({ where: { shareholderId } });
    if (existingUser) {
      throw new BadRequestException('Shareholder already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate a unique referral code for the new shareholder
    const newReferralCode = randomBytes(4).toString('hex').toUpperCase();

    // Determine parent if referral code provided
    let parentId = null;

    if (referralCode) {
      const parent = await this.prisma.shareholder.findUnique({ where: { referralCode } });
      if (!parent) {
        throw new BadRequestException('Invalid referral code');
      }
      
      parentId = parent.id;
    }

    const shareholder = await this.prisma.shareholder.create({
      data: {
        shareholderId,
        passwordHash,
        referralCode: newReferralCode,
        parentId,
      }
    });

    const payload = { sub: shareholder.id, shareholderId: shareholder.shareholderId, role: shareholder.role };
    return {
      access_token: this.jwtService.sign(payload),
      shareholder: { id: shareholder.id, shareholderId: shareholder.shareholderId, role: shareholder.role }
    };
  }

  async login(shareholderId: string, pass: string) {
    const searchId = (shareholderId || '').trim();
    const cleanPass = (pass || '').trim();

    if (!searchId || !cleanPass) {
      throw new UnauthorizedException('Please enter both Shareholder ID and Password.');
    }

    const shareholder = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { shareholderId: searchId },
          { shareholderId: searchId.toUpperCase() },
          { shareholderId: searchId.toLowerCase() },
          { referralCode: searchId },
          { referralCode: searchId.toUpperCase() },
          { phone: searchId },
        ],
      },
    });

    if (!shareholder) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (shareholder.status === 'DISABLED' || shareholder.status === 'DELETED' || shareholder.status === 'BLOCKED') {
      throw new UnauthorizedException('Account is disabled or suspended. Please contact administrator.');
    }

    const isPasswordValid = await bcrypt.compare(cleanPass, shareholder.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: shareholder.id, shareholderId: shareholder.shareholderId, role: shareholder.role };
    return {
      access_token: this.jwtService.sign(payload),
      shareholder: { id: shareholder.id, shareholderId: shareholder.shareholderId, name: shareholder.name, role: shareholder.role }
    };
  }

  async logout(token: string) {
    try {
      const decoded = this.jwtService.decode(token) as any;
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await this.prisma.jwtBlacklist.upsert({
        where: { token },
        create: { token, expiresAt },
        update: { expiresAt },
      });
      return { success: true };
    } catch (e) {
      await this.prisma.jwtBlacklist.upsert({
        where: { token },
        create: { token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        update: {},
      });
      return { success: true };
    }
  }

  /**
   * Send Mobile OTP for Forgot Password
   */
  async sendForgotPasswordOtp(identifier: string) {
    const searchId = (identifier || '').trim();
    if (!searchId) {
      throw new BadRequestException('Please provide your Shareholder ID or Registered Mobile Number.');
    }

    const shareholder = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { shareholderId: { equals: searchId, mode: 'insensitive' } },
          { phone: searchId },
        ],
      },
    });

    if (!shareholder) {
      throw new BadRequestException('No account found matching the provided Shareholder ID or Mobile Number.');
    }

    if (!shareholder.phone) {
      throw new BadRequestException('No registered mobile number associated with this account. Please contact Super Admin.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate existing unused OTPs for this identifier
    await this.prisma.otpVerification.updateMany({
      where: { identifier: shareholder.shareholderId, purpose: 'FORGOT_PASSWORD', isUsed: false },
      data: { isUsed: true },
    });

    // Save OTP
    await this.prisma.otpVerification.create({
      data: {
        identifier: shareholder.shareholderId,
        otp,
        purpose: 'FORGOT_PASSWORD',
        expiresAt,
        isUsed: false,
      },
    });

    // Log SMS in database
    await this.prisma.smsLog.create({
      data: {
        recipient: shareholder.phone,
        shareholderId: shareholder.id,
        message: `Your OTP for password reset is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`,
        status: 'SENT',
      },
    });

    const maskedPhone = shareholder.phone.length > 4 
      ? shareholder.phone.slice(0, 2) + '******' + shareholder.phone.slice(-3) 
      : shareholder.phone;

    return {
      success: true,
      message: `OTP sent successfully to registered mobile number (${maskedPhone})`,
      shareholderId: shareholder.shareholderId,
      maskedPhone,
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Verify Mobile OTP for Forgot Password
   */
  async verifyForgotPasswordOtp(shareholderId: string, otp: string) {
    const cleanId = (shareholderId || '').trim();
    const cleanOtp = (otp || '').trim();

    if (!cleanId || !cleanOtp) {
      throw new BadRequestException('Shareholder ID and OTP are required.');
    }

    const verification = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: { equals: cleanId, mode: 'insensitive' },
        otp: cleanOtp,
        purpose: 'FORGOT_PASSWORD',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new OTP.');
    }

    // Generate secure reset token
    const resetToken = randomBytes(24).toString('hex');

    await this.prisma.otpVerification.update({
      where: { id: verification.id },
      data: {
        isUsed: true,
        resetToken,
      },
    });

    return {
      success: true,
      message: 'OTP verified successfully.',
      resetToken,
    };
  }

  /**
   * Reset Password with valid Reset Token
   */
  async resetPasswordWithToken(resetToken: string, newPasswordText: string) {
    if (!resetToken || !newPasswordText) {
      throw new BadRequestException('Reset token and new password are required.');
    }

    if (newPasswordText.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long.');
    }

    const verification = await this.prisma.otpVerification.findUnique({
      where: { resetToken },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired password reset session. Please restart Forgot Password.');
    }

    // Check if resetToken was generated within last 15 minutes
    const tokenAgeMs = Date.now() - new Date(verification.createdAt).getTime();
    if (tokenAgeMs > 15 * 60 * 1000) {
      throw new BadRequestException('Reset session has expired. Please restart Forgot Password.');
    }

    const shareholder = await this.prisma.shareholder.findUnique({
      where: { shareholderId: verification.identifier },
    });

    if (!shareholder) {
      throw new BadRequestException('Shareholder account not found.');
    }

    const passwordHash = await bcrypt.hash(newPasswordText, 10);

    await this.prisma.shareholder.update({
      where: { id: shareholder.id },
      data: { passwordHash },
    });

    // Invalidate resetToken
    await this.prisma.otpVerification.delete({
      where: { id: verification.id },
    });

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        shareholderId: shareholder.id,
        role: shareholder.role,
        action: 'FORGOT_PASSWORD_RESET',
        entityType: 'Shareholder',
        entityId: shareholder.id,
        newValue: 'Password successfully reset via Mobile OTP',
      },
    });

    // Create Security Notification
    await this.prisma.notification.create({
      data: {
        shareholderId: shareholder.id,
        title: 'Security Alert: Password Reset',
        message: 'Your account password was successfully reset using Mobile OTP verification.',
        type: 'SECURITY',
        priority: 'HIGH',
      },
    });

    return {
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Send Mobile OTP for Change Password (for authenticated user)
   */
  async sendChangePasswordOtp(shareholderId: string) {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
    });

    if (!shareholder || !shareholder.phone) {
      throw new BadRequestException('Registered phone number is missing. Please contact administrator.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpVerification.updateMany({
      where: { identifier: shareholder.shareholderId, purpose: 'CHANGE_PASSWORD', isUsed: false },
      data: { isUsed: true },
    });

    await this.prisma.otpVerification.create({
      data: {
        identifier: shareholder.shareholderId,
        otp,
        purpose: 'CHANGE_PASSWORD',
        expiresAt,
        isUsed: false,
      },
    });

    await this.prisma.smsLog.create({
      data: {
        recipient: shareholder.phone,
        shareholderId: shareholder.id,
        message: `Your OTP for changing account password is ${otp}. Valid for 10 minutes.`,
        status: 'SENT',
      },
    });

    const maskedPhone = shareholder.phone.length > 4 
      ? shareholder.phone.slice(0, 2) + '******' + shareholder.phone.slice(-3) 
      : shareholder.phone;

    return {
      success: true,
      message: `OTP sent to registered mobile number (${maskedPhone})`,
      maskedPhone,
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Change Password with Mobile OTP (for authenticated user)
   */
  async changePasswordWithOtp(shareholderId: string, currentPasswordText: string, newPasswordText: string, otp: string) {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
    });

    if (!shareholder) {
      throw new BadRequestException('Shareholder not found.');
    }

    // Verify current password first if provided
    if (currentPasswordText) {
      const isCurrentValid = await bcrypt.compare(currentPasswordText, shareholder.passwordHash);
      if (!isCurrentValid) {
        throw new BadRequestException('Current password is incorrect.');
      }
    }

    if (!otp) {
      throw new BadRequestException('OTP is required to change password.');
    }

    const verification = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: shareholder.shareholderId,
        otp: otp.trim(),
        purpose: 'CHANGE_PASSWORD',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new OTP.');
    }

    if (!newPasswordText || newPasswordText.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long.');
    }

    const passwordHash = await bcrypt.hash(newPasswordText, 10);

    await this.prisma.shareholder.update({
      where: { id: shareholderId },
      data: { passwordHash },
    });

    await this.prisma.otpVerification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    });

    await this.prisma.auditLog.create({
      data: {
        shareholderId,
        role: shareholder.role,
        action: 'CHANGE_PASSWORD_OTP',
        entityType: 'Shareholder',
        entityId: shareholderId,
        newValue: 'Password updated via Mobile OTP verification',
      },
    });

    await this.prisma.notification.create({
      data: {
        shareholderId,
        title: 'Password Changed',
        message: 'Your account password was successfully updated.',
        type: 'SECURITY',
        priority: 'HIGH',
      },
    });

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  }
}
