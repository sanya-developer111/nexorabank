import { Module } from '@nestjs/common';
import { PremiumModule } from '../premium/premium.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [PremiumModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
