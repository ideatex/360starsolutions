import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-for-dev',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const rawToken = req.headers.authorization?.split(' ')[1];
    if (rawToken) {
      const blacklisted = await this.prisma.jwtBlacklist.findUnique({
        where: { token: rawToken },
      });
      if (blacklisted) {
        throw new UnauthorizedException('Session expired. Please log in again.');
      }
    }
    return { id: payload.sub, shareholderId: payload.shareholderId, role: payload.role };
  }
}
