import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { ErrorCode, ApiResponse } from '../shared';
import { RESPONSE_MESSAGE_METADATA_KEY } from '../consts';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const customMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_METADATA_KEY,
      [_context.getHandler(), _context.getClass()],
    );
    const message = customMessage ?? '操作成功';

    return next.handle().pipe(
      map((data: T) => ({
        code: ErrorCode.SUCCESS,
        message,
        data: (data ?? null) as T,
      })),
    );
  }
}
