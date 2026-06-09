import { Module } from '@nestjs/common';
import { AchievementsModule } from '../achievements/achievements.module';
import { QuestsModule } from '../quests/quests.module';
import { PremiumModule } from '../premium/premium.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [QuestsModule, PremiumModule, AchievementsModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
