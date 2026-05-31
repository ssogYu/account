import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ErrorCode, ApiResponse } from '../shared';
import { BusinessException } from '../exceptions';
type PrismaKnownError = {
  name?: string;
  code?: string;
};

// HTTP Status → ErrorCode 映射
function httpStatusToErrorCode(status: number): ErrorCode {
  const mapping: Record<number, ErrorCode> = {
    [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
    [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
    [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
    [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
    [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
    [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
    [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_ERROR,
    [HttpStatus.BAD_GATEWAY]: ErrorCode.BAD_GATEWAY,
    [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
  };
  return mapping[status] ?? ErrorCode.INTERNAL_ERROR;
}
function isPrismaKnownError(exception: unknown): exception is PrismaKnownError {
  if (typeof exception !== 'object' || exception == null) {
    return false;
  }
  const candidate = exception as PrismaKnownError;
  return candidate.name === 'PrismaClientKnownRequestError';
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let code: ErrorCode;
    let message: string;
    let httpStatus: number;
    if (isPrismaKnownError(exception)) {
      let data: HttpException;
      switch (exception.code) {
        case 'P2002':
          data = new ConflictException('资源已存在');
          break;
        case 'P2003':
          data = new ConflictException('关联资源约束失败');
          break;
        case 'P2025':
          data = new NotFoundException('资源不存在');
          break;
        default:
          data = new InternalServerErrorException('数据库请求失败');
      }
      httpStatus = data.getStatus();
      code = httpStatusToErrorCode(httpStatus);
      const exceptionResponse = data.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((
              exceptionResponse as Record<string, unknown>
            ).message?.toString() ?? data.message);
    }

    if (exception instanceof BusinessException) {
      // 自定义业务异常
      code = exception.code;
      message = exception.errorMessage;
      httpStatus = exception.getStatus();
    } else if (exception instanceof HttpException) {
      // 框架内置异常（ValidationPipe、AuthGuard 等）
      httpStatus = exception.getStatus();
      code = httpStatusToErrorCode(httpStatus);
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((
              exceptionResponse as Record<string, unknown>
            ).message?.toString() ?? exception.message);
    } else {
      // 未知异常
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      code = ErrorCode.INTERNAL_ERROR;
      message = '服务器内部错误';
    }

    this.logger.error(
      `${request.method} ${request.url} → ${httpStatus} [${code}] ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ApiResponse = { code, message, data: null };
    response.status(httpStatus).json(body);
  }
}
