import { Module } from '@nestjs/common';
import { FamilyModule } from '../family/family.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  imports: [FamilyModule],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
