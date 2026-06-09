import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [WalletModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
