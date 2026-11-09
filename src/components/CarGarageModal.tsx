import React from 'react';
import {
  CAREER_BY_ID,
  LOCATION_BY_ID,
  MOODLETS,
  VEHICLES,
  calculateCommuteDetails,
} from '../data/worldData';
import {
  formatCurrency,
  getActiveVehicle,
  hasPersonalCar,
  useGameStore,
} from '../store/useGameStore';
import { Car, Compass, X, Zap, Check, ShieldCheck } from 'lucide-react';

const QUICK_DESTINATIONS = [
  { id: 'dolores_park', label: 'Dolores Park', sub: 'Mission Sunny Lawn' },
  { id: 'blue_bottle_hayes', label: 'Hayes Valley Cafe', sub: 'Espresso & Founders' },
  { id: 'sand_hill_vc', label: 'Sand Hill Road', sub: 'Menlo Park VC Pitch' },
  { id: 'dogpatch_boulders', label: 'Dogpatch Boulders', sub: 'Climbing & Cold Plunge' },
  { id: 'ferry_building', label: 'Ferry Building', sub: 'Embarcadero Market' },
];

export const CarGarageModal: React.FC = () => {
  const state = useGameStore();
  const {
    cash,
    ownedCars,
    locationId,
    homeId,
    job,
    setActiveModal,
    buyVehicle,
    selectActiveCar,
    takeCarJoyride,
    travelTo,
    commuteToOfficeAndWork,
  } = state;

  const ownsCar = hasPersonalCar(state);
  const activeVehicle = getActiveVehicle(state);
  const career = job ? CAREER_BY_ID[job.careerId] : null;
  const hqVenue = career ? LOCATION_BY_ID[career.locationId] : null;

  const handleDriveToWork = () => {
    commuteToOfficeAndWork('tesla');
    setActiveModal(null);
  };

  const handleDriveTo = (destId: string) => {
    if (locationId === destId) {
      setActiveModal(null);
      return;
    }
    travelTo(destId, 'tesla');
    setActiveModal(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-md"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700/80 dark:bg-[#141722] dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-[#007AFF] text-white shadow-md">
              <Car className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">
                  Apple CarPlay & Bay Area EV Garage
                </h2>
                {activeVehicle ? (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10.5px] font-black text-emerald-700 dark:text-emerald-300">
                    {activeVehicle.emoji} Active: {activeVehicle.shortName} · $0 Fares
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10.5px] font-black text-amber-700 dark:text-amber-300">
                    No Personal EV Owned Yet
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-[var(--ink-soft)]">
                Your personal vehicle hub: compare EVs, launch 1-tap CarPlay drives anywhere in the
                Bay, or take a scenic joyride
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
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
              aria-label="Close EV Garage"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* =========================================================
              1. APPLE HIG CLARITY BANNER: HOW CARS WORK IN BAY LIFE
          ========================================================= */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                <span>💸</span>
                <span>1. $0 Fares Forever</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-[var(--ink-soft)]">
                Stop paying $18 Waymo or $6 Caltrain fares. Once you own any EV, every drive to
                work, cafes, or VC offices costs <strong>$0</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-[#007AFF]/25 bg-[#007AFF]/8 p-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#007AFF]">
                <span>⚡</span>
                <span>2. Fast HOV Autopilot</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-[var(--ink-soft)]">
                Unlocks the US-101 / I-280 Diamond HOV lane, cutting commute times down to{' '}
                <strong>8–15 mins</strong> and auto-setting your default commute mode.
              </p>
            </div>

            <div className="rounded-2xl border border-purple-500/25 bg-purple-500/8 p-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-purple-700 dark:text-purple-300">
                <span>🌊</span>
                <span>3. CarPlay & Joyrides</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-[var(--ink-soft)]">
                Every arrival grants a happy <strong>Driving Moodlet</strong> (+6 to +14 Mood), plus
                you can take 1-tap scenic joyrides for instant Fun, Energy & Karma.
              </p>
            </div>
          </div>

          {/* =========================================================
              2. APPLE CARPLAY QUICK-DRIVE CONSOLE (DIRECT MANIPULATION)
          ========================================================= */}
          <div
            className={`rounded-3xl border p-4 transition-all ${
              ownsCar
                ? 'border-[#007AFF]/35 bg-gradient-to-br from-[#007AFF]/12 via-indigo-500/8 to-emerald-500/10'
                : 'border-black/10 bg-[var(--mist)] dark:border-white/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-black/85 text-xl text-white shadow-sm dark:bg-white/15">
                  {activeVehicle ? activeVehicle.emoji : '🧭'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider text-[#007AFF] uppercase">
                      Apple CarPlay Navigation
                    </span>
                    {activeVehicle && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                        🔋 98% Charged · HOV Sticker Valid
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold">
                    {activeVehicle
                      ? `1-Tap Direct Drive in your ${activeVehicle.name}`
                      : 'Buy an EV below to unlock 1-Tap CarPlay Navigation & Scenic Joyrides'}
                  </h3>
                </div>
              </div>

              {activeVehicle && (
                <button
                  onClick={takeCarJoyride}
                  className="btn-press flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#007AFF] to-[#5856D6] px-3.5 py-2 text-xs font-extrabold text-white shadow-md hover:opacity-95"
                >
                  <Compass className="size-4" />
                  <span>
                    {activeVehicle.joyrideLabel || activeVehicle.joyrideReward.label} (+
                    {activeVehicle.joyrideReward.fun}% Fun · +{activeVehicle.joyrideReward.karma}{' '}
                    ⚡)
                  </span>
                </button>
              )}
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {/* Drive to Work HQ */}
              {career && hqVenue && (
                <button
                  disabled={!ownsCar}
                  onClick={handleDriveToWork}
                  className="btn-press flex flex-col justify-between rounded-2xl border border-[#007AFF]/30 bg-white/80 p-2.5 text-left shadow-2xs transition hover:border-[#007AFF] disabled:opacity-45 dark:bg-black/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{career.emoji}</span>
                    <span className="rounded-full bg-[#007AFF]/15 px-1.5 py-0.5 font-mono text-[9.5px] font-black text-[#007AFF]">
                      $0 ·{' '}
                      {
                        calculateCommuteDetails(
                          locationId,
                          career.locationId,
                          homeId,
                          'tesla',
                          activeVehicle?.id
                        ).durationMinutes
                      }
                      m
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <div className="truncate text-[11px] font-extrabold">
                      {career.company} HQ
                    </div>
                    <div className="truncate text-[9.5px] font-semibold text-[#007AFF]">
                      Drive & Badge In
                    </div>
                  </div>
                </button>
              )}

              {/* Drive Home */}
              <button
                disabled={!ownsCar || locationId === 'home'}
                onClick={() => handleDriveTo('home')}
                className="btn-press flex flex-col justify-between rounded-2xl border border-black/8 bg-white/80 p-2.5 text-left shadow-2xs transition hover:border-[#007AFF] disabled:opacity-45 dark:border-white/10 dark:bg-black/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">🏠</span>
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-black text-emerald-700 dark:text-emerald-300">
                    {locationId === 'home'
                      ? 'Here'
                      : `$0 · ${
                          calculateCommuteDetails(
                            locationId,
                            'home',
                            homeId,
                            'tesla',
                            activeVehicle?.id
                          ).durationMinutes
                        }m`}
                  </span>
                </div>
                <div className="mt-1.5">
                  <div className="truncate text-[11px] font-extrabold">Apartment</div>
                  <div className="truncate text-[9.5px] text-[var(--ink-soft)]">
                    Return Home
                  </div>
                </div>
              </button>

              {/* Popular Bay Venues */}
              {QUICK_DESTINATIONS.slice(0, career ? 4 : 5).map((dest) => {
                const venue = LOCATION_BY_ID[dest.id];
                if (!venue) return null;
                const est = calculateCommuteDetails(
                  locationId,
                  dest.id,
                  homeId,
                  'tesla',
                  activeVehicle?.id
                );
                const isHere = locationId === dest.id;
                return (
                  <button
                    key={dest.id}
                    disabled={!ownsCar || isHere}
                    onClick={() => handleDriveTo(dest.id)}
                    className="btn-press flex flex-col justify-between rounded-2xl border border-black/8 bg-white/80 p-2.5 text-left shadow-2xs transition hover:border-[#007AFF] disabled:opacity-45 dark:border-white/10 dark:bg-black/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{venue.emoji}</span>
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-black text-emerald-700 dark:text-emerald-300">
                        {isHere ? 'Here' : `$0 · ${est.durationMinutes}m`}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <div className="truncate text-[11px] font-extrabold">{dest.label}</div>
                      <div className="truncate text-[9.5px] text-[var(--ink-soft)]">
                        {dest.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =========================================================
              3. BAY AREA EV SHOWROOM & GARAGE LINEUP (3 TIERS)
          ========================================================= */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold">
                  Bay Area EV Showroom & Vehicle Lineup
                </h3>
                <p className="text-xs text-[var(--ink-soft)]">
                  Start with an affordable $4,200 Prius Prime for immediate $0 HOV commutes, or
                  upgrade to Tesla FSD & Porsche Taycan GT
                </p>
              </div>
              <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10.5px] font-bold text-[var(--ink-soft)] dark:bg-white/10">
                100% Equity Included in Net Worth
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
              {VEHICLES.map((veh) => {
                const isOwned =
                  ownedCars.includes(veh.id) ||
                  (veh.id === 'tesla' && ownedCars.includes('tesla') && ownedCars.length === 1);
                const isActive = activeVehicle?.id === veh.id;
                const canAfford = cash >= veh.price;
                const moodDef = MOODLETS[veh.moodletId];

                return (
                  <div
                    key={veh.id}
                    className={`flex flex-col justify-between rounded-3xl border p-4 transition-all ${
                      isActive
                        ? 'border-[#007AFF] bg-[#007AFF]/10 ring-2 ring-[#007AFF]/25'
                        : isOwned
                        ? 'border-emerald-500/35 bg-emerald-500/8'
                        : 'border-black/8 bg-[var(--mist)] dark:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/85 text-2xl shadow-xs dark:bg-white/10">
                            {veh.emoji}
                          </span>
                          <div className="min-w-0">
                            <span className="inline-flex items-center rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[9px] font-black whitespace-nowrap text-[#007AFF] uppercase">
                              {veh.tierLabel || veh.brand}
                            </span>
                            <h4 className="mt-1 text-sm font-extrabold leading-tight">
                              {veh.name}
                            </h4>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(veh.price)}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
                        {veh.tagline}
                      </p>

                      {/* Clear Comparison Metrics */}
                      <div className="mt-3 space-y-1.5 rounded-2xl bg-white/70 p-2.5 text-[11px] dark:bg-black/25">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--ink-soft)]">Commute Fare:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            $0 Forever (HOV)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--ink-soft)]">Base Drive Time:</span>
                          <span className="font-mono font-extrabold text-[#007AFF]">
                            ~{veh.baseMinutes} mins ({Math.round(veh.speedTimeMult * 100)}% time)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--ink-soft)]">Arrival Buff:</span>
                          <span className="font-extrabold text-purple-700 dark:text-purple-300">
                            {moodDef ? `${moodDef.emoji} +${moodDef.delta} Mood` : '+Mood'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--ink-soft)]">Joyride Boost:</span>
                          <span className="font-extrabold text-amber-700 dark:text-amber-300">
                            +{veh.joyrideReward.fun}% Fun · +{veh.joyrideReward.karma} ⚡
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-2">
                      {isActive ? (
                        <button
                          onClick={takeCarJoyride}
                          className="btn-press flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-extrabold text-white shadow-xs"
                        >
                          <Check className="size-4" />
                          <span>Active Daily Driver · Tap for Joyride</span>
                        </button>
                      ) : isOwned ? (
                        <button
                          onClick={() => selectActiveCar(veh.id)}
                          className="btn-press flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#007AFF] px-3 py-2.5 text-xs font-extrabold text-white shadow-xs"
                        >
                          <ShieldCheck className="size-4" />
                          <span>Set as Active Daily Driver</span>
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => buyVehicle(veh.id)}
                          className={`btn-press flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                            canAfford
                              ? 'bg-[#007AFF] text-white shadow-md hover:bg-[#0066CC]'
                              : 'bg-black/10 text-[var(--ink-soft)] opacity-50 dark:bg-white/10'
                          }`}
                        >
                          <Zap className="size-4" />
                          <span>
                            {canAfford
                              ? `Buy ${veh.shortName} (${formatCurrency(veh.price)})`
                              : `Need ${formatCurrency(veh.price)}`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
