'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Tag, PlusCircle } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { formatNex } from '@/lib/utils';
import { tRarity, tError } from '@/lib/i18n';

export default function MarketplacePage() {
  const [tab, setTab] = useState('shop');
  const [shop, setShop] = useState<Array<{
    id: string; name: string; description?: string; rarity: string; basePrice: number; category: string;
  }>>([]);
  const [listings, setListings] = useState<Array<{
    id: string; price: number; quantity: number;
    item: { name: string; rarity: string }; seller: { username: string };
  }>>([]);
  const [inventory, setInventory] = useState<Array<{
    inventoryId: string; itemId: string; name: string; rarity: string; quantity: number;
  }>>([]);
  const [sellItemId, setSellItemId] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellQty, setSellQty] = useState('1');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    const [s, l, inv] = await Promise.all([
      api.marketplace.shop().catch(() => []),
      api.marketplace.listings().catch(() => []),
      api.marketplace.inventory().catch(() => []),
    ]);
    setShop(s);
    setListings(l);
    setInventory(inv);
  };

  useEffect(() => { loadData(); }, []);

  const buyShop = async (itemId: string) => {
    try {
      await api.marketplace.buyShopItem(itemId);
      setMessage('Покупка успешна — предмет в инвентаре');
      loadData();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Purchase failed'));
    }
  };

  const buyListing = async (id: string) => {
    try {
      await api.marketplace.buyListing(id);
      setMessage('Покупка успешна');
      loadData();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Purchase failed'));
    }
  };

  const createListing = async () => {
    const price = parseFloat(sellPrice);
    const quantity = parseInt(sellQty, 10);
    if (!sellItemId || !price || !quantity) return;
    try {
      await api.marketplace.createListing({ itemId: sellItemId, price, quantity });
      setMessage('Объявление создано');
      setSellItemId('');
      setSellPrice('');
      loadData();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Failed'));
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Рынок</h1>
          <p className="text-white/60">Официальный магазин и объявления игроков</p>
        </motion.div>

        {message && <GlassCard><p className="text-nexora-cyan">{message}</p></GlassCard>}

        <Tabs
          tabs={[
            { id: 'shop', label: 'Магазин' },
            { id: 'listings', label: 'Объявления' },
            { id: 'sell', label: 'Продать' },
            { id: 'scrap', label: 'Скупка' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'shop' && (
          <>
            {!shop.length && (
              <GlassCard>
                <p className="text-white/50">Магазин пуст. Перезапустите API — данные загрузятся автоматически.</p>
              </GlassCard>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shop.map((item, i) => (
                <GlassCard key={item.id} delay={i * 0.05} hover>
                  <div className="flex items-start justify-between mb-3">
                    <ShoppingBag className="w-8 h-8 text-nexora-cyan" />
                    <Badge variant="rarity" rarity={item.rarity}>{tRarity(item.rarity)}</Badge>
                  </div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-sm text-white/60 mt-1">{item.description}</p>
                  <Badge className="mt-2">{item.category}</Badge>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-nexora-cyan font-bold">{formatNex(item.basePrice)}</p>
                    <NeonButton size="sm" onClick={() => buyShop(item.id)}>Купить</NeonButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          </>
        )}

        {tab === 'listings' && (
          <div className="space-y-3">
            {!listings.length && (
              <GlassCard>
                <p className="text-white/50">Нет объявлений. Купите предметы в магазине и выставьте их на продажу во вкладке «Продать».</p>
              </GlassCard>
            )}
            {listings.map((listing, i) => (
              <GlassCard key={listing.id} delay={i * 0.05}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Tag className="w-6 h-6 text-nexora-purple shrink-0" />
                    <div>
                      <h3 className="font-bold">{listing.item.name}</h3>
                      <p className="text-sm text-white/50">x{listing.quantity} · от @{listing.seller.username}</p>
                      <Badge variant="rarity" rarity={listing.item.rarity}>{tRarity(listing.item.rarity)}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-nexora-cyan">{formatNex(listing.price)}</p>
                    <NeonButton size="sm" className="mt-2" onClick={() => buyListing(listing.id)}>Купить</NeonButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'scrap' && (
          <GlassCard>
            <h2 className="font-bold mb-2">Мгновенная скупка</h2>
            <p className="text-sm text-white/60 mb-4">
              Сдайте предметы из кейсов и сундуков сразу за NEX — без ожидания покупателя.
            </p>
            {!inventory.length ? (
              <p className="text-white/50">Инвентарь пуст</p>
            ) : (
              <div className="space-y-3">
                {inventory.map((inv) => (
                  <div key={inv.inventoryId} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <p className="font-medium">{inv.name}</p>
                      <Badge variant="rarity" rarity={inv.rarity}>{tRarity(inv.rarity)} · x{inv.quantity}</Badge>
                    </div>
                    <NeonButton
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const res = await api.marketplace.scrapItem(inv.itemId, 1);
                          setMessage(`Скупка: +${formatNex(res.payout)} за «${res.item}»`);
                          loadData();
                        } catch (err) {
                          setMessage(tError(err instanceof Error ? err.message : 'Ошибка'));
                        }
                      }}
                    >
                      Сдать
                    </NeonButton>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {tab === 'sell' && (
          <GlassCard>
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" /> Выставить предмет на продажу
            </h2>
            {!inventory.length ? (
              <p className="text-white/50">Инвентарь пуст. Сначала купите предметы в магазине.</p>
            ) : (
              <div className="space-y-4 max-w-md">
                <label className="block text-sm text-white/60">Предмет</label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                  value={sellItemId}
                  onChange={(e) => setSellItemId(e.target.value)}
                >
                  <option value="">Выберите...</option>
                  {inventory.map((inv) => (
                    <option key={inv.inventoryId} value={inv.itemId}>
                      {inv.name} x{inv.quantity}
                    </option>
                  ))}
                </select>
                <Input label="Цена (NEX)" type="number" step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
                <Input label="Количество" type="number" min="1" value={sellQty} onChange={(e) => setSellQty(e.target.value)} />
                <NeonButton onClick={createListing}>Создать объявление</NeonButton>
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </PageTransition>
  );
}
