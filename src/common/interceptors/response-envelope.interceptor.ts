import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  ApiResponse,
  API_RESPONSE_RAW,
  ApiResponseWrapper,
  ErrorCode,
} from '../dto/api-response.dto';

/**
 * 统一响应格式拦截器
 *
 * 自动将 Controller 返回的原始数据包裹为 { code: 200, message: 'ok', data: T } 格式。
 *
 * 三种行为：
 * 1. 普通返回 → 自动包裹 { code: 200, message: 'ok', data }
 * 2. 返回 ApiResponseWrapper 实例 → 直接透传（用于手动控制 code/message）
 * 3. @SetMetadata(API_RESPONSE_RAW, true) → 完全跳过（用于文件下载、Stream 等）
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const handler = context.getHandler();
    const isRaw = Reflect.getMetadata(API_RESPONSE_RAW, handler);

    // 标记了跳过包裹的方法直接透传
    if (isRaw) {
      return next.handle() as unknown as Observable<ApiResponse<T>>;
    }

    return next.handle().pipe(
      map((data) => {
        // Controller 手动返回 ApiResponseWrapper 实例，直接透传
        if (data instanceof ApiResponseWrapper) {
          return data;
        }

        // 空值兜底保护
        return {
          code: ErrorCode.SUCCESS,
          message: 'ok',
          data: data ?? (null as T),
        };
      }),
    );
  }
}
