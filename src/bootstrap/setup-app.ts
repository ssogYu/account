import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

import { ResponseEnvelopeInterceptor } from '../common/interceptors/response-envelope.interceptor';

export async function setupApp(app: NestFastifyApplication) {
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api/v1';
  const corsOrigins = configService.get<string[]>('cors.origins') ?? [];

  // 跨域配置（Fastify 插件方式）
  await app.register(cors, {
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  // 文件上传（multipart/form-data）支持
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 单文件最大 10MB
      files: 1, // 单次最多 1 个文件
    },
  });

  // 全局路由前缀 /api/v1，排除健康检查、根路径、API 文档
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', '/', 'docs'],
  });

  // 全局请求校验管道：自动剥离非 DTO 字段，禁止未定义字段，开启隐式类型转换
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局响应拦截器：统一成功响应格式 { code: 200, message: 'ok', data }
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
}
