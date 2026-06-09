'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Swords } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Badge } from '@/components/ui/Badge';
import { AvatarFrame } from '@/components/ui/AvatarFrame';
import { api } from '@/lib/api';
import { formatNex } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { tError } from '@/lib/i18n';

export default function PremiumPage() {
  const { user, fetchUser } = useStore();
  const [plans, setPlans] = useState<Array<{
    id: string; name: string; price: number; benefits: string[];
  }>>([]);
  const [status, setStatus] = useState<{
    isPremium: boolean; tier?: string | null; title?: string; avatarFrame?: string; expiresAt?: string;
  } | null>(null);
  const [tournaments, setTournaments] = useState<Array<{
    id: string; name: string; description?: string; prizePool: number; entryFee: number;
    endsAt: string; timeLeftMs: number; winDescription?: string;
    premiumOnly: boolean; isJoined: boolean; canJoin: boolean; entryFeeDiscount: number;
  }>>([]);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState('');

  const load = () => {
    Promise.all([api.premium.plans(), api.premium.status(), api.tournaments.list()])
      .then(([p, s, t]) => { setPlans(p); setStatus(s); setTournaments(t ?? []); })
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatCountdown = (endsAt: string, timeLeftMs: number) => {
    const ms = Math.max(0, new Date(endsAt).getTime() - now) || timeLeftMs;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}ч ${m}м ${s}с`;
  };

  const subscribe = async (planId: string) => {
    try {
      const res = await api.premium.subscribe(planId);
      setMessage(`Премиум активирован до ${new Date(res.expiresAt).toLocaleDateString('ru-RU')}`);
      await fetchUser();
      load();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Subscription failed'));
    }
  };

  const joinTournament = async (id: string) => {
    try {
      await api.tournaments.join(id);
      setMessage('Вы зарегистрированы на турнир');
      load();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Failed'));
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold font-display neon-text">NEXORA Premium</h1>
          <p className="text-white/60 mt-2">Все бонусы работают: кэшбэк, колесо, магазин, квесты, косметика, чат, турниры</p>
          {status?.isPremium && (
            <div className="flex flex-col items-center gap-3 mt-6">
              {user && (
                <AvatarFrame
                  avatar={user.avatar}
                  displayName={user.displayName}
                  frame={status.avatarFrame}
                  size="lg"
                />
              )}
              <Badge variant="premium">{status.title ?? 'Премиум'}</Badge>
              {status.tier && <Badge>Тариф: {status.tier.toUpperCase()}</Badge>}
              {status.expiresAt && (
                <p className="text-sm text-white/50">Истекает: {new Date(status.expiresAt).toLocaleDateString('ru-RU')}</p>
              )}
            </div>
          )}
        </motion.div>

        {message && <GlassCard className="text-center"><p className="text-nexora-cyan">{message}</p></GlassCard>}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <GlassCard key={plan.id} delay={i * 0.1} className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-nexora-gradient opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <p className="text-3xl font-bold text-nexora-cyan mt-2">{formatNex(plan.price)}<span className="text-sm text-white/50">/мес</span></p>
              <ul className="mt-6 space-y-3">
                {plan.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <NeonButton className="w-full mt-6" onClick={() => subscribe(plan.id)}>
                Оформить подписку
              </NeonButton>
            </GlassCard>
          ))}
        </div>

        <GlassCard>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Swords className="w-5 h-5 text-nexora-purple" /> Турниры
          </h2>
          <p className="text-sm text-white/50 mb-4">
            Премиум: −50% взнос и +20% мест. Elite-only турниры — только для тарифа Elite.
          </p>
          <div className="space-y-3">
            {tournaments.map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-white/5">
                <div>
                  <p className="font-bold">{t.name}</p>
                  <p className="text-sm text-white/50">{t.description}</p>
                  <p className="text-sm text-nexora-cyan">Призовой фонд: {formatNex(t.prizePool)}</p>
                  {t.winDescription && <p className="text-xs text-white/40 mt-1">Условие: {t.winDescription}</p>}
                  <p className="text-xs text-orange-300 mt-1">
                    До конца: {formatCountdown(t.endsAt, t.timeLeftMs)}
                  </p>
                  {t.premiumOnly && <Badge variant="premium" className="mt-1">Только Elite</Badge>}
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    Взнос: {formatNex(t.entryFeeDiscount ? t.entryFee * (1 - t.entryFeeDiscount) : t.entryFee)}
                    {t.entryFeeDiscount > 0 && <span className="text-green-400 text-xs ml-1">(−50%)</span>}
                  </p>
                  {t.isJoined ? (
                    <Badge variant="success" className="mt-2">Участвуете</Badge>
                  ) : (
                    <NeonButton
                      size="sm"
                      className="mt-2"
                      disabled={!t.canJoin}
                      onClick={() => joinTournament(t.id)}
                    >
                      {t.canJoin ? 'Вступить' : 'Недоступно'}
                    </NeonButton>
                  )}
                </div>
              </div>
            ))}
            {!tournaments.length && <p className="text-white/50">Турниры загружаются при старте API</p>}
          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}
