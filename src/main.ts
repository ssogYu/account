import { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { setupApp } from './bootstrap/setup-app';
import { setupSwagger } from './bootstrap/swagger';
import { appConfig } from './config/configuration/app.config';
import { docsConfig } from './config/configuration/docs.config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  await setupApp(app);

  // Swagger 文档（通过 DOCS_ENABLED 控制开关）
  setupSwagger(app, app.get<ConfigType<typeof docsConfig>>(docsConfig.KEY));

  const appSettings = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const port = appSettings.port;
  const appOrigin = appSettings.appOrigin;

  await app.listen({ port, host: '0.0.0.0' });
  app.flushLogs();

  const bootstrapLogger = app.get(Logger);
  bootstrapLogger.log({ appOrigin, port }, 'CommonServer is running');
}

void bootstrap();
