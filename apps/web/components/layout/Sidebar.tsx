'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  Coins,
  TrendingUp,
  Store,
  Gavel,
  Users,
  Trophy,
  Crown,
  Swords,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { BRAND } from '@nexora/shared';

const navItems = [
  { href: '/dashboard', label: 'Панель', icon: LayoutDashboard },
  { href: '/wallet', label: 'Кошелёк', icon: Wallet },
  { href: '/earn', label: 'Заработок', icon: Coins },
  { href: '/invest', label: 'Инвестиции', icon: TrendingUp },
  { href: '/marketplace', label: 'Маркетплейс', icon: Store },
  { href: '/auctions', label: 'Аукционы', icon: Gavel },
  { href: '/social', label: 'Сообщество', icon: Users },
  { href: '/leaderboard', label: 'Рейтинг', icon: Trophy },
  { href: '/premium', label: 'Премиум', icon: Crown },
  { href: '/battlepass', label: 'Боевой пропуск', icon: Swords },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const user = useStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const width = collapsed ? 72 : 256;

  return (
    <motion.aside
      animate={{ width }}
      className={cn(
        'fixed left-0 top-0 h-screen glass border-r border-white/10 z-40 flex flex-col transition-transform',
        'md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}
      style={{ width: collapsed ? 72 : 256 }}
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <span className="text-2xl">{BRAND.currency.icon}</span>
          {!collapsed && (
            <span className="font-bold text-lg neon-text">{BRAND.name}</span>
          )}
        </Link>
        <button type="button" className="md:hidden text-white/60" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                active
                  ? 'bg-nexora-gradient text-white shadow-neon-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5',
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mt-4',
              pathname === '/admin'
                ? 'bg-red-600/80 text-white'
                : 'text-red-400/80 hover:text-red-300 hover:bg-red-500/10',
            )}
          >
            <Shield className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Админ</span>}
          </Link>
        )}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:block p-4 border-t border-white/10 text-white/50 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : <ChevronLeft className="w-5 h-5 mx-auto" />}
      </button>
    </motion.aside>
  );
}
