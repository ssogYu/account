import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { ResponseMessage } from '../../common/decorators';
import { Public } from './decorators';
import {
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiResponse({ status: 201, description: '注册成功，返回用户信息与 JWT' })
  @ApiBadRequestResponse({ description: '参数错误或手机号/邮箱格式不正确' })
  @ApiConflictResponse({ description: '手机号或邮箱已被注册' })
  @ResponseMessage('注册成功')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
  @ApiResponse({ status: 200, description: '登录成功，返回用户信息与 JWT' })
  @ApiUnauthorizedResponse({ description: '账号或密码错误' })
  @ApiBadRequestResponse({ description: '参数错误' })
  @ResponseMessage('登录成功')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
