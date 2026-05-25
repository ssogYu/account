import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@ai-account/shared';

// 错误码 → HTTP 状态码映射
const errorCodeToHttpStatus: Record<number, number> = {
  [ErrorCode.SUCCESS]: HttpStatus.OK,
  [ErrorCode.BAD_REQUEST]: HttpStatus.BAD_REQUEST,
  [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.VALIDATION_FAILED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.TOO_MANY_REQUESTS]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.USER_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [ErrorCode.PASSWORD_INCORRECT]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.TOKEN_EXPIRED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.TOKEN_INVALID]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.LOGIN_REQUIRED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.BILL_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.BILL_CREATE_FAILED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.BILL_UPDATE_FAILED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.BILL_DELETE_FAILED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.FAMILY_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.FAMILY_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [ErrorCode.FAMILY_INVITE_CODE_INVALID]: HttpStatus.BAD_REQUEST,
  [ErrorCode.FAMILY_MEMBER_LIMIT]: HttpStatus.FORBIDDEN,
  [ErrorCode.FAMILY_PERMISSION_DENIED]: HttpStatus.FORBIDDEN,
  [ErrorCode.AI_PARSE_FAILED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCode.AI_VOICE_RECOGNIZE_FAILED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.AI_IMAGE_RECOGNIZE_FAILED]: HttpStatus.BAD_REQUEST,
};

// 默认错误消息
const defaultMessages: Record<number, string> = {
  [ErrorCode.SUCCESS]: '操作成功',
  [ErrorCode.UNKNOWN]: '未知错误',
  [ErrorCode.BAD_REQUEST]: '请求参数错误',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '无权限',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.VALIDATION_FAILED]: '数据校验失败',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
};

export class BusinessException extends HttpException {
  readonly code: ErrorCode;
  readonly errorMessage: string;

  constructor(code: ErrorCode, message?: string) {
    const httpStatus =
      errorCodeToHttpStatus[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const errorMessage = message ?? defaultMessages[code] ?? '未知错误';

    super(errorMessage, httpStatus);

    this.code = code;
    this.errorMessage = errorMessage;
  }
}
