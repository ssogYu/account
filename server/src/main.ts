import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module';
import { appConfig } from './config/configuration/app.config';
import { setupSwagger } from './swagger/setup-swagger';
import { swaggerConfig } from './config/configuration/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appSettings = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const swaggerSettings = app.get<ConfigType<typeof swaggerConfig>>(
    swaggerConfig.KEY,
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // if (appSettings.apiPrefix.length > 0) {
  //   // 整个应用 API 统一挂到相同前缀下，便于版本管理和网关转发。
  //   app.setGlobalPrefix(appSettings.apiPrefix);
  // }

  app.enableCors({
    origin: appSettings.appOrigin,
    credentials: true,
  });

  setupSwagger({
    app,
    appSettings,
    swaggerSettings,
  });

  await app.listen(appSettings.port);

  logger.log(
    `HTTP server successfully started on port ${appSettings.port}`,
    'Bootstrap',
  );
}
void bootstrap();
