import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Successfully connected to PostgreSQL database');
    } catch (error: any) {
      this.logger.warn(
        `⚠️ PostgreSQL Connection Pending: Could not connect to database at localhost:5432. The NestJS backend is running, but database queries will require a running PostgreSQL instance or a valid DATABASE_URL in .env.`
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
