'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, RotateCw, Package, Box, Building2, Flame, Gamepad2, PlayCircle } from 'lucide-react';
import { MiniGames } from '@/components/earn/MiniGames';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { formatNex } from '@/lib/utils';
import { tCase, tBusiness, tStatus, tRarity, tError } from '@/lib/i18n';

export default function EarnPage() {
  const [tab, setTab] = useState('quests');
  const [dailyQuests, setDailyQuests] = useState<Array<{
    id: string; title: string; description: string; progress: number; target: number;
    completed: boolean; claimed: boolean; nexReward: number; xpReward: number;
  }>>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<typeof dailyQuests>([]);
  const [streak, setStreak] = useState<{ loginStreak: number; canClaim: boolean; reward: number } | null>(null);
  const [wheel, setWheel] = useState<{ spinsRemaining: number; charmBonus?: number; baseSpins?: number } | null>(null);
  const [videos, setVideos] = useState<Array<{
    id: string; title: string; description: string; durationSec: number; baseReward: number;
    videoUrl: string; videoType: string; watchedToday: boolean; canWatch: boolean;
  }>>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [watchStart, setWatchStart] = useState<number | null>(null);
  const [businesses, setBusinesses] = useState<Array<{
    id: string; name: string; type: string; level: number; revenue: number; upkeep: number; canCollect: boolean;
  }>>([]);
  const [newBusiness, setNewBusiness] = useState({ name: '', type: 'CAFE' });
  const [result, setResult] = useState('');

  const loadAll = async () => {
    const [daily, weekly, streakData, wheelData, videoData, bizData] = await Promise.all([
      api.quests.list('DAILY').catch(() => []),
      api.quests.list('WEEKLY').catch(() => []),
      api.earn.streak().catch(() => null),
      api.earn.wheelStatus().catch(() => null),
      api.activities.videos().catch(() => []),
      api.earn.businesses().catch(() => []),
    ]);
    setDailyQuests(daily);
    setWeeklyQuests(weekly);
    setStreak(streakData);
    setWheel(wheelData);
    setVideos(videoData);
    setBusinesses(bizData);
  };

  useEffect(() => { loadAll(); }, []);

  const claimQuest = async (id: string) => {
    const res = await api.quests.claim(id);
    setResult(`Получено ${formatNex(res.nexReward)} и ${res.xpReward} XP`);
    loadAll();
  };

  const claimStreak = async () => {
    const res = await api.earn.claimStreak();
    setResult(`Награда за серию: ${formatNex(res.reward)}`);
    loadAll();
  };

  const spinWheel = async () => {
    const res = await api.earn.spinWheel();
    setResult(`Выигрыш: ${res.prize} — ${formatNex(res.amount)}`);
    loadAll();
  };

  const openCase = async (caseType: string) => {
    const res = await api.earn.openCase(caseType);
    setResult(`Выпало: ${res.itemWon} (${tRarity(res.rarity)})`);
  };

  const openChest = async (chestType: string) => {
    await api.earn.openChest(chestType);
    setResult(`Открыт сундук «${tCase(chestType)}»!`);
  };

  const createBusiness = async () => {
    try {
      await api.earn.createBusiness(newBusiness);
      setNewBusiness({ name: '', type: 'CAFE' });
      setResult('Бизнес создан — доход копится каждый час');
      loadAll();
    } catch (err) {
      setResult(tError(err instanceof Error ? err.message : 'Failed'));
    }
  };

  const QuestList = ({ quests }: { quests: typeof dailyQuests }) => (
    <div className="space-y-3">
      {quests.map((q, i) => (
        <GlassCard key={q.id} delay={i * 0.05}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-bold">{q.title}</h3>
              <p className="text-sm text-white/60">{q.description}</p>
              <div className="flex items-center gap-4 mt-2">
                <ProgressRing progress={(q.progress / q.target) * 100} size={60} strokeWidth={4} />
                <span className="text-sm text-white/50">{q.progress}/{q.target}</span>
                <Badge variant="success">{formatNex(q.nexReward)}</Badge>
                <Badge>{q.xpReward} XP</Badge>
              </div>
            </div>
            {q.completed && !q.claimed && (
              <NeonButton size="sm" onClick={() => claimQuest(q.id)}>Получить</NeonButton>
            )}
            {q.claimed && <Badge variant="success">Получено</Badge>}
          </div>
        </GlassCard>
      ))}
    </div>
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-3xl font-bold font-display">Заработок</h1>
          <p className="text-white/60">Задания, награды и пассивный доход</p>
        </motion.div>

        {result && (
          <GlassCard className="border-nexora-cyan/30">
            <p className="text-nexora-cyan">{result}</p>
          </GlassCard>
        )}

        <Tabs
          tabs={[
            { id: 'quests', label: 'Задания' },
            { id: 'streak', label: 'Серия' },
            { id: 'wheel', label: 'Колесо' },
            { id: 'minigames', label: 'Мини-игры' },
            { id: 'cases', label: 'Кейсы и сундуки' },
            { id: 'videos', label: 'Видео' },
            { id: 'businesses', label: 'Бизнес' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'quests' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-nexora-cyan" /> Ежедневные задания
              </h2>
              <QuestList quests={dailyQuests} />
              {!dailyQuests.length && <p className="text-white/50 text-sm">Задания загружаются при старте API</p>}
            </div>
            <div>
              <h2 className="text-xl font-bold mb-4">Еженедельные задания</h2>
              <QuestList quests={weeklyQuests} />
            </div>
          </div>
        )}

        {tab === 'streak' && streak && (
          <GlassCard className="text-center max-w-md mx-auto">
            <Flame className="w-16 h-16 text-orange-400 mx-auto mb-4" />
            <p className="text-5xl font-bold">{streak.loginStreak}</p>
            <p className="text-white/60 mt-2">Дней подряд</p>
            <p className="text-nexora-cyan mt-4">Награда: {formatNex(streak.reward)}</p>
            <NeonButton className="mt-6" onClick={claimStreak} disabled={!streak.canClaim}>
              Получить ежедневную награду
            </NeonButton>
          </GlassCard>
        )}

        {tab === 'wheel' && (
          <GlassCard className="text-center max-w-md mx-auto">
            <RotateCw className="w-16 h-16 text-nexora-purple mx-auto mb-4 animate-spin" style={{ animationDuration: '3s' }} />
            <p className="text-white/60">Осталось вращений сегодня</p>
            <p className="text-4xl font-bold mt-2">{wheel?.spinsRemaining ?? 0}</p>
            {(wheel?.charmBonus ?? 0) > 0 && (
              <p className="text-sm text-yellow-400 mt-2">+{wheel?.charmBonus} от талисманов колеса</p>
            )}
            <NeonButton className="mt-6" onClick={spinWheel} disabled={!wheel?.spinsRemaining}>
              Крутить колесо
            </NeonButton>
          </GlassCard>
        )}

        {tab === 'minigames' && (
          <div className="space-y-4">
            <GlassCard className="!p-4 border-nexora-purple/20">
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="w-5 h-5 text-nexora-purple" />
                <h2 className="font-bold">Казино NEXORA</h2>
              </div>
              <p className="text-sm text-white/60">
                Ставьте NEX с множителями. Пример: 50 NEX ×3 на орла — при выигрыше получите 150 NEX.
              </p>
            </GlassCard>
            <MiniGames />
          </div>
        )}

        {tab === 'cases' && (
          <div className="grid md:grid-cols-2 gap-4">
            <GlassCard>
              <Package className="w-10 h-10 text-nexora-cyan mb-4" />
              <h3 className="font-bold text-lg">Кейсы</h3>
              <p className="text-white/60 text-sm mb-4">Открывайте кейсы для случайных предметов</p>
              <div className="flex gap-2">
                {['standard', 'premium', 'legendary'].map((t) => (
                  <NeonButton key={t} size="sm" variant="secondary" onClick={() => openCase(t)}>
                    {tCase(t)}
                  </NeonButton>
                ))}
              </div>
            </GlassCard>
            <GlassCard>
              <Box className="w-10 h-10 text-nexora-purple mb-4" />
              <h3 className="font-bold text-lg">Сундуки</h3>
              <p className="text-white/60 text-sm mb-4">Открывайте сундуки за бонусные награды</p>
              <div className="flex gap-2">
                {['bronze', 'silver', 'gold'].map((t) => (
                  <NeonButton key={t} size="sm" variant="secondary" onClick={() => openChest(t)}>
                    {tCase(t)}
                  </NeonButton>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {tab === 'videos' && (
          <div className="space-y-4">
            <GlassCard className="!p-4">
              <p className="text-sm text-white/60">
                Смотрите обучающие ролики до конца и получайте NEX. Каждое видео — один раз в день.
              </p>
            </GlassCard>
            {activeVideo && (() => {
              const v = videos.find((x) => x.id === activeVideo);
              if (!v) return null;
              return (
                <GlassCard>
                  <div className="aspect-video rounded-xl overflow-hidden bg-black mb-4">
                    {v.videoType === 'youtube' ? (
                      <iframe
                        title={v.title}
                        className="w-full h-full"
                        src={v.videoUrl.includes('embed') ? v.videoUrl : `https://www.youtube-nocookie.com/embed/${v.videoUrl.split('v=').pop()}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    ) : (
                      <video
                        key={v.id}
                        className="w-full h-full"
                        controls
                        playsInline
                        src={v.videoUrl}
                        onEnded={() => setWatchStart((s) => s ?? Date.now())}
                      />
                    )}
                  </div>
                  <NeonButton
                    onClick={async () => {
                      const watched = watchStart ? Math.floor((Date.now() - watchStart) / 1000) : v.durationSec;
                      try {
                        const res = await api.activities.claimVideo(v.id, watched);
                        setResult(`Награда за «${res.videoTitle}»: ${formatNex(res.reward)}`);
                        setActiveVideo(null);
                        setWatchStart(null);
                        loadAll();
                      } catch (err) {
                        setResult(tError(err instanceof Error ? err.message : 'Ошибка'));
                      }
                    }}
                  >
                    Забрать награду (после просмотра)
                  </NeonButton>
                </GlassCard>
              );
            })()}
            {videos.map((v, i) => (
              <GlassCard key={v.id} delay={i * 0.03}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <PlayCircle className="w-8 h-8 text-nexora-cyan shrink-0" />
                    <div>
                      <h3 className="font-bold">{v.title}</h3>
                      <p className="text-sm text-white/60">{v.description}</p>
                      <p className="text-xs text-white/40 mt-1">{v.durationSec} сек · {formatNex(v.baseReward)}</p>
                    </div>
                  </div>
                  {v.watchedToday ? (
                    <Badge variant="success">Просмотрено</Badge>
                  ) : (
                    <NeonButton
                      size="sm"
                      disabled={!v.canWatch}
                      onClick={() => { setActiveVideo(v.id); setWatchStart(Date.now()); }}
                    >
                      Смотреть
                    </NeonButton>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'businesses' && (
          <div className="space-y-6">
            <GlassCard>
              <h3 className="font-bold mb-2">Как работает бизнес</h3>
              <p className="text-sm text-white/60 mb-2">
                Создание стоит NEX с основного счёта: кафе 500, IT 1000, торговля 1500, майнинг 2000, развлечения 800, недвижимость 3000.
                Пассивный доход накапливается каждый час — нажмите «Собрать доход», когда кнопка активна.
              </p>
            </GlassCard>
            <GlassCard>
              <h3 className="font-bold mb-4">Открыть бизнес</h3>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                <Input label="Название" value={newBusiness.name} onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })} />
                <Select
                  label="Тип"
                  value={newBusiness.type}
                  onChange={(e) => setNewBusiness({ ...newBusiness, type: e.target.value })}
                  options={[
                    { value: 'CAFE', label: tBusiness('CAFE') },
                    { value: 'TECH', label: tBusiness('TECH') },
                    { value: 'MINING', label: tBusiness('MINING') },
                    { value: 'TRADING', label: tBusiness('TRADING') },
                    { value: 'REAL_ESTATE', label: tBusiness('REAL_ESTATE') },
                    { value: 'ENTERTAINMENT', label: tBusiness('ENTERTAINMENT') },
                  ]}
                />
                <NeonButton onClick={createBusiness}>Создать</NeonButton>
              </div>
            </GlassCard>
            <div className="grid md:grid-cols-2 gap-4">
              {businesses.map((b, i) => (
                <GlassCard key={b.id} delay={i * 0.05}>
                  <div className="flex items-center gap-3 mb-3">
                    <Building2 className="w-8 h-8 text-nexora-cyan" />
                    <div>
                      <h3 className="font-bold">{b.name}</h3>
                      <Badge>{tBusiness(b.type)} Ур.{b.level}</Badge>
                    </div>
                  </div>
                  <p className="text-nexora-cyan">{formatNex(b.revenue)} доход</p>
                  <p className="text-sm text-white/50">Содержание: {formatNex(b.upkeep)}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {b.canCollect && (
                      <NeonButton size="sm" onClick={() => api.earn.collectBusiness(b.id).then(loadAll)}>
                        Собрать доход
                      </NeonButton>
                    )}
                    <NeonButton
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const res = await api.earn.upgradeBusiness(b.id);
                          setResult(`Бизнес улучшен до ур. ${res.level} (−${formatNex(res.cost)})`);
                          loadAll();
                        } catch (err) {
                          setResult(tError(err instanceof Error ? err.message : 'Ошибка'));
                        }
                      }}
                    >
                      Прокачать
                    </NeonButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
