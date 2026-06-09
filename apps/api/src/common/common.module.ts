import { Global, Module } from '@nestjs/common';
import { EconomyEventsService } from './services/economy-events.service';
import { WalletOperationsService } from './services/wallet-operations.service';

@Global()
@Module({
  providers: [WalletOperationsService, EconomyEventsService],
  exports: [WalletOperationsService, EconomyEventsService],
})
export class CommonModule {}
