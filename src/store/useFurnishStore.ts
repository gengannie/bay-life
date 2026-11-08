import { create } from 'zustand';
import { FURNITURE_BY_ID, GOALS, HOMES } from '../data/worldData';
import { PlacedObject } from '../types/game';
import { sfx } from '../utils/sound';
import { formatCurrency, useGameStore } from './useGameStore';

export const ISO_TILE_W = 68;
export const ISO_TILE_H = 35;
export const ISO_ORIGIN_X = 450;
export const ISO_ORIGIN_Y = 175;
export const ISO_VIEWBOX_W = 900;
export const ISO_VIEWBOX_H = 580;

const uid = () => Math.random().toString(36).substring(2, 9);

/**
 * Converts a client (mouse/pointer) coordinate into exact SVG viewBox (900x580) space
 * using the post-transform bounding box of #isometric-room-svg and xMidYMid meet scaling.
 * This avoids WebKit/Safari getScreenCTM() bugs when CSS transforms are applied on <svg>.
 */
export function getSvgPointFromClientPoint(
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  if (typeof document === 'undefined') return null;
  const svgEl = document.getElementById('isometric-room-svg') as SVGSVGElement | null;
  if (!svgEl) return null;
  const rect = svgEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const scale = Math.min(rect.width / ISO_VIEWBOX_W, rect.height / ISO_VIEWBOX_H);
  const renderedW = ISO_VIEWBOX_W * scale;
  const renderedH = ISO_VIEWBOX_H * scale;
  const offsetX = rect.left + (rect.width - renderedW) / 2;
  const offsetY = rect.top + (rect.height - renderedH) / 2;

  return {
    x: (clientX - offsetX) / scale,
    y: (clientY - offsetY) / scale,
  };
}

/**
 * Converts an SVG viewBox (x, y) coordinate into an isometric floor tile (x, y).
 */
export function getIsoTileFromSvgPoint(
  svgX: number,
  svgY: number,
  gridSize: number,
  clampToGrid = false,
  tolerance = 0
): { x: number; y: number } | null {
  const dx = (svgX - ISO_ORIGIN_X) / (ISO_TILE_W / 2);
  const dy = (svgY - ISO_ORIGIN_Y) / (ISO_TILE_H / 2);
  const floatX = (dx + dy) / 2;
  const floatY = (dy - dx) / 2;
  const rawX = Math.floor(floatX);
  const rawY = Math.floor(floatY);

  if (clampToGrid) {
    return {
      x: Math.max(0, Math.min(gridSize - 1, rawX)),
      y: Math.max(0, Math.min(gridSize - 1, rawY)),
    };
  }

  if (
    floatX < -tolerance ||
    floatX >= gridSize + tolerance ||
    floatY < -tolerance ||
    floatY >= gridSize + tolerance
  ) {
    return null;
  }
  return {
    x: Math.max(0, Math.min(gridSize - 1, rawX)),
    y: Math.max(0, Math.min(gridSize - 1, rawY)),
  };
}

/**
 * Converts a client (mouse/pointer) coordinate into an isometric floor tile (x, y).
 */
export function getIsoTileFromClientPoint(
  clientX: number,
  clientY: number,
  gridSize: number,
  clampToGrid = false,
  tolerance = 0
): { x: number; y: number } | null {
  const svgPt = getSvgPointFromClientPoint(clientX, clientY);
  if (!svgPt) return null;
  return getIsoTileFromSvgPoint(svgPt.x, svgPt.y, gridSize, clampToGrid, tolerance);
}

export interface RoomSynergy {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  unlocked: boolean;
}

export interface RoomVibeReport {
  score: number;
  rankLabel: string;
  synergies: RoomSynergy[];
}

