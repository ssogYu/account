import { INestApplication } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { appConfig } from '../config/configuration/app.config';
import { swaggerConfig } from 'src/config/configuration/swagger.config';

type SetupSwaggerOptions = {
  app: INestApplication;
  appSettings: ConfigType<typeof appConfig>;
  swaggerSettings: ConfigType<typeof swaggerConfig>;
};

export function setupSwagger({
  app,
  appSettings,
  swaggerSettings,
}: SetupSwaggerOptions) {
  if (!swaggerSettings.enabled) {
    return;
  }

  const swaggerDocumentConfig = new DocumentBuilder()
    .setTitle(swaggerSettings.title)
    .setDescription(swaggerSettings.description)
    .setVersion(swaggerSettings.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
        description: 'Input JWT access token',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerDocumentConfig, {
    deepScanRoutes: true,
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  // 注册 Swagger UI 页面与导出文档地址。
  SwaggerModule.setup(swaggerSettings.path, app, document, {
    // 文档地址是否自动继承全局 API 前缀，例如 /api/v1/docs。
    useGlobalPrefix: appSettings.apiPrefix.length > 0,
    // 额外暴露 JSON / YAML 格式文档，方便对接网关、SDK 生成器和外部平台。
    jsonDocumentUrl: `${swaggerSettings.path}.json`,
    yamlDocumentUrl: `${swaggerSettings.path}.yaml`,
    // 自定义浏览器标签页标题，避免多个项目文档页难以区分。
    customSiteTitle: `${swaggerSettings.title} Docs`,
    swaggerOptions: {
      // 刷新页面后保留授权信息，减少调试时重复粘贴 token。
      persistAuthorization: true,
      // 默认折叠文档节点，接口数量变多后更易浏览。
      docExpansion: 'none',
      // 开启前端搜索过滤，便于快速定位接口。
      filter: true,
      // 在页面里展示请求耗时，便于接口联调时观察性能。
      displayRequestDuration: true,
      // 对 tag 和 operation 做稳定排序，避免文档顺序漂移。
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
