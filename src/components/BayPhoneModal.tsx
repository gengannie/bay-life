import React, { useState, useEffect } from 'react';
import {
  BLIND_POSTS,
  CAREERS,
  CAREER_BY_ID,
  DOORDASH_MENU,
  HOMES,
  NPCS,
} from '../data/worldData';
import {
  calculateNetWorth,
  formatCurrency,
  formatTime,
  useGameStore,
} from '../store/useGameStore';
import { Portrait } from './Portrait';
import {
  Briefcase,
  TrendingUp,
  Rocket,
  ShoppingBag,
  Home,
  MessageSquare,
  X,
  Sparkles,
  Heart,
  Zap,
  Wifi,
  BatteryCharging,
  CheckCircle2,
  Flame,
  ArrowUpRight,
} from 'lucide-react';

interface BlitzProblem {
  id: string;
  tag: string;
  difficulty: 'Hard' | 'Medium';
  prompt: string;
  options: Array<{ label: string; complexity: string; optimal?: boolean }>;
}

const LEETCODE_BLITZ_PROBLEMS: BlitzProblem[] = [
  {
    id: 'kv_cache',
    tag: 'AI Infra · CUDA',
    difficulty: 'Hard',
    prompt: 'Optimize LLM KV-Cache PagedAttention Latency',
    options: [
      { label: 'O(1) Block Ring Buffer', complexity: 'O(1) time · 99% GPU', optimal: true },
      { label: 'Full Tensor Realloc', complexity: 'O(n²) mem copy' },
      { label: 'Mutex Global Lock', complexity: 'Thread contention' },
    ],
  },
  {
    id: 'redis_shard',
    tag: 'Distributed Systems',
    difficulty: 'Hard',
    prompt: 'Shard 10M QPS Hot-Key Redis Cluster',
    options: [
      { label: 'Single Leader Node', complexity: 'SPOF bottleneck' },
      { label: 'Consistent Hashing + L1 Cache', complexity: 'O(log M) · Zero-hop', optimal: true },
      { label: 'Full Table Broadcast', complexity: 'O(N) network storm' },
    ],
  },
  {
    id: 'dag_cycle',
    tag: 'Graphs · Compiler',
    difficulty: 'Medium',
    prompt: 'Detect Deadlock Cycle in Async Task Graph',
    options: [
      { label: '3-Color Tarjan DFS', complexity: 'O(V + E) linear', optimal: true },
      { label: 'Brute Force Permutations', complexity: 'O(V!) timeout' },
      { label: 'Random Walk Sampling', complexity: 'Non-deterministic' },
    ],
  },
  {
    id: 'orderbook',
    tag: 'Low-Latency Rust',
    difficulty: 'Hard',
    prompt: 'Design Sub-Microsecond Limit Orderbook',
    options: [
      { label: 'Unindexed Linked List', complexity: 'O(n) scan' },
      { label: 'JSON over HTTP/1.1', complexity: 'High serialization' },
      { label: 'Flat Array + Fenwick Tree', complexity: 'O(1) top-of-book', optimal: true },
    ],
  },
  {
    id: 'spanner_tx',
    tag: 'Consensus · L6+',
    difficulty: 'Hard',
    prompt: 'Cross-Continent Zero-Skew Read Transaction',
    options: [
      { label: 'TrueTime Bounded Wait', complexity: 'Linearizable O(1)', optimal: true },
      { label: '2-Phase Lock Everything', complexity: '400ms WAN stall' },
      { label: 'Unversioned Dirty Read', complexity: 'Data corruption' },
    ],
  },
];

const SPARKLINE_SERIES: Record<'1D' | '1W' | '1M' | 'ALL', { points: string; gain: string }> = {
  '1D': {
    points: '0,52 28,48 56,50 84,38 112,42 140,28 168,31 196,19 224,22 252,12 280,8',
    gain: '+4.82%',
  },
  '1W': {
    points: '0,58 28,54 56,44 84,47 112,35 140,30 168,24 196,27 224,16 252,14 280,6',
    gain: '+14.6%',
  },
  '1M': {
    points: '0,60 28,56 56,52 84,40 112,45 140,33 168,22 196,18 224,15 252,9 280,5',
    gain: '+38.4%',
  },
  ALL: {
    points: '0,62 28,59 56,55 84,49 112,42 140,36 168,29 196,21 224,14 252,8 280,4',
    gain: '+240.9%',
  },
};

