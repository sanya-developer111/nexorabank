'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { NeonButton } from '@/components/ui/NeonButton';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { formatNex } from '@/lib/utils';
import { tAccount, tStatus, tError } from '@/lib/i18n';

const QrScanner = dynamic(() => import('@/components/wallet/QrScanner').then((m) => m.QrScanner), { ssr: false });

export default function WalletPage() {
  const { wallet, fetchWallet } = useStore();
  const [accounts, setAccounts] = useState<Array<{ id: string; type: string; balance: number }>>([]);
  const [transactions, setTransactions] = useState<
    Array<{ id: string; type: string; amount: number; status: string; description?: string; createdAt: string }>
  >([]);
  const [transfer, setTransfer] = useState({ toUsername: '', amount: '', fromAccount: 'MAIN', description: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('accounts');
  const [internal, setInternal] = useState({ fromAccount: 'SAVINGS', toAccount: 'MAIN', amount: '' });
  const [qrForm, setQrForm] = useState({ amount: '', description: '' });
  const [payCode, setPayCode] = useState('');
  const [qrCreated, setQrCreated] = useState<{ code: string; amount: number; qrImage?: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const loadData = async () => {
    const [accs, txs] = await Promise.all([
      api.wallet.accounts(),
      api.wallet.transactions(),
    ]);
    setAccounts(accs);
    setTransactions(txs.items);
  };

  useEffect(() => {
    loadData().catch(() => {});
    fetchWallet().catch(() => {});
  }, [fetchWallet]);

  const handleClaimCashback = async () => {
    setMessage('');
    try {
      const res = await api.wallet.claimCashback();
      setMessage(res.amount > 0 ? `Кэшбэк получен: ${formatNex(res.amount)}` : 'Кэшбэк пока недоступен');
      await fetchWallet();
      await loadData();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Failed'));
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api.wallet.transfer({
        toUsername: transfer.toUsername,
        amount: parseFloat(transfer.amount),
        fromAccount: transfer.fromAccount,
        description: transfer.description || undefined,
      });
      setMessage('Перевод успешно выполнен');
      setTransfer({ toUsername: '', amount: '', fromAccount: 'MAIN', description: '' });
      await loadData();
      await fetchWallet();
    } catch (err) {
      setMessage(tError(err instanceof Error ? err.message : 'Transfer failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-3xl font-bold font-display">Кошелёк</h1>
          <p className="text-white/60">Управление счетами Nexium и переводами</p>
        </motion.div>

        <Tabs
          tabs={[
            { id: 'accounts', label: 'Счета' },
            { id: 'transfer', label: 'Перевод' },
            { id: 'internal', label: 'Между счетами' },
            { id: 'qr', label: 'QR-оплата' },
            { id: 'history', label: 'История' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {wallet && (
          <GlassCard>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-white/60 text-sm">Накопленный кэшбэк</p>
                <p className="text-2xl font-bold text-nexora-cyan">{formatNex(wallet.cashbackPending ?? 0)}</p>
                <p className="text-xs text-white/40 mt-1">
                  {wallet.isPremiumCashback
                    ? 'Капает от баланса · получение раз в 24 ч'
                    : 'Доступен только с активным премиумом'}
                </p>
              </div>
              <NeonButton
                onClick={handleClaimCashback}
                disabled={!wallet.canClaimCashback}
              >
                Забрать кэшбэк
              </NeonButton>
            </div>
          </GlassCard>
        )}

        {message && (
          <GlassCard><p className="text-nexora-cyan">{message}</p></GlassCard>
        )}

        {tab === 'accounts' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc, i) => (
              <GlassCard key={acc.id} delay={i * 0.05}>
                <Badge>{tAccount(acc.type)}</Badge>
                <p className="text-2xl font-bold text-nexora-cyan mt-3">{formatNex(acc.balance)}</p>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'transfer' && (
          <GlassCard>
            <form onSubmit={handleTransfer} className="space-y-4 max-w-md">
              <Input
                label="Имя получателя"
                value={transfer.toUsername}
                onChange={(e) => setTransfer({ ...transfer, toUsername: e.target.value })}
                required
              />
              <Input
                label="Сумма (NEX)"
                type="number"
                step="0.01"
                min="0.01"
                value={transfer.amount}
                onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })}
                required
              />
              <Select
                label="Со счёта"
                value={transfer.fromAccount}
                onChange={(e) => setTransfer({ ...transfer, fromAccount: e.target.value })}
                options={[
                  { value: 'MAIN', label: tAccount('MAIN') },
                  { value: 'SAVINGS', label: tAccount('SAVINGS') },
                  { value: 'INVESTMENT', label: tAccount('INVESTMENT') },
                  { value: 'BUSINESS', label: tAccount('BUSINESS') },
                ]}
              />
              <Input
                label="Описание (необязательно)"
                value={transfer.description}
                onChange={(e) => setTransfer({ ...transfer, description: e.target.value })}
              />
              {message && (
                <p className={message.includes('успешно') ? 'text-green-400' : 'text-red-400'}>{message}</p>
              )}
              <NeonButton type="submit" loading={loading}>
                Отправить перевод
              </NeonButton>
            </form>
          </GlassCard>
        )}

        {tab === 'internal' && (
          <GlassCard>
            <p className="text-sm text-white/60 mb-4">Перевод между своими счетами (накопительный, бизнес → основной)</p>
            <div className="space-y-4 max-w-md">
              <Select
                label="Со счёта"
                value={internal.fromAccount}
                onChange={(e) => setInternal({ ...internal, fromAccount: e.target.value })}
                options={[
                  { value: 'MAIN', label: tAccount('MAIN') },
                  { value: 'SAVINGS', label: tAccount('SAVINGS') },
                  { value: 'INVESTMENT', label: tAccount('INVESTMENT') },
                  { value: 'BUSINESS', label: tAccount('BUSINESS') },
                ]}
              />
              <Select
                label="На счёт"
                value={internal.toAccount}
                onChange={(e) => setInternal({ ...internal, toAccount: e.target.value })}
                options={[
                  { value: 'MAIN', label: tAccount('MAIN') },
                  { value: 'SAVINGS', label: tAccount('SAVINGS') },
                  { value: 'INVESTMENT', label: tAccount('INVESTMENT') },
                  { value: 'BUSINESS', label: tAccount('BUSINESS') },
                ]}
              />
              <Input
                label="Сумма"
                type="number"
                min="0.01"
                value={internal.amount}
                onChange={(e) => setInternal({ ...internal, amount: e.target.value })}
              />
              <NeonButton
                onClick={async () => {
                  setMessage('');
                  try {
                    await api.wallet.transferInternal({
                      fromAccount: internal.fromAccount,
                      toAccount: internal.toAccount,
                      amount: parseFloat(internal.amount),
                    });
                    setMessage('Перевод между счетами выполнен');
                    await loadData();
                    await fetchWallet();
                  } catch (err) {
                    setMessage(tError(err instanceof Error ? err.message : 'Ошибка'));
                  }
                }}
              >
                Перевести
              </NeonButton>
            </div>
          </GlassCard>
        )}

        {tab === 'qr' && (
          <div className="grid lg:grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="font-bold mb-3">Создать QR для оплаты</h3>
              <div className="space-y-3">
                <Input label="Сумма NEX" type="number" min="1" value={qrForm.amount} onChange={(e) => setQrForm({ ...qrForm, amount: e.target.value })} />
                <Input label="Описание" value={qrForm.description} onChange={(e) => setQrForm({ ...qrForm, description: e.target.value })} />
                <NeonButton
                  onClick={async () => {
                    const res = await api.payments.createQr(parseFloat(qrForm.amount), qrForm.description || undefined);
                    setQrCreated({ code: res.code, amount: res.amount, qrImage: res.qrImage });
                    setMessage(`QR создан — покажите код для сканирования`);
                  }}
                >
                  Создать QR
                </NeonButton>
                {qrCreated && (
                  <div className="p-4 rounded-xl bg-white/5 text-center">
                    {qrCreated.qrImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrCreated.qrImage} alt="QR оплаты" className="mx-auto w-56 h-56 rounded-lg bg-white p-2" />
                    )}
                    <p className="text-xs text-white/50 mt-2">Код (15 мин) или сканирование камерой</p>
                    <p className="text-lg font-mono font-bold text-nexora-cyan mt-1">{qrCreated.code}</p>
                    <p className="text-sm mt-2">{formatNex(qrCreated.amount)}</p>
                  </div>
                )}
              </div>
            </GlassCard>
            <GlassCard>
              <h3 className="font-bold mb-3">Оплатить по QR</h3>
              {!showScanner ? (
                <NeonButton className="mb-4 w-full" onClick={() => setShowScanner(true)}>
                  Сканировать камерой
                </NeonButton>
              ) : (
                <QrScanner
                  onScan={async (code) => {
                    setPayCode(code);
                    setShowScanner(false);
                    try {
                      const res = await api.payments.payQr(code);
                      setMessage(`Оплачено ${formatNex(res.amount)} → @${res.to}`);
                      await fetchWallet();
                    } catch (err) {
                      setMessage(tError(err instanceof Error ? err.message : 'Ошибка'));
                    }
                  }}
                  onClose={() => setShowScanner(false)}
                />
              )}
              <p className="text-sm text-white/50 my-3">или введите код вручную:</p>
              <Input label="Код NEX" value={payCode} onChange={(e) => setPayCode(e.target.value.toUpperCase())} placeholder="NEX-..." />
              <NeonButton
                className="mt-3"
                onClick={async () => {
                  try {
                    const res = await api.payments.payQr(payCode);
                    setMessage(`Оплачено ${formatNex(res.amount)} → @${res.to}`);
                    setPayCode('');
                    await fetchWallet();
                  } catch (err) {
                    setMessage(tError(err instanceof Error ? err.message : 'Ошибка'));
                  }
                }}
              >
                Оплатить по коду
              </NeonButton>
            </GlassCard>
          </div>
        )}

        {tab === 'history' && (
          <GlassCard>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-white/5">
                  <div>
                    <p className="font-medium">{tx.type}</p>
                    {tx.description && <p className="text-sm text-white/50">{tx.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-nexora-cyan font-bold">{formatNex(tx.amount)}</p>
                    <Badge variant={tx.status === 'COMPLETED' ? 'success' : 'warning'}>{tStatus(tx.status)}</Badge>
                  </div>
                  <span className="text-white/40 text-sm">{new Date(tx.createdAt).toLocaleString('ru-RU')}</span>
                </div>
              ))}
              {!transactions.length && <p className="text-white/50">Нет транзакций</p>}
            </div>
          </GlassCard>
        )}
      </div>
    </PageTransition>
  );
}
