import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { ContractsModule } from '../contracts/contracts.module';
import { GamesModule } from '../games/games.module';
import { PremiumModule } from '../premium/premium.module';
import { EarnController } from './earn.controller';
import { EarnService } from './earn.service';

@Module({
  imports: [GamesModule, ContractsModule, BusinessModule, PremiumModule],
  controllers: [EarnController],
  providers: [EarnService],
})
export class EarnModule {}
