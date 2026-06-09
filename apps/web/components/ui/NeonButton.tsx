'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type NeonButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

export function NeonButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  ...props
}: NeonButtonProps) {
  const variants = {
    primary: 'gradient-btn',
    secondary: 'glass glass-hover text-white font-semibold rounded-xl border border-nexora-cyan/30',
    ghost: 'text-nexora-cyan hover:bg-white/5 rounded-xl font-medium',
    danger: 'bg-red-600/80 hover:bg-red-500 text-white font-semibold rounded-xl',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={cn(
        variants[variant],
        sizes[size],
        'inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
