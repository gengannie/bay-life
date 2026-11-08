import React, { useState } from 'react';
import { ACTIONS, FURNITURE_CATALOG, HOMES } from '../data/worldData';
import { formatCurrency, useGameStore } from '../store/useGameStore';
import { FurnitureDef } from '../types/game';
import { ShoppingBag, Check, Sparkles, X, Flame, Home } from 'lucide-react';

type FilterCategory = FurnitureDef['category'] | 'all' | 'best';

const CATEGORIES: Array<{ id: FilterCategory; label: string; emoji: string }> = [
  { id: 'all', label: 'All Gear', emoji: '✨' },
  { id: 'best', label: 'Best Upgrades', emoji: '🔥' },
  { id: 'compute', label: 'Compute', emoji: '🖥️' },
  { id: 'power', label: 'PG&E Backup', emoji: '🔋' },
  { id: 'kitchen', label: 'Espresso & Food', emoji: '☕' },
  { id: 'sleep', label: 'Sleep Tech', emoji: '🛌' },
  { id: 'bath', label: 'Sauna & Bath', emoji: '🧊' },
  { id: 'comfort', label: 'Lounge', emoji: '🥽' },
  { id: 'fitness', label: 'Home Gym', emoji: '🏋️' },
  { id: 'decor', label: 'Decor', emoji: '🪴' },
];

function isBestUpgrade(item: FurnitureDef): boolean {
  if (item.powerBackup) return true;
  if (item.category === 'compute' && item.quality >= 3) return true;
  return (
    item.id === 'eightsleep_pod' ||
    item.id === 'linea_micra_bar' ||
    item.id === 'sauna_plunge' ||
    item.id === 'tonal_gym'
  );
}

interface StatChip {
  label: string;
  tone: 'blue' | 'emerald' | 'amber' | 'purple' | 'neutral';
}

function getFurnitureStatChips(item: FurnitureDef): StatChip[] {
  const chips: StatChip[] = [
    {
      label: `⬆️ Tier ${item.quality}`,
      tone: item.quality >= 4 ? 'amber' : 'neutral',
    },
  ];

  if (item.powerBackup) {
    chips.push({ label: '🔋 Outage Backup', tone: 'emerald' });
  }

  let maxEnergy = 0;
  let maxHunger = 0;
  let maxHygiene = 0;
  let maxFun = 0;
  let maxBladder = 0;
  let bestSkillAmount = 0;
  let bestStartup = 0;
  let bestEarn = 0;

  for (const actId of item.actions) {
    const act = ACTIONS[actId];
    if (!act) continue;
    const nd = act.needsDelta || {};
    if ((nd.energy || 0) > maxEnergy) maxEnergy = nd.energy || 0;
    if ((nd.hunger || 0) > maxHunger) maxHunger = nd.hunger || 0;
    if ((nd.hygiene || 0) > maxHygiene) maxHygiene = nd.hygiene || 0;
    if ((nd.fun || 0) > maxFun) maxFun = nd.fun || 0;
    if ((nd.bladder || 0) > maxBladder) maxBladder = nd.bladder || 0;
    if (act.skillGain && act.skillGain.amount > bestSkillAmount) {
      bestSkillAmount = act.skillGain.amount;
    }
    if ((act.startupProgress || 0) > bestStartup) {
      bestStartup = act.startupProgress || 0;
    }
    if (act.earn && act.earn[1] > bestEarn) {
      bestEarn = act.earn[1];
    }
  }

  if (bestSkillAmount > 0) {
    chips.push({ label: `🧠 +${bestSkillAmount}% XP`, tone: 'purple' });
  }
  if (bestStartup > 0) {
    chips.push({ label: `🚀 +${bestStartup}% MVP`, tone: 'blue' });
  }
  if (bestEarn > 0) {
    chips.push({ label: `💵 +$${bestEarn}`, tone: 'emerald' });
  }
  if (maxEnergy > 0) {
    chips.push({ label: `⚡ +${maxEnergy}`, tone: 'amber' });
  }
  if (maxHunger > 0) {
    chips.push({ label: `🥗 +${maxHunger}`, tone: 'emerald' });
  }
  if (maxHygiene > 0) {
    chips.push({ label: `🚿 +${maxHygiene}`, tone: 'blue' });
  }
  if (maxFun > 0 && chips.length < 4) {
    chips.push({ label: `🎮 +${maxFun}`, tone: 'purple' });
  }
  if (maxBladder > 0 && chips.length < 4) {
    chips.push({ label: `🚽 +${maxBladder}`, tone: 'blue' });
  }

  chips.push({
    label: `📐 ${item.footprint[0]}×${item.footprint[1]}`,
    tone: 'neutral',
  });

  return chips.slice(0, 5);
}

const CHIP_TONE_CLASSES: Record<StatChip['tone'], string> = {
  blue: 'bg-[#007AFF]/15 text-[#007AFF]',
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  neutral: 'bg-[var(--mist)] text-[var(--ink)]',
};

