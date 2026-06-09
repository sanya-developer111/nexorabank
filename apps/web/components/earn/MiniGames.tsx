'use client';

import { useEffect, useState } from 'react';
import { Dices, CircleDot, Hash, TrendingUp, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { formatNex } from '@/lib/utils';
import { tError } from '@/lib/i18n';
import { useStore } from '@/lib/store';

type GameId = 'coinflip' | 'color' | 'number' | 'dice' | 'hilo' | 'slots';

const GAME_ICONS: Record<GameId, typeof Dices> = {
  coinflip: CircleDot,
  color: Sparkles,
  number: Hash,
  dice: Dices,
  hilo: TrendingUp,
  slots: Sparkles,
};

export function MiniGames() {
  const fetchWallet = useStore((s) => s.fetchWallet);
  const [activeGame, setActiveGame] = useState<GameId>('coinflip');
  const [bet, setBet] = useState('50');
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
  const [multiplier, setMultiplier] = useState<2 | 3 | 5>(3);
  const [color, setColor] = useState<'red' | 'black' | 'green'>('red');
  const [guess, setGuess] = useState('7');
  const [diceGuess, setDiceGuess] = useState('6');
  const [hilo, setHilo] = useState<'higher' | 'lower'>('higher');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    won: boolean;
    payout: number;
    profit: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    api.earn.miniInfo().catch(() => null);
  }, []);

  const play = async () => {
    const amount = parseFloat(bet);
    if (!amount || amount < 10) return;
    setLoading(true);
    setLastResult(null);
    try {
      let body: Parameters<typeof api.earn.playMini>[0];
      switch (activeGame) {
        case 'coinflip':
          body = { game: 'coinflip', bet: amount, choice, multiplier };
          break;
        case 'color':
          body = { game: 'color', bet: amount, color };
          break;
        case 'number':
          body = { game: 'number', bet: amount, guess: parseInt(guess, 10) };
          break;
        case 'dice':
          body = { game: 'dice', bet: amount, guess: parseInt(diceGuess, 10) };
          break;
        case 'hilo':
          body = { game: 'hilo', bet: amount, hilo };
          break;
        case 'slots':
          body = { game: 'slots', bet: amount };
          break;
        default:
          return;
      }
      const res = await api.earn.playMini(body);
      let message = '';
      if (res.outcomeRu) message = `Выпало: ${res.outcomeRu}`;
      else if (res.rollRu) message = `Выпало: ${res.rollRu}`;
      else if (res.reels) message = `Барабаны: ${res.reels.join(' ')}`;
      else if (typeof res.roll === 'number') message = `Выпало: ${res.roll}`;
      setLastResult({
        won: res.won,
        payout: res.payout,
        profit: res.profit,
        message,
      });
      await fetchWallet();
    } catch (err) {
      setLastResult({
        won: false,
        payout: 0,
        profit: 0,
        message: tError(err instanceof Error ? err.message : 'Ошибка'),
      });
    } finally {
      setLoading(false);
    }
  };

  const games: Array<{ id: GameId; label: string }> = [
    { id: 'coinflip', label: 'Орёл / решка' },
    { id: 'color', label: 'Красное / чёрное' },
    { id: 'number', label: 'Угадай число' },
    { id: 'dice', label: 'Кубик' },
    { id: 'hilo', label: 'Больше / меньше' },
    { id: 'slots', label: 'Слоты' },
  ];

  const Icon = GAME_ICONS[activeGame];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => { setActiveGame(g.id); setLastResult(null); }}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              activeGame === g.id ? 'bg-nexora-cyan/20 text-nexora-cyan border border-nexora-cyan/40' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {lastResult && (
        <GlassCard className={lastResult.won ? 'border-green-500/40' : 'border-red-500/40'}>
          <p className={lastResult.won ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
            {lastResult.won ? `Выигрыш ${formatNex(lastResult.payout)}` : 'Проигрыш'}
          </p>
          {lastResult.message && <p className="text-white/70 text-sm mt-1">{lastResult.message}</p>}
          {lastResult.won && (
            <p className="text-nexora-cyan text-sm mt-1">Прибыль: {formatNex(lastResult.profit)}</p>
          )}
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <Icon className="w-8 h-8 text-nexora-purple" />
          <div>
            <h3 className="font-bold text-lg">{games.find((g) => g.id === activeGame)?.label}</h3>
            <p className="text-sm text-white/50">Ставка списывается с основного счёта</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Ставка (NEX)"
            type="number"
            min="10"
            step="10"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
          />

          {activeGame === 'coinflip' && (
            <>
              <div>
                <p className="text-sm text-white/60 mb-2">Сторона</p>
                <div className="flex gap-2">
                  {(['heads', 'tails'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChoice(c)}
                      className={`flex-1 py-2 rounded-lg ${choice === c ? 'bg-nexora-cyan/20 ring-1 ring-nexora-cyan' : 'bg-white/5'}`}
                    >
                      {c === 'heads' ? '🦅 Орёл' : '🪙 Решка'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-2">Множитель</p>
                <div className="flex gap-2">
                  {([2, 3, 5] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMultiplier(m)}
                      className={`flex-1 py-2 rounded-lg font-bold ${multiplier === m ? 'bg-nexora-purple/30 ring-1 ring-nexora-purple' : 'bg-white/5'}`}
                    >
                      ×{m}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Потенциальный выигрыш: {formatNex(parseFloat(bet || '0') * multiplier)}
                </p>
              </div>
            </>
          )}

          {activeGame === 'color' && (
            <div>
              <p className="text-sm text-white/60 mb-2">Цвет</p>
              <div className="flex gap-2">
                {([
                  { id: 'red' as const, label: 'Красное', cls: 'bg-red-600/40' },
                  { id: 'black' as const, label: 'Чёрное', cls: 'bg-gray-800' },
                  { id: 'green' as const, label: 'Зелёное ×14', cls: 'bg-green-700/40' },
                ]).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex-1 py-2 rounded-lg text-sm ${c.cls} ${color === c.id ? 'ring-2 ring-white' : ''}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeGame === 'number' && (
            <Input
              label="Число 1–10 (×9)"
              type="number"
              min="1"
              max="10"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
            />
          )}

          {activeGame === 'dice' && (
            <Input
              label="Кубик 1–6 (×5)"
              type="number"
              min="1"
              max="6"
              value={diceGuess}
              onChange={(e) => setDiceGuess(e.target.value)}
            />
          )}

          {activeGame === 'hilo' && (
            <div>
              <p className="text-sm text-white/60 mb-2">Прогноз (×2)</p>
              <div className="flex gap-2">
                {([
                  { id: 'higher' as const, label: 'Больше 50' },
                  { id: 'lower' as const, label: 'Меньше 50' },
                ]).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setHilo(h.id)}
                    className={`flex-1 py-2 rounded-lg ${hilo === h.id ? 'bg-nexora-cyan/20 ring-1 ring-nexora-cyan' : 'bg-white/5'}`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeGame === 'slots' && (
            <div className="flex items-end">
              <Badge>Три одинаковых — ×10, два — ×2</Badge>
            </div>
          )}
        </div>

        <NeonButton onClick={play} disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Играем...' : `Играть · ${formatNex(parseFloat(bet || '0'))}`}
        </NeonButton>
      </GlassCard>
    </div>
  );
}
