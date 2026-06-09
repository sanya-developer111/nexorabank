'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gavel, Clock, PlusCircle } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { formatNex } from '@/lib/utils';
import { tRarity, tError } from '@/lib/i18n';

export default function AuctionsPage() {
  const user = useStore((s) => s.user);
  const [auctions, setAuctions] = useState<Array<{
    id: string; startPrice: number; currentBid: number; buyoutPrice?: number; endsAt: string;
    item: { name: string; rarity: string }; seller: { username: string }; bidCount: number;
  }>>([]);
  const [inventory, setInventory] = useState<Array<{
    inventoryId: string; itemId: string; name: string; rarity: string; quantity: number;
  }>>([]);
  const [bids, setBids] = useState<Record<string, string>>({});
  const [createItemId, setCreateItemId] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [buyoutPrice, setBuyoutPrice] = useState('');
  const [message, setMessage] = useState('');

  const loadAuctions = async () => {
    const [a, inv] = await Promise.all([
      api.auctions.list().catch(() => []),
      api.marketplace.inventory().catch(() => []),
    ]);
    setAuctions(a);
    setInventory(inv);
  };
  useEffect(() => { loadAuctions(); }, []);

  const placeBid = async (id: string) => {
    const amount = parseFloat(bids[id] || '0');
    if (!amount) return;
    try {
      await api.auctions.bid(id, amount);
      setMessage('Ставка принята');
      loadAuctions();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Bid failed'));
    }
  };

  const createAuction = async () => {
    const start = parseFloat(startPrice);
    const buyout = buyoutPrice ? parseFloat(buyoutPrice) : undefined;
    if (!createItemId || !start) return;
    const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await api.auctions.create({ itemId: createItemId, startPrice: start, buyoutPrice: buyout, endsAt });
      setMessage('Аукцион создан на 3 дня');
      setCreateItemId('');
      setStartPrice('');
      setBuyoutPrice('');
      loadAuctions();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Failed'));
    }
  };

  const timeLeft = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return 'Завершён';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours} ч ${mins} мин`;
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Аукционы</h1>
          <p className="text-white/60">Ставки на редкие предметы или выставьте свой</p>
        </motion.div>

        {message && <GlassCard><p className="text-nexora-cyan">{message}</p></GlassCard>}

        <GlassCard>
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> Создать аукцион
          </h2>
          {!inventory.length ? (
            <p className="text-white/50">Нужен предмет в инвентаре. Купите в магазине на странице «Рынок».</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-sm text-white/60">Предмет</label>
                <select
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                  value={createItemId}
                  onChange={(e) => setCreateItemId(e.target.value)}
                >
                  <option value="">Выберите...</option>
                  {inventory.map((inv) => (
                    <option key={inv.inventoryId} value={inv.itemId}>{inv.name}</option>
                  ))}
                </select>
              </div>
              <Input label="Стартовая цена" type="number" step="0.01" value={startPrice} onChange={(e) => setStartPrice(e.target.value)} />
              <Input label="Выкуп (необяз.)" type="number" step="0.01" value={buyoutPrice} onChange={(e) => setBuyoutPrice(e.target.value)} />
              <NeonButton onClick={createAuction}>Создать</NeonButton>
            </div>
          )}
        </GlassCard>

        <div className="grid md:grid-cols-2 gap-4">
          {auctions.map((auction, i) => (
            <GlassCard key={auction.id} delay={i * 0.05}>
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex items-center gap-3">
                  <Gavel className="w-8 h-8 text-nexora-purple shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg">{auction.item.name}</h3>
                    <Badge variant="rarity" rarity={auction.item.rarity}>{tRarity(auction.item.rarity)}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-white/50 text-sm shrink-0">
                  <Clock className="w-4 h-4" />
                  {timeLeft(auction.endsAt)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-white/50">Текущая ставка</p>
                  <p className="text-xl font-bold text-nexora-cyan">{formatNex(auction.currentBid || auction.startPrice)}</p>
                </div>
                <div>
                  <p className="text-white/50">Выкуп</p>
                  <p className="font-bold">{auction.buyoutPrice ? formatNex(auction.buyoutPrice) : '—'}</p>
                </div>
                <div>
                  <p className="text-white/50">Ставки</p>
                  <p className="font-bold">{auction.bidCount}</p>
                </div>
                <div>
                  <p className="text-white/50">Продавец</p>
                  <p>@{auction.seller.username}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <Input
                  label="Ваша ставка"
                  type="number"
                  step="0.01"
                  value={bids[auction.id] || ''}
                  onChange={(e) => setBids({ ...bids, [auction.id]: e.target.value })}
                  placeholder={`Мин. ${(auction.currentBid || auction.startPrice) + 1}`}
                />
                <NeonButton onClick={() => placeBid(auction.id)}>Ставка</NeonButton>
                {(auction.seller.username === user?.username || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                  <NeonButton
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await api.auctions.cancel(auction.id);
                        setMessage('Аукцион удалён');
                        loadAuctions();
                      } catch (err) {
                        setMessage(tError(err instanceof Error ? err.message : 'Ошибка'));
                      }
                    }}
                  >
                    Удалить
                  </NeonButton>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
        {!auctions.length && <p className="text-white/50">Нет активных аукционов — создайте первый выше</p>}
      </div>
    </PageTransition>
  );
}
