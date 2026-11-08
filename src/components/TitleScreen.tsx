import React from 'react';
import { CAREER_BY_ID, HOMES } from '../data/worldData';
import {
  calculateNetWorth,
  formatCurrency,
  formatTime,
  getDayOfWeekName,
  useGameStore,
} from '../store/useGameStore';
import { SimProfile } from '../types/game';
import { Portrait } from './Portrait';
import { Play, Sparkles, Zap, SlidersHorizontal, ArrowRight } from 'lucide-react';

interface QuickArchetype {
  id: string;
  badge: string;
  emoji: string;
  title: string;
  subtitle: string;
  chips: string[];
  accent: string;
  homeId: string;
  careerId: string;
  profile: SimProfile;
  rewardPatch: {
    cashDelta: number;
    skill: 'aiResearch' | 'coding' | 'investing';
    skillDelta: number;
    startupDelta?: number;
    toastText: string;
  };
}

const QUICK_ARCHETYPES: QuickArchetype[] = [
  {
    id: 'yc_founder',
    badge: 'FASTEST TO UNICORN',
    emoji: '🦄',
    title: 'YC AI Founder',
    subtitle: 'SOMA Loft · $12k Cash · High AI/Hustle',
    chips: ['🏙️ SOMA Loft', '💵 $12k Cash', '🧠 High AI/Hustle'],
    accent: '#FF9500',
    homeId: 'soma_loft',
    careerId: 'frontier_ai',
    profile: {
      name: 'Sora Takahashi',
      handle: '@sora_agi',
      appearance: {
        body: 'm',
        skin: '#E8B89A',
        hair: 'textured',
        hairColor: '#18181B',
        outfit: 'ychoodie',
        topColor: '#EA580C',
        accessory: 'airpodsmax',
      },
      traits: ['exFounder', 'tenXEngineer'],
      aspiration: 'seriesAUnicorn',
      origin: 'ycdropout',
    },
    rewardPatch: {
      cashDelta: -6500,
      skill: 'aiResearch',
      skillDelta: 1.8,
      startupDelta: 20,
      toastText: '1-Click Launch: YC AI Founder in SoMa Loft ($12k Cash)',
    },
  },
  {
    id: 'goggle_l4',
    badge: 'BIG TECH LADDER',
    emoji: '💻',
    title: 'Goggle L4 SWE',
    subtitle: 'Mission Studio · $18k + RSUs · High Coding',
    chips: ['☀️ Mission Studio', '💵 $18k + RSUs', '💻 High Coding'],
    accent: '#007AFF',
    homeId: 'mission_studio',
    careerId: 'bigtech_swe',
    profile: {
      name: 'Alex Chen',
      handle: '@alex_lgtm',
      appearance: {
        body: 'm',
        skin: '#F8DFC8',
        hair: 'parted',
        hairColor: '#18181B',
        outfit: 'patagonia',
        topColor: '#007AFF',
        accessory: 'glasses',
      },
      traits: ['tenXEngineer', 'leetcodeGrinder'],
      aspiration: 'staffPrincipal',
      origin: 'h1bhustler',
    },
    rewardPatch: {
      cashDelta: 11000,
      skill: 'coding',
      skillDelta: 1.2,
      toastText: '1-Click Launch: Goggle L4 SWE in Mission Studio ($18k + RSUs)',
    },
  },
  {
    id: 'nepo_angel',
    badge: 'SANDBOX LUXURY',
    emoji: '💎',
    title: 'Nepo Baby Angel',
    subtitle: 'Pac Heights / SOMA · $45k + Tesla · High Charisma/Investing',
    chips: ['🌉 Pac Heights', '💵 $45k + Tesla', '📈 High Investing'],
    accent: '#AF52DE',
    homeId: 'pac_heights_victorian',
    careerId: 'sandhill_vc',
    profile: {
      name: 'Chloe Vance',
      handle: '@chloe_cap',
      appearance: {
        body: 'f',
        skin: '#F8DFC8',
        hair: 'waves',
        hairColor: '#D97706',
        outfit: 'founderlinen',
        topColor: '#7C3AED',
        accessory: 'visionpro',
      },
      traits: ['exFounder', 'biohacker'],
      aspiration: 'paloAltoHome',
      origin: 'nepo',
    },
    rewardPatch: {
      cashDelta: -10500,
      skill: 'investing',
      skillDelta: 1.2,
      toastText: '1-Click Launch: Nepo Baby Angel in Pac Heights ($45k + Tesla)',
    },
  },
];

