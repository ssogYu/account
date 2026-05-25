import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module';
import { appConfig } from './config/configuration/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appSettings = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  await app.listen(appSettings.port);

  logger.log(
    `HTTP server successfully started on port ${appSettings.port}`,
    'Bootstrap',
  );
}
void bootstrap();
