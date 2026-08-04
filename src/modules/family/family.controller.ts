import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { User } from '../../common/decorators/user.decorator';
import { CreateFamilyDto } from './dto/create-family.dto';
import { JoinFamilyDto } from './dto/join-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { FamilyService } from './family.service';

@ApiTags('families')
@Controller('families')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get('my')
  @ApiOperation({
    summary: '获取我的家庭组',
    description:
      '返回当前用户所属家庭组信息（含成员列表），未加入则返回 null。',
  })
  @ApiResponse({ status: 200, description: '家庭组信息 或 null' })
  getByUser(@User('userId') userId: string) {
    return this.familyService.getByUser(userId);
  }

  @Post()
  @ApiOperation({
    summary: '创建家庭组',
    description: '创建家庭组并自动将创建者设为 owner，返回邀请码供分享。',
  })
  @ApiResponse({ status: 200, description: '家庭组创建成功' })
  @ApiResponse({ status: 409, description: '已加入其他家庭组' })
  create(@User('userId') userId: string, @Body() dto: CreateFamilyDto) {
    return this.familyService.create(userId, dto);
  }

  @Post('join')
  @ApiOperation({
    summary: '通过邀请码加入家庭组',
    description: '填写 8 位邀请码加入对应家庭组。',
  })
  @ApiResponse({ status: 200, description: '加入成功' })
  @ApiResponse({ status: 404, description: '邀请码无效' })
  @ApiResponse({ status: 409, description: '已在其他家庭组中' })
  join(@User('userId') userId: string, @Body() dto: JoinFamilyDto) {
    return this.familyService.join(userId, dto);
  }

  @Post('leave')
  @ApiOperation({
    summary: '退出家庭组',
    description: '退出当前家庭组（owner 需先解散）。',
  })
  @ApiResponse({ status: 200, description: '退出成功' })
  @ApiResponse({ status: 403, description: 'owner 无法直接退出' })
  @ApiResponse({ status: 404, description: '未加入任何家庭组' })
  @HttpCode(200)
  leave(@User('userId') userId: string) {
    return this.familyService.leave(userId);
  }

  @Delete('dissolve')
  @ApiOperation({
    summary: '解散家庭组',
    description: '仅 owner 可解散，级联删除所有成员关系和家庭组数据。',
  })
  @ApiResponse({ status: 200, description: '已解散' })
  @ApiResponse({ status: 403, description: '非 owner 无权限' })
  @ApiResponse({ status: 404, description: '未加入任何家庭组' })
  dissolve(@User('userId') userId: string) {
    return this.familyService.dissolve(userId);
  }

  @Delete('members/:memberId')
  @ApiOperation({
    summary: '移除家庭成员',
    description: '仅 owner 可移除指定成员。',
  })
  @ApiResponse({ status: 200, description: '移除成功' })
  @ApiResponse({ status: 403, description: '非 owner 无权限' })
  @ApiResponse({ status: 404, description: '该成员不在家庭组中' })
  removeMember(
    @User('userId') userId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.familyService.removeMember(userId, memberId);
  }

  @Post('update')
  @ApiOperation({
    summary: '修改家庭组名称',
    description: '仅 owner 可修改。',
  })
  @ApiResponse({ status: 200, description: '修改成功' })
  @ApiResponse({ status: 403, description: '非 owner 无权限' })
  updateName(@User('userId') userId: string, @Body() dto: UpdateFamilyDto) {
    return this.familyService.updateName(userId, dto);
  }

  @Post('invite-code')
  @ApiOperation({
    summary: '刷新邀请码',
    description: '仅 owner 可刷新，旧邀请码立即失效。',
  })
  @ApiResponse({ status: 200, description: '新邀请码' })
  @ApiResponse({ status: 403, description: '非 owner 无权限' })
  newInviteCode(@User('userId') userId: string) {
    return this.familyService.newInviteCode(userId);
  }
}
