import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@ai-account/shared';

// ErrorCode → HTTP Status 默认消息
const ERROR_MESSAGES: Record<number, string> = {
  [ErrorCode.BAD_REQUEST]: '请求参数错误',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '无权限',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.CONFLICT]: '资源冲突',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.BAD_GATEWAY]: '网关错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务不可用',
};

export class BusinessException extends HttpException {
  readonly code: ErrorCode;
  readonly errorMessage: string;

  constructor(code: ErrorCode, message?: string) {
    const httpStatus =
      code === ErrorCode.SUCCESS
        ? HttpStatus.OK
        : (code as unknown as HttpStatus);
    const errorMessage = message ?? ERROR_MESSAGES[code] ?? '未知错误';

    super(errorMessage, httpStatus);

    this.code = code;
    this.errorMessage = errorMessage;
  }
}
