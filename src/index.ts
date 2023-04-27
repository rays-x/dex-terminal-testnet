import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { join } from 'path';
import express, { Express } from 'express';
import mongoose from 'mongoose';
import {
  AsyncApiDocumentBuilder,
  AsyncApiModule,
  AsyncServerObject,
} from 'nestjs-asyncapi';
import { ValidationPipe } from '@nestjs/common';
import { PORT } from './constants';
import { Logger, LogLevel } from './config/logger/api-logger';
import { DefaultLogger } from './config/logger/default-logger';
import expressPlugins from './plugins/express';
import { AppModule } from './app.module';

function logWelcomeMessage() {
  const version = '1.0.0';
  Logger.info(`=================================================`);
  Logger.info(`BACKEND (v: ${version}) now running on port ${PORT} ✨`);
  /* Logger.info(`WEBSOCKET: ${payload.getAPIURL().replace('/api/admin', '/api/playground/websocket')}`);
  Logger.info(`SWAGGER: ${payload.getAPIURL().replace('/api/admin', '/api/playground/rest')}`);
  Logger.info(`ADMIN: ${payload.getAdminURL()}`); */
  Logger.info(`=================================================`);
}

process.setMaxListeners(0);

(async () => {
  // mongoose.set('debug', process.env.NODE_ENV === 'development');
  mongoose.pluralize(null);
  Logger.useLogger(
    new DefaultLogger({
      level: process.env.LOGGER_LEVEL
        ? Number(process.env.LOGGER_LEVEL)
        : LogLevel.Info,
    })
  );
  Logger.info(`Bootstrapping ray.sx (pid: ${process.pid}) 🚀`);
  DefaultLogger.hideNestBootstrapLogs();
  const expressApp: Express = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    adapter,
    {
      logger: new Logger(),
    }
  );

  expressPlugins(expressApp);
  app.useStaticAssets(join(__dirname, 'payload/client/static'), {
    prefix: '/static/',
  });
  app.useStaticAssets(join(__dirname, 'payload/client/static'), {
    prefix: '/client/static/',
  });
  app.useStaticAssets(join(__dirname, '../media'), {
    prefix: '/media/',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
    })
  );

  const options = new DocumentBuilder()
    .setTitle('ray.sx API')
    .setDescription(
      `Backend API for <a href="https://backend.ray.sx" target="_blank">https://backend.ray.sx</a>`
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'bearer-sid'
    )
    .setVersion('0.0')
    .build();

  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup('/api/playground/rest', app, document);

  const asyncApiServer: AsyncServerObject = {
    url: `wss://backend.ray.sx/chats`,
    protocol: 'socket.io',
    protocolVersion: '4',
    description:
      'Allows you to connect using the websocket protocol to soulmate backend server.',
  };

  const asyncApiOptions = new AsyncApiDocumentBuilder()
    .setTitle('Soulmate WebSocket API')
    .setVersion('1.0')
    .setDefaultContentType('application/json')
    .addServer('chat-server', asyncApiServer)
    .build();

  const asyncApiDocument = await AsyncApiModule.createDocument(
    app,
    asyncApiOptions
  );

  await AsyncApiModule.setup(
    '/api/playground/websocket',
    app,
    asyncApiDocument
  );

  await app.listen(PORT, '0.0.0.0', async () => {
    DefaultLogger.restoreOriginalLogLevel();
    logWelcomeMessage();
  });

  app.enableShutdownHooks();
})();