export function computeRoomVibe(objects: PlacedObject[], homeId: string): RoomVibeReport {
  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const defs = objects
    .map((o) => FURNITURE_BY_ID[o.objectId])
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const qualitySum = defs.reduce((acc, d) => acc + d.quality * 45, 0);
  const uniqueCategories = new Set(defs.map((d) => d.category)).size;
  const diversityBonus = uniqueCategories * 35;

  const hasCompute = defs.some((d) => d.category === 'compute');
  const hasHighCompute = defs.some((d) => d.category === 'compute' && d.quality >= 3);
  const hasCoffeeOrKitchen = defs.some((d) => d.category === 'kitchen' && d.quality >= 3);
  const hasSleepPlus = defs.some((d) => d.category === 'sleep' && d.quality >= 3);
  const hasRecovery = defs.some(
    (d) => (d.category === 'bath' && d.quality >= 3) || d.category === 'fitness'
  );
  const hasPowerBackup =
    Boolean(homeDef.bonuses?.builtInPowerBackup) || defs.some((d) => d.powerBackup);
  const hasLounge = defs.some((d) => d.category === 'comfort');
  const hasDecor = defs.some((d) => d.category === 'decor');

  const synergies: RoomSynergy[] = [
    {
      id: 'flow_cafe',
      emoji: '☕',
      label: 'Home Barista Flow',
      desc: 'Compute Rig + Tier 3+ Espresso/Kitchen',
      unlocked: hasCompute && hasCoffeeOrKitchen,
    },
    {
      id: 'biohacker',
      emoji: '🧬',
      label: 'Biohacker Sanctuary',
      desc: 'Tier 3+ Sleep Tech + Sauna/Plunge or Home Gym',
      unlocked: hasSleepPlus && hasRecovery,
    },
    {
      id: 'grid_immune',
      emoji: '🔋',
      label: 'PG&E Blackout Proof',
      desc: 'Backup Battery / Powerwall + Compute Desk',
      unlocked: hasCompute && hasPowerBackup,
    },
    {
      id: 'founder_salon',
      emoji: '🦄',
      label: 'Founder War Room',
      desc: 'Pro Compute + Lounge Seating + Aesthetic Decor',
      unlocked: hasHighCompute && hasLounge && hasDecor,
    },
  ];

  const synergyBonus = synergies.filter((s) => s.unlocked).length * 90;
  const score = homeDef.tier * 100 + qualitySum + diversityBonus + synergyBonus;

  const rankLabel =
    score >= 1100
      ? 'Architectural AD100 Icon'
      : score >= 820
      ? '10x Founder Sanctuary'
      : score >= 580
      ? 'Dialed-In Creator Studio'
      : 'Scrappy Hacker Pad';

  return { score, rankLabel, synergies };
}

export interface CatalogDragState {
  furnitureId: string;
  clientX: number;
  clientY: number;
  targetTile: { x: number; y: number } | null;
}

export interface FurnishSparkle {
  id: number;
  tileX: number;
  tileY: number;
  emoji: string;
  text: string;
}

interface FurnishStoreState {
  catalogDrag: CatalogDragState | null;
  selectedFurnishUid: string | null;
  pendingPlaceId: string | null;
  trayMode: 'dock' | 'expanded' | 'minimized';
  hoveredCatalogId: string | null;
  furnishSparkle: FurnishSparkle | null;

  setCatalogDrag: (drag: CatalogDragState | null) => void;
  setSelectedFurnishUid: (uid: string | null) => void;
  setPendingPlaceId: (id: string | null) => void;
  setTrayMode: (mode: 'dock' | 'expanded' | 'minimized') => void;
  setHoveredCatalogId: (id: string | null) => void;
  triggerTileSparkle: (tileX: number, tileY: number, emoji: string, text: string) => void;

  buyAndPlaceFurniture: (
    furnitureId: string,
    targetTile?: { x: number; y: number }
  ) => PlacedObject | null;
  movePlacedFurniture: (
    placedUid: string,
    toX: number,
    toY: number
  ) => { moved: boolean; swappedWithName?: string };
  rotatePlacedFurniture: (placedUid: string) => void;
  autoArrangeRoom: () => void;
}

function findNearestOpenTile(
  objects: PlacedObject[],
  gridSize: number,
  prefX: number,
  prefY: number
): { x: number; y: number } {
  const isOccupied = (x: number, y: number) => objects.some((o) => o.x === x && o.y === y);
  const clampedX = Math.max(0, Math.min(gridSize - 1, prefX));
  const clampedY = Math.max(0, Math.min(gridSize - 1, prefY));

  if (!isOccupied(clampedX, clampedY)) {
    return { x: clampedX, y: clampedY };
  }

  let bestTile = { x: clampedX, y: clampedY };
  let bestDist = Infinity;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (!isOccupied(x, y)) {
        const dist = Math.hypot(x - clampedX, y - clampedY);
        if (dist < bestDist) {
          bestDist = dist;
          bestTile = { x, y };
        }
      }
    }
  }
  return bestTile;
}

