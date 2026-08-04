import { Module } from '@nestjs/common';
import { FamilyModule } from '../family/family.module';
import { BillController } from './bill.controller';
import { BillService } from './bill.service';

@Module({
  imports: [FamilyModule],
  controllers: [BillController],
  providers: [BillService],
})
export class BillModule {}
