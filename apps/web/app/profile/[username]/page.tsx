'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Package, Star } from 'lucide-react';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { PageTransition } from '@/components/layout/PageTransition';
import { api } from '@/lib/api';
import { formatNex, getXpProgress } from '@/lib/utils';
import { tRank, tRarity, tError } from '@/lib/i18n';
import { BRAND } from '@nexora/shared';
import { useStore } from '@/lib/store';
import { AvatarFrame } from '@/components/ui/AvatarFrame';

const AVATARS = ['🚀', '💎', '🔥', '⚡', '👑', '🎯', '🌟', '🎮', '🦊', '🐉'];

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const currentUser = useStore((s) => s.user);
  const isOwn = currentUser?.username === username;
  const [data, setData] = useState<{
    profile: {
      username: string; displayName: string; avatar?: string; avatarFrame?: string; level: number; xp: number; rank: string;
      prestige: number; title?: string; isPremium: boolean; bio?: string; createdAt: string;
    };
    stats: { totalWealth: number; investments: number; achievements: number };
    achievements: Array<{ name: string; icon: string; unlockedAt: string }>;
    inventory: Array<{ name: string; rarity: string; quantity: number }>;
  } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.users.profile(username).then(setData).catch((err) => {
      setError(tError(err instanceof Error ? err.message : 'Profile not found'));
    });
  };

  useEffect(() => { load(); }, [username]);

  const setAvatar = async (avatar: string) => {
    setSaving(true);
    try {
      await api.users.updateProfile({ avatar });
      load();
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative p-4">
        <ParticleBackground />
        <GlassCard className="relative z-10 text-center">
          <p className="text-red-400">{error}</p>
          <Link href="/" className="text-nexora-cyan mt-4 inline-block">На главную</Link>
        </GlassCard>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-nexora-cyan/30 border-t-nexora-cyan rounded-full animate-spin" />
      </div>
    );
  }

  const { profile, stats, achievements, inventory } = data;
  const xp = getXpProgress(profile.xp);

  return (
    <div className="relative min-h-screen">
      <ParticleBackground />
      <div className="relative z-10 max-w-5xl mx-auto p-4 sm:p-6">
        <PageTransition>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Link href="/" className="text-nexora-cyan text-sm hover:underline">
              {BRAND.currency.icon} {BRAND.name}
            </Link>
          </motion.div>

          <GlassCard className="mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <AvatarFrame
                size="lg"
                avatar={profile.avatar}
                displayName={profile.displayName}
                frame={profile.avatarFrame}
              />
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold">{profile.displayName}</h1>
                <p className="text-white/60">@{profile.username}</p>
                {profile.title && <Badge className="mt-2">{profile.title}</Badge>}
                {profile.isPremium && <Badge variant="premium" className="ml-2 mt-2">Премиум</Badge>}
                {profile.bio && <p className="text-white/70 mt-3">{profile.bio}</p>}
                {isOwn && (
                  <div className="mt-4">
                    <p className="text-sm text-white/50 mb-2">Выберите аватар:</p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {AVATARS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          disabled={saving}
                          onClick={() => setAvatar(a)}
                          className={`w-10 h-10 rounded-xl text-xl hover:bg-white/10 ${profile.avatar === a ? 'ring-2 ring-nexora-cyan' : ''}`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <ProgressRing progress={xp.percent} size={100} label={`Ур.${profile.level}`} />
            </div>
          </GlassCard>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <GlassCard delay={0.1}>
              <p className="text-white/60 text-sm">Общее богатство</p>
              <p className="text-2xl font-bold text-nexora-cyan">{formatNex(stats.totalWealth)}</p>
            </GlassCard>
            <GlassCard delay={0.15}>
              <p className="text-white/60 text-sm">Инвестиции</p>
              <p className="text-2xl font-bold">{formatNex(stats.investments)}</p>
              <Link href="/invest" className="text-xs text-nexora-cyan hover:underline">Купить активы →</Link>
            </GlassCard>
            <GlassCard delay={0.2}>
              <p className="text-white/60 text-sm">Ранг</p>
              <p className="text-2xl font-bold neon-text">{tRank(profile.rank)}</p>
              <p className="text-xs text-white/40 mt-1">Ранг растёт с уровнем (Новичок — стартовый)</p>
            </GlassCard>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <GlassCard delay={0.25}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" /> Достижения ({stats.achievements})
              </h2>
              <div className="space-y-2">
                {achievements.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                    <span className="text-xl">{a.icon}</span>
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-white/40">{new Date(a.unlockedAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                ))}
                {!achievements.length && (
                  <p className="text-white/50">Выполняйте действия: вход, инвестиции, колесо, переводы</p>
                )}
              </div>
            </GlassCard>

            <GlassCard delay={0.3}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-nexora-purple" /> Инвентарь
              </h2>
              <div className="space-y-2">
                {inventory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <Badge variant="rarity" rarity={item.rarity}>{tRarity(item.rarity)}</Badge>
                    </div>
                    <span className="text-white/60">x{item.quantity}</span>
                  </div>
                ))}
                {!inventory.length && (
                  <p className="text-white/50">
                    Купите предметы в <Link href="/marketplace" className="text-nexora-cyan">магазине</Link> или откройте кейсы
                  </p>
                )}
              </div>
            </GlassCard>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}