export const useFurnishStore = create<FurnishStoreState>((set, get) => ({
  catalogDrag: null,
  selectedFurnishUid: null,
  pendingPlaceId: null,
  trayMode: 'dock',
  hoveredCatalogId: null,
  furnishSparkle: null,

  setCatalogDrag: (catalogDrag) => set({ catalogDrag }),
  setSelectedFurnishUid: (selectedFurnishUid) => set({ selectedFurnishUid }),
  setPendingPlaceId: (pendingPlaceId) => set({ pendingPlaceId }),
  setTrayMode: (trayMode) => set({ trayMode }),
  setHoveredCatalogId: (hoveredCatalogId) => set({ hoveredCatalogId }),

  triggerTileSparkle: (tileX, tileY, emoji, text) => {
    const id = Date.now() + Math.random();
    set({ furnishSparkle: { id, tileX, tileY, emoji, text } });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (get().furnishSparkle?.id === id) {
          set({ furnishSparkle: null });
        }
      }, 2100);
    }
  },

  buyAndPlaceFurniture: (furnitureId, targetTile) => {
    const s = useGameStore.getState();
    const def = FURNITURE_BY_ID[furnitureId];
    if (!def) return null;

    if (s.cash < def.price) {
      sfx.play('error');
      const notice = {
        id: uid(),
        text: `Need ${formatCurrency(def.price)} to buy ${def.name}.`,
        emoji: '🛋️',
        tone: 'bad' as const,
        time: s.time,
      };
      useGameStore.setState({
        notices: [notice, ...s.notices.slice(0, 29)],
        lastToast: notice,
      });
      return null;
    }

    const homeDef = HOMES.find((h) => h.id === s.homeId) || HOMES[1];
    const gridSize = homeDef.gridSize;

    const chosenTile = targetTile
      ? findNearestOpenTile(s.objects, gridSize, targetTile.x, targetTile.y)
      : findNearestOpenTile(
          s.objects,
          gridSize,
          Math.floor(gridSize / 2),
          Math.floor(gridSize / 2)
        );

    let goalIndex = s.goalIndex;
    let karma = s.karma;
    let bonusCash = 0;
    if (goalIndex === 4) {
      goalIndex = 5;
      bonusCash = GOALS[4].rewardCash;
      karma += GOALS[4].rewardKarma;
    }

    const newPlaced: PlacedObject = {
      uid: uid(),
      objectId: def.id,
      x: chosenTile.x,
      y: chosenTile.y,
      rot: 0,
    };

    sfx.play('cash');
    const notice = {
      id: uid(),
      text: `Installed ${def.emoji} ${def.name} at tile (${chosenTile.x}, ${chosenTile.y})!`,
      emoji: def.emoji,
      tone: 'good' as const,
      time: s.time,
    };

    useGameStore.setState({
      cash: s.cash - def.price + bonusCash,
      karma,
      goalIndex,
      objects: [...s.objects, newPlaced],
      notices: [notice, ...s.notices.slice(0, 29)],
      lastToast: notice,
    });

    set({
      selectedFurnishUid: newPlaced.uid,
      pendingPlaceId: null,
    });
    get().triggerTileSparkle(
      chosenTile.x,
      chosenTile.y,
      def.emoji,
      `Installed ${def.name.split(' ')[0]}!`
    );

    return newPlaced;
  },

  movePlacedFurniture: (placedUid, toX, toY) => {
    const s = useGameStore.getState();
    const homeDef = HOMES.find((h) => h.id === s.homeId) || HOMES[1];
    const gridSize = homeDef.gridSize;
    const clampedX = Math.max(0, Math.min(gridSize - 1, toX));
    const clampedY = Math.max(0, Math.min(gridSize - 1, toY));

    const targetObj = s.objects.find((o) => o.uid === placedUid);
    if (!targetObj) return { moved: false };
    if (targetObj.x === clampedX && targetObj.y === clampedY) {
      return { moved: false };
    }

    const origX = targetObj.x;
    const origY = targetObj.y;
    const occupyingObj = s.objects.find(
      (o) => o.uid !== placedUid && o.x === clampedX && o.y === clampedY
    );

    const nextObjects = s.objects.map((o) => {
      if (o.uid === placedUid) {
        return { ...o, x: clampedX, y: clampedY };
      }
      if (occupyingObj && o.uid === occupyingObj.uid) {
        return { ...o, x: origX, y: origY };
      }
      return o;
    });

    // Update any queued action targeting the moved object(s)
    const nextQueue = s.queue.map((q) => {
      if (q.targetObjectUid === placedUid) {
        return { ...q, targetPos: { x: clampedX, y: clampedY } };
      }
      if (occupyingObj && q.targetObjectUid === occupyingObj.uid) {
        return { ...q, targetPos: { x: origX, y: origY } };
      }
      return q;
    });

    sfx.play('tap');
    useGameStore.setState({
      objects: nextObjects,
      queue: nextQueue,
    });

    const movedDef = FURNITURE_BY_ID[targetObj.objectId];
    const swappedDef = occupyingObj ? FURNITURE_BY_ID[occupyingObj.objectId] : null;

    set({ selectedFurnishUid: placedUid });
    if (swappedDef) {
      get().triggerTileSparkle(
        clampedX,
        clampedY,
        '🔄',
        `Swapped with ${swappedDef.name.split(' ')[0]}!`
      );
      return { moved: true, swappedWithName: swappedDef.name };
    } else {
      get().triggerTileSparkle(
        clampedX,
        clampedY,
        movedDef?.emoji || '✨',
        `Placed at (${clampedX}, ${clampedY})`
      );
      return { moved: true };
    }
  },

  rotatePlacedFurniture: (placedUid) => {
    const s = useGameStore.getState();
    const targetObj = s.objects.find((o) => o.uid === placedUid);
    if (!targetObj) return;

    const nextRot = ((targetObj.rot || 0) + 1) % 4;
    const nextObjects = s.objects.map((o) =>
      o.uid === placedUid ? { ...o, rot: nextRot } : o
    );

    sfx.play('tap');
    useGameStore.setState({ objects: nextObjects });

    const dirs = ['South-East', 'South-West', 'North-West', 'North-East'];
    get().triggerTileSparkle(
      targetObj.x,
      targetObj.y,
      '🔄',
      `Rotated · ${dirs[nextRot]}`
    );
  },

  autoArrangeRoom: () => {
    const s = useGameStore.getState();
    const homeDef = HOMES.find((h) => h.id === s.homeId) || HOMES[1];
    const g = homeDef.gridSize;
    const max = g - 1;

    // Curated interior zones by category around perimeter + center lounge
    const categoryPreferredSpots: Record<string, Array<{ x: number; y: number }>> = {
      sleep: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ],
      compute: [
        { x: max - 1, y: 1 },
        { x: max - 2, y: 1 },
        { x: max - 1, y: 2 },
      ],
      power: [
        { x: 0, y: Math.max(2, max - 2) },
        { x: 0, y: Math.max(1, max - 3) },
        { x: max, y: 2 },
      ],
      decor: [
        { x: Math.floor(g / 2), y: 0 },
        { x: 0, y: 2 },
        { x: 0, y: 1 },
        { x: max, y: 0 },
      ],
      comfort: [
        { x: Math.floor(g / 2), y: Math.floor(g / 2) },
        { x: Math.floor(g / 2) - 1, y: Math.floor(g / 2) },
        { x: Math.floor(g / 2), y: Math.floor(g / 2) + 1 },
      ],
      fitness: [
        { x: max - 1, y: Math.floor(g / 2) },
        { x: max, y: Math.floor(g / 2) },
        { x: max - 2, y: Math.floor(g / 2) },
      ],
      kitchen: [
        { x: 1, y: max - 1 },
        { x: 2, y: max - 1 },
        { x: 1, y: max - 2 },
      ],
      bath: [
        { x: max - 1, y: max - 1 },
        { x: max, y: max - 1 },
        { x: max - 2, y: max - 1 },
      ],
    };

    const used = new Set<string>();
    const arranged: PlacedObject[] = [];

    for (const obj of s.objects) {
      const def = FURNITURE_BY_ID[obj.objectId];
      const cat = def?.category || 'decor';
      const prefs = categoryPreferredSpots[cat] || [];
      let chosen = prefs.find(
        (p) => p.x >= 0 && p.x < g && p.y >= 0 && p.y < g && !used.has(`${p.x},${p.y}`)
      );
      if (!chosen) {
        outer: for (let y = 0; y < g; y++) {
          for (let x = 0; x < g; x++) {
            if (!used.has(`${x},${y}`)) {
              chosen = { x, y };
              break outer;
            }
          }
        }
      }
      const finalTile = chosen || { x: obj.x, y: obj.y };
      used.add(`${finalTile.x},${finalTile.y}`);
      arranged.push({ ...obj, x: finalTile.x, y: finalTile.y });
    }

    sfx.play('levelup');
    const notice = {
      id: uid(),
      text: `✨ Auto-Feng Shui complete! Arranged ${arranged.length} items into optimal flow zones.`,
      emoji: '✨',
      tone: 'good' as const,
      time: s.time,
    };

    useGameStore.setState({
      objects: arranged,
      notices: [notice, ...s.notices.slice(0, 29)],
      lastToast: notice,
    });

    get().triggerTileSparkle(
      Math.floor(g / 2),
      Math.floor(g / 2),
      '✨',
      'Feng Shui Optimized!'
    );
  },
}));
