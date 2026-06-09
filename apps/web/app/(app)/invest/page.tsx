'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PriceChart } from '@/components/charts/PriceChart';
import { api } from '@/lib/api';
import { formatNex, formatPercent } from '@/lib/utils';
import { tError } from '@/lib/i18n';

export default function InvestPage() {
  const [tab, setTab] = useState('market');
  const [assets, setAssets] = useState<Array<{
    id: string; symbol: string; name: string; type: string; price: number; change24h: number; volume24h: number;
  }>>([]);
  const [portfolio, setPortfolio] = useState<Array<{
    assetId: string; symbol: string; name: string; quantity: number; avgPrice: number;
    currentPrice: number; value: number; pnl: number;
  }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ price: number; timestamp: string }>>([]);
  const [trade, setTrade] = useState({ quantity: '' });
  const [message, setMessage] = useState('');

  const loadData = async () => {
    const [a, p] = await Promise.all([api.invest.assets(), api.invest.portfolio()]);
    setAssets(a);
    setPortfolio(p);
    if (a.length && !selected) setSelected(a[0].symbol);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selected) {
      api.invest.history(selected).then(setHistory).catch(() => setHistory([]));
    }
  }, [selected]);

  const selectedAsset = assets.find((a) => a.symbol === selected);

  const handleBuy = async () => {
    if (!selectedAsset) return;
    try {
      await api.invest.buy(selectedAsset.id, parseFloat(trade.quantity));
      setMessage('Покупка выполнена');
      setTrade({ quantity: '' });
      loadData();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Buy failed'));
    }
  };

  const handleSell = async (assetId: string) => {
    try {
      await api.invest.sell(assetId, parseFloat(trade.quantity));
      setMessage('Продажа выполнена');
      setTrade({ quantity: '' });
      loadData();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Sell failed'));
    }
  };

  const totalValue = portfolio.reduce((sum, h) => sum + h.value, 0);
  const totalPnl = portfolio.reduce((sum, h) => sum + h.pnl, 0);

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-3xl font-bold font-display">Инвестиции</h1>
          <p className="text-white/60">Торгуйте активами и развивайте портфель</p>
        </motion.div>

        {message && <GlassCard><p className="text-nexora-cyan">{message}</p></GlassCard>}

        <Tabs
          tabs={[
            { id: 'market', label: 'Рынок' },
            { id: 'portfolio', label: 'Портфель' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'market' && (
          <>
            {!assets.length && (
              <GlassCard>
                <p className="text-white/50">Нет торгуемых активов. Перезапустите API — NEXC, NEXG и другие активы загрузятся автоматически.</p>
              </GlassCard>
            )}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-2">
              {assets.map((asset, i) => (
                <GlassCard
                  key={asset.id}
                  delay={i * 0.03}
                  hover
                  onClick={() => setSelected(asset.symbol)}
                  className={selected === asset.symbol ? 'border-nexora-cyan/50' : ''}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{asset.symbol}</p>
                      <p className="text-sm text-white/50">{asset.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatNex(asset.price)}</p>
                      <p className={`text-sm flex items-center gap-1 ${asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {asset.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatPercent(asset.change24h)}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            <div className="lg:col-span-2 space-y-4">
              {selectedAsset && (
                <>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedAsset.symbol}</h2>
                        <Badge>{selectedAsset.type}</Badge>
                      </div>
                      <p className="text-3xl font-bold text-nexora-cyan">{formatNex(selectedAsset.price)}</p>
                    </div>
                    <PriceChart data={history} />
                  </GlassCard>
                  <GlassCard>
                    <h3 className="font-bold mb-4">Торговля {selectedAsset.symbol}</h3>
                    <div className="flex gap-4 items-end">
                      <Input
                        label="Количество"
                        type="number"
                        step="0.0001"
                        value={trade.quantity}
                        onChange={(e) => setTrade({ quantity: e.target.value })}
                      />
                      <NeonButton onClick={handleBuy}>Купить</NeonButton>
                      <NeonButton variant="secondary" onClick={() => selectedAsset && handleSell(selectedAsset.id)}>
                        Продать
                      </NeonButton>
                    </div>
                  </GlassCard>
                </>
              )}
            </div>
          </div>
          </>
        )}

        {tab === 'portfolio' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <GlassCard>
                <p className="text-white/60">Стоимость портфеля</p>
                <p className="text-3xl font-bold text-nexora-cyan">{formatNex(totalValue)}</p>
              </GlassCard>
              <GlassCard>
                <p className="text-white/60">Общий P&L</p>
                <p className={`text-3xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatNex(totalPnl)}
                </p>
              </GlassCard>
            </div>
            {portfolio.map((h, i) => (
              <GlassCard key={h.assetId} delay={i * 0.05}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{h.symbol}</p>
                    <p className="text-sm text-white/50">{h.quantity} ед. по {formatNex(h.avgPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatNex(h.value)}</p>
                    <p className={h.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>{formatNex(h.pnl)}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
            {!portfolio.length && (
              <GlassCard>
                <p className="text-white/50">Портфель пуст. Купите активы во вкладке «Рынок» — сумма отобразится в профиле.</p>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
