import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ACTIONS, FURNITURE_BY_ID, FURNITURE_CATALOG, HOMES } from '../data/worldData';
import { formatCurrency, useGameStore } from '../store/useGameStore';
import {
  computeRoomVibe,
  getIsoTileFromClientPoint,
  getNextUpgradeFurnitureDef,
  useFurnishStore,
} from '../store/useFurnishStore';
import { FurnitureDef } from '../types/game';
import {
  ArrowUpCircle,
  ShoppingBag,
  Check,
  Sparkles,
  Trash2,
  X,
  Flame,
  Home,
  Move,
  Wand2,
  Maximize2,
  Minimize2,
  Eye,
  RotateCw,
} from 'lucide-react';

type FilterCategory = FurnitureDef['category'] | 'all' | 'best' | 'stored';

const CATEGORIES: Array<{ id: FilterCategory; label: string; emoji: string }> = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'best', label: 'Top Picks', emoji: '🔥' },
  { id: 'stored', label: 'Packed', emoji: '🎒' },
  { id: 'compute', label: 'Compute', emoji: '🖥️' },
  { id: 'power', label: 'Backup', emoji: '🔋' },
  { id: 'kitchen', label: 'Coffee & Food', emoji: '☕' },
  { id: 'sleep', label: 'Sleep', emoji: '🛌' },
  { id: 'bath', label: 'Recovery', emoji: '🧊' },
  { id: 'comfort', label: 'Lounge', emoji: '🥽' },
  { id: 'fitness', label: 'Gym', emoji: '🏋️' },
  { id: 'decor', label: 'Vibes', emoji: '🪴' },
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
  const chips: StatChip[] = [];

  if (item.powerBackup) {
    chips.push({ label: '🔋 Outage Proof', tone: 'emerald' });
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
  if (maxFun > 0 && chips.length < 3) {
    chips.push({ label: `🎮 +${maxFun}`, tone: 'purple' });
  }
  if (maxBladder > 0 && chips.length < 3) {
    chips.push({ label: `🚽 +${maxBladder}`, tone: 'blue' });
  }

  if (chips.length === 0) {
    chips.push({ label: `✨ Tier ${item.quality}`, tone: 'amber' });
  }

  return chips.slice(0, 2);
}

const CHIP_TONE_CLASSES: Record<StatChip['tone'], string> = {
  blue: 'bg-[#007AFF]/18 text-[#007AFF] dark:text-[#5AC8FA]',
  emerald: 'bg-emerald-500/18 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/18 text-amber-700 dark:text-amber-300',
  purple: 'bg-purple-500/18 text-purple-700 dark:text-purple-300',
  neutral: 'bg-[var(--mist)] text-[var(--ink)]',
};

