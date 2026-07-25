import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  private readonly DEFAULTS: Record<string, string> = {
    daily_profit_rate: '0.0033', // ~10% monthly ROI
    referral_depth: '7',
    referral_rates: '0.05,0.03,0.02,0.01,0.005,0.0025,0.001',
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Seed default settings if they do not exist
    for (const [key, val] of Object.entries(this.DEFAULTS)) {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key },
      });
      if (!setting) {
        await this.prisma.systemSetting.create({
          data: { key, value: val },
        });
      }
    }
  }

  async get(key: string, defaultValue?: string): Promise<string> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting ? setting.value : (defaultValue ?? this.DEFAULTS[key] ?? '');
  }

  async set(key: string, value: string): Promise<any> {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.systemSetting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }
}
