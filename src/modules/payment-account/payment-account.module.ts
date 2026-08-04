import { Module } from '@nestjs/common';
import { FamilyModule } from '../family/family.module';
import { PaymentAccountController } from './payment-account.controller';
import { PaymentAccountService } from './payment-account.service';

@Module({
  imports: [FamilyModule],
  controllers: [PaymentAccountController],
  providers: [PaymentAccountService],
})
export class PaymentAccountModule {}