export const BuyFurnishModal: React.FC = () => {
  const cash = useGameStore((s) => s.cash);
  const homeId = useGameStore((s) => s.homeId);
  const locationId = useGameStore((s) => s.locationId);
  const objects = useGameStore((s) => s.objects);
  const buyFurniture = useGameStore((s) => s.buyFurniture);
  const setView = useGameStore((s) => s.setView);
  const travelTo = useGameStore((s) => s.travelTo);
  const skipTravelNow = useGameStore((s) => s.skipTravelNow);

  const [cat, setCat] = useState<FilterCategory>('all');

  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];

  if (locationId !== 'home') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100/90 p-6 backdrop-blur-xl dark:bg-slate-950/90">
        <div className="apple-glass-heavy flex max-w-md flex-col items-center rounded-3xl border border-white/40 p-6 text-center shadow-xl dark:border-white/10">
          <span className="grid size-14 place-items-center rounded-2xl bg-[#007AFF]/15 text-3xl text-[#007AFF]">
            🏠
          </span>
          <h2 className="mt-4 text-lg font-extrabold">
            You must be at your apartment to buy or arrange furniture
          </h2>
          <p className="mt-1.5 text-xs font-medium text-[var(--ink-soft)]">
            Head back to {homeDef.name} to install new gear or rearrange your floor plan.
          </p>
          <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row">
            <button
              onClick={() => {
                travelTo('home', 'gbus');
                skipTravelNow();
              }}
              className="btn-press flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#007AFF] px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-[#0066CC]"
            >
              <Home className="size-4" />
              🏠 Travel Home
            </button>
            <button
              onClick={() => setView('live')}
              className="apple-pill btn-press flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-xs font-bold"
            >
              <X className="size-4" />
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const items =
    cat === 'all'
      ? FURNITURE_CATALOG
      : cat === 'best'
      ? FURNITURE_CATALOG.filter(isBestUpgrade)
      : FURNITURE_CATALOG.filter((f) => f.category === cat);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-100/90 p-4 backdrop-blur-xl dark:bg-slate-950/90">
      {/* Compact Apple Bento Header */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#007AFF] text-white shadow-sm">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold sm:text-lg">
                Apartment Gear · {homeDef.name}
              </h2>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(cash)}
              </span>
            </div>
            <p className="text-[11px] font-medium text-[var(--ink-soft)]">
              {objects.length} items installed · {homeDef.gridSize}×{homeDef.gridSize} grid
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

      {/* Smart Filter Pills */}
      <div className="mx-auto mb-3.5 flex w-full max-w-5xl gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => {
          const active = cat === c.id;
          const isBestTab = c.id === 'best';
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`btn-press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                active
                  ? isBestTab
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                    : 'bg-[#007AFF] text-white shadow-sm'
                  : isBestTab
                  ? 'apple-pill border border-amber-500/40 text-amber-600 dark:text-amber-400'
                  : 'apple-pill text-[var(--ink)]'
              }`}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Visual Bento Grid */}
      <div className="mx-auto flex-1 w-full max-w-5xl overflow-y-auto pb-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const ownedCount = objects.filter((o) => o.objectId === item.id).length;
            const canAfford = cash >= item.price;
            const topPick = isBestUpgrade(item);
            const statChips = getFurnitureStatChips(item);

            return (
              <div
                key={item.id}
                className={`apple-glass-heavy flex flex-col justify-between rounded-3xl border p-4 transition-all ${
                  topPick
                    ? 'border-amber-500/35 shadow-sm'
                    : 'border-white/30 dark:border-white/10'
                }`}
              >
                <div>
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--mist)] text-2xl">
                        {item.emoji}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-extrabold leading-snug">{item.name}</h3>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-amber-500">
                            {'★'.repeat(item.quality)}
                          </span>
                          {topPick && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.2 text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                              <Flame className="size-2.5 fill-current" /> Best Upgrade
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {ownedCount > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        Owned ×{ownedCount}
                      </span>
                    )}
                  </div>

                  {/* Visual Stat Chips (Replaces wordy sentences) */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {statChips.map((chip) => (
                      <span
                        key={chip.label}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${CHIP_TONE_CLASSES[chip.tone]}`}
                      >
                        {chip.label}
                      </span>
                    ))}
                  </div>

                  {/* Unlocked Action Pills */}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {item.actions.map((actId) => {
                      const act = ACTIONS[actId];
                      return act ? (
                        <span
                          key={actId}
                          className="rounded-lg bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-[var(--ink-soft)] dark:bg-white/5"
                        >
                          {act.emoji} {act.label.split('(')[0].trim()}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Price & 1-Tap Buy */}
                <div className="mt-3.5 flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/10">
                  <div className="text-base font-extrabold">{formatCurrency(item.price)}</div>
                  <button
                    disabled={!canAfford}
                    onClick={() => buyFurniture(item.id)}
                    className={`btn-press flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold ${
                      canAfford
                        ? 'bg-[#007AFF] text-white shadow-sm hover:bg-[#0066CC]'
                        : 'bg-[var(--mist)] text-[var(--ink-soft)] opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? (
                      <>
                        {ownedCount > 0 ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        {ownedCount > 0 ? 'Add Another' : 'Buy & Place'}
                      </>
                    ) : (
                      `Need ${formatCurrency(item.price)}`
                    )}
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


