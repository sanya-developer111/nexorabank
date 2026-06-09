'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BRAND } from '@nexora/shared';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { NeonButton } from '@/components/ui/NeonButton';
import { useStore } from '@/lib/store';
import { tError } from '@/lib/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const register = useStore((s) => s.register);
  const [form, setForm] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? tError(err.message) : tError('Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <ParticleBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <span className="text-4xl">{BRAND.currency.icon}</span>
          <h1 className="text-3xl font-bold mt-2 neon-text">Присоединяйтесь к {BRAND.name}</h1>
          <p className="text-white/60 mt-2">Создайте свою финансовую идентичность</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Имя пользователя"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="nex_trader"
              required
            />
            <Input
              label="Отображаемое имя"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Nex Trader"
              required
            />
            <Input
              label="Пароль"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <NeonButton type="submit" className="w-full" loading={loading}>
              Создать аккаунт
            </NeonButton>
          </form>
          <p className="text-center text-white/60 text-sm mt-6">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-nexora-cyan hover:underline">
              Войти
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
