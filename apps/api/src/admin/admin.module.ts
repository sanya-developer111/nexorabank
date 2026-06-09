import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { EconomyModule } from '../economy/economy.module';
import { PremiumModule } from '../premium/premium.module';
import { SecurityModule } from '../security/security.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [EconomyModule, SecurityModule, PremiumModule, ActivitiesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
