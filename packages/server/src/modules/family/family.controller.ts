import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { FamilyService } from './family.service';
import { CreateFamilyDto, JoinFamilyDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ResponseMessage } from '../../common/decorators';
import {
  ApiResponse as SwaggerApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post('create')
  @SwaggerApiResponse({ status: 200, description: '创建家庭组成功' })
  @ApiConflictResponse({ description: '已加入家庭组，无法重复创建' })
  @ResponseMessage('创建家庭组成功')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateFamilyDto) {
    return this.familyService.create(user.id, dto);
  }

  @Post('join')
  @SwaggerApiResponse({ status: 200, description: '加入家庭组成功' })
  @ApiConflictResponse({ description: '已加入家庭组' })
  @ApiNotFoundResponse({ description: '邀请码无效' })
  @ResponseMessage('加入家庭组成功')
  join(@CurrentUser() user: { id: string }, @Body() dto: JoinFamilyDto) {
    return this.familyService.join(user.id, dto);
  }

  @Get()
  @SwaggerApiResponse({ status: 200, description: '获取家庭组信息' })
  @ResponseMessage('获取成功')
  getMyFamily(@CurrentUser() user: { id: string }) {
    return this.familyService.getMyFamily(user.id);
  }

  @Post('leave')
  @SwaggerApiResponse({ status: 200, description: '退出家庭组成功' })
  @ApiNotFoundResponse({ description: '未加入家庭组' })
  @ResponseMessage('退出家庭组成功')
  leave(@CurrentUser() user: { id: string }) {
    return this.familyService.leave(user.id);
  }

  @Delete('member/:memberId')
  @SwaggerApiResponse({ status: 200, description: '移除成员成功' })
  @ApiForbiddenResponse({ description: '仅组长可以移除成员' })
  @ApiNotFoundResponse({ description: '成员不存在' })
  @ResponseMessage('移除成员成功')
  removeMember(
    @CurrentUser() user: { id: string },
    @Param('memberId') memberId: string,
  ) {
    return this.familyService.removeMember(user.id, memberId);
  }
}
