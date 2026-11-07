import React, { useState } from 'react';
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
import { NPCDef, PlacedObject, VenueStation } from '../types/game';
import { Portrait } from './Portrait';
import { Sparkles, Trash2, Zap, MessageCircle, Heart, Code, Coffee, Briefcase, X } from 'lucide-react';

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

export const IsometricScene: React.FC = () => {
  const locationId = useGameStore((s) => s.locationId);
  const homeId = useGameStore((s) => s.homeId);
  const objects = useGameStore((s) => s.objects);
  const pos = useGameStore((s) => s.pos);
  const queue = useGameStore((s) => s.queue);
  const sim = useGameStore((s) => s.sim);
  const time = useGameStore((s) => s.time);
  const weather = useGameStore((s) => s.weather);
  const pgePowerOn = useGameStore((s) => s.pgePowerOn);
  const relationships = useGameStore((s) => s.relationships);
  const moveToTile = useGameStore((s) => s.moveToTile);
  const enqueueAction = useGameStore((s) => s.enqueueAction);
  const sellFurniture = useGameStore((s) => s.sellFurniture);
  const interactWithNpc = useGameStore((s) => s.interactWithNpc);

  const [selectedObject, setSelectedObject] = useState<PlacedObject | null>(null);
  const [selectedStation, setSelectedStation] = useState<VenueStation | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<NPCDef | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

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

  // NPCs present at this venue (or visiting hacker house)
  const npcsHere = isHome
    ? NPCS.slice(0, 1) // A housemate/neighbor available to chat near the door
    : NPCS.filter((n) => n.favoriteSpot === locationId || NPCS.indexOf(n) % 3 === Math.floor(time / 240) % 3);

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
    // campus
    return alt ? '#DBEAFE' : '#BFDBFE';
  };

  const simScreen = isoToScreen(pos.x + 0.5, pos.y + 0.5);

  // Wall endpoints for isometric room box
  const backCorner = isoToScreen(0, 0);
  const leftCorner = isoToScreen(0, gridSize);
  const rightCorner = isoToScreen(gridSize, 0);
  const WALL_H = 128;

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
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

      {/* Main Interactive Isometric SVG Canvas */}
      <svg
        viewBox="0 0 900 580"
        className="h-full w-full object-contain"
        onClick={() => {
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
              stopColor={isNight ? '#0F172A' : isSunset ? '#FB7185' : '#38BDF8'}
            />
            <stop
              offset="100%"
              stopColor={isNight ? '#1E1B4B' : isSunset ? '#FBBF24' : '#BAE6FD'}
            />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.18" />
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

          {/* Panoramic Bay Window with Golden Gate Silhouette on Left Wall */}
          <g>
            <polygon
              points={`${backCorner.sx - 150},${backCorner.sy + 76 - 92} ${backCorner.sx - 35},${backCorner.sy + 18 - 92} ${backCorner.sx - 35},${backCorner.sy + 18 - 22} ${backCorner.sx - 150},${backCorner.sy + 76 - 22}`}
              fill="url(#bayWindowSky)"
              stroke="#64748B"
              strokeWidth="2.5"
            />
            {/* Golden Gate Bridge Mini Silhouette inside Window */}
            <line
              x1={backCorner.sx - 122}
              y1={backCorner.sy - 20}
              x2={backCorner.sx - 122}
              y2={backCorner.sy - 54}
              stroke="#EA580C"
              strokeWidth="2.5"
            />
            <line
              x1={backCorner.sx - 65}
              y1={backCorner.sy - 48}
              x2={backCorner.sx - 65}
              y2={backCorner.sy - 82}
              stroke="#EA580C"
              strokeWidth="2.5"
            />
            <path
              d={`M ${backCorner.sx - 145},${backCorner.sy - 16} Q ${backCorner.sx - 93},${backCorner.sy - 30} ${backCorner.sx - 40},${backCorner.sy - 55}`}
              fill="none"
              stroke="#EA580C"
              strokeWidth="2"
            />
            {weather === 'foggy' && (
              <ellipse
                cx={backCorner.sx - 92}
                cy={backCorner.sy - 28}
                rx="46"
                ry="10"
                fill="rgba(255,255,255,0.65)"
              />
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
              transform={`skewY(27)`}
            >
              {isHome ? homeDef.name.toUpperCase().slice(0, 20) : venueDef?.shortName.toUpperCase()}
            </text>
          </g>
        </g>

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

              return (
                <g
                  key={placed.uid}
                  transform={`translate(${center.sx}, ${center.sy})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
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

                  {/* Icon & Label */}
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
                      fill="rgba(15,23,42,0.72)"
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
          const npcY = isHome ? 2 : ((idx * 3 + 4) % (gridSize - 1));
          const pt = isoToScreen(npcX + 0.5, npcY + 0.5);
          const rel = relationships[npc.id];
          return (
            <g
              key={npc.id}
              transform={`translate(${pt.sx}, ${pt.sy})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
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
              <path
                d="M-8,-28 Q0,-37 8,-28"
                fill={npc.appearance.hairColor}
              />
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

          {/* Torso / Patagonia or Hoodie */}
          <path
            d="M-10,-5 L-8,-24 Q0,-27 8,-24 L10,-5 Z"
            fill={sim.appearance.topColor}
          />
          {sim.appearance.outfit === 'patagonia' && (
            <path d="M-7,-5 L-6,-23 L6,-23 L7,-5 Z" fill="#1E293B" opacity="0.7" />
          )}

          {/* Head */}
          <circle cx="0" cy="-32" r="9.5" fill={sim.appearance.skin} />
          <path
            d="M-9,-34 Q0,-45 9,-34 Z"
            fill={sim.appearance.hairColor}
          />

          {/* Floating Plumbob / Flow State Diamond */}
          <polygon
            points="0,-58 6,-50 0,-42 -6,-50"
            fill={moodInfo.color}
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />

          {/* Active Action Speech Bubble */}
          {activeActionDef && (
            <g transform="translate(0, -74)">
              <rect
                x="-68"
                y="-15"
                width="136"
                height="22"
                rx="11"
                fill="rgba(255,255,255,0.95)"
                stroke="#007AFF"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="-1"
                fill="#0F172A"
                fontSize="9.5"
                fontWeight="700"
                textAnchor="middle"
              >
                {activeActionDef.speechBubble || `${activeActionDef.emoji} ${activeActionDef.label.slice(0, 18)}`}
              </text>
            </g>
          )}
        </g>

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

      {/* Ambient Venue Vibes Strip (Bottom Left above Dock) */}
      {!isHome && venueDef && (
        <div className="pointer-events-none absolute bottom-24 left-4 z-10 hidden max-w-xs sm:block">
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

      {/* Backup Battery Active Pill */}
      {isHome && backupActive && (
        <div className="pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2">
          <div className="apple-pill flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Zap className="size-3.5 fill-current" />
            PG&E Grid Down · Backup Battery Running Home At 100%
          </div>
        </div>
      )}

      {/* Contextual Action Sheet for Clicked Furniture or Venue Station */}
      {(selectedObject || selectedStation) && (
        <div className=" absolute bottom-24 left-1/2 z-30 w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div className="apple-glass-heavy rounded-3xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-[var(--mist)] text-2xl">
                  {selectedObject
                    ? FURNITURE_BY_ID[selectedObject.objectId]?.emoji
                    : selectedStation?.emoji}
                </span>
                <div>
                  <h3 className="text-sm font-bold">
                    {selectedObject
                      ? FURNITURE_BY_ID[selectedObject.objectId]?.name
                      : selectedStation?.label}
                  </h3>
                  <p className="text-xs text-[var(--ink-soft)]">
                    {selectedObject
                      ? FURNITURE_BY_ID[selectedObject.objectId]?.subtitle
                      : venueDef?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedObject(null);
                  setSelectedStation(null);
                }}
                className="btn-press grid size-7 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {(selectedObject
                ? FURNITURE_BY_ID[selectedObject.objectId]?.actions || []
                : selectedStation?.actionIds || []
              ).map((actId) => {
                const act = ACTIONS[actId];
                if (!act) return null;
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
                    className="btn-press flex items-center justify-between rounded-2xl bg-[var(--mist)] px-3.5 py-2.5 text-left hover:bg-[#007AFF]/12"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{act.emoji}</span>
                      <div>
                        <div className="text-xs font-semibold">{act.label}</div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-soft)]">
                          <span>⏱ {act.durationMinutes}m</span>
                          {act.cost ? <span>· {formatCurrency(act.cost)}</span> : null}
                          {act.earn ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              · Earn ${act.earn[0]}–${act.earn[1]}
                            </span>
                          ) : null}
                          {act.skillGain ? (
                            <span className="font-semibold text-[#007AFF]">
                              · +{act.skillGain.skill}
                            </span>
                          ) : null}
                          {act.startupProgress ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              · +{act.startupProgress}% Startup MVP
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <Sparkles className="size-4 text-[#007AFF]" />
                  </button>
                );
              })}
            </div>

            {selectedObject && objects.length > 3 && (
              <div className="mt-3 flex justify-end border-t border-black/5 pt-2.5 dark:border-white/10">
                <button
                  onClick={() => {
                    sellFurniture(selectedObject.uid);
                    setSelectedObject(null);
                  }}
                  className="btn-press flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-rose-500 hover:bg-rose-500/10"
                >
                  <Trash2 className="size-3.5" />
                  Sell for{' '}
                  {formatCurrency(
                    Math.round((FURNITURE_BY_ID[selectedObject.objectId]?.price || 300) * 0.65)
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contextual NPC Networking & Social Sheet */}
      {selectedNpc && (
        <div className="absolute bottom-24 left-1/2 z-30 w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div className="apple-glass-heavy rounded-3xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Portrait appearance={selectedNpc.appearance} size={48} ringColor="#007AFF" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{selectedNpc.name}</h3>
                    <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#007AFF]">
                      {relationships[selectedNpc.id]?.status || 'Stranger'} (
                      {relationships[selectedNpc.id]?.score || 10}/100)
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[var(--ink-soft)]">
                    {selectedNpc.role} · {selectedNpc.company}
                  </p>
                  <p className="mt-0.5 text-[11px] italic text-[var(--ink-soft)]">
                    "{selectedNpc.greeting}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNpc(null)}
                className="btn-press grid size-7 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'linkedin');
                  setSelectedNpc(null);
                }}
                className="btn-press flex items-center gap-2 rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-semibold hover:bg-[#007AFF]/15"
              >
                <MessageCircle className="size-4 text-[#007AFF]" />
                Swap LinkedIn & Intro
              </button>
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'coffeeChat');
                  setSelectedNpc(null);
                }}
                className="btn-press flex items-center gap-2 rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-semibold hover:bg-[#007AFF]/15"
              >
                <Coffee className="size-4 text-amber-500" />
                Coffee Chat (+Charisma)
              </button>
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'whiteboard');
                  setSelectedNpc(null);
                }}
                className="btn-press flex items-center gap-2 rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-semibold hover:bg-[#007AFF]/15"
              >
                <Code className="size-4 text-indigo-500" />
                Whiteboard System Design
              </button>
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'pitch');
                  setSelectedNpc(null);
                }}
                className="btn-press flex items-center gap-2 rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-semibold hover:bg-[#007AFF]/15"
              >
                <Briefcase className="size-4 text-emerald-500" />
                Pitch Startup Wedge
              </button>
              <button
                onClick={() => {
                  interactWithNpc(selectedNpc.id, 'flirt');
                  setSelectedNpc(null);
                }}
                className="btn-press col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-pink-500/12 px-3 py-2 text-xs font-semibold text-pink-600 dark:text-pink-400"
              >
                <Heart className="size-4 fill-current" />
                Flirt over Single-Origin Matcha (+16 Bond)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

