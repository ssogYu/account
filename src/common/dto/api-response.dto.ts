/**
 * 跳过响应包裹的 metadata key
 * 装饰 Controller 方法：@SetMetadata(API_RESPONSE_RAW, true)
 *
 * 适用场景：文件下载、Stream 响应、SSE、webhook 回调等非 JSON 响应
 */
export const API_RESPONSE_RAW = 'api_response_raw';

/**
 * 业务错误码枚举，与 HTTP 状态码保持一致
 */
export const ErrorCode = {
  /** 成功 */
  SUCCESS: 200,

  /** 请求参数错误 */
  BAD_REQUEST: 400,
  /** 未认证 */
  UNAUTHORIZED: 401,
  /** 无权限 */
  FORBIDDEN: 403,
  /** 资源不存在 */
  NOT_FOUND: 404,
  /** 资源冲突（如重复创建） */
  CONFLICT: 409,
  /** 参数校验失败 */
  VALIDATION_ERROR: 422,

  /** 服务器内部错误 */
  INTERNAL_ERROR: 500,
  /** 服务不可用 */
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * 统一 API 响应结构
 */
export interface ApiResponse<T = unknown> {
  /** 业务错误码，与 HTTP 状态码一致 */
  code: ErrorCode;
  /** 提示信息 */
  message: string;
  /** 响应数据 */
  data: T;
}

/**
 * ApiResponse 实例包装类
 *
 * 当 Controller 需要手动控制响应格式时，构造此类实例返回，
 * 拦截器通过 instanceof 精确识别，避免字段重名导致误判。
 *
 * @example
 * // 在 Controller 中手动返回
 * return new ApiResponseWrapper(ErrorCode.SUCCESS, '登录成功', { token: 'xxx' });
 */
export class ApiResponseWrapper<T = unknown> implements ApiResponse<T> {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly data: T,
  ) {}
}
