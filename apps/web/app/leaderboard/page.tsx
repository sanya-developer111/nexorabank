'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown } from 'lucide-react';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/layout/PageTransition';
import { api } from '@/lib/api';
import { formatNex } from '@/lib/utils';
import { tRank } from '@/lib/i18n';
import { BRAND } from '@nexora/shared';
import { AvatarFrame } from '@/components/ui/AvatarFrame';

const rankIcons = [Crown, Medal, Trophy];

export default function LeaderboardPage() {
  const [type, setType] = useState<'wealth' | 'level' | 'investments'>('wealth');
  const [entries, setEntries] = useState<Array<{
    rank: number; username: string; displayName: string; avatar?: string | null; avatarFrame?: string | null;
    title?: string | null; premiumTier?: string | null; level: number; value: number; rank_title: string;
  }>>([]);

  useEffect(() => {
    api.leaderboard.list(type).then(setEntries).catch(() => setEntries([]));
  }, [type]);

  return (
    <div className="relative min-h-screen">
      <ParticleBackground />
      <div className="relative z-10 max-w-4xl mx-auto p-4 sm:p-6">
        <PageTransition>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold font-display">Таблица лидеров</h1>
              <p className="text-white/60">Лучшие игроки вселенной {BRAND.name}</p>
            </div>
            <Link href="/" className="text-nexora-cyan text-sm hover:underline">
              {BRAND.currency.icon} Главная
            </Link>
          </div>

          <Tabs
            tabs={[
              { id: 'wealth', label: 'Богатство' },
              { id: 'level', label: 'Уровень' },
              { id: 'investments', label: 'Инвестиции' },
            ]}
            active={type}
            onChange={(id) => setType(id as typeof type)}
            className="mb-6"
          />

          <div className="space-y-3">
            {entries.map((entry, i) => {
              const Icon = rankIcons[entry.rank - 1] || Trophy;
              return (
                <motion.div
                  key={entry.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard hover className="!p-4">
                    <div className="flex items-center gap-4">
                      {entry.rank <= 3 && !entry.avatar && !entry.avatarFrame ? (
                        <div className="w-10 h-10 rounded-full bg-nexora-gradient flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                      ) : (
                        <AvatarFrame
                          size="sm"
                          avatar={entry.avatar ?? undefined}
                          displayName={entry.displayName}
                          frame={entry.avatarFrame}
                        />
                      )}
                      <div className="flex-1">
                        <Link href={`/profile/${entry.username}`} className="font-bold hover:text-nexora-cyan">
                          {entry.displayName}
                        </Link>
                        <p className="text-sm text-white/50">@{entry.username}</p>
                      </div>
                      <Badge>Ур.{entry.level}</Badge>
                      <Badge>{tRank(entry.rank_title)}</Badge>
                      <p className="text-lg font-bold text-nexora-cyan min-w-[120px] text-right">
                        {type === 'level' ? `Ур.${entry.value}` : formatNex(entry.value)}
                      </p>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
            {!entries.length && <p className="text-white/50 text-center">Рейтинг недоступен</p>}
          </div>
        </PageTransition>
      </div>
    </div>
  );
}
