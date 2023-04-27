import {MiddlewareConsumer, Module, NestModule, OnApplicationShutdown} from '@nestjs/common';
import {TypegooseModule} from 'nestjs-typegoose';
import {Logger} from './config/logger/api-logger';
import {MONGO_CONFIG, MONGO_URI} from './mongoose.config';
import * as modules from './modules.exported';
import {RedisModule} from 'nestjs-ioredis-tags';
import {ScheduleModule} from '@nestjs/schedule';
import {MailchimpModule} from '@mindik/mailchimp-nestjs';
import {MqttModule} from 'nest-mqtt';
import {AwsSdkModule} from 'nest-aws-sdk';
import {S3} from 'aws-sdk';
import {REDIS_TAG} from './constants';
import * as process from 'process';

@Module({
  imports: [
    TypegooseModule.forRoot(`${MONGO_URI}`, MONGO_CONFIG),
    MailchimpModule.forRoot(`${process.env.MAILCHIMP_TRANSACTIONAL_API_KEY}`),
    RedisModule.forRoot([
      {
        name: REDIS_TAG,
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      }
    ]),
    MqttModule.forRoot({
      host: process.env.MQTT_HOST,
      port: Number(process.env.MQTT_PORT),
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD
    }),
    AwsSdkModule.forRoot({
      defaultServiceOptions: {
        endpoint: process.env.S3_ENDPOINT,
        signatureVersion: 'v4',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_ACCESS_SECRET_KEY
        }
      },
      services: [S3]
    }),
    ScheduleModule.forRoot(),
    ...Object.values(modules)
  ]
})
export class AppModule implements NestModule, OnApplicationShutdown {
  onApplicationShutdown(signal?: string): void {
    if(signal) {
      Logger.info(`Received shutdown signal: ${signal} 👋`);
    }
  }

  configure(_consumer: MiddlewareConsumer): any {
    //
  }
}
