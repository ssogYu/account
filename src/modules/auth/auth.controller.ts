import { Body, Controller, Post, HttpCode, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { User } from '../../common/decorators/user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: '用户注册',
    description: '使用邮箱、用户名、密码创建新账号。',
  })
  @ApiResponse({ status: 201, description: '注册成功，返回用户信息' })
  @ApiResponse({ status: 409, description: '邮箱或用户名已存在' })
  @HttpCode(201)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: '用户登录',
    description: '使用邮箱和密码登录，返回 JWT access token。',
  })
  @ApiResponse({ status: 200, description: '登录成功，返回 token' })
  @ApiResponse({ status: 401, description: '邮箱或密码错误' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @ApiOperation({
    summary: '用户登出',
    description: '记录登出时间，JWT token 在客户端清除即可。',
  })
  @ApiResponse({ status: 200, description: '登出成功' })
  logout(@User('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @Patch('profile')
  @ApiOperation({
    summary: '修改用户资料',
    description:
      '修改用户名和/或头像。至少提供一个字段。头像 URL 由 /upload 接口获取。',
  })
  @ApiResponse({ status: 200, description: '更新成功，返回最新用户信息' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 409, description: '用户名已被占用' })
  updateProfile(@User('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto);
  }
}
