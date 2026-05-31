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

  if (appSettings.apiPrefix.length > 0) {
    app.setGlobalPrefix(appSettings.apiPrefix, {
      exclude: ['health', '/', 'docs'],
    });
  }

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
