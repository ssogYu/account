import { INestApplication } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { docsConfig } from '../config/configuration/docs.config';

/**
 * 设置 Swagger API 文档。
 *
 * 文档路径默认为 /docs，已在全局路由前缀中排除。
 */
export function setupSwagger(
  app: INestApplication,
  config: ConfigType<typeof docsConfig>,
) {
  if (!config.enabled) return;

  const builder = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', '健康检查')
    .addTag('auth', '认证')
    .build();

  const document = SwaggerModule.createDocument(app, builder);

  SwaggerModule.setup(config.path, app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 保持认证状态
    },
  });
}
