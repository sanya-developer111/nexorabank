import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityLoggingInterceptor } from './activity-logging.interceptor';
import { FraudDetectionService } from './fraud-detection.service';

@Module({
  providers: [
    FraudDetectionService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLoggingInterceptor,
    },
  ],
  exports: [FraudDetectionService],
})
export class SecurityModule {}