export const BayPhoneModal: React.FC = () => {
  const rawPhoneApp = useGameStore((s) => s.phoneApp);
  const phoneApp = rawPhoneApp === 'messages' ? 'blind' : rawPhoneApp;
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const cash = useGameStore((s) => s.cash);
  const vestedRsu = useGameStore((s) => s.vestedRsu);
  const unvestedRsu = useGameStore((s) => s.unvestedRsu);
  const portfolioValue = useGameStore((s) => s.portfolioValue);
  const loanOwed = useGameStore((s) => s.loanOwed);
  const pantryMeals = useGameStore((s) => s.pantryMeals);
  const job = useGameStore((s) => s.job);
  const skills = useGameStore((s) => s.skills);
  const startup = useGameStore((s) => s.startup);
  const homeId = useGameStore((s) => s.homeId);
  const ownedHomes = useGameStore((s) => s.ownedHomes);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const relationships = useGameStore((s) => s.relationships);
  const time = useGameStore((s) => s.time);
  const stats = useGameStore((s) => s.stats);

  const applyJob = useGameStore((s) => s.applyJob);
  const startWorkShift = useGameStore((s) => s.startWorkShift);
  const toggleAutoWork = useGameStore((s) => s.toggleAutoWork);
  const vestRsuToCash = useGameStore((s) => s.vestRsuToCash);
  const investInPortfolio = useGameStore((s) => s.investInPortfolio);
  const withdrawPortfolio = useGameStore((s) => s.withdrawPortfolio);
  const payLoan = useGameStore((s) => s.payLoan);
  const buyCar = useGameStore((s) => s.buyCar);
  const orderDoorDash = useGameStore((s) => s.orderDoorDash);
  const pitchStartupVC = useGameStore((s) => s.pitchStartupVC);
  const renameStartup = useGameStore((s) => s.renameStartup);
  const moveHome = useGameStore((s) => s.moveHome);
  const interactWithNpc = useGameStore((s) => s.interactWithNpc);
  const triggerMicroReward = useGameStore((s) => s.triggerMicroReward);

  // Interactive mini-game & UI states
  const [startupNameInput, setStartupNameInput] = useState(startup.name);
  const [startupTagInput, setStartupTagInput] = useState(startup.tagline);
  const [editingDeck, setEditingDeck] = useState(false);

  const [blitzIdx, setBlitzIdx] = useState(() => stats.leetCodeSolved % LEETCODE_BLITZ_PROBLEMS.length);
  const [blitzStreak, setBlitzStreak] = useState(1);
  const [blitzFeedback, setBlitzFeedback] = useState<'win' | 'miss' | null>(null);

  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [tradeCooldown, setTradeCooldown] = useState(0);
  const [phCooldown, setPhCooldown] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [blindTab, setBlindTab] = useState<'dm' | 'feed'>('dm');

  useEffect(() => {
    if (tradeCooldown <= 0 && phCooldown <= 0) return;
    const t = window.setInterval(() => {
      setTradeCooldown((c) => Math.max(0, c - 1));
      setPhCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [tradeCooldown, phCooldown]);

  const state = useGameStore.getState();
  const netWorth = calculateNetWorth(state);
  const currentCareer = job ? CAREER_BY_ID[job.careerId] : null;
  const currentLevel = currentCareer && job ? currentCareer.levels[job.levelIndex] : null;
  const nextLevel = currentCareer && job ? currentCareer.levels[job.levelIndex + 1] : null;

  const APPS: Array<{
    id: typeof phoneApp;
    label: string;
    icon: React.ReactNode;
    gradient: string;
    badge?: number | string;
  }> = [
    {
      id: 'levels',
      label: 'Levels',
      icon: <Briefcase className="size-4" />,
      gradient: 'from-[#007AFF] to-[#5856D6]',
      badge: job && job.performance >= 90 ? '!' : undefined,
    },
    {
      id: 'wealth',
      label: 'Schwab',
      icon: <TrendingUp className="size-4" />,
      gradient: 'from-[#34C759] to-[#0D9488]',
      badge: vestedRsu >= 500 ? '1' : undefined,
    },
    {
      id: 'startup',
      label: 'YC Studio',
      icon: <Rocket className="size-4" />,
      gradient: 'from-[#FF9500] to-[#FF3B30]',
      badge: startup.productProgress >= 50 ? '1' : undefined,
    },
    {
      id: 'doordash',
      label: 'DoorDash',
      icon: <ShoppingBag className="size-4" />,
      gradient: 'from-[#FF3B30] to-[#E11D48]',
      badge: pantryMeals <= 1 ? '!' : undefined,
    },
    {
      id: 'zillow',
      label: 'Zillow',
      icon: <Home className="size-4" />,
      gradient: 'from-[#5856D6] to-[#7C3AED]',
    },
    {
      id: 'blind',
      label: 'Blind',
      icon: <MessageSquare className="size-4" />,
      gradient: 'from-[#AF52DE] to-[#EC4899]',
      badge: '3',
    },
  ];

  const currentBlitz = LEETCODE_BLITZ_PROBLEMS[blitzIdx % LEETCODE_BLITZ_PROBLEMS.length];

  const handleBlitzAnswer = (optimal?: boolean) => {
    if (blitzFeedback) return;
    if (optimal) {
      setBlitzFeedback('win');
      setBlitzStreak((s) => s + 1);
      triggerMicroReward({
        cashDelta: 350,
        skill: 'coding',
        skillDelta: 0.35,
        performanceDelta: 6,
        toastText: 'Solved LeetCode Hard! +$350 Bounty & +0.35 Coding',
        emoji: '🧠',
      });
    } else {
      setBlitzFeedback('miss');
      setBlitzStreak(1);
      triggerMicroReward({
        skill: 'coding',
        skillDelta: 0.1,
        toastText: 'Suboptimal complexity — reviewed editorial (+0.10 Coding)',
        emoji: '📘',
      });
    }
    window.setTimeout(() => {
      setBlitzFeedback(null);
      setBlitzIdx((i) => (i + 1) % LEETCODE_BLITZ_PROBLEMS.length);
    }, 650);
  };

  const handleAiMomentumTrade = () => {
    if (tradeCooldown > 0) return;
    setTradeCooldown(5);
    const quantBonus = Math.floor(skills.investing * 90);
    const win = Math.random() < 0.78;
    if (win) {
      const gain = 420 + quantBonus;
      triggerMicroReward({
        cashDelta: gain,
        skill: 'investing',
        skillDelta: 0.25,
        needKey: 'fun',
        needDelta: 8,
        toastText: `NVDA 0DTE Call Hit! +${formatCurrency(gain)} Alpha & +0.25 Quant`,
        emoji: '📈',
      });
    } else {
      triggerMicroReward({
        cashDelta: -140,
        skill: 'investing',
        skillDelta: 0.15,
        toastText: 'Theta decay clipped -$140 · Hedged exposure (+0.15 Quant)',
        emoji: '📊',
      });
    }
  };

  const handleProductHuntLaunch = () => {
    if (phCooldown > 0) return;
    setPhCooldown(6);
    triggerMicroReward({
      cashDelta: 480,
      startupDelta: 14,
      skill: 'hustle',
      skillDelta: 0.3,
      karmaDelta: 3,
      toastText: 'Trending #1 on ProductHunt! +14% MVP, +250 Devs & +$480 Stripe MRR',
      emoji: '🚀',
    });
  };

  const handleLikeBlindPost = (postId: string) => {
    if (likedPosts[postId]) return;
    setLikedPosts((prev) => ({ ...prev, [postId]: true }));
    triggerMicroReward({
      needKey: 'fun',
      needDelta: 8,
      karmaDelta: 1,
      toastText: 'Upvoted spicy TC thread on Blind (+8 Vibe)',
      emoji: '🔥',
    });
  };

  // Asset allocation percentages for Schwab ring/bar
  const totalLiquidAssets = Math.max(1, cash + vestedRsu + unvestedRsu + portfolioValue);
  const cashPct = Math.round((cash / totalLiquidAssets) * 100);
  const rsuPct = Math.round(((vestedRsu + unvestedRsu) / totalLiquidAssets) * 100);
  const indexPct = Math.max(0, 100 - cashPct - rsuPct);

  // Startup Readiness Ring math
  const readinessRadius = 32;
  const readinessCircumference = 2 * Math.PI * readinessRadius;
  const readinessOffset =
    readinessCircumference - (Math.min(100, startup.productProgress) / 100) * readinessCircumference;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-md"
      onClick={() => setActiveModal(null)}
    >
      {/* iPhone 16 Pro Titanium Frame (BayOS 18) */}
      <div
        className="apple-glass-heavy relative flex h-[87dvh] w-full max-w-[420px] flex-col overflow-hidden rounded-[46px] border-[3px] border-white/60 shadow-[0_28px_90px_rgba(0,0,0,0.55)] dark:border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Status Bar & Interactive Dynamic Island */}
        <div className="relative flex items-center justify-between px-6 pt-3 pb-2 text-xs font-semibold select-none">
          <span className="w-16 text-[11px] font-bold tracking-tight">{formatTime(time)}</span>

          {/* Dynamic Island Pill */}
          <div className="flex h-7 items-center gap-2 rounded-full bg-black px-3.5 text-[10px] font-bold text-white shadow-inner ring-1 ring-white/15">
            <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="truncate max-w-[115px] text-white/90">
              {currentCareer ? `${currentCareer.emoji} ${currentLevel?.code}` : '🦄 Founder'}
            </span>
            <span className="text-emerald-400">{formatCurrency(cash)}</span>
          </div>

          <div className="flex w-16 items-center justify-end gap-1.5">
            <Wifi className="size-3 text-[var(--ink-soft)]" />
            <BatteryCharging className="size-3.5 text-emerald-500" />
            <button
              onClick={() => setActiveModal(null)}
              className="btn-press ml-0.5 grid size-6 place-items-center rounded-full bg-[var(--mist)] hover:bg-black/10 dark:hover:bg-white/15"
              title="Close Phone"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* App Header Bar */}
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-2 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-tight">
              {phoneApp === 'levels' && '📊 Levels.fyi'}
              {phoneApp === 'wealth' && '💎 Schwab Private Wealth'}
              {phoneApp === 'startup' && '🦄 YC Startup Studio'}
              {phoneApp === 'doordash' && '🛵 DoorDash Express'}
              {phoneApp === 'zillow' && '🏡 Zillow Bay Area'}
              {phoneApp === 'blind' && '💬 Blind & iMessage'}
            </span>
          </div>
          <span className="rounded-full bg-[var(--mist)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">
            NW {formatCurrency(netWorth)}
          </span>
        </div>

        {/* Scrollable App Viewport */}
        <div className="scrollbar-none flex-1 overflow-y-auto px-4 pt-3 pb-24 space-y-3.5">
          {/* =========================================================
              1. LEVELS.FYI + INTERACTIVE LEETCODE DAILY BLITZ
          ========================================================= */}
          {phoneApp === 'levels' && (
            <div className="space-y-3.5">
              {/* Current Role Hero Card */}
              {currentCareer && currentLevel && job && (
                <div className="rounded-3xl bg-gradient-to-br from-[#007AFF]/15 via-indigo-500/10 to-transparent p-4 border border-[#007AFF]/25">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{currentCareer.emoji}</span>
                      <div>
                        <div className="text-sm font-black leading-tight">{currentCareer.company}</div>
                        <div className="text-[11px] font-semibold text-[var(--ink-soft)]">
                          {currentLevel.title} · {currentCareer.district}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#007AFF] px-3 py-0.5 text-xs font-black text-white shadow-sm">
                      {currentLevel.code}
                    </span>
                  </div>

                  {/* Big Visual TC Bento Pills */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-white/70 p-2.5 text-center dark:bg-black/35">
                      <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">Total Comp</div>
                      <div className="mt-0.5 text-xs font-black text-[#007AFF]">
                        {formatCurrency(currentLevel.baseSalary + currentLevel.rsuAnnual)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-2.5 text-center dark:bg-black/35">
                      <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">Shift Cash</div>
                      <div className="mt-0.5 text-xs font-black text-emerald-600">
                        +{formatCurrency(currentLevel.shiftPay)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-2.5 text-center dark:bg-black/35">
                      <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">Shift RSU</div>
                      <div className="mt-0.5 text-xs font-black text-purple-600">
                        +{formatCurrency(currentLevel.rsuPerShift)}
                      </div>
                    </div>
                  </div>

                  {/* Promo Readiness Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>
                        Promo Velocity{' '}
                        {nextLevel ? `→ ${nextLevel.code}` : '· Max Level'}
                      </span>
                      <span className="text-[#007AFF]">{Math.round(job.performance)}% / 92%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#007AFF] to-indigo-500 transition-all duration-300"
                        style={{ width: `${job.performance}%` }}
                      />
                    </div>
                    {nextLevel && (
                      <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-[var(--ink-soft)]">
                        <span>
                          Req: {nextLevel.requiredSkill.skill} Lv.{nextLevel.requiredSkill.level}
                        </span>
                        <span>
                          Yours: Lv.{Math.floor(skills[nextLevel.requiredSkill.skill])}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 1-Tap Shift Controls */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={startWorkShift}
                      className="btn-press flex-1 rounded-2xl bg-[#007AFF] py-2.5 text-xs font-extrabold text-white shadow-sm"
                    >
                      ⚡ Badge In for Shift
                    </button>
                    <button
                      onClick={toggleAutoWork}
                      className={`btn-press rounded-2xl px-3.5 py-2.5 text-xs font-extrabold ${
                        job.autoWork
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/70 text-[var(--ink)] dark:bg-white/10'
                      }`}
                    >
                      Auto: {job.autoWork ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              )}

              {/* INTERACTIVE MINI-GAME: ⚡ LEETCODE DAILY BLITZ */}
              <div className="rounded-3xl bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-transparent p-3.5 border border-purple-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="grid size-6 place-items-center rounded-lg bg-purple-600 text-white">
                      <Zap className="size-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-black">⚡ LeetCode Daily Blitz</div>
                      <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                        {currentBlitz.tag} · +$350 & +0.35 Coding
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                    <Flame className="size-3" /> {blitzStreak}x
                  </div>
                </div>

                <div className="rounded-2xl bg-black/85 px-3 py-2.5 text-white shadow-inner">
                  <div className="flex items-center justify-between text-[10px] text-purple-300 font-mono">
                    <span>#{stats.leetCodeSolved + 101} · {currentBlitz.difficulty}</span>
                    <span>Target: Optimal Time</span>
                  </div>
                  <div className="mt-0.5 text-xs font-bold tracking-tight">
                    {currentBlitz.prompt}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {currentBlitz.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleBlitzAnswer(opt.optimal)}
                      className={`btn-press flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-all ${
                        blitzFeedback === 'win' && opt.optimal
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-white/75 hover:bg-white dark:bg-white/10 dark:hover:bg-white/15'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className="rounded-md bg-black/5 px-2 py-0.5 font-mono text-[10px] text-[var(--ink-soft)] dark:bg-white/10">
                        {opt.complexity}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 1-Tap Switch Career Track Cards */}
              <div className="space-y-2">
                <div className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                  Switch Track · Instant Offer
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CAREERS.map((c) => {
                    const isCurrent = job?.careerId === c.id;
                    const entry = c.levels[0];
                    const top = c.levels[c.levels.length - 1];
                    return (
                      <div
                        key={c.id}
                        className={`flex flex-col justify-between rounded-2xl p-3 border transition-all ${
                          isCurrent
                            ? 'bg-[#007AFF]/10 border-[#007AFF]/40'
                            : 'bg-[var(--mist)] border-transparent'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xl">{c.emoji}</span>
                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-extrabold dark:bg-white/10">
                              {entry.code}–{top.code}
                            </span>
                          </div>
                          <div className="mt-1.5 text-xs font-extrabold leading-tight truncate">
                            {c.company}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(entry.baseSalary + entry.rsuAnnual)} →{' '}
                            {formatCurrency(top.baseSalary + top.rsuAnnual)}
                          </div>
                        </div>

                        <button
                          disabled={isCurrent}
                          onClick={() => applyJob(c.id)}
                          className={`btn-press mt-2.5 w-full rounded-xl py-1.5 text-[11px] font-extrabold ${
                            isCurrent
                              ? 'bg-emerald-500/20 text-emerald-600'
                              : 'bg-[#007AFF] text-white'
                          }`}
                        >
                          {isCurrent ? '✓ Current' : 'Switch Track'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              2. SCHWAB WEALTH + LIVE SPARKLINE + AI MOMENTUM TRADE
          ========================================================= */}
          {phoneApp === 'wealth' && (
            <div className="space-y-3.5">
              {/* Live Stock Sparkline & Net Worth Card */}
              <div className="rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent p-4 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      NVDA / AI Semis · Total Net Worth
                    </div>
                    <div className="text-2xl font-black tracking-tight">
                      {formatCurrency(netWorth)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                      <ArrowUpRight className="size-3.5" />
                      {SPARKLINE_SERIES[chartRange].gain}
                    </span>
                    <div className="mt-1 flex gap-1">
                      {(['1D', '1W', '1M', 'ALL'] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setChartRange(tf)}
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${
                            chartRange === tf
                              ? 'bg-emerald-600 text-white'
                              : 'bg-black/5 text-[var(--ink-soft)] dark:bg-white/10'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Animated SVG Stock Sparkline */}
                <div className="mt-2.5 h-16 w-full overflow-hidden rounded-2xl bg-black/5 p-2 dark:bg-black/30">
                  <svg viewBox="0 0 288 64" className="h-full w-full overflow-visible">
                    <defs>
                      <linearGradient id="schwabGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`0,64 ${SPARKLINE_SERIES[chartRange].points} 280,64`}
                      fill="url(#schwabGrad)"
                    />
                    <polyline
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={SPARKLINE_SERIES[chartRange].points}
                    />
                    <circle cx="280" cy="6" r="4" className="fill-emerald-400 animate-ping" />
                    <circle cx="280" cy="6" r="3.5" className="fill-emerald-500" />
                  </svg>
                </div>

                {/* Visual Allocation Bar & Bento Stats */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div style={{ width: `${cashPct}%` }} className="bg-emerald-500" />
                    <div style={{ width: `${rsuPct}%` }} className="bg-purple-500" />
                    <div style={{ width: `${indexPct}%` }} className="bg-[#007AFF]" />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                    <div className="rounded-xl bg-white/65 p-2 dark:bg-black/30">
                      <div className="text-[9px] font-bold text-[var(--ink-soft)]">Cash</div>
                      <div className="text-[11px] font-black">{formatCurrency(cash)}</div>
                    </div>
                    <div className="rounded-xl bg-white/65 p-2 dark:bg-black/30">
                      <div className="text-[9px] font-bold text-purple-600">Vested</div>
                      <div className="text-[11px] font-black text-purple-600">
                        {formatCurrency(vestedRsu)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/65 p-2 dark:bg-black/30">
                      <div className="text-[9px] font-bold text-[var(--ink-soft)]">Unvested</div>
                      <div className="text-[11px] font-black">{formatCurrency(unvestedRsu)}</div>
                    </div>
                    <div className="rounded-xl bg-white/65 p-2 dark:bg-black/30">
                      <div className="text-[9px] font-bold text-[#007AFF]">AI Index</div>
                      <div className="text-[11px] font-black text-[#007AFF]">
                        {formatCurrency(portfolioValue)}
                      </div>
                    </div>
                  </div>
                </div>

                {vestedRsu > 0 && (
                  <button
                    onClick={vestRsuToCash}
                    className="btn-press mt-3 w-full rounded-2xl bg-purple-600 py-2.5 text-xs font-extrabold text-white shadow-sm"
                  >
                    💎 Liquidate {formatCurrency(vestedRsu)} Vested RSUs
                  </button>
                )}
              </div>

              {/* 1-Tap Index Chips & Interactive AI Momentum Trade */}
              <div className="rounded-3xl bg-[var(--mist)] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold">⚡ 1-Tap QQQ / NVDA Allocation</span>
                  <button
                    disabled={portfolioValue <= 0}
                    onClick={() => withdrawPortfolio(Math.min(5000, portfolioValue))}
                    className="btn-press rounded-lg bg-black/10 px-2.5 py-1 text-[10px] font-bold disabled:opacity-35 dark:bg-white/10"
                  >
                    Withdraw $5k
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={cash < 1000}
                    onClick={() => investInPortfolio(1000)}
                    className="btn-press rounded-xl bg-[#007AFF] py-2 text-xs font-extrabold text-white disabled:opacity-35"
                  >
                    +$1k
                  </button>
                  <button
                    disabled={cash < 5000}
                    onClick={() => investInPortfolio(5000)}
                    className="btn-press rounded-xl bg-[#007AFF] py-2 text-xs font-extrabold text-white disabled:opacity-35"
                  >
                    +$5k
                  </button>
                  <button
                    disabled={cash < 1000}
                    onClick={() => investInPortfolio(Math.floor(cash * 0.5))}
                    className="btn-press rounded-xl bg-indigo-600 py-2 text-xs font-extrabold text-white disabled:opacity-35"
                  >
                    50% Max
                  </button>
                </div>

                {/* Interactive Pulse Trade Button */}
                <button
                  disabled={tradeCooldown > 0}
                  onClick={handleAiMomentumTrade}
                  className="btn-press flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm disabled:opacity-50"
                >
                  <span>📈 Trade AI Earnings Momentum</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                    {tradeCooldown > 0 ? `${tradeCooldown}s` : 'Lv.' + Math.floor(skills.investing) + ' Alpha'}
                  </span>
                </button>
              </div>

              {/* SAFE Note Repayment */}
              {loanOwed > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-amber-500/15 p-3 border border-amber-500/30">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-amber-600">SAFE / Student Note</div>
                    <div className="text-sm font-black">{formatCurrency(loanOwed)}</div>
                  </div>
                  <button
                    disabled={cash < 1000}
                    onClick={() => payLoan(Math.min(5000, loanOwed))}
                    className="btn-press rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-white disabled:opacity-40"
                  >
                    Pay {formatCurrency(Math.min(5000, loanOwed))}
                  </button>
                </div>
              )}

              {/* EV Garage Card */}
              <div className="flex items-center justify-between rounded-2xl bg-[var(--mist)] p-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏎️</span>
                  <div>
                    <div className="text-xs font-extrabold">Porsche Taycan / Plaid EV</div>
                    <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                      Zero-fare 12m I-280 HOV commute
                    </div>
                  </div>
                </div>
                {ownedCars.includes('tesla') ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-600">
                    <CheckCircle2 className="size-3.5" /> Owned
                  </span>
                ) : (
                  <button
                    disabled={cash < 18500}
                    onClick={() => buyCar('tesla', 18500)}
                    className="btn-press rounded-xl bg-[#007AFF] px-3.5 py-2 text-xs font-extrabold text-white disabled:opacity-40"
                  >
                    $18,500
                  </button>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              3. YC STARTUP STUDIO + PRODUCT READINESS RING + PRODUCTHUNT
          ========================================================= */}
          {phoneApp === 'startup' && (
            <div className="space-y-3.5">
              <div className="rounded-3xl bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent p-4 border border-orange-500/30">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-black text-white">
                    {startup.stage}
                  </span>
                  <button
                    onClick={() => setEditingDeck((e) => !e)}
                    className="text-[10px] font-bold text-orange-600 underline"
                  >
                    {editingDeck ? 'Done' : 'Rebrand'}
                  </button>
                </div>

                {/* Product Readiness Circular Gauge + Identity */}
                <div className="mt-3 flex items-center gap-4">
                  <div className="relative grid size-20 shrink-0 place-items-center">
                    <svg className="size-20 -rotate-90" viewBox="0 0 76 76">
                      <circle
                        cx="38"
                        cy="38"
                        r={readinessRadius}
                        stroke="currentColor"
                        strokeWidth="7"
                        fill="transparent"
                        className="text-black/10 dark:text-white/10"
                      />
                      <circle
                        cx="38"
                        cy="38"
                        r={readinessRadius}
                        stroke="#FF9500"
                        strokeWidth="7"
                        strokeDasharray={readinessCircumference}
                        strokeDashoffset={readinessOffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-black">{Math.round(startup.productProgress)}%</span>
                      <span className="text-[8px] font-bold uppercase text-[var(--ink-soft)]">MVP</span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black">🦄 {startup.name}</h3>
                    <p className="line-clamp-2 text-[11px] font-medium text-[var(--ink-soft)]">
                      {startup.tagline}
                    </p>
                  </div>
                </div>

                {/* MRR / Valuation / Users Bento Grid */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-white/70 p-2.5 dark:bg-black/35">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">Valuation</div>
                    <div className="mt-0.5 text-xs font-black text-orange-600">
                      {formatCurrency(startup.valuation)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-2.5 dark:bg-black/35">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">Stripe MRR</div>
                    <div className="mt-0.5 text-xs font-black text-emerald-600">
                      {formatCurrency(startup.mrr)}/m
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-2.5 dark:bg-black/35">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">Active Devs</div>
                    <div className="mt-0.5 text-xs font-black">
                      {startup.users.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Interactive Launch & VC Pitch Buttons */}
                <div className="mt-3.5 space-y-2">
                  <button
                    disabled={phCooldown > 0}
                    onClick={handleProductHuntLaunch}
                    className="btn-press flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#FF6154] to-orange-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm disabled:opacity-50"
                  >
                    <span>🚀 Drop Launch on ProductHunt</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                      {phCooldown > 0 ? `${phCooldown}s` : '+14% MVP · +$480'}
                    </span>
                  </button>

                  <button
                    onClick={pitchStartupVC}
                    className={`btn-press flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-extrabold text-white shadow-sm ${
                      startup.productProgress >= 50
                        ? 'bg-emerald-600 animate-pulse'
                        : 'bg-orange-500/80'
                    }`}
                  >
                    <Sparkles className="size-4" />
                    {startup.productProgress >= 50
                      ? 'Term Sheet Ready · Pitch Sand Hill VCs!'
                      : `Pitch Sand Hill VCs (Need 50% MVP)`}
                  </button>
                </div>
              </div>

              {editingDeck && (
                <div className="rounded-2xl bg-[var(--mist)] p-3.5 space-y-2">
                  <input
                    type="text"
                    value={startupNameInput}
                    onChange={(e) => setStartupNameInput(e.target.value)}
                    className="w-full rounded-xl bg-white/80 px-3 py-2 text-xs font-bold dark:bg-black/40"
                    placeholder="Startup Name"
                  />
                  <input
                    type="text"
                    value={startupTagInput}
                    onChange={(e) => setStartupTagInput(e.target.value)}
                    className="w-full rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold dark:bg-black/40"
                    placeholder="One-line wedge"
                  />
                  <button
                    onClick={() => {
                      renameStartup(startupNameInput, startupTagInput);
                      setEditingDeck(false);
                    }}
                    className="btn-press w-full rounded-xl bg-[#007AFF] py-2 text-xs font-extrabold text-white"
                  >
                    Save Pitch Deck
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              4. DOORDASH VISUAL 2-COLUMN BENTO GRID
          ========================================================= */}
          {phoneApp === 'doordash' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#FF3B30]/15 to-orange-500/10 px-4 py-2.5 border border-[#FF3B30]/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🍱</span>
                  <span className="text-xs font-extrabold">Home Smart Fridge</span>
                </div>
                <span className="rounded-full bg-[#FF3B30] px-2.5 py-0.5 text-[11px] font-black text-white">
                  {pantryMeals} Meals Stocked
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {DOORDASH_MENU.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-3xl bg-[var(--mist)] p-3.5 border border-black/5 dark:border-white/5"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-3xl">{item.emoji}</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                          {item.pantryAdd > 0 ? `🍱+${item.pantryAdd}` : `🥗+${item.hunger}`}
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-extrabold leading-snug line-clamp-2">
                        {item.name}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.energy > 0 && (
                          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                            ⚡+{item.energy}
                          </span>
                        )}
                        {item.fun > 0 && (
                          <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">
                            ✨+{item.fun}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => orderDoorDash(item.id)}
                      className="btn-press mt-3 w-full rounded-2xl bg-[#FF3B30] py-2 text-xs font-black text-white shadow-sm"
                    >
                      Order {formatCurrency(item.price)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================
              5. ZILLOW BAY AREA REAL ESTATE BENTO
          ========================================================= */}
          {phoneApp === 'zillow' && (
            <div className="space-y-2.5">
              {HOMES.map((h) => {
                const isCurrent = homeId === h.id;
                const isOwned = ownedHomes.includes(h.id);
                return (
                  <div
                    key={h.id}
                    className={`rounded-3xl p-3.5 border transition-all ${
                      isCurrent
                        ? 'bg-[#5856D6]/12 border-[#5856D6]/40'
                        : 'bg-[var(--mist)] border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl">{h.emoji}</span>
                        <div>
                          <div className="text-xs font-black">{h.name}</div>
                          <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                            {h.area} · {h.gridSize}×{h.gridSize} Lot
                          </div>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-600">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <button
                        disabled={isCurrent}
                        onClick={() => moveHome(h.id, false)}
                        className="btn-press rounded-xl bg-[#007AFF] py-2 text-[11px] font-extrabold text-white disabled:opacity-35"
                      >
                        Lease {formatCurrency(h.weeklyRent)}/wk
                      </button>
                      <button
                        disabled={isOwned}
                        onClick={() => moveHome(h.id, true)}
                        className="btn-press rounded-xl bg-emerald-600 py-2 text-[11px] font-extrabold text-white disabled:opacity-35"
                      >
                        {isOwned ? '✓ Deed Owned' : `Buy ${formatCurrency(h.buyPrice)}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =========================================================
              6. BLIND & iMESSAGE 1-TAP REACTIONS
          ========================================================= */}
          {phoneApp === 'blind' && (
            <div className="space-y-3">
              {/* Segmented Toggle: iMessage vs Blind Feed */}
              <div className="grid grid-cols-2 rounded-2xl bg-[var(--mist)] p-1">
                <button
                  onClick={() => setBlindTab('dm')}
                  className={`rounded-xl py-1.5 text-xs font-extrabold transition-all ${
                    blindTab === 'dm' ? 'bg-[#007AFF] text-white shadow-sm' : 'text-[var(--ink-soft)]'
                  }`}
                >
                  💬 iMessage Network
                </button>
                <button
                  onClick={() => setBlindTab('feed')}
                  className={`rounded-xl py-1.5 text-xs font-extrabold transition-all ${
                    blindTab === 'feed' ? 'bg-[#AF52DE] text-white shadow-sm' : 'text-[var(--ink-soft)]'
                  }`}
                >
                  🔥 Verified Blind
                </button>
              </div>

              {blindTab === 'dm' ? (
                <div className="space-y-2.5">
                  {NPCS.map((npc) => {
                    const rel = relationships[npc.id];
                    const score = rel?.score || 12;
                    const lastMsg = rel?.messages[rel.messages.length - 1]?.text || npc.greeting;
                    return (
                      <div key={npc.id} className="rounded-3xl bg-[var(--mist)] p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Portrait appearance={npc.appearance} size={38} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black truncate">{npc.name}</span>
                                <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[9px] font-extrabold text-[#007AFF]">
                                  {rel?.status || 'Stranger'}
                                </span>
                              </div>
                              <div className="text-[10px] font-semibold text-[var(--ink-soft)] truncate">
                                {npc.role} · {npc.company}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-emerald-600">{score}%</span>
                        </div>

                        {/* iMessage Bubble */}
                        <div className="rounded-2xl rounded-tl-sm bg-white/80 px-3 py-2 text-[11px] font-medium text-[var(--ink)] dark:bg-black/35">
                          “{lastMsg}”
                        </div>

                        {/* 1-Tap iMessage Action Pills */}
                        <div className="grid grid-cols-4 gap-1.5">
                          <button
                            onClick={() => interactWithNpc(npc.id, 'coffeeChat')}
                            className="btn-press rounded-xl bg-[#007AFF]/15 py-1.5 text-[10px] font-extrabold text-[#007AFF]"
                          >
                            ☕ Coffee
                          </button>
                          <button
                            onClick={() => interactWithNpc(npc.id, 'whiteboard')}
                            className="btn-press rounded-xl bg-indigo-500/15 py-1.5 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400"
                          >
                            🧠 Arch
                          </button>
                          <button
                            onClick={() => interactWithNpc(npc.id, 'pitch')}
                            className="btn-press rounded-xl bg-orange-500/15 py-1.5 text-[10px] font-extrabold text-orange-600 dark:text-orange-400"
                          >
                            🦄 Pitch
                          </button>
                          <button
                            onClick={() => interactWithNpc(npc.id, 'flirt')}
                            className="btn-press rounded-xl bg-rose-500/15 py-1.5 text-[10px] font-extrabold text-rose-600 dark:text-rose-400"
                          >
                            ❤️ Vibe
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {BLIND_POSTS.map((post) => {
                    const liked = !!likedPosts[post.id];
                    return (
                      <div key={post.id} className="rounded-3xl bg-[var(--mist)] p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-extrabold">
                          <span className="rounded-md bg-[#007AFF]/15 px-2 py-0.5 text-[#007AFF]">
                            {post.company}
                          </span>
                          <span className="text-[var(--ink-soft)]">{post.author}</span>
                        </div>
                        <div className="text-xs font-extrabold leading-snug">{post.title}</div>
                        <p className="text-[11px] text-[var(--ink-soft)] line-clamp-2">{post.body}</p>
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => handleLikeBlindPost(post.id)}
                            className={`btn-press inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                              liked
                                ? 'bg-rose-500 text-white'
                                : 'bg-black/5 text-[var(--ink-soft)] dark:bg-white/10'
                            }`}
                          >
                            <Heart className="size-3" /> {post.likes + (liked ? 1 : 0)}
                          </button>
                          <span className="text-[10px] font-semibold text-[var(--ink-soft)]">
                            💬 {post.comments}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Floating iOS 18 Frosted Glass App Dock */}
        <div className="absolute inset-x-3 bottom-2.5 z-20 flex flex-col items-center gap-1.5">
          <div className="flex w-full items-center justify-around rounded-[28px] border border-white/40 bg-white/75 px-2 py-2 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-black/65">
            {APPS.map((app) => {
              const active = phoneApp === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => setActiveModal('phone', app.id)}
                  className="btn-press group relative flex flex-col items-center gap-0.5"
                >
                  <div
                    className={`relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br ${app.gradient} text-white shadow-md transition-transform ${
                      active ? 'scale-110 ring-2 ring-white' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    {app.icon}
                    {app.badge && (
                      <span className="absolute -top-1 -right-1 grid min-w-[16px] place-items-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-black">
                        {app.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-extrabold tracking-tight ${
                      active ? 'text-[#007AFF]' : 'text-[var(--ink-soft)]'
                    }`}
                  >
                    {app.label}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Home Indicator Bar */}
          <div className="h-1 w-28 rounded-full bg-black/25 dark:bg-white/30" />
        </div>
      </div>
    </div>
  );
};
