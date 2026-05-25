import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';

import { ConfigType } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';
import { Options, stdSerializers } from 'pino-http';
import { appConfig } from 'src/config/configuration/app.config';
import { loggerConfig } from 'src/config/configuration/logger.config';

type LoggerRuntimeConfig = {
  app: ConfigType<typeof appConfig>;
  logger: ConfigType<typeof loggerConfig>;
};

function isPrettyLoggingEnabled(
  nodeEnv: string,
  prettyLoggingEnabled: boolean,
) {
  // 生产环境强制输出 JSON，避免 pretty 日志破坏采集链路。
  return nodeEnv !== 'production' && prettyLoggingEnabled;
}

// 优先透传上游请求 ID，缺失时由当前服务生成。
// 这样无论请求是来自前端、网关还是其他服务，都能尽量把同一条链路串起来。
function getRequestId(requestIdHeader: string | string[] | undefined) {
  if (Array.isArray(requestIdHeader)) {
    return requestIdHeader[0] ?? randomUUID();
  }

  return requestIdHeader ?? randomUUID();
}

// 判断当前 URL 是否应该跳过自动请求日志。
// 这里只影响 pino-http 的自动请求日志，不影响业务代码里主动打印的日志。
function shouldIgnoreAutoLogging(
  url: string | undefined,
  ignoredPaths: string[],
) {
  if (url == null) {
    return false;
  }

  return ignoredPaths.some(
    (path) => url === path || url.startsWith(`${path}?`),
  );
}

// 这里集中定义 pino-http 的所有行为。
// NestJS 最终通过 nestjs-pino 包装这份配置，把请求日志、应用日志和异常日志统一接入。
function createPinoHttpOptions({
  app,
  logger,
}: LoggerRuntimeConfig): Options<IncomingMessage, ServerResponse> {
  return {
    level: logger.level,
    // 最小日志级别，低于该级别的日志不会输出。
    timestamp: stdTimeFunctions.isoTime,

    // 使用 ISO 时间字符串，便于人读，也便于日志平台统一解析。
    messageKey: 'message',

    // 统一字段命名，避免默认字段名在不同平台里不一致。
    errorKey: 'error',
    nestedKey: 'payload',
    // 统一日志字段命名，便于后续接日志平台时直接检索。

    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      reqId: 'requestId',
      responseTime: 'duration',
    },

    // bindings 会挂到所有日志上，适合放服务级、环境级这种稳定字段。
    // 这里不放 request 级别的数据，避免全局字段被请求上下文污染。
    formatters: {
      bindings: () => ({
        app: app.name,
        env: app.nodeEnv,
      }),

      // 将 level 统一保存在 level 字段中，便于日志平台做过滤和聚合。
      level: (label) => ({ level: label }),
    },

    // customProps 会在请求日志里附加额外字段。
    // 这里保留了 method，后续也可以继续扩展 route、tenantId 等上下文信息。
    customProps: (request) => ({
      app: app.name,
      env: app.nodeEnv,
      method: request.method,
    }),

    // 自动请求日志对绝大多数业务接口是有价值的，但探活和指标接口通常只会制造噪音。
    // 所以这里按 URL 做过滤，保留业务请求，忽略低价值请求。
    autoLogging: {
      ignore: (request) =>
        shouldIgnoreAutoLogging(request.url, logger.ignoredPaths),
    },

    // 默认脱敏常见敏感信息，避免 token、密码等内容进入日志系统。
    // 这里既处理请求头，也处理常见请求体字段。
    redact: {
      paths: [
        'request.headers.authorization',
        'request.headers.cookie',
        'request.headers["x-api-key"]',
        'request.headers["x-auth-token"]',
        'request.body.password',
        'request.body.confirmPassword',
        'request.body.accessToken',
        'request.body.refreshToken',
        'request.body.token',
        'request.body.secret',
      ],
      censor: '[Redacted]',
    },

    // 使用 pino 官方序列化器：
    // - 避免原始 req/res/error 对象里出现循环引用
    // - 保留最常用且适合输出的字段
    // - 降低日志体积，减少网络与存储压力
    serializers: {
      req: stdSerializers.req,
      res: stdSerializers.res,
      err: stdSerializers.err,
    },

    // 生成或透传请求 ID，并把它回写到响应头。
    // 这样前端、网关、调用方都能拿到 requestId，用于和日志系统中的记录对齐。
    genReqId: (request, response) => {
      const requestId = getRequestId(request.headers['x-request-id']);

      response.setHeader('x-request-id', requestId);

      return requestId;
    },

    // 统一请求生命周期消息，便于后续在日志平台按 message 快速筛选。
    customReceivedMessage: () => 'request received',
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',

    // 根据响应结果自动选择日志级别，减少业务层重复判断。
    // 约定是：
    // - 5xx 或存在异常对象 -> error
    // - 4xx -> warn
    // - 其余成功请求 -> info
    customLogLevel: (_request, response, error) => {
      if (error != null || response.statusCode >= 500) {
        return 'error';
      }

      if (response.statusCode >= 400) {
        return 'warn';
      }

      return 'info';
    },

    // quietReqLogger / quietResLogger 可以减少子 logger 嵌套带来的冗余字段，
    // 让日志结构更简洁，也更适合生产环境统一采集和检索。
    quietReqLogger: true,
    quietResLogger: true,

    // 开发环境使用易读输出，生产环境保留结构化 JSON 方便采集。
    transport: isPrettyLoggingEnabled(app.nodeEnv, logger.pretty)
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',

            // pretty 输出时隐藏体积较大的字段，减少开发控制台噪音。
            ignore: 'pid,hostname,request,response',
          },
        }
      : undefined,
  };
}

export function createLoggerModuleConfig({
  app,
  logger,
}: LoggerRuntimeConfig): Params {
  return {
    // NestJS 通过 LoggerModule.forRoot 只注册一次全局日志配置。
    // 整个应用的请求日志、框架日志和业务日志都会共享这套基础规则。
    pinoHttp: createPinoHttpOptions({
      app,
      logger,
    }),

    // 让响应完成日志也继承 assign 的上下文字段。
    // 后续如果使用 PinoLogger.assign() 动态追加业务上下文，响应日志也能一起带上。
    assignResponse: true,
  };
}
