import { Module } from '@nestjs/common';
import { BattlepassController } from './battlepass.controller';
import { BattlepassService } from './battlepass.service';

@Module({
  controllers: [BattlepassController],
  providers: [BattlepassService],
  exports: [BattlepassService],
})
export class BattlepassModule {}
