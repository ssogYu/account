import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module';
import { appConfig } from './config/configuration/app.config';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appSettings = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // 全局响应拦截器：统一包装 { code, message, data }
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局异常过滤器：统一异常响应格式
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(appSettings.port);

  logger.log(
    `HTTP server successfully started on port ${appSettings.port}`,
    'Bootstrap',
  );
}
void bootstrap().catch((error: unknown) => {});
