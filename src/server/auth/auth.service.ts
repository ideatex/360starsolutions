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

    const isPasswordValid = await bcrypt.compare(pass, shareholder.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: shareholder.id, shareholderId: shareholder.shareholderId, role: shareholder.role };
    return {
      access_token: this.jwtService.sign(payload),
      shareholder: { id: shareholder.id, shareholderId: shareholder.shareholderId, role: shareholder.role }
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
}
