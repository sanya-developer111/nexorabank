import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AchievementsModule } from './achievements/achievements.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuctionsModule } from './auctions/auctions.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { BattlepassModule } from './battlepass/battlepass.module';
import { BusinessModule } from './business/business.module';
import { ChatModule } from './chat/chat.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ContractsModule } from './contracts/contracts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EarnModule } from './earn/earn.module';
import { EconomyModule } from './economy/economy.module';
import { GamesModule } from './games/games.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { InvestmentsModule } from './investments/investments.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PremiumModule } from './premium/premium.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestsModule } from './quests/quests.module';
import { RedisModule } from './redis/redis.module';
import { ReferralModule } from './referral/referral.module';
import { SecurityModule } from './security/security.module';
import { SocialModule } from './social/social.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { ActivitiesModule } from './activities/activities.module';
import { PaymentsModule } from './payments/payments.module';
import { TradesModule } from './trades/trades.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BootstrapModule,
    CommonModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    WalletModule,
    QuestsModule,
    AchievementsModule,
    InvestmentsModule,
    MarketplaceModule,
    AuctionsModule,
    GamesModule,
    EarnModule,
    DashboardModule,
    LeaderboardModule,
    BusinessModule,
    ContractsModule,
    SocialModule,
    ChatModule,
    TournamentsModule,
    BattlepassModule,
    PremiumModule,
    ReferralModule,
    EconomyModule,
    AnalyticsModule,
    AdminModule,
    SecurityModule,
    ActivitiesModule,
    PaymentsModule,
    TradesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
