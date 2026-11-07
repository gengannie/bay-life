import React, { useState } from 'react';
import { ACTIONS, FURNITURE_CATALOG, HOMES } from '../data/worldData';
import { formatCurrency, useGameStore } from '../store/useGameStore';
import { FurnitureDef } from '../types/game';
import { ShoppingBag, Check, Sparkles, X, Zap } from 'lucide-react';

const CATEGORIES: Array<{ id: FurnitureDef['category'] | 'all'; label: string; emoji: string }> = [
  { id: 'all', label: 'All Gear', emoji: '✨' },
  { id: 'compute', label: 'Desk & Compute', emoji: '🖥️' },
  { id: 'kitchen', label: 'Coffee & Kitchen', emoji: '☕' },
  { id: 'sleep', label: 'Sleep Tech', emoji: '🛌' },
  { id: 'bath', label: 'Sauna & Plunge', emoji: '🧊' },
  { id: 'comfort', label: 'Lounge & Vision', emoji: '🥽' },
  { id: 'fitness', label: 'Home Gym', emoji: '🏋️' },
  { id: 'power', label: 'PG&E Backup', emoji: '🔋' },
  { id: 'decor', label: 'Decor', emoji: '🪴' },
];

export const BuyFurnishModal: React.FC = () => {
  const cash = useGameStore((s) => s.cash);
  const homeId = useGameStore((s) => s.homeId);
  const objects = useGameStore((s) => s.objects);
  const buyFurniture = useGameStore((s) => s.buyFurniture);
  const setView = useGameStore((s) => s.setView);

  const [cat, setCat] = useState<FurnitureDef['category'] | 'all'>('all');

  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const items =
    cat === 'all'
      ? FURNITURE_CATALOG
      : FURNITURE_CATALOG.filter((f) => f.category === cat);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-100/90 p-4 backdrop-blur-xl dark:bg-slate-950/90">
      {/* Header */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#007AFF] text-white shadow-sm">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">
              Furnish & Upgrade · {homeDef.name}
            </h2>
            <p className="text-xs text-[var(--ink-soft)]">
              Available Cash: <b className="text-emerald-600 dark:text-emerald-400">{formatCurrency(cash)}</b> · {objects.length} items placed in apartment
            </p>
          </div>
        </div>

        <button
          onClick={() => setView('live')}
          className="apple-pill btn-press flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold"
        >
          <X className="size-4" />
          Done
        </button>
      </div>

      {/* Category Pills */}
      <div className="mx-auto mb-4 flex w-full max-w-5xl gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`btn-press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              cat === c.id
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'apple-pill text-[var(--ink)]'
            }`}
          >
            <span>{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Catalog Grid */}
      <div className="mx-auto flex-1 w-full max-w-5xl overflow-y-auto pb-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const ownedCount = objects.filter((o) => o.objectId === item.id).length;
            const canAfford = cash >= item.price;

            return (
              <div
                key={item.id}
                className="apple-glass-heavy flex flex-col justify-between rounded-3xl p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 place-items-center rounded-2xl bg-[var(--mist)] text-2xl">
                        {item.emoji}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold">{item.name}</h3>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-500">
                          {'★'.repeat(item.quality)}
                          <span className="ml-1 text-[var(--ink-soft)]">
                            Quality {item.quality}/5
                          </span>
                        </div>
                      </div>
                    </div>
                    {ownedCount > 0 && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Owned ×{ownedCount}
                      </span>
                    )}
                  </div>

                  <p className="mt-2.5 text-xs text-[var(--ink-soft)]">{item.subtitle}</p>

                  {item.powerBackup && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Zap className="size-3 fill-current" />
                      Prevents PG&E Blackout Shutdowns
                    </div>
                  )}

                  {/* Unlocks Actions */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.actions.map((actId) => {
                      const act = ACTIONS[actId];
                      return act ? (
                        <span
                          key={actId}
                          className="rounded-lg bg-[var(--mist)] px-2 py-0.5 text-[10px] font-medium"
                        >
                          {act.emoji} {act.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/10">
                  <div className="text-base font-extrabold">{formatCurrency(item.price)}</div>
                  <button
                    disabled={!canAfford}
                    onClick={() => buyFurniture(item.id)}
                    className={`btn-press flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
                      canAfford
                        ? 'bg-[#007AFF] text-white shadow-sm hover:bg-[#0066CC]'
                        : 'bg-[var(--mist)] text-[var(--ink-soft)] opacity-50'
                    }`}
                  >
                    {ownedCount > 0 ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
                    {ownedCount > 0 ? 'Buy Another' : 'Buy & Place'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
