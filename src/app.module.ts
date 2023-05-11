import { Module, NestModule, OnApplicationShutdown } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { ScheduleModule } from '@nestjs/schedule';
import * as process from 'process';
import { REDIS_TAG } from './constants';
import * as modules from './modules.exported';
import { Logger } from './config/logger/api-logger';

@Module({
  imports: [
    RedisModule.forRoot({
      readyLog: true,
      config: {
        namespace: REDIS_TAG,
        host: process.env.REDIS_HOST || 'localhost',
        port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    ScheduleModule.forRoot(),
    ...Object.values(modules),
  ],
})
export class AppModule implements NestModule, OnApplicationShutdown {
  onApplicationShutdown(signal?: string): void {
    if (signal) {
      Logger.info(`Received shutdown signal: ${signal} 👋`);
    }
  }

  configure(): void {}
}
