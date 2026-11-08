import React, { useEffect, useRef, useState } from 'react';
import {
  ACTIONS,
  CAREER_BY_ID,
  COMMUTE_MODES,
  HOMES,
  HOME_BY_ID,
  LOCATIONS,
  LOCATION_BY_ID,
  NPCS,
  calculateCommuteDetails,
  resolvePlaceCoords,
} from '../data/worldData';
import {
  formatCurrency,
  getActiveVehicle,
  hasPersonalCar,
  useGameStore,
} from '../store/useGameStore';
import { ActionDef, CommuteModeId, HomeDef, LocationDef, NPCDef } from '../types/game';
import { Portrait } from './Portrait';
import {
  Home,
  X,
  Check,
  Rocket,
  Users,
  Clock,
  Navigation,
  ArrowRight,
  Lock,
  Compass,
  Plus,
  Minus,
  Sparkles,
  Key,
  Building2,
} from 'lucide-react';

/**
 * Matches IsometricScene's live NPC presence logic so the NPC count & roster shown
 * on the map match who is actually hanging out at each venue.
 */
function getNpcsAtLocation(locId: string, time: number): NPCDef[] {
  if (locId === 'home' || HOME_BY_ID[locId]) {
    return [];
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
    shortTitle: 'Caltrain / BART',
    subtitle: 'Electric Rail · Wi-Fi',
  },
  gbus: {
    shortTitle: 'G-Bus Shuttle',
    subtitle: 'Tech Commuter Coach · US-101',
  },
  waymo: {
    shortTitle: 'Waymo One',
    subtitle: 'Autonomous Jaguar · +12 Vibe',
  },
  uber: {
    shortTitle: 'Uber Black',
    subtitle: 'Priority Express · I-280',
  },
  tesla: {
    shortTitle: 'Tesla FSD',
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

type SelectedMapTarget =
  | { kind: 'venue'; loc: LocationDef }
  | { kind: 'home'; home: HomeDef };

export const WorldMapModal: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const time = useGameStore((s) => s.time);
  const locationId = useGameStore((s) => s.locationId);
  const homeId = useGameStore((s) => s.homeId);
  const ownedHomes = useGameStore((s) => s.ownedHomes);
  const cash = useGameStore((s) => s.cash);
  const objects = useGameStore((s) => s.objects);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const activeCarId = useGameStore((s) => s.activeCarId);
  const job = useGameStore((s) => s.job);
  const workShift = useGameStore((s) => s.workShift);
  const setView = useGameStore((s) => s.setView);
  const travelTo = useGameStore((s) => s.travelTo);
  const moveHome = useGameStore((s) => s.moveHome);
  const startWorkShift = useGameStore((s) => s.startWorkShift);
  const commuteToOfficeAndWork = useGameStore((s) => s.commuteToOfficeAndWork);
  const leaveWorkEarly = useGameStore((s) => s.leaveWorkEarly);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const mapHouseHuntMode = useGameStore((s) => Boolean(s.mapHouseHuntMode));
  const bluefinSelectedHomeId = useGameStore((s) => s.bluefinSelectedHomeId);
  const setMapHouseHuntMode = useGameStore((s) => s.setMapHouseHuntMode);

  const careerDef = job ? CAREER_BY_ID[job.careerId] : null;
  const homeDef = HOME_BY_ID[homeId] || HOMES[2];
  const currentVenueDef =
    locationId === 'home'
      ? null
      : LOCATIONS.find((l) => l.id === locationId) || LOCATIONS[0];

  const currentPlaceEmoji = currentVenueDef ? currentVenueDef.emoji : homeDef.emoji;
  const currentPlaceName = currentVenueDef ? currentVenueDef.name : homeDef.name;
  const currentPlaceShortName = currentVenueDef
    ? currentVenueDef.shortName
    : `Home (${homeDef.shortName})`;
  const currentPlaceArea = currentVenueDef ? currentVenueDef.area : homeDef.area;

  const [selectedTarget, setSelectedTarget] = useState<SelectedMapTarget>(() => {
    if (mapHouseHuntMode && bluefinSelectedHomeId && HOME_BY_ID[bluefinSelectedHomeId]) {
      return { kind: 'home', home: HOME_BY_ID[bluefinSelectedHomeId] };
    }
    if (locationId === 'home') {
      return { kind: 'venue', loc: LOCATIONS[0] };
    }
    const foundVenue = LOCATIONS.find((l) => l.id === locationId);
    if (foundVenue) return { kind: 'venue', loc: foundVenue };
    return { kind: 'home', home: homeDef };
  });

  useEffect(() => {
    if (mapHouseHuntMode && bluefinSelectedHomeId && HOME_BY_ID[bluefinSelectedHomeId]) {
      setSelectedTarget({ kind: 'home', home: HOME_BY_ID[bluefinSelectedHomeId] });
      return;
    }
    if (!mapHouseHuntMode && selectedTarget.kind === 'home' && selectedTarget.home.id !== homeId) {
      setSelectedTarget({ kind: 'home', home: homeDef });
    }
  }, [mapHouseHuntMode, bluefinSelectedHomeId, homeId, homeDef, selectedTarget]);

  const hasCar = hasPersonalCar({ ownedCars });
  const activeVehicle = getActiveVehicle({ ownedCars, activeCarId });

  const [selectedMode, setSelectedMode] = useState<CommuteModeId>(() => {
    if (hasPersonalCar({ ownedCars })) return 'tesla';
    if (cash >= 26) return 'waymo';
    return 'gbus';
  });

  useEffect(() => {
    if (hasCar) {
      setSelectedMode('tesla');
    }
  }, [hasCar]);

  const [districtFilter, setDistrictFilter] = useState<string>('All');
  const [pinLayerFilter, setPinLayerFilter] = useState<'all' | 'venues' | 'homes'>('all');

  // Interactive Map Zoom & Pan Camera State
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState<boolean>(false);
  const mapDragRef = useRef<{
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

  const clampPan = (x: number, y: number, z: number) => {
    const maxOffset = Math.max(0, (z - 1) * 280);
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, y)),
    };
  };

  const handleMapWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0018;
    setMapZoom((prev) => {
      const next = Math.min(2.8, Math.max(1, +(prev + delta).toFixed(2)));
      setMapPan((p) => clampPan(p.x, p.y, next));
      return next;
    });
  };

  const handleMapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    mapDragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: mapPan.x,
      startPanY: mapPan.y,
      moved: false,
    };
  };

  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapDragRef.current.active) return;
    const dx = e.clientX - mapDragRef.current.startX;
    const dy = e.clientY - mapDragRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      mapDragRef.current.moved = true;
      if (!isDraggingMap) setIsDraggingMap(true);
      setMapPan(
        clampPan(
          mapDragRef.current.startPanX + dx,
          mapDragRef.current.startPanY + dy,
          mapZoom
        )
      );
    }
  };

  const handleMapMouseUp = () => {
    mapDragRef.current.active = false;
    setIsDraggingMap(false);
  };

  const focusMapRegion = (region: 'reset' | 'sf' | 'peninsula' | 'southbay' | 'me') => {
    if (region === 'reset') {
      setMapZoom(1);
      setMapPan({ x: 0, y: 0 });
      return;
    }
    if (region === 'sf') {
      setMapZoom(1.75);
      setMapPan({ x: 65, y: 75 });
      return;
    }
    if (region === 'peninsula') {
      setMapZoom(1.75);
      setMapPan({ x: 35, y: -35 });
      return;
    }
    if (region === 'southbay') {
      setMapZoom(1.75);
      setMapPan({ x: -35, y: -120 });
      return;
    }
    if (region === 'me') {
      const me = resolvePlaceCoords(locationId, homeId);
      const z = 1.8;
      const offsetX = (45 - me.x) * 3.8;
      const offsetY = (50 - me.y) * 3.8;
      setMapZoom(z);
      setMapPan(clampPan(offsetX, offsetY, z));
    }
  };

  const districts = ['All', 'San Francisco', 'Peninsula', 'South Bay'];

  // Determine effective travel target ID & whether we are inspecting a non-active home lease
  const isInspectingCurrentHome =
    selectedTarget.kind === 'home' && selectedTarget.home.id === homeId;
  const isInspectingOtherHome =
    selectedTarget.kind === 'home' && selectedTarget.home.id !== homeId;

  const targetPlaceId =
    selectedTarget.kind === 'venue'
      ? selectedTarget.loc.id
      : selectedTarget.home.id === homeId
        ? 'home'
        : selectedTarget.home.id;

  const isAlreadyHere =
    (selectedTarget.kind === 'venue' && selectedTarget.loc.id === locationId) ||
    (isInspectingCurrentHome && locationId === 'home');

  const currentCoords = resolvePlaceCoords(locationId, homeId);
  const selectedCoords =
    selectedTarget.kind === 'venue'
      ? selectedTarget.loc.mapCoords
      : selectedTarget.home.mapCoords;

  // Dynamic distance-based commute estimate for the currently selected mode
  const activeCommuteEst = calculateCommuteDetails(
    locationId,
    targetPlaceId,
    homeId,
    selectedMode,
    activeVehicle?.id
  );

  const venueNpcs =
    selectedTarget.kind === 'venue'
      ? getNpcsAtLocation(selectedTarget.loc.id, time)
      : [];

  const venueActions =
    selectedTarget.kind === 'venue'
      ? Array.from(
        new Set(selectedTarget.loc.stations.flatMap((st) => st.actionIds))
      )
        .map((id) => ACTIONS[id])
        .filter(Boolean)
      : [];

  const handleReturnHomeNow = () => {
    const gbusEst = calculateCommuteDetails(locationId, 'home', homeId, 'gbus');
    const selEst = calculateCommuteDetails(
      locationId,
      'home',
      homeId,
      selectedMode,
      activeVehicle?.id
    );
    const activeModeDef =
      COMMUTE_MODES.find((m) => m.id === selectedMode) || COMMUTE_MODES[0];
    const modeToUse: CommuteModeId =
      hasCar
        ? 'tesla'
        : cash >= selEst.fare && !activeModeDef.requiresCar
          ? selectedMode
          : cash >= gbusEst.fare
            ? 'gbus'
            : 'caltrain';
    travelTo('home', modeToUse);
  };

  const selectedVenueName =
    selectedTarget.kind === 'home'
      ? selectedTarget.home.id === homeId
        ? `Home (${selectedTarget.home.shortName})`
        : selectedTarget.home.name
      : selectedTarget.loc.name;

  const selectedFareLabel =
    activeCommuteEst.fare === 0 ? 'FREE' : formatCurrency(activeCommuteEst.fare);

  // Inverse scale so pins stay crisp & separated when zooming in
  const pinScale = +(1 / Math.pow(mapZoom, 0.52)).toFixed(3);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#dbeafe] pt-14 pb-24 dark:bg-[#0f172a]">
      {/* Top Floating Map Header with Unmistakable "You are at" Status & 1-Click Return Home */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 pt-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Green "You are at" Status Pill */}
          <button
            onClick={() => {
              if (locationId === 'home') {
                setSelectedTarget({ kind: 'home', home: homeDef });
              } else {
                const v = LOCATIONS.find((l) => l.id === locationId);
                if (v) setSelectedTarget({ kind: 'venue', loc: v });
              }
              focusMapRegion('me');
            }}
            className="btn-press flex flex-wrap items-center gap-2 rounded-full border-2 border-emerald-400/80 bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/25"
            title="Click to center on your current location"
          >
            <span className="inline-flex size-2.5 animate-ping rounded-full bg-emerald-200" />
            <span>
              📍 You are at: {currentPlaceEmoji} {currentPlaceName} ({currentPlaceArea})
            </span>
          </button>

          {/* 1-Click Return Home Button right in the Header when away from Home */}
          {locationId !== 'home' && !workShift && (
            <button
              onClick={handleReturnHomeNow}
              className="btn-press flex items-center gap-1.5 rounded-full bg-[#007AFF] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-[#007AFF]/25 hover:bg-[#0066CC]"
            >
              <Home className="size-3.5" />
              <span>
                🏠 Return Home ({calculateCommuteDetails(locationId, 'home', homeId, selectedMode).durationMinutes}m)
              </span>
            </button>
          )}

          {/* Quick Hybrid / HQ Jump Button */}
          {job && careerDef && (
            <button
              onClick={() => {
                const hqLoc = LOCATIONS.find((l) => l.id === careerDef.locationId);
                if (hqLoc) {
                  setDistrictFilter('All');
                  setPinLayerFilter('all');
                  setSelectedTarget({ kind: 'venue', loc: hqLoc });
                }
              }}
              className="btn-press flex items-center gap-1.5 rounded-full border border-indigo-400/50 bg-indigo-600/90 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-indigo-700"
              title="Inspect your company HQ campus on the map"
            >
              <span>🏢 HQ: {careerDef.company}</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 font-mono text-[10px]">
                {job.officeDaysThisWeek || 0}/3 Office Days
              </span>
            </button>
          )}
        </div>

        {/* Bluefin House-Hunt Toggle + District Filter Pills + Close Map */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              const nextMode = !mapHouseHuntMode;
              const nextInspectId = nextMode
                ? HOMES.find((h) => h.id !== homeId)?.id || homeId
                : undefined;
              setMapHouseHuntMode(nextMode, nextInspectId);
              if (!nextMode) {
                setPinLayerFilter('all');
              }
            }}
            className={`btn-press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold shadow-sm transition-all ${mapHouseHuntMode
                ? 'bg-[#0284C7] text-white ring-2 ring-sky-300'
                : 'border border-sky-400/50 bg-white/90 text-[#0284C7] hover:bg-sky-50 dark:bg-slate-900/90 dark:text-sky-300'
              }`}
            title="Show all 5 Bay Area residences on the map when house hunting via Bluefin"
          >
            <span>🐟</span>
            <span>
              {mapHouseHuntMode
                ? 'Bluefin House Hunt: ON (Exit)'
                : 'House Hunt on Bluefin'}
            </span>
          </button>

          {mapHouseHuntMode && (
            <button
              onClick={() => setActiveModal('phone', 'bluefin')}
              className="btn-press rounded-full bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-extrabold text-[#0284C7] hover:bg-sky-500/25 dark:text-sky-300"
              title="Open the Bluefin Real Estate app on your BayOS phone"
            >
              📱 Open Bluefin App
            </button>
          )}

          {districts.map((d) => (
            <button
              key={d}
              onClick={() => setDistrictFilter(d)}
              className={`btn-press rounded-full px-3 py-1.5 text-xs font-semibold ${districtFilter === d
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

      {/* Prominent Active Work Shift Travel Lock Banner */}
      {workShift && (
        <div className="relative z-20 mx-4 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/60 bg-amber-500/20 px-4 py-2 text-xs font-extrabold text-amber-950 shadow-sm backdrop-blur-md dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-300" />
            <span>
              🔒 Currently Clocked Into Work Shift ({workShift.mode?.toUpperCase() || 'OFFICE'}) — You cannot travel while working! Finish your shift or Leave Shift Early first.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveModal('career')}
              className="btn-press rounded-full bg-[#007AFF] px-3 py-1 text-[11px] font-extrabold text-white"
            >
              🔬 Career Hub
            </button>
            <button
              onClick={leaveWorkEarly}
              className="btn-press rounded-full bg-rose-600 px-3 py-1 text-[11px] font-extrabold text-white hover:bg-rose-700"
            >
              Leave Shift Early to Travel
            </button>
          </div>
        </div>
      )}

      {/* Sub-Header Strip: Bluefin Residences (ONLY shown when looking for new homes) + NPC Spotter Strip */}
      <div className="relative z-20 flex items-center gap-1.5 overflow-x-auto px-4 pb-2">
        {mapHouseHuntMode ? (
          <>
            <span className="shrink-0 rounded-full bg-[#0284C7] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white uppercase shadow-xs">
              🐟 Bluefin 5 Listings:
            </span>
            {HOMES.map((h) => {
              const isCurrent = h.id === homeId;
              const isOwned = ownedHomes.includes(h.id);
              const isSelected =
                selectedTarget.kind === 'home' && selectedTarget.home.id === h.id;
              return (
                <button
                  key={h.id}
                  onClick={() => {
                    setDistrictFilter('All');
                    setSelectedTarget({ kind: 'home', home: h });
                  }}
                  className={`btn-press flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all ${isSelected
                      ? 'border-[#0284C7] bg-[#0284C7] text-white shadow-sm'
                      : isCurrent
                        ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                        : 'border-white/50 bg-white/85 text-slate-800 hover:bg-white dark:border-white/10 dark:bg-slate-900/85 dark:text-slate-200'
                    }`}
                >
                  <span>{h.emoji}</span>
                  <span>{h.shortName}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-extrabold ${isSelected
                        ? 'bg-white/25 text-white'
                        : isCurrent
                          ? 'bg-emerald-600 text-white'
                          : isOwned
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : 'bg-sky-500/15 text-[#0284C7] dark:text-sky-300'
                      }`}
                  >
                    {isCurrent
                      ? 'YOUR HOME'
                      : isOwned
                        ? '🔑 OWNED'
                        : `T${h.tier} · $${(h.weeklyRent / 1000).toFixed(1)}k/wk`}
                  </span>
                </button>
              );
            })}
          </>
        ) : (
          <button
            onClick={() => {
              setDistrictFilter('All');
              setSelectedTarget({ kind: 'home', home: homeDef });
            }}
            className={`btn-press flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all ${selectedTarget.kind === 'home' && selectedTarget.home.id === homeId
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
              }`}
          >
            <span>🏠</span>
            <span>Your Home: {homeDef.shortName}</span>
            <span className="rounded-full bg-emerald-600/20 px-1.5 py-0.2 text-[9px] font-extrabold">
              T{homeDef.tier}
            </span>
          </button>
        )}

        <div className="mx-1 h-4 w-px shrink-0 bg-slate-400/30" />

        <span className="shrink-0 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white uppercase dark:bg-white/15">
          👥 People:
        </span>
        {NPCS.map((npc) => {
          const spot = LOCATIONS.find((l) => l.id === npc.favoriteSpot);
          const isSpotSelected =
            selectedTarget.kind === 'venue' &&
            selectedTarget.loc.id === npc.favoriteSpot;
          const isPlayerAtSpot = locationId === npc.favoriteSpot;
          return (
            <button
              key={npc.id}
              onClick={() => {
                if (spot) {
                  setDistrictFilter('All');
                  setSelectedTarget({ kind: 'venue', loc: spot });
                }
              }}
              className={`btn-press flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all ${isSpotSelected
                  ? 'border-[#007AFF] bg-[#007AFF] text-white shadow-sm'
                  : isPlayerAtSpot
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                    : 'border-white/50 bg-white/85 text-slate-800 hover:bg-white dark:border-white/10 dark:bg-slate-900/85 dark:text-slate-200'
                }`}
            >
              <Portrait appearance={npc.appearance} size={18} />
              <span>{npc.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${isSpotSelected
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

      {/* Main Split View: Zoomable Interactive Bay Area Vector Map + Destination / Residence Panel */}
      <div className="relative z-10 grid flex-1 grid-cols-1 gap-4 overflow-hidden px-4 lg:grid-cols-12">
        {/* Stylized Zoom-Inable San Francisco Bay Area SVG Map */}
        <div
          className={`apple-glass relative min-h-[320px] overflow-hidden rounded-3xl border border-white/50 shadow-inner select-none lg:col-span-7 dark:border-white/10 ${isDraggingMap ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          onWheel={handleMapWheel}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
          onMouseLeave={handleMapMouseUp}
          onDoubleClick={() => {
            setMapZoom((z) => (z < 1.8 ? 2.0 : 1.0));
            if (mapZoom >= 1.8) setMapPan({ x: 0, y: 0 });
          }}
        >
          {/* Top-Left Map Legend Pill */}
          <div className="pointer-events-none absolute top-2.5 left-2.5 z-30 flex flex-wrap items-center gap-2 rounded-full bg-white/92 px-3 py-1 text-[10px] font-extrabold text-slate-700 shadow-sm backdrop-blur-md dark:bg-slate-900/92 dark:text-slate-200">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300" />
              📍 Here
            </span>
            <span className="inline-flex items-center gap-1 text-[#007AFF]">
              <span className="size-2 rounded-full bg-[#007AFF]" />
              🏢 Venue
            </span>
            {mapHouseHuntMode ? (
              <span className="inline-flex items-center gap-1 text-[#0284C7] dark:text-sky-400">
                <span className="size-2 rounded-full bg-[#0284C7]" />
                🐟 Bluefin Homes (T1–T5)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-600" />
                🏠 Your Home
              </span>
            )}
            <span className="hidden text-slate-400 xl:inline">·</span>
            <span className="hidden text-[9px] font-bold text-slate-500 xl:inline dark:text-slate-400">
              {mapHouseHuntMode
                ? 'Click Any Home Pin to Compare Commutes & Leases'
                : 'Click Venue to Inspect · Use Bluefin to House Hunt'}
            </span>
          </div>

          {/* Top-Right Apple Maps Docked Route HUD Pill (Never Collides with Map Pins) */}
          {!isAlreadyHere && (
            <div
              className=" absolute top-2.5 right-2.5 z-30 flex items-center gap-2 rounded-full border border-white/70 bg-slate-900/92 py-1 pr-1.5 pl-3 text-[10px] font-extrabold text-white shadow-lg backdrop-blur-md dark:border-white/15"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <span>{currentPlaceEmoji}</span>
                <span className="max-w-[92px] truncate">{currentPlaceShortName}</span>
              </span>
              <ArrowRight className="size-3 shrink-0 text-sky-400" />
              <span className="inline-flex items-center gap-1 text-white">
                <span>
                  {selectedTarget.kind === 'home'
                    ? selectedTarget.home.emoji
                    : selectedTarget.loc.emoji}
                </span>
                <span className="max-w-[105px] truncate">{selectedVenueName}</span>
              </span>
              <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[9.5px] text-sky-200">
                {activeCommuteEst.miles} mi · {activeCommuteEst.durationMinutes}m
              </span>
              {!workShift && (
                <button
                  onClick={() => {
                    if (isInspectingOtherHome && selectedTarget.kind === 'home') {
                      moveHome(selectedTarget.home.id, false);
                    } else {
                      travelTo(
                        selectedTarget.kind === 'home' ? 'home' : selectedTarget.loc.id,
                        selectedMode
                      );
                    }
                  }}
                  disabled={
                    isInspectingOtherHome &&
                    selectedTarget.kind === 'home' &&
                    !ownedHomes.includes(selectedTarget.home.id) &&
                    cash < selectedTarget.home.weeklyRent
                  }
                  className={`btn-press rounded-full px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs disabled:opacity-45 ${isInspectingOtherHome
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-[#007AFF] hover:bg-[#0066CC]'
                    }`}
                >
                  {isInspectingOtherHome ? '🏡 Lease' : `🚀 Go (${selectedFareLabel})`}
                </button>
              )}
            </div>
          )}

          {/* Bottom-Left Floating Map Zoom & Region Quick-Focus Controls */}
          <div
            className="absolute bottom-3 left-3 z-30 flex flex-wrap items-center gap-1.5"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="apple-pill flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold text-[var(--ink)] shadow-md">
              <button
                onClick={() => {
                  const next = Math.max(1, +(mapZoom - 0.3).toFixed(2));
                  setMapZoom(next);
                  setMapPan((p) => clampPan(p.x, p.y, next));
                }}
                className="btn-press grid size-6 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                title="Zoom Out"
              >
                <Minus className="size-3.5" />
              </button>
              <button
                onClick={() => focusMapRegion('reset')}
                className="btn-press min-w-[42px] text-center font-mono text-[11px] font-extrabold"
                title="Reset Map Zoom"
              >
                {Math.round(mapZoom * 100)}%
              </button>
              <button
                onClick={() => {
                  const next = Math.min(2.8, +(mapZoom + 0.3).toFixed(2));
                  setMapZoom(next);
                }}
                className="btn-press grid size-6 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                title="Zoom In"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            <div className="apple-pill flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold text-[var(--ink)] shadow-md">
              <button
                onClick={() => focusMapRegion('sf')}
                className="btn-press rounded-full px-2 py-0.5 hover:bg-[#007AFF]/15 hover:text-[#007AFF]"
              >
                🌉 SF Core
              </button>
              <button
                onClick={() => focusMapRegion('peninsula')}
                className="btn-press rounded-full px-2 py-0.5 hover:bg-[#007AFF]/15 hover:text-[#007AFF]"
              >
                🌲 Peninsula
              </button>
              <button
                onClick={() => focusMapRegion('southbay')}
                className="btn-press rounded-full px-2 py-0.5 hover:bg-[#007AFF]/15 hover:text-[#007AFF]"
              >
                ☀️ South Bay
              </button>
              <button
                onClick={() => focusMapRegion('me')}
                className="btn-press rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300"
              >
                📍 Me
              </button>
            </div>
          </div>

          {/* Zoomable & Pannable Inner Map Stage */}
          <div
            className={`relative h-full w-full ${isDraggingMap ? '' : 'transition-transform duration-150 ease-out'
              }`}
            style={{
              transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`,
              transformOrigin: 'center center',
            }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-full w-full"
            >
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.44" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.64" />
                </linearGradient>
                <path id="caltrainRoute" d="M 48,25 Q 52,55 76,84" />
                <path id="us101Route" d="M 28,15 Q 48,48 80,92" />
                <path id="bayBridgeRoute" d="M 50,18 L 70,15" />
                <path id="sanMateoRoute" d="M 55,50 L 79,45" />
                <path id="dumbartonRoute" d="M 66,66 L 86,62" />
                <path id="i280Route" d="M 16,44 Q 32,64 46,85" />
              </defs>

              {/* Bay & Pacific Water */}
              <rect width="100" height="100" fill="url(#waterGrad)" />

              {/* Animated Golden Gate & Bay Water Waves */}
              <g stroke="#E0F2FE" strokeWidth="0.32" fill="none" opacity="0.55">
                <path d="M 2,12 Q 7,10.5 12,12 T 22,12">
                  <animate
                    attributeName="d"
                    dur="4s"
                    repeatCount="indefinite"
                    values="M 2,12 Q 7,10.5 12,12 T 22,12; M 2,12 Q 7,13.5 12,12 T 22,12; M 2,12 Q 7,10.5 12,12 T 22,12"
                  />
                </path>
                <path d="M 56,32 Q 61,30.5 66,32 T 76,32">
                  <animate
                    attributeName="d"
                    dur="5s"
                    repeatCount="indefinite"
                    values="M 56,32 Q 61,30.5 66,32 T 76,32; M 56,32 Q 61,33.5 66,32 T 76,32; M 56,32 Q 61,30.5 66,32 T 76,32"
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
                opacity="0.78"
                stroke="#10B981"
                strokeWidth="0.4"
              />

              {/* Angel Island, Alcatraz & Treasure Island */}
              <ellipse
                cx="42"
                cy="7.5"
                rx="3.2"
                ry="1.8"
                fill="#A7F3D0"
                stroke="#10B981"
                strokeWidth="0.3"
              />
              <ellipse
                cx="39"
                cy="12.2"
                rx="1.4"
                ry="0.85"
                fill="#E2E8F0"
                stroke="#64748B"
                strokeWidth="0.25"
              />
              <text x="39" y="10.8" fontSize="1.45" fontWeight="700" fill="#0F172A" opacity="0.6" textAnchor="middle">
                ALCATRAZ
              </text>
              <polygon
                points="55,14 58.5,14 58,18.2 54.8,18"
                fill="#D1FAE5"
                stroke="#10B981"
                strokeWidth="0.3"
              />

              {/* SF Peninsula & South Bay Landmass */}
              <path
                d="M 10,14 L 50,12 L 56,46 L 64,64 L 86,74 L 94,100 L 8,100 L 8,48 Z"
                fill="#ECFDF5"
                className="dark:fill-slate-800"
                stroke="#10B981"
                strokeWidth="0.5"
              />

              {/* Golden Gate Park, Presidio & Santa Cruz Mountain Foothills */}
              <rect
                x="11"
                y="24"
                width="12"
                height="4.2"
                rx="1"
                fill="#86EFAC"
                opacity="0.65"
              />
              <text x="17" y="26.6" fontSize="1.35" fontWeight="800" fill="#065F46" opacity="0.75" textAnchor="middle">
                GG PARK
              </text>
              <path
                d="M 12,62 Q 24,74 34,92 L 12,96 Z"
                fill="#A7F3D0"
                opacity="0.38"
              />

              {/* SFO International Airport Runways on Bayfront */}
              <g opacity="0.65">
                <polygon
                  points="52,48 58.5,48.5 58.5,52.5 52,52"
                  fill="#CBD5E1"
                  stroke="#64748B"
                  strokeWidth="0.25"
                />
                <line x1="53" y1="49.5" x2="57.8" y2="51.2" stroke="#475569" strokeWidth="0.35" />
                <line x1="53.5" y1="51.6" x2="57.5" y2="49.2" stroke="#475569" strokeWidth="0.35" />
                <text x="55.5" y="54.5" fontSize="1.5" fontWeight="800" fill="#334155" textAnchor="middle">
                  ✈️ SFO
                </text>
              </g>

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
                x1="24"
                y1="9"
                x2="24"
                y2="14.5"
                stroke="#EA580C"
                strokeWidth="1.5"
              />
              <circle cx="24" cy="10.5" r="0.7" fill="#FB923C">
                <animate
                  attributeName="opacity"
                  values="0.4;1;0.4"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Bay Bridge, San Mateo Bridge & Dumbarton Bridge */}
              <use
                href="#bayBridgeRoute"
                stroke="#94A3B8"
                strokeWidth="0.85"
                strokeDasharray="1.5,1"
              />
              <use
                href="#sanMateoRoute"
                stroke="#94A3B8"
                strokeWidth="0.65"
                strokeDasharray="1.5,1"
              />
              <use
                href="#dumbartonRoute"
                stroke="#94A3B8"
                strokeWidth="0.55"
                strokeDasharray="1.2,1"
              />

              {/* I-280 Scenic Corridor & US-101 Spine */}
              <use
                href="#i280Route"
                fill="none"
                stroke="#10B981"
                strokeWidth="0.5"
                strokeDasharray="1.2,1.2"
                opacity="0.55"
              />
              <use
                href="#us101Route"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="0.45"
                opacity="0.4"
              />
              {/* Caltrain Electrified Rail Spine + Animated Train Dot */}
              <use
                href="#caltrainRoute"
                fill="none"
                stroke="#007AFF"
                strokeWidth="0.65"
                strokeDasharray="1.8,1.2"
                opacity="0.6"
              />
              <circle r="0.95" fill="#007AFF" stroke="#FFFFFF" strokeWidth="0.25">
                <animateMotion
                  dur="9s"
                  repeatCount="indefinite"
                  path="M 48,25 Q 52,55 76,84"
                />
              </circle>

              {/* Region Watermark Labels */}
              <text x="16" y="6" fontSize="2.2" fontWeight="700" fill="#047857" opacity="0.7">
                MARIN HEADLANDS
              </text>
              <text x="23" y="21" fontSize="2.3" fontWeight="800" fill="#0F172A" opacity="0.28">
                SAN FRANCISCO
              </text>
              <text x="33" y="57" fontSize="2.3" fontWeight="700" fill="#0F172A" opacity="0.28">
                PENINSULA
              </text>
              <text x="45" y="96.5" fontSize="2.4" fontWeight="800" fill="#0F172A" opacity="0.35">
                SILICON VALLEY · SOUTH BAY
              </text>
              <text x="75" y="24" fontSize="2.3" fontWeight="700" fill="#0F172A" opacity="0.34">
                EAST BAY
              </text>

              {/* Animated Direct Route Line from YOU ARE HERE to Selected Target */}
              {!isAlreadyHere && (
                <g>
                  <line
                    x1={currentCoords.x}
                    y1={currentCoords.y}
                    x2={selectedCoords.x}
                    y2={selectedCoords.y}
                    stroke={isInspectingOtherHome ? '#F59E0B' : '#007AFF'}
                    strokeWidth="2.0"
                    strokeLinecap="round"
                    opacity="0.25"
                  />
                  <line
                    x1={currentCoords.x}
                    y1={currentCoords.y}
                    x2={selectedCoords.x}
                    y2={selectedCoords.y}
                    stroke={isInspectingOtherHome ? '#F59E0B' : '#007AFF'}
                    strokeWidth="1.05"
                    strokeDasharray="2.0,1.4"
                    strokeLinecap="round"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="13.6"
                      to="0"
                      dur="1.1s"
                      repeatCount="indefinite"
                    />
                  </line>
                  <circle
                    cx={currentCoords.x}
                    cy={currentCoords.y}
                    r="2.0"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="0.65"
                  />
                  <circle
                    cx={selectedCoords.x}
                    cy={selectedCoords.y}
                    r="2.0"
                    fill="none"
                    stroke={isInspectingOtherHome ? '#F59E0B' : '#007AFF'}
                    strokeWidth="0.65"
                  />
                </g>
              )}
            </svg>

            {/* Midpoint Distance & Duration Floating Pill along Active Route */}
            {!isAlreadyHere && (
              <div
                style={{
                  left: `${(currentCoords.x + selectedCoords.x) / 2}%`,
                  top: `${(currentCoords.y + selectedCoords.y) / 2}%`,
                  transform: `translate(-50%, -50%) scale(${pinScale})`,
                }}
                className="pointer-events-none absolute z-25 whitespace-nowrap rounded-full border border-white/80 bg-slate-900/92 px-2.5 py-0.5 text-[9.5px] font-extrabold text-white shadow-md"
              >
                {activeCommuteEst.miles} mi · {activeCommuteEst.durationMinutes}m ({activeCommuteEst.zoneLabel})
              </div>
            )}

            {/* RESIDENCE PINS ON THE MAP CANVAS (Only Your Current Home by Default; All 5 Homes When House-Hunting via Bluefin) */}
            {pinLayerFilter !== 'venues' &&
              (mapHouseHuntMode ? HOMES : [homeDef]).map((h) => {
                const isCurrentHome = h.id === homeId;
                const isHomeHere = isCurrentHome && locationId === 'home';
                const isOwned = ownedHomes.includes(h.id);
                const isSelected =
                  selectedTarget.kind === 'home' && selectedTarget.home.id === h.id;
                const matchesDistrict =
                  districtFilter === 'All' || h.district === districtFilter;

                return (
                  <div
                    key={`home-pin-${h.id}`}
                    style={{
                      left: `${h.mapCoords.x}%`,
                      top: `${h.mapCoords.y}%`,
                      transform: `translate(-50%, -50%) scale(${pinScale})`,
                    }}
                    className={`absolute flex flex-col items-center transition-opacity ${isHomeHere
                        ? 'z-40'
                        : isSelected
                          ? 'z-35'
                          : isCurrentHome
                            ? 'z-30'
                            : matchesDistrict
                              ? 'z-20'
                              : 'z-10 opacity-35'
                      }`}
                  >
                    {/* Top Status Badge */}
                    {isHomeHere ? (
                      <div className="mb-1 flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white uppercase shadow-lg ring-2 ring-white">
                        <span>📍 YOU ARE HERE (HOME)</span>
                      </div>
                    ) : isCurrentHome ? (
                      <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase shadow-md ring-1 ring-white">
                        <span>🏠 YOUR HOME · T{h.tier}</span>
                      </div>
                    ) : isSelected ? (
                      <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap rounded-full bg-[#0284C7] px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase shadow-md ring-1 ring-white">
                        <span>🐟 BLUEFIN LISTING · T{h.tier}</span>
                      </div>
                    ) : null}

                    {/* Pin Marker Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mapDragRef.current.moved) return;
                        setSelectedTarget({ kind: 'home', home: h });
                      }}
                      className={`btn-press relative flex items-center justify-center rounded-full transition-all ${isHomeHere
                          ? 'bg-emerald-500 p-1 text-white shadow-xl ring-4 ring-emerald-300'
                          : isSelected
                            ? 'scale-110 bg-[#0284C7] px-2.5 py-1.5 text-white shadow-lg ring-4 ring-sky-400/50'
                            : isCurrentHome
                              ? 'bg-emerald-600 px-2.5 py-1 text-white shadow-md ring-2 ring-white'
                              : 'bg-sky-50/95 px-2 py-1 text-sky-950 shadow-md ring-2 ring-[#0284C7]/80 hover:scale-105 dark:bg-slate-900/95 dark:text-sky-200'
                        }`}
                    >
                      {isHomeHere && (
                        <span className="pointer-events-none absolute -inset-1.5 animate-ping rounded-full bg-emerald-400/50" />
                      )}
                      {isHomeHere ? (
                        <div className="relative flex items-center gap-1 pr-1">
                          <Portrait
                            appearance={sim.appearance}
                            size={30}
                            ringColor="#FFFFFF"
                          />
                          <span className="text-sm">{h.emoji}</span>
                        </div>
                      ) : (
                        <span className="text-sm">{h.emoji}</span>
                      )}
                    </button>

                    {/* Label Pill Underneath */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mapDragRef.current.moved) return;
                        setSelectedTarget({ kind: 'home', home: h });
                      }}
                      className={`mt-1 flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-extrabold shadow-md transition-all ${isHomeHere
                          ? 'bg-emerald-700 text-white ring-1 ring-emerald-300'
                          : isSelected
                            ? 'bg-[#0284C7] text-white ring-1 ring-white/80'
                            : isCurrentHome
                              ? 'bg-emerald-700 text-white ring-1 ring-white/80'
                              : 'bg-sky-50/95 text-sky-950 ring-1 ring-[#0284C7]/60 dark:bg-slate-900/95 dark:text-sky-100'
                        }`}
                    >
                      <span>{isCurrentHome ? `🏠 ${h.shortName}` : `🐟 ${h.shortName}`}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[8.5px] font-black ${isHomeHere || isSelected || isCurrentHome
                            ? 'bg-white/25 text-white'
                            : 'bg-[#0284C7]/15 text-[#0284C7] dark:text-sky-300'
                          }`}
                      >
                        {isCurrentHome
                          ? `T${h.tier}`
                          : isOwned
                            ? '🔑 OWNED'
                            : `T${h.tier} · $${(h.weeklyRent / 1000).toFixed(1)}k`}
                      </span>
                    </button>
                  </div>
                );
              })}

            {/* VENUE PINS ON THE MAP CANVAS */}
            {pinLayerFilter !== 'homes' &&
              LOCATIONS.map((loc) => {
                const isSelected =
                  selectedTarget.kind === 'venue' && selectedTarget.loc.id === loc.id;
                const isHere = locationId === loc.id;
                const isCompanyHq = Boolean(job && careerDef?.locationId === loc.id);
                const matchesDistrict =
                  districtFilter === 'All' || loc.district === districtFilter;
                const npcsAtLoc = getNpcsAtLocation(loc.id, time);
                const coords = loc.mapCoords;

                return (
                  <div
                    key={loc.id}
                    style={{
                      left: `${coords.x}%`,
                      top: `${coords.y}%`,
                      transform: `translate(-50%, -50%) scale(${pinScale})`,
                    }}
                    className={`absolute flex flex-col items-center transition-opacity ${isHere
                        ? 'z-40'
                        : isSelected
                          ? 'z-35'
                          : isCompanyHq
                            ? 'z-25'
                            : matchesDistrict
                              ? 'z-20'
                              : 'z-10 opacity-35'
                      }`}
                  >
                    {/* Floating "🏢 YOUR HQ" Badge */}
                    {isCompanyHq && job && (
                      <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase shadow-md ring-1 ring-white">
                        <span>🏢 YOUR HQ ({job.officeDaysThisWeek || 0}/3 Office)</span>
                      </div>
                    )}

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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mapDragRef.current.moved) return;
                        setSelectedTarget({ kind: 'venue', loc });
                      }}
                      className={`btn-press relative flex items-center justify-center rounded-full transition-all ${isHere
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
                            size={30}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mapDragRef.current.moved) return;
                        setSelectedTarget({ kind: 'venue', loc });
                      }}
                      className={`mt-1 flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-extrabold shadow-md transition-all ${isHere
                          ? 'bg-emerald-700 text-white ring-1 ring-emerald-300'
                          : isSelected
                            ? 'bg-[#007AFF] text-white ring-1 ring-white/80'
                            : 'bg-white/95 text-slate-900 ring-1 ring-slate-200 hover:bg-white dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700'
                        }`}
                    >
                      <span>{loc.shortName}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[8.5px] font-black ${isHere || isSelected
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
        </div>

        {/* Right Column: Crystal-Clear Destination & Residence Inspector Panel */}
        <div className="apple-glass-heavy flex flex-col justify-between overflow-y-auto rounded-3xl p-4 sm:p-5 lg:col-span-5">
          <div className="space-y-3.5">
            {/* Route / Distance Summary Banner OR "You Are Currently Here" Banner */}
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
                      Or click any other venue or residence pin on the map to compare distances and plan your next trip.
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
              <div
                className={`rounded-2xl border px-3.5 py-2.5 ${isInspectingOtherHome
                    ? 'border-amber-500/40 bg-amber-500/12'
                    : 'border-[#007AFF]/35 bg-[#007AFF]/10'
                  }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div
                    className={`flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider uppercase ${isInspectingOtherHome
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-[#007AFF]'
                      }`}
                  >
                    <Navigation className="size-3" />
                    <span>
                      {isInspectingOtherHome
                        ? 'Residence Lease & Commute Preview'
                        : 'Selected Route & Distance'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="rounded-md bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] font-extrabold text-white dark:bg-white/15">
                      📏 {activeCommuteEst.miles} mi
                    </span>
                    <span className="rounded-md bg-[#007AFF]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF] dark:text-[#5AC8FA]">
                      {activeCommuteEst.zoneLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-extrabold">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                    <span>From {currentPlaceEmoji}</span>
                    <span>{currentPlaceShortName}</span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-[#007AFF]" />
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-white ${isInspectingOtherHome ? 'bg-amber-600' : 'bg-[#007AFF]'
                      }`}
                  >
                    <span>
                      To{' '}
                      {selectedTarget.kind === 'home'
                        ? selectedTarget.home.emoji
                        : selectedTarget.loc.emoji}
                    </span>
                    <span>{selectedVenueName}</span>
                  </span>
                </div>
              </div>
            )}

            {/* HOME INSPECTOR (Either Your Current Home OR Any Other Home on the Map) */}
            {selectedTarget.kind === 'home' ? (
              (() => {
                const h = selectedTarget.home;
                const isCurrent = h.id === homeId;
                const isOwned = ownedHomes.includes(h.id);
                const hqLocId = careerDef?.locationId || 'soma_yc_loft';
                const hqVenue = LOCATION_BY_ID[hqLocId];
                const sampleHubIds = Array.from(
                  new Set([hqLocId, 'soma_yc_loft', 'sand_hill_vc', 'mountain_view_plex'])
                ).slice(0, 3);

                return (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-2xl">
                        {h.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                            {h.tierLabel}
                          </span>
                          <span className="text-[10px] font-extrabold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                            {isCurrent
                              ? 'Your Active Residence'
                              : isOwned
                                ? '🔑 Deed Owned'
                                : `${formatCurrency(h.weeklyRent)}/wk Lease`}
                          </span>
                        </div>
                        <h2 className="mt-0.5 text-base font-extrabold leading-snug sm:text-lg">
                          {h.name}
                        </h2>
                        <p className="text-xs font-semibold text-[var(--ink-soft)]">
                          {h.area} · {h.district}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
                      {h.tagline}
                    </p>

                    {/* Luxury Perks & Passive Multipliers */}
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] font-extrabold tracking-wider text-amber-800 uppercase dark:text-amber-300">
                          <Sparkles className="size-3" />
                          <span>Residence Luxury Perks & Multipliers</span>
                        </span>
                        <span className="font-mono text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                          {h.gridSize}×{h.gridSize} Floor Grid
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {h.perks.map((perk, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl bg-white/80 px-2.5 py-1.5 text-[11px] dark:bg-slate-900/70"
                          >
                            <span className="font-bold text-[var(--ink)]">
                              {perk.emoji} {perk.label}
                            </span>
                            <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                              {perk.desc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Commute Distance & Time Comparison from this Residence */}
                    <div className="rounded-2xl bg-[var(--mist)] p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold tracking-wider text-[var(--ink-soft)] uppercase">
                          🚆 Commute Times from {h.shortName} (via {COMMUTE_DISPLAY_LABELS[selectedMode].shortTitle})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {sampleHubIds.map((hubId) => {
                          const hub = LOCATION_BY_ID[hubId];
                          if (!hub) return null;
                          const fromThisHome = calculateCommuteDetails(
                            h.id,
                            hubId,
                            h.id,
                            selectedMode
                          );
                          const fromCurrentHome = calculateCommuteDetails(
                            homeId,
                            hubId,
                            homeId,
                            selectedMode
                          );
                          const timeDiff =
                            fromThisHome.durationMinutes - fromCurrentHome.durationMinutes;
                          const isHq = hubId === careerDef?.locationId;

                          return (
                            <div
                              key={hubId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/75 px-2.5 py-1.5 text-xs dark:bg-slate-900/60"
                            >
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>{hub.emoji}</span>
                                <span>{hub.shortName}</span>
                                {isHq && (
                                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-indigo-700 dark:text-indigo-300">
                                    YOUR HQ
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-[11px] font-extrabold">
                                <span className="text-[var(--ink-soft)]">
                                  {fromThisHome.miles} mi
                                </span>
                                <span className="rounded-md bg-[#007AFF]/15 px-1.5 py-0.5 text-[#007AFF]">
                                  {fromThisHome.durationMinutes}m
                                </span>
                                {!isCurrent && timeDiff !== 0 && (
                                  <span
                                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${timeDiff < 0
                                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                                      }`}
                                  >
                                    {timeDiff < 0 ? `${timeDiff}m faster` : `+${timeDiff}m`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Remote WFH Shift Prompt if at Current Home */}
                    {isCurrent && isAlreadyHere && job && !workShift && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3">
                        <div className="text-xs font-bold text-[var(--ink)]">
                          🏠 Ready to log a Remote WFH Shift from your {h.shortName} desk?
                        </div>
                        <button
                          onClick={() => {
                            startWorkShift('wfh');
                            setView('live');
                          }}
                          className="btn-press rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-indigo-700"
                        >
                          🏠 Start WFH Shift ({job.wfhDaysThisWeek || 0}/2 wk)
                        </button>
                      </div>
                    )}

                    {/* Bluefin House-Hunt Prompt when Inspecting Current Home */}
                    {isCurrent && !mapHouseHuntMode && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#0284C7]/35 bg-[#0284C7]/10 p-3">
                        <div className="text-xs font-bold text-[var(--ink)]">
                          🐟 Looking for a bigger floor plan, better window view, or shorter commute?
                        </div>
                        <button
                          onClick={() =>
                            setMapHouseHuntMode(
                              true,
                              HOMES.find((other) => other.id !== homeId)?.id || homeId
                            )
                          }
                          className="btn-press rounded-xl bg-[#0284C7] px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#0369A1]"
                        >
                          🐟 House Hunt on Bluefin
                        </button>
                      </div>
                    )}

                    {/* Lease / Buy Deed Actions when Inspecting Another Home */}
                    {!isCurrent && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          onClick={() => moveHome(h.id, false)}
                          disabled={!isOwned && cash < h.weeklyRent}
                          className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-[#007AFF] px-3 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-[#0066CC] disabled:opacity-50"
                        >
                          <Building2 className="size-4" />
                          <span>
                            {isOwned
                              ? '🔑 Move Into Owned Home ($0)'
                              : `📝 Sign Lease (${formatCurrency(h.weeklyRent)}/wk)`}
                          </span>
                        </button>
                        {!isOwned && (
                          <button
                            onClick={() => moveHome(h.id, true)}
                            disabled={cash < h.buyPrice}
                            className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-amber-600 disabled:opacity-50"
                          >
                            <Key className="size-4" />
                            <span>Buy Deed ({formatCurrency(h.buyPrice)})</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              /* VENUE INSPECTOR */
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#007AFF]/15 text-2xl">
                    {selectedTarget.loc.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold tracking-wider text-[#007AFF] uppercase">
                      {selectedTarget.loc.district} · {selectedTarget.loc.area}
                    </span>
                    <h2 className="text-base font-extrabold leading-snug sm:text-lg">
                      {selectedTarget.loc.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-extrabold text-purple-600 dark:text-purple-400">
                        <Users className="size-3" />
                        👥 {venueNpcs.length}{' '}
                        {venueNpcs.length === 1 ? 'Person' : 'People'} Here Now
                      </span>
                      {job && careerDef?.locationId === selectedTarget.loc.id ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300">
                          🏢 Your HQ ({job.officeDaysThisWeek || 0}/3 Office Days)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/15 px-2 py-0.5 text-[10px] font-extrabold text-teal-700 dark:text-teal-300">
                          🌍 WFA Eligible ({job?.wfaDaysRemaining ?? 4}/4 WFA Passes left)
                        </span>
                      )}
                      {!isAlreadyHere && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--mist)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">
                          <Clock className="size-3" />
                          {activeCommuteEst.miles} mi · {activeCommuteEst.durationMinutes}m via{' '}
                          {COMMUTE_DISPLAY_LABELS[selectedMode].shortTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hybrid Office Card OR WFA Nomad Card */}
                {job && careerDef?.locationId === selectedTarget.loc.id ? (
                  <div className="rounded-2xl border-2 border-indigo-500/40 bg-indigo-500/12 p-3">
                    <div className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                      🏢 Your Company HQ Campus — Required 3 days/week ({job.officeDaysThisWeek || 0}/3 completed this week).
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-indigo-800/90 dark:text-indigo-300/90">
                      In-office shifts grant +20% Promo Velocity and unlock campus-only War Room exploration tasks.
                    </p>
                    {!workShift && (
                      <button
                        onClick={() => {
                          if (isAlreadyHere) {
                            startWorkShift('office');
                          } else {
                            commuteToOfficeAndWork(selectedMode);
                          }
                          setView('live');
                        }}
                        className="btn-press mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-extrabold text-white shadow-sm hover:bg-indigo-700"
                      >
                        <span>
                          🚌 Commute & Badge In for Office Shift ({activeCommuteEst.durationMinutes}m · {selectedFareLabel})
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  isAlreadyHere &&
                  job &&
                  !workShift && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-500/35 bg-teal-500/12 p-3">
                      <div className="text-xs font-bold text-teal-950 dark:text-teal-200">
                        🌍 Work From Anywhere Pass ({job.wfaDaysRemaining ?? 4}/4 WFA Passes left)
                      </div>
                      <button
                        onClick={() => {
                          startWorkShift('wfa');
                          setView('live');
                        }}
                        className="btn-press rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-teal-700"
                      >
                        🌍 Work From Here (Use 1 WFA Day)
                      </button>
                    </div>
                  )
                )}

                {/* People Hanging Out Here Right Now */}
                <div>
                  <div className="mb-1.5 text-[10px] font-bold tracking-wider text-[var(--ink-soft)] uppercase">
                    👥 People Hanging Out Here ({venueNpcs.length})
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {venueNpcs.map((n) => {
                      const isRegular = n.favoriteSpot === selectedTarget.loc.id;
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

                {/* Full Station Boosts & Activities */}
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

            {/* Dynamic Distance-Scaled Commute Mode Selector */}
            {!isAlreadyHere && (
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-[var(--ink-soft)] uppercase">
                    🚆 Choose Commute Mode ({activeCommuteEst.miles} mi · {activeCommuteEst.zoneLabel})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveModal('garage')}
                      className="btn-press rounded-full bg-[#007AFF]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#007AFF] hover:bg-[#007AFF]/25"
                    >
                      🚗 {activeVehicle ? `${activeVehicle.shortName} Garage` : 'Buy EV ($0 Fares)'}
                    </button>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Cash: {formatCurrency(cash)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {COMMUTE_MODES.map((m) => {
                    const lockedCar = Boolean(m.requiresCar) && !hasCar;
                    const lockedBigTech =
                      Boolean(m.requiresBigTech) && !job;
                    const isLocked = lockedCar || lockedBigTech;
                    const active = selectedMode === m.id;
                    const isPersonalCarMode = m.id === 'tesla';
                    const display =
                      isPersonalCarMode && activeVehicle
                        ? {
                          shortTitle: activeVehicle.name,
                          subtitle: `${activeVehicle.tierLabel} · $0 Fare`,
                        }
                        : COMMUTE_DISPLAY_LABELS[m.id];
                    const cardEmoji =
                      isPersonalCarMode && activeVehicle ? activeVehicle.emoji : m.emoji;
                    const modeEst = calculateCommuteDetails(
                      locationId,
                      targetPlaceId,
                      homeId,
                      m.id,
                      activeVehicle?.id
                    );

                    return (
                      <button
                        key={m.id}
                        disabled={lockedBigTech}
                        onClick={() => {
                          if (lockedCar) {
                            setActiveModal('garage');
                            return;
                          }
                          setSelectedMode(m.id);
                        }}
                        className={`btn-press flex flex-col justify-between rounded-2xl border p-2.5 text-left transition-all ${active
                            ? 'border-[#007AFF] bg-[#007AFF]/15 ring-2 ring-[#007AFF]/30 shadow-sm'
                            : lockedCar
                              ? 'border-[#007AFF]/35 bg-[#007AFF]/8 hover:border-[#007AFF]'
                              : isLocked
                                ? 'cursor-not-allowed border-rose-500/25 bg-[var(--mist)] opacity-75'
                                : 'border-transparent bg-[var(--mist)] hover:border-[#007AFF]/40'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-base">{cardEmoji}</span>
                          <div className="flex items-center gap-1">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${modeEst.fare === 0
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-white/80 text-slate-800 dark:bg-white/10 dark:text-slate-100'
                                }`}
                            >
                              {modeEst.fare === 0
                                ? 'FREE'
                                : formatCurrency(modeEst.fare)}
                            </span>
                            <span className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--ink-soft)] dark:bg-white/10">
                              {modeEst.durationMinutes}m
                            </span>
                          </div>
                        </div>

                        <div className="mt-1.5">
                          <div className="text-xs font-extrabold text-[var(--ink)]">
                            {display.shortTitle}
                          </div>
                          {lockedCar ? (
                            <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-[#007AFF]/15 px-1.5 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                              <span>🚗 Tap to Buy EV (From $4.2k)</span>
                            </div>
                          ) : isLocked ? (
                            <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
                              <Lock className="size-2.5 shrink-0" />
                              <span>🔒 Need Big Tech Job</span>
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
            ) : workShift ? (
              <div className="space-y-2">
                <div className="rounded-xl bg-amber-500/15 px-3 py-2 text-center text-[11px] font-extrabold text-amber-800 dark:text-amber-300">
                  🔒 Currently Clocked Into Work Shift ({workShift.mode?.toUpperCase() || 'OFFICE'}) — Travel is locked until you finish or leave early.
                </div>
                <button
                  onClick={leaveWorkEarly}
                  className="btn-press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-xs font-extrabold text-white shadow-md hover:bg-rose-700"
                >
                  <Lock className="size-4" />
                  <span>Leave Shift Early to Travel</span>
                </button>
              </div>
            ) : isInspectingOtherHome ? (
              <button
                onClick={() => moveHome(selectedTarget.home.id)}
                disabled={
                  !ownedHomes.includes(selectedTarget.home.id) &&
                  cash < selectedTarget.home.weeklyRent
                }
                className="btn-press flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 disabled:opacity-50"
              >
                <Home className="size-4 shrink-0" />
                <span>
                  {ownedHomes.includes(selectedTarget.home.id)
                    ? `🔑 Move Into ${selectedTarget.home.name} ($0)`
                    : `🏡 Lease & Move Into ${selectedTarget.home.name} (${formatCurrency(
                      selectedTarget.home.weeklyRent
                    )}/wk)`}
                </span>
              </button>
            ) : (
              <button
                onClick={() =>
                  travelTo(
                    selectedTarget.kind === 'home' ? 'home' : selectedTarget.loc.id,
                    selectedMode
                  )
                }
                className="btn-press flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#007AFF] px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-[#007AFF]/30 hover:bg-[#0066CC]"
              >
                <Rocket className="size-4 shrink-0" />
                <span>
                  🚀 Travel to {selectedVenueName} ({selectedFareLabel} ·{' '}
                  {activeCommuteEst.durationMinutes}m · {activeCommuteEst.miles} mi)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
