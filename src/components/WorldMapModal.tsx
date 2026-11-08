import React, { useState } from 'react';
import {
  ACTIONS,
  COMMUTE_MODES,
  HOMES,
  LOCATIONS,
  NPCS,
} from '../data/worldData';
import { formatCurrency, useGameStore } from '../store/useGameStore';
import { ActionDef, CommuteModeId, LocationDef, NPCDef } from '../types/game';
import { Portrait } from './Portrait';
import {
  Home,
  X,
  Check,
  MapPin,
  Rocket,
  Users,
  Clock,
  Navigation,
  ArrowRight,
  Lock,
  Compass,
} from 'lucide-react';

/**
 * Carefully spaced Bay Area map coordinates (0..100 in SVG & percentage space)
 * so every pin, its floating badge, and its always-visible label pill + NPC count
 * never overlap any other pin.
 */
const PIN_COORDS: Record<string, { x: number; y: number }> = {
  ferry_building: { x: 46, y: 16 },
  hayes_cerebral: { x: 18, y: 23 },
  soma_yc_loft: { x: 48, y: 31 },
  audio_rooftop: { x: 20, y: 39 },
  dogpatch_boulders: { x: 51, y: 46 },
  mission_dolores: { x: 18, y: 54 },
  home: { x: 30, y: 66 },
  sand_hill_vc: { x: 58, y: 63 },
  mountain_view_plex: { x: 75, y: 77 },
  cupertino_ring: { x: 43, y: 81 },
};

function getPinCoords(id: string, fallback?: { x: number; y: number }): { x: number; y: number } {
  return PIN_COORDS[id] || fallback || { x: 50, y: 50 };
}

/**
 * Matches IsometricScene's live NPC presence logic so the NPC count & roster shown
 * on the map match who is actually hanging out at each venue.
 */
function getNpcsAtLocation(locId: string, time: number): NPCDef[] {
  if (locId === 'home') {
    return NPCS.slice(0, 1);
  }
  const bucket = Math.floor(time / 240) % 3;
  return NPCS.filter(
    (n, idx) => n.favoriteSpot === locId || idx % 3 === bucket
  );
}

const COMMUTE_DISPLAY_LABELS: Record<
  CommuteModeId,
  { shortTitle: string; subtitle: string }
> = {
  caltrain: {
    shortTitle: 'Caltrain',
    subtitle: 'Electric Rail / BART · Wi-Fi',
  },
  gbus: {
    shortTitle: 'G-Bus',
    subtitle: 'Tech Commuter Shuttle · US-101',
  },
  waymo: {
    shortTitle: 'Waymo',
    subtitle: 'Autonomous Jaguar · +12 Vibe',
  },
  uber: {
    shortTitle: 'Uber Black',
    subtitle: 'Priority Express · I-280',
  },
  tesla: {
    shortTitle: 'Tesla',
    subtitle: 'Personal EV Autopilot · +18 Vibe',
  },
};

