import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ErrorCode, ApiResponse } from '@ai-account/shared';
import { BusinessException } from '../exceptions';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let code: ErrorCode;
    let message: string;
    let httpStatus: number;

    if (exception instanceof BusinessException) {
      // 业务异常：使用自定义错误码和消息
      code = exception.code;
      message = exception.errorMessage;
      httpStatus = exception.getStatus();
    } else if (exception instanceof HttpException) {
      // 框架异常（如 ValidationPipe 抛出的 400）
      code = ErrorCode.BAD_REQUEST;
      httpStatus = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
        const msg = (exceptionResponse as { message: unknown }).message;
        message = Array.isArray(msg) ? msg.join('; ') : String(msg);
      } else {
        message = '请求错误';
      }

      // 根据状态码调整错误码
      if (httpStatus === HttpStatus.UNAUTHORIZED) code = ErrorCode.UNAUTHORIZED;
      else if (httpStatus === HttpStatus.FORBIDDEN) code = ErrorCode.FORBIDDEN;
      else if (httpStatus === HttpStatus.NOT_FOUND) code = ErrorCode.NOT_FOUND;
    } else {
      // 未知异常
      code = ErrorCode.INTERNAL_ERROR;
      message = '服务器内部错误';
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.error(
        `Unhandled exception: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiResponse = {
      code,
      message,
      data: null,
    };

    response.status(httpStatus).json(body);
  }
}
