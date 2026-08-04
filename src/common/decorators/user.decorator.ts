import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** JWT 鉴权后挂载到 request.user 上的字段 */
export interface RequestUser {
  userId: string;
  email: string;
  username: string;
}

/**
 * 从 JWT 鉴权后的 request.user 中提取信息。
 *
 * @example
 * // 提取 userId（最常用）
 * @Post()
 * create(@User('userId') userId: string, @Body() dto: SomeDto) { ... }
 *
 * @example
 * // 提取邮箱
 * findAll(@User('email') email: string) { ... }
 *
 * @example
 * // 获取完整用户信息
 * profile(@User() user: RequestUser) { ... }
 */
export const User = createParamDecorator(
  <K extends keyof RequestUser | undefined = undefined>(
    data: K,
    ctx: ExecutionContext,
  ): K extends keyof RequestUser ? RequestUser[K] : RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    if (data) {
      return request.user[data] as any;
    }
    return request.user as any;
  },
);
