'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageCircle } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { connectSocket, joinChatRoom } from '@/lib/socket';
import { useStore } from '@/lib/store';
import { tStatus, tError } from '@/lib/i18n';
import { AvatarFrame, PremiumChatBadge } from '@/components/ui/AvatarFrame';

interface ChatMsg {
  id: string;
  content: string;
  createdAt: string;
  user: {
    username: string;
    displayName: string;
    avatar?: string;
    avatarFrame?: string;
    title?: string;
    premiumTier?: string | null;
  };
}

export default function SocialPage() {
  const user = useStore((s) => s.user);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const [tab, setTab] = useState('chat');
  const [friends, setFriends] = useState<Array<{
    id: string; status: string;
    user: { id: string; username: string; displayName: string; level: number };
  }>>([]);
  const [messages, setMessages] = useState<Array<{
    id: string; content: string; isRead: boolean; createdAt: string;
    sender: { username: string }; receiver: { username: string };
  }>>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [dmTo, setDmTo] = useState('');
  const [dmContent, setDmContent] = useState('');
  const [friendError, setFriendError] = useState('');
  const [dmError, setDmError] = useState('');
  const [trades, setTrades] = useState<Array<{
    id: string; type: string; status: string;
    fromItemName?: string | null;
    toItemName?: string | null;
    fromNexAmount?: number;
    toNexAmount?: number;
    fromUser: { username: string; displayName: string };
  }>>([]);
  const [tradeForm, setTradeForm] = useState({
    type: 'gift' as 'gift' | 'exchange',
    toUsername: '',
    fromItemId: '',
    toItemId: '',
    fromNexAmount: '',
    toNexAmount: '',
    message: '',
  });
  const [inventory, setInventory] = useState<Array<{ itemId: string; name: string; quantity: number }>>([]);
  const [partner, setPartner] = useState<{
    username: string; displayName: string;
    inventory: Array<{ itemId: string; name: string; rarity: string; quantity: number }>;
  } | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadChat = async () => {
    try {
      const history = await api.social.chatHistory('global');
      setChatMessages(
        [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      );
    } catch {
      // ignore
    }
  };

  const loadData = async () => {
    const [f, m, incoming, inv] = await Promise.all([
      api.social.friends().catch(() => []),
      api.social.messages().catch(() => []),
      api.trades.incoming().catch(() => []),
      api.marketplace.inventory().catch(() => []),
    ]);
    setTrades(incoming);
    setInventory(inv);
    setFriends(f);
    setMessages(m);
    await loadChat();
  };

  const lookupPartner = async (username: string) => {
    const clean = username.replace(/^@/, '').trim();
    if (clean.length < 2) {
      setPartner(null);
      return;
    }
    setPartnerLoading(true);
    try {
      const p = await api.trades.lookupPartner(clean);
      setPartner(p);
    } catch {
      setPartner(null);
    } finally {
      setPartnerLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    connectSocket();
    loadData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (tab === 'chat' && isAuthenticated) {
      loadChat();
    }
  }, [tab, isAuthenticated]);

  useEffect(() => {
    const socket = joinChatRoom('global');

    socket.on('chat:message', (msg: ChatMsg) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.off('chat:message');
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = () => {
    if (!chatInput.trim() || !user) return;
    const content = chatInput.trim();
    const temp: ChatMsg = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      user: { username: user.username, displayName: user.displayName },
    };
    setChatMessages((prev) => [...prev, temp]);
    setChatInput('');
    const socket = connectSocket();
    socket.emit('chat:global', { content });
  };

  const sendFriendRequest = async () => {
    setFriendError('');
    try {
      await api.social.sendFriendRequest(friendUsername);
      setFriendUsername('');
      loadData();
    } catch (err) {
      setFriendError(tError(err instanceof Error ? err.message : 'Failed'));
    }
  };

  const sendDm = async () => {
    setDmError('');
    try {
      await api.social.sendMessage(dmTo, dmContent);
      setDmContent('');
      loadData();
    } catch (err) {
      setDmError(tError(err instanceof Error ? err.message : 'Failed'));
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-3xl font-bold font-display">Сообщество</h1>
          <p className="text-white/60">Общий чат, друзья и личные сообщения</p>
        </motion.div>

        <Tabs
          tabs={[
            { id: 'chat', label: 'Общий чат' },
            { id: 'friends', label: 'Друзья' },
            { id: 'messages', label: 'Сообщения' },
            { id: 'trades', label: 'Обмен' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'chat' && (
          <GlassCard className="flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 mb-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <AvatarFrame
                    size="sm"
                    avatar={msg.user.avatar}
                    displayName={msg.user.displayName}
                    frame={msg.user.avatarFrame}
                  />
                  <div>
                    <p className="text-sm flex flex-wrap items-center gap-2">
                      <span className="font-bold text-nexora-cyan">@{msg.user.username}</span>
                      <PremiumChatBadge tier={msg.user.premiumTier} />
                      {msg.user.title && <span className="text-xs text-yellow-400/80">{msg.user.title}</span>}
                      <span className="text-white/40 text-xs">
                        {new Date(msg.createdAt).toLocaleTimeString('ru-RU')}
                      </span>
                    </p>
                    <p className="text-white/80">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Введите сообщение..."
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              />
              <NeonButton onClick={sendChat}>Отправить</NeonButton>
            </div>
          </GlassCard>
        )}

        {tab === 'friends' && (
          <div className="space-y-4">
            <GlassCard>
              <div className="flex gap-2">
                <Input
                  value={friendUsername}
                  onChange={(e) => setFriendUsername(e.target.value)}
                  placeholder="Имя пользователя"
                />
                <NeonButton onClick={sendFriendRequest}>Добавить в друзья</NeonButton>
              </div>
              {friendError && <p className="text-red-400 text-sm mt-2">{friendError}</p>}
            </GlassCard>
            {!friends.length && <p className="text-white/50">Нет друзей — добавьте по имени пользователя</p>}
            {friends.map((f, i) => (
              <GlassCard key={f.id} delay={i * 0.05}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-nexora-cyan" />
                    <div>
                      <p className="font-bold">{f.user.displayName}</p>
                      <p className="text-sm text-white/50">@{f.user.username} · Ур.{f.user.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.status === 'ACCEPTED' ? 'success' : 'warning'}>{tStatus(f.status)}</Badge>
                    {f.status === 'PENDING' && (
                      <NeonButton size="sm" onClick={() => api.social.acceptFriend(f.id).then(loadData)}>
                        Принять
                      </NeonButton>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'trades' && (
          <div className="space-y-4">
            <GlassCard>
              <h3 className="font-bold mb-3">Подарок или обмен</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2" value={tradeForm.type} onChange={(e) => setTradeForm({ ...tradeForm, type: e.target.value as 'gift' | 'exchange' })}>
                  <option value="gift">Подарок (я → он)</option>
                  <option value="exchange">Обмен (я ↔ он)</option>
                </select>
                <Input
                  placeholder="Кому (@username)"
                  value={tradeForm.toUsername}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTradeForm({ ...tradeForm, toUsername: v, toItemId: '' });
                    lookupPartner(v);
                  }}
                />
                {partnerLoading && <p className="text-sm text-white/50 sm:col-span-2">Поиск игрока...</p>}
                {partner && (
                  <p className="text-sm text-emerald-400 sm:col-span-2">
                    Найден: {partner.displayName} (@{partner.username}) · {partner.inventory.length} предметов
                  </p>
                )}
                <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2" value={tradeForm.fromItemId} onChange={(e) => setTradeForm({ ...tradeForm, fromItemId: e.target.value })}>
                  <option value="">Мой предмет (необяз.)</option>
                  {inventory.map((i) => <option key={i.itemId} value={i.itemId}>{i.name} x{i.quantity}</option>)}
                </select>
                {tradeForm.type === 'exchange' && (
                  <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2" value={tradeForm.toItemId} onChange={(e) => setTradeForm({ ...tradeForm, toItemId: e.target.value })} disabled={!partner}>
                    <option value="">Предмет, который хочу получить</option>
                    {(partner?.inventory ?? []).map((i) => (
                      <option key={i.itemId} value={i.itemId}>{i.name} x{i.quantity}</option>
                    ))}
                  </select>
                )}
                <Input placeholder="Отдаю NEX" value={tradeForm.fromNexAmount} onChange={(e) => setTradeForm({ ...tradeForm, fromNexAmount: e.target.value })} />
                {tradeForm.type === 'exchange' && (
                  <Input placeholder="Хочу получить NEX (доплата от него)" value={tradeForm.toNexAmount} onChange={(e) => setTradeForm({ ...tradeForm, toNexAmount: e.target.value })} />
                )}
                <Input placeholder="Сообщение" value={tradeForm.message} onChange={(e) => setTradeForm({ ...tradeForm, message: e.target.value })} />
              </div>
              <NeonButton className="mt-3" onClick={async () => {
                try {
                  await api.trades.create({
                    type: tradeForm.type,
                    toUsername: tradeForm.toUsername,
                    fromItemId: tradeForm.fromItemId || undefined,
                    toItemId: tradeForm.toItemId || undefined,
                    fromNexAmount: tradeForm.fromNexAmount ? parseFloat(tradeForm.fromNexAmount) : undefined,
                    toNexAmount: tradeForm.toNexAmount ? parseFloat(tradeForm.toNexAmount) : undefined,
                    message: tradeForm.message || undefined,
                  });
                  setTradeForm({ type: 'gift', toUsername: '', fromItemId: '', toItemId: '', fromNexAmount: '', toNexAmount: '', message: '' });
                  setPartner(null);
                  loadData();
                } catch (err) {
                  alert(tError(err instanceof Error ? err.message : 'Ошибка'));
                }
              }}>
                Отправить предложение
              </NeonButton>
            </GlassCard>
            {trades.map((t) => (
              <GlassCard key={t.id}>
                <p className="font-bold">@{t.fromUser.username} — {t.type === 'GIFT' ? 'подарок' : 'обмен'}</p>
                <p className="text-sm text-white/50 mt-1">
                  {t.fromItemName && <>Отдаёт: {t.fromItemName} · </>}
                  {t.toItemName && <>Хочет: {t.toItemName} · </>}
                  {(t.fromNexAmount ?? 0) > 0 && <>NEX от него: {t.fromNexAmount} · </>}
                  {(t.toNexAmount ?? 0) > 0 && <>Доплата вам: {t.toNexAmount} NEX</>}
                </p>
                <div className="flex gap-2 mt-2">
                  <NeonButton size="sm" onClick={() => api.trades.accept(t.id).then(loadData)}>Принять</NeonButton>
                  <NeonButton size="sm" variant="secondary" onClick={() => api.trades.cancel(t.id).then(loadData)}>Отклонить</NeonButton>
                </div>
              </GlassCard>
            ))}
            {!trades.length && <p className="text-white/50">Нет входящих предложений</p>}
          </div>
        )}

        {tab === 'messages' && (
          <div className="space-y-4">
            <GlassCard>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> Отправить сообщение
              </h3>
              <div className="flex gap-2">
                <Input value={dmTo} onChange={(e) => setDmTo(e.target.value)} placeholder="Имя пользователя" />
                <Input value={dmContent} onChange={(e) => setDmContent(e.target.value)} placeholder="Сообщение" />
                <NeonButton onClick={sendDm}>Отправить</NeonButton>
              </div>
              {dmError && <p className="text-red-400 text-sm mt-2">{dmError}</p>}
            </GlassCard>
            {!messages.length && <p className="text-white/50">Нет сообщений</p>}
            {messages.map((msg, i) => (
              <GlassCard key={msg.id} delay={i * 0.03}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/50">
                      {msg.sender.username === user?.username ? `Кому @${msg.receiver.username}` : `От @${msg.sender.username}`}
                    </p>
                    <p>{msg.content}</p>
                  </div>
                  {!msg.isRead && <Badge variant="warning">Новое</Badge>}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
