'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { ParticleBackground } from '@/components/ui/ParticleBackground';

interface AuthGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function AuthGuard({ children, adminOnly }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, initialize } = useStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && adminOnly && user) {
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      if (!isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, adminOnly, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <ParticleBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-nexora-cyan/30 border-t-nexora-cyan rounded-full animate-spin" />
          <p className="text-white/60">Загрузка NEXORA...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (adminOnly && user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return null;

  return <>{children}</>;
}
