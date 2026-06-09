import { Global, Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap.service';

@Global()
@Module({
  providers: [BootstrapService],
})
export class BootstrapModule {}
