import React, { useState } from 'react';
import {
  ACTIONS,
  COMMUTE_MODES,
  HOMES,
  LOCATIONS,
  NPCS,
} from '../data/worldData';
import { formatCurrency, useGameStore } from '../store/useGameStore';
import { CommuteModeId, LocationDef } from '../types/game';
import { Navigation, Home, X, Check, Sparkles, MapPin } from 'lucide-react';

export const WorldMapModal: React.FC = () => {
  const locationId = useGameStore((s) => s.locationId);
  const homeId = useGameStore((s) => s.homeId);
  const cash = useGameStore((s) => s.cash);
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

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#dbeafe] dark:bg-[#0f172a]">
      {/* Top Floating Map Header */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <div className="apple-pill flex items-center gap-2.5 rounded-full px-4 py-2">
          <MapPin className="size-4 text-[#007AFF]" />
          <div>
            <span className="text-xs font-extrabold tracking-tight">Bay Area Transit & Map</span>
            <span className="ml-2 text-[11px] text-[var(--ink-soft)]">
              Cash: {formatCurrency(cash)}
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

      {/* Main Split View: Interactive Bay Area Vector Map + Destination Inspector */}
      <div className="relative z-10 grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-12">
        {/* Stylized San Francisco Bay Area SVG Map */}
        <div className="apple-glass relative min-h-[260px] overflow-hidden rounded-3xl lg:col-span-7">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.52" />
              </linearGradient>
            </defs>
            {/* Bay & Pacific Water */}
            <rect width="100" height="100" fill="url(#waterGrad)" />

            {/* Marin Headlands (North) */}
            <path
              d="M 8,0 L 36,0 L 32,14 L 18,16 L 8,8 Z"
              fill="#A7F3D0"
              opacity="0.7"
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

            {/* Iconic Bridges & US-101 / I-280 / Caltrain Corridor */}
            {/* Golden Gate Bridge */}
            <line x1="25" y1="14" x2="25" y2="22" stroke="#EA580C" strokeWidth="1.2" />
            {/* Bay Bridge */}
            <line x1="37" y1="25" x2="58" y2="22" stroke="#94A3B8" strokeWidth="0.9" strokeDasharray="1.5,1" />
            {/* San Mateo Bridge */}
            <line x1="46" y1="53" x2="68" y2="46" stroke="#94A3B8" strokeWidth="0.7" strokeDasharray="1.5,1" />
            {/* Caltrain / US-101 Spine */}
            <path
              d="M 33,26 Q 40,52 64,82"
              fill="none"
              stroke="#007AFF"
              strokeWidth="0.7"
              strokeDasharray="2,1.5"
            />

            {/* Region Labels */}
            <text x="20" y="10" fontSize="2.8" fontWeight="700" fill="#047857" opacity="0.7">
              MARIN
            </text>
            <text x="19" y="29" fontSize="2.8" fontWeight="800" fill="#0F172A" opacity="0.5">
              SAN FRANCISCO
            </text>
            <text x="34" y="61" fontSize="2.8" fontWeight="700" fill="#0F172A" opacity="0.45">
              PENINSULA
            </text>
            <text x="53" y="92" fontSize="3" fontWeight="800" fill="#0F172A" opacity="0.5">
              SILICON VALLEY · SOUTH BAY
            </text>
            <text x="72" y="28" fontSize="2.8" fontWeight="700" fill="#0F172A" opacity="0.45">
              EAST BAY
            </text>
          </svg>

          {/* Home Pin */}
          <button
            onClick={() => setSelectedLoc('home')}
            style={{ left: '29%', top: '48%' }}
            className={`btn-press absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-md transition-all ${
              selectedLoc === 'home'
                ? 'scale-110 bg-[#34C759] text-white ring-4 ring-emerald-400/40 z-20'
                : 'bg-white/95 text-slate-900 hover:scale-105 z-10'
            }`}
          >
            <Home className="size-3.5" />
            <span>Home</span>
            {locationId === 'home' && (
              <span className="ml-0.5 size-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          {/* Venue Pins */}
          {filteredLocations.map((loc) => {
            const isSelected = selectedLoc !== 'home' && selectedLoc.id === loc.id;
            const isHere = locationId === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLoc(loc)}
                style={{ left: `${loc.mapCoords.x}%`, top: `${loc.mapCoords.y}%` }}
                className={`btn-press absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md transition-all ${
                  isSelected
                    ? 'scale-110 bg-[#007AFF] text-white ring-4 ring-[#007AFF]/35 z-20'
                    : isHere
                    ? 'bg-emerald-600 text-white z-20'
                    : 'bg-white/92 text-slate-900 hover:scale-105 z-10'
                }`}
              >
                <span>{loc.emoji}</span>
                <span className="hidden sm:inline">{loc.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Destination Details & Commute Picker */}
        <div className="apple-glass-heavy flex flex-col justify-between overflow-y-auto rounded-3xl p-5 lg:col-span-5">
          <div>
            {selectedLoc === 'home' ? (
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-2xl">
                    {homeDef.emoji}
                  </span>
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">
                      Your Residence · {homeDef.district}
                    </span>
                    <h2 className="text-lg font-extrabold">{homeDef.name}</h2>
                    <p className="text-xs text-[var(--ink-soft)]">{homeDef.area}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[var(--ink-soft)]">
                  {homeDef.tagline} Sleep, grind LeetCode at your workstation, brew espresso, or upgrade your apartment in Furnish Mode.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#007AFF]/15 text-2xl">
                    {selectedLoc.emoji}
                  </span>
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-[#007AFF] uppercase">
                      {selectedLoc.district} · {selectedLoc.area}
                    </span>
                    <h2 className="text-lg font-extrabold">{selectedLoc.name}</h2>
                    <p className="text-xs text-[var(--ink-soft)]">{selectedLoc.tagline}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[var(--ink-soft)]">
                  {selectedLoc.description}
                </p>

                {/* Available Activities at this Venue */}
                <div className="mt-3.5">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Activities & Stations Here
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLoc.stations.flatMap((st) =>
                      st.actionIds.map((actId) => {
                        const act = ACTIONS[actId];
                        return act ? (
                          <span
                            key={`${st.id}-${actId}`}
                            className="rounded-xl bg-[var(--mist)] px-2.5 py-1 text-[11px] font-semibold"
                          >
                            {act.emoji} {act.label}
                          </span>
                        ) : null;
                      })
                    )}
                  </div>
                </div>

                {/* Regulars / NPCs at this spot */}
                <div className="mt-3">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Regulars Spotted Here
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {NPCS.filter((n) => n.favoriteSpot === selectedLoc.id).map((n) => (
                      <span
                        key={n.id}
                        className="rounded-full bg-[#007AFF]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#007AFF]"
                      >
                        👤 {n.name} ({n.company})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Commute Mode Picker */}
            <div className="mt-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Select Bay Area Transit Mode
              </div>
              <div className="grid gap-1.5">
                {COMMUTE_MODES.map((m) => {
                  const lockedCar = m.requiresCar && !ownedCars.includes('tesla');
                  const active = selectedMode === m.id;
                  return (
                    <button
                      key={m.id}
                      disabled={lockedCar}
                      onClick={() => setSelectedMode(m.id)}
                      className={`btn-press flex items-center justify-between rounded-2xl px-3 py-2 text-left border ${
                        active
                          ? 'border-[#007AFF] bg-[#007AFF]/12'
                          : lockedCar
                          ? 'border-transparent bg-[var(--mist)] opacity-50'
                          : 'border-transparent bg-[var(--mist)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{m.emoji}</span>
                        <div>
                          <div className="text-xs font-bold">
                            {m.name}{' '}
                            {lockedCar && (
                              <span className="text-[10px] font-normal text-rose-500">
                                (Buy EV in Wealth App)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--ink-soft)]">{m.tagline}</div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-bold">
                          {m.baseFare === 0 ? 'FREE' : formatCurrency(m.baseFare)}
                        </div>
                        <div className="text-[10px] text-[var(--ink-soft)]">
                          {m.durationMinutes} min
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5">
            {isAlreadyHere ? (
              <button
                onClick={() => setView('live')}
                className="btn-press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold text-white"
              >
                <Check className="size-4" />
                You Are Already Here · Return to Scene
              </button>
            ) : (
              <button
                onClick={() => travelTo(targetId, selectedMode)}
                className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#007AFF] text-sm font-bold text-white shadow-md shadow-[#007AFF]/25"
              >
                <Navigation className="size-4" />
                Commute to {selectedLoc === 'home' ? 'Home' : selectedLoc.shortName}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

