import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // The local Postgres server's session timezone defaults to the OS
      // locale (observed: Asia/Calcutta), which causes DateTime values to
      // round-trip through Prisma's driver adapter skewed by that offset
      // relative to the true UTC instant. Forcing the session to UTC fixes
      // this for every model's timestamps, not just newly added ones.
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        options: '-c timezone=UTC',
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
