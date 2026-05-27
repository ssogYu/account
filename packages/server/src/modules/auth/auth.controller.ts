import { Controller, Post, Body, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto';
import { ResponseMessage } from '../../common/decorators';
import { Public, CurrentUser } from './decorators';
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
  @ApiResponse({ status: 200, description: '注册成功，返回用户信息与 JWT' })
  @ApiBadRequestResponse({ description: '参数错误或手机号/邮箱格式不正确' })
  @ApiConflictResponse({ description: '手机号或邮箱已被注册' })
  @ResponseMessage('注册成功')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiResponse({ status: 200, description: '登录成功，返回用户信息与 JWT' })
  @ApiUnauthorizedResponse({ description: '账号或密码错误' })
  @ApiBadRequestResponse({ description: '参数错误' })
  @ResponseMessage('登录成功')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Patch('profile')
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiBadRequestResponse({ description: '参数错误' })
  @ResponseMessage('更新成功')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }
}
