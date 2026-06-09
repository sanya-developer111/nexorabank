'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, LogOut, User, Menu } from 'lucide-react';
import { useStore } from '@/lib/store';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { getXpProgress } from '@/lib/utils';

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { user, wallet, logout } = useStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<Array<{ id: string; text: string }>>([]);

  const xp = user ? getXpProgress(user.xp) : { current: 0, needed: 100, percent: 0 };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.social.friends().catch(() => []),
      api.social.messages().catch(() => []),
    ]).then(([friends, messages]) => {
      const items: Array<{ id: string; text: string }> = [];
      friends
        .filter((f) => f.status === 'PENDING' && f.user.username !== user.username)
        .forEach((f) => {
          items.push({ id: `fr-${f.id}`, text: `Заявка в друзья от @${f.user.username}` });
        });
      messages
        .filter((m) => !m.isRead && m.sender.username !== user.username)
        .slice(0, 5)
        .forEach((m) => {
          items.push({ id: `msg-${m.id}`, text: `Сообщение от @${m.sender.username}` });
        });
      setNotifs(items);
    });
  }, [user]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-30 glass border-b border-white/10 px-6 py-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 md:gap-6 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
          >
            <Menu className="w-5 h-5" />
          </button>
          {wallet && (
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-sm">Баланс</span>
              <span className="text-xl font-bold text-nexora-cyan">
                <AnimatedCounter value={wallet.totalBalance} prefix="◈ " />
              </span>
            </div>
          )}
          {user && (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-sm">
                <span className="text-white/60">Ур.</span>
                <span className="font-bold ml-1">{user.level}</span>
              </div>
              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-nexora-gradient"
                  initial={{ width: 0 }}
                  animate={{ width: `${xp.percent}%` }}
                />
              </div>
              <span className="text-xs text-white/50 hidden lg:inline">
                {xp.current}/{xp.needed} XP
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user?.isPremium && <Badge variant="premium">Премиум</Badge>}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors relative"
            >
              <Bell className="w-5 h-5 text-white/70" />
              {notifs.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-nexora-cyan rounded-full" />
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-72 glass border border-white/10 rounded-xl shadow-xl z-50 p-3">
                <p className="text-sm font-bold mb-2">Уведомления</p>
                {notifs.length ? (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {notifs.map((n) => (
                      <li key={n.id} className="text-sm text-white/80 p-2 rounded-lg bg-white/5">
                        {n.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/50">Нет новых уведомлений</p>
                )}
              </div>
            )}
          </div>
          {user && (
            <Link
              href={`/profile/${user.username}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-nexora-gradient flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden sm:block text-sm font-medium">{user.displayName}</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors"
            title="Выйти"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
