import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { parse } from 'pg-connection-string';

function getSanitizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  url = url.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  if (url.startsWith('DATABASE_URL=')) {
    url = url.slice('DATABASE_URL='.length).trim();
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1).trim();
    }
  }
  // Hostinger cloud firewall blocks outbound port 6543. Auto-fallback to port 5432.
  if (url.includes('.pooler.supabase.com:6543')) {
    url = url.replace(':6543', ':5432');
  }
  // Ensure sslmode=require for Supabase
  if (url.includes('supabase.com') && !url.includes('sslmode=')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  return url;
}

function createPrismaOptions() {
  const cleanUrl = getSanitizedDatabaseUrl();
  if (!cleanUrl) return { options: undefined, pool: undefined };
  process.env.DATABASE_URL = cleanUrl;

  try {
    const config = parse(cleanUrl);
    const isLocal = cleanUrl.includes('127.0.0.1') || cleanUrl.includes('localhost');
    const ssl = cleanUrl.includes('sslmode=disable')
      ? false
      : (cleanUrl.includes('sslmode=require') || cleanUrl.includes('supabase.com') || !isLocal)
        ? { rejectUnauthorized: false }
        : false;

    const pool = new Pool({
      ...config,
      port: config.port ? parseInt(config.port, 10) : 5432,
      ssl,
      max: 5,
      connectionTimeoutMillis: 15000,
    } as any);
    const adapter = new PrismaPg(pool);
    return { options: { adapter } as any, pool };
  } catch (err) {
    console.warn('Fallback to standard Prisma datasource URL:', err);
    return { options: { datasources: { db: { url: cleanUrl } } }, pool: undefined };
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool?: Pool;

  constructor() {
    const { options, pool } = createPrismaOptions();
    super(options);
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database via PG driver adapter.');
    } catch (err: any) {
      this.logger.warn(`Initial database connection failed: ${err.message}. Backend will attempt to reconnect on subsequent queries.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.pool) {
      await this.pool.end();
    }
  }
}