export const BuyFurnishModal: React.FC = () => {
  const cash = useGameStore((s) => s.cash);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const homeId = useGameStore((s) => s.homeId);
  const locationId = useGameStore((s) => s.locationId);
  const objects = useGameStore((s) => s.objects);
  const inventory = useGameStore((s) => s.inventory || []);
  const setView = useGameStore((s) => s.setView);
  const travelTo = useGameStore((s) => s.travelTo);
  const skipTravelNow = useGameStore((s) => s.skipTravelNow);
  const sellFurniture = useGameStore((s) => s.sellFurniture);
  const storeFurnitureInBackpack = useGameStore((s) => s.storeFurnitureInBackpack);

  const catalogDrag = useFurnishStore((s) => s.catalogDrag);
  const pendingPlaceId = useFurnishStore((s) => s.pendingPlaceId);
  const selectedFurnishUid = useFurnishStore((s) => s.selectedFurnishUid);
  const trayMode = useFurnishStore((s) => s.trayMode);
  const hoveredCatalogId = useFurnishStore((s) => s.hoveredCatalogId);

  const setCatalogDrag = useFurnishStore((s) => s.setCatalogDrag);
  const setPendingPlaceId = useFurnishStore((s) => s.setPendingPlaceId);
  const setSelectedFurnishUid = useFurnishStore((s) => s.setSelectedFurnishUid);
  const setTrayMode = useFurnishStore((s) => s.setTrayMode);
  const setHoveredCatalogId = useFurnishStore((s) => s.setHoveredCatalogId);
  const buyAndPlaceFurniture = useFurnishStore((s) => s.buyAndPlaceFurniture);
  const upgradePlacedFurniture = useFurnishStore((s) => s.upgradePlacedFurniture);
  const autoArrangeRoom = useFurnishStore((s) => s.autoArrangeRoom);
  const rotatePlacedFurniture = useFurnishStore((s) => s.rotatePlacedFurniture);

  const [cat, setCat] = useState<FilterCategory>('all');
  const dockRef = useRef<HTMLDivElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);

  // Local pointer-down candidate before 6px threshold turns into a full room drag
  const dragCandidateRef = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    started: boolean;
  } | null>(null);

  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];

  const storedFurnitureById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of inventory) {
      if (entry.kind === 'furniture' && entry.quantity > 0) {
        map[entry.itemId] = (map[entry.itemId] || 0) + entry.quantity;
      }
    }
    return map;
  }, [inventory]);

  const totalStoredCount = useMemo(
    () => Object.values(storedFurnitureById).reduce((acc, q) => acc + q, 0),
    [storedFurnitureById]
  );

  const vibeSummary = useMemo(
    () => computeRoomVibe(objects, homeId),
    [objects, homeId]
  );

  const selectedFurnishObj = selectedFurnishUid
    ? objects.find((o) => o.uid === selectedFurnishUid) || null
    : null;
  const selectedFurnishDef = selectedFurnishObj
    ? FURNITURE_BY_ID[selectedFurnishObj.objectId] || null
    : null;
  const furnishUpgradeTargetDef = selectedFurnishDef
    ? getNextUpgradeFurnitureDef(selectedFurnishDef)
    : null;
  const furnishResaleValue = selectedFurnishDef
    ? Math.round(selectedFurnishDef.price * 0.65)
    : 0;
  const furnishUpgradeNetCost = furnishUpgradeTargetDef
    ? Math.max(0, furnishUpgradeTargetDef.price - furnishResaleValue)
    : 0;

  // Global pointer tracking when dragging a catalog card from the shopping dock into the room
  useEffect(() => {
    const isPointInsideOverlayUi = (clientX: number, clientY: number) => {
      const dockRect = dockRef.current?.getBoundingClientRect();
      const insideDock =
        Boolean(dockRect) &&
        clientY >= dockRect!.top + 8 &&
        clientX >= dockRect!.left &&
        clientX <= dockRect!.right;

      const topRect = topBarRef.current?.getBoundingClientRect();
      const insideTopBar =
        Boolean(topRect) &&
        clientY >= topRect!.top - 8 &&
        clientY <= topRect!.bottom + 6 &&
        clientX >= topRect!.left &&
        clientX <= topRect!.right;

      return insideDock || insideTopBar || clientY < 56;
    };

    const onPointerMove = (e: PointerEvent) => {
      const cand = dragCandidateRef.current;
      if (!cand) return;

      const dist = Math.hypot(e.clientX - cand.startX, e.clientY - cand.startY);
      if (!cand.started && dist > 6) {
        cand.started = true;
        setPendingPlaceId(null);
        // If expanded gallery was open, collapse to split dock so the room is visible!
        if (useFurnishStore.getState().trayMode === 'expanded') {
          setTrayMode('dock');
        }
      }

      if (cand.started) {
        const insideUi = isPointInsideOverlayUi(e.clientX, e.clientY);
        const targetTile = insideUi
          ? null
          : getIsoTileFromClientPoint(
              e.clientX,
              e.clientY,
              homeDef.gridSize,
              false,
              0.45
            );

        setCatalogDrag({
          furnitureId: cand.itemId,
          clientX: e.clientX,
          clientY: e.clientY,
          targetTile,
        });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const cand = dragCandidateRef.current;
      if (!cand) return;
      dragCandidateRef.current = null;

      if (cand.started) {
        const insideUi = isPointInsideOverlayUi(e.clientX, e.clientY);
        if (!insideUi) {
          const dropTile = getIsoTileFromClientPoint(
            e.clientX,
            e.clientY,
            homeDef.gridSize,
            false,
            0.45
          );
          if (dropTile) {
            buyAndPlaceFurniture(cand.itemId, dropTile);
          }
        }
        setCatalogDrag(null);
      }
    };

    const cancelActiveCatalogDrag = () => {
      if (!dragCandidateRef.current) return;
      dragCandidateRef.current = null;
      setCatalogDrag(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragCandidateRef.current?.started) {
        e.preventDefault();
        e.stopPropagation();
        cancelActiveCatalogDrag();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', cancelActiveCatalogDrag);
    window.addEventListener('blur', cancelActiveCatalogDrag);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', cancelActiveCatalogDrag);
      window.removeEventListener('blur', cancelActiveCatalogDrag);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [buyAndPlaceFurniture, homeDef.gridSize, setCatalogDrag, setPendingPlaceId, setTrayMode]);

  // Clean up furnish transient state when leaving Furnish Mode
  useEffect(() => {
    return () => {
      setCatalogDrag(null);
      setPendingPlaceId(null);
      if (useFurnishStore.getState().trayMode === 'expanded') {
        setTrayMode('dock');
      }
    };
  }, [setCatalogDrag, setPendingPlaceId, setTrayMode]);

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
                travelTo('home', ownedCars.length > 0 ? 'tesla' : 'gbus');
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
      : cat === 'stored'
      ? FURNITURE_CATALOG.filter((f) => (storedFurnitureById[f.id] || 0) > 0)
      : FURNITURE_CATALOG.filter((f) => f.category === cat);

  const spotlightItem =
    (hoveredCatalogId && FURNITURE_BY_ID[hoveredCatalogId]) ||
    (pendingPlaceId && FURNITURE_BY_ID[pendingPlaceId]) ||
    (catalogDrag && FURNITURE_BY_ID[catalogDrag.furnitureId]) ||
    null;

  const activeDraggingDef = catalogDrag ? FURNITURE_BY_ID[catalogDrag.furnitureId] : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-25 flex flex-col justify-between overflow-hidden">
      {/* TOP FURNISHING STUDIO BAR (Sits cleanly below Top HUD Bar, keeps room interactive) */}
      <div
        ref={topBarRef}
        className="pointer-events-none mx-auto mt-14 flex w-full max-w-5xl flex-col items-center gap-2 px-3 sm:px-5"
      >
        <div className="apple-glass-heavy pointer-events-auto flex w-full flex-wrap items-center justify-between gap-2 rounded-3xl border border-sky-400/35 px-4 py-2.5 text-xs text-[var(--ink)] shadow-xl">
          {/* Left: Studio Mode Badge + Vibe Score + Synergies */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-[#007AFF] to-sky-400 text-white shadow-sm">
                <Move className="size-4" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold sm:text-sm">
                    Furnish Studio · {homeDef.name}
                  </span>
                  <span className="rounded-full bg-amber-500/18 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-300">
                    ✨ Vibe {vibeSummary.score} · {vibeSummary.rankLabel}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-[var(--ink-soft)]">
                  <span>🖐️ Drag room items to move/swap</span>
                  <span>·</span>
                  <span>🔄 Press R to rotate</span>
                  <span>·</span>
                  <span>📦 Drag icons from shop onto floor</span>
                </div>
              </div>
            </div>

            {/* Active Room Synergy Badges */}
            <div className="hidden items-center gap-1.5 lg:flex">
              {vibeSummary.synergies.map((syn) => (
                <span
                  key={syn.id}
                  title={`${syn.label}: ${syn.desc}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold transition-all ${
                    syn.unlocked
                      ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 shadow-2xs dark:text-emerald-300'
                      : 'border border-black/5 bg-[var(--mist)] text-[var(--ink-soft)] opacity-55 dark:border-white/10'
                  }`}
                >
                  <span>{syn.emoji}</span>
                  <span>{syn.label}</span>
                  {syn.unlocked && <span className="text-[9px]">✓</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Auto-Feng Shui, Tray Size & Done */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={autoArrangeRoom}
              className="btn-press flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm hover:opacity-95"
              title="Automatically arrange all placed furniture into a balanced perimeter studio layout"
            >
              <Wand2 className="size-3.5" />
              <span>✨ Auto-Feng Shui</span>
            </button>

            <button
              onClick={() =>
                setTrayMode(trayMode === 'minimized' ? 'dock' : 'minimized')
              }
              className="apple-pill btn-press flex items-center gap-1 rounded-2xl px-2.5 py-1.5 text-xs font-bold"
              title={
                trayMode === 'minimized'
                  ? 'Show Shopping Catalog Dock'
                  : 'Hide Catalog to Inspect Full Room'
              }
            >
              <Eye className="size-3.5 text-[#007AFF]" />
              <span>{trayMode === 'minimized' ? 'Show Shop' : 'Room Only'}</span>
            </button>

            <button
              onClick={() => {
                setPendingPlaceId(null);
                setSelectedFurnishUid(null);
                setView('live');
              }}
              className="btn-press flex items-center gap-1.5 rounded-2xl bg-[#007AFF] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#0066CC]"
            >
              <Check className="size-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>

        {/* Selected Furniture Quick-Action Sub-Bar (Stacked cleanly below Top Studio Bar without overlapping buttons) */}
        {selectedFurnishObj && selectedFurnishDef && (
          <div className="apple-glass-heavy pointer-events-auto flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-400/50 bg-sky-500/10 px-3.5 py-2 text-xs text-[var(--ink)] shadow-xl animate-target-pop">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-white/80 text-xl shadow-inner dark:bg-white/10">
                {selectedFurnishDef.emoji}
              </span>
              <div>
                <div className="font-extrabold leading-tight text-[var(--ink)]">
                  {selectedFurnishDef.name}
                </div>
                <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                  Tile ({selectedFurnishObj.x}, {selectedFurnishObj.y}) · Drag to move or swap
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => rotatePlacedFurniture(selectedFurnishObj.uid)}
                className="btn-press flex items-center gap-1 rounded-xl bg-[var(--mist)] px-2.5 py-1.5 text-xs font-extrabold text-[var(--ink)] hover:bg-[#007AFF]/15"
                title="Rotate 90° (Shortcut: R)"
              >
                <RotateCw className="size-3.5 text-[#007AFF]" />
                <span>Rotate (R)</span>
              </button>

              <button
                onClick={() => {
                  storeFurnitureInBackpack(selectedFurnishObj.uid);
                  setSelectedFurnishUid(null);
                }}
                className="btn-press flex items-center gap-1 rounded-xl bg-indigo-500/15 px-2.5 py-1.5 text-xs font-extrabold text-indigo-700 hover:bg-indigo-500/25 dark:text-indigo-300"
                title="Pack into Backpack (100% value preserved, can unpack for free anytime)"
              >
                <span>🎒 Pack</span>
              </button>

              {furnishUpgradeTargetDef && (
                <button
                  onClick={() => upgradePlacedFurniture(selectedFurnishObj.uid)}
                  className="btn-press flex items-center gap-1 rounded-xl bg-[#007AFF] px-2.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#0066CC]"
                  title={`Upgrade to ${furnishUpgradeTargetDef.name} (Trade-in credit: ${formatCurrency(furnishResaleValue)})`}
                >
                  <ArrowUpCircle className="size-3.5" />
                  <span>
                    ⬆️ Upgrade ({formatCurrency(furnishUpgradeNetCost)}) · {furnishUpgradeTargetDef.emoji}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  sellFurniture(selectedFurnishObj.uid);
                  setSelectedFurnishUid(null);
                }}
                className="btn-press flex items-center gap-1 rounded-xl bg-rose-500/15 px-2.5 py-1.5 text-xs font-extrabold text-rose-600 hover:bg-rose-500/25 dark:text-rose-400"
                title="Sell item"
              >
                <Trash2 className="size-3.5" />
                <span>Sell +{formatCurrency(furnishResaleValue)}</span>
              </button>

              <button
                onClick={() => setSelectedFurnishUid(null)}
                className="btn-press grid size-7 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
                title="Deselect (Esc)"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Active Stamp-Placement Banner when user clicked "Place on Tile" */}
        {pendingPlaceId && FURNITURE_BY_ID[pendingPlaceId] && (
          <div className="apple-glass-heavy pointer-events-auto flex items-center gap-3 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-lg dark:text-emerald-300">
            <span className="text-lg">{FURNITURE_BY_ID[pendingPlaceId].emoji}</span>
            <span>
              Click any floor tile in the room to place{' '}
              <strong>{FURNITURE_BY_ID[pendingPlaceId].name}</strong>{' '}
              {storedFurnitureById[pendingPlaceId] > 0 ? (
                <span className="text-indigo-600 dark:text-indigo-300">(🎒 Free from Pack)</span>
              ) : (
                `(${formatCurrency(FURNITURE_BY_ID[pendingPlaceId].price)})`
              )}
            </span>
            <button
              onClick={() => setPendingPlaceId(null)}
              className="btn-press rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold hover:bg-black/20 dark:bg-white/10"
            >
              Cancel (Esc)
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM ICON-FOCUSED SHOPPING DOCK */}
      <div
        ref={dockRef}
        className={`pointer-events-auto mx-auto w-full max-w-6xl px-2 pb-2 transition-all duration-300 sm:px-4 ${
          trayMode === 'minimized'
            ? 'max-h-14'
            : trayMode === 'expanded'
            ? 'h-[76vh]'
            : 'h-[43vh] min-h-[295px] max-h-[410px]'
        }`}
      >
        <div className="apple-glass-heavy flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/45 p-3 shadow-2xl dark:border-white/12">
          {/* Dock Header: Category Pills + Spotlight Item Bar + Expand Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {CATEGORIES.map((c) => {
                const active = cat === c.id;
                const isBestTab = c.id === 'best';
                const isStoredTab = c.id === 'stored';
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCat(c.id);
                      if (trayMode === 'minimized') setTrayMode('dock');
                    }}
                    className={`btn-press flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold transition-all ${
                      active
                        ? isBestTab
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                          : isStoredTab
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-[#007AFF] text-white shadow-xs'
                        : isBestTab
                        ? 'apple-pill border border-amber-500/40 text-amber-600 dark:text-amber-400'
                        : isStoredTab
                        ? 'apple-pill border border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                        : 'apple-pill text-[var(--ink)]'
                    }`}
                  >
                    <span className="text-sm">{c.emoji}</span>
                    <span>
                      {c.label}
                      {isStoredTab && totalStoredCount > 0 ? ` (${totalStoredCount})` : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: Spotlight Item Preview + Expand/Collapse Dock */}
            <div className="flex items-center gap-2">
              {spotlightItem ? (
                <div className="hidden items-center gap-2 rounded-2xl bg-[var(--mist)] px-3 py-1 text-[11px] sm:flex">
                  <span className="text-lg">{spotlightItem.emoji}</span>
                  <span className="font-extrabold text-[var(--ink)]">
                    {spotlightItem.name}
                  </span>
                  <span className="text-[var(--ink-soft)]">·</span>
                  <span className="font-semibold text-[#007AFF] dark:text-[#5AC8FA]">
                    {spotlightItem.actions
                      .map((a) => ACTIONS[a]?.label.split('(')[0].trim())
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(' · ')}
                  </span>
                </div>
              ) : (
                <div className="hidden items-center gap-1.5 rounded-2xl bg-[var(--mist)] px-3 py-1 text-[11px] font-bold text-[var(--ink-soft)] sm:flex">
                  <ShoppingBag className="size-3.5 text-[#007AFF]" />
                  <span>
                    Drag any icon card straight onto the apartment grid or tap Buy
                  </span>
                </div>
              )}

              <button
                onClick={() =>
                  setTrayMode(trayMode === 'expanded' ? 'dock' : 'expanded')
                }
                className="apple-pill btn-press flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-[var(--ink)]"
                title={
                  trayMode === 'expanded'
                    ? 'Switch to Split Room + Dock View'
                    : 'Expand Full Catalog Grid'
                }
              >
                {trayMode === 'expanded' ? (
                  <>
                    <Minimize2 className="size-3.5 text-[#007AFF]" />
                    <span>Split View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="size-3.5 text-[#007AFF]" />
                    <span>Expand</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ICON-FIRST SHOPPING GRID (Hero 3D Isometric Pedestal + Giant Levitating Icon Cards) */}
          {trayMode !== 'minimized' && (
            <div className="flex-1 overflow-y-auto pr-1 pt-1">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {items.map((item) => {
                  const ownedCount = objects.filter(
                    (o) => o.objectId === item.id
                  ).length;
                  const storedCount = storedFurnitureById[item.id] || 0;
                  const hasStored = storedCount > 0;
                  const canAfford = hasStored || cash >= item.price;
                  const topPick = isBestUpgrade(item);
                  const statChips = getFurnitureStatChips(item);
                  const isStampingThis = pendingPlaceId === item.id;
                  const isDraggingThis = catalogDrag?.furnitureId === item.id;

                  const handleSelectStamp = () => {
                    if (!canAfford) return;
                    const nextStamp = isStampingThis ? null : item.id;
                    setPendingPlaceId(nextStamp);
                    if (nextStamp && trayMode === 'expanded') {
                      setTrayMode('dock');
                    }
                  };

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredCatalogId(item.id)}
                      onMouseLeave={() =>
                        setHoveredCatalogId(
                          hoveredCatalogId === item.id ? null : hoveredCatalogId
                        )
                      }
                      onPointerDown={(e) => {
                        if (!canAfford) return;
                        // Ignore clicks on buttons inside the card footer
                        if ((e.target as HTMLElement).closest('button')) return;
                        dragCandidateRef.current = {
                          itemId: item.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          started: false,
                        };
                      }}
                      className={`group relative flex flex-col justify-between rounded-3xl border p-2.5 transition-all select-none ${
                        canAfford ? 'cursor-grab active:cursor-grabbing' : 'opacity-65'
                      } ${
                        isStampingThis || isDraggingThis
                          ? 'border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-400/40'
                          : hasStored
                          ? 'border-indigo-500/40 bg-indigo-500/5 hover:border-indigo-500 hover:shadow-lg dark:bg-indigo-950/20'
                          : topPick
                          ? 'border-amber-500/40 bg-white/65 hover:border-amber-500/80 hover:shadow-lg dark:bg-slate-900/65'
                          : 'border-white/40 bg-white/55 hover:border-[#007AFF]/50 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/55'
                      }`}
                    >
                      {/* HERO ICON STAGE (Takes center stage with 3D isometric pedestal & giant emoji) */}
                      <div
                        onClick={handleSelectStamp}
                        title={
                          hasStored
                            ? `Drag ${item.name} onto room floor or click to unpack from Backpack (Free)`
                            : canAfford
                            ? `Drag ${item.name} onto the room floor, or click to pick up & place on any tile`
                            : `Need ${formatCurrency(item.price)}`
                        }
                        className="relative flex h-28 w-full flex-col items-center justify-center overflow-hidden rounded-2xl transition-colors cursor-pointer"
                        style={{
                          background: `radial-gradient(circle at 50% 58%, ${item.accentColor}44 0%, ${item.color}1F 68%, transparent 100%)`,
                        }}
                      >
                        {/* Top-Left Quality / Best Pill */}
                        <div className="absolute top-1.5 left-2 flex items-center gap-1">
                          <span className="rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-extrabold tracking-tight text-amber-300 backdrop-blur-xs">
                            {'★'.repeat(item.quality)}
                          </span>
                          {topPick && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-extrabold text-white shadow-2xs">
                              <Flame className="size-2.5 fill-current" />
                              HOT
                            </span>
                          )}
                        </div>

                        {/* Top-Right Owned / Stored / Drag Hint Badge */}
                        <div className="absolute top-1.5 right-2 flex flex-col items-end gap-1">
                          {hasStored ? (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-2xs">
                              🎒 ×{storedCount} Pack
                            </span>
                          ) : ownedCount > 0 ? (
                            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-2xs">
                              ×{ownedCount}
                            </span>
                          ) : canAfford ? (
                            <span className="rounded-full bg-white/75 px-1.5 py-0.5 text-[8px] font-extrabold text-slate-700 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-800/85 dark:text-slate-200">
                              🖐️ Drag
                            </span>
                          ) : null}
                        </div>

                        {/* 3D Isometric Pedestal SVG under the Hero Icon */}
                        <svg
                          viewBox="-40 -16 80 36"
                          className="pointer-events-none absolute bottom-3 h-9 w-24 opacity-90 transition-transform duration-200 group-hover:scale-105"
                        >
                          <ellipse
                            cx="0"
                            cy="9"
                            rx="30"
                            ry="10"
                            fill="rgba(15,23,42,0.18)"
                          />
                          <polygon
                            points="0,-10 28,2 0,14 -28,2"
                            fill={item.accentColor}
                            stroke="rgba(255,255,255,0.45)"
                            strokeWidth="1"
                          />
                          <polygon
                            points="-28,2 0,14 0,20 -28,8"
                            fill={item.color}
                          />
                          <polygon
                            points="28,2 0,14 0,20 28,8"
                            fill={item.color}
                            opacity="0.8"
                          />
                        </svg>

                        {/* GIANT HERO ICON */}
                        <span className="relative z-10 -mt-2 text-5xl leading-none drop-shadow-md transition-transform duration-200 group-hover:-translate-y-1.5 group-hover:scale-115">
                          {item.emoji}
                        </span>

                        {/* Compact Stat Pills overlaid along bottom of Icon Stage */}
                        <div className="absolute right-1.5 bottom-1 left-1.5 flex items-center justify-center gap-1">
                          {statChips.map((chip) => (
                            <span
                              key={chip.label}
                              className={`truncate rounded-full px-2 py-0.5 text-[9px] font-extrabold backdrop-blur-xs ${CHIP_TONE_CLASSES[chip.tone]}`}
                            >
                              {chip.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* CONCISE TITLE + BUY / STAMP FOOTER */}
                      <div className="mt-2">
                        <div
                          className="truncate text-center text-xs font-extrabold text-[var(--ink)]"
                          title={item.name}
                        >
                          {item.name}
                        </div>

                        <div className="mt-1.5 flex items-center gap-1">
                          {hasStored ? (
                            <button
                              onClick={() => buyAndPlaceFurniture(item.id)}
                              className="btn-press flex flex-1 items-center justify-center gap-1 rounded-xl bg-indigo-600 px-2 py-1.5 text-[11px] font-extrabold text-white shadow-xs hover:bg-indigo-500"
                              title="Unpack from Backpack and place in room (Free)"
                            >
                              <Home className="size-3 shrink-0" />
                              <span>🎒 Place Free</span>
                            </button>
                          ) : (
                            <button
                              disabled={!canAfford}
                              onClick={() => buyAndPlaceFurniture(item.id)}
                              className={`btn-press flex flex-1 items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold transition-all ${
                                canAfford
                                  ? 'bg-[#007AFF] text-white shadow-xs hover:bg-[#0066CC]'
                                  : 'cursor-not-allowed bg-[var(--mist)] text-[var(--ink-soft)]'
                              }`}
                            >
                              <Sparkles className="size-3 shrink-0" />
                              <span>{formatCurrency(item.price)}</span>
                            </button>
                          )}

                          {canAfford && (
                            <button
                              onClick={handleSelectStamp}
                              title="Pick up & click any floor tile to place"
                              className={`btn-press grid size-7 shrink-0 place-items-center rounded-xl text-xs font-extrabold transition-all ${
                                isStampingThis
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : hasStored
                                  ? 'bg-indigo-500/15 text-indigo-700 hover:bg-indigo-500/25 dark:text-indigo-300'
                                  : 'bg-[var(--mist)] text-[var(--ink)] hover:bg-[#007AFF]/15'
                              }`}
                            >
                              📌
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING DRAG GHOST BADGE UNDER CURSOR WHEN DRAGGING FROM CATALOG */}
      {catalogDrag && activeDraggingDef && (
        <div
          className={`pointer-events-none fixed z-50 -translate-x-1/2 transition-transform duration-75 ${
            catalogDrag.targetTile ? '-translate-y-[115%]' : '-translate-y-1/2'
          }`}
          style={{
            left: catalogDrag.clientX,
            top: catalogDrag.clientY,
          }}
        >
          <div className="flex flex-col items-center">
            <div className="grid size-14 place-items-center rounded-3xl border-2 border-emerald-400 bg-slate-900/90 text-4xl shadow-2xl">
              {activeDraggingDef.emoji}
            </div>
            <span className="mt-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-md">
              {catalogDrag.targetTile
                ? `Drop at (${catalogDrag.targetTile.x}, ${catalogDrag.targetTile.y}) · ${
                    storedFurnitureById[activeDraggingDef.id] > 0
                      ? '🎒 Free from Pack'
                      : formatCurrency(activeDraggingDef.price)
                  }`
                : 'Drag onto apartment floor'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
