import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Logger } from 'nestjs-pino';

import { ErrorCode } from '../dto/api-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorMessage = this.extractMessage(exception);

    const code = this.isValidationError(exception)
      ? ErrorCode.VALIDATION_ERROR
      : this.toErrorCode(statusCode);

    const logPayload = {
      context: HttpExceptionFilter.name,
      method: request.method,
      url: request.url,
      statusCode,
      code,
      error: errorMessage,
      reqId: request.id,
    };

    if (statusCode >= 500) {
      this.logger.error(
        logPayload,
        exception instanceof Error ? exception.stack : undefined,
        `${request.method} ${request.url} → ${statusCode}`,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        logPayload,
        `${request.method} ${request.url} → ${statusCode}`,
      );
    }

    response.code(statusCode).send({
      code,
      message: errorMessage,
      data: null,
    });
  }

  // ---- 私有方法 ----

  private toErrorCode(status: number): ErrorCode {
    const entry = Object.entries(ErrorCode).find(([, v]) => v === status);

    return entry ? (entry[1] as ErrorCode) : ErrorCode.INTERNAL_ERROR;
  }

  private isValidationError(exception: unknown): boolean {
    if (!(exception instanceof HttpException)) return false;

    const res = exception.getResponse();
    if (typeof res === 'object' && res !== null && 'message' in res) {
      return Array.isArray(res.message);
    }

    return false;
  }

  private extractMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return '服务器内部错误';
    }

    const res = exception.getResponse();

    if (typeof res === 'string') {
      return res;
    }

    if (res && typeof res === 'object') {
      const msg = (res as Record<string, unknown>).message;

      if (Array.isArray(msg)) {
        return msg.filter((m) => typeof m === 'string').join('; ');
      }

      if (typeof msg === 'string') {
        return msg;
      }
    }

    return exception.message;
  }
}
