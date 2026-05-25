import { ErrorCode } from './error-code';

// 统一响应结构
export interface ApiResponse<T = unknown> {
  code: ErrorCode;
  message: string;
  data: T | null;
}
