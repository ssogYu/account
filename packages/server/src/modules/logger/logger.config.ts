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
  return nodeEnv !== 'production' && prettyLoggingEnabled;
}

function getRequestId(requestIdHeader: string | string[] | undefined) {
  if (Array.isArray(requestIdHeader)) {
    return requestIdHeader[0] ?? randomUUID();
  }

  return requestIdHeader ?? randomUUID();
}

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

function createPinoHttpOptions({
  app,
  logger,
}: LoggerRuntimeConfig): Options<IncomingMessage, ServerResponse> {
  return {
    level: logger.level,
    timestamp: stdTimeFunctions.isoTime,
    messageKey: 'message',
    errorKey: 'error',
    nestedKey: 'payload',

    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      reqId: 'requestId',
      responseTime: 'duration',
    },

    formatters: {
      bindings: () => ({
        app: app.name,
        env: app.nodeEnv,
      }),
      level: (label) => ({ level: label }),
    },

    customProps: (request) => ({
      app: app.name,
      env: app.nodeEnv,
      method: request.method,
    }),

    autoLogging: {
      ignore: (request) =>
        shouldIgnoreAutoLogging(request.url, logger.ignoredPaths),
    },

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

    serializers: {
      req: stdSerializers.req,
      res: stdSerializers.res,
      err: stdSerializers.err,
    },

    genReqId: (request, response) => {
      const requestId = getRequestId(request.headers['x-request-id']);
      response.setHeader('x-request-id', requestId);
      return requestId;
    },

    customReceivedMessage: () => 'request received',
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',

    customLogLevel: (_request, response, error) => {
      if (error != null || response.statusCode >= 500) {
        return 'error';
      }
      if (response.statusCode >= 400) {
        return 'warn';
      }
      return 'info';
    },

    quietReqLogger: true,
    quietResLogger: true,

    transport: isPrettyLoggingEnabled(app.nodeEnv, logger.pretty)
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
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
    pinoHttp: createPinoHttpOptions({ app, logger }),
    assignResponse: true,
  };
}
