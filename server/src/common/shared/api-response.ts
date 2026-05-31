import { ErrorCode } from './error-code';

export interface ApiResponse<T = unknown> {
  code: ErrorCode;
  message: string;
  data: T;
}