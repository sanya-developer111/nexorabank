'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Calendar, ListChecks, ScrollText, Shield, Crown } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { tStatus, tError } from '@/lib/i18n';

export default function AdminPage() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState<Array<{
    id: string; username: string; email: string; role: string; level: number; isBanned: boolean;
    isPremium?: boolean; premiumUntil?: string | null;
  }>>([]);
  const [premiumForm, setPremiumForm] = useState({
    username: '',
    plan: 'pro' as 'starter' | 'pro' | 'elite',
    durationDays: '30',
  });
  const [premiumMsg, setPremiumMsg] = useState('');
  const [economy, setEconomy] = useState<{
    totalSupply: number; circulating: number; burned: number; inflationRate: number;
  } | null>(null);
  const [events, setEvents] = useState<Array<{
    id: string; type: string; title: string; description: string;
    multiplier?: number; startsAt: string; endsAt: string; isActive: boolean;
  }>>([]);
  const [quests, setQuests] = useState<Array<{
    id: string; title: string; period: string; isActive: boolean;
  }>>([]);
  const [logs, setLogs] = useState<Array<{
    id: string; action: string; entity?: string; userId?: string; createdAt: string;
  }>>([]);
  const [newEvent, setNewEvent] = useState({ type: 'BOOM', title: '', description: '' });
  const [videos, setVideos] = useState<Array<{
    id: string; slug: string; title: string; description: string;
    videoUrl: string; videoType: string; durationSec: number; baseReward: number; isActive: boolean;
  }>>([]);
  const [videoForm, setVideoForm] = useState({
    slug: '', title: '', description: '', videoUrl: '', videoType: 'mp4', durationSec: '30', baseReward: '25',
  });
  const [levelForm, setLevelForm] = useState({ userId: '', level: '10', xp: '' });

  const loadTab = async () => {
    switch (tab) {
      case 'users': {
        const res = await api.admin.users();
        setUsers(res.items);
        break;
      }
      case 'economy':
        setEconomy(await api.admin.economy());
        break;
      case 'events':
        setEvents(await api.admin.events());
        break;
      case 'quests':
        setQuests(await api.admin.quests());
        break;
      case 'logs': {
        const res = await api.admin.logs();
        setLogs(res.items);
        break;
      }
      case 'videos':
        setVideos(await api.admin.videos());
        break;
    }
  };

  useEffect(() => { loadTab().catch(() => {}); }, [tab]);

  const [balanceForm, setBalanceForm] = useState({ userId: '', amount: '', reason: 'Корректировка', accountType: 'MAIN' });

  const banUser = async (id: string, ban: boolean) => {
    if (ban) {
      await api.admin.banUser(id, 'Нарушение правил');
    } else {
      await api.admin.unbanUser(id);
    }
    loadTab();
  };

  const adjustBalance = async () => {
    if (!balanceForm.userId || !balanceForm.amount) return;
    await api.admin.adjustAccount({
      userId: balanceForm.userId,
      accountType: balanceForm.accountType,
      amount: parseFloat(balanceForm.amount),
      reason: balanceForm.reason,
    });
    setBalanceForm({ userId: '', amount: '', reason: 'Корректировка', accountType: 'MAIN' });
    loadTab();
  };

  const deleteUser = async (id: string, username: string) => {
    if (!confirm(`Удалить аккаунт @${username}? Это необратимо.`)) return;
    await api.admin.deleteUser(id);
    loadTab();
  };

  const viewAccounts = async (id: string) => {
    const u = await api.admin.getUser(id);
    const lines = (u.accounts ?? []).map((a) => `${a.type}: ${a.balance} NEX`).join('\n');
    alert(`Счета @${u.username}:\n${lines || 'нет данных'}`);
  };

  const grantPremium = async (opts?: { userId?: string; username?: string }) => {
    setPremiumMsg('');
    try {
      const res = await api.admin.grantPremium({
        userId: opts?.userId,
        username: opts?.username ?? premiumForm.username,
        plan: premiumForm.plan,
        durationDays: parseInt(premiumForm.durationDays, 10) || 30,
      });
      setPremiumMsg(`Премиум «${res.plan}» выдан @${res.username} до ${new Date(res.expiresAt).toLocaleDateString('ru-RU')}`);
      setPremiumForm((f) => ({ ...f, username: '' }));
      loadTab();
    } catch (err) {
      setPremiumMsg(tError(err instanceof Error ? err.message : 'Ошибка'));
    }
  };

  const revokePremium = async (userId: string) => {
    setPremiumMsg('');
    try {
      const res = await api.admin.revokePremium(userId);
      setPremiumMsg(`Премиум снят с @${res.username}`);
      loadTab();
    } catch (err) {
      setPremiumMsg(tError(err instanceof Error ? err.message : 'Ошибка'));
    }
  };

  const createEvent = async () => {
    await api.admin.createEvent({
      ...newEvent,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      multiplier: 1.5,
    });
    setNewEvent({ type: 'BOOM', title: '', description: '' });
    loadTab();
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
          <Shield className="w-10 h-10 text-admin-red" />
          <div>
            <h1 className="text-3xl font-bold text-admin-red">Панель администратора</h1>
            <p className="text-red-300/60">Управление системой и мониторинг</p>
          </div>
        </motion.div>

        <Tabs
          tabs={[
            { id: 'users', label: 'Пользователи' },
            { id: 'economy', label: 'Экономика' },
            { id: 'events', label: 'События' },
            { id: 'quests', label: 'Задания' },
            { id: 'logs', label: 'Журнал' },
            { id: 'videos', label: 'Видео' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'users' && (
          <div className="space-y-4">
            <GlassCard className="!border-red-500/20">
              <h3 className="font-bold mb-3">Изменение уровня</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <Input label="ID пользователя" value={levelForm.userId} onChange={(e) => setLevelForm({ ...levelForm, userId: e.target.value })} />
                <Input label="Уровень" type="number" min="1" value={levelForm.level} onChange={(e) => setLevelForm({ ...levelForm, level: e.target.value })} />
                <Input label="XP (необяз.)" type="number" min="0" value={levelForm.xp} onChange={(e) => setLevelForm({ ...levelForm, xp: e.target.value })} />
                <NeonButton onClick={async () => {
                  await api.admin.updateLevel({
                    userId: levelForm.userId,
                    level: parseInt(levelForm.level, 10),
                    ...(levelForm.xp ? { xp: parseInt(levelForm.xp, 10) } : {}),
                  });
                  loadTab();
                }}>Применить</NeonButton>
              </div>
            </GlassCard>

            <GlassCard className="!border-red-500/20">
              <h3 className="font-bold mb-3">Изменение счёта</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <Input label="ID пользователя" value={balanceForm.userId} onChange={(e) => setBalanceForm({ ...balanceForm, userId: e.target.value })} />
                <div>
                  <label className="text-sm text-white/60">Счёт</label>
                  <select className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2" value={balanceForm.accountType} onChange={(e) => setBalanceForm({ ...balanceForm, accountType: e.target.value })}>
                    <option value="MAIN">Основной</option>
                    <option value="SAVINGS">Накопительный</option>
                    <option value="INVESTMENT">Инвестиционный</option>
                    <option value="BUSINESS">Бизнес</option>
                  </select>
                </div>
                <Input label="Сумма (+/-)" value={balanceForm.amount} onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })} />
                <Input label="Причина" value={balanceForm.reason} onChange={(e) => setBalanceForm({ ...balanceForm, reason: e.target.value })} />
                <NeonButton onClick={adjustBalance}>Применить</NeonButton>
              </div>
            </GlassCard>

            <GlassCard className="!border-yellow-500/30">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" /> Выдать премиум (бесплатно)
              </h3>
              <p className="text-sm text-white/50 mb-4">NEX не списываются — только для ADMIN / SUPER_ADMIN</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <Input
                  label="Имя пользователя"
                  placeholder="username"
                  value={premiumForm.username}
                  onChange={(e) => setPremiumForm({ ...premiumForm, username: e.target.value })}
                />
                <div>
                  <label className="text-sm text-white/60">Тариф</label>
                  <select
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                    value={premiumForm.plan}
                    onChange={(e) => setPremiumForm({ ...premiumForm, plan: e.target.value as typeof premiumForm.plan })}
                  >
                    <option value="starter">Plus (starter)</option>
                    <option value="pro">Pro</option>
                    <option value="elite">Elite</option>
                  </select>
                </div>
                <Input
                  label="Дней"
                  type="number"
                  min="1"
                  value={premiumForm.durationDays}
                  onChange={(e) => setPremiumForm({ ...premiumForm, durationDays: e.target.value })}
                />
                <NeonButton onClick={() => grantPremium()}>Выдать</NeonButton>
              </div>
              {premiumMsg && <p className="text-sm mt-3 text-yellow-300">{premiumMsg}</p>}
            </GlassCard>

            {users.map((u, i) => (
              <GlassCard key={u.id} delay={i * 0.03} className="!border-red-500/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-admin-red shrink-0" />
                    <div>
                      <p className="font-bold">@{u.username}</p>
                      <p className="text-sm text-white/50">{u.email}</p>
                      {u.isPremium && u.premiumUntil && (
                        <p className="text-xs text-yellow-400">
                          Премиум до {new Date(u.premiumUntil).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{u.role}</Badge>
                    <Badge>Ур.{u.level}</Badge>
                    {u.isPremium && <Badge variant="premium">Премиум</Badge>}
                    <NeonButton size="sm" variant="secondary" onClick={() => grantPremium({ userId: u.id, username: u.username })}>
                      Премиум
                    </NeonButton>
                    {u.isPremium && (
                      <NeonButton size="sm" variant="secondary" onClick={() => revokePremium(u.id)}>
                        Снять
                      </NeonButton>
                    )}
                    <NeonButton size="sm" variant="secondary" onClick={() => viewAccounts(u.id)}>Счета</NeonButton>
                    <NeonButton size="sm" variant="secondary" onClick={() => setBalanceForm((f) => ({ ...f, userId: u.id }))}>Баланс</NeonButton>
                    <NeonButton size="sm" variant="secondary" onClick={() => setLevelForm({ userId: u.id, level: String(u.level), xp: '' })}>Уровень</NeonButton>
                    {u.isBanned ? (
                      <NeonButton size="sm" variant="secondary" onClick={() => banUser(u.id, false)}>Разбанить</NeonButton>
                    ) : (
                      <NeonButton size="sm" variant="danger" onClick={() => banUser(u.id, true)}>Бан</NeonButton>
                    )}
                    <NeonButton size="sm" variant="danger" onClick={() => deleteUser(u.id, u.username)}>Удалить</NeonButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'economy' && economy && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Общая эмиссия', value: economy.totalSupply, icon: TrendingUp },
              { label: 'В обороте', value: economy.circulating, icon: TrendingUp },
              { label: 'Сожжено', value: economy.burned, icon: TrendingUp },
              { label: 'Уровень инфляции', value: `${(economy.inflationRate * 100).toFixed(2)}%`, icon: TrendingUp },
            ].map((stat, i) => (
              <GlassCard key={stat.label} delay={i * 0.05} className="!border-red-500/20">
                <stat.icon className="w-6 h-6 text-admin-red mb-2" />
                <p className="text-white/50 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-red-300">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString('ru-RU') : stat.value}
                </p>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-4">
            <GlassCard className="!border-red-500/20">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-admin-red" /> Создать событие
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Input label="Название" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
                <Input label="Описание" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
                <Input label="Тип" value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })} />
              </div>
              <NeonButton className="mt-4" variant="danger" onClick={createEvent}>Создать событие</NeonButton>
            </GlassCard>
            {events.map((e, i) => (
              <GlassCard key={e.id} delay={i * 0.03} className="!border-red-500/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{e.title}</h3>
                    <p className="text-sm text-white/60">{e.description}</p>
                    <p className="text-xs text-white/40 mt-1">
                      Множитель ×{e.multiplier ?? 1} · до {new Date(e.endsAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <Badge variant={e.isActive ? 'success' : 'default'}>{e.type}</Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'quests' && (
          <div className="space-y-3">
            {quests.map((q, i) => (
              <GlassCard key={q.id} delay={i * 0.03} className="!border-red-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ListChecks className="w-5 h-5 text-admin-red" />
                    <div>
                      <p className="font-bold">{q.title}</p>
                      <p className="text-sm text-white/50">{q.period}</p>
                    </div>
                  </div>
                  <Badge variant={q.isActive ? 'success' : 'default'}>
                    {q.isActive ? tStatus('ACTIVE') : tStatus('INACTIVE')}
                  </Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'videos' && (
          <div className="space-y-4">
            <GlassCard className="!border-red-500/20">
              <h3 className="font-bold mb-3">Добавить видео</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Slug (id)" value={videoForm.slug} onChange={(e) => setVideoForm({ ...videoForm, slug: e.target.value })} />
                <Input label="Заголовок" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} />
                <Input label="Описание" value={videoForm.description} onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })} />
                <Input label="Ссылка (mp4 или youtube embed)" value={videoForm.videoUrl} onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })} />
                <Input label="Длительность (сек)" type="number" value={videoForm.durationSec} onChange={(e) => setVideoForm({ ...videoForm, durationSec: e.target.value })} />
                <Input label="Награда NEX" type="number" value={videoForm.baseReward} onChange={(e) => setVideoForm({ ...videoForm, baseReward: e.target.value })} />
              </div>
              <NeonButton className="mt-3" onClick={async () => {
                await api.admin.createVideo({
                  slug: videoForm.slug,
                  title: videoForm.title,
                  description: videoForm.description,
                  videoUrl: videoForm.videoUrl,
                  videoType: videoForm.videoType,
                  durationSec: parseInt(videoForm.durationSec, 10),
                  baseReward: parseInt(videoForm.baseReward, 10),
                });
                setVideoForm({ slug: '', title: '', description: '', videoUrl: '', videoType: 'mp4', durationSec: '30', baseReward: '25' });
                loadTab();
              }}>Добавить</NeonButton>
            </GlassCard>
            {videos.map((v) => (
              <GlassCard key={v.id} className="!border-red-500/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{v.title}</p>
                    <p className="text-sm text-white/50">{v.description}</p>
                    <p className="text-xs text-white/40 mt-1">{v.durationSec}с · {v.baseReward} NEX · {v.videoType}</p>
                  </div>
                  <div className="flex gap-2">
                    <NeonButton size="sm" variant="secondary" onClick={async () => {
                      const title = prompt('Новый заголовок', v.title);
                      if (title) {
                        await api.admin.updateVideo(v.id, { title });
                        loadTab();
                      }
                    }}>Изменить</NeonButton>
                    <NeonButton size="sm" variant="danger" onClick={async () => {
                      if (confirm('Удалить видео?')) {
                        await api.admin.deleteVideo(v.id);
                        loadTab();
                      }
                    }}>Удалить</NeonButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'logs' && (
          <GlassCard className="!border-red-500/20">
            <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-red-500/10 text-sm">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-admin-red" />
                    <span className="font-mono">{log.action}</span>
                    {log.entity && <span className="text-white/40">{log.entity}</span>}
                  </div>
                  <span className="text-white/40">{new Date(log.createdAt).toLocaleString('ru-RU')}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </PageTransition>
  );
}
