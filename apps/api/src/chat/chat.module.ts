import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PremiumModule } from '../premium/premium.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [AuthModule, PremiumModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
