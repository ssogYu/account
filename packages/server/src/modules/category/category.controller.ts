import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, QueryCategoryDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ResponseMessage } from '../../common/decorators';
import {
  ApiResponse as SwaggerApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @SwaggerApiResponse({ status: 200, description: '获取分类列表' })
  @ResponseMessage('获取成功')
  findMany(
    @CurrentUser() user: { id: string },
    @Query() query: QueryCategoryDto,
  ) {
    return this.categoryService.findMany(user.id, query);
  }

  @Post()
  @SwaggerApiResponse({ status: 200, description: '创建分类成功' })
  @ApiBadRequestResponse({ description: '参数错误' })
  @ResponseMessage('创建分类成功')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCategoryDto) {
    return this.categoryService.create(user.id, dto);
  }

  @Put(':id')
  @SwaggerApiResponse({ status: 200, description: '更新分类成功' })
  @ApiNotFoundResponse({ description: '分类不存在' })
  @ResponseMessage('更新分类成功')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(user.id, id, dto);
  }

  @Delete(':id')
  @SwaggerApiResponse({ status: 200, description: '删除分类成功' })
  @ApiNotFoundResponse({ description: '分类不存在' })
  @ResponseMessage('删除分类成功')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.categoryService.remove(user.id, id);
  }
}
