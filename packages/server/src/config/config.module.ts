import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';
import { appConfig } from './configuration/app.config';
import { loggerConfig } from './configuration/logger.config';
import { authConfig } from './configuration/auth.config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
// 统一封装应用配置入口：
// - 启动时加载 .env 文件
// - 注册分组配置（registerAs）
// - 执行环境变量校验
// - 作为全局模块供全应用复用
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      // 让 ConfigService 和 registerAs 生成的 provider 在全局可用，
      // 后续业务模块无需重复导入 ConfigModule。
      isGlobal: true,
      // 开启缓存后，多次读取配置时不会重复解析，适合运行期频繁访问。
      cache: true,
      // 支持环境变量插值，例如 A=${B} 这类引用写法。
      expandVariables: true,
      // 按环境从高到低依次加载，越靠前优先级越高：
      // - .env.development / .env.production
      // - .env
      envFilePath: [`.env.${nodeEnv}`, '.env'],
      // 按领域拆分配置命名空间，后续通过 appConfig.KEY / loggerConfig.KEY 注入使用。
      load: [appConfig, loggerConfig, authConfig],
      // 启动阶段统一做 Joi 校验，缺失或非法配置会直接阻止应用启动。
      validationSchema: envValidationSchema,
      validationOptions: {
        // 一次性返回所有校验错误，避免逐个修复环境变量。
        abortEarly: false,
        // 允许出现 schema 之外的环境变量，避免影响系统注入或第三方变量。
        allowUnknown: true,
      },
    }),
  ],
  exports: [NestConfigModule],
})
export class AppConfigModule {}
