import { cn } from '@/lib/utils';

const rarityColors: Record<string, string> = {
  COMMON: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  UNCOMMON: 'bg-green-500/20 text-green-300 border-green-500/30',
  RARE: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  EPIC: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  LEGENDARY: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  MYTHIC: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'rarity' | 'success' | 'warning' | 'premium';
  rarity?: string;
  className?: string;
}

export function Badge({ children, variant = 'default', rarity, className }: BadgeProps) {
  const variants = {
    default: 'bg-white/10 text-white/80 border-white/20',
    rarity: rarity ? rarityColors[rarity] || rarityColors.COMMON : rarityColors.COMMON,
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    premium: 'bg-nexora-gradient text-white border-transparent',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
