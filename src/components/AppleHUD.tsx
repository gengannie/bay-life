import React from 'react';
import {
  CAREER_BY_ID,
  COMMUTE_MODES,
  GOALS,
  HOMES,
  LOCATION_BY_ID,
  NEEDS_META,
  WORK_TONES,
} from '../data/worldData';
import {
  calculateOverallMood,
  formatCurrency,
  formatTime,
  getDayNumber,
  getDayOfWeekName,
  isHomePowered,
  useGameStore,
} from '../store/useGameStore';
import { Portrait } from './Portrait';
import {
  Map,
  ShoppingBag,
  Smartphone,
  Briefcase,
  Home,
  Pause,
  Play,
  FastForward,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Zap,
  ZapOff,
  X,
  Sparkles,
  SkipForward,
} from 'lucide-react';

export const AppleHUD: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const view = useGameStore((s) => s.view);
  const time = useGameStore((s) => s.time);
  const speed = useGameStore((s) => s.speed);
  const weather = useGameStore((s) => s.weather);
  const cash = useGameStore((s) => s.cash);
  const vestedRsu = useGameStore((s) => s.vestedRsu);
  const karma = useGameStore((s) => s.karma);
  const needs = useGameStore((s) => s.needs);
  const locationId = useGameStore((s) => s.locationId);
  const homeId = useGameStore((s) => s.homeId);
  const queue = useGameStore((s) => s.queue);
  const job = useGameStore((s) => s.job);
  const workShift = useGameStore((s) => s.workShift);
  const travel = useGameStore((s) => s.travel);
  const activeEvent = useGameStore((s) => s.activeEvent);
  const lastToast = useGameStore((s) => s.lastToast);
  const goalIndex = useGameStore((s) => s.goalIndex);
  const soundOn = useGameStore((s) => s.soundOn);
  const nightMode = useGameStore((s) => s.nightMode);

  const setView = useGameStore((s) => s.setView);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const toggleNightMode = useGameStore((s) => s.toggleNightMode);
  const cancelQueuedAction = useGameStore((s) => s.cancelQueuedAction);
  const startWorkShift = useGameStore((s) => s.startWorkShift);
  const leaveWorkEarly = useGameStore((s) => s.leaveWorkEarly);
  const setWorkTone = useGameStore((s) => s.setWorkTone);
  const skipTravelNow = useGameStore((s) => s.skipTravelNow);
  const travelTo = useGameStore((s) => s.travelTo);
  const resolveEventChoice = useGameStore((s) => s.resolveEventChoice);
  const dismissToast = useGameStore((s) => s.dismissToast);
  const setScreen = useGameStore((s) => s.setScreen);

  const state = useGameStore.getState();
  const moodInfo = calculateOverallMood(state);
  const powered = isHomePowered(state);

  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const currentPlaceName =
    locationId === 'home'
      ? homeDef.name
      : LOCATION_BY_ID[locationId]?.shortName || 'Bay Area';
  const currentPlaceEmoji =
    locationId === 'home'
      ? homeDef.emoji
      : LOCATION_BY_ID[locationId]?.emoji || '📍';

  const currentGoal = GOALS[goalIndex];
  const weatherLabel =
    weather === 'sunny'
      ? '☀️ 68°F'
      : weather === 'foggy'
      ? '🌫️ Fog 56°F'
      : weather === 'breezy'
      ? '🌬️ 63°F'
      : '🌧️ Rain 54°F';

  const careerDef = job ? CAREER_BY_ID[job.careerId] : null;
  const levelDef = careerDef && job ? careerDef.levels[job.levelIndex] : null;

  return (
    <>
      {/* TOP BAR HUD */}
      <div className="pointer-events-none fixed top-0 right-0 left-0 z-30 flex flex-wrap items-center justify-between gap-2 p-3 sm:px-5">
        {/* Left Status Pill: Location, Clock, Weather, Speed Controls */}
        <div className="apple-pill pointer-events-auto flex flex-wrap items-center gap-2 rounded-full px-3 py-1.5 text-xs">
          <button
            onClick={() => setView(view === 'map' ? 'live' : 'map')}
            className="btn-press flex items-center gap-1.5 font-bold hover:text-[#007AFF]"
          >
            <span>{currentPlaceEmoji}</span>
            <span className="max-w-[130px] truncate">{currentPlaceName}</span>
          </button>

          <span className="text-slate-300 dark:text-slate-600">|</span>

          <div className="font-mono text-[11px] font-bold">
            Day {getDayNumber(time)} · {getDayOfWeekName(time).slice(0, 3)} {formatTime(time)}
          </div>

          <span className="hidden text-[11px] text-[var(--ink-soft)] md:inline">
            {weatherLabel}
          </span>

          {/* PG&E Power Status */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              powered
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/20 text-rose-500 animate-pulse'
            }`}
            title={powered ? 'Grid & Fiber Online' : 'PG&E Power Shutoff'}
          >
            {powered ? <Zap className="size-3" /> : <ZapOff className="size-3" />}
            <span className="hidden sm:inline">{powered ? 'Grid OK' : 'PG&E Out'}</span>
          </span>

          {/* Speed Segmented Control */}
          <div className="flex items-center gap-0.5 rounded-full bg-[var(--mist)] p-0.5">
            {([0, 1, 2, 3] as const).map((sp) => (
              <button
                key={sp}
                onClick={() => setSpeed(sp)}
                className={`btn-press flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold ${
                  speed === sp
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                {sp === 0 ? <Pause className="size-3" /> : sp === 1 ? <Play className="size-3" /> : `${sp}×`}
              </button>
            ))}
          </div>
        </div>

        {/* Right Status Pill: Cash, RSU, Karma, Theme & Sound */}
        <div className="apple-pill pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
          <button
            onClick={() => setActiveModal('phone', 'wealth')}
            className="btn-press flex items-center gap-1.5 font-mono font-extrabold text-emerald-600 dark:text-emerald-400"
          >
            <span>{formatCurrency(cash)}</span>
            {vestedRsu > 0 && (
              <span className="hidden rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-600 sm:inline dark:text-purple-400">
                +{formatCurrency(vestedRsu)} RSU
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveModal('sim', 'perks')}
            className="btn-press rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400"
            title="Karma Points — Spend on Perks"
          >
            ⚡ {karma}
          </button>

          <button
            onClick={toggleSound}
            className="btn-press grid size-6 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
            aria-label="Toggle sound"
          >
            {soundOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </button>

          <button
            onClick={toggleNightMode}
            className="btn-press grid size-6 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
            title={`Theme: ${nightMode}`}
          >
            {nightMode === 'dark' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
          </button>

          <button
            onClick={() => setScreen('title')}
            className="btn-press rounded-full bg-[var(--mist)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]"
          >
            Menu
          </button>
        </div>
      </div>

      {/* DYNAMIC ISLAND TOAST NOTIFICATION */}
      {lastToast && (
        <div className="pointer-events-none fixed top-16 left-1/2 z-40 w-[calc(100%-32px)] max-w-md -translate-x-1/2">
          <div className="apple-glass-heavy pointer-events-auto flex items-center justify-between gap-3 rounded-full px-4 py-2.5 shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg">{lastToast.emoji}</span>
              <span className="truncate text-xs font-semibold">{lastToast.text}</span>
            </div>
            <button
              onClick={dismissToast}
              className="btn-press grid size-5 shrink-0 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)]"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-HEADER: MILESTONE GOAL PILL & ACTION QUEUE */}
      {view === 'live' && (
        <div className="pointer-events-none fixed top-16 left-3 z-20 flex flex-col items-start gap-2 sm:left-5">
          {/* Progressive Goal Pill (Just like Lagos Life GoalPill) */}
          {currentGoal && (
            <button
              onClick={() => setActiveModal('sim', 'wishes')}
              className="apple-pill btn-press pointer-events-auto flex items-center gap-2.5 rounded-2xl px-3.5 py-2 text-left"
            >
              <span className="grid size-8 place-items-center rounded-xl bg-[#007AFF]/15 text-base">
                {currentGoal.emoji}
              </span>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#007AFF]">
                  <span>Next Milestone</span>
                  <span>· +{formatCurrency(currentGoal.rewardCash)}</span>
                </div>
                <div className="text-xs font-bold">{currentGoal.title}</div>
                <div className="max-w-[230px] truncate text-[10px] text-[var(--ink-soft)]">
                  {currentGoal.desc}
                </div>
              </div>
            </button>
          )}

          {/* Active & Queued Actions Strip */}
          {queue.length > 0 && (
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
              {queue.map((item, idx) => {
                const pct = Math.min(100, Math.round((item.elapsedMinutes / item.totalMinutes) * 100));
                return (
                  <button
                    key={item.uid}
                    onClick={() => cancelQueuedAction(item.uid)}
                    title="Click to cancel action"
                    className="apple-pill btn-press group relative flex items-center gap-2 overflow-hidden rounded-full px-3 py-1.5 text-xs font-semibold"
                  >
                    {idx === 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-[#007AFF]/15 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <span className="relative z-10">{item.emoji}</span>
                    <span className="relative z-10 max-w-[120px] truncate">{item.label}</span>
                    {idx === 0 && (
                      <span className="relative z-10 font-mono text-[10px] text-[#007AFF]">
                        {pct}%
                      </span>
                    )}
                    <X className="relative z-10 size-3 opacity-50 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ACTIVE WORK SHIFT OVERLAY CARD (Just like Lagos Life c4 WorkView Card) */}
      {workShift && job && careerDef && levelDef && (
        <div className="fixed top-28 left-1/2 z-30 w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div className="apple-glass-heavy rounded-3xl p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#007AFF]/15 text-2xl">
                  {careerDef.emoji}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold">{careerDef.company}</span>
                    <span className="rounded-full bg-[#007AFF] px-2 py-0.5 text-[10px] font-bold text-white">
                      {levelDef.code}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--ink-soft)]">
                    {levelDef.title} · Shift ends at {formatTime(workShift.endsAt)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-extrabold text-emerald-600">
                  +{formatCurrency(levelDef.shiftPay)}
                </div>
                <div className="text-[10px] font-semibold text-purple-600">
                  +{formatCurrency(levelDef.rsuPerShift)} RSU
                </div>
              </div>
            </div>

            {/* Shift Elapsed Progress */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold">
                <span>Shift Progress</span>
                <span>
                  {Math.round((workShift.elapsedMinutes / workShift.totalMinutes) * 100)}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[#007AFF] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (workShift.elapsedMinutes / workShift.totalMinutes) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Promo Readiness Bar */}
            <div className="mt-2.5">
              <div className="flex justify-between text-[11px] font-semibold">
                <span>Promo Packet Performance</span>
                <span>{Math.round(job.performance)}% / 92%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${job.performance}%` }}
                />
              </div>
            </div>

            {/* Work Tone Selector Pills (Just like Lagos Life WORK_TONES) */}
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Work Style & Focus Tone
              </div>
              <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
                {WORK_TONES.map((wt) => (
                  <button
                    key={wt.id}
                    onClick={() => setWorkTone(wt.id)}
                    className={`btn-press shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      workShift.tone === wt.id
                        ? 'bg-[#007AFF] text-white shadow-xs'
                        : 'bg-[var(--mist)] text-[var(--ink)]'
                    }`}
                  >
                    {wt.emoji} {wt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={leaveWorkEarly}
              className="btn-press mt-3 w-full rounded-xl bg-[var(--mist)] py-1.5 text-xs font-semibold text-[var(--ink-soft)] hover:text-rose-500"
            >
              Badge Out Early (Collect Partial Shift Pay)
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE COMMUTE / TRANSIT OVERLAY CARD */}
      {travel && (
        <div className="fixed top-28 left-1/2 z-30 w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div className="apple-glass-heavy rounded-3xl p-4 shadow-xl">
            {(() => {
              const modeDef = COMMUTE_MODES.find((m) => m.id === travel.mode);
              const destName =
                travel.to === 'home'
                  ? homeDef.name
                  : LOCATION_BY_ID[travel.to]?.name || travel.to;
              const elapsed = Math.max(0, time - travel.startedAt);
              const pct = Math.min(100, Math.round((elapsed / travel.totalMinutes) * 100));

              return (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-2xl bg-[#007AFF]/15 text-2xl">
                        {modeDef?.emoji || '🚆'}
                      </span>
                      <div>
                        <div className="text-sm font-extrabold">
                          En Route to {destName}
                        </div>
                        <div className="text-xs text-[var(--ink-soft)]">
                          {modeDef?.name} · Arriving at {formatTime(travel.arriveAt)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={skipTravelNow}
                      className="btn-press flex items-center gap-1 rounded-full bg-[#007AFF] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <SkipForward className="size-3.5" />
                      Arrive
                    </button>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#007AFF] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* INTERACTIVE DILEMMA / EVENT MODAL */}
      {activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="apple-glass-heavy w-full max-w-md rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-amber-500/15 text-2xl">
                {activeEvent.emoji}
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Silicon Valley Moment
                </span>
                <h3 className="text-base font-extrabold">{activeEvent.title}</h3>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[var(--ink-soft)]">
              {activeEvent.description}
            </p>

            <div className="mt-4 grid gap-2.5">
              {activeEvent.choices.map((ch, idx) => (
                <button
                  key={idx}
                  onClick={() => resolveEventChoice(idx)}
                  className="btn-press flex items-center justify-between gap-3 rounded-2xl bg-[var(--mist)] p-3.5 text-left hover:bg-[#007AFF]/15"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{ch.emoji}</span>
                    <div>
                      <div className="text-xs font-bold">{ch.label}</div>
                      {ch.skillCheck && (
                        <div className="text-[10px] font-semibold text-[#007AFF]">
                          Skill Check: {ch.skillCheck.skill} Lv.{ch.skillCheck.difficulty}+
                        </div>
                      )}
                    </div>
                  </div>
                  <Sparkles className="size-4 shrink-0 text-[#007AFF]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM FLOATING APPLE DOCK */}
      <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-30 flex flex-wrap items-end justify-between gap-2 p-3 sm:px-5">
        {/* Left: Sim Badge & Mini Needs Bars (Just like Lagos Life SimBadge) */}
        <button
          onClick={() => setActiveModal('sim', 'needs')}
          className="apple-glass-heavy btn-press pointer-events-auto flex items-center gap-3 rounded-3xl p-2 pr-4"
        >
          <Portrait appearance={sim.appearance} size={46} ringColor={moodInfo.color} />
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold">{sim.name.split(' ')[0]}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white"
                style={{ backgroundColor: moodInfo.color }}
              >
                {moodInfo.label}
              </span>
            </div>
            {/* 6 Mini Needs Bars */}
            <div className="mt-1.5 grid grid-cols-6 gap-1.5">
              {NEEDS_META.map((n) => {
                const v = Math.round(needs[n.key]);
                return (
                  <div key={n.key} className="flex flex-col items-center gap-0.5" title={`${n.label}: ${v}%`}>
                    <span className="text-[10px] leading-none">{n.emoji}</span>
                    <div className="h-1 w-5 overflow-hidden rounded-full bg-black/15 dark:bg-white/15">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${v}%`,
                          backgroundColor: v < 30 ? '#FF3B30' : n.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </button>

        {/* Right: Primary Navigation Dock (Home, Map, Furnish, Work, Phone) */}
        <div className="apple-glass-heavy pointer-events-auto flex items-center gap-1.5 rounded-3xl p-1.5">
          {locationId !== 'home' ? (
            <button
              onClick={() => travelTo('home', 'waymo')}
              className="btn-press flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              <Home className="size-4" />
              <span>Go Home</span>
            </button>
          ) : (
            <button
              onClick={() => setView('live')}
              className={`btn-press flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-bold ${
                view === 'live'
                  ? 'bg-[#007AFF] text-white'
                  : 'text-[var(--ink)] hover:bg-[var(--mist)]'
              }`}
            >
              <Home className="size-4" />
              <span>Room</span>
            </button>
          )}

          <button
            onClick={() => setView(view === 'map' ? 'live' : 'map')}
            className={`btn-press flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-bold ${
              view === 'map'
                ? 'bg-[#007AFF] text-white'
                : 'text-[var(--ink)] hover:bg-[var(--mist)]'
            }`}
          >
            <Map className="size-4" />
            <span>Bay Map</span>
          </button>

          <button
            onClick={() => setView(view === 'buy' ? 'live' : 'buy')}
            className={`btn-press flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-bold ${
              view === 'buy'
                ? 'bg-[#007AFF] text-white'
                : 'text-[var(--ink)] hover:bg-[var(--mist)]'
            }`}
          >
            <ShoppingBag className="size-4" />
            <span>Furnish</span>
          </button>

          <button
            onClick={() => (workShift ? setActiveModal('phone', 'levels') : startWorkShift())}
            className="btn-press flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-bold text-[var(--ink)] hover:bg-[var(--mist)]"
          >
            <Briefcase className="size-4 text-[#007AFF]" />
            <span>{workShift ? 'Working' : 'Work Shift'}</span>
          </button>

          <button
            onClick={() => setActiveModal('phone', 'levels')}
            className="btn-press relative flex flex-col items-center gap-0.5 rounded-2xl bg-[#007AFF]/12 px-3.5 py-1.5 text-[10px] font-bold text-[#007AFF]"
          >
            <Smartphone className="size-4" />
            <span>BayOS</span>
          </button>
        </div>
      </div>
    </>
  );
};
