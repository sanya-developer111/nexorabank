'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AuthGuard } from './AuthGuard';
import { TransferToast, type TransferNotification } from './TransferToast';

interface AppShellProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function AppShell({ children, adminOnly }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transfers, setTransfers] = useState<TransferNotification[]>([]);
  const { isAuthenticated, fetchWallet, fetchUser } = useStore();
  const lastPollRef = useRef(new Date().toISOString());

  useEffect(() => {
    if (!isAuthenticated) return;

    const poll = async () => {
      try {
        await Promise.all([fetchWallet(), fetchUser()]);
        const incoming = await api.wallet.incoming(lastPollRef.current);
        if (incoming.length) {
          setTransfers((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const fresh = incoming.filter((t) => !ids.has(t.id));
            return [...prev, ...fresh].slice(-5);
          });
        }
        lastPollRef.current = new Date().toISOString();
      } catch {
        // ignore polling errors
      }
    };

    poll();
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchWallet, fetchUser]);

  return (
    <AuthGuard adminOnly={adminOnly}>
      <TransferToast
        items={transfers}
        onDismiss={(id) => setTransfers((prev) => prev.filter((t) => t.id !== id))}
      />
      <div className="min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Закрыть меню"
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="min-h-screen flex flex-col md:ml-[256px] transition-all">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
