import { Module, NestModule, OnApplicationShutdown } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { ScheduleModule } from '@nestjs/schedule';
import { MailchimpModule } from '@mindik/mailchimp-nestjs';
import { AwsSdkModule } from 'nest-aws-sdk';
import AwsSDK from 'aws-sdk';
import * as process from 'process';
import { REDIS_TAG } from './constants';
import * as modules from './modules.exported';
import { MONGO_CONFIG, MONGO_URI } from './mongoose.config';
import { Logger } from './config/logger/api-logger';

@Module({
  imports: [
    TypegooseModule.forRoot(`${MONGO_URI}`, MONGO_CONFIG),
    MailchimpModule.forRoot(`${process.env.MAILCHIMP_TRANSACTIONAL_API_KEY}`),
    RedisModule.forRoot({
      readyLog: true,
      config: {
        namespace: REDIS_TAG,
        host: process.env.REDIS_HOST || 'localhost',
        port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    AwsSdkModule.forRoot({
      defaultServiceOptions: {
        endpoint: process.env.S3_ENDPOINT,
        signatureVersion: 'v4',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_ACCESS_SECRET_KEY,
        },
      },
      services: [AwsSDK.S3],
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