export const TitleScreen: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const time = useGameStore((s) => s.time);
  const cash = useGameStore((s) => s.cash);
  const job = useGameStore((s) => s.job);
  const homeId = useGameStore((s) => s.homeId);
  const setScreen = useGameStore((s) => s.setScreen);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const applyJob = useGameStore((s) => s.applyJob);
  const triggerMicroReward = useGameStore((s) => s.triggerMicroReward);

  const state = useGameStore.getState();
  const netWorth = calculateNetWorth(state);
  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const careerDef = job ? CAREER_BY_ID[job.careerId] : null;
  const levelDef = careerDef && job ? careerDef.levels[job.levelIndex] : null;

  const handleQuickStart = (arch: QuickArchetype) => {
    startNewGame(arch.profile, arch.homeId);
    triggerMicroReward({
      cashDelta: arch.rewardPatch.cashDelta,
      skill: arch.rewardPatch.skill,
      skillDelta: arch.rewardPatch.skillDelta,
      startupDelta: arch.rewardPatch.startupDelta,
      toastText: arch.rewardPatch.toastText,
      emoji: arch.emoji,
    });
    applyJob(arch.careerId);
  };

  return (
    <div className="relative flex h-dvh w-screen flex-col justify-between overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,#bae6fd_0%,#e0f2fe_45%,#f1f5f9_100%)] px-4 py-6 sm:px-6 sm:py-8 dark:bg-[linear-gradient(180deg,#0f172a_0%,#1e1b4b_55%,#0f172a_100%)]">
      {/* Subtle Golden Gate & Bay Area Isometric Backdrop Illustration */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-90">
        <svg viewBox="0 0 800 500" className="h-full w-full max-w-5xl object-cover">
          <defs>
            <linearGradient id="sunGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <circle cx="400" cy="200" r="165" fill="url(#sunGlow)" />
          {/* Golden Gate Towers */}
          <g stroke="#EA580C" strokeWidth="4" fill="none" opacity="0.45">
            <line x1="250" y1="320" x2="250" y2="135" />
            <line x1="550" y1="320" x2="550" y2="135" />
            <line x1="242" y1="170" x2="258" y2="170" />
            <line x1="242" y1="215" x2="258" y2="215" />
            <line x1="542" y1="170" x2="558" y2="170" />
            <line x1="542" y1="215" x2="558" y2="215" />
            <path d="M 90,285 Q 170,280 250,140" strokeWidth="3" />
            <path d="M 250,140 Q 400,290 550,140" strokeWidth="3" />
            <path d="M 550,140 Q 630,280 710,285" strokeWidth="3" />
            <line x1="70" y1="287" x2="730" y2="287" strokeWidth="5" />
          </g>
          {/* Animated Bridge Commuter Lights */}
          <circle r="3.5" fill="#38BDF8" opacity="0.8">
            <animateMotion dur="7s" repeatCount="indefinite" path="M 90,287 L 710,287" />
          </circle>
          <circle r="3" fill="#F59E0B" opacity="0.75">
            <animateMotion dur="9s" repeatCount="indefinite" path="M 710,287 L 90,287" />
          </circle>
        </svg>
      </div>

      {/* Top Crisp Apple Brand Header */}
      <div className="relative z-10 mx-auto max-w-xl text-center">
        <div className="mx-auto mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1 text-[11px] font-bold tracking-wider text-[#007AFF] uppercase shadow-sm backdrop-blur-md dark:bg-white/10 dark:text-sky-400">
          <Sparkles className="size-3.5" />
          <span>Silicon Valley Sandbox</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
          Bay Life
        </h1>
        <p className="mt-1.5 text-sm font-medium text-slate-600 sm:text-base dark:text-slate-300">
          Ship code. Raise capital. Own the Bay.
        </p>
      </div>

      {/* Center: 1-Click Instant Play Archetype Bento Grid */}
      <div className="relative z-10 mx-auto my-4 w-full max-w-4xl">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-slate-700 uppercase dark:text-slate-200">
            <Zap className="size-3.5 fill-amber-400 text-amber-500" />
            <span>⚡ Quick Start · 1-Click Instant Play</span>
          </div>
          <span className="text-[11px] font-semibold text-[var(--ink-soft)]">
            Zero forms — jump straight in
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK_ARCHETYPES.map((arch) => (
            <button
              key={arch.id}
              onClick={() => handleQuickStart(arch)}
              className="apple-glass-heavy btn-press group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/40 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#007AFF]/60 hover:shadow-xl dark:border-white/10"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white uppercase"
                    style={{ backgroundColor: arch.accent }}
                  >
                    {arch.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#007AFF] opacity-85 group-hover:translate-x-0.5 group-hover:opacity-100 transition-transform">
                    Play <ArrowRight className="size-3.5" />
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <Portrait appearance={arch.profile.appearance} size={48} ringColor={arch.accent} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{arch.emoji}</span>
                      <h3 className="truncate text-base font-extrabold">{arch.title}</h3>
                    </div>
                    <p className="truncate text-[11px] font-medium text-[var(--ink-soft)]">
                      {arch.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-black/5 pt-2.5 dark:border-white/10">
                {arch.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-lg bg-[var(--mist)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Launch Dock: Saved Game + Custom Engineer Studio */}
      <div className="relative z-10 mx-auto w-full max-w-xl">
        <div className="apple-glass-heavy rounded-[28px] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Saved Engineer Preview */}
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[var(--mist)] p-2.5">
              <Portrait appearance={sim.appearance} size={46} ringColor="#007AFF" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-extrabold">{sim.name}</span>
                  <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-bold text-[#007AFF]">
                    {levelDef ? levelDef.code : 'Founder'}
                  </span>
                </div>
                <div className="truncate text-[11px] text-[var(--ink-soft)]">
                  {getDayOfWeekName(time)} {formatTime(time)} · {homeDef.name}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span>{formatCurrency(cash)} Cash</span>
                  <span>·</span>
                  <span>{formatCurrency(netWorth)} Net Worth</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 sm:w-52">
              <button
                onClick={() => setScreen('play')}
                className="btn-press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#007AFF] px-4 text-xs font-bold text-white shadow-md shadow-[#007AFF]/25 hover:bg-[#0066CC]"
              >
                <Play className="size-3.5 fill-current" />
                Continue Saved Game
              </button>

              <button
                onClick={() => setScreen('create')}
                className="btn-press flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl bg-[var(--mist)] px-4 text-xs font-bold text-[var(--ink)] hover:bg-black/10 dark:hover:bg-white/15"
              >
                <SlidersHorizontal className="size-3.5 text-[#007AFF]" />
                Custom Engineer Studio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


