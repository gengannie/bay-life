import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACTIONS,
  FURNITURE_BY_ID,
  HOMES,
  LOCATION_BY_ID,
  NPCS,
} from '../data/worldData';
import {
  getRelationshipTierInfo,
  NPC_INTERACTIONS,
  getNpcMilestones,
  getAvailableTopicsForNpc,
} from '../data/relationshipData';
import {
  calculateOverallMood,
  formatCurrency,
  getHomeDeskCoord,
  getHourOfDay,
  getInstalledHomeComputer,
  hasHomeBackupPower,
  isHomePowered,
  useGameStore,
} from '../store/useGameStore';
import { ActionDef, FurnitureDef, NeedKey, NPCDef, PlacedObject, VenueStation } from '../types/game';
import { Portrait } from './Portrait';
import {
  ArrowUpCircle,
  Compass,
  Home,
  Map,
  Minus,
  Monitor,
  Move,
  Plus,
  RotateCw,
  ShoppingBag,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { getIsoTileFromClientPoint, useFurnishStore } from '../store/useFurnishStore';

// Convert grid (x, y) to isometric SVG coordinates
const TILE_W = 68;
const TILE_H = 35;
const ORIGIN_X = 450;
const ORIGIN_Y = 175;

function isoToScreen(x: number, y: number) {
  const sx = ORIGIN_X + (x - y) * (TILE_W / 2);
  const sy = ORIGIN_Y + (x + y) * (TILE_H / 2);
  return { sx, sy };
}

export function clampPopoverX(x: number, viewportW: number, popoverW = 384): number {
  const half = popoverW / 2;
  const margin = 12;
  return Math.max(half + margin, Math.min(viewportW - half - margin, x));
}

export function clampPopoverY(y: number, viewportH: number, popoverH = 320): number {
  const margin = 72;
  return Math.max(margin, Math.min(viewportH - popoverH - 96, y));
}

const SHORT_FURNITURE_LABELS: Record<string, string> = {
  twin_mattress: 'Floor Mattress',
  casper_queen: 'Queen Bed',
  eightsleep_pod: 'Eight Sleep Pod',
  folding_desk: 'MacBook Desk',
  standing_desk: 'Standing Desk',
  mac_studio_desk: 'Mac Studio Rig',
  xdr_workstation: 'H100 Dev Rig',
  ramen_kettle: 'Ramen & Kettle',
  chemex_bar: 'Pour-Over Bar',
  linea_micra_bar: 'Espresso Bar',
  subzero_kitchen: 'Chef Kitchen',
  basic_shower: 'Corner Shower',
  rainfall_shower: 'Rainfall Shower',
  sauna_plunge: 'Sauna & Plunge',
  basic_toilet: 'Restroom',
  toto_washlet: 'Smart Washlet',
  beanbag_chair: 'Beanbag Chair',
  midcentury_sofa: 'Leather Sofa',
  vision_theatre: 'Vision Lounge',
  peloton_bike: 'Peloton Bike+',
  tonal_gym: 'Tonal AI Gym',
  ecoflow_delta: 'EcoFlow Backup',
  tesla_powerwall: 'Powerwall 3',
  monstera_plant: 'Monstera Plant',
  yc_neon_sign: 'YC Neon Sign',
};

function getShortFurnitureLabel(def: FurnitureDef): string {
  return SHORT_FURNITURE_LABELS[def.id] || def.name;
}

function tilePolygonPoints(x: number, y: number): string {
  const top = isoToScreen(x, y);
  const right = isoToScreen(x + 1, y);
  const bottom = isoToScreen(x + 1, y + 1);
  const left = isoToScreen(x, y + 1);
  return `${top.sx},${top.sy} ${right.sx},${right.sy} ${bottom.sx},${bottom.sy} ${left.sx},${left.sy}`;
}

const NEED_BADGE_META: Record<
  NeedKey,
  { emoji: string; shortLabel: string; alertText: string }
> = {
  energy: { emoji: '⚡', shortLabel: 'Focus', alertText: '☕ Low Focus — Tap to Fix' },
  hunger: { emoji: '🍔', shortLabel: 'Fuel', alertText: '🍔 Low Fuel — Tap to Fix' },
  hygiene: { emoji: '🫧', shortLabel: 'Bio', alertText: '🫧 Low Bio — Tap to Fix' },
  bladder: { emoji: '🚻', shortLabel: 'Relief', alertText: '🚻 Bio Break — Tap to Fix' },
  fun: { emoji: '🎮', shortLabel: 'Peace', alertText: '🎮 Low Peace — Tap to Fix' },
  social: { emoji: '💬', shortLabel: 'Vibe', alertText: '💬 Low Vibe — Tap to Fix' },
};

function getFurnitureTier(quality: number): { tier: 1 | 2 | 3; label: string; badgeClass: string } {
  if (quality >= 5) {
    return {
      tier: 3,
      label: 'Tier 3 · Pro',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
    };
  }
  if (quality >= 3) {
    return {
      tier: 2,
      label: 'Tier 2 · Plus',
      badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
    };
  }
  return {
    tier: 1,
    label: 'Tier 1 · Base',
    badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30',
  };
}

function getNextUpgradeFurniture(def: FurnitureDef): FurnitureDef | null {
  const explicitUpgradeId = (def as FurnitureDef & { upgradesTo?: string }).upgradesTo;
  if (explicitUpgradeId && FURNITURE_BY_ID[explicitUpgradeId]) {
    return FURNITURE_BY_ID[explicitUpgradeId];
  }
  const candidates = Object.values(FURNITURE_BY_ID)
    .filter((item) => item.category === def.category && item.price > def.price)
    .sort((a, b) => a.price - b.price);
  return candidates[0] || null;
}

function getActivityParticles(act: ActionDef | null): string[] {
  if (!act) return [];
  const key = `${act.id} ${act.label}`.toLowerCase();
  if (
    key.includes('sleep') ||
    key.includes('nap') ||
    key.includes('rest') ||
    key.includes('pod')
  ) {
    return ['💤', '🌙', '💤'];
  }
  if (
    key.includes('plunge') ||
    key.includes('cold') ||
    key.includes('ice') ||
    key.includes('shower') ||
    key.includes('sauna')
  ) {
    return ['❄️', '🫧', '❄️'];
  }
  if (
    key.includes('coffee') ||
    key.includes('espresso') ||
    key.includes('matcha') ||
    key.includes('philz') ||
    key.includes('cortado') ||
    key.includes('tea')
  ) {
    return ['☕', '♨️', '⚡'];
  }
  if (
    key.includes('code') ||
    key.includes('leetcode') ||
    key.includes('ai') ||
    key.includes('mvp') ||
    key.includes('hack') ||
    key.includes('ship') ||
    act.category === 'work' ||
    act.category === 'skill'
  ) {
    return ['{ }', '⚡', '</>'];
  }
  if (act.category === 'hustle' || act.earn) {
    return ['💸', '💵', '📈'];
  }
  if (
    key.includes('eat') ||
    key.includes('cook') ||
    key.includes('meal') ||
    key.includes('ramen') ||
    key.includes('burrito')
  ) {
    return ['🍔', '♨️', '✨'];
  }
  return [act.emoji, '✨', '⚡'];
}

export const IsometricScene: React.FC = () => {
  const locationId = useGameStore((s) => s.locationId);
  const view = useGameStore((s) => s.view);
  const homeId = useGameStore((s) => s.homeId);
  const objects = useGameStore((s) => s.objects);
  const pos = useGameStore((s) => s.pos);
  const targetPos = useGameStore((s) => s.targetPos);
  const queue = useGameStore((s) => s.queue);
  const sim = useGameStore((s) => s.sim);
  const needs = useGameStore((s) => s.needs);
  const cash = useGameStore((s) => s.cash);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const pantryMeals = useGameStore((s) => s.pantryMeals);
  const time = useGameStore((s) => s.time);
  const workShift = useGameStore((s) => s.workShift);
  const weather = useGameStore((s) => s.weather);
  const pgePowerOn = useGameStore((s) => s.pgePowerOn);
  const relationships = useGameStore((s) => s.relationships);
  const moveToTile = useGameStore((s) => s.moveToTile);
  const enqueueAction = useGameStore((s) => s.enqueueAction);
  const buyFurniture = useGameStore((s) => s.buyFurniture);
  const sellFurniture = useGameStore((s) => s.sellFurniture);
  const storeFurnitureInBackpack = useGameStore((s) => s.storeFurnitureInBackpack);
  const interactWithNpc = useGameStore((s) => s.interactWithNpc);
  const claimRelationshipMilestone = useGameStore((s) => s.claimRelationshipMilestone);
  const inviteNpcHangout = useGameStore((s) => s.inviteNpcHangout);
  const autoFixNeed = useGameStore((s) => s.autoFixNeed);
  const triggerMicroReward = useGameStore((s) => s.triggerMicroReward);
  const setView = useGameStore((s) => s.setView);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const openBluefinMap = useGameStore((s) => s.openBluefinMap);
  const travelTo = useGameStore((s) => s.travelTo);

  // Furnishing Mode Store State
  const catalogDrag = useFurnishStore((s) => s.catalogDrag);
  const selectedFurnishUid = useFurnishStore((s) => s.selectedFurnishUid);
  const pendingPlaceId = useFurnishStore((s) => s.pendingPlaceId);
  const trayMode = useFurnishStore((s) => s.trayMode);
  const furnishSparkle = useFurnishStore((s) => s.furnishSparkle);
  const setSelectedFurnishUid = useFurnishStore((s) => s.setSelectedFurnishUid);
  const setPendingPlaceId = useFurnishStore((s) => s.setPendingPlaceId);
  const buyAndPlaceFurniture = useFurnishStore((s) => s.buyAndPlaceFurniture);
  const movePlacedFurniture = useFurnishStore((s) => s.movePlacedFurniture);
  const rotatePlacedFurniture = useFurnishStore((s) => s.rotatePlacedFurniture);

  const [selectedObject, setSelectedObject] = useState<PlacedObject | null>(null);
  const [selectedStation, setSelectedStation] = useState<VenueStation | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<NPCDef | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [hoveredObjectUid, setHoveredObjectUid] = useState<string | null>(null);
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [hoveredNpcId, setHoveredNpcId] = useState<string | null>(null);
  const [simHovered, setSimHovered] = useState<boolean>(false);
  const [pcSlotHovered, setPcSlotHovered] = useState<boolean>(false);
  const [draggingPlaced, setDraggingPlaced] = useState<{
    uid: string;
    objectId: string;
    startX: number;
    startY: number;
    origTileX: number;
    origTileY: number;
    currentTileX: number;
    currentTileY: number;
    moved: boolean;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    moved: false,
  });

  // Autonomous Matic AI Robot Vacuum State
  const [botPhase, setBotPhase] = useState<number>(0);
  const [botHovered, setBotHovered] = useState<boolean>(false);
  const [windowHovered, setWindowHovered] = useState<boolean>(false);
  const [rightWallHovered, setRightWallHovered] = useState<boolean>(false);
  const [droneAvailable, setDroneAvailable] = useState<boolean>(true);
  const [droneHovered, setDroneHovered] = useState<boolean>(false);
  const [sparkleBurst, setSparkleBurst] = useState<{
    id: number;
    x: number;
    y: number;
    emoji: string;
    label: string;
    title?: string;
    subtitle?: string;
  } | null>(null);

  const triggerSparkle = (
    x: number,
    y: number,
    emoji: string,
    label: string,
    title?: string,
    subtitle?: string
  ) => {
    const id = Date.now();
    setSparkleBurst({ id, x, y, emoji, label, title, subtitle });
    window.setTimeout(() => {
      setSparkleBurst((curr) => (curr?.id === id ? null : curr));
    }, 3200);
  };

  // Smooth autonomous Matic AI Bot patrol loop
  useEffect(() => {
    const interval = window.setInterval(() => {
      setBotPhase((p) => (p + 0.025) % (Math.PI * 2));
    }, 50);
    return () => window.clearInterval(interval);
  }, []);

  // Respawn Delivery Drone periodically after being claimed
  useEffect(() => {
    if (droneAvailable) return;
    const timer = window.setTimeout(() => {
      setDroneAvailable(true);
    }, 22000);
    return () => window.clearTimeout(timer);
  }, [droneAvailable]);

  // Clear local selection popovers when location, apartment, or loaded Sim changes
  useEffect(() => {
    setSelectedObject(null);
    setSelectedStation(null);
    setSelectedNpc(null);
    setPopoverAnchor(null);
  }, [homeId, locationId, sim.name]);

  const state = useGameStore.getState();
  const moodInfo = calculateOverallMood(state);
  const powered = isHomePowered(state);
  const backupActive = !pgePowerOn && hasHomeBackupPower(state);

  const isHome = locationId === 'home';
  const isFurnishMode = isHome && view === 'buy';
  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const venueDef = !isHome ? LOCATION_BY_ID[locationId] : null;
  const gridSize = isHome ? homeDef.gridSize : 7;
  const floorStyle = isHome ? homeDef.floorStyle : venueDef?.floorStyle || 'concrete';

  // Clear live action popovers when entering Furnish Mode
  useEffect(() => {
    if (isFurnishMode) {
      setSelectedObject(null);
      setSelectedStation(null);
      setSelectedNpc(null);
    } else {
      setPendingPlaceId(null);
    }
  }, [isFurnishMode, setPendingPlaceId]);

  // Global pointer tracking when dragging a placed furniture object across the isometric grid
  useEffect(() => {
    if (!draggingPlaced) return;

    const onPointerMove = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - draggingPlaced.startX, e.clientY - draggingPlaced.startY);
      const threshold = isFurnishMode ? 4 : 9;
      if (!draggingPlaced.moved && dist < threshold) return;

      const tile = getIsoTileFromClientPoint(e.clientX, e.clientY, gridSize, true);
      if (tile) {
        setDraggingPlaced((prev) =>
          prev
            ? {
              ...prev,
              moved: true,
              currentTileX: tile.x,
              currentTileY: tile.y,
            }
            : null
        );
      }
    };

    const onPointerUp = () => {
      if (draggingPlaced.moved) {
        if (
          draggingPlaced.currentTileX !== draggingPlaced.origTileX ||
          draggingPlaced.currentTileY !== draggingPlaced.origTileY
        ) {
          movePlacedFurniture(
            draggingPlaced.uid,
            draggingPlaced.currentTileX,
            draggingPlaced.currentTileY
          );
        } else {
          setSelectedFurnishUid(draggingPlaced.uid);
        }
      } else {
        // Quick tap without dragging
        const found = useGameStore
          .getState()
          .objects.find((o) => o.uid === draggingPlaced.uid);
        if (isFurnishMode) {
          setSelectedFurnishUid(
            selectedFurnishUid === draggingPlaced.uid ? null : draggingPlaced.uid
          );
        } else if (found) {
          setPopoverAnchor({ x: draggingPlaced.startX, y: draggingPlaced.startY });
          setSelectedObject(found);
          setSelectedStation(null);
          setSelectedNpc(null);
        }
      }
      setDraggingPlaced(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [
    draggingPlaced,
    gridSize,
    isFurnishMode,
    movePlacedFurniture,
    selectedFurnishUid,
    setSelectedFurnishUid,
  ]);

  // Furnish Mode Keyboard Shortcuts (R to rotate selected item, Escape to cancel/exit)
  useEffect(() => {
    if (!isFurnishMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'r' && selectedFurnishUid) {
        e.preventDefault();
        rotatePlacedFurniture(selectedFurnishUid);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (pendingPlaceId) {
          setPendingPlaceId(null);
        } else if (selectedFurnishUid) {
          setSelectedFurnishUid(null);
        } else {
          setView('live');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isFurnishMode,
    pendingPlaceId,
    rotatePlacedFurniture,
    selectedFurnishUid,
    setPendingPlaceId,
    setSelectedFurnishUid,
    setView,
  ]);

  const hour = getHourOfDay(time);
  const isNight = hour < 6 || hour >= 19.5;
  const isSunset = (hour >= 5.5 && hour < 7) || (hour >= 17.5 && hour < 19.5);

  const activeQueued = queue[0];
  const activeActionDef = activeQueued ? ACTIONS[activeQueued.actionId] : null;
  const isWalking =
    targetPos !== null && (pos.x !== targetPos.x || pos.y !== targetPos.y);
  const actionPct = activeQueued
    ? Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (activeQueued.elapsedMinutes / Math.max(1, activeQueued.totalMinutes)) * 100
        )
      )
    )
    : 0;
  const activityParticles = useMemo(
    () => getActivityParticles(activeActionDef),
    [activeActionDef]
  );

  // Detect lowest need below 35 for clickable Sim thought bubble
  const lowestAlertNeed = useMemo<{ key: NeedKey; value: number } | null>(() => {
    const entries = (Object.keys(needs) as NeedKey[]).map((k) => ({
      key: k,
      value: needs[k],
    }));
    entries.sort((a, b) => a.value - b.value);
    if (entries[0] && entries[0].value < 35) {
      return entries[0];
    }
    return null;
  }, [needs]);

  // NPCs present at this venue (none inside your private apartment)
  const npcsHere = isHome
    ? []
    : NPCS.filter(
      (n) =>
        n.favoriteSpot === locationId ||
        NPCS.indexOf(n) % 3 === Math.floor(time / 240) % 3
    );

  // Compute collision-free tile coordinates for NPCs so they never overlap objects, stations, or the Sim
  const npcPositions = useMemo(() => {
    const occupied = new Set<string>();
    occupied.add(`${pos.x},${pos.y}`);
    if (isHome) {
      objects.forEach((o) => occupied.add(`${o.x},${o.y}`));
    } else if (venueDef) {
      venueDef.stations.forEach((st) => occupied.add(`${st.x},${st.y}`));
    }

    const candidateTiles: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!occupied.has(`${x},${y}`)) {
          candidateTiles.push({ x, y });
        }
      }
    }

    return npcsHere.map((npc, idx) => {
      const preferredX = isHome ? gridSize - 1 : (idx * 2 + 1) % Math.max(2, gridSize - 1);
      const preferredY = isHome ? 2 : (idx * 2 + 2) % Math.max(2, gridSize - 1);
      if (!occupied.has(`${preferredX},${preferredY}`)) {
        occupied.add(`${preferredX},${preferredY}`);
        return { npc, x: preferredX, y: preferredY };
      }
      const fallback =
        candidateTiles.find((t) => !occupied.has(`${t.x},${t.y}`)) || {
          x: preferredX,
          y: preferredY,
        };
      occupied.add(`${fallback.x},${fallback.y}`);
      return { npc, x: fallback.x, y: fallback.y };
    });
  }, [npcsHere, isHome, objects, venueDef, gridSize, pos.x, pos.y]);

  const handleGoHome = () => {
    const mode =
      ownedCars.length > 0
        ? 'tesla'
        : cash >= 18
          ? 'waymo'
          : cash >= 6
            ? 'caltrain'
            : 'gbus';
    travelTo('home', mode);
  };

  const getFloorColors = (x: number, y: number) => {
    const alt = (x + y) % 2 === 0;
    if (isHome && homeDef.architecture) {
      return alt ? homeDef.architecture.floorPrimary : homeDef.architecture.floorSecondary;
    }
    if (floorStyle === 'wood') {
      return alt ? '#D6B18A' : '#CCA47B';
    }
    if (floorStyle === 'concrete') {
      return alt ? '#CBD5E1' : '#BEC9D6';
    }
    if (floorStyle === 'marble') {
      return alt ? '#F1F5F9' : '#E2E8F0';
    }
    if (floorStyle === 'grass') {
      return alt ? '#86EFAC' : '#6EE7B7';
    }
    if (floorStyle === 'club') {
      return alt ? '#312E81' : '#1E1B4B';
    }
    return alt ? '#DBEAFE' : '#BFDBFE';
  };

  const simScreen = isoToScreen(pos.x + 0.5, pos.y + 0.5);

  // Autonomous Matic Bot coordinates on floor
  const botRadius = Math.max(1.2, (gridSize - 2.2) / 2);
  const botCenter = (gridSize - 1) / 2;
  const botGridX = botCenter + Math.cos(botPhase) * botRadius;
  const botGridY = botCenter + Math.sin(botPhase * 2) * (botRadius * 0.65);
  const botScreen = isoToScreen(botGridX + 0.5, botGridY + 0.5);

  // Wall endpoints for isometric room box
  const backCorner = isoToScreen(0, 0);
  const leftCorner = isoToScreen(0, gridSize);
  const rightCorner = isoToScreen(gridSize, 0);
  const WALL_H = 128;

  // Camera handlers
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0012;
    setZoom((z) => Math.min(1.45, Math.max(0.75, +(z + delta).toFixed(3))));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 5) {
      dragRef.current.moved = true;
      if (!isDragging) setIsDragging(true);
      setPan({
        x: Math.max(-260, Math.min(260, dragRef.current.startPanX + dx)),
        y: Math.max(-180, Math.min(180, dragRef.current.startPanY + dy)),
      });
    }
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
    setIsDragging(false);
  };

  const resetCamera = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Selected furniture definitions & upgrade target
  const selectedFurnitureDef = selectedObject
    ? FURNITURE_BY_ID[selectedObject.objectId]
    : null;
  const upgradeTargetDef = selectedFurnitureDef
    ? getNextUpgradeFurniture(selectedFurnitureDef)
    : null;
  const resaleValue = selectedFurnitureDef
    ? Math.round(selectedFurnitureDef.price * 0.65)
    : 0;
  const upgradeNetCost = upgradeTargetDef
    ? Math.max(0, upgradeTargetDef.price - resaleValue)
    : 0;

  // Furnish Mode selected object definitions
  const selectedFurnishObj = selectedFurnishUid
    ? objects.find((o) => o.uid === selectedFurnishUid) || null
    : null;
  const selectedFurnishDef = selectedFurnishObj
    ? FURNITURE_BY_ID[selectedFurnishObj.objectId] || null
    : null;
  const furnishUpgradeTargetDef = selectedFurnishDef
    ? getNextUpgradeFurniture(selectedFurnishDef)
    : null;
  const furnishResaleValue = selectedFurnishDef
    ? Math.round(selectedFurnishDef.price * 0.65)
    : 0;
  const furnishUpgradeNetCost = furnishUpgradeTargetDef
    ? Math.max(0, furnishUpgradeTargetDef.price - furnishResaleValue)
    : 0;

  const handleUpgradeFurniture = () => {
    if (!selectedObject || !selectedFurnitureDef || !upgradeTargetDef) return;
    const oldX = selectedObject.x;
    const oldY = selectedObject.y;
    const oldUid = selectedObject.uid;

    if (cash + resaleValue < upgradeTargetDef.price) {
      buyFurniture(upgradeTargetDef.id);
      return;
    }

    sellFurniture(oldUid);
    buyFurniture(upgradeTargetDef.id);

    // Keep upgraded item right in place at the original tile coordinates
    const updatedObjects = useGameStore.getState().objects;
    const newest = updatedObjects[updatedObjects.length - 1];
    if (newest && newest.objectId === upgradeTargetDef.id) {
      const repositioned: PlacedObject = { ...newest, x: oldX, y: oldY };
      useGameStore.setState({
        objects: [
          ...updatedObjects.slice(0, updatedObjects.length - 1),
          repositioned,
        ],
      });
      setSelectedObject(repositioned);
      const pt = isoToScreen(oldX + 0.5, oldY + 0.5);
      triggerSparkle(pt.sx, pt.sy - 24, upgradeTargetDef.emoji, `Upgraded!`);
    } else {
      setSelectedObject(null);
    }
  };

  const viewportW =
    containerRef.current?.clientWidth ||
    (typeof window !== 'undefined' ? window.innerWidth : 960);
  const viewportH =
    containerRef.current?.clientHeight ||
    (typeof window !== 'undefined' ? window.innerHeight : 720);
  const clampedPopoverLeft = popoverAnchor
    ? clampPopoverX(popoverAnchor.x, viewportW, 384)
    : viewportW / 2;
  const clampedPopoverTop = popoverAnchor
    ? clampPopoverY(popoverAnchor.y - 160, viewportH, 320)
    : Math.max(84, viewportH - 400);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Ambient Background Aura */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          background:
            floorStyle === 'club'
              ? 'radial-gradient(circle at 50% 42%, rgba(168,85,247,0.32), rgba(15,23,42,0.92))'
              : isNight
                ? 'radial-gradient(circle at 50% 35%, rgba(56,189,248,0.14), rgba(15,23,42,0.58))'
                : isSunset
                  ? 'radial-gradient(circle at 50% 35%, rgba(251,146,60,0.24), transparent 70%)'
                  : isHome && homeDef.architecture
                    ? homeDef.architecture.ambientGlow
                    : 'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.45), transparent 70%)',
        }}
      />

      {/* Main Interactive Isometric SVG Canvas with Zoom & Pan */}
      <svg
        id="isometric-room-svg"
        viewBox="0 0 900 580"
        className={`h-full w-full object-contain ${isDragging || draggingPlaced?.moved ? '' : 'transition-transform duration-200 ease-out'
          }`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y +
            (isFurnishMode
              ? trayMode === 'dock'
                ? -68
                : trayMode === 'expanded'
                  ? -95
                  : -16
              : 0)
            }px) scale(${isFurnishMode && trayMode === 'dock' ? +(zoom * 0.94).toFixed(3) : zoom})`,
          transformOrigin: 'center center',
        }}
        onClick={() => {
          if (dragRef.current.moved) return;
          setSelectedObject(null);
          setSelectedStation(null);
          setSelectedNpc(null);
          if (isFurnishMode && !pendingPlaceId) {
            setSelectedFurnishUid(null);
          }
        }}
      >
        <defs>
          <linearGradient id="wallLeftGrad" x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0%"
              stopColor={
                isHome && homeDef.architecture
                  ? isNight
                    ? homeDef.architecture.wallLeftNight[0]
                    : homeDef.architecture.wallLeftGrad[0]
                  : isNight
                    ? '#1E293B'
                    : '#F8FAFC'
              }
            />
            <stop
              offset="100%"
              stopColor={
                isHome && homeDef.architecture
                  ? isNight
                    ? homeDef.architecture.wallLeftNight[1]
                    : homeDef.architecture.wallLeftGrad[1]
                  : isNight
                    ? '#0F172A'
                    : '#E2E8F0'
              }
            />
          </linearGradient>
          <linearGradient id="wallRightGrad" x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0%"
              stopColor={
                isHome && homeDef.architecture
                  ? isNight
                    ? homeDef.architecture.wallRightNight[0]
                    : homeDef.architecture.wallRightGrad[0]
                  : isNight
                    ? '#334155'
                    : '#F1F5F9'
              }
            />
            <stop
              offset="100%"
              stopColor={
                isHome && homeDef.architecture
                  ? isNight
                    ? homeDef.architecture.wallRightNight[1]
                    : homeDef.architecture.wallRightGrad[1]
                  : isNight
                    ? '#1E293B'
                    : '#CBD5E1'
              }
            />
          </linearGradient>
          <linearGradient id="bayWindowSky" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isNight ? '#090D16' : isSunset ? '#FB7185' : '#38BDF8'}
            />
            <stop
              offset="100%"
              stopColor={isNight ? '#1E1B4B' : isSunset ? '#FBBF24' : '#BAE6FD'}
            />
          </linearGradient>
          {(() => {
            const winType = isHome ? homeDef.architecture?.windowType : 'edwardian_bay';
            const pts =
              winType === 'garage_transom'
                ? `${backCorner.sx - 135},${backCorner.sy - 32} ${backCorner.sx - 42},${backCorner.sy - 79} ${backCorner.sx - 42},${backCorner.sy - 41} ${backCorner.sx - 135},${backCorner.sy + 6}`
                : winType === 'soma_curtainwall'
                  ? `${backCorner.sx - 188},${backCorner.sy - 10} ${backCorner.sx - 24},${backCorner.sy - 94} ${backCorner.sx - 24},${backCorner.sy - 6} ${backCorner.sx - 188},${backCorner.sy + 78}`
                  : winType === 'pac_heights_terrace'
                    ? `${backCorner.sx - 206},${backCorner.sy - 2} ${backCorner.sx - 24},${backCorner.sy - 95} ${backCorner.sx - 24},${backCorner.sy - 5} ${backCorner.sx - 206},${backCorner.sy + 88}`
                    : `${backCorner.sx - 150},${backCorner.sy - 16} ${backCorner.sx - 35},${backCorner.sy - 74} ${backCorner.sx - 35},${backCorner.sy - 4} ${backCorner.sx - 150},${backCorner.sy + 54}`;
            return (
              <clipPath id="bayWindowClip">
                <polygon points={pts} />
              </clipPath>
            );
          })()}
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="6"
              floodColor="#0F172A"
              floodOpacity="0.18"
            />
          </filter>
        </defs>

        {/* Room Back Walls */}
        <g filter="url(#softShadow)">
          {/* Left Back Wall */}
          <polygon
            points={`${leftCorner.sx},${leftCorner.sy} ${backCorner.sx},${backCorner.sy} ${backCorner.sx},${backCorner.sy - WALL_H} ${leftCorner.sx},${leftCorner.sy - WALL_H}`}
            fill="url(#wallLeftGrad)"
            stroke={isHome && homeDef.architecture ? homeDef.architecture.trimColor : 'rgba(148,163,184,0.35)'}
            strokeWidth={isHome && homeDef.tier >= 4 ? '2.2' : '1.5'}
          />
          {/* Right Back Wall */}
          <polygon
            points={`${backCorner.sx},${backCorner.sy} ${rightCorner.sx},${rightCorner.sy} ${rightCorner.sx},${rightCorner.sy - WALL_H} ${backCorner.sx},${backCorner.sy - WALL_H}`}
            fill="url(#wallRightGrad)"
            stroke={isHome && homeDef.architecture ? homeDef.architecture.trimColor : 'rgba(148,163,184,0.35)'}
            strokeWidth={isHome && homeDef.tier >= 4 ? '2.2' : '1.5'}
          />

          {/* Home-Specific Architectural Wall Detailing (Molding, Wainscoting, Conduit, or LED Cove) */}
          {isHome && homeDef.id === 'daly_city_inlaw' && (
            <g opacity="0.55">
              {/* Exposed Garage Conduit Pipe & Cinderblock Seam Lines */}
              <line
                x1={leftCorner.sx + 10}
                y1={leftCorner.sy - 26}
                x2={backCorner.sx - 8}
                y2={backCorner.sy - 26}
                stroke="#64748B"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              <line
                x1={backCorner.sx + 8}
                y1={backCorner.sy - 26}
                x2={rightCorner.sx - 10}
                y2={rightCorner.sy - 26}
                stroke="#64748B"
                strokeWidth="2"
              />
            </g>
          )}

          {isHome && homeDef.id === 'soma_loft' && (
            <g>
              {/* Warm Penthouse LED Ceiling Cove Glow Strip */}
              <line
                x1={leftCorner.sx + 4}
                y1={leftCorner.sy - WALL_H + 5}
                x2={backCorner.sx}
                y2={backCorner.sy - WALL_H + 5}
                stroke="#F59E0B"
                strokeWidth="3"
                opacity="0.85"
              />
              <line
                x1={backCorner.sx}
                y1={backCorner.sy - WALL_H + 5}
                x2={rightCorner.sx - 4}
                y2={rightCorner.sy - WALL_H + 5}
                stroke="#F59E0B"
                strokeWidth="3"
                opacity="0.85"
              />
            </g>
          )}

          {isHome && homeDef.id === 'pac_heights_victorian' && (
            <g>
              {/* Gilded Victorian Crown Molding & Chair Rail Wainscoting */}
              <line
                x1={leftCorner.sx + 2}
                y1={leftCorner.sy - WALL_H + 6}
                x2={backCorner.sx}
                y2={backCorner.sy - WALL_H + 6}
                stroke="#D97706"
                strokeWidth="2.8"
                opacity="0.75"
              />
              <line
                x1={backCorner.sx}
                y1={backCorner.sy - WALL_H + 6}
                x2={rightCorner.sx - 2}
                y2={rightCorner.sy - WALL_H + 6}
                stroke="#D97706"
                strokeWidth="2.8"
                opacity="0.75"
              />
              <line
                x1={leftCorner.sx + 2}
                y1={leftCorner.sy - 24}
                x2={backCorner.sx}
                y2={backCorner.sy - 24}
                stroke="#D97706"
                strokeWidth="1.6"
                opacity="0.55"
              />
              <line
                x1={backCorner.sx}
                y1={backCorner.sy - 24}
                x2={rightCorner.sx - 2}
                y2={rightCorner.sy - 24}
                stroke="#D97706"
                strokeWidth="1.6"
                opacity="0.55"
              />
            </g>
          )}

          {/* Interactive Left-Wall Window Customized by Home Tier & Architecture */}
          {(() => {
            const winType = isHome ? homeDef.architecture?.windowType : 'edwardian_bay';
            const winPoly =
              winType === 'garage_transom'
                ? `${backCorner.sx - 135},${backCorner.sy - 32} ${backCorner.sx - 42},${backCorner.sy - 79} ${backCorner.sx - 42},${backCorner.sy - 41} ${backCorner.sx - 135},${backCorner.sy + 6}`
                : winType === 'soma_curtainwall'
                  ? `${backCorner.sx - 188},${backCorner.sy - 10} ${backCorner.sx - 24},${backCorner.sy - 94} ${backCorner.sx - 24},${backCorner.sy - 6} ${backCorner.sx - 188},${backCorner.sy + 78}`
                  : winType === 'pac_heights_terrace'
                    ? `${backCorner.sx - 206},${backCorner.sy - 2} ${backCorner.sx - 24},${backCorner.sy - 95} ${backCorner.sx - 24},${backCorner.sy - 5} ${backCorner.sx - 206},${backCorner.sy + 88}`
                    : `${backCorner.sx - 150},${backCorner.sy - 16} ${backCorner.sx - 35},${backCorner.sy - 74} ${backCorner.sx - 35},${backCorner.sy - 4} ${backCorner.sx - 150},${backCorner.sy + 54}`;

            const winMeta =
              winType === 'garage_transom'
                ? {
                  needKey: 'energy' as NeedKey,
                  delta: 14,
                  emoji: '🌫️',
                  hoverLabel: '🌫️ Fog & BART (+14% Focus)',
                  toast: 'Watched Karl the Fog & distant BART train lights (+14% Focus)',
                  sparkleTitle: 'Daly City Garage Transom',
                  sparkleSub: 'Cool Pacific fog keeps your GPU & founder hustle running cold',
                }
                : winType === 'ranch_slider'
                  ? {
                    needKey: 'fun' as NeedKey,
                    delta: 16,
                    emoji: '🌴',
                    hoverLabel: '🌴 South Bay Sun (+16% Peace)',
                    toast: 'Took in the sunny Sunnyvale palm breeze (+16% Peace)',
                    sparkleTitle: 'Sunnyvale Backyard Slider',
                    sparkleSub: '74°F South Bay sunshine & Meyer lemon trees outside the hacker house',
                  }
                  : winType === 'soma_curtainwall'
                    ? {
                      needKey: 'fun' as NeedKey,
                      delta: 22,
                      emoji: '🏙️',
                      hoverLabel: '🏙️ Skyline View (+22% Peace)',
                      toast: 'Admired the Bay Bridge lights from your SoMa Curtain Wall (+22% Peace)',
                      sparkleTitle: 'SoMa Penthouse Curtain Wall',
                      sparkleSub: 'Floor-to-ceiling industrial glass overlooking the Bay Bridge & downtown towers',
                    }
                    : winType === 'pac_heights_terrace'
                      ? {
                        needKey: 'fun' as NeedKey,
                        delta: 28,
                        emoji: '🥂',
                        hoverLabel: '🥂 Billionaire View (+28% Peace)',
                        toast: 'Stepped onto your private Billionaire’s Row Golden Gate terrace (+28% Peace)',
                        sparkleTitle: 'Billionaire’s Row Grand Terrace',
                        sparkleSub: 'Unobstructed 270° panorama of the Golden Gate, Alcatraz & yacht regatta',
                      }
                      : {
                        needKey: 'fun' as NeedKey,
                        delta: 18,
                        emoji: '🌉',
                        hoverLabel: '🌉 Gaze (+18% Peace)',
                        toast: 'Watched Karl the Fog roll over the Bay (+18% Peace)',
                        sparkleTitle: 'Edwardian Bay Panorama',
                        sparkleSub: 'Warm afternoon sun over Dolores palms & the Golden Gate',
                      };

            return (
              <g
                className="cursor-pointer"
                onMouseEnter={() => setWindowHovered(true)}
                onMouseLeave={() => setWindowHovered(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  triggerMicroReward({
                    needKey: winMeta.needKey,
                    needDelta: winMeta.delta,
                    toastText: winMeta.toast,
                    emoji: winMeta.emoji,
                  });
                  triggerSparkle(
                    backCorner.sx - 96,
                    backCorner.sy - 38,
                    winMeta.emoji,
                    `🎮 +${winMeta.delta}% ${winMeta.needKey === 'energy' ? 'Focus' : 'Peace'}`,
                    winMeta.sparkleTitle,
                    winMeta.sparkleSub
                  );
                }}
              >
                <polygon
                  points={winPoly}
                  fill="url(#bayWindowSky)"
                  stroke={
                    windowHovered
                      ? '#38BDF8'
                      : isHome && homeDef.architecture
                        ? homeDef.architecture.trimColor
                        : '#64748B'
                  }
                  strokeWidth={windowHovered ? '3.2' : '2.5'}
                />

                <g clipPath="url(#bayWindowClip)">
                  {/* Night Stars */}
                  {isNight && (
                    <g>
                      <circle cx={backCorner.sx - 132} cy={backCorner.sy - 18} r="1.3" fill="#FDE047">
                        <animate attributeName="opacity" values="0.25;1;0.25" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={backCorner.sx - 85} cy={backCorner.sy - 42} r="1.2" fill="#F8FAFC">
                        <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.9s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={backCorner.sx - 52} cy={backCorner.sy - 55} r="1.4" fill="#38BDF8">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="2.8s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  )}

                  {/* WINDOW CONTENT BY HOME TYPE */}
                  {winType === 'garage_transom' ? (
                    <g>
                      {/* Thick Daly City Fog & Telephone Wires + BART Neon Sign */}
                      <line
                        x1={backCorner.sx - 140}
                        y1={backCorner.sy - 14}
                        x2={backCorner.sx - 38}
                        y2={backCorner.sy - 64}
                        stroke="#334155"
                        strokeWidth="1.2"
                      />
                      <rect
                        x={backCorner.sx - 78}
                        y={backCorner.sy - 58}
                        width="24"
                        height="11"
                        rx="3"
                        fill="#0284C7"
                        stroke="#E0F2FE"
                        strokeWidth="0.8"
                      />
                      <text
                        x={backCorner.sx - 66}
                        y={backCorner.sy - 50}
                        fill="#FFFFFF"
                        fontSize="6.5"
                        fontWeight="900"
                        textAnchor="middle"
                      >
                        BART
                      </text>
                      <ellipse
                        cx={backCorner.sx - 92}
                        cy={backCorner.sy - 32}
                        rx="42"
                        ry="11"
                        fill="rgba(241,245,249,0.85)"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values="-12,6; 12,-6; -12,6"
                          dur="6s"
                          repeatCount="indefinite"
                        />
                      </ellipse>
                      {/* Frosted Security Bars on Garage Transom */}
                      <line
                        x1={backCorner.sx - 104}
                        y1={backCorner.sy - 47}
                        x2={backCorner.sx - 104}
                        y2={backCorner.sy - 9}
                        stroke="#475569"
                        strokeWidth="1.6"
                      />
                      <line
                        x1={backCorner.sx - 73}
                        y1={backCorner.sy - 63}
                        x2={backCorner.sx - 73}
                        y2={backCorner.sy - 25}
                        stroke="#475569"
                        strokeWidth="1.6"
                      />
                    </g>
                  ) : winType === 'ranch_slider' ? (
                    <g>
                      {/* Sunny South Bay Sun, Cupertino Hills & Palm Trees */}
                      <circle
                        cx={backCorner.sx - 62}
                        cy={backCorner.sy - 44}
                        r="11"
                        fill={isNight ? '#FDE047' : '#FBBF24'}
                        opacity="0.9"
                      />
                      <path
                        d={`M ${backCorner.sx - 155},${backCorner.sy + 48} Q ${backCorner.sx - 95},${backCorner.sy - 6} ${backCorner.sx - 30},${backCorner.sy - 14} L ${backCorner.sx - 30},${backCorner.sy + 60} Z`}
                        fill="#10B981"
                        opacity="0.55"
                      />
                      {/* Palm Tree Silhouette */}
                      <line
                        x1={backCorner.sx - 112}
                        y1={backCorner.sy + 28}
                        x2={backCorner.sx - 108}
                        y2={backCorner.sy - 8}
                        stroke="#78350F"
                        strokeWidth="3"
                      />
                      <circle cx={backCorner.sx - 108} cy={backCorner.sy - 11} r="10" fill="#059669" />
                      {/* Sliding Door Center Frame */}
                      <line
                        x1={backCorner.sx - 92}
                        y1={backCorner.sy - 45}
                        x2={backCorner.sx - 92}
                        y2={backCorner.sy + 25}
                        stroke="#D97706"
                        strokeWidth="2.5"
                      />
                    </g>
                  ) : winType === 'soma_curtainwall' ? (
                    <g>
                      {/* Downtown SF Skyscrapers + Illuminated Bay Bridge Span */}
                      <rect x={backCorner.sx - 170} y={backCorner.sy + 6} width="16" height="58" fill="#1E293B" />
                      <rect x={backCorner.sx - 146} y={backCorner.sy - 14} width="18" height="72" fill="#0F172A" />
                      <polygon
                        points={`${backCorner.sx - 146},${backCorner.sy - 14} ${backCorner.sx - 137},${backCorner.sy - 28} ${backCorner.sx - 128},${backCorner.sy - 14}`}
                        fill="#38BDF8"
                        opacity="0.85"
                      />
                      {/* Bay Bridge White Suspension Towers */}
                      <line
                        x1={backCorner.sx - 96}
                        y1={backCorner.sy + 32}
                        x2={backCorner.sx - 96}
                        y2={backCorner.sy - 26}
                        stroke="#E2E8F0"
                        strokeWidth="2.8"
                      />
                      <line
                        x1={backCorner.sx - 54}
                        y1={backCorner.sy + 8}
                        x2={backCorner.sx - 54}
                        y2={backCorner.sy - 48}
                        stroke="#E2E8F0"
                        strokeWidth="2.8"
                      />
                      <path
                        d={`M ${backCorner.sx - 130},${backCorner.sy + 36} Q ${backCorner.sx - 75},${backCorner.sy - 4} ${backCorner.sx - 26},${backCorner.sy - 42}`}
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="1.8"
                      />
                      {/* Black Steel Industrial Curtainwall Mullions */}
                      <line
                        x1={backCorner.sx - 132}
                        y1={backCorner.sy - 38}
                        x2={backCorner.sx - 132}
                        y2={backCorner.sy + 50}
                        stroke="#0F172A"
                        strokeWidth="2.4"
                      />
                      <line
                        x1={backCorner.sx - 78}
                        y1={backCorner.sy - 66}
                        x2={backCorner.sx - 78}
                        y2={backCorner.sy + 22}
                        stroke="#0F172A"
                        strokeWidth="2.4"
                      />
                      <line
                        x1={backCorner.sx - 188}
                        y1={backCorner.sy + 32}
                        x2={backCorner.sx - 24}
                        y2={backCorner.sy - 52}
                        stroke="#0F172A"
                        strokeWidth="2"
                      />
                    </g>
                  ) : (
                    <g>
                      {/* Golden Gate Bridge Silhouette inside Window (Mission / Pac Heights / Venues) */}
                      {winType === 'pac_heights_terrace' && (
                        /* Marin Headlands Emerald Hills + Yacht Sails on the Bay */
                        <g>
                          <path
                            d={`M ${backCorner.sx - 206},${backCorner.sy + 48} Q ${backCorner.sx - 150},${backCorner.sy + 2} ${backCorner.sx - 95},${backCorner.sy + 14} Z`}
                            fill="#047857"
                            opacity="0.55"
                          />
                          {/* Regatta Sailboats */}
                          <polygon
                            points={`${backCorner.sx - 158},${backCorner.sy + 44} ${backCorner.sx - 152},${backCorner.sy + 30} ${backCorner.sx - 148},${backCorner.sy + 44}`}
                            fill="#FFFFFF"
                          />
                          <polygon
                            points={`${backCorner.sx - 86},${backCorner.sy + 8} ${backCorner.sx - 80},${backCorner.sy - 6} ${backCorner.sx - 76},${backCorner.sy + 8}`}
                            fill="#FFFFFF"
                          />
                        </g>
                      )}
                      <line
                        x1={backCorner.sx - 122}
                        y1={backCorner.sy + 26}
                        x2={backCorner.sx - 122}
                        y2={backCorner.sy - 16}
                        stroke="#EA580C"
                        strokeWidth={winType === 'pac_heights_terrace' ? '3.8' : '3'}
                      />
                      <line
                        x1={backCorner.sx - 65}
                        y1={backCorner.sy - 4}
                        x2={backCorner.sx - 65}
                        y2={backCorner.sy - 48}
                        stroke="#EA580C"
                        strokeWidth={winType === 'pac_heights_terrace' ? '3.8' : '3'}
                      />
                      {/* Bridge Deck & Suspension Cables */}
                      <line
                        x1={backCorner.sx - 178}
                        y1={backCorner.sy + 42}
                        x2={backCorner.sx - 30}
                        y2={backCorner.sy - 31}
                        stroke="#C2410C"
                        strokeWidth="2.2"
                      />
                      <path
                        d={`M ${backCorner.sx - 166},${backCorner.sy + 28} Q ${backCorner.sx - 93},${backCorner.sy + 4} ${backCorner.sx - 34},${backCorner.sy - 40}`}
                        fill="none"
                        stroke="#EA580C"
                        strokeWidth="2"
                      />
                      {/* Tower Aviation Beacons */}
                      <circle cx={backCorner.sx - 122} cy={backCorner.sy - 17} r="1.8" fill="#EF4444">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={backCorner.sx - 65} cy={backCorner.sy - 49} r="1.8" fill="#EF4444">
                        <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
                      </circle>

                      {/* Gilded Terrace Balustrade for Pacific Heights Mansion */}
                      {winType === 'pac_heights_terrace' && (
                        <line
                          x1={backCorner.sx - 206}
                          y1={backCorner.sy + 68}
                          x2={backCorner.sx - 24}
                          y2={backCorner.sy - 25}
                          stroke="#F59E0B"
                          strokeWidth="2.5"
                          strokeDasharray="5 3"
                        />
                      )}

                      {/* Animated Karl the Fog drifting softly across Golden Gate */}
                      <g opacity={weather === 'foggy' ? 0.88 : 0.5}>
                        <ellipse
                          cx={backCorner.sx - 96}
                          cy={backCorner.sy + 6}
                          rx="38"
                          ry="8.5"
                          fill="rgba(255,255,255,0.75)"
                        >
                          <animateTransform
                            attributeName="transform"
                            type="translate"
                            values="-18,9; 18,-9; -18,9"
                            dur="9s"
                            repeatCount="indefinite"
                          />
                        </ellipse>
                      </g>
                    </g>
                  )}
                </g>

                {/* Hover Prompt Badge on Window (Enlarged & Crisp) */}
                {windowHovered && (
                  <g transform={`translate(${backCorner.sx - 96}, ${backCorner.sy - 62})`}>
                    <rect
                      x="-88"
                      y="-14"
                      width="176"
                      height="24"
                      rx="12"
                      fill="rgba(15,23,42,0.94)"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="2"
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {winMeta.hoverLabel}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* Right Wall Sign / Location Header (translated to sign center before skewY!) */}
          <g>
            <polygon
              points={`${backCorner.sx + 28},${backCorner.sy + 14 - 96} ${backCorner.sx + 168},${backCorner.sy + 84 - 96} ${backCorner.sx + 168},${backCorner.sy + 84 - 62} ${backCorner.sx + 28},${backCorner.sy + 14 - 62}`}
              fill={
                isHome && homeDef.tier >= 5
                  ? '#451A03'
                  : isHome && homeDef.tier === 4
                    ? '#0F172A'
                    : isNight
                      ? '#0F172A'
                      : '#1E293B'
              }
              stroke={isHome && homeDef.tier >= 4 ? '#F59E0B' : 'rgba(255,255,255,0.28)'}
              strokeWidth="1.5"
            />
            <g transform={`translate(${backCorner.sx + 98}, ${backCorner.sy - 30}) skewY(26.5)`}>
              <text
                x="0"
                y="3.5"
                fill={isHome && homeDef.tier >= 4 ? '#FDE68A' : '#F8FAFC'}
                fontSize="9.5"
                fontWeight="800"
                textAnchor="middle"
              >
                {isHome
                  ? `${homeDef.emoji} ${(homeDef.shortName || homeDef.name).toUpperCase()} · T${homeDef.tier}`
                  : `${venueDef?.emoji || '📍'} ${venueDef?.shortName.toUpperCase()}`}
              </text>
            </g>
          </g>

          {/* Home-Specific Interactive Right-Wall Architectural Feature */}
          {isHome &&
            homeDef.architecture &&
            (() => {
              const feat = homeDef.architecture.rightWallFeature;
              const featMeta =
                feat === 'breaker_box'
                  ? {
                    emoji: '🔌',
                    badge: '🔌 Reset Breaker (+12% Focus)',
                    needKey: 'energy' as NeedKey,
                    delta: 12,
                    title: '20A Garage Sub-Panel & Ramen Runway',
                    sub: 'Balanced the circuit breaker so your kettle and GPU rig can run simultaneously',
                  }
                  : feat === 'founder_whiteboard'
                    ? {
                      emoji: '📐',
                      badge: '📐 System Arch Jam (+16% Focus)',
                      needKey: 'energy' as NeedKey,
                      delta: 16,
                      title: 'Sunnyvale Co-Founder OKR Whiteboard',
                      sub: 'Sketched distributed shard topology & Demo Day growth milestones',
                    }
                    : feat === 'vinyl_alcove'
                      ? {
                        emoji: '🎵',
                        badge: '🎵 Spin Vinyl (+18% Peace)',
                        needKey: 'fun' as NeedKey,
                        delta: 18,
                        title: 'Valencia Analog Hi-Fi Turntable',
                        sub: 'Dropped the needle on a warm Japanese jazz pressing in your sunlit studio',
                      }
                      : feat === 'acoustic_slats'
                        ? {
                          emoji: '📈',
                          badge: '📈 Angel Deal Ticker (+22% Focus)',
                          needKey: 'energy' as NeedKey,
                          delta: 22,
                          title: 'Walnut Acoustic Wall & Live Angel Ticker',
                          sub: 'Checked secondary liquidity quotes & AI seed deal flow on the LED ticker',
                        }
                        : {
                          emoji: '🔥',
                          badge: '🔥 Marble Hearth (+26% Peace)',
                          needKey: 'fun' as NeedKey,
                          delta: 26,
                          title: 'Calacatta Gold Fireplace & Private Art',
                          sub: 'Warmed by the hand-carved Italian marble hearth under your museum Rothko canvas',
                        };

              return (
                <g
                  className="cursor-pointer"
                  onMouseEnter={() => setRightWallHovered(true)}
                  onMouseLeave={() => setRightWallHovered(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragRef.current.moved) return;
                    triggerMicroReward({
                      needKey: featMeta.needKey,
                      needDelta: featMeta.delta,
                      toastText: `${featMeta.title} (+${featMeta.delta}% ${featMeta.needKey === 'energy' ? 'Focus' : 'Peace'})`,
                      emoji: featMeta.emoji,
                    });
                    triggerSparkle(
                      backCorner.sx + 106,
                      backCorner.sy + 12,
                      featMeta.emoji,
                      `⚡ +${featMeta.delta}% ${featMeta.needKey === 'energy' ? 'Focus' : 'Peace'}`,
                      featMeta.title,
                      featMeta.sub
                    );
                  }}
                >
                  {feat === 'breaker_box' && (
                    <g>
                      {/* Steel Breaker Box + Sticky Note Runway Board */}
                      <polygon
                        points={`${backCorner.sx + 48},${backCorner.sy - 20} ${backCorner.sx + 92},${backCorner.sy + 2} ${backCorner.sx + 92},${backCorner.sy + 38} ${backCorner.sx + 48},${backCorner.sy + 16}`}
                        fill="#475569"
                        stroke={rightWallHovered ? '#38BDF8' : '#1E293B'}
                        strokeWidth="1.8"
                      />
                      <circle cx={backCorner.sx + 70} cy={backCorner.sy + 8} r="3" fill="#22C55E" />
                      <polygon
                        points={`${backCorner.sx + 104},${backCorner.sy + 8} ${backCorner.sx + 154},${backCorner.sy + 33} ${backCorner.sx + 154},${backCorner.sy + 63} ${backCorner.sx + 104},${backCorner.sy + 38}`}
                        fill="#FEF3C7"
                        stroke="#D97706"
                        strokeWidth="1.4"
                      />
                    </g>
                  )}

                  {feat === 'founder_whiteboard' && (
                    <g>
                      {/* 6-Foot System Architecture Whiteboard */}
                      <polygon
                        points={`${backCorner.sx + 42},${backCorner.sy - 24} ${backCorner.sx + 164},${backCorner.sy + 37} ${backCorner.sx + 164},${backCorner.sy + 77} ${backCorner.sx + 42},${backCorner.sy + 16}`}
                        fill="#FFFFFF"
                        stroke={rightWallHovered ? '#38BDF8' : '#0284C7'}
                        strokeWidth="2"
                      />
                      {/* Sticky Notes & Architecture Nodes */}
                      <circle cx={backCorner.sx + 74} cy={backCorner.sy + 12} r="4.5" fill="#F59E0B" />
                      <circle cx={backCorner.sx + 104} cy={backCorner.sy + 27} r="4.5" fill="#38BDF8" />
                      <circle cx={backCorner.sx + 134} cy={backCorner.sy + 42} r="4.5" fill="#10B981" />
                      <line
                        x1={backCorner.sx + 74}
                        y1={backCorner.sy + 12}
                        x2={backCorner.sx + 134}
                        y2={backCorner.sy + 42}
                        stroke="#64748B"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                    </g>
                  )}

                  {feat === 'vinyl_alcove' && (
                    <g>
                      {/* Warm Teak Floating Shelf + Spinning Vinyl Record & Monstera */}
                      <polygon
                        points={`${backCorner.sx + 46},${backCorner.sy - 20} ${backCorner.sx + 158},${backCorner.sy + 36} ${backCorner.sx + 158},${backCorner.sy + 74} ${backCorner.sx + 46},${backCorner.sy + 18}`}
                        fill="#78350F"
                        stroke={rightWallHovered ? '#F59E0B' : '#B45309'}
                        strokeWidth="2"
                      />
                      <circle cx={backCorner.sx + 84} cy={backCorner.sy + 18} r="11" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
                      <circle cx={backCorner.sx + 84} cy={backCorner.sy + 18} r="3.5" fill="#EF4444" />
                      <circle cx={backCorner.sx + 128} cy={backCorner.sy + 38} r="9" fill="#10B981" />
                    </g>
                  )}

                  {feat === 'acoustic_slats' && (
                    <g>
                      {/* Walnut Acoustic Slat Feature Wall + Neon Deal Ticker */}
                      <polygon
                        points={`${backCorner.sx + 40},${backCorner.sy - 26} ${backCorner.sx + 174},${backCorner.sy + 41} ${backCorner.sx + 174},${backCorner.sy + 85} ${backCorner.sx + 40},${backCorner.sy + 18}`}
                        fill="#1E293B"
                        stroke={rightWallHovered ? '#38BDF8' : '#D97706'}
                        strokeWidth="2"
                      />
                      <line
                        x1={backCorner.sx + 54}
                        y1={backCorner.sy - 2}
                        x2={backCorner.sx + 160}
                        y2={backCorner.sy + 51}
                        stroke="#10B981"
                        strokeWidth="3"
                      />
                      <line
                        x1={backCorner.sx + 54}
                        y1={backCorner.sy + 10}
                        x2={backCorner.sx + 140}
                        y2={backCorner.sy + 53}
                        stroke="#38BDF8"
                        strokeWidth="2.5"
                      />
                    </g>
                  )}

                  {feat === 'marble_fireplace' && (
                    <g>
                      {/* Museum Painting Above + Calacatta Marble Hearth with Flickering Flame */}
                      <polygon
                        points={`${backCorner.sx + 66},${backCorner.sy - 22} ${backCorner.sx + 150},${backCorner.sy + 20} ${backCorner.sx + 150},${backCorner.sy + 50} ${backCorner.sx + 66},${backCorner.sy + 8}`}
                        fill="#991B1B"
                        stroke="#F59E0B"
                        strokeWidth="2.2"
                      />
                      <polygon
                        points={`${backCorner.sx + 54},${backCorner.sy + 10} ${backCorner.sx + 162},${backCorner.sy + 64} ${backCorner.sx + 162},${backCorner.sy + 98} ${backCorner.sx + 54},${backCorner.sy + 44}`}
                        fill="#F8FAFC"
                        stroke={rightWallHovered ? '#F59E0B' : '#CBD5E1'}
                        strokeWidth="2.2"
                      />
                      {/* Glowing Hearth Fire */}
                      <ellipse
                        cx={backCorner.sx + 108}
                        cy={backCorner.sy + 60}
                        rx="16"
                        ry="10"
                        fill="#1E293B"
                      />
                      <circle cx={backCorner.sx + 108} cy={backCorner.sy + 61} r="7" fill="#F97316">
                        <animate attributeName="r" values="6;8.5;6" dur="1.4s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={backCorner.sx + 108} cy={backCorner.sy + 62} r="3.8" fill="#FDE047" />
                    </g>
                  )}

                  {rightWallHovered && (
                    <g transform={`translate(${backCorner.sx + 108}, ${backCorner.sy - 8})`}>
                      <rect
                        x="-92"
                        y="-14"
                        width="184"
                        height="24"
                        rx="12"
                        fill="rgba(15,23,42,0.94)"
                        stroke="#F59E0B"
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="2"
                        fill="#FFFFFF"
                        fontSize="10"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {featMeta.badge}
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}
        </g>

        {/* Floating Waymo / Prime Air Delivery Drone Outside Balcony (Enlarged & Readable) */}
        {droneAvailable && (
          <g
            transform={`translate(${backCorner.sx + 210}, ${backCorner.sy - 62})`}
            className="cursor-pointer"
            onMouseEnter={() => setDroneHovered(true)}
            onMouseLeave={() => setDroneHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              if (dragRef.current.moved) return;
              const isCashDrop = Math.random() > 0.45;
              if (isCashDrop) {
                triggerMicroReward({
                  cashDelta: 140,
                  needKey: 'hunger',
                  needDelta: 18,
                  karmaDelta: 1,
                  toastText:
                    'Drone Care Package! Blue Bottle Cold Brew + $140 Founder Rebate (+1 ⚡ Karma)',
                  emoji: '🚁',
                });
                triggerSparkle(
                  backCorner.sx + 210,
                  backCorner.sy - 62,
                  '🚁',
                  '💵 +$140 Cash · 🍔 +18% Fuel · ⚡ +1 Karma',
                  'Prime Air Care Drop Claimed!',
                  'Blue Bottle Cold Brew + YC Founder AWS Credits Rebate'
                );
              } else {
                triggerMicroReward({
                  needKey: 'energy',
                  needDelta: 22,
                  karmaDelta: 1,
                  toastText:
                    'AirDrop Care Package! Philz Mint Mojito + Tartine Bun (+22% Focus · +1 ⚡ Karma)',
                  emoji: '📦',
                });
                triggerSparkle(
                  backCorner.sx + 210,
                  backCorner.sy - 62,
                  '📦',
                  '⚡ +22% Focus · ✨ +1 Karma',
                  'Philz & Tartine Care Drop!',
                  'Iced Mint Mojito + Warm Morning Bun delivered by drone'
                );
              }
              setDroneAvailable(false);
              setDroneHovered(false);
            }}
          >
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,-5; 0,5; 0,-5"
                dur="2.6s"
                repeatCount="indefinite"
              />
              {/* Glow Halo */}
              <circle
                cx="0"
                cy="4"
                r={droneHovered ? '34' : '28'}
                fill="rgba(56,189,248,0.2)"
                stroke={droneHovered ? '#38BDF8' : 'rgba(56,189,248,0.45)'}
                strokeWidth="1.6"
              />
              {/* Spinning Rotor Disks */}
              <ellipse cx="-20" cy="-10" rx="11" ry="3.5" fill="rgba(148,163,184,0.75)" />
              <ellipse cx="20" cy="-10" rx="11" ry="3.5" fill="rgba(148,163,184,0.75)" />
              {/* Drone Struts & Body */}
              <line x1="-20" y1="-7" x2="20" y2="-7" stroke="#334155" strokeWidth="3" />
              <rect
                x="-13"
                y="-12"
                width="26"
                height="11"
                rx="5.5"
                fill="#F8FAFC"
                stroke="#0284C7"
                strokeWidth="1.8"
              />
              <circle cx="0" cy="-6.5" r="2.6" fill="#38BDF8" />
              {/* Dangling Care Package Box */}
              <line x1="-5" y1="-1" x2="-5" y2="8" stroke="#64748B" strokeWidth="1.5" />
              <line x1="5" y1="-1" x2="5" y2="8" stroke="#64748B" strokeWidth="1.5" />
              <rect
                x="-11"
                y="7"
                width="22"
                height="17"
                rx="4"
                fill="#F59E0B"
                stroke="#B45309"
                strokeWidth="1.5"
              />
              <text x="0" y="19" fontSize="12" textAnchor="middle">
                ☕
              </text>
              {/* Progressive Disclosure: Show Pill Label on Hover */}
              {droneHovered && (
                <g transform="translate(0, -29)">
                  <rect
                    x="-66"
                    y="-12"
                    width="132"
                    height="22"
                    rx="11"
                    fill="rgba(15,23,42,0.92)"
                    stroke="#38BDF8"
                    strokeWidth="1.4"
                  />
                  <text
                    x="0"
                    y="2"
                    fill="#FFFFFF"
                    fontSize="10"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    🚁 Claim Care Drop
                  </text>
                </g>
              )}
            </g>
          </g>
        )}

        {/* Isometric Floor Tiles */}
        <g filter="url(#softShadow)">
          {Array.from({ length: gridSize }).map((_, y) =>
            Array.from({ length: gridSize }).map((__, x) => {
              const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
              const isSimHere = pos.x === x && pos.y === y;
              const activeDragTile =
                draggingPlaced &&
                draggingPlaced.currentTileX === x &&
                draggingPlaced.currentTileY === y;
              const activeCatalogDropTile =
                catalogDrag?.targetTile?.x === x && catalogDrag?.targetTile?.y === y;
              const activeStampTile =
                isFurnishMode && Boolean(pendingPlaceId) && isHovered;
              const isDropTarget =
                activeDragTile || activeCatalogDropTile || activeStampTile;
              const occupantOnTile = objects.find(
                (o) =>
                  o.x === x &&
                  o.y === y &&
                  (!draggingPlaced || o.uid !== draggingPlaced.uid)
              );

              return (
                <g key={`tile-${x}-${y}`}>
                  <polygon
                    points={tilePolygonPoints(x, y)}
                    fill={
                      isDropTarget
                        ? occupantOnTile
                          ? '#FBBF24'
                          : '#34D399'
                        : isHovered
                          ? isFurnishMode
                            ? '#38BDF8'
                            : '#60A5FA'
                          : isSimHere && !isFurnishMode
                            ? '#93C5FD'
                            : getFloorColors(x, y)
                    }
                    stroke={
                      isDropTarget
                        ? occupantOnTile
                          ? '#F59E0B'
                          : '#10B981'
                        : isFurnishMode
                          ? 'rgba(56,189,248,0.42)'
                          : isHome && homeDef.id === 'pac_heights_victorian'
                            ? 'rgba(217,119,6,0.22)'
                            : 'rgba(15,23,42,0.08)'
                    }
                    strokeWidth={isDropTarget ? '2.4' : isFurnishMode ? '1.35' : '1'}
                    strokeDasharray={isFurnishMode && !isDropTarget ? '3 2' : 'none'}
                    className="cursor-pointer transition-colors duration-150"
                    onMouseEnter={() => setHoveredTile({ x, y })}
                    onMouseLeave={() => setHoveredTile(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragRef.current.moved) return;
                      if (isFurnishMode) {
                        if (pendingPlaceId) {
                          buyAndPlaceFurniture(pendingPlaceId, { x, y });
                        } else {
                          setSelectedFurnishUid(null);
                        }
                        return;
                      }
                      moveToTile(x, y);
                      setSelectedObject(null);
                      setSelectedStation(null);
                      setSelectedNpc(null);
                    }}
                  />
                  {/* Subtle grid center dot in Furnish Mode */}
                  {isFurnishMode && !occupantOnTile && (
                    <circle
                      cx={isoToScreen(x + 0.5, y + 0.5).sx}
                      cy={isoToScreen(x + 0.5, y + 0.5).sy}
                      r={isDropTarget ? 3.5 : 1.7}
                      fill={isDropTarget ? '#FFFFFF' : 'rgba(56,189,248,0.45)'}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })
          )}

          {/* Designer Central Area Rug & Luxury Floor Accents for Tier 2–5 Homes */}
          {isHome &&
            homeDef.architecture?.rugColor &&
            (() => {
              const pad = homeDef.tier >= 4 ? 1.35 : 1.55;
              const rTop = isoToScreen(pad, pad);
              const rRight = isoToScreen(gridSize - pad, pad);
              const rBottom = isoToScreen(gridSize - pad, gridSize - pad);
              const rLeft = isoToScreen(pad, gridSize - pad);
              const innerPad = pad + 0.25;
              const iTop = isoToScreen(innerPad, innerPad);
              const iRight = isoToScreen(gridSize - innerPad, innerPad);
              const iBottom = isoToScreen(gridSize - innerPad, gridSize - innerPad);
              const iLeft = isoToScreen(innerPad, gridSize - innerPad);
              return (
                <g pointerEvents="none">
                  <polygon
                    points={`${rTop.sx},${rTop.sy} ${rRight.sx},${rRight.sy} ${rBottom.sx},${rBottom.sy} ${rLeft.sx},${rLeft.sy}`}
                    fill={homeDef.architecture.rugColor}
                    opacity="0.82"
                    stroke={homeDef.architecture.rugAccent || '#F59E0B'}
                    strokeWidth="2"
                  />
                  <polygon
                    points={`${iTop.sx},${iTop.sy} ${iRight.sx},${iRight.sy} ${iBottom.sx},${iBottom.sy} ${iLeft.sx},${iLeft.sy}`}
                    fill="none"
                    stroke={homeDef.architecture.rugAccent || '#F59E0B'}
                    strokeWidth="1.2"
                    strokeDasharray={homeDef.tier >= 5 ? 'none' : '4 2'}
                    opacity="0.9"
                  />
                </g>
              );
            })()}
        </g>

        {/* Autonomous Robot Vacuum ("Matic AI Bot") on Floor */}
        {isHome && (
          <g
            transform={`translate(${botScreen.sx}, ${botScreen.sy})`}
            className="cursor-pointer"
            onMouseEnter={() => setBotHovered(true)}
            onMouseLeave={() => setBotHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              if (dragRef.current.moved) return;
              triggerMicroReward({
                needKey: 'hygiene',
                needDelta: 12,
                toastText: 'Matic Bot sanitized the floor! (+12% Bio)',
                emoji: '🤖',
              });
              triggerSparkle(
                botScreen.sx,
                botScreen.sy - 18,
                '🤖',
                '🫧 +12% Bio · Spotless Studio',
                'Matic AI Robot Vacuum',
                'LiDAR floor sanitization complete — studio is spotless!'
              );
            }}
          >
            {/* Cleaning Sweep Aura */}
            <ellipse
              cx="0"
              cy="2"
              rx={botHovered ? '22' : '16'}
              ry={botHovered ? '11' : '8'}
              fill="rgba(56,189,248,0.24)"
              stroke={botHovered ? '#007AFF' : 'rgba(56,189,248,0.5)'}
              strokeWidth="1.5"
            />
            {/* Isometric Robot Body Cylinder */}
            <ellipse
              cx="0"
              cy="1"
              rx="13"
              ry="7"
              fill="#CBD5E1"
              stroke="#475569"
              strokeWidth="1.2"
            />
            <ellipse
              cx="0"
              cy="-3"
              rx="12.5"
              ry="6.5"
              fill="#F8FAFC"
              stroke="#64748B"
              strokeWidth="1.2"
            />
            {/* LiDAR Sensor Turret */}
            <circle
              cx="0"
              cy="-4"
              r="3.6"
              fill="#0284C7"
              stroke="#E0F2FE"
              strokeWidth="1"
            />
            <circle cx="2" cy="-4.5" r="1.2" fill="#34D399" />
            {botHovered && (
              <g transform="translate(0, -24)">
                <rect
                  x="-72"
                  y="-13"
                  width="144"
                  height="22"
                  rx="11"
                  fill="rgba(15,23,42,0.94)"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="1.5"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  🤖 Matic (+12% Bio)
                </text>
              </g>
            )}
          </g>
        )}

        {/* Optional Home Computer Blueprint Slot (when no compute workstation is installed yet) */}
        {isHome &&
          !getInstalledHomeComputer({ objects }) &&
          (() => {
            const deskSpot = getHomeDeskCoord(homeId);
            const occupied = objects.some((o) => o.x === deskSpot.x && o.y === deskSpot.y);
            if (occupied) return null;
            const center = isoToScreen(deskSpot.x + 0.5, deskSpot.y + 0.5);
            const labelText = '🖥️ + Install PC';
            const pillW = 112;
            return (
              <g
                transform={`translate(${center.sx}, ${center.sy})`}
                className="cursor-pointer"
                onMouseEnter={() => setPcSlotHovered(true)}
                onMouseLeave={() => setPcSlotHovered(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  setSelectedObject(null);
                  setSelectedStation(null);
                  setSelectedNpc(null);
                  setActiveModal('computer');
                }}
              >
                <ellipse
                  cx="0"
                  cy="4"
                  rx="28"
                  ry="14"
                  fill={pcSlotHovered ? 'rgba(0,122,255,0.24)' : 'rgba(0,122,255,0.12)'}
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <polygon
                  points="0,-22 25,-10 0,2 -25,-10"
                  fill="rgba(56,189,248,0.16)"
                  stroke="#38BDF8"
                  strokeWidth="1.3"
                  strokeDasharray="3 2"
                />
                <text x="0" y="-6" fontSize="21" textAnchor="middle" opacity="0.88">
                  🖥️
                </text>
                {pcSlotHovered && (
                  <g transform="translate(0, -34)">
                    <rect
                      x={-pillW / 2}
                      y="-11"
                      width={pillW}
                      height="19"
                      rx="9.5"
                      fill="rgba(15,23,42,0.92)"
                      stroke="#38BDF8"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="1.5"
                      fill="#E0F2FE"
                      fontSize="9"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {labelText}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

        {/* Home Placed Furniture Objects */}
        {isHome &&
          objects
            .slice()
            .sort((a, b) => a.x + a.y - (b.x + b.y))
            .map((placed) => {
              const def = FURNITURE_BY_ID[placed.objectId];
              if (!def) return null;
              const isBeingDragged = draggingPlaced?.uid === placed.uid;
              const effectiveX = isBeingDragged
                ? draggingPlaced.currentTileX
                : placed.x;
              const effectiveY = isBeingDragged
                ? draggingPlaced.currentTileY
                : placed.y;
              const center = isoToScreen(effectiveX + 0.5, effectiveY + 0.5);
              const origCenter = isoToScreen(placed.x + 0.5, placed.y + 0.5);
              const isSelected = isFurnishMode
                ? selectedFurnishUid === placed.uid
                : selectedObject?.uid === placed.uid;
              const isHovered = hoveredObjectUid === placed.uid;
              const isInUse = activeQueued?.targetObjectUid === placed.uid;
              const rot = (placed.rot || 0) % 4;
              const isOddRot = rot % 2 === 1;
              const swapTargetObj =
                isBeingDragged &&
                objects.find(
                  (o) =>
                    o.uid !== placed.uid &&
                    o.x === effectiveX &&
                    o.y === effectiveY
                );

              return (
                <React.Fragment key={placed.uid}>
                  {/* Origin blueprint footprint while dragging */}
                  {isBeingDragged && (
                    <g
                      transform={`translate(${origCenter.sx}, ${origCenter.sy})`}
                      pointerEvents="none"
                      opacity="0.4"
                    >
                      <polygon
                        points="0,-24 26,-11 0,2 -26,-11"
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="1.6"
                        strokeDasharray="4 2"
                      />
                      <text x="0" y="-8" fontSize="20" textAnchor="middle">
                        {def.emoji}
                      </text>
                    </g>
                  )}

                  <g
                    transform={`translate(${center.sx}, ${center.sy})`}
                    className={
                      isFurnishMode
                        ? isBeingDragged
                          ? 'cursor-grabbing'
                          : 'cursor-grab'
                        : 'cursor-pointer'
                    }
                    onMouseEnter={() => setHoveredObjectUid(placed.uid)}
                    onMouseLeave={() =>
                      setHoveredObjectUid((prev) => (prev === placed.uid ? null : prev))
                    }
                    onPointerDown={(e) => {
                      if (!isFurnishMode) return;
                      e.stopPropagation();
                      setSelectedFurnishUid(placed.uid);
                      setPendingPlaceId(null);
                      setDraggingPlaced({
                        uid: placed.uid,
                        objectId: placed.objectId,
                        origTileX: placed.x,
                        origTileY: placed.y,
                        currentTileX: placed.x,
                        currentTileY: placed.y,
                        startX: e.clientX,
                        startY: e.clientY,
                        moved: false,
                      });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragRef.current.moved) return;
                      if (isFurnishMode) {
                        setSelectedFurnishUid(placed.uid);
                        return;
                      }
                      setPopoverAnchor({ x: e.clientX, y: e.clientY });
                      setSelectedObject(placed);
                      setSelectedStation(null);
                      setSelectedNpc(null);
                    }}
                  >
                    {/* Selection / Hover / Active / Furnish Drag Halo */}
                    {(isSelected || isHovered || isInUse || isFurnishMode) && (
                      <ellipse
                        cx="0"
                        cy="4"
                        rx={isBeingDragged ? '36' : isSelected ? '33' : '29'}
                        ry={isBeingDragged ? '19' : isSelected ? '17' : '15'}
                        fill={
                          isBeingDragged
                            ? swapTargetObj
                              ? 'rgba(251,191,36,0.34)'
                              : 'rgba(52,211,153,0.34)'
                            : isInUse
                              ? 'rgba(52,199,89,0.25)'
                              : isSelected
                                ? 'rgba(0,122,255,0.28)'
                                : isHovered
                                  ? 'rgba(0,122,255,0.16)'
                                  : 'rgba(56,189,248,0.1)'
                        }
                        stroke={
                          isBeingDragged
                            ? swapTargetObj
                              ? '#F59E0B'
                              : '#10B981'
                            : isInUse
                              ? '#34C759'
                              : isSelected
                                ? '#007AFF'
                                : isHovered
                                  ? '#38BDF8'
                                  : 'rgba(56,189,248,0.4)'
                        }
                        strokeWidth={isSelected || isBeingDragged ? '2' : '1.2'}
                        strokeDasharray={
                          isFurnishMode && !isSelected && !isBeingDragged && !isHovered
                            ? '3 2'
                            : 'none'
                        }
                      />
                    )}

                    {/* Lift visual when actively dragging or hovering */}
                    <g
                      transform={
                        isBeingDragged
                          ? 'translate(0, -14) scale(1.1)'
                          : isSelected || isHovered
                            ? 'translate(0, -2) scale(1.03)'
                            : undefined
                      }
                    >
                      {/* 3D Isometric Furniture Block Base */}
                      <polygon
                        points="0,-24 26,-11 0,2 -26,-11"
                        fill={def.accentColor}
                        stroke={
                          isSelected || isHovered
                            ? '#38BDF8'
                            : 'rgba(15,23,42,0.2)'
                        }
                        strokeWidth={isSelected || isHovered ? '1.6' : '1.2'}
                      />
                      <polygon
                        points="-26,-11 0,2 0,16 -26,3"
                        fill={def.color}
                        opacity={isOddRot ? '0.82' : '1'}
                        stroke="rgba(15,23,42,0.2)"
                        strokeWidth="1.2"
                      />
                      <polygon
                        points="26,-11 0,2 0,16 26,3"
                        fill={def.color}
                        opacity={isOddRot ? '1' : '0.82'}
                        stroke="rgba(15,23,42,0.2)"
                        strokeWidth="1.2"
                      />

                      {/* Orientation Front-Edge Indicator Line when rotated or in Furnish Mode */}
                      {(rot > 0 || isFurnishMode) && (
                        <line
                          x1={rot === 0 || rot === 2 ? -13 : 0}
                          y1={rot === 0 || rot === 2 ? -4.5 : -4.5}
                          x2={rot === 0 || rot === 2 ? 0 : 13}
                          y2={rot === 0 || rot === 2 ? 2 : 2}
                          stroke="#38BDF8"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Icon */}
                      <g transform={isOddRot ? 'scale(-1, 1)' : undefined}>
                        <text
                          x="0"
                          y="-7"
                          fontSize={isFurnishMode ? '26' : '22'}
                          textAnchor="middle"
                        >
                          {def.emoji}
                        </text>
                      </g>

                      {/* Subtle Power Outage Indicator when unpowered */}
                      {!powered && def.requiresPower && (
                        <text x="15" y="-18" fontSize="11" textAnchor="middle">
                          🔌
                        </text>
                      )}
                    </g>
                  </g>
                </React.Fragment>
              );
            })}

        {/* Live Ghost Preview when Dragging from Shopping Dock or Stamp-Placing in Furnish Mode */}
        {isHome &&
          (() => {
            const ghostItemId =
              catalogDrag?.furnitureId || (isFurnishMode ? pendingPlaceId : null);
            const ghostTile =
              catalogDrag?.targetTile ||
              (isFurnishMode && pendingPlaceId ? hoveredTile : null);
            if (!ghostItemId || !ghostTile) return null;
            const ghostDef = FURNITURE_BY_ID[ghostItemId];
            if (!ghostDef) return null;
            const ghostCenter = isoToScreen(ghostTile.x + 0.5, ghostTile.y + 0.5);
            const occupied = objects.some(
              (o) => o.x === ghostTile.x && o.y === ghostTile.y
            );
            const labelText = occupied
              ? `✨ Drop ${ghostDef.emoji} (Auto-nudges to nearest open tile)`
              : `✨ Place ${ghostDef.emoji} ${getShortFurnitureLabel(ghostDef)} ($${ghostDef.price})`;
            const ghostPillW = Math.max(135, labelText.length * 5.8 + 24);
            return (
              <g
                transform={`translate(${ghostCenter.sx}, ${ghostCenter.sy - 8})`}
                pointerEvents="none"
              >
                <ellipse
                  cx="0"
                  cy="10"
                  rx="34"
                  ry="18"
                  fill="rgba(52,211,153,0.32)"
                  stroke="#10B981"
                  strokeWidth="2.2"
                  strokeDasharray="4 2"
                />
                <polygon
                  points="0,-24 26,-11 0,2 -26,-11"
                  fill={ghostDef.accentColor}
                  opacity="0.88"
                  stroke="#34D399"
                  strokeWidth="1.8"
                />
                <polygon
                  points="-26,-11 0,2 0,16 -26,3"
                  fill={ghostDef.color}
                  opacity="0.82"
                  stroke="#34D399"
                  strokeWidth="1.5"
                />
                <polygon
                  points="26,-11 0,2 0,16 26,3"
                  fill={ghostDef.color}
                  opacity="0.7"
                  stroke="#34D399"
                  strokeWidth="1.5"
                />
                <text x="0" y="-7" fontSize="28" textAnchor="middle">
                  {ghostDef.emoji}
                </text>
                <g transform="translate(0, -38)">
                  <rect
                    x={-ghostPillW / 2}
                    y="-12"
                    width={ghostPillW}
                    height="22"
                    rx="11"
                    fill="rgba(6,95,70,0.96)"
                    stroke="#34D399"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="2"
                    fill="#ECFDF5"
                    fontSize="10"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {labelText}
                  </text>
                </g>
              </g>
            );
          })()}

        {/* Celebratory Furnish Placement / Move Sparkle Burst */}
        {isHome &&
          furnishSparkle &&
          (() => {
            const spCenter = isoToScreen(
              furnishSparkle.tileX + 0.5,
              furnishSparkle.tileY + 0.5
            );
            const spText = `${furnishSparkle.emoji} ${furnishSparkle.text}`;
            const spW = Math.max(138, spText.length * 6.2 + 28);
            return (
              <g
                key={furnishSparkle.id}
                transform={`translate(${spCenter.sx}, ${spCenter.sy - 28})`}
                pointerEvents="none"
              >
                <g>
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0; 0,-26"
                    dur="1.2s"
                    fill="freeze"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;1;0"
                    dur="1.2s"
                    fill="freeze"
                  />
                  <circle cx="-24" cy="-8" r="3.5" fill="#FBBF24" />
                  <circle cx="24" cy="-10" r="3.5" fill="#38BDF8" />
                  <circle cx="0" cy="-22" r="4" fill="#34D399" />
                  <rect
                    x={-spW / 2}
                    y="-15"
                    width={spW}
                    height="24"
                    rx="12"
                    fill="rgba(15,23,42,0.95)"
                    stroke="#38BDF8"
                    strokeWidth="1.6"
                  />
                  <text
                    x="0"
                    y="1"
                    fill="#F0F9FF"
                    fontSize="10.5"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {spText}
                  </text>
                </g>
              </g>
            );
          })()}

        {/* Venue Interactive Stations */}
        {!isHome &&
          venueDef?.stations.map((st) => {
            const center = isoToScreen(st.x + 0.5, st.y + 0.5);
            const isSelected = selectedStation?.id === st.id;
            const isHovered = hoveredStationId === st.id;
            const isInUse = activeQueued?.targetStationId === st.id;
            return (
              <g
                key={st.id}
                transform={`translate(${center.sx}, ${center.sy})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredStationId(st.id)}
                onMouseLeave={() =>
                  setHoveredStationId((prev) => (prev === st.id ? null : prev))
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  setPopoverAnchor({ x: e.clientX, y: e.clientY });
                  setSelectedStation(st);
                  setSelectedObject(null);
                  setSelectedNpc(null);
                }}
              >
                {(isSelected || isHovered || isInUse) && (
                  <ellipse
                    cx="0"
                    cy="4"
                    rx={isSelected ? '34' : '30'}
                    ry={isSelected ? '18' : '15'}
                    fill={
                      isInUse
                        ? 'rgba(52,199,89,0.26)'
                        : isSelected
                          ? 'rgba(0,122,255,0.26)'
                          : 'rgba(56,189,248,0.16)'
                    }
                    stroke={
                      isInUse
                        ? '#34C759'
                        : isSelected
                          ? '#007AFF'
                          : '#38BDF8'
                    }
                    strokeWidth={isSelected ? '2' : '1.4'}
                  />
                )}
                <g
                  transform={
                    isSelected || isHovered ? 'translate(0, -2) scale(1.03)' : undefined
                  }
                >
                  <polygon
                    points="0,-26 28,-12 0,2 -28,-12"
                    fill={st.accent}
                    stroke={isSelected || isHovered ? '#38BDF8' : 'rgba(15,23,42,0.2)'}
                    strokeWidth={isSelected || isHovered ? '1.6' : '1.2'}
                  />
                  <polygon
                    points="-28,-12 0,2 0,18 -28,4"
                    fill={st.color}
                    stroke="rgba(15,23,42,0.2)"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="28,-12 0,2 0,18 28,4"
                    fill={st.color}
                    opacity="0.85"
                    stroke="rgba(15,23,42,0.2)"
                    strokeWidth="1.2"
                  />
                  <text x="0" y="-8" fontSize="23" textAnchor="middle">
                    {st.emoji}
                  </text>
                </g>
              </g>
            );
          })}

        {/* NPCs in Scene with Minimal First-Name Tag (Expands on Hover/Select in Top Layer) */}
        {npcPositions.map(({ npc, x: npcX, y: npcY }) => {
          const pt = isoToScreen(npcX + 0.5, npcY + 0.5);
          const rel = relationships[npc.id];
          const isSelected = selectedNpc?.id === npc.id;
          const isHovered = hoveredNpcId === npc.id;
          const firstName = npc.name.split(' ')[0];
          const compactLabel = `${firstName}${rel && rel.score >= 38 ? ' ★' : ''}`;
          const compactW = Math.max(46, compactLabel.length * 5.6 + 16);

          return (
            <g
              key={npc.id}
              transform={`translate(${pt.sx}, ${pt.sy})`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredNpcId(npc.id)}
              onMouseLeave={() =>
                setHoveredNpcId((prev) => (prev === npc.id ? null : prev))
              }
              onClick={(e) => {
                e.stopPropagation();
                if (dragRef.current.moved) return;
                setPopoverAnchor({ x: e.clientX, y: e.clientY });
                setSelectedNpc(npc);
                setSelectedObject(null);
                setSelectedStation(null);
              }}
            >
              {/* Selection / Hover Ring */}
              <ellipse
                cx="0"
                cy="6"
                rx={isSelected || isHovered ? '18' : '13'}
                ry={isSelected || isHovered ? '9' : '6.5'}
                fill={
                  isSelected
                    ? 'rgba(0,122,255,0.25)'
                    : isHovered
                      ? 'rgba(56,189,248,0.2)'
                      : 'rgba(15,23,42,0.2)'
                }
                stroke={isSelected ? '#007AFF' : isHovered ? '#38BDF8' : 'none'}
                strokeWidth="1.5"
              />
              {/* Body */}
              <path d="M-9,4 L-7,-18 L7,-18 L9,4 Z" fill={npc.appearance.topColor} />
              {/* Head */}
              <circle cx="0" cy="-26" r="8.5" fill={npc.appearance.skin} />
              <path d="M-8,-28 Q0,-37 8,-28" fill={npc.appearance.hairColor} />

              {/* Compact Single-Line First Name Pill when Idle */}
              {!isHovered && !isSelected && (
                <g transform="translate(0, 17)" pointerEvents="none">
                  <rect
                    x={-compactW / 2}
                    y="-8"
                    width={compactW}
                    height="15"
                    rx="7.5"
                    fill="rgba(15,23,42,0.72)"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="0.9"
                  />
                  <text
                    x="0"
                    y="2.5"
                    fill="#F8FAFC"
                    fontSize="8.5"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {compactLabel}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Player Sim Character */}
        <g
          transform={`translate(${simScreen.sx}, ${simScreen.sy})`}
          className="cursor-pointer transition-transform duration-300 ease-out"
          onMouseEnter={() => setSimHovered(true)}
          onMouseLeave={() => setSimHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (dragRef.current.moved) return;
            setActiveModal('sim', 'needs');
          }}
        >
          {/* Distinct Player Floor Ring & Shadow */}
          <ellipse
            cx="0"
            cy="6"
            rx="19"
            ry="9.5"
            fill="rgba(0,122,255,0.18)"
            stroke="#007AFF"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <ellipse cx="0" cy="6" rx="14" ry="7" fill="rgba(15,23,42,0.26)" />

          {/* Legs */}
          <rect x="-6" y="-6" width="4.5" height="12" rx="2" fill="#1E293B" />
          <rect x="1.5" y="-6" width="4.5" height="12" rx="2" fill="#1E293B" />

          {/* Torso / Outfit */}
          <path
            d="M-10,-5 L-8,-24 Q0,-27 8,-24 L10,-5 Z"
            fill={sim.appearance.topColor}
          />
          {sim.appearance.outfit === 'patagonia' && (
            <path d="M-7,-5 L-6,-23 L6,-23 L7,-5 Z" fill="#1E293B" opacity="0.7" />
          )}

          {/* Head */}
          <circle cx="0" cy="-32" r="9.5" fill={sim.appearance.skin} />
          <path d="M-9,-34 Q0,-45 9,-34 Z" fill={sim.appearance.hairColor} />

          {/* Sim Accessory on Isometric Avatar */}
          {sim.appearance.accessory === 'visionpro' && (
            <rect
              x="-6.5"
              y="-34.5"
              width="13"
              height="4.5"
              rx="2"
              fill="#0F172A"
              stroke="#E2E8F0"
              strokeWidth="0.8"
            />
          )}
          {sim.appearance.accessory === 'glasses' && (
            <g stroke="#0F172A" strokeWidth="1" fill="none">
              <rect x="-6" y="-34" width="5" height="3.2" rx="1" />
              <rect x="1" y="-34" width="5" height="3.2" rx="1" />
            </g>
          )}

          {/* Floating Plumbob / Flow State Diamond */}
          <polygon
            points="0,-58 6,-50 0,-42 -6,-50"
            fill={moodInfo.color}
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />

          {/* Floating Activity Particles when actively executing queue[0] */}
          {activeActionDef &&
            !isWalking &&
            activityParticles.map((particle, idx) => {
              const xOffset = idx === 0 ? -32 : idx === 1 ? 32 : 0;
              const beginSec = `${idx * 0.65}s`;
              return (
                <g key={`particle-${idx}`} transform={`translate(${xOffset}, -48)`}>
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0,0; 0,-28"
                      dur="1.9s"
                      begin={beginSec}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;0"
                      dur="1.9s"
                      begin={beginSec}
                      repeatCount="indefinite"
                    />
                    <text
                      x="0"
                      y="0"
                      fontSize="11.5"
                      fontWeight="800"
                      fill="#007AFF"
                      textAnchor="middle"
                    >
                      {particle}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* Compact Clickable Sim Low-Need Thought Bubble */}
          {lowestAlertNeed &&
            (() => {
              const meta = NEED_BADGE_META[lowestAlertNeed.key];
              const alertText = simHovered
                ? meta.alertText
                : `${meta.emoji} Low ${meta.shortLabel}`;
              const alertPillW = Math.max(88, alertText.length * 6.0 + 22);
              const clampedX = Math.max(180 - simScreen.sx, Math.min(720 - simScreen.sx, 0));
              return (
                <g
                  transform={`translate(${clampedX}, -76)`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragRef.current.moved) return;
                    autoFixNeed(lowestAlertNeed.key);
                    triggerSparkle(
                      simScreen.sx,
                      simScreen.sy - 64,
                      meta.emoji,
                      `⚡ Restoring ${meta.shortLabel}`
                    );
                  }}
                >
                  <rect
                    x={-alertPillW / 2}
                    y="-12"
                    width={alertPillW}
                    height="21"
                    rx="10.5"
                    fill="rgba(255,255,255,0.95)"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="2"
                    fill="#B45309"
                    fontSize="9.5"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {alertText}
                  </text>
                </g>
              );
            })()}
        </g>

        {/* TOP-MOST PROGRESSIVE DISCLOSURE TOOLTIP LAYER (Never Occluded by Characters or Objects) */}
        <g pointerEvents="none">
          {/* Hovered / Selected / Dragged Home Furniture Label */}
          {isHome &&
            objects.map((placed) => {
              const def = FURNITURE_BY_ID[placed.objectId];
              if (!def) return null;
              const isBeingDragged = draggingPlaced?.uid === placed.uid;
              const isSelected = isFurnishMode
                ? selectedFurnishUid === placed.uid
                : selectedObject?.uid === placed.uid;
              const isHovered =
                hoveredObjectUid === placed.uid ||
                (hoveredTile?.x === placed.x && hoveredTile?.y === placed.y);
              if (!isBeingDragged && !isSelected && !isHovered) return null;

              const effectiveX = isBeingDragged ? draggingPlaced.currentTileX : placed.x;
              const effectiveY = isBeingDragged ? draggingPlaced.currentTileY : placed.y;
              const center = isoToScreen(effectiveX + 0.5, effectiveY + 0.5);
              const hasUpgrade = Boolean(getNextUpgradeFurniture(def));
              const shortLabel = getShortFurnitureLabel(def);
              const powerOffBadge = !powered && def.requiresPower ? ' 🔌' : '';
              const swapTargetObj =
                isBeingDragged &&
                objects.find(
                  (o) =>
                    o.uid !== placed.uid && o.x === effectiveX && o.y === effectiveY
                );

              const labelText = isBeingDragged
                ? swapTargetObj
                  ? `🔄 Swap with ${getShortFurnitureLabel(
                    FURNITURE_BY_ID[swapTargetObj.objectId] || def
                  )}`
                  : `✨ Drop at (${effectiveX}, ${effectiveY})`
                : isFurnishMode
                  ? `🖐️ ${shortLabel}`
                  : `${shortLabel}${hasUpgrade ? ' · ⬆️' : ''}${powerOffBadge}`;
              const pillW = Math.max(92, labelText.length * 5.9 + 22);

              return (
                <g
                  key={`label-${placed.uid}`}
                  transform={`translate(${center.sx}, ${center.sy - (isBeingDragged ? 50 : 38)
                    })`}
                >
                  <rect
                    x={-pillW / 2}
                    y="-12"
                    width={pillW}
                    height="21"
                    rx="10.5"
                    fill={
                      isBeingDragged
                        ? swapTargetObj
                          ? 'rgba(180,83,9,0.95)'
                          : 'rgba(6,95,70,0.95)'
                        : 'rgba(15,23,42,0.92)'
                    }
                    stroke={
                      isBeingDragged
                        ? '#34D399'
                        : isSelected
                          ? '#007AFF'
                          : 'rgba(56,189,248,0.6)'
                    }
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="2"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {labelText}
                  </text>
                </g>
              );
            })}

          {/* Hovered / Selected Venue Station Label */}
          {!isHome &&
            venueDef?.stations.map((st) => {
              const isSelected = selectedStation?.id === st.id;
              const isHovered = hoveredStationId === st.id;
              const isInUse = activeQueued?.targetStationId === st.id;
              if (!isSelected && !isHovered && !isInUse) return null;

              const center = isoToScreen(st.x + 0.5, st.y + 0.5);
              const stPillW = Math.max(102, st.label.length * 6.0 + 24);
              return (
                <g
                  key={`st-label-${st.id}`}
                  transform={`translate(${center.sx}, ${center.sy - 40})`}
                >
                  <rect
                    x={-stPillW / 2}
                    y="-12"
                    width={stPillW}
                    height="21"
                    rx="10.5"
                    fill="rgba(15,23,42,0.92)"
                    stroke={isInUse ? '#34C759' : isSelected ? '#007AFF' : '#38BDF8'}
                    strokeWidth="1.3"
                  />
                  <text
                    x="0"
                    y="2"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {st.label}
                  </text>
                </g>
              );
            })}

          {/* Hovered / Selected NPC Full Detail Pill */}
          {npcPositions.map(({ npc, x: npcX, y: npcY }) => {
            const isSelected = selectedNpc?.id === npc.id;
            const isHovered = hoveredNpcId === npc.id;
            if (!isSelected && !isHovered) return null;

            const pt = isoToScreen(npcX + 0.5, npcY + 0.5);
            const rel = relationships[npc.id];
            const npcNameText = `💬 ${npc.name}${rel && rel.score >= 38 ? ' ★' : ''}`;
            const npcRoleText = `${npc.role} · ${npc.company}`;
            const npcTagW = Math.max(
              114,
              Math.max(npcNameText.length * 5.8, npcRoleText.length * 5.1) + 22
            );
            return (
              <g
                key={`npc-label-${npc.id}`}
                transform={`translate(${pt.sx}, ${pt.sy - 48})`}
              >
                <rect
                  x={-npcTagW / 2}
                  y="-16"
                  width={npcTagW}
                  height="28"
                  rx="10"
                  fill="rgba(15,23,42,0.94)"
                  stroke="#38BDF8"
                  strokeWidth="1.3"
                />
                <text
                  x="0"
                  y="-4"
                  fill="#FFFFFF"
                  fontSize="9.5"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {npcNameText}
                </text>
                <text
                  x="0"
                  y="7"
                  fill="#94A3B8"
                  fontSize="8"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {npcRoleText}
                </text>
              </g>
            );
          })}

          {/* Hovered Player Sim Pill */}
          {simHovered &&
            (() => {
              const youLabel = `${sim.name} (You)`;
              const youPillW = Math.max(96, youLabel.length * 5.8 + 20);
              return (
                <g transform={`translate(${simScreen.sx}, ${simScreen.sy + 21})`}>
                  <rect
                    x={-youPillW / 2}
                    y="-10"
                    width={youPillW}
                    height="19"
                    rx="9.5"
                    fill="#007AFF"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="2.5"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {youLabel}
                  </text>
                </g>
              );
            })()}
        </g>

        {/* Visual Sparkle Burst Feedback Overlay on SVG */}
        {sparkleBurst &&
          (() => {
            const burstText = `${sparkleBurst.emoji} ${sparkleBurst.label}`;
            const burstW = Math.max(136, burstText.length * 6.0 + 26);
            const clampedBurstX = Math.max(150, Math.min(750, sparkleBurst.x));
            const clampedBurstY = Math.max(70, Math.min(500, sparkleBurst.y));
            return (
              <g
                key={sparkleBurst.id}
                transform={`translate(${clampedBurstX}, ${clampedBurstY})`}
                pointerEvents="none"
              >
                <g>
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0; 0,-28"
                    dur="1.6s"
                    fill="freeze"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;1;0"
                    dur="1.6s"
                    fill="freeze"
                  />
                  <rect
                    x={-burstW / 2}
                    y="-14"
                    width={burstW}
                    height="23"
                    rx="11.5"
                    fill="rgba(15,23,42,0.92)"
                    stroke="#34D399"
                    strokeWidth="1.4"
                  />
                  <text
                    x="0"
                    y="1"
                    fill="#ECFDF5"
                    fontSize="10"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {burstText}
                  </text>
                </g>
              </g>
            );
          })()}

        {/* PG&E Blackout Overlay if Home Power is Out and No Backup */}
        {isHome && !powered && (
          <rect
            x="0"
            y="0"
            width="900"
            height="580"
            fill="rgba(15,23,42,0.52)"
            pointerEvents="none"
          />
        )}
      </svg>

      {/* Sleek Minimal Camera Zoom & Reset Pill */}
      <div
        className={`apple-pill absolute left-4 z-20 flex items-center gap-1 rounded-full px-2 py-1 text-[var(--ink)] opacity-80 transition-opacity hover:opacity-100 ${isFurnishMode ? 'top-20' : 'bottom-20'
          }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.1).toFixed(2)))}
          title="Zoom Out"
          className="btn-press grid size-6 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          onClick={resetCamera}
          title="Reset Zoom & Pan"
          className="btn-press min-w-[38px] px-1 text-center font-mono text-[11px] font-bold tabular-nums text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(1.45, +(z + 0.1).toFixed(2)))}
          title="Zoom In"
          className="btn-press grid size-6 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Plus className="size-3.5" />
        </button>
        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <>
            <div className="mx-0.5 h-3.5 w-px bg-black/10 dark:bg-white/15" />
            <button
              onClick={resetCamera}
              title="Center Camera"
              className="btn-press flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-[#007AFF] hover:bg-[#007AFF]/10"
            >
              <Compass className="size-3" />
              <span>Center</span>
            </button>
          </>
        )}
      </div>

      {/* Residence Luxury Tier & Bluefin House-Hunt Pill */}
      {isHome && !isFurnishMode && (
        <div
          className="apple-pill absolute right-4 bottom-20 z-20 hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs text-[var(--ink)] shadow-sm sm:flex"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-extrabold">
            {homeDef.emoji} {homeDef.tierLabel}
          </span>
          {homeDef.perks?.[0] && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
              {homeDef.perks[0].emoji} {homeDef.perks[0].desc}
            </span>
          )}
          <button
            onClick={() => openBluefinMap(homeDef.id)}
            className="btn-press rounded-full bg-[#0284C7]/15 px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#0284C7] hover:bg-[#0284C7]/25 dark:text-sky-300"
            title="Look for new homes on the Bay Area Map via Bluefin"
          >
            🗺️ House Hunt
          </button>
          <button
            onClick={() => setActiveModal('phone', 'bluefin')}
            className="btn-press rounded-full bg-[#0284C7] px-2.5 py-0.5 text-[10.5px] font-extrabold text-white hover:bg-[#0369A1]"
            title="Open Bluefin Real Estate app"
          >
            🐟 Bluefin
          </button>
        </div>
      )}

      {/* Backup Battery Active Pill */}
      {isHome && backupActive && (
        <div className="pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2">
          <div className="apple-pill flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Zap className="size-3.5 fill-current" />
            Backup Battery Active
          </div>
        </div>
      )}

      {/* Enlarged, Unclipped Apple visionOS Action Popover (Furniture or Venue Station) */}
      {(selectedObject || selectedStation) && (
        <div
          className="absolute bottom-24 left-1/2 z-30 w-[calc(100%-24px)] max-w-md -translate-x-1/2"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="apple-glass-heavy rounded-3xl p-4 text-[var(--ink)] shadow-2xl">
            {/* Header: Big Emoji + Full Unclipped Title + Tier Badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--mist)] text-3xl shadow-inner">
                  {selectedFurnitureDef ? selectedFurnitureDef.emoji : selectedStation?.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold leading-snug text-[var(--ink)]">
                      {selectedFurnitureDef ? selectedFurnitureDef.name : selectedStation?.label}
                    </h3>
                    {selectedFurnitureDef ? (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getFurnitureTier(selectedFurnitureDef.quality).badgeClass
                          }`}
                      >
                        {getFurnitureTier(selectedFurnitureDef.quality).label}
                      </span>
                    ) : (
                      <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-300">
                        Venue Station
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs font-medium text-[var(--ink-soft)]">
                    {selectedFurnitureDef ? (
                      <span>{'★'.repeat(selectedFurnitureDef.quality)} Quality Rating</span>
                    ) : (
                      <span>
                        {venueDef?.emoji} {venueDef?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedObject(null);
                  setSelectedStation(null);
                }}
                className="btn-press grid size-8 shrink-0 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Interactive Workstation OS CTA when a Home Computer is selected */}
            {selectedFurnitureDef?.category === 'compute' && (
              <button
                onClick={() => {
                  setSelectedObject(null);
                  setSelectedStation(null);
                  setActiveModal('computer');
                }}
                className="btn-press mt-3.5 flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#007AFF] to-indigo-600 px-4 py-3 text-left text-white shadow-md hover:opacity-95"
              >
                <div className="flex items-center gap-2.5">
                  <Monitor className="size-5 shrink-0" />
                  <div>
                    <div className="text-xs font-extrabold">
                      🖥️ Launch Interactive Workstation OS
                    </div>
                    <div className="text-[10px] font-semibold text-white/85">
                      Cursor IDE · Local GPU AI Lab · Bluefin Real Estate · WFH & Hardware
                    </div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 font-mono text-[10px] font-extrabold text-white">
                  Open OS →
                </span>
              </button>
            )}

            {/* Action Buttons with Full Unclipped Labels & Clear Stat Impact Badges */}
            <div className="mt-3.5 grid gap-2">
              {(selectedFurnitureDef
                ? selectedFurnitureDef.actions
                : selectedStation?.actionIds || []
              ).map((actId) => {
                const act = ACTIONS[actId];
                if (!act) return null;

                const needBadges = (Object.keys(act.needsDelta || {}) as NeedKey[])
                  .map((k) => ({
                    key: k,
                    val: act.needsDelta[k] || 0,
                    emoji: NEED_BADGE_META[k].emoji,
                    shortLabel: NEED_BADGE_META[k].shortLabel,
                  }))
                  .filter((item) => item.val !== 0);

                const skillNames: Record<string, string> = {
                  coding: 'Coding',
                  systemDesign: 'SysDesign',
                  aiResearch: 'AI/LLM',
                  charisma: 'Charisma',
                  fitness: 'Fitness',
                  cooking: 'Cooking',
                  hustle: 'Hustle',
                  investing: 'Investing',
                };

                const noPower = isHome && act.requiresPower && !powered;
                const cantAfford = Boolean(act.cost && cash < act.cost);

                return (
                  <button
                    key={act.id}
                    disabled={noPower || cantAfford}
                    onClick={() => {
                      enqueueAction(act.id, {
                        objectUid: selectedObject?.uid,
                        stationId: selectedStation?.id,
                      });
                      setSelectedObject(null);
                      setSelectedStation(null);
                    }}
                    className="btn-press flex flex-col gap-1.5 rounded-2xl bg-[var(--mist)] px-3.5 py-2.5 text-left transition-colors hover:bg-[#007AFF]/15 disabled:opacity-50"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl shrink-0">{act.emoji}</span>
                        <span className="text-[13px] font-extrabold leading-snug text-[var(--ink)]">
                          {act.label}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--ink-soft)] dark:bg-white/10">
                        ⏱ {act.durationMinutes}m
                      </span>
                    </div>

                    {/* Visual Stat Impact Badges Row (Full Width, Never Squeezes Action Title) */}
                    <div className="flex flex-wrap items-center gap-1.5 pl-7">
                      {noPower && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-extrabold text-rose-500">
                          🔌 PG&E Outage (Needs Power)
                        </span>
                      )}
                      {cantAfford && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-extrabold text-rose-500">
                          Need ${act.cost}
                        </span>
                      )}
                      {needBadges.map((nb) => (
                        <span
                          key={nb.key}
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${nb.val > 0
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                            }`}
                        >
                          {nb.emoji} {nb.val > 0 ? `+${nb.val}` : nb.val} {nb.shortLabel}
                        </span>
                      ))}
                      {act.earn && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                          💵 +${act.earn[1]}
                        </span>
                      )}
                      {act.cost && !cantAfford && (
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-300">
                          💳 -${act.cost}
                        </span>
                      )}
                      {act.skillGain && (
                        <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[11px] font-bold text-[#007AFF] dark:text-[#5AC8FA]">
                          🧠 +{skillNames[act.skillGain.skill] || act.skillGain.skill} XP
                        </span>
                      )}
                      {act.startupProgress && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                          🚀 +{act.startupProgress}% MVP
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 1-Click Furniture Upgrade, Furnish Move & Sell Footer */}
            {selectedObject && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      const uid = selectedObject.uid;
                      setSelectedObject(null);
                      setSelectedFurnishUid(uid);
                      setView('buy');
                    }}
                    className="btn-press flex items-center gap-1.5 rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-extrabold text-[var(--ink)] hover:bg-[#007AFF]/15"
                    title="Enter Furnish Mode to drag & rearrange this item"
                  >
                    <Move className="size-3.5 text-[#007AFF]" />
                    <span>🖐️ Move / Furnish</span>
                  </button>

                  <button
                    onClick={() => {
                      storeFurnitureInBackpack(selectedObject.uid);
                      setSelectedObject(null);
                    }}
                    className="btn-press flex items-center gap-1.5 rounded-2xl bg-indigo-500/15 px-3 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-500/25 dark:text-indigo-300"
                    title="Pack this furniture item into your Backpack at 100% value so you can unpack it later"
                  >
                    <span>🎒 Store in Pack</span>
                  </button>

                  {upgradeTargetDef && (
                    <button
                      onClick={handleUpgradeFurniture}
                      className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-[#007AFF] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:opacity-95"
                    >
                      <ArrowUpCircle className="size-4 shrink-0" />
                      <span>
                        ⬆️ Upgrade ({formatCurrency(upgradeNetCost)}) · {upgradeTargetDef.emoji}{' '}
                        {upgradeTargetDef.name}
                      </span>
                    </button>
                  )}
                </div>

                {(objects.length > 3 || selectedFurnitureDef?.category === 'compute') && (
                  <button
                    onClick={() => {
                      sellFurniture(selectedObject.uid);
                      setSelectedObject(null);
                    }}
                    title="Sell Furniture"
                    className="btn-press flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Sell +{formatCurrency(resaleValue)}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Selected Furniture Quick-Action Pill in Furnish Mode (Rotate / Upgrade / Sell) */}
      {isFurnishMode && selectedFurnishObj && selectedFurnishDef && (
        <div
          className="pointer-events-auto absolute top-20 right-4 z-30 max-w-md animate-target-pop"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="apple-glass-heavy flex flex-wrap items-center gap-2 rounded-2xl border border-sky-400/40 px-3.5 py-2.5 text-xs text-[var(--ink)] shadow-xl">
            <div className="flex items-center gap-2 pr-1">
              <span className="grid size-9 place-items-center rounded-xl bg-sky-500/15 text-2xl shadow-inner">
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
              title="Pack into Backpack (100% value preserved)"
            >
              <span>🎒 Pack</span>
            </button>

            {furnishUpgradeTargetDef && (
              <button
                onClick={() => {
                  buyFurniture(furnishUpgradeTargetDef.id);
                  setSelectedFurnishUid(selectedFurnishObj.uid);
                }}
                className="btn-press flex items-center gap-1 rounded-xl bg-[#007AFF] px-2.5 py-1.5 text-xs font-extrabold text-white shadow-xs"
              >
                <ArrowUpCircle className="size-3.5" />
                <span>
                  ⬆️ {furnishUpgradeTargetDef.emoji} ({formatCurrency(furnishUpgradeNetCost)})
                </span>
              </button>
            )}

            {objects.length > 3 && (
              <button
                onClick={() => {
                  sellFurniture(selectedFurnishObj.uid);
                  setSelectedFurnishUid(null);
                }}
                className="btn-press flex items-center gap-1 rounded-xl bg-rose-500/15 px-2.5 py-1.5 text-xs font-extrabold text-rose-600 hover:bg-rose-500/25 dark:text-rose-400"
              >
                <Trash2 className="size-3.5" />
                <span>Sell +{formatCurrency(furnishResaleValue)}</span>
              </button>
            )}

            <button
              onClick={() => setSelectedFurnishUid(null)}
              className="btn-press grid size-7 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
              title="Deselect"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Enlarged, Unclipped Apple visionOS NPC Popover */}
      {selectedNpc && (() => {
        const npcRel = relationships[selectedNpc.id];
        const npcScore = npcRel?.score ?? 12;
        const npcTrust = npcRel?.trust ?? 10;
        const npcRomance = npcRel?.romance ?? 5;
        const npcTierInfo = getRelationshipTierInfo(npcScore);
        const npcMilestones = getNpcMilestones(selectedNpc.id);
        const claimedIds = npcRel?.claimedMilestones || [];
        const nextMilestone = npcMilestones.find((m) => m.threshold > npcScore);
        const unclaimedMilestone = npcMilestones.find(
          (m) =>
            (npcScore >= m.threshold ||
              (npcRel?.unlockedMilestones || []).includes(m.id)) &&
            !claimedIds.includes(m.id)
        );
        const lastMsg =
          npcRel?.messages?.[npcRel.messages.length - 1]?.text || selectedNpc.greeting;
        const availTopics = getAvailableTopicsForNpc(
          selectedNpc.id,
          npcScore,
          npcRel?.completedTopics || []
        );
        const unlockedHighTier = NPC_INTERACTIONS.filter(
          (act) =>
            ['deepDive', 'hangout', 'referral', 'cofounderSync'].includes(act.id) &&
            npcScore >= act.minScore
        );

        return (
          <div
            className="absolute bottom-24 left-1/2 z-30 w-[calc(100%-24px)] max-w-md -translate-x-1/2"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="apple-glass-heavy rounded-3xl p-4 text-[var(--ink)] shadow-2xl space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Portrait
                    appearance={selectedNpc.appearance}
                    size={48}
                    ringColor={npcTierInfo.color}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-base font-extrabold text-[var(--ink)]">
                        {selectedNpc.name}
                      </h3>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold text-white shadow-xs"
                        style={{ backgroundColor: npcTierInfo.color }}
                      >
                        {npcTierInfo.status} · {npcScore}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-[var(--ink-soft)]">
                      {selectedNpc.role} · {selectedNpc.company}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                      <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-indigo-600 dark:text-indigo-300">
                        🤝 Trust {npcTrust}
                      </span>
                      <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-pink-600 dark:text-pink-300">
                        💖 Vibe {npcRomance}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNpc(null)}
                  className="btn-press grid size-8 shrink-0 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Next Milestone Progress Bar */}
              <div className="rounded-2xl bg-[var(--mist)] px-3 py-2">
                <div className="flex items-center justify-between text-[10px] font-extrabold">
                  <span className="text-[var(--ink-soft)]">
                    {nextMilestone
                      ? `Next Milestone: ${nextMilestone.emoji} ${nextMilestone.title}`
                      : '🏆 All 4 Milestones Unlocked!'}
                  </span>
                  <span style={{ color: npcTierInfo.color }}>
                    {nextMilestone ? `${npcScore}/${nextMilestone.threshold}%` : `${npcScore}%`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${
                        nextMilestone
                          ? Math.min(100, Math.round((npcScore / nextMilestone.threshold) * 100))
                          : 100
                      }%`,
                      backgroundColor: npcTierInfo.color,
                    }}
                  />
                </div>
              </div>

              {/* Latest Message Bubble */}
              <div className="rounded-2xl rounded-tl-xs bg-[var(--mist)] px-3 py-2 text-[11px] font-medium italic text-[var(--ink)]">
                “{lastMsg}”
              </div>

              {/* One-Tap Unclaimed Milestone Banner */}
              {unclaimedMilestone && (
                <button
                  onClick={() => {
                    claimRelationshipMilestone(selectedNpc.id, unclaimedMilestone.id);
                  }}
                  className="btn-press flex w-full animate-pulse items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 px-3.5 py-2 text-xs font-black text-white shadow-md"
                >
                  <span>
                    🏆 Claim Milestone Reward: {unclaimedMilestone.emoji}{' '}
                    {unclaimedMilestone.title}
                  </span>
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px]">
                    {unclaimedMilestone.perkLabel}
                  </span>
                </button>
              )}

              {/* Interaction Buttons Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    interactWithNpc(selectedNpc.id, 'linkedin');
                    setSelectedNpc(null);
                  }}
                  className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-extrabold text-[var(--ink)] hover:bg-[#007AFF]/15"
                >
                  <span>🤝 LinkedIn Sync</span>
                  <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] text-[#007AFF]">
                    +10
                  </span>
                </button>
                <button
                  onClick={() => {
                    interactWithNpc(selectedNpc.id, 'coffeeChat');
                    setSelectedNpc(null);
                  }}
                  className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-extrabold text-[var(--ink)] hover:bg-[#007AFF]/15"
                >
                  <span>☕ Cortado Chat</span>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-300">
                    +Charisma
                  </span>
                </button>
                <button
                  onClick={() => {
                    interactWithNpc(selectedNpc.id, 'whiteboard');
                    setSelectedNpc(null);
                  }}
                  className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-extrabold text-[var(--ink)] hover:bg-[#007AFF]/15"
                >
                  <span>📐 Arch Jam</span>
                  <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] text-indigo-600 dark:text-indigo-300">
                    +SysDesign
                  </span>
                </button>
                <button
                  onClick={() => {
                    interactWithNpc(selectedNpc.id, 'pitch');
                    setSelectedNpc(null);
                  }}
                  className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-extrabold text-[var(--ink)] hover:bg-[#007AFF]/15"
                >
                  <span>🚀 Pitch MVP</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-300">
                    +10% MVP
                  </span>
                </button>

                {/* Unlocked Higher-Tier Interactions (deepDive, hangout, referral, cofounderSync) */}
                {unlockedHighTier.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => {
                      interactWithNpc(selectedNpc.id, act.id);
                      setSelectedNpc(null);
                    }}
                    className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-extrabold text-[var(--ink)] hover:bg-[#007AFF]/15"
                  >
                    <span className="truncate">
                      {act.emoji} {act.shortLabel}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] text-white"
                      style={{ backgroundColor: act.accent }}
                    >
                      +{act.baseScoreDelta}
                    </span>
                  </button>
                ))}

                <button
                  onClick={() => {
                    interactWithNpc(selectedNpc.id, 'flirt');
                    setSelectedNpc(null);
                  }}
                  className="btn-press flex items-center justify-between rounded-2xl bg-pink-500/15 px-3 py-2 text-xs font-extrabold text-pink-600 dark:text-pink-400"
                >
                  <span>💖 Matcha Date</span>
                  <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold">
                    +16 Bond
                  </span>
                </button>

                <button
                  onClick={() => {
                    inviteNpcHangout(selectedNpc.id);
                    setSelectedNpc(null);
                  }}
                  className="btn-press flex items-center justify-between rounded-2xl bg-indigo-500/15 px-3 py-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-300"
                >
                  <span>📍 Spot Hangout</span>
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold">
                    +16 · +3⚡
                  </span>
                </button>

                {/* Open Full Circle & Topics Button */}
                <button
                  onClick={() => {
                    setActiveModal('sim', 'relationships');
                    setSelectedNpc(null);
                  }}
                  className="btn-press col-span-2 flex items-center justify-between rounded-2xl bg-[#007AFF] px-3.5 py-2.5 text-xs font-extrabold text-white shadow-sm"
                >
                  <span>🔎 Open Full Circle & Topics</span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10.5px] font-bold">
                    {availTopics.length > 0
                      ? `💬 ${availTopics.length} Topic Ready`
                      : 'Milestones & Gifts →'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
