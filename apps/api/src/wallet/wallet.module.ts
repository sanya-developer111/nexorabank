import { Module } from '@nestjs/common';
import { AchievementsModule } from '../achievements/achievements.module';
import { PremiumModule } from '../premium/premium.module';
import { QuestsModule } from '../quests/quests.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [QuestsModule, AchievementsModule, PremiumModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
