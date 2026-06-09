'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Gift, Lock } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { api } from '@/lib/api';
import { formatNex } from '@/lib/utils';

function formatReward(reward?: Record<string, unknown>) {
  if (!reward) return '—';
  const parts: string[] = [];
  if (reward.nex) parts.push(formatNex(Number(reward.nex)));
  if (reward.xp) parts.push(`${reward.xp} XP`);
  return parts.join(' · ') || '—';
}

export default function BattlePassPage() {
  const [bp, setBp] = useState<{
    season: { name: string; number: number; endsAt: string };
    currentTier: number;
    currentXp: number;
    isPremium: boolean;
    tiers: Array<{
      tier: number; xpRequired: number;
      freeReward?: Record<string, unknown>;
      premiumReward?: Record<string, unknown>;
      claimed: boolean;
    }>;
  } | null>(null);

  const load = () => api.battlepass.get().then(setBp).catch(() => setBp(null));
  useEffect(() => { load(); }, []);

  const claimTier = async (tier: number) => {
    await api.battlepass.claimTier(tier);
    load();
  };

  if (!bp || !bp.season) {
    return (
      <PageTransition>
        <GlassCard className="text-center">
          <p className="text-white/60">Боевой пропуск скоро будет доступен. Перезапустите API для загрузки данных сезона.</p>
        </GlassCard>
      </PageTransition>
    );
  }

  const tiers = bp.tiers ?? [];
  const nextTier = tiers.find((t) => t.tier === bp.currentTier + 1);
  const xpProgress = nextTier ? (bp.currentXp / nextTier.xpRequired) * 100 : 100;

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-4">
            <Swords className="w-10 h-10 text-nexora-purple" />
            <div>
              <h1 className="text-3xl font-bold font-display">{bp.season.name}</h1>
              <p className="text-white/60">Сезон {bp.season.number} · Заканчивается {new Date(bp.season.endsAt).toLocaleDateString('ru-RU')}</p>
            </div>
          </div>
        </motion.div>

        <GlassCard>
          <div className="flex items-center gap-6">
            <ProgressRing progress={xpProgress} size={100} label={`Ур. ${bp.currentTier}`} />
            <div>
              <p className="text-2xl font-bold">{bp.currentXp} XP</p>
              {nextTier && <p className="text-white/50">{nextTier.xpRequired - bp.currentXp} XP до ур. {nextTier.tier}</p>}
              {bp.isPremium && <Badge variant="premium" className="mt-2">Премиум-пропуск</Badge>}
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {tiers.map((tier, i) => {
            const unlocked = bp.currentTier >= tier.tier;
            return (
              <GlassCard key={tier.tier} delay={i * 0.02} className={`!p-4 text-center ${unlocked ? '' : 'opacity-50'}`}>
                <p className="text-sm text-white/50 mb-2">Ур. {tier.tier}</p>
                {unlocked ? <Gift className="w-8 h-8 text-nexora-cyan mx-auto" /> : <Lock className="w-8 h-8 text-white/30 mx-auto" />}
                <p className="text-xs text-white/60 mt-2">
                  {formatReward(tier.freeReward)}
                </p>
                {tier.premiumReward && bp.isPremium && (
                  <p className="text-xs text-yellow-400/80 mt-1">Премиум: {formatReward(tier.premiumReward)}</p>
                )}
                {unlocked && !tier.claimed && (
                  <NeonButton size="sm" className="mt-2 w-full" onClick={() => claimTier(tier.tier)}>
                    Получить
                  </NeonButton>
                )}
                {tier.claimed && <Badge variant="success" className="mt-2">Получено</Badge>}
              </GlassCard>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
