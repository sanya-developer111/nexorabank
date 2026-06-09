'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Wallet, Coins, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { BalanceChart } from '@/components/charts/BalanceChart';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { formatNex, getXpProgress } from '@/lib/utils';
import { tRank } from '@/lib/i18n';

const quickActions = [
  { href: '/wallet', label: 'Перевод', icon: Wallet, color: 'text-nexora-cyan' },
  { href: '/earn', label: 'Ежедневное задание', icon: Coins, color: 'text-yellow-400' },
  { href: '/invest', label: 'Инвестиции', icon: TrendingUp, color: 'text-green-400' },
  { href: '/social', label: 'Сообщество', icon: Users, color: 'text-nexora-purple' },
];

export default function DashboardPage() {
  const { user, wallet } = useStore();
  const [stats, setStats] = useState<{
    chartData: Array<{ date: string; balance: number }>;
    recentActivity: Array<{ type: string; amount: number; createdAt: string }>;
  } | null>(null);

  useEffect(() => {
    api.dashboard.stats().then(setStats).catch(() => setStats({ chartData: [], recentActivity: [] }));
  }, []);

  const xp = user ? getXpProgress(user.xp) : { current: 0, needed: 100, percent: 0 };

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-3xl font-bold font-display">
            С возвращением, <span className="neon-text">{user?.displayName}</span>
          </h1>
          <p className="text-white/60 mt-1">Ваш финансовый командный центр</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard delay={0.1}>
            <p className="text-white/60 text-sm">Общий баланс</p>
            <p className="text-3xl font-bold text-nexora-cyan mt-1">
              <AnimatedCounter value={wallet?.totalBalance ?? 0} prefix="◈ " />
            </p>
          </GlassCard>
          <GlassCard delay={0.15}>
            <p className="text-white/60 text-sm">Уровень</p>
            <p className="text-3xl font-bold mt-1">{user?.level ?? 1}</p>
            <p className="text-xs text-white/50 mt-1">{user?.rank ? tRank(user.rank) : ''}</p>
          </GlassCard>
          <GlassCard delay={0.2}>
            <p className="text-white/60 text-sm">Прогресс XP</p>
            <div className="flex items-center gap-4 mt-2">
              <ProgressRing progress={xp.percent} size={80} strokeWidth={6} />
              <div>
                <p className="font-bold">{xp.current} XP</p>
                <p className="text-xs text-white/50">/ {xp.needed} до ур. {(user?.level ?? 1) + 1}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard delay={0.25}>
            <p className="text-white/60 text-sm">Серия входов</p>
            <p className="text-3xl font-bold mt-1">{user?.loginStreak ?? 0} дн.</p>
          </GlassCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <GlassCard className="lg:col-span-2" delay={0.3}>
            <h2 className="text-lg font-bold mb-4">История баланса</h2>
            <BalanceChart data={stats?.chartData ?? []} />
          </GlassCard>

          <GlassCard delay={0.35}>
            <h2 className="text-lg font-bold mb-4">Быстрые действия</h2>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                    <span>{action.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60" />
                </Link>
              ))}
            </div>
          </GlassCard>
        </div>

        <GlassCard delay={0.4}>
          <h2 className="text-lg font-bold mb-4">Недавняя активность</h2>
          {stats?.recentActivity.length ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-white/80">{activity.type}</span>
                  <span className="text-nexora-cyan font-medium">{formatNex(activity.amount)}</span>
                  <span className="text-white/40 text-sm">
                    {new Date(activity.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/50">Нет недавней активности</p>
          )}
        </GlassCard>
      </div>
    </PageTransition>
  );
}
