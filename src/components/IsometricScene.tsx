import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACTIONS,
  FURNITURE_BY_ID,
  HOMES,
  LOCATION_BY_ID,
  NPCS,
} from '../data/worldData';
import {
  calculateOverallMood,
  formatCurrency,
  getHourOfDay,
  hasHomeBackupPower,
  isHomePowered,
  useGameStore,
} from '../store/useGameStore';
import { ActionDef, FurnitureDef, NeedKey, NPCDef, PlacedObject, VenueStation } from '../types/game';
import { Portrait } from './Portrait';
import {
  ArrowUpCircle,
  Compass,
  Minus,
  Plus,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

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
  const homeId = useGameStore((s) => s.homeId);
  const objects = useGameStore((s) => s.objects);
  const pos = useGameStore((s) => s.pos);
  const queue = useGameStore((s) => s.queue);
  const sim = useGameStore((s) => s.sim);
  const needs = useGameStore((s) => s.needs);
  const cash = useGameStore((s) => s.cash);
  const time = useGameStore((s) => s.time);
  const weather = useGameStore((s) => s.weather);
  const pgePowerOn = useGameStore((s) => s.pgePowerOn);
  const relationships = useGameStore((s) => s.relationships);
  const moveToTile = useGameStore((s) => s.moveToTile);
  const enqueueAction = useGameStore((s) => s.enqueueAction);
  const buyFurniture = useGameStore((s) => s.buyFurniture);
  const sellFurniture = useGameStore((s) => s.sellFurniture);
  const interactWithNpc = useGameStore((s) => s.interactWithNpc);
  const autoFixNeed = useGameStore((s) => s.autoFixNeed);
  const triggerMicroReward = useGameStore((s) => s.triggerMicroReward);

  const [selectedObject, setSelectedObject] = useState<PlacedObject | null>(null);
  const [selectedStation, setSelectedStation] = useState<VenueStation | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<NPCDef | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

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
  const [droneAvailable, setDroneAvailable] = useState<boolean>(true);
  const [droneHovered, setDroneHovered] = useState<boolean>(false);
  const [sparkleBurst, setSparkleBurst] = useState<{
    id: number;
    x: number;
    y: number;
    emoji: string;
    label: string;
  } | null>(null);

  const triggerSparkle = (x: number, y: number, emoji: string, label: string) => {
    const id = Date.now();
    setSparkleBurst({ id, x, y, emoji, label });
    window.setTimeout(() => {
      setSparkleBurst((curr) => (curr?.id === id ? null : curr));
    }, 1400);
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

  const state = useGameStore.getState();
  const moodInfo = calculateOverallMood(state);
  const powered = isHomePowered(state);
  const backupActive = !pgePowerOn && hasHomeBackupPower(state);

  const isHome = locationId === 'home';
  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const venueDef = !isHome ? LOCATION_BY_ID[locationId] : null;
  const gridSize = isHome ? homeDef.gridSize : 7;
  const floorStyle = isHome ? homeDef.floorStyle : venueDef?.floorStyle || 'concrete';

  const hour = getHourOfDay(time);
  const isNight = hour < 6 || hour >= 19.5;
  const isSunset = (hour >= 5.5 && hour < 7) || (hour >= 17.5 && hour < 19.5);

  const activeQueued = queue[0];
  const activeActionDef = activeQueued ? ACTIONS[activeQueued.actionId] : null;
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

  // NPCs present at this venue (or visiting hacker house)
  const npcsHere = isHome
    ? NPCS.slice(0, 1)
    : NPCS.filter(
        (n) =>
          n.favoriteSpot === locationId ||
          NPCS.indexOf(n) % 3 === Math.floor(time / 240) % 3
      );

  const getFloorColors = (x: number, y: number) => {
    const alt = (x + y) % 2 === 0;
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

  return (
    <div
      className={`relative h-full w-full overflow-hidden select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
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
              ? 'radial-gradient(circle at 50% 35%, rgba(56,189,248,0.12), rgba(15,23,42,0.55))'
              : isSunset
              ? 'radial-gradient(circle at 50% 35%, rgba(251,146,60,0.22), transparent 70%)'
              : 'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.45), transparent 70%)',
        }}
      />

      {/* Main Interactive Isometric SVG Canvas with Zoom & Pan */}
      <svg
        viewBox="0 0 900 580"
        className={`h-full w-full object-contain ${
          isDragging ? '' : 'transition-transform duration-150 ease-out'
        }`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
        onClick={() => {
          if (dragRef.current.moved) return;
          setSelectedObject(null);
          setSelectedStation(null);
          setSelectedNpc(null);
        }}
      >
        <defs>
          <linearGradient id="wallLeftGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isNight ? '#1E293B' : '#F8FAFC'} />
            <stop offset="100%" stopColor={isNight ? '#0F172A' : '#E2E8F0'} />
          </linearGradient>
          <linearGradient id="wallRightGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isNight ? '#334155' : '#F1F5F9'} />
            <stop offset="100%" stopColor={isNight ? '#1E293B' : '#CBD5E1'} />
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
          <clipPath id="bayWindowClip">
            <polygon
              points={`${backCorner.sx - 150},${backCorner.sy - 16} ${backCorner.sx - 35},${backCorner.sy - 74} ${backCorner.sx - 35},${backCorner.sy - 4} ${backCorner.sx - 150},${backCorner.sy + 54}`}
            />
          </clipPath>
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
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="1.5"
          />
          {/* Right Back Wall */}
          <polygon
            points={`${backCorner.sx},${backCorner.sy} ${rightCorner.sx},${rightCorner.sy} ${rightCorner.sx},${rightCorner.sy - WALL_H} ${backCorner.sx},${backCorner.sy - WALL_H}`}
            fill="url(#wallRightGrad)"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="1.5"
          />

          {/* Interactive Panoramic Bay Window with Golden Gate & Karl the Fog */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => setWindowHovered(true)}
            onMouseLeave={() => setWindowHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              if (dragRef.current.moved) return;
              triggerMicroReward({
                needKey: 'fun',
                needDelta: 16,
                toastText: 'Watched Karl the Fog roll over the Golden Gate (+16% Peace)',
                emoji: '🌉',
              });
              triggerSparkle(
                backCorner.sx - 92,
                backCorner.sy - 38,
                '🌉',
                '+16% Peace'
              );
            }}
          >
            <polygon
              points={`${backCorner.sx - 150},${backCorner.sy - 16} ${backCorner.sx - 35},${backCorner.sy - 74} ${backCorner.sx - 35},${backCorner.sy - 4} ${backCorner.sx - 150},${backCorner.sy + 54}`}
              fill="url(#bayWindowSky)"
              stroke={windowHovered ? '#38BDF8' : '#64748B'}
              strokeWidth={windowHovered ? '3' : '2.5'}
            />

            <g clipPath="url(#bayWindowClip)">
              {/* Twinkling Bay Stars & City Lights at Night */}
              {isNight && (
                <g>
                  <circle cx={backCorner.sx - 132} cy={backCorner.sy - 18} r="1.3" fill="#FDE047">
                    <animate
                      attributeName="opacity"
                      values="0.25;1;0.25"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle cx={backCorner.sx - 85} cy={backCorner.sy - 42} r="1.2" fill="#F8FAFC">
                    <animate
                      attributeName="opacity"
                      values="0.9;0.2;0.9"
                      dur="1.9s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle cx={backCorner.sx - 52} cy={backCorner.sy - 55} r="1.4" fill="#38BDF8">
                    <animate
                      attributeName="opacity"
                      values="0.3;1;0.3"
                      dur="2.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Distant SF / Marin shore lights */}
                  <circle cx={backCorner.sx - 135} cy={backCorner.sy + 26} r="1.2" fill="#FBBF24" />
                  <circle cx={backCorner.sx - 108} cy={backCorner.sy + 14} r="1.2" fill="#FDE047" />
                  <circle cx={backCorner.sx - 78} cy={backCorner.sy - 2} r="1.2" fill="#FBBF24" />
                </g>
              )}

              {/* Golden Gate Bridge Silhouette inside Window */}
              <line
                x1={backCorner.sx - 122}
                y1={backCorner.sy + 26}
                x2={backCorner.sx - 122}
                y2={backCorner.sy - 12}
                stroke="#EA580C"
                strokeWidth="3"
              />
              <line
                x1={backCorner.sx - 65}
                y1={backCorner.sy - 4}
                x2={backCorner.sx - 65}
                y2={backCorner.sy - 44}
                stroke="#EA580C"
                strokeWidth="3"
              />
              {/* Bridge Deck & Suspension Cables */}
              <line
                x1={backCorner.sx - 148}
                y1={backCorner.sy + 28}
                x2={backCorner.sx - 36}
                y2={backCorner.sy - 28}
                stroke="#C2410C"
                strokeWidth="2"
              />
              <path
                d={`M ${backCorner.sx - 146},${backCorner.sy + 18} Q ${backCorner.sx - 93},${backCorner.sy + 4} ${backCorner.sx - 40},${backCorner.sy - 36}`}
                fill="none"
                stroke="#EA580C"
                strokeWidth="2"
              />
              {/* Tower Aviation Beacons */}
              <circle cx={backCorner.sx - 122} cy={backCorner.sy - 13} r="1.8" fill="#EF4444">
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={backCorner.sx - 65} cy={backCorner.sy - 45} r="1.8" fill="#EF4444">
                <animate
                  attributeName="opacity"
                  values="1;0.3;1"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Animated Karl the Fog drifting softly across Golden Gate */}
              <g opacity={weather === 'foggy' ? 0.88 : 0.55}>
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
                <ellipse
                  cx={backCorner.sx - 76}
                  cy={backCorner.sy - 14}
                  rx="30"
                  ry="6.5"
                  fill="rgba(241,245,249,0.68)"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="14,-7; -16,8; 14,-7"
                    dur="12s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              </g>
            </g>

            {/* Hover Prompt Badge on Window */}
            {windowHovered && (
              <g transform={`translate(${backCorner.sx - 92}, ${backCorner.sy - 56})`}>
                <rect
                  x="-48"
                  y="-11"
                  width="96"
                  height="17"
                  rx="8.5"
                  fill="rgba(15,23,42,0.88)"
                  stroke="#38BDF8"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="0.5"
                  fill="#FFFFFF"
                  fontSize="8.5"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  🌉 Gaze (+16% Peace)
                </text>
              </g>
            )}
          </g>

          {/* Right Wall Sign / Location Header */}
          <g>
            <polygon
              points={`${backCorner.sx + 40},${backCorner.sy + 20 - 84} ${backCorner.sx + 165},${backCorner.sy + 82 - 84} ${backCorner.sx + 165},${backCorner.sy + 82 - 44} ${backCorner.sx + 40},${backCorner.sy + 20 - 44}`}
              fill={isNight ? '#0F172A' : '#1E293B'}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.5"
            />
            <text
              x={backCorner.sx + 102}
              y={backCorner.sy - 10}
              fill="#F8FAFC"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              transform="skewY(27)"
            >
              {isHome
                ? homeDef.name.toUpperCase().slice(0, 20)
                : venueDef?.shortName.toUpperCase()}
            </text>
          </g>
        </g>

        {/* Floating Waymo / Prime Air Delivery Drone Outside Balcony */}
        {droneAvailable && (
          <g
            transform={`translate(${backCorner.sx + 205}, ${backCorner.sy - 68})`}
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
                  karmaDelta: 2,
                  toastText:
                    'Drone Care Package! Blue Bottle Cold Brew + $140 Founder Rebate',
                  emoji: '🚁',
                });
                triggerSparkle(
                  backCorner.sx + 205,
                  backCorner.sy - 68,
                  '🚁',
                  '+$140 & +18% Fuel'
                );
              } else {
                triggerMicroReward({
                  needKey: 'energy',
                  needDelta: 22,
                  karmaDelta: 3,
                  toastText:
                    'AirDrop Care Package! Philz Mint Mojito + Tartine Bun (+22% Focus)',
                  emoji: '📦',
                });
                triggerSparkle(
                  backCorner.sx + 205,
                  backCorner.sy - 68,
                  '📦',
                  '+22% Focus'
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
                r={droneHovered ? '28' : '22'}
                fill="rgba(56,189,248,0.16)"
                stroke={droneHovered ? '#38BDF8' : 'rgba(56,189,248,0.35)'}
                strokeWidth="1.2"
              />
              {/* Spinning Rotor Disks */}
              <ellipse cx="-16" cy="-8" rx="9" ry="3" fill="rgba(148,163,184,0.65)" />
              <ellipse cx="16" cy="-8" rx="9" ry="3" fill="rgba(148,163,184,0.65)" />
              {/* Drone Struts & Body */}
              <line x1="-16" y1="-6" x2="16" y2="-6" stroke="#334155" strokeWidth="2.5" />
              <rect
                x="-11"
                y="-10"
                width="22"
                height="9"
                rx="4.5"
                fill="#F8FAFC"
                stroke="#0284C7"
                strokeWidth="1.5"
              />
              <circle cx="0" cy="-5.5" r="2.2" fill="#38BDF8" />
              {/* Dangling Care Package Box */}
              <line x1="-4" y1="-1" x2="-4" y2="7" stroke="#64748B" strokeWidth="1.2" />
              <line x1="4" y1="-1" x2="4" y2="7" stroke="#64748B" strokeWidth="1.2" />
              <rect
                x="-9"
                y="6"
                width="18"
                height="14"
                rx="3"
                fill="#F59E0B"
                stroke="#B45309"
                strokeWidth="1.2"
              />
              <text x="0" y="16" fontSize="10" textAnchor="middle">
                ☕
              </text>
              {/* Pill Label */}
              <g transform="translate(0, -24)">
                <rect
                  x="-44"
                  y="-10"
                  width="88"
                  height="15"
                  rx="7.5"
                  fill="rgba(15,23,42,0.85)"
                  stroke="#38BDF8"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="0.5"
                  fill="#FFFFFF"
                  fontSize="8"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  🚁 Tap Care Drop
                </text>
              </g>
            </g>
          </g>
        )}

        {/* Isometric Floor Tiles */}
        <g filter="url(#softShadow)">
          {Array.from({ length: gridSize }).map((_, y) =>
            Array.from({ length: gridSize }).map((__, x) => {
              const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
              const isSimHere = pos.x === x && pos.y === y;
              return (
                <polygon
                  key={`tile-${x}-${y}`}
                  points={tilePolygonPoints(x, y)}
                  fill={
                    isHovered
                      ? '#60A5FA'
                      : isSimHere
                      ? '#93C5FD'
                      : getFloorColors(x, y)
                  }
                  stroke="rgba(15,23,42,0.08)"
                  strokeWidth="1"
                  className="cursor-pointer transition-colors duration-150"
                  onMouseEnter={() => setHoveredTile({ x, y })}
                  onMouseLeave={() => setHoveredTile(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragRef.current.moved) return;
                    moveToTile(x, y);
                    setSelectedObject(null);
                    setSelectedStation(null);
                    setSelectedNpc(null);
                  }}
                />
              );
            })
          )}
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
                karmaDelta: 2,
                toastText: 'Matic Bot sanitized the floor! +12% Bio & +2 Karma',
                emoji: '🤖',
              });
              triggerSparkle(botScreen.sx, botScreen.sy - 18, '🤖', '+12% Bio · +2 Karma');
            }}
          >
            {/* Cleaning Sweep Aura */}
            <ellipse
              cx="0"
              cy="2"
              rx={botHovered ? '18' : '14'}
              ry={botHovered ? '9' : '7'}
              fill="rgba(56,189,248,0.22)"
              stroke={botHovered ? '#007AFF' : 'rgba(56,189,248,0.45)'}
              strokeWidth="1.2"
            />
            {/* Isometric Robot Body Cylinder */}
            <ellipse
              cx="0"
              cy="1"
              rx="11"
              ry="5.8"
              fill="#CBD5E1"
              stroke="#475569"
              strokeWidth="1"
            />
            <ellipse
              cx="0"
              cy="-2.5"
              rx="10.5"
              ry="5.5"
              fill="#F8FAFC"
              stroke="#64748B"
              strokeWidth="1"
            />
            {/* LiDAR Sensor Turret */}
            <circle
              cx="0"
              cy="-3.5"
              r="3"
              fill="#0284C7"
              stroke="#E0F2FE"
              strokeWidth="0.8"
            />
            <circle cx="2" cy="-4" r="1" fill="#34D399" />
            {botHovered && (
              <g transform="translate(0, -18)">
                <rect
                  x="-42"
                  y="-10"
                  width="84"
                  height="15"
                  rx="7.5"
                  fill="rgba(15,23,42,0.88)"
                  stroke="#38BDF8"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="0.5"
                  fill="#FFFFFF"
                  fontSize="8"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  🤖 Matic (+12% Bio)
                </text>
              </g>
            )}
          </g>
        )}

        {/* Home Placed Furniture Objects */}
        {isHome &&
          objects
            .slice()
            .sort((a, b) => a.x + a.y - (b.x + b.y))
            .map((placed) => {
              const def = FURNITURE_BY_ID[placed.objectId];
              if (!def) return null;
              const center = isoToScreen(placed.x + 0.5, placed.y + 0.5);
              const isSelected = selectedObject?.uid === placed.uid;
              const isInUse = activeQueued?.targetObjectUid === placed.uid;
              const hasUpgrade = Boolean(getNextUpgradeFurniture(def));

              return (
                <g
                  key={placed.uid}
                  transform={`translate(${center.sx}, ${center.sy})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragRef.current.moved) return;
                    setSelectedObject(placed);
                    setSelectedStation(null);
                    setSelectedNpc(null);
                  }}
                >
                  {/* Selection / Active Halo */}
                  {(isSelected || isInUse) && (
                    <ellipse
                      cx="0"
                      cy="4"
                      rx="30"
                      ry="16"
                      fill={isInUse ? 'rgba(52,199,89,0.28)' : 'rgba(0,122,255,0.28)'}
                      stroke={isInUse ? '#34C759' : '#007AFF'}
                      strokeWidth="2"
                    />
                  )}

                  {/* 3D Isometric Furniture Block Base */}
                  <polygon
                    points="0,-24 26,-11 0,2 -26,-11"
                    fill={def.accentColor}
                    stroke="rgba(15,23,42,0.2)"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="-26,-11 0,2 0,16 -26,3"
                    fill={def.color}
                    stroke="rgba(15,23,42,0.2)"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="26,-11 0,2 0,16 26,3"
                    fill={def.color}
                    opacity="0.85"
                    stroke="rgba(15,23,42,0.2)"
                    strokeWidth="1.2"
                  />

                  {/* Icon & Compact Label */}
                  <text x="0" y="-8" fontSize="20" textAnchor="middle">
                    {def.emoji}
                  </text>
                  <g transform="translate(0, -34)">
                    <rect
                      x="-38"
                      y="-11"
                      width="76"
                      height="16"
                      rx="8"
                      fill="rgba(15,23,42,0.75)"
                    />
                    <text
                      x="0"
                      y="0"
                      fill="#FFFFFF"
                      fontSize="8.5"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {def.name.split(' ')[0]} {def.name.split(' ')[1] || ''}
                      {hasUpgrade ? ' ⬆️' : ''}
                    </text>
                  </g>
                </g>
              );
            })}

        {/* Venue Interactive Stations */}
        {!isHome &&
          venueDef?.stations.map((st) => {
            const center = isoToScreen(st.x + 0.5, st.y + 0.5);
            const isSelected = selectedStation?.id === st.id;
            return (
              <g
                key={st.id}
                transform={`translate(${center.sx}, ${center.sy})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  setSelectedStation(st);
                  setSelectedNpc(null);
                }}
              >
                {isSelected && (
                  <ellipse
                    cx="0"
                    cy="4"
                    rx="34"
                    ry="18"
                    fill="rgba(0,122,255,0.28)"
                    stroke="#007AFF"
                    strokeWidth="2"
                  />
                )}
                <polygon
                  points="0,-26 28,-12 0,2 -28,-12"
                  fill={st.accent}
                  stroke="rgba(15,23,42,0.2)"
                  strokeWidth="1.2"
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
                <text x="0" y="-8" fontSize="22" textAnchor="middle">
                  {st.emoji}
                </text>
                <g transform="translate(0, -36)">
                  <rect
                    x="-48"
                    y="-12"
                    width="96"
                    height="17"
                    rx="8.5"
                    fill="rgba(15,23,42,0.8)"
                  />
                  <text
                    x="0"
                    y="-1"
                    fill="#FFFFFF"
                    fontSize="8.5"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {st.label.slice(0, 20)}
                  </text>
                </g>
              </g>
            );
          })}

        {/* NPCs in Scene */}
        {npcsHere.map((npc, idx) => {
          const npcX = isHome ? gridSize - 1 : (idx * 2 + 1) % (gridSize - 1);
          const npcY = isHome ? 2 : (idx * 3 + 4) % (gridSize - 1);
          const pt = isoToScreen(npcX + 0.5, npcY + 0.5);
          const rel = relationships[npc.id];
          return (
            <g
              key={npc.id}
              transform={`translate(${pt.sx}, ${pt.sy})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (dragRef.current.moved) return;
                setSelectedNpc(npc);
                setSelectedObject(null);
                setSelectedStation(null);
              }}
            >
              <ellipse cx="0" cy="6" rx="14" ry="7" fill="rgba(15,23,42,0.22)" />
              {/* Body */}
              <path d="M-9,4 L-7,-18 L7,-18 L9,4 Z" fill={npc.appearance.topColor} />
              {/* Head */}
              <circle cx="0" cy="-26" r="8.5" fill={npc.appearance.skin} />
              <path d="M-8,-28 Q0,-37 8,-28" fill={npc.appearance.hairColor} />
              {/* Name Pill */}
              <g transform="translate(0, -44)">
                <rect
                  x="-42"
                  y="-11"
                  width="84"
                  height="16"
                  rx="8"
                  fill="rgba(255,255,255,0.9)"
                  stroke="rgba(0,122,255,0.4)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="0"
                  fill="#0F172A"
                  fontSize="8.5"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  💬 {npc.name.split(' ')[0]} {rel && rel.score >= 38 ? '★' : ''}
                </text>
              </g>
            </g>
          );
        })}

        {/* Player Sim Character */}
        <g
          transform={`translate(${simScreen.sx}, ${simScreen.sy})`}
          className="transition-transform duration-300 ease-out"
        >
          {/* Floor Shadow */}
          <ellipse cx="0" cy="6" rx="16" ry="8" fill="rgba(15,23,42,0.28)" />

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

          {/* Floating Activity Particles when executing queue[0] */}
          {activeActionDef &&
            activityParticles.map((particle, idx) => {
              const xOffset = (idx - 1) * 20;
              const beginSec = `${idx * 0.65}s`;
              return (
                <g key={`particle-${idx}`} transform={`translate(${xOffset}, -54)`}>
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0,0; 0,-36"
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
                      fontSize="11"
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

          {/* Active Action Speech Bubble */}
          {activeActionDef && (
            <g transform="translate(0, -74)">
              <rect
                x="-64"
                y="-14"
                width="128"
                height="20"
                rx="10"
                fill="rgba(255,255,255,0.95)"
                stroke="#007AFF"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="-1"
                fill="#0F172A"
                fontSize="9"
                fontWeight="700"
                textAnchor="middle"
              >
                {activeActionDef.speechBubble ||
                  `${activeActionDef.emoji} ${activeActionDef.label.slice(0, 18)}`}
              </text>
            </g>
          )}

          {/* Clickable Sim Low-Need Thought Bubble (when any need < 35) */}
          {lowestAlertNeed && (
            <g
              transform={`translate(0, ${activeActionDef ? -100 : -76})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (dragRef.current.moved) return;
                autoFixNeed(lowestAlertNeed.key);
                triggerSparkle(
                  simScreen.sx,
                  simScreen.sy - 64,
                  NEED_BADGE_META[lowestAlertNeed.key].emoji,
                  `Auto-Fixing ${NEED_BADGE_META[lowestAlertNeed.key].shortLabel}!`
                );
              }}
            >
              {/* Thought bubble connector dots */}
              {!activeActionDef && (
                <>
                  <circle cx="-4" cy="11" r="2" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="1" />
                  <circle cx="-1" cy="6" r="2.8" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="1" />
                </>
              )}
              <rect
                x="-76"
                y="-15"
                width="152"
                height="22"
                rx="11"
                fill="rgba(255,255,255,0.97)"
                stroke="#F59E0B"
                strokeWidth="1.8"
              />
              <text
                x="0"
                y="-1"
                fill="#B45309"
                fontSize="9"
                fontWeight="800"
                textAnchor="middle"
              >
                {NEED_BADGE_META[lowestAlertNeed.key].alertText}
              </text>
            </g>
          )}
        </g>

        {/* Visual Sparkle Burst Feedback Overlay */}
        {sparkleBurst && (
          <g
            key={sparkleBurst.id}
            transform={`translate(${sparkleBurst.x}, ${sparkleBurst.y})`}
            pointerEvents="none"
          >
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,-28"
                dur="1.3s"
                fill="freeze"
              />
              <animate
                attributeName="opacity"
                values="1;1;0"
                dur="1.3s"
                fill="freeze"
              />
              <circle cx="-18" cy="-6" r="2.5" fill="#FBBF24" />
              <circle cx="20" cy="-8" r="2.5" fill="#38BDF8" />
              <circle cx="0" cy="-20" r="3" fill="#34D399" />
              <rect
                x="-58"
                y="-14"
                width="116"
                height="20"
                rx="10"
                fill="rgba(15,23,42,0.9)"
                stroke="#34D399"
                strokeWidth="1.4"
              />
              <text
                x="0"
                y="-1"
                fill="#ECFDF5"
                fontSize="9"
                fontWeight="800"
                textAnchor="middle"
              >
                ✨ {sparkleBurst.emoji} {sparkleBurst.label}
              </text>
            </g>
          </g>
        )}

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

      {/* Ambient Venue Vibes Strip (Stacked above Camera Controls on non-home venues) */}
      {!isHome && venueDef && (
        <div className="pointer-events-none absolute bottom-36 left-4 z-10 hidden max-w-xs sm:block">
          <div className="apple-pill rounded-2xl px-3.5 py-2 text-xs">
            <div className="font-semibold text-[#007AFF]">
              {venueDef.emoji} {venueDef.name} · {venueDef.district}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
              {venueDef.vibes[Math.floor(time / 60) % venueDef.vibes.length]}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Camera Zoom & Pan Controls Pill (Bottom-Left) */}
      <div
        className=" absolute bottom-24 left-4 z-20 flex items-center gap-1 rounded-full px-2 py-1 apple-pill shadow-sm"
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
          onClick={() => setZoom(1)}
          title="Reset Zoom"
          className="btn-press min-w-[42px] px-1 text-center text-[11px] font-bold tabular-nums"
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
        <div className="mx-0.5 h-3.5 w-px bg-black/10 dark:bg-white/15" />
        <button
          onClick={resetCamera}
          title="Center Room Camera"
          className="btn-press flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#007AFF] hover:bg-[#007AFF]/10"
        >
          <Compass className="size-3" />
          <span>🏠 Center</span>
        </button>
      </div>

      {/* Backup Battery Active Pill */}
      {isHome && backupActive && (
        <div className="pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2">
          <div className="apple-pill flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Zap className="size-3.5 fill-current" />
            PG&E Grid Down · Backup Battery 100%
          </div>
        </div>
      )}

      {/* Ultra-Clean Apple visionOS Action Popover (Furniture or Venue Station) */}
      {(selectedObject || selectedStation) && (
        <div
          className="absolute bottom-24 left-1/2 z-30 w-[calc(100%-24px)] max-w-sm -translate-x-1/2"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="apple-glass-heavy rounded-3xl p-3.5 shadow-2xl">
            {/* Compact Header: Big Emoji + Concise Title + Tier Badge */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--mist)] text-2xl shadow-inner">
                  {selectedFurnitureDef ? selectedFurnitureDef.emoji : selectedStation?.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-bold">
                      {selectedFurnitureDef ? selectedFurnitureDef.name : selectedStation?.label}
                    </h3>
                    {selectedFurnitureDef ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          getFurnitureTier(selectedFurnitureDef.quality).badgeClass
                        }`}
                      >
                        {getFurnitureTier(selectedFurnitureDef.quality).label}
                      </span>
                    ) : (
                      <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-300">
                        Tier 2 · Venue
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--ink-soft)]">
                    {selectedFurnitureDef ? (
                      <span>{'★'.repeat(selectedFurnitureDef.quality)} Quality</span>
                    ) : (
                      <span>
                        {venueDef?.emoji} {venueDef?.shortName}
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
                className="btn-press grid size-7 shrink-0 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Compact Action Pills with Visual Stat Impact Badges */}
            <div className="mt-3 grid gap-1.5">
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
                  }))
                  .filter((item) => item.val !== 0);

                return (
                  <button
                    key={act.id}
                    onClick={() => {
                      enqueueAction(act.id, {
                        objectUid: selectedObject?.uid,
                        stationId: selectedStation?.id,
                      });
                      setSelectedObject(null);
                      setSelectedStation(null);
                    }}
                    className="btn-press flex items-center justify-between gap-2 rounded-2xl bg-[var(--mist)] px-3 py-2 text-left transition-colors hover:bg-[#007AFF]/12"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{act.emoji}</span>
                      <span className="truncate text-xs font-bold">{act.label}</span>
                    </div>

                    {/* Visual Stat Impact Badges */}
                    <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                      {needBadges.slice(0, 2).map((nb) => (
                        <span
                          key={nb.key}
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            nb.val > 0
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                          }`}
                        >
                          {nb.emoji} {nb.val > 0 ? `+${nb.val}` : nb.val}
                        </span>
                      ))}
                      {act.earn && (
                        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                          💵 +${act.earn[1]}
                        </span>
                      )}
                      {act.cost && (
                        <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                          💳 -${act.cost}
                        </span>
                      )}
                      {act.skillGain && (
                        <span className="rounded-full bg-[#007AFF]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#007AFF]">
                          🧠 +{act.skillGain.skill.slice(0, 6)}
                        </span>
                      )}
                      {act.startupProgress && (
                        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                          🚀 +{act.startupProgress}%
                        </span>
                      )}
                      <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ink-soft)] dark:bg-white/10">
                        ⏱ {act.durationMinutes}m
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 1-Click Furniture Upgrade & Sell Footer */}
            {selectedObject && (upgradeTargetDef || objects.length > 3) && (
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-black/5 pt-2.5 dark:border-white/10">
                {upgradeTargetDef ? (
                  <button
                    onClick={handleUpgradeFurniture}
                    className="btn-press flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#007AFF] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-95"
                  >
                    <ArrowUpCircle className="size-3.5" />
                    <span>
                      ⬆️ Upgrade ({formatCurrency(upgradeNetCost)}) · {upgradeTargetDef.emoji}{' '}
                      {upgradeTargetDef.name.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </button>
                ) : (
                  <span />
                )}

                {objects.length > 3 && (
                  <button
                    onClick={() => {
                      sellFurniture(selectedObject.uid);
                      setSelectedObject(null);
                    }}
                    title="Sell Furniture"
                    className="btn-press flex items-center gap-1 rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="size-3.5" />
                    <span>+{formatCurrency(resaleValue)}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ultra-Clean Apple visionOS NPC Popover */}
      {selectedNpc && (
        <div
          className="absolute bottom-24 left-1/2 z-30 w-[calc(100%-24px)] max-w-sm -translate-x-1/2"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="apple-glass-heavy rounded-3xl p-3.5 shadow-2xl">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Portrait appearance={selectedNpc.appearance} size={44} ringColor="#007AFF" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-bold">{selectedNpc.name}</h3>
                    <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-bold text-[#007AFF]">
                      {relationships[selectedNpc.id]?.status || 'Stranger'} ·{' '}
                      {relationships[selectedNpc.id]?.score || 10}
                    </span>
                  </div>
                  <p className="truncate text-[11px] font-medium text-[var(--ink-soft)]">
                    {selectedNpc.role} · {selectedNpc.company}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNpc(null)}
                className="btn-press grid size-7 shrink-0 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'linkedin');
                  setSelectedNpc(null);
                }}
                className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-2.5 py-2 text-xs font-bold hover:bg-[#007AFF]/15"
              >
                <span>🤝 LinkedIn</span>
                <span className="rounded-full bg-[#007AFF]/15 px-1.5 py-0.5 text-[10px] text-[#007AFF]">
                  💬 +10
                </span>
              </button>
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'coffeeChat');
                  setSelectedNpc(null);
                }}
                className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-2.5 py-2 text-xs font-bold hover:bg-[#007AFF]/15"
              >
                <span>☕ Cortado</span>
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-300">
                  🗣️ +Cha
                </span>
              </button>
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'whiteboard');
                  setSelectedNpc(null);
                }}
                className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-2.5 py-2 text-xs font-bold hover:bg-[#007AFF]/15"
              >
                <span>📐 Arch Jam</span>
                <span className="rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[10px] text-indigo-600 dark:text-indigo-300">
                  🧠 +Sys
                </span>
              </button>
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'pitch');
                  setSelectedNpc(null);
                }}
                className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-2.5 py-2 text-xs font-bold hover:bg-[#007AFF]/15"
              >
                <span>🚀 Pitch MVP</span>
                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-300">
                  🚀 +10%
                </span>
              </button>
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'flirt');
                  setSelectedNpc(null);
                }}
                className="btn-press col-span-2 flex items-center justify-between rounded-2xl bg-pink-500/12 px-3 py-2 text-xs font-bold text-pink-600 dark:text-pink-400"
              >
                <span>💖 Single-Origin Matcha Date</span>
                <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold">
                  ❤️ +16 Bond · 🎮 +12
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
