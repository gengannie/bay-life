import React from 'react';
import { CAREER_BY_ID, HOMES } from '../data/worldData';
import {
  calculateNetWorth,
  formatCurrency,
  formatTime,
  getDayOfWeekName,
  useGameStore,
} from '../store/useGameStore';
import { Portrait } from './Portrait';
import { Play, Sparkles, Cpu, Train, Zap, TrendingUp } from 'lucide-react';

export const TitleScreen: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const time = useGameStore((s) => s.time);
  const cash = useGameStore((s) => s.cash);
  const job = useGameStore((s) => s.job);
  const homeId = useGameStore((s) => s.homeId);
  const setScreen = useGameStore((s) => s.setScreen);

  const state = useGameStore.getState();
  const netWorth = calculateNetWorth(state);
  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const careerDef = job ? CAREER_BY_ID[job.careerId] : null;
  const levelDef = careerDef && job ? careerDef.levels[job.levelIndex] : null;

  return (
    <div className="relative flex h-dvh w-screen flex-col justify-between overflow-hidden bg-[linear-gradient(180deg,#bae6fd_0%,#e0f2fe_45%,#f1f5f9_100%)] px-5 py-8 dark:bg-[linear-gradient(180deg,#0f172a_0%,#1e1b4b_55%,#0f172a_100%)]">
      {/* Subtle Golden Gate & Bay Area Isometric Backdrop Illustration */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-90">
        <svg viewBox="0 0 800 500" className="h-full w-full max-w-5xl object-cover">
          <defs>
            <linearGradient id="sunGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <circle cx="400" cy="210" r="165" fill="url(#sunGlow)" />
          {/* Golden Gate Towers */}
          <g stroke="#EA580C" strokeWidth="4" fill="none" opacity="0.45">
            <line x1="250" y1="320" x2="250" y2="140" />
            <line x1="550" y1="320" x2="550" y2="140" />
            <line x1="242" y1="175" x2="258" y2="175" />
            <line x1="242" y1="220" x2="258" y2="220" />
            <line x1="542" y1="175" x2="558" y2="175" />
            <line x1="542" y1="220" x2="558" y2="220" />
            <path d="M 90,290 Q 170,285 250,145" strokeWidth="3" />
            <path d="M 250,145 Q 400,295 550,145" strokeWidth="3" />
            <path d="M 550,145 Q 630,285 710,290" strokeWidth="3" />
            <line x1="70" y1="292" x2="730" y2="292" strokeWidth="5" />
          </g>
        </svg>
      </div>

      {/* Top Brand Header */}
      <div className="relative z-10 mx-auto mt-4 max-w-lg text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-3.5 py-1 text-xs font-semibold tracking-tight text-[#007AFF] shadow-sm backdrop-blur-md dark:bg-white/10 dark:text-sky-400">
          <Sparkles className="size-3.5" />
          <span>SILICON VALLEY LIFE SIMULATOR</span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
          Bay Life
        </h1>
        <p className="mt-2.5 text-base font-medium text-slate-600 dark:text-slate-300">
          Live your Silicon Valley software engineer story.
        </p>

        {/* Feature Chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="apple-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <Cpu className="size-3.5 text-[#007AFF]" /> L3 → L8 & AI Startups
          </span>
          <span className="apple-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <Train className="size-3.5 text-emerald-500" /> Caltrain, G-Bus & Waymo
          </span>
          <span className="apple-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <Zap className="size-3.5 text-amber-500" /> Survive PG&E Outages
          </span>
          <span className="apple-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <TrendingUp className="size-3.5 text-purple-500" /> Pitch Sand Hill VCs
          </span>
        </div>
      </div>

      {/* Bottom Apple Glass Launch Card (Just like Lagos Life TitleScreen card) */}
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="apple-glass-heavy rounded-[28px] p-5">
          {/* Saved Engineer Preview */}
          <div className="mb-4 flex items-center gap-3.5 rounded-2xl bg-[var(--mist)] p-3">
            <Portrait appearance={sim.appearance} size={52} ringColor="#007AFF" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-bold">{sim.name}</span>
                <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[11px] font-bold text-[#007AFF]">
                  {levelDef ? levelDef.code : 'Founder'}
                </span>
              </div>
              <div className="truncate text-xs text-[var(--ink-soft)]">
                {getDayOfWeekName(time)} {formatTime(time)} · {homeDef.name}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Cash: {formatCurrency(cash)}</span>
                <span>·</span>
                <span>Net Worth: {formatCurrency(netWorth)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5">
            <button
              onClick={() => setScreen('play')}
              className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#007AFF] px-5 text-[15px] font-semibold text-white shadow-md shadow-[#007AFF]/25 hover:bg-[#0066CC]"
            >
              <Play className="size-4 fill-current" />
              Continue as {sim.name.split(' ')[0]}
            </button>

            <button
              onClick={() => setScreen('create')}
              className="btn-press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--mist)] px-5 text-sm font-semibold text-[var(--ink)] hover:bg-black/10 dark:hover:bg-white/15"
            >
              <Sparkles className="size-4 text-[#007AFF]" />
              Create New Engineer / Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

