import { Module } from '@nestjs/common';
import { AchievementsModule } from '../achievements/achievements.module';
import { QuestsModule } from '../quests/quests.module';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';

@Module({
  imports: [QuestsModule, AchievementsModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}