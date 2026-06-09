'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Users,
  Zap,
  Globe,
  Coins,
} from 'lucide-react';
import { BRAND } from '@nexora/shared';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';

const features = [
  {
    icon: Coins,
    title: 'Экономика Нексиума',
    description: 'Торгуйте, зарабатывайте и инвестируйте в цифровую валюту с реальной механикой дефицита.',
  },
  {
    icon: TrendingUp,
    title: 'Инвестиционные рынки',
    description: 'Акции, криптовалюты и активы NEXORA с живыми графиками и отслеживанием портфеля.',
  },
  {
    icon: Users,
    title: 'Социальная вселенная',
    description: 'Кланы, корпорации, глобальный чат и процветающий рынок, управляемый игроками.',
  },
  {
    icon: Zap,
    title: 'Квесты и заработок',
    description: 'Ежедневные квесты, колесо фортуны, кейсы, сундуки и пассивный доход от бизнеса.',
  },
  {
    icon: Shield,
    title: 'Безопасные кошельки',
    description: 'Мультиаккаунтная система: основной, накопительный, инвестиционный и бизнес-счета.',
  },
  {
    icon: Globe,
    title: 'Живые события',
    description: 'Турниры, боевой пропуск, аукционы и динамические экономические события.',
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{BRAND.currency.icon}</span>
          <span className="text-2xl font-bold font-display neon-text">{BRAND.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-white/70 hover:text-white transition-colors">
            Войти
          </Link>
          <Link href="/register">
            <NeonButton size="sm">Начать</NeonButton>
          </Link>
        </div>
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-nexora-cyan text-sm font-medium tracking-widest uppercase mb-4">
            {BRAND.tagline}
          </p>
          <h1 className="text-5xl md:text-7xl font-bold font-display mb-6 leading-tight">
            Войдите в{' '}
            <span className="neon-text">цифровую финансовую</span>
            <br />
            вселенную
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
            Создавайте богатство в {BRAND.currency.name} ({BRAND.currency.symbol}), торгуйте активами,
            вступайте в кланы и поднимайтесь в рейтинге лучших игроков финансовой симуляции.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <NeonButton size="lg" className="gap-2">
                Начать путь <ArrowRight className="w-5 h-5" />
              </NeonButton>
            </Link>
            <Link href="/leaderboard">
              <NeonButton variant="secondary" size="lg">
                Рейтинг игроков
              </NeonButton>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-16 inline-flex items-center gap-4 glass-card px-8 py-4"
        >
          <span className="text-4xl">{BRAND.currency.icon}</span>
          <div className="text-left">
            <p className="text-sm text-white/50">Валюта</p>
            <p className="text-2xl font-bold">{BRAND.currency.name}</p>
            <p className="text-nexora-cyan text-sm">Макс. эмиссия: {BRAND.currency.maxSupply.toLocaleString('ru-RU')} NEX</p>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-12 font-display"
        >
          Исследуйте <span className="neon-text">вселенную</span>
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <GlassCard key={feature.title} delay={i * 0.1} hover>
              <feature.icon className="w-10 h-10 text-nexora-cyan mb-4" />
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-white/60">{feature.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <GlassCard className="text-center">
          <h2 className="text-3xl font-bold mb-4 font-display">
            История <span className="neon-text">{BRAND.currency.name}</span>
          </h2>
          <p className="text-white/70 leading-relaxed text-lg">
            {BRAND.currency.description} При максимальной эмиссии в{' '}
            {BRAND.currency.maxSupply.toLocaleString('ru-RU')} {BRAND.currency.symbol} каждая транзакция
            формирует экономику. Механизмы сжигания, контроль инфляции и рынки, управляемые игроками,
            делают {BRAND.currency.name} основой финансовой вселенной NEXORA.
          </p>
        </GlassCard>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-6 font-display">Готовы построить империю?</h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Присоединяйтесь к тысячам игроков в самой захватывающей цифровой экономике. Ваша финансовая судьба ждёт.
          </p>
          <Link href="/register">
            <NeonButton size="lg">Создать бесплатный аккаунт</NeonButton>
          </Link>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-white/40 text-sm">
        <p>
          {BRAND.name} — {BRAND.tagline} · Основана в {BRAND.founded} году
        </p>
      </footer>
    </div>
  );
}
