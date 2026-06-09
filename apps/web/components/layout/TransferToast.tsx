'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownLeft } from 'lucide-react';
import { formatNex } from '@/lib/utils';

export interface TransferNotification {
  id: string;
  amount: number;
  fromUsername?: string;
  fromDisplayName?: string;
  description?: string;
}

interface TransferToastProps {
  items: TransferNotification[];
  onDismiss: (id: string) => void;
}

export function TransferToast({ items, onDismiss }: TransferToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="glass border border-emerald-500/30 rounded-2xl p-4 shadow-xl cursor-pointer"
            onClick={() => onDismiss(item.id)}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-emerald-300">Входящий перевод</p>
                <p className="text-2xl font-bold mt-1">{formatNex(item.amount)}</p>
                <p className="text-sm text-white/70 mt-1">
                  от @{item.fromUsername ?? 'неизвестно'}
                  {item.fromDisplayName && item.fromDisplayName !== item.fromUsername && (
                    <span className="text-white/50"> ({item.fromDisplayName})</span>
                  )}
                </p>
                {item.description && (
                  <p className="text-xs text-white/50 mt-1 italic">«{item.description}»</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