function getActionStatBadge(act: ActionDef): string {
  if (act.startupProgress) return `🚀 +${act.startupProgress}% MVP`;
  if (act.skillGain) {
    const skillNames: Record<string, string> = {
      coding: 'Coding',
      systemDesign: 'SysDesign',
      aiResearch: 'AI Research',
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
  const sim = useGameStore((s) => s.sim);
  const time = useGameStore((s) => s.time);
  const locationId = useGameStore((s) => s.locationId);
  const homeId = useGameStore((s) => s.homeId);
  const cash = useGameStore((s) => s.cash);
  const objects = useGameStore((s) => s.objects);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const job = useGameStore((s) => s.job);
  const setView = useGameStore((s) => s.setView);
  const travelTo = useGameStore((s) => s.travelTo);

  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const currentVenueDef =
    locationId === 'home'
      ? null
      : LOCATIONS.find((l) => l.id === locationId) || LOCATIONS[0];

  const currentPlaceEmoji = currentVenueDef ? currentVenueDef.emoji : homeDef.emoji;
  const currentPlaceName = currentVenueDef ? currentVenueDef.name : homeDef.name;
  const currentPlaceShortName = currentVenueDef
    ? currentVenueDef.shortName
    : `Home (${homeDef.district})`;
  const currentPlaceArea = currentVenueDef ? currentVenueDef.area : homeDef.area;

  const [selectedLoc, setSelectedLoc] = useState<LocationDef | 'home'>(() => {
    if (locationId === 'home') return LOCATIONS[0];
    return LOCATIONS.find((l) => l.id === locationId) || 'home';
  });

  const [selectedMode, setSelectedMode] = useState<CommuteModeId>(() => {
    if (ownedCars.includes('tesla')) return 'tesla';
    if (cash >= 26) return 'waymo';
    return 'gbus';
  });

  const [districtFilter, setDistrictFilter] = useState<string>('All');

  const districts = ['All', 'San Francisco', 'Peninsula', 'South Bay'];

  const targetId = selectedLoc === 'home' ? 'home' : selectedLoc.id;
  const isAlreadyHere = targetId === locationId;
  const activeModeDef =
    COMMUTE_MODES.find((m) => m.id === selectedMode) || COMMUTE_MODES[0];

  const currentCoords = getPinCoords(locationId);
  const selectedCoords = getPinCoords(
    targetId,
    selectedLoc === 'home' ? undefined : selectedLoc.mapCoords
  );

  const venueNpcs = getNpcsAtLocation(targetId, time);
  const homeNpcs = getNpcsAtLocation('home', time);

  const venueActions =
    selectedLoc === 'home'
      ? []
      : Array.from(
          new Set(selectedLoc.stations.flatMap((st) => st.actionIds))
        )
          .map((id) => ACTIONS[id])
          .filter(Boolean);

  const handleReturnHomeNow = () => {
    const modeToUse: CommuteModeId =
      ownedCars.includes('tesla')
        ? 'tesla'
        : cash >= activeModeDef.baseFare && !activeModeDef.requiresCar
        ? selectedMode
        : 'gbus';
    travelTo('home', modeToUse);
  };

  const selectedVenueName =
    selectedLoc === 'home' ? `Home (${homeDef.name})` : selectedLoc.name;
  const selectedFareLabel =
    activeModeDef.baseFare === 0 ? 'FREE' : formatCurrency(activeModeDef.baseFare);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#dbeafe] pt-14 pb-24 dark:bg-[#0f172a]">
      {/* Top Floating Map Header with Unmistakable "You are at" Status & 1-Click Return Home */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 pt-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Green "You are at" Status Pill */}
          <button
            onClick={() =>
              setSelectedLoc(
                locationId === 'home'
                  ? 'home'
                  : LOCATIONS.find((l) => l.id === locationId) || 'home'
              )
            }
            className="btn-press flex flex-wrap items-center gap-2 rounded-full border-2 border-emerald-400/80 bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/25"
            title="Click to inspect your current location on the map"
          >
            <span className="inline-flex size-2.5 animate-ping rounded-full bg-emerald-200" />
            <span>
              📍 You are at: {currentPlaceEmoji} {currentPlaceName} ({currentPlaceArea})
            </span>
          </button>

          {/* 1-Click Return Home Button right in the Header when away from Home */}
          {locationId !== 'home' && (
            <button
              onClick={handleReturnHomeNow}
              className="btn-press flex items-center gap-1.5 rounded-full bg-[#007AFF] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-[#007AFF]/25 hover:bg-[#0066CC]"
            >
              <Home className="size-3.5" />
              <span>🏠 Return Home</span>
            </button>
          )}
        </div>

        {/* District Filter Pills + Close Map */}
        <div className="flex flex-wrap items-center gap-1.5">
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
            className="apple-pill btn-press ml-1 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold"
            aria-label="Close map"
          >
            <X className="size-4" />
            <span>Close Map</span>
          </button>
        </div>
      </div>

      {/* Quick NPC Spotter Strip: Immediately see where every NPC is hanging out */}
      <div className="relative z-20 flex items-center gap-1.5 overflow-x-auto px-4 pb-2">
        <span className="shrink-0 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white uppercase dark:bg-white/15">
          👥 People on Map:
        </span>
        {NPCS.map((npc) => {
          const spot = LOCATIONS.find((l) => l.id === npc.favoriteSpot);
          const isSpotSelected =
            selectedLoc !== 'home' && selectedLoc.id === npc.favoriteSpot;
          const isPlayerAtSpot = locationId === npc.favoriteSpot;
          return (
            <button
              key={npc.id}
              onClick={() => {
                if (spot) {
                  setDistrictFilter('All');
                  setSelectedLoc(spot);
                }
              }}
              className={`btn-press flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all ${
                isSpotSelected
                  ? 'border-[#007AFF] bg-[#007AFF] text-white shadow-sm'
                  : isPlayerAtSpot
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                  : 'border-white/50 bg-white/85 text-slate-800 hover:bg-white dark:border-white/10 dark:bg-slate-900/85 dark:text-slate-200'
              }`}
            >
              <Portrait appearance={npc.appearance} size={18} />
              <span>{npc.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                  isSpotSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-black/5 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                }`}
              >
                {spot?.emoji} {spot?.shortName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Split View: Interactive Animated Bay Area Vector Map + Crystal-Clear Destination Panel */}
      <div className="relative z-10 grid flex-1 grid-cols-1 gap-4 overflow-hidden px-4 lg:grid-cols-12">
        {/* Stylized San Francisco Bay Area SVG Map */}
        <div className="apple-glass relative min-h-[300px] overflow-hidden rounded-3xl border border-white/50 shadow-inner lg:col-span-7 dark:border-white/10">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.6" />
              </linearGradient>
              <path id="caltrainRoute" d="M 46,18 Q 52,52 74,78" />
              <path id="bayBridgeRoute" d="M 48,18 L 68,16" />
              <path id="sanMateoRoute" d="M 54,48 L 76,44" />
              <path id="i280Route" d="M 18,24 Q 32,58 43,81" />
            </defs>

            {/* Bay & Pacific Water */}
            <rect width="100" height="100" fill="url(#waterGrad)" />

            {/* Animated Golden Gate & Bay Water Waves */}
            <g stroke="#E0F2FE" strokeWidth="0.35" fill="none" opacity="0.55">
              <path d="M 4,12 Q 9,10.5 14,12 T 24,12">
                <animate
                  attributeName="d"
                  dur="4s"
                  repeatCount="indefinite"
                  values="M 4,12 Q 9,10.5 14,12 T 24,12; M 4,12 Q 9,13.5 14,12 T 24,12; M 4,12 Q 9,10.5 14,12 T 24,12"
                />
              </path>
              <path d="M 55,32 Q 60,30.5 65,32 T 75,32">
                <animate
                  attributeName="d"
                  dur="5s"
                  repeatCount="indefinite"
                  values="M 55,32 Q 60,30.5 65,32 T 75,32; M 55,32 Q 60,33.5 65,32 T 75,32; M 55,32 Q 60,30.5 65,32 T 75,32"
                />
              </path>
              <path d="M 60,56 Q 65,54.5 70,56 T 80,56">
                <animate
                  attributeName="d"
                  dur="4.5s"
                  repeatCount="indefinite"
                  values="M 60,56 Q 65,54.5 70,56 T 80,56; M 60,56 Q 65,57.5 70,56 T 80,56; M 60,56 Q 65,54.5 70,56 T 80,56"
                />
              </path>
            </g>

            {/* Marin Headlands (North) */}
            <path
              d="M 8,0 L 42,0 L 36,9 L 18,10 L 8,5 Z"
              fill="#A7F3D0"
              opacity="0.75"
              stroke="#10B981"
              strokeWidth="0.4"
            />

            {/* SF Peninsula & South Bay Landmass */}
            <path
              d="M 10,14 L 50,12 L 56,46 L 64,64 L 86,74 L 94,100 L 8,100 L 8,48 Z"
              fill="#ECFDF5"
              className="dark:fill-slate-800"
              stroke="#10B981"
              strokeWidth="0.5"
            />

            {/* East Bay (Oakland / Berkeley / Fremont) */}
            <path
              d="M 64,0 L 100,0 L 100,82 L 88,68 L 74,40 L 62,14 Z"
              fill="#ECFDF5"
              className="dark:fill-slate-800"
              stroke="#10B981"
              strokeWidth="0.5"
            />

            {/* Golden Gate Bridge + Towers */}
            <line
              x1="26"
              y1="9"
              x2="26"
              y2="14"
              stroke="#EA580C"
              strokeWidth="1.4"
            />
            <circle cx="26" cy="10.5" r="0.7" fill="#FB923C">
              <animate
                attributeName="opacity"
                values="0.4;1;0.4"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Bay Bridge */}
            <use
              href="#bayBridgeRoute"
              stroke="#94A3B8"
              strokeWidth="0.9"
              strokeDasharray="1.5,1"
            />
            {/* San Mateo Bridge */}
            <use
              href="#sanMateoRoute"
              stroke="#94A3B8"
              strokeWidth="0.7"
              strokeDasharray="1.5,1"
            />
            {/* I-280 Scenic Corridor */}
            <use
              href="#i280Route"
              fill="none"
              stroke="#10B981"
              strokeWidth="0.5"
              strokeDasharray="1.2,1.2"
              opacity="0.55"
            />
            {/* Caltrain / US-101 Spine */}
            <use
              href="#caltrainRoute"
              fill="none"
              stroke="#007AFF"
              strokeWidth="0.7"
              strokeDasharray="2,1.5"
              opacity="0.55"
            />

            {/* Region Watermark Labels */}
            <text
              x="16"
              y="6"
              fontSize="2.4"
              fontWeight="700"
              fill="#047857"
              opacity="0.7"
            >
              MARIN
            </text>
            <text
              x="25"
              y="29"
              fontSize="2.5"
              fontWeight="800"
              fill="#0F172A"
              opacity="0.32"
            >
              SAN FRANCISCO
            </text>
            <text
              x="36"
              y="59"
              fontSize="2.5"
              fontWeight="700"
              fill="#0F172A"
              opacity="0.32"
            >
              PENINSULA
            </text>
            <text
              x="48"
              y="95"
              fontSize="2.6"
              fontWeight="800"
              fill="#0F172A"
              opacity="0.38"
            >
              SILICON VALLEY · SOUTH BAY
            </text>
            <text
              x="76"
              y="24"
              fontSize="2.5"
              fontWeight="700"
              fill="#0F172A"
              opacity="0.38"
            >
              EAST BAY
            </text>

            {/* Animated Direct Route Line from YOU ARE HERE to Selected DESTINATION */}
            {!isAlreadyHere && (
              <g>
                {/* Soft Outer Glow Line */}
                <line
                  x1={currentCoords.x}
                  y1={currentCoords.y}
                  x2={selectedCoords.x}
                  y2={selectedCoords.y}
                  stroke="#007AFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.25"
                />
                {/* Animated Dashed Route Path */}
                <line
                  x1={currentCoords.x}
                  y1={currentCoords.y}
                  x2={selectedCoords.x}
                  y2={selectedCoords.y}
                  stroke="#007AFF"
                  strokeWidth="1.15"
                  strokeDasharray="2.2,1.6"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="15.2"
                    to="0"
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                </line>
                {/* Origin & Destination Anchor Rings on SVG */}
                <circle
                  cx={currentCoords.x}
                  cy={currentCoords.y}
                  r="2.2"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="0.7"
                />
                <circle
                  cx={selectedCoords.x}
                  cy={selectedCoords.y}
                  r="2.2"
                  fill="none"
                  stroke="#007AFF"
                  strokeWidth="0.7"
                />
              </g>
            )}
          </svg>

          {/* Top-Left Map Legend Pill */}
          <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-2.5 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold text-slate-700 shadow-sm backdrop-blur-md dark:bg-slate-900/90 dark:text-slate-200">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300" />
              📍 You Are Here
            </span>
            <span className="inline-flex items-center gap-1 text-[#007AFF]">
              <span className="size-2.5 rounded-full bg-[#007AFF]" />
              🎯 Selected Destination
            </span>
            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
              <span>👥</span>
              NPCs Present
            </span>
          </div>

          {/* HOME PIN on the Map Canvas */}
          {(() => {
            const isHomeHere = locationId === 'home';
            const isHomeSelected = selectedLoc === 'home';
            const homeCoords = getPinCoords('home');
            const matchesDistrict =
              districtFilter === 'All' || homeDef.district === districtFilter;

            return (
              <div
                style={{ left: `${homeCoords.x}%`, top: `${homeCoords.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-opacity ${
                  isHomeHere
                    ? 'z-40'
                    : isHomeSelected
                    ? 'z-30'
                    : matchesDistrict
                    ? 'z-20'
                    : 'z-10 opacity-45'
                }`}
              >
                {/* Floating "📍 YOU ARE HERE" or "🎯 DESTINATION" Badge */}
                {isHomeHere ? (
                  <div className="mb-1 flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white uppercase shadow-lg ring-2 ring-white">
                    <span>📍 YOU ARE HERE</span>
                  </div>
                ) : isHomeSelected ? (
                  <div className="mb-1 flex items-center gap-1 whitespace-nowrap rounded-full bg-[#007AFF] px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase shadow-md ring-2 ring-white">
                    <span>🎯 DESTINATION</span>
                  </div>
                ) : null}

                {/* Pin Marker Button */}
                <button
                  onClick={() => setSelectedLoc('home')}
                  className={`btn-press relative flex items-center justify-center rounded-full transition-all ${
                    isHomeHere
                      ? 'bg-emerald-500 p-1 text-white shadow-xl ring-4 ring-emerald-300'
                      : isHomeSelected
                      ? 'scale-110 bg-[#007AFF] px-2.5 py-1.5 text-white shadow-lg ring-4 ring-[#007AFF]/40'
                      : 'bg-white/95 px-2.5 py-1 text-slate-900 shadow-md ring-1 ring-slate-300 hover:scale-105 dark:bg-slate-900/95 dark:text-white dark:ring-slate-700'
                  }`}
                >
                  {isHomeHere && (
                    <span className="pointer-events-none absolute -inset-1.5 animate-ping rounded-full bg-emerald-400/50" />
                  )}
                  {isHomeHere ? (
                    <div className="relative flex items-center gap-1 pr-1">
                      <Portrait
                        appearance={sim.appearance}
                        size={32}
                        ringColor="#FFFFFF"
                      />
                      <span className="text-sm">{homeDef.emoji}</span>
                    </div>
                  ) : (
                    <span className="text-sm">{homeDef.emoji}</span>
                  )}
                </button>

                {/* Always-Visible Label Pill + NPC Presence Indicator Underneath */}
                <button
                  onClick={() => setSelectedLoc('home')}
                  className={`mt-1 flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-md transition-all ${
                    isHomeHere
                      ? 'bg-emerald-700 text-white ring-1 ring-emerald-300'
                      : isHomeSelected
                      ? 'bg-[#007AFF] text-white ring-1 ring-white/80'
                      : 'bg-white/95 text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700'
                  }`}
                >
                  <span>🏠 Home</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                      isHomeHere || isHomeSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                    }`}
                  >
                    👥 {homeNpcs.length}
                  </span>
                </button>
              </div>
            );
          })()}

          {/* VENUE PINS on the Map Canvas (All Pins Always Visible with Labels & NPC Counts) */}
          {LOCATIONS.map((loc) => {
            const isSelected =
              selectedLoc !== 'home' && selectedLoc.id === loc.id;
            const isHere = locationId === loc.id;
            const matchesDistrict =
              districtFilter === 'All' || loc.district === districtFilter;
            const npcsAtLoc = getNpcsAtLocation(loc.id, time);
            const coords = getPinCoords(loc.id, loc.mapCoords);

            return (
              <div
                key={loc.id}
                style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-opacity ${
                  isHere
                    ? 'z-40'
                    : isSelected
                    ? 'z-30'
                    : matchesDistrict
                    ? 'z-20'
                    : 'z-10 opacity-40'
                }`}
              >
                {/* Floating "📍 YOU ARE HERE" or "🎯 DESTINATION" Badge */}
                {isHere ? (
                  <div className="mb-1 flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white uppercase shadow-lg ring-2 ring-white">
                    <span>📍 YOU ARE HERE</span>
                  </div>
                ) : isSelected ? (
                  <div className="mb-1 flex items-center gap-1 whitespace-nowrap rounded-full bg-[#007AFF] px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase shadow-md ring-2 ring-white">
                    <span>🎯 DESTINATION</span>
                  </div>
                ) : null}

                {/* Pin Marker Button */}
                <button
                  onClick={() => setSelectedLoc(loc)}
                  className={`btn-press relative flex items-center justify-center rounded-full transition-all ${
                    isHere
                      ? 'bg-emerald-500 p-1 text-white shadow-xl ring-4 ring-emerald-300'
                      : isSelected
                      ? 'scale-110 bg-[#007AFF] px-2.5 py-1.5 text-white shadow-lg ring-4 ring-[#007AFF]/40'
                      : 'bg-white/95 px-2.5 py-1 text-slate-900 shadow-md ring-1 ring-slate-300 hover:scale-105 dark:bg-slate-900/95 dark:text-white dark:ring-slate-700'
                  }`}
                >
                  {isHere && (
                    <span className="pointer-events-none absolute -inset-1.5 animate-ping rounded-full bg-emerald-400/50" />
                  )}
                  {isHere ? (
                    <div className="relative flex items-center gap-1 pr-1">
                      <Portrait
                        appearance={sim.appearance}
                        size={32}
                        ringColor="#FFFFFF"
                      />
                      <span className="text-sm">{loc.emoji}</span>
                    </div>
                  ) : (
                    <span className="text-sm">{loc.emoji}</span>
                  )}
                </button>

                {/* Always-Visible Label Pill + NPC Presence Count Underneath Every Pin */}
                <button
                  onClick={() => setSelectedLoc(loc)}
                  className={`mt-1 flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-md transition-all ${
                    isHere
                      ? 'bg-emerald-700 text-white ring-1 ring-emerald-300'
                      : isSelected
                      ? 'bg-[#007AFF] text-white ring-1 ring-white/80'
                      : 'bg-white/95 text-slate-900 ring-1 ring-slate-200 hover:bg-white dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700'
                  }`}
                >
                  <span>{loc.shortName}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                      isHere || isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                    }`}
                  >
                    👥 {npcsAtLoc.length}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Column: Crystal-Clear Destination Panel & 1-Tap Travel Flow */}
        <div className="apple-glass-heavy flex flex-col justify-between overflow-y-auto rounded-3xl p-4 sm:p-5 lg:col-span-5">
          <div className="space-y-3.5">
            {/* Route Summary Banner OR "You Are Currently Here" Banner */}
            {isAlreadyHere ? (
              <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/15 p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-600 text-sm text-white shadow-sm">
                    <Check className="size-4" />
                  </span>
                  <div className="space-y-1">
                    <div className="text-xs font-extrabold text-emerald-800 dark:text-emerald-200">
                      ✅ You are currently here! Close map to walk around and interact.
                    </div>
                    <p className="text-[11px] font-medium text-emerald-700/90 dark:text-emerald-300/90">
                      Or click any other pin on the Bay Area map to plan your next trip.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setView('live')}
                  className="btn-press mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Compass className="size-4" />
                  <span>Close Map & Explore {currentPlaceShortName}</span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#007AFF]/35 bg-[#007AFF]/10 px-3.5 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-[#007AFF] uppercase">
                  <Navigation className="size-3" />
                  <span>Selected Route Summary</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-extrabold">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                    <span>From {currentPlaceEmoji}</span>
                    <span>{currentPlaceShortName}</span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-[#007AFF]" />
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#007AFF] px-2 py-0.5 text-white">
                    <span>
                      To {selectedLoc === 'home' ? homeDef.emoji : selectedLoc.emoji}
                    </span>
                    <span>
                      {selectedLoc === 'home'
                        ? `Home (${homeDef.name})`
                        : selectedLoc.name}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Venue / Home Full Details (Zero Cut-off Text) */}
            {selectedLoc === 'home' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-2xl">
                    {homeDef.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                      Your Residence · {homeDef.district}
                    </span>
                    <h2 className="text-base font-extrabold leading-snug sm:text-lg">
                      {homeDef.name}
                    </h2>
                    <p className="text-xs font-semibold text-[var(--ink-soft)]">
                      {homeDef.area}
                    </p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
                  {homeDef.tagline}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-xl bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    🏠 {homeDef.gridSize}×{homeDef.gridSize} Apartment Grid
                  </span>
                  <span className="rounded-xl bg-[#007AFF]/15 px-2.5 py-1 text-[11px] font-bold text-[#007AFF]">
                    🛋️ {objects.length} Gear Installed
                  </span>
                  <span className="rounded-xl bg-[var(--mist)] px-2.5 py-1 text-[11px] font-bold">
                    😴 +100 Energy Recovery
                  </span>
                  <span className="rounded-xl bg-[var(--mist)] px-2.5 py-1 text-[11px] font-bold">
                    💻 Deep Work & Startup Rig
                  </span>
                </div>

                {/* Neighbor / Visitor at Home */}
                {homeNpcs.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold tracking-wider text-[var(--ink-soft)] uppercase">
                      👥 Around Your Building ({homeNpcs.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {homeNpcs.map((n) => (
                        <div
                          key={n.id}
                          className="flex items-center gap-2 rounded-xl bg-[var(--mist)] px-2.5 py-1.5 text-xs font-bold"
                        >
                          <Portrait appearance={n.appearance} size={24} />
                          <div>
                            <div className="font-extrabold">{n.name}</div>
                            <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                              {n.role} · {n.company}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#007AFF]/15 text-2xl">
                    {selectedLoc.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold tracking-wider text-[#007AFF] uppercase">
                      {selectedLoc.district} · {selectedLoc.area}
                    </span>
                    <h2 className="text-base font-extrabold leading-snug sm:text-lg">
                      {selectedLoc.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-extrabold text-purple-600 dark:text-purple-400">
                        <Users className="size-3" />
                        👥 {venueNpcs.length}{' '}
                        {venueNpcs.length === 1 ? 'Person' : 'People'} Here Now
                      </span>
                      {!isAlreadyHere && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--mist)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">
                          <Clock className="size-3" />
                          {activeModeDef.durationMinutes}m via{' '}
                          {COMMUTE_DISPLAY_LABELS[selectedMode].shortTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* People Hanging Out Here Right Now (Full Names, Roles & Companies) */}
                <div>
                  <div className="mb-1.5 text-[10px] font-bold tracking-wider text-[var(--ink-soft)] uppercase">
                    👥 People Hanging Out Here ({venueNpcs.length})
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {venueNpcs.map((n) => {
                      const isRegular = n.favoriteSpot === selectedLoc.id;
                      return (
                        <div
                          key={n.id}
                          className="flex items-center gap-2 rounded-xl border border-[#007AFF]/20 bg-[#007AFF]/8 px-2.5 py-1.5"
                        >
                          <Portrait appearance={n.appearance} size={28} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-xs font-extrabold text-[var(--ink)]">
                                {n.name}
                              </span>
                              {isRegular && (
                                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-700 dark:text-amber-300">
                                  ⭐ Regular
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                              {n.role} · {n.company}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Full Station Boosts & Activities (No Truncated Labels!) */}
                <div>
                  <div className="mb-1.5 text-[10px] font-bold tracking-wider text-[var(--ink-soft)] uppercase">
                    ⚡ Venue Stations & Activities
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {venueActions.map((act) => (
                      <div
                        key={act.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--mist)] px-3 py-1.5"
                      >
                        <span className="text-xs font-bold">
                          {act.emoji} {act.label}
                        </span>
                        <span className="shrink-0 rounded-md bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                          {getActionStatBadge(act)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Commute Mode Selector when a different location is selected */}
            {!isAlreadyHere && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[var(--ink-soft)] uppercase">
                    🚆 Choose Commute Mode
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Your Cash: {formatCurrency(cash)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {COMMUTE_MODES.map((m) => {
                    const lockedCar =
                      Boolean(m.requiresCar) && !ownedCars.includes('tesla');
                    const lockedBigTech =
                      Boolean(m.requiresBigTech) && !job;
                    const isLocked = lockedCar || lockedBigTech;
                    const active = selectedMode === m.id;
                    const display = COMMUTE_DISPLAY_LABELS[m.id];

                    return (
                      <button
                        key={m.id}
                        disabled={isLocked}
                        onClick={() => setSelectedMode(m.id)}
                        className={`btn-press flex flex-col justify-between rounded-2xl border p-2.5 text-left transition-all ${
                          active
                            ? 'border-[#007AFF] bg-[#007AFF]/15 ring-2 ring-[#007AFF]/30 shadow-sm'
                            : isLocked
                            ? 'cursor-not-allowed border-rose-500/25 bg-[var(--mist)] opacity-75'
                            : 'border-transparent bg-[var(--mist)] hover:border-[#007AFF]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-base">{m.emoji}</span>
                          <div className="flex items-center gap-1">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                m.baseFare === 0
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-white/80 text-slate-800 dark:bg-white/10 dark:text-slate-100'
                              }`}
                            >
                              {m.baseFare === 0
                                ? 'FREE'
                                : formatCurrency(m.baseFare)}
                            </span>
                            <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-soft)] dark:bg-white/10">
                              {m.durationMinutes}m
                            </span>
                          </div>
                        </div>

                        <div className="mt-1.5">
                          <div className="text-xs font-extrabold text-[var(--ink)]">
                            {display.shortTitle}
                          </div>
                          {isLocked ? (
                            <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
                              <Lock className="size-2.5 shrink-0" />
                              <span>
                                {lockedCar
                                  ? '🔒 Need Tesla'
                                  : '🔒 Need Big Tech Job'}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-medium leading-tight text-[var(--ink-soft)]">
                              {display.subtitle}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Primary Bottom Action Button */}
          <div className="mt-4 pt-2">
            {isAlreadyHere ? (
              <button
                onClick={() => setView('live')}
                className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-extrabold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
              >
                <Check className="size-4" />
                <span>Close Map & Explore {currentPlaceShortName}</span>
              </button>
            ) : (
              <button
                onClick={() => travelTo(targetId, selectedMode)}
                className="btn-press flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#007AFF] px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-[#007AFF]/30 hover:bg-[#0066CC]"
              >
                <Rocket className="size-4 shrink-0" />
                <span>
                  🚀 Travel to {selectedVenueName} ({selectedFareLabel} ·{' '}
                  {activeModeDef.durationMinutes}m)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
