import React, { useState } from 'react';
import {
  ACTIONS,
  COMMUTE_MODES,
  HOMES,
  LOCATIONS,
  NPCS,
} from '../data/worldData';
import { formatCurrency, useGameStore } from '../store/useGameStore';
import { ActionDef, CommuteModeId, LocationDef } from '../types/game';
import { Home, X, Check, MapPin, Rocket, Users, Clock } from 'lucide-react';

function getActionStatBadge(act: ActionDef): string {
  if (act.startupProgress) return `🚀 +${act.startupProgress}% MVP`;
  if (act.skillGain) {
    const skillNames: Record<string, string> = {
      coding: 'Code',
      systemDesign: 'SysDesign',
      aiResearch: 'AI',
      charisma: 'Pitch',
      hustle: 'Hustle',
      fitness: 'Fitness',
      cooking: 'Brew',
      investing: 'Alpha',
    };
    return `📈 +${act.skillGain.amount} ${skillNames[act.skillGain.skill] || act.skillGain.skill}`;
  }
  const nd = act.needsDelta || {};
  if ((nd.energy || 0) >= 25) return `☕ +${nd.energy} Focus`;
  if ((nd.hunger || 0) >= 35) return `🥗 +${nd.hunger} Fuel`;
  if ((nd.fun || 0) >= 30) return `🎉 +${nd.fun} Vibe`;
  if ((nd.hygiene || 0) >= 50) return `🧖 +${nd.hygiene} Recovery`;
  if ((nd.social || 0) >= 20) return `💬 +${nd.social} Social`;
  return `⚡ ${act.durationMinutes}m`;
}

