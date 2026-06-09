import { Module } from '@nestjs/common';
import { BattlepassModule } from '../battlepass/battlepass.module';
import { QuestsModule } from '../quests/quests.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
  imports: [QuestsModule, BattlepassModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
