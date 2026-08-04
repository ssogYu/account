import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
}