export const WorldMapModal: React.FC = () => {
  const locationId = useGameStore((s) => s.locationId);
  const homeId = useGameStore((s) => s.homeId);
  const cash = useGameStore((s) => s.cash);
  const objects = useGameStore((s) => s.objects);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const setView = useGameStore((s) => s.setView);
  const travelTo = useGameStore((s) => s.travelTo);

  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];

  const [selectedLoc, setSelectedLoc] = useState<LocationDef | 'home'>(
    locationId === 'home' ? LOCATIONS[0] : 'home'
  );
  const [selectedMode, setSelectedMode] = useState<CommuteModeId>(
    ownedCars.includes('tesla') ? 'tesla' : 'waymo'
  );
  const [districtFilter, setDistrictFilter] = useState<string>('All');

  const districts = ['All', 'San Francisco', 'Peninsula', 'South Bay'];
  const filteredLocations =
    districtFilter === 'All'
      ? LOCATIONS
      : LOCATIONS.filter((l) => l.district === districtFilter);

  const targetId = selectedLoc === 'home' ? 'home' : selectedLoc.id;
  const isAlreadyHere = targetId === locationId;
  const activeModeDef = COMMUTE_MODES.find((m) => m.id === selectedMode) || COMMUTE_MODES[0];

  const venueNpcs =
    selectedLoc === 'home'
      ? []
      : NPCS.filter((n) => n.favoriteSpot === selectedLoc.id);

  const venueActions =
    selectedLoc === 'home'
      ? []
      : Array.from(
          new Set(selectedLoc.stations.flatMap((st) => st.actionIds))
        )
          .map((id) => ACTIONS[id])
          .filter(Boolean);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#dbeafe] dark:bg-[#0f172a]">
      {/* Top Floating Map Header */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <div className="apple-pill flex items-center gap-2.5 rounded-full px-4 py-2">
          <MapPin className="size-4 text-[#007AFF]" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold tracking-tight">Bay Area Live Map</span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(cash)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {districts.map((d) => (
            <button
              key={d}
              onClick={() => setDistrictFilter(d)}
              className={`btn-press rounded-full px-3 py-1.5 text-xs font-semibold ${
                districtFilter === d
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'apple-pill text-[var(--ink)]'
              }`}
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setView('live')}
            className="apple-pill btn-press ml-1 grid size-8 place-items-center rounded-full"
            aria-label="Close map"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Split View: Interactive Animated Bay Area Vector Map + Compact Bento Card */}
      <div className="relative z-10 grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-12">
        {/* Stylized San Francisco Bay Area SVG Map */}
        <div className="apple-glass relative min-h-[270px] overflow-hidden rounded-3xl lg:col-span-7">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.58" />
              </linearGradient>
              <path id="caltrainRoute" d="M 33,26 Q 40,52 64,82" />
              <path id="bayBridgeRoute" d="M 37,25 L 58,22" />
              <path id="sanMateoRoute" d="M 46,53 L 68,46" />
              <path id="i280Route" d="M 25,31 Q 34,58 56,84" />
            </defs>

            {/* Bay & Pacific Water */}
            <rect width="100" height="100" fill="url(#waterGrad)" />

            {/* Animated Golden Gate & Bay Water Waves */}
            <g stroke="#E0F2FE" strokeWidth="0.35" fill="none" opacity="0.55">
              <path d="M 6,18 Q 11,16.5 16,18 T 26,18">
                <animate
                  attributeName="d"
                  dur="4s"
                  repeatCount="indefinite"
                  values="M 6,18 Q 11,16.5 16,18 T 26,18; M 6,18 Q 11,19.5 16,18 T 26,18; M 6,18 Q 11,16.5 16,18 T 26,18"
                />
              </path>
              <path d="M 44,36 Q 49,34.5 54,36 T 64,36">
                <animate
                  attributeName="d"
                  dur="5s"
                  repeatCount="indefinite"
                  values="M 44,36 Q 49,34.5 54,36 T 64,36; M 44,36 Q 49,37.5 54,36 T 64,36; M 44,36 Q 49,34.5 54,36 T 64,36"
                />
              </path>
              <path d="M 52,60 Q 57,58.5 62,60 T 72,60">
                <animate
                  attributeName="d"
                  dur="4.5s"
                  repeatCount="indefinite"
                  values="M 52,60 Q 57,58.5 62,60 T 72,60; M 52,60 Q 57,61.5 62,60 T 72,60; M 52,60 Q 57,58.5 62,60 T 72,60"
                />
              </path>
            </g>

            {/* Marin Headlands (North) */}
            <path
              d="M 8,0 L 36,0 L 32,14 L 18,16 L 8,8 Z"
              fill="#A7F3D0"
              opacity="0.75"
              stroke="#10B981"
              strokeWidth="0.4"
            />

            {/* SF Peninsula & South Bay Landmass */}
            <path
              d="M 18,22 L 38,20 L 42,45 L 55,68 L 78,76 L 92,100 L 12,100 L 14,50 Z"
              fill="#ECFDF5"
              className="dark:fill-slate-800"
              stroke="#10B981"
              strokeWidth="0.5"
            />

            {/* East Bay (Oakland / Berkeley / Fremont) */}
            <path
              d="M 55,0 L 100,0 L 100,90 L 82,74 L 66,44 L 54,18 Z"
              fill="#ECFDF5"
              className="dark:fill-slate-800"
              stroke="#10B981"
              strokeWidth="0.5"
            />

            {/* Iconic Bridges & Transit Corridors */}
            {/* Golden Gate Bridge + Towers */}
            <line x1="25" y1="14" x2="25" y2="22" stroke="#EA580C" strokeWidth="1.4" />
            <circle cx="25" cy="16" r="0.8" fill="#FB923C">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="25" cy="20" r="0.8" fill="#FB923C">
              <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Bay Bridge */}
            <use href="#bayBridgeRoute" stroke="#94A3B8" strokeWidth="0.9" strokeDasharray="1.5,1" />
            {/* San Mateo Bridge */}
            <use href="#sanMateoRoute" stroke="#94A3B8" strokeWidth="0.7" strokeDasharray="1.5,1" />
            {/* I-280 Scenic Corridor */}
            <use href="#i280Route" fill="none" stroke="#10B981" strokeWidth="0.5" strokeDasharray="1.2,1.2" opacity="0.6" />
            {/* Caltrain / US-101 Spine */}
            <use
              href="#caltrainRoute"
              fill="none"
              stroke="#007AFF"
              strokeWidth="0.8"
              strokeDasharray="2,1.5"
            />

            {/* Animated Caltrain Express Dot */}
            <circle r="1.3" fill="#007AFF" stroke="#FFFFFF" strokeWidth="0.4">
              <animateMotion
                dur="6s"
                repeatCount="indefinite"
                keyPoints="0;1;0"
                keyTimes="0;0.5;1"
                calcMode="linear"
              >
                <mpath href="#caltrainRoute" />
              </animateMotion>
            </circle>

            {/* Animated Waymo / EV Dot on I-280 */}
            <circle r="1.1" fill="#10B981" stroke="#FFFFFF" strokeWidth="0.35">
              <animateMotion
                dur="7.5s"
                repeatCount="indefinite"
                keyPoints="1;0;1"
                keyTimes="0;0.5;1"
                calcMode="linear"
              >
                <mpath href="#i280Route" />
              </animateMotion>
            </circle>

            {/* Animated Bay Bridge Commuter Dot */}
            <circle r="1" fill="#F59E0B">
              <animateMotion
                dur="4.5s"
                repeatCount="indefinite"
                keyPoints="0;1;0"
                keyTimes="0;0.5;1"
                calcMode="linear"
              >
                <mpath href="#bayBridgeRoute" />
              </animateMotion>
            </circle>

            {/* Region Labels */}
            <text x="20" y="10" fontSize="2.6" fontWeight="700" fill="#047857" opacity="0.7">
              MARIN
            </text>
            <text x="18" y="28" fontSize="2.6" fontWeight="800" fill="#0F172A" opacity="0.5">
              SAN FRANCISCO
            </text>
            <text x="34" y="61" fontSize="2.6" fontWeight="700" fill="#0F172A" opacity="0.45">
              PENINSULA
            </text>
            <text x="53" y="93" fontSize="2.8" fontWeight="800" fill="#0F172A" opacity="0.5">
              SILICON VALLEY · SOUTH BAY
            </text>
            <text x="72" y="28" fontSize="2.6" fontWeight="700" fill="#0F172A" opacity="0.45">
              EAST BAY
            </text>
          </svg>

          {/* Live Transit Legend Pill */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden items-center gap-3 rounded-full bg-white/85 px-3 py-1 text-[10px] font-bold text-slate-700 shadow-sm backdrop-blur-md sm:flex dark:bg-slate-900/85 dark:text-slate-300">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#007AFF]" /> Caltrain Express
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500" /> Waymo / I-280
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-500" /> Bay Bridge
            </span>
          </div>

          {/* Home Pin + Direct 1-Tap Go Now */}
          <div
            style={{ left: '29%', top: '48%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
          >
            <button
              onClick={() => setSelectedLoc('home')}
              className={`btn-press flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-md transition-all ${
                selectedLoc === 'home'
                  ? 'scale-110 bg-[#34C759] text-white ring-4 ring-emerald-400/40'
                  : 'bg-white/95 text-slate-900 hover:scale-105'
              }`}
            >
              <Home className="size-3.5" />
              <span>Home</span>
              {locationId === 'home' && (
                <span className="ml-0.5 size-2 rounded-full bg-emerald-300 animate-ping" />
              )}
            </button>

            {selectedLoc === 'home' && locationId !== 'home' && (
              <button
                onClick={() => travelTo('home', selectedMode)}
                className="btn-press mt-1 flex items-center gap-1 rounded-full bg-[#007AFF] px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-lg ring-2 ring-white/80"
              >
                <span>🚀 Go Now</span>
              </button>
            )}
          </div>

          {/* Glowing Venue Pins */}
          {filteredLocations.map((loc) => {
            const isSelected = selectedLoc !== 'home' && selectedLoc.id === loc.id;
            const isHere = locationId === loc.id;
            const npcCount = NPCS.filter((n) => n.favoriteSpot === loc.id).length;

            return (
              <div
                key={loc.id}
                style={{ left: `${loc.mapCoords.x}%`, top: `${loc.mapCoords.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center ${
                  isSelected ? 'z-30' : isHere ? 'z-20' : 'z-10'
                }`}
              >
                <button
                  onClick={() => setSelectedLoc(loc)}
                  className={`btn-press relative flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md transition-all ${
                    isSelected
                      ? 'scale-110 bg-[#007AFF] text-white ring-4 ring-[#007AFF]/40 shadow-[#007AFF]/40'
                      : isHere
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-white/95 text-slate-900 hover:scale-105'
                  }`}
                >
                  <span>{loc.emoji}</span>
                  <span className="hidden sm:inline">{loc.shortName}</span>
                  {isHere && (
                    <span className="ml-0.5 size-2 rounded-full bg-emerald-300 animate-ping" />
                  )}
                </button>

                {/* Direct 1-Tap "🚀 Go Now" Pill right on the selected pin */}
                {isSelected && !isHere && (
                  <button
                    onClick={() => travelTo(loc.id, selectedMode)}
                    className="btn-press mt-1 flex items-center gap-1 whitespace-nowrap rounded-full bg-[#34C759] px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-lg ring-2 ring-white/80"
                  >
                    <span>🚀 Go Now</span>
                    {npcCount > 0 && <span className="opacity-90">· 👤{npcCount}</span>}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Compact Visual Venue Card & 1-Tap Transit */}
        <div className="apple-glass-heavy flex flex-col justify-between overflow-y-auto rounded-3xl p-4 sm:p-5 lg:col-span-5">
          <div className="space-y-4">
            {/* Compact Venue Header + Instant Go Now Button */}
            {selectedLoc === 'home' ? (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-2xl">
                      {homeDef.emoji}
                    </span>
                    <div>
                      <span className="text-[10px] font-extrabold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                        Residence · {homeDef.district}
                      </span>
                      <h2 className="text-base font-extrabold sm:text-lg">{homeDef.name}</h2>
                      <p className="text-[11px] text-[var(--ink-soft)]">{homeDef.area}</p>
                    </div>
                  </div>

                  {!isAlreadyHere && (
                    <button
                      onClick={() => travelTo('home', selectedMode)}
                      className="btn-press flex shrink-0 items-center gap-1 rounded-xl bg-[#007AFF] px-3 py-2 text-xs font-extrabold text-white shadow-sm"
                    >
                      <Rocket className="size-3.5" />
                      <span>🚀 Go Now</span>
                    </button>
                  )}
                </div>

                {/* Visual Home Stat Badges */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-xl bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    🏠 {homeDef.gridSize}×{homeDef.gridSize} Grid
                  </span>
                  <span className="rounded-xl bg-[#007AFF]/15 px-2.5 py-1 text-[11px] font-bold text-[#007AFF]">
                    🛋️ {objects.length} Gear Placed
                  </span>
                  <span className="rounded-xl bg-[var(--mist)] px-2.5 py-1 text-[11px] font-bold">
                    😴 +100 Energy Recovery
                  </span>
                  <span className="rounded-xl bg-[var(--mist)] px-2.5 py-1 text-[11px] font-bold">
                    💻 Deep Work & Startup
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#007AFF]/15 text-2xl">
                      {selectedLoc.emoji}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold tracking-wider text-[#007AFF] uppercase">
                        {selectedLoc.district} · {selectedLoc.area}
                      </span>
                      <h2 className="truncate text-base font-extrabold sm:text-lg">
                        {selectedLoc.name}
                      </h2>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-extrabold text-purple-600 dark:text-purple-400">
                          <Users className="size-3" />
                          🤝 {venueNpcs.length} {venueNpcs.length === 1 ? 'NPC' : 'NPCs'} Here
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--mist)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">
                          <Clock className="size-3" />
                          {activeModeDef.durationMinutes}m away
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isAlreadyHere && (
                    <button
                      onClick={() => travelTo(selectedLoc.id, selectedMode)}
                      className="btn-press flex shrink-0 items-center gap-1 rounded-xl bg-[#007AFF] px-3 py-2 text-xs font-extrabold text-white shadow-sm"
                    >
                      <Rocket className="size-3.5" />
                      <span>🚀 Go Now</span>
                    </button>
                  )}
                </div>

                {/* Visual Activity & Stat Boost Badges */}
                <div className="mt-3">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Station Boosts & Activities
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {venueActions.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between gap-1.5 rounded-xl bg-[var(--mist)] px-2.5 py-1.5"
                      >
                        <span className="truncate text-[11px] font-bold">
                          {act.emoji} {act.label.split(' ')[0]} {act.label.split(' ')[1]}
                        </span>
                        <span className="shrink-0 rounded-md bg-[#007AFF]/15 px-1.5 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                          {getActionStatBadge(act)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regulars Spotted Here */}
                {venueNpcs.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                      Network Regulars
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {venueNpcs.map((n) => (
                        <span
                          key={n.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF]/12 px-2.5 py-1 text-[11px] font-bold text-[#007AFF]"
                        >
                          <span>👤 {n.name}</span>
                          <span className="rounded-full bg-white/70 px-1.5 py-0.2 text-[9px] font-extrabold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                            {n.company}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compact Commute Mode Picker */}
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Transit Mode
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {COMMUTE_MODES.map((m) => {
                  const lockedCar = m.requiresCar && !ownedCars.includes('tesla');
                  const active = selectedMode === m.id;
                  return (
                    <button
                      key={m.id}
                      disabled={lockedCar}
                      onClick={() => setSelectedMode(m.id)}
                      className={`btn-press flex flex-col justify-between rounded-2xl p-2.5 text-left border transition-all ${
                        active
                          ? 'border-[#007AFF] bg-[#007AFF]/12 shadow-sm'
                          : lockedCar
                          ? 'border-transparent bg-[var(--mist)] opacity-45'
                          : 'border-transparent bg-[var(--mist)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{m.emoji}</span>
                        <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-extrabold dark:bg-white/10">
                          {m.baseFare === 0 ? 'FREE' : formatCurrency(m.baseFare)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <div className="truncate text-[11px] font-extrabold">
                          {m.name.split(' ')[0]} {m.name.split(' ')[1]}
                        </div>
                        <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                          ⏱️ {m.durationMinutes}m {lockedCar ? '· 🔒 EV' : ''}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2">
            {isAlreadyHere ? (
              <button
                onClick={() => setView('live')}
                className="btn-press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold text-white"
              >
                <Check className="size-4" />
                Already Here · Return to Live Scene
              </button>
            ) : (
              <button
                onClick={() => travelTo(targetId, selectedMode)}
                className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#007AFF] text-sm font-extrabold text-white shadow-md shadow-[#007AFF]/25"
              >
                <Rocket className="size-4" />
                🚀 Go Now to {selectedLoc === 'home' ? 'Home' : selectedLoc.shortName} (
                {activeModeDef.durationMinutes}m)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


