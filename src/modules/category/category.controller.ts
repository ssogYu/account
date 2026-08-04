import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { User } from '../../common/decorators/user.decorator';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({
    summary: '获取分类列表',
    description: '返回系统默认分类 + 当前用户的分类。',
  })
  @ApiResponse({ status: 200, description: '分类列表' })
  findAll(@User('userId') userId: string) {
    return this.categoryService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: '创建自定义分类' })
  @ApiResponse({ status: 200, description: '分类创建成功' })
  @ApiResponse({ status: 409, description: '分类名已存在' })
  create(@User('userId') userId: string, @Body() dto: CreateCategoryDto) {
    return this.categoryService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '修改自定义分类',
    description: '系统默认分类不可修改。',
  })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '系统分类不可修改' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  update(
    @User('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除自定义分类',
    description: '系统默认分类 或 有关联账单的分类不可删除。',
  })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '系统分类不可删除' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  @ApiResponse({ status: 409, description: '分类下存在账单，无法删除' })
  remove(
    @User('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoryService.remove(userId, id);
  }
}
