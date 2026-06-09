'use client';

import { cn } from '@/lib/utils';

const FRAME_STYLES: Record<string, string> = {
  cyan: 'ring-2 ring-nexora-cyan shadow-[0_0_12px_rgba(0,255,255,0.4)]',
  purple: 'ring-2 ring-nexora-purple shadow-[0_0_14px_rgba(168,85,247,0.5)]',
  gold: 'ring-2 ring-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.55)] animate-pulse',
};

export function AvatarFrame({
  avatar,
  displayName,
  frame,
  size = 'md',
  className,
}: {
  avatar?: string;
  displayName: string;
  frame?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-24 h-24 text-4xl' : 'w-10 h-10 text-sm';
  const frameClass = frame ? FRAME_STYLES[frame] ?? '' : '';

  return (
    <div
      className={cn(
        'rounded-full bg-nexora-gradient flex items-center justify-center font-bold shrink-0',
        sizeClass,
        frameClass,
        className,
      )}
    >
      {avatar || displayName[0]}
    </div>
  );
}

export function PremiumChatBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;
  if (tier === 'elite') {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">ELITE</span>;
  }
  if (tier === 'pro') {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">PRO</span>;
  }
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">PLUS</span>;
}
