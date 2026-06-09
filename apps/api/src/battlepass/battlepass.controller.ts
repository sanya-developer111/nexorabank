import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BattlepassService } from './battlepass.service';

@Controller('battlepass')
@UseGuards(JwtAuthGuard)
export class BattlepassController {
  constructor(private readonly battlepassService: BattlepassService) {}

  @Get()
  async getProgress(@CurrentUser() user: SafeUser) {
    const raw = await this.battlepassService.getProgress(user.id);
    if (!raw.season || !raw.progress || !raw.tiers) return raw;

    return {
      season: {
        name: raw.season.name,
        number: raw.season.number,
        endsAt: raw.season.endsAt.toISOString(),
      },
      currentTier: raw.progress.currentTier,
      currentXp: raw.progress.currentXp,
      isPremium: raw.progress.isPremium,
      tiers: raw.tiers.map((t) => ({
        tier: t.tier,
        xpRequired: t.xpRequired,
        freeReward: t.freeReward as Record<string, unknown> | undefined,
        premiumReward: t.premiumReward as Record<string, unknown> | undefined,
        claimed: t.claimed,
      })),
    };
  }

  @Post('claim/:tier')
  claimTier(@CurrentUser() user: SafeUser, @Param('tier') tier: string) {
    return this.battlepassService.claimTier(user.id, parseInt(tier, 10));
  }
}
