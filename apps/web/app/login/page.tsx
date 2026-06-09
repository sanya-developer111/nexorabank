'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { BRAND } from '@nexora/shared';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { NeonButton } from '@/components/ui/NeonButton';
import { useStore } from '@/lib/store';
import { tError } from '@/lib/i18n';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? tError(err.message) : tError('Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <NeonButton type="submit" className="w-full" loading={loading}>
          Войти
        </NeonButton>
      </form>
      <p className="text-center text-white/60 text-sm mt-6">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-nexora-cyan hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </GlassCard>
  );
}

export default function LoginPage() {
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
          <h1 className="text-3xl font-bold mt-2 neon-text">{BRAND.name}</h1>
          <p className="text-white/60 mt-2">Войдите в свой аккаунт</p>
        </div>
        <Suspense fallback={<GlassCard><p className="text-center text-white/50">Загрузка...</p></GlassCard>}>
          <LoginForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
