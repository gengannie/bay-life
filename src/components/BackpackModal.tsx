import React, { useState } from 'react';
import {
  BACKPACK_ITEMS,
  BACKPACK_ITEM_BY_ID,
  FURNITURE_BY_ID,
  HOMES,
  MOODLETS,
} from '../data/worldData';
import { formatCurrency, useGameStore } from '../store/useGameStore';
import { Backpack, ShoppingBag, Sparkles, X, Zap, Home, ArrowDownToLine } from 'lucide-react';

type PackTab = 'pack' | 'shop' | 'room';
type PackFilter = 'all' | 'consumable' | 'edc' | 'furniture';

export const BackpackModal: React.FC = () => {
  const cash = useGameStore((s) => s.cash);
  const inventory = useGameStore((s) => s.inventory || []);
  const objects = useGameStore((s) => s.objects);
  const homeId = useGameStore((s) => s.homeId);
  const pantryMeals = useGameStore((s) => s.pantryMeals);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const buyBackpackItem = useGameStore((s) => s.buyBackpackItem);
  const useBackpackItem = useGameStore((s) => s.useBackpackItem);
  const storeFurnitureInBackpack = useGameStore((s) => s.storeFurnitureInBackpack);
  const placeFurnitureFromBackpack = useGameStore((s) => s.placeFurnitureFromBackpack);
  const sellBackpackItem = useGameStore((s) => s.sellBackpackItem);

  const totalCount = inventory.reduce((acc, entry) => acc + entry.quantity, 0);
  const [tab, setTab] = useState<PackTab>(() => (totalCount === 0 ? 'shop' : 'pack'));
  const [filter, setFilter] = useState<PackFilter>('all');

  const currentHome = HOMES.find((h) => h.id === homeId) || HOMES[1];

  const totalPackValue = inventory.reduce((acc, entry) => {
    const unitPrice =
      entry.kind === 'furniture'
        ? FURNITURE_BY_ID[entry.itemId]?.price || 0
        : BACKPACK_ITEM_BY_ID[entry.itemId]?.price || 0;
    return acc + unitPrice * entry.quantity;
  }, 0);

  const hasMacbook = inventory.some((i) => i.itemId === 'edc_macbook' && i.quantity > 0);
  const hasPowerBank = inventory.some((i) => i.itemId === 'edc_anker_bank' && i.quantity > 0);
  const extraEdcBuffItems = inventory
    .filter(
      (entry) =>
        entry.kind !== 'furniture' &&
        entry.quantity > 0 &&
        entry.itemId !== 'edc_macbook' &&
        entry.itemId !== 'edc_anker_bank'
    )
    .map((entry) => BACKPACK_ITEM_BY_ID[entry.itemId])
    .filter(
      (def): def is NonNullable<typeof def> =>
        Boolean(def && !def.consumable && (def.passiveBadge || def.passiveBoost))
    );

  const filteredInventory = inventory.filter((entry) => {
    if (entry.quantity <= 0) return false;
    if (filter === 'all') return true;
    if (filter === 'furniture') return entry.kind === 'furniture';
    const def = BACKPACK_ITEM_BY_ID[entry.itemId];
    if (!def) return false;
    if (filter === 'consumable') return def.consumable;
    if (filter === 'edc') return !def.consumable;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-md"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700/80 dark:bg-[#141722] dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white shadow-md">
              <Backpack className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">
                  Peak Design Everyday Backpack
                </h2>
                <span className="rounded-full bg-[#007AFF]/15 px-2.5 py-0.5 text-[10px] font-black text-[#007AFF]">
                  {totalCount} {totalCount === 1 ? 'Item' : 'Items'} · {formatCurrency(totalPackValue)} Value
                </span>
              </div>
              <p className="text-xs text-[var(--ink-soft)]">
                Use snacks & EDC tech anywhere in the Bay, or pack & unpack apartment furniture without losing value
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl bg-emerald-500/12 px-3.5 py-1.5 text-right">
              <div className="text-[10px] font-extrabold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                Available Cash
              </div>
              <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(cash)}
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="btn-press grid size-9 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
              aria-label="Close Backpack"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Active Passive EDC Perks & Pantry Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 bg-gradient-to-r from-[#007AFF]/8 via-indigo-500/8 to-emerald-500/8 px-5 py-2.5 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            <span className="text-[10px] font-black tracking-wider text-[var(--ink-soft)] uppercase">
              Active Pack Buffs:
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${
                hasMacbook
                  ? 'bg-[#007AFF]/15 text-[#007AFF]'
                  : 'bg-black/5 text-[var(--ink-soft)] dark:bg-white/5'
              }`}
            >
              💻 {hasMacbook ? 'MacBook M4 Max (+5% Coding XP Active)' : 'No Laptop Buff'}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${
                hasPowerBank
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-black/5 text-[var(--ink-soft)] dark:bg-white/5'
              }`}
            >
              🔋 {hasPowerBank ? 'Anker Prime (PG&E Outage Shield Active)' : 'No Portable Power Bank'}
            </span>
            {extraEdcBuffItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10.5px] font-extrabold text-indigo-700 dark:text-indigo-300"
              >
                {item.emoji} {item.name} ({item.passiveBoost || item.passiveBadge})
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10.5px] font-extrabold text-amber-700 dark:text-amber-300">
              🍱 Home Pantry: {pantryMeals} Meals
            </span>
          </div>
        </div>

        {/* Main Segmented Navigation (Apple HIG Segmented Control) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800">
            <button
              onClick={() => setTab('pack')}
              className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${
                tab === 'pack'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Backpack className="size-3.5" />
              <span>My Backpack ({totalCount})</span>
            </button>
            <button
              onClick={() => setTab('shop')}
              className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${
                tab === 'shop'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="size-3.5" />
              <span>EDC & Supply Shop</span>
            </button>
            <button
              onClick={() => setTab('room')}
              className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${
                tab === 'room'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <ArrowDownToLine className="size-3.5" />
              <span>Pack From Room ({objects.length})</span>
            </button>
          </div>

          {tab === 'pack' && (
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All', emoji: '✨' },
                  { id: 'consumable', label: 'Snacks & Bio', emoji: '☕' },
                  { id: 'edc', label: 'Tech & EDC', emoji: '💻' },
                  { id: 'furniture', label: 'Stored Furniture', emoji: '🛋️' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`btn-press rounded-full px-2.5 py-1 text-[11px] font-extrabold transition ${
                    filter === f.id
                      ? 'bg-[#5856D6] text-white'
                      : 'bg-slate-200/80 text-slate-700 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* =========================================================
              TAB 1: MY BACKPACK (INVENTORY)
          ========================================================= */}
          {tab === 'pack' && (
            <>
              {filteredInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/15 py-12 text-center dark:border-white/15">
                  <div className="grid size-14 place-items-center rounded-3xl bg-[#007AFF]/12 text-3xl">
                    🎒
                  </div>
                  <h3 className="mt-3 text-base font-extrabold">
                    Your Backpack is empty in this filter
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-[var(--ink-soft)]">
                    Grab portable Blue Bottle cold brew, Soylent, or reusable EDC gadgets from the
                    Supply Shop, or pack up furniture from your apartment room.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setTab('shop')}
                      className="btn-press rounded-2xl bg-[#007AFF] px-4 py-2 text-xs font-extrabold text-white shadow-sm"
                    >
                      🛍️ Browse EDC & Supply Shop
                    </button>
                    <button
                      onClick={() => setTab('room')}
                      className="btn-press rounded-2xl bg-[var(--mist)] px-4 py-2 text-xs font-extrabold text-[var(--ink)]"
                    >
                      🛋️ Pack Room Furniture
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredInventory.map((entry) => {
                    if (entry.kind === 'furniture') {
                      const fDef = FURNITURE_BY_ID[entry.itemId];
                      if (!fDef) return null;
                      const resale = Math.round(fDef.price * 0.7);
                      return (
                        <div
                          key={`furn-${entry.itemId}`}
                          className="flex flex-col justify-between rounded-3xl border border-indigo-500/30 bg-indigo-500/8 p-4 transition-all"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-2xl shadow-xs dark:bg-white/10">
                                  {fDef.emoji}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[9.5px] font-black text-indigo-700 uppercase dark:text-indigo-300">
                                      🛋️ Stored Gear · ×{entry.quantity}
                                    </span>
                                  </div>
                                  <h3 className="mt-0.5 text-sm font-extrabold leading-tight">
                                    {fDef.name}
                                  </h3>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-300">
                                {formatCurrency(fDef.price)}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
                              {fDef.subtitle}
                            </p>
                          </div>

                          <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-black/8 pt-3 dark:border-white/10">
                            <button
                              onClick={() => placeFurnitureFromBackpack(fDef.id)}
                              className="btn-press flex items-center justify-center gap-1 rounded-xl bg-[#007AFF] px-3 py-2 text-xs font-extrabold text-white shadow-xs"
                            >
                              <Home className="size-3.5" />
                              <span>Place in Room</span>
                            </button>
                            <button
                              onClick={() => sellBackpackItem(fDef.id, 'furniture')}
                              className="btn-press rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-extrabold text-rose-600 dark:text-rose-300"
                            >
                              Sell (+{formatCurrency(resale)})
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const item = BACKPACK_ITEM_BY_ID[entry.itemId];
                    if (!item) return null;
                    const moodDef = item.moodletId ? MOODLETS[item.moodletId] : null;
                    const resale = Math.max(10, Math.round(item.price * 0.7));

                    return (
                      <div
                        key={`item-${item.id}`}
                        className={`flex flex-col justify-between rounded-3xl border p-4 transition-all ${
                          item.consumable
                            ? 'border-black/8 bg-[var(--mist)] dark:border-white/10'
                            : 'border-[#007AFF]/35 bg-[#007AFF]/8'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-2xl shadow-xs dark:bg-white/10">
                                {item.emoji}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase ${
                                      item.consumable
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-[#007AFF]/20 text-[#007AFF]'
                                    }`}
                                  >
                                    {item.consumable ? `Consumable · ×${entry.quantity}` : '♾️ Reusable EDC'}
                                  </span>
                                </div>
                                <h3 className="mt-0.5 text-sm font-extrabold leading-tight">
                                  {item.name}
                                </h3>
                              </div>
                            </div>
                          </div>

                          <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
                            {item.subtitle}
                          </p>

                          {/* Instant Effect Chips */}
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {Object.entries(item.needsDelta || {}).map(([k, val]) =>
                              val ? (
                                <span
                                  key={k}
                                  className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold capitalize ${
                                    val > 0
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {val > 0 ? `+${val}%` : `${val}%`} {k}
                                </span>
                              ) : null
                            )}
                            {item.skillGain && (
                              <span className="rounded-lg bg-purple-500/15 px-2 py-0.5 text-[10px] font-extrabold text-purple-700 dark:text-purple-300">
                                +{item.skillGain.amount} {item.skillGain.skill} XP
                              </span>
                            )}
                            {item.startupDelta && (
                              <span className="rounded-lg bg-indigo-500/15 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300">
                                🚀 +{item.startupDelta}% MVP
                              </span>
                            )}
                            {moodDef && (
                              <span className="rounded-lg bg-sky-500/15 px-2 py-0.5 text-[10px] font-extrabold text-sky-700 dark:text-sky-300">
                                {moodDef.emoji} {moodDef.label}
                              </span>
                            )}
                            {(item.passiveBoost || item.passiveBadge) && (
                              <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-200">
                                ✨ {item.passiveBoost || item.passiveBadge}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3.5 flex items-center gap-2 border-t border-black/8 pt-3 dark:border-white/10">
                          <button
                            onClick={() => useBackpackItem(item.id)}
                            className="btn-press flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#007AFF] px-3 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#0066CC]"
                          >
                            <Zap className="size-3.5" />
                            <span>{item.useLabel || (item.consumable ? 'Consume' : 'Use Gear')}</span>
                          </button>
                          <button
                            onClick={() => sellBackpackItem(item.id, 'item')}
                            className="btn-press rounded-xl bg-black/6 px-2.5 py-2 text-[11px] font-extrabold text-[var(--ink-soft)] hover:text-rose-600 dark:bg-white/10"
                            title={`Sell for ${formatCurrency(resale)}`}
                          >
                            💵 {formatCurrency(resale)}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* =========================================================
              TAB 2: EDC & SUPPLY SHOP
          ========================================================= */}
          {tab === 'shop' && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {BACKPACK_ITEMS.map((item) => {
                const ownedEntry = inventory.find(
                  (i) => i.itemId === item.id && i.kind === 'item'
                );
                const ownedQty = ownedEntry?.quantity || 0;
                const alreadyOwnedEdc = !item.consumable && ownedQty > 0;
                const canAfford = cash >= item.price;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col justify-between rounded-3xl border p-4 transition-all ${
                      alreadyOwnedEdc
                        ? 'border-emerald-500/35 bg-emerald-500/8'
                        : 'border-black/8 bg-[var(--mist)] dark:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-2xl shadow-xs dark:bg-white/10">
                            {item.emoji}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase ${
                                  item.consumable
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                    : 'bg-[#007AFF]/15 text-[#007AFF]'
                                }`}
                              >
                                {item.consumable ? 'Consumable' : '♾️ Reusable EDC'}
                              </span>
                              {ownedQty > 0 && (
                                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9.5px] font-black text-emerald-700 dark:text-emerald-300">
                                  In Pack: ×{ownedQty}
                                </span>
                              )}
                            </div>
                            <h3 className="mt-0.5 text-sm font-extrabold leading-tight">
                              {item.name}
                            </h3>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.price)}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
                        {item.subtitle}
                      </p>

                      {(item.passiveBoost || item.passiveBadge) && (
                        <div className="mt-2 rounded-xl bg-amber-500/15 px-2.5 py-1 text-[10.5px] font-extrabold text-amber-800 dark:text-amber-200">
                          ✨ Passive Perk: {item.passiveBoost || item.passiveBadge}
                        </div>
                      )}
                    </div>

                    <div className="mt-3.5 border-t border-black/8 pt-3 dark:border-white/10">
                      <button
                        disabled={!alreadyOwnedEdc && !canAfford}
                        onClick={() => buyBackpackItem(item.id)}
                        className={`btn-press flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                          alreadyOwnedEdc
                            ? 'bg-emerald-600 text-white'
                            : canAfford
                            ? 'bg-[#007AFF] text-white shadow-xs hover:bg-[#0066CC]'
                            : 'bg-black/10 text-[var(--ink-soft)] opacity-50 dark:bg-white/10'
                        }`}
                      >
                        <Sparkles className="size-3.5" />
                        <span>
                          {alreadyOwnedEdc
                            ? '✓ In Pack'
                            : canAfford
                            ? `Buy for ${formatCurrency(item.price)}`
                            : `Need ${formatCurrency(item.price)}`}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =========================================================
              TAB 3: PACK FURNITURE FROM APARTMENT ROOM
          ========================================================= */}
          {tab === 'room' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#007AFF]/25 bg-[#007AFF]/8 p-3.5 text-xs">
                <div className="font-extrabold text-[#007AFF]">
                  🏠 Packing Furniture from {currentHome.name}
                </div>
                <p className="mt-0.5 text-[var(--ink-soft)]">
                  Packing an item removes it from your room grid and stores it safely in your
                  Backpack at 100% value so you can rearrange or unpack it in any apartment later.
                </p>
              </div>

              {objects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-black/15 py-10 text-center text-xs text-[var(--ink-soft)] dark:border-white/15">
                  No furniture currently placed in your apartment.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {objects.map((placed) => {
                    const fDef = FURNITURE_BY_ID[placed.objectId];
                    if (!fDef) return null;
                    return (
                      <div
                        key={placed.uid}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-black/8 bg-[var(--mist)] p-3.5 dark:border-white/10"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/80 text-xl dark:bg-white/10">
                            {fDef.emoji}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-extrabold">{fDef.name}</div>
                            <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                              Tile ({placed.x}, {placed.y}) · {formatCurrency(fDef.price)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => storeFurnitureInBackpack(placed.uid)}
                          className="btn-press shrink-0 rounded-xl bg-[#007AFF] px-3 py-2 text-[11px] font-extrabold text-white shadow-xs"
                        >
                          🎒 Pack
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
