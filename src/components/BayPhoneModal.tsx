import React, { useState, useEffect } from 'react';
import {
  BLIND_POSTS,
  CAREERS,
  CAREER_BY_ID,
  DOORDASH_MENU,
  HOMES,
  LOCATION_BY_ID,
  MARKET_ASSETS,
  MARKET_ASSET_BY_TICKER,
  NPCS,
  SKILL_TREE_NODE_BY_ID,
  SKILLS_META,
  WORK_EXPLORATION_TASKS,
  WORK_PROJECTS,
  WORK_PROJECT_BY_ID,
  calculateCommuteDetails,
  getStartupDailyBurnRate,
  getStartupNextStageRequirements,
} from '../data/worldData';
import {
  getRelationshipTierInfo,
  NPC_INTERACTIONS,
  getAvailableTopicsForNpc,
  getNpcMilestones,
  NPC_GIFTS,
} from '../data/relationshipData';
import {
  calculateCashFlowMetrics,
  calculateNetWorth,
  ensureFinanceState,
  formatCurrency,
  formatTime,
  getDayNumber,
  useGameStore,
} from '../store/useGameStore';
import { CommuteModeId, MarketTicker, StartupDifficulty, WorkMode } from '../types/game';
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
  Globe,
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

let persistedPhCooldownUntil = 0;
let persistedTradeCooldownUntil = 0;
const persistedLikedPosts = new Set<string>();

export const BayPhoneModal: React.FC = () => {
  const rawPhoneApp = useGameStore((s) => s.phoneApp);
  const rawPhoneAppStr = String(rawPhoneApp || 'levels');
  const phoneApp =
    rawPhoneAppStr === 'messages' ||
    rawPhoneAppStr.startsWith('messages:') ||
    rawPhoneAppStr.startsWith('blind:')
      ? 'blind'
      : rawPhoneAppStr === 'zillow'
        ? 'bluefin'
        : rawPhoneApp;
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const cash = useGameStore((s) => s.cash);
  const needs = useGameStore((s) => s.needs);
  const vestedRsu = useGameStore((s) => s.vestedRsu);
  const unvestedRsu = useGameStore((s) => s.unvestedRsu);
  const portfolioValue = useGameStore((s) => s.portfolioValue);
  const loanOwed = useGameStore((s) => s.loanOwed);
  const pantryMeals = useGameStore((s) => s.pantryMeals);
  const job = useGameStore((s) => s.job);
  const workShift = useGameStore((s) => s.workShift);
  const travel = useGameStore((s) => s.travel);
  const skills = useGameStore((s) => s.skills);
  const unlockedTechNodes = useGameStore((s) => s.unlockedTechNodes) ?? ['node_git_monorepo'];
  const startup = useGameStore((s) => s.startup);
  const homeId = useGameStore((s) => s.homeId);
  const ownedHomes = useGameStore((s) => s.ownedHomes);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const relationships = useGameStore((s) => s.relationships);
  const time = useGameStore((s) => s.time);
  const stats = useGameStore((s) => s.stats);

  const applyJob = useGameStore((s) => s.applyJob);
  const startWorkShift = useGameStore(
    (s) =>
      (s as typeof s & { startWorkShift: (preferredMode?: WorkMode) => void })
        .startWorkShift
  );
  const commuteToOfficeAndWork = useGameStore(
    (s) =>
      (
        s as typeof s & {
          commuteToOfficeAndWork?: (mode?: CommuteModeId) => void;
        }
      ).commuteToOfficeAndWork
  );
  const doWorkExploration = useGameStore(
    (s) =>
      (s as typeof s & { doWorkExploration?: (taskId: string) => void })
        .doWorkExploration
  );
  const submitPromoPacket = useGameStore(
    (s) => (s as typeof s & { submitPromoPacket?: () => void }).submitPromoPacket
  );
  const lastToast = useGameStore((s) => s.lastToast);
  const dismissToast = useGameStore((s) => s.dismissToast);
  const locationId = useGameStore((s) => s.locationId);
  const toggleAutoWork = useGameStore((s) => s.toggleAutoWork);
  const vestRsuToCash = useGameStore((s) => s.vestRsuToCash);
  const investInPortfolio = useGameStore((s) => s.investInPortfolio);
  const withdrawPortfolio = useGameStore((s) => s.withdrawPortfolio);
  const buyStock = useGameStore((s) => s.buyStock);
  const sellStock = useGameStore((s) => s.sellStock);
  const applyPortfolioPreset = useGameStore((s) => s.applyPortfolioPreset);
  const toggleDrip = useGameStore((s) => s.toggleDrip);
  const toggleAutoSellRsu = useGameStore((s) => s.toggleAutoSellRsu);
  const executeOptionsStrategy = useGameStore((s) => s.executeOptionsStrategy);
  const financeRaw = useGameStore((s) => s.finance);
  const payLoan = useGameStore((s) => s.payLoan);
  const orderDoorDash = useGameStore((s) => s.orderDoorDash);
  const pitchStartupVC = useGameStore((s) => s.pitchStartupVC);
  const renameStartup = useGameStore((s) => s.renameStartup);
  const setStartupDifficulty = useGameStore((s) => s.setStartupDifficulty);
  const launchStartupProductHunt = useGameStore((s) => s.launchStartupProductHunt);
  const moveHome = useGameStore((s) => s.moveHome);
  const openBluefinMap = useGameStore((s) => s.openBluefinMap);
  const interactWithNpc = useGameStore((s) => s.interactWithNpc);
  const answerNpcTopic = useGameStore((s) => s.answerNpcTopic);
  const giftNpc = useGameStore((s) => s.giftNpc);
  const claimRelationshipMilestone = useGameStore((s) => s.claimRelationshipMilestone);
  const inviteNpcHangout = useGameStore((s) => s.inviteNpcHangout);
  const inventory = useGameStore((s) => s.inventory);
  const unlockedPerks = useGameStore((s) => s.unlockedPerks || []);
  const triggerMicroReward = useGameStore((s) => s.triggerMicroReward);
  const resignJob = useGameStore((s) => s.resignJob);

  // Interactive mini-game & UI states
  const [startupNameInput, setStartupNameInput] = useState(startup.name);
  const [startupTagInput, setStartupTagInput] = useState(startup.tagline);
  const [editingDeck, setEditingDeck] = useState(false);

  useEffect(() => {
    setStartupNameInput(startup.name);
    setStartupTagInput(startup.tagline);
  }, [startup.name, startup.tagline]);

  const [blitzIdx, setBlitzIdx] = useState(() => stats.leetCodeSolved % LEETCODE_BLITZ_PROBLEMS.length);
  const [blitzStreak, setBlitzStreak] = useState(1);
  const [blitzFeedback, setBlitzFeedback] = useState<'win' | 'miss' | null>(null);

  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [wealthSubTab, setWealthSubTab] = useState<'market' | 'cashflow' | 'equity'>('market');
  const [selectedTicker, setSelectedTicker] = useState<MarketTicker>('NVDAX');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'inflow' | 'outflow' | 'trade'>('all');
  const [tradeCooldown, setTradeCooldown] = useState(() =>
    Math.max(0, Math.ceil((persistedTradeCooldownUntil - Date.now()) / 1000))
  );
  const [phCooldown, setPhCooldown] = useState(() =>
    Math.max(0, Math.ceil((persistedPhCooldownUntil - Date.now()) / 1000))
  );
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    persistedLikedPosts.forEach((id) => {
      initial[id] = true;
    });
    return initial;
  });

  const startupDifficulty: StartupDifficulty = startup.difficultyMode || 'realistic';
  const stageReq = getStartupNextStageRequirements(startup.stage, startupDifficulty);
  const dailyBurn = getStartupDailyBurnRate(startup.stage, startupDifficulty);
  const displayDevs = typeof startup.users === 'number' && startup.users > 200_000 ? 42_580 : startup.users;

  const canPitchVC =
    Boolean(stageReq && stageReq.nextStage) &&
    startup.productProgress >= (stageReq?.minMvp || 0) &&
    displayDevs >= (stageReq?.minUsers || 0) &&
    startup.mrr >= (stageReq?.minMrr || 0) &&
    Math.floor(skills.hustle || 0) >= (stageReq?.minHustle || 0) &&
    Math.floor(skills.systemDesign || 0) >= (stageReq?.minSysDesign || 0);
  const [blindTab, setBlindTab] = useState<'dm' | 'feed'>('dm');
  const [selectedDmNpcId, setSelectedDmNpcId] = useState<string | null>(null);
  const [showDmGiftDrawer, setShowDmGiftDrawer] = useState<boolean>(false);
  const [bluefinFilter, setBluefinFilter] = useState<'all' | 'starter' | 'luxury' | 'owned'>('all');

  useEffect(() => {
    const appStr = String(rawPhoneApp || '');
    if (appStr.startsWith('messages:') || appStr.startsWith('blind:')) {
      const rawTarget = appStr.split(':')[1] || '';
      const matchedNpc = NPCS.find(
        (n) => n.id === rawTarget || n.id === `npc_${rawTarget}`
      );
      setBlindTab('dm');
      if (matchedNpc) {
        setSelectedDmNpcId(matchedNpc.id);
      }
      setActiveModal('phone', 'blind');
    }
  }, [rawPhoneApp, setActiveModal]);

  useEffect(() => {
    if (tradeCooldown <= 0 && phCooldown <= 0) return;
    const t = window.setInterval(() => {
      const now = Date.now();
      setTradeCooldown(Math.max(0, Math.ceil((persistedTradeCooldownUntil - now) / 1000)));
      setPhCooldown(Math.max(0, Math.ceil((persistedPhCooldownUntil - now) / 1000)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [tradeCooldown, phCooldown]);

  const state = useGameStore.getState();
  const finance = financeRaw ?? ensureFinanceState(state);
  const cfMetrics = calculateCashFlowMetrics(state);
  const netWorth = calculateNetWorth(state);
  const currentCareer = job ? CAREER_BY_ID[job.careerId] : null;
  const currentLevel = currentCareer && job ? currentCareer.levels[job.levelIndex] : null;
  const nextLevel = currentCareer && job ? currentCareer.levels[job.levelIndex + 1] : null;

  const blindNotificationCount = NPCS.reduce((acc, npc) => {
    const rel = relationships[npc.id];
    const score = rel?.score ?? 12;
    const claimedIds = rel?.claimedMilestones || [];
    const unclaimedMilestonesCount = getNpcMilestones(npc.id).filter(
      (m) =>
        (score >= m.threshold || (rel?.unlockedMilestones || []).includes(m.id)) &&
        !claimedIds.includes(m.id)
    ).length;
    const availableTopicsCount = getAvailableTopicsForNpc(
      npc.id,
      score,
      rel?.completedTopics || []
    ).length;
    return acc + unclaimedMilestonesCount + availableTopicsCount;
  }, 0);

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
        label: 'Schwaab',
        icon: <TrendingUp className="size-4" />,
        gradient: 'from-[#34C759] to-[#0D9488]',
        badge: vestedRsu >= 500 ? '1' : undefined,
      },
      {
        id: 'startup',
        label: 'YC Studio',
        icon: <Rocket className="size-4" />,
        gradient: 'from-[#FF9500] to-[#FF3B30]',
        badge: canPitchVC ? '1' : undefined,
      },
      {
        id: 'doordash',
        label: 'DoorDash',
        icon: <ShoppingBag className="size-4" />,
        gradient: 'from-[#FF3B30] to-[#E11D48]',
        badge: pantryMeals <= 1 ? '!' : undefined,
      },
      {
        id: 'bluefin',
        label: 'Bluefin',
        icon: <Home className="size-4" />,
        gradient: 'from-[#0284C7] to-[#2563EB]',
      },
      {
        id: 'blind',
        label: 'Blind',
        icon: <MessageSquare className="size-4" />,
        gradient: 'from-[#AF52DE] to-[#EC4899]',
        badge: blindNotificationCount > 0 ? String(blindNotificationCount) : undefined,
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
    const now = Date.now();
    if (tradeCooldown > 0 || persistedTradeCooldownUntil > now) return;
    persistedTradeCooldownUntil = now + 5000;
    setTradeCooldown(5);
    if (cash >= 600) {
      executeOptionsStrategy('earnings_straddle');
      return;
    }
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
    const now = Date.now();
    if (phCooldown > 0 || persistedPhCooldownUntil > now) return;
    persistedPhCooldownUntil = now + 45000;
    setPhCooldown(45);
    launchStartupProductHunt();
  };

  const handleLikeBlindPost = (postId: string) => {
    if (likedPosts[postId] || persistedLikedPosts.has(postId)) return;
    persistedLikedPosts.add(postId);
    setLikedPosts((prev) => ({ ...prev, [postId]: true }));
    triggerMicroReward({
      needKey: 'fun',
      needDelta: 8,
      toastText: 'Upvoted spicy TC thread on Blind (+8 Vibe)',
      emoji: '🔥',
    });
  };

  // Asset allocation percentages for Schwaab ring/bar
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
            <span className="text-white/90">
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
              {phoneApp === 'wealth' && '💎 Schwaab Private Wealth'}
              {phoneApp === 'startup' && '🦄 YC Startup Studio'}
              {phoneApp === 'doordash' && '🛵 DoorDash Express'}
              {phoneApp === 'bluefin' && '🐟 Bluefin Real Estate'}
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
              {/* Current Role Hero Card + Hybrid Work Policy & Multi-Gate Promo */}
              {currentCareer && currentLevel && job && (() => {
                const defaultProj =
                  WORK_PROJECTS.find((p) => p.careerId === currentCareer.id) ||
                  WORK_PROJECTS[0];
                const activeProj =
                  (job.activeProjectId && WORK_PROJECT_BY_ID[job.activeProjectId]) ||
                  defaultProj;
                const projPct = Math.min(100, Math.round(job.projectProgress ?? 0));
                const shiftsAtLvl = job.shiftsAtLevel ?? 0;
                const reqShifts = nextLevel?.minShiftsForPromo ?? 3;
                const deliverablesDone = job.deliverablesCompleted ?? 0;
                const reqDeliverables = nextLevel?.requiredDeliverables ?? 1;
                const reqPerf = unlockedPerks.includes('perk_exec_halo') ? 82 : 92;
                const isAtCampus = locationId === currentCareer.locationId;

                const phonePerfPass = Math.round(job.performance) >= reqPerf;
                const phoneTenurePass = shiftsAtLvl >= reqShifts;
                const phonePrimaryPass =
                  nextLevel
                    ? Math.floor((skills[nextLevel.requiredSkill.skill] ?? 0) + 0.001) >=
                      nextLevel.requiredSkill.level
                    : true;
                const phoneSecPass =
                  !nextLevel?.secondarySkill ||
                  Math.floor((skills[nextLevel.secondarySkill.skill] ?? 0) + 0.001) >=
                    nextLevel.secondarySkill.level;
                const phoneNodePass =
                  !nextLevel?.requiredTechNode ||
                  unlockedTechNodes.includes(nextLevel.requiredTechNode);
                const phoneDelivPass = deliverablesDone >= reqDeliverables;
                const phoneRtoPass = job.rtoCompliant !== false;
                const allPhoneGatesReady =
                  Boolean(nextLevel) &&
                  phonePerfPass &&
                  phoneTenurePass &&
                  phonePrimaryPass &&
                  phoneSecPass &&
                  phoneNodePass &&
                  phoneDelivPass &&
                  phoneRtoPass;

                return (
                  <>
                    <div className="rounded-3xl bg-gradient-to-br from-[#007AFF]/15 via-indigo-500/10 to-transparent p-4 border border-[#007AFF]/25 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{currentCareer.emoji}</span>
                          <div>
                            <div className="text-sm font-black leading-tight">
                              {currentCareer.company}
                            </div>
                            <div className="text-[11px] font-semibold text-[var(--ink-soft)]">
                              {currentLevel.title} · {currentCareer.district}
                            </div>
                          </div>
                        </div>
                        <span className="rounded-full bg-[#007AFF] px-3 py-0.5 text-xs font-black text-white shadow-sm">
                          {currentLevel.code}
                        </span>
                      </div>

                      {/* Hybrid Work Policy Summary Pill + Full Hub Button */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-2xl bg-white/75 px-3 py-2 text-[10px] font-extrabold dark:bg-black/35">
                        <span>
                          🏢 {job.officeDaysThisWeek || 0}/3 Office · 🏠 {job.wfhDaysThisWeek || 0}/2 WFH · 🌍{' '}
                          {job.wfaDaysRemaining ?? 4}/4 WFA
                        </span>
                        <button
                          onClick={() => setActiveModal('career')}
                          className="btn-press rounded-lg bg-[#007AFF] px-2 py-0.5 text-[10px] font-black text-white"
                        >
                          Open Career Hub ↗
                        </button>
                      </div>

                      {/* Big Visual TC Bento Pills */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-white/70 p-2 text-center dark:bg-black/35">
                          <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                            Total Comp
                          </div>
                          <div className="mt-0.5 text-xs font-black text-[#007AFF]">
                            {formatCurrency(currentLevel.baseSalary + currentLevel.rsuAnnual)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/70 p-2 text-center dark:bg-black/35">
                          <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                            Shift Cash
                          </div>
                          <div className="mt-0.5 text-xs font-black text-emerald-600">
                            +{formatCurrency(currentLevel.shiftPay)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/70 p-2 text-center dark:bg-black/35">
                          <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                            Shift RSU
                          </div>
                          <div className="mt-0.5 text-xs font-black text-purple-600">
                            +{formatCurrency(currentLevel.rsuPerShift)}
                          </div>
                        </div>
                      </div>

                      {/* Multi-Gate Promo Packet Checklist */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>
                            Promo Packet{' '}
                            {nextLevel ? `→ ${nextLevel.code} (${nextLevel.title})` : '· Max Level'}
                          </span>
                          <span className="text-[#007AFF]">
                            {Math.round(job.performance)}% / {reqPerf}%
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#007AFF] to-indigo-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, (job.performance / reqPerf) * 100)}%` }}
                          />
                        </div>

                        {nextLevel ? (
                          <div className="mt-2 space-y-1.5 rounded-2xl bg-white/65 p-2.5 text-[10px] font-bold dark:bg-black/30">
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="flex items-center justify-between rounded-lg bg-black/5 px-2 py-1 dark:bg-white/5">
                                <span>📊 Calibration</span>
                                <span
                                  className={
                                    phonePerfPass
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }
                                >
                                  {Math.round(job.performance)}%/{reqPerf}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-lg bg-black/5 px-2 py-1 dark:bg-white/5">
                                <span>⏳ Tenure</span>
                                <span
                                  className={
                                    phoneTenurePass
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }
                                >
                                  {shiftsAtLvl}/{reqShifts} shifts
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-lg bg-black/5 px-2 py-1 dark:bg-white/5">
                                <span>
                                  {
                                    SKILLS_META.find(
                                      (sk) => sk.key === nextLevel.requiredSkill.skill
                                    )?.emoji
                                  }{' '}
                                  Primary
                                </span>
                                <span
                                  className={
                                    phonePrimaryPass
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }
                                >
                                  Lv.{Math.floor((skills[nextLevel.requiredSkill.skill] ?? 0) + 0.001)}/
                                  {nextLevel.requiredSkill.level}
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-lg bg-black/5 px-2 py-1 dark:bg-white/5">
                                <span>📦 Shipped</span>
                                <span
                                  className={
                                    phoneDelivPass
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-purple-600 dark:text-purple-400'
                                  }
                                >
                                  {deliverablesDone}/{reqDeliverables}
                                </span>
                              </div>
                            </div>

                            {nextLevel.secondarySkill && (
                              <div className="flex items-center justify-between rounded-lg bg-black/5 px-2 py-1 dark:bg-white/5">
                                <span>
                                  {
                                    SKILLS_META.find(
                                      (sk) => sk.key === nextLevel.secondarySkill!.skill
                                    )?.emoji
                                  }{' '}
                                  Secondary (
                                  {
                                    SKILLS_META.find(
                                      (sk) => sk.key === nextLevel.secondarySkill!.skill
                                    )?.label
                                  }
                                  )
                                </span>
                                <span
                                  className={
                                    phoneSecPass
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }
                                >
                                  Lv.{Math.floor((skills[nextLevel.secondarySkill.skill] ?? 0) + 0.001)}/
                                  {nextLevel.secondarySkill.level}
                                </span>
                              </div>
                            )}

                            {nextLevel.requiredTechNode && (() => {
                              const reqNode = SKILL_TREE_NODE_BY_ID[nextLevel.requiredTechNode];
                              const hasNode = unlockedTechNodes.includes(nextLevel.requiredTechNode);
                              return (
                                <div className="flex items-center justify-between gap-2 rounded-lg bg-black/5 px-2 py-1 dark:bg-white/5">
                                  <span className="truncate">
                                    🌳 Tech Spec: {reqNode ? `${reqNode.emoji} ${reqNode.title}` : nextLevel.requiredTechNode}
                                  </span>
                                  {hasNode ? (
                                    <span className="shrink-0 text-emerald-600 dark:text-emerald-400">
                                      ✓ Unlocked
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setActiveModal('career')}
                                      className="btn-press shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400"
                                    >
                                      🔒 Tech Tree ↗
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Gate 7: Hybrid RTO Standing */}
                            <div className="flex items-center justify-between rounded-lg bg-black/5 px-2 py-1 dark:bg-white/5">
                              <span>🏢 Hybrid RTO Standing</span>
                              <span
                                className={
                                  phoneRtoPass
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }
                              >
                                {phoneRtoPass ? 'Compliant ✓' : '3/3 Office Days Needed'}
                              </span>
                            </div>

                            {/* Blocked Advisory Callout */}
                            {!allPhoneGatesReady && (
                              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                                ⚠️ Missing Gates: {!phonePerfPass && `Perf (${Math.round(job.performance)}%/${reqPerf}%) · `}{!phoneTenurePass && `Tenure (${shiftsAtLvl}/${reqShifts}) · `}{!phonePrimaryPass && 'Primary Skill · '}{!phoneSecPass && 'Secondary Skill · '}{!phoneNodePass && 'Tech Spec · '}{!phoneDelivPass && 'Deliverables · '}{!phoneRtoPass && 'Hybrid RTO'}
                              </div>
                            )}

                            <button
                              onClick={() => submitPromoPacket?.()}
                              className={`btn-press mt-1 w-full rounded-xl py-2 text-[11px] font-black text-white shadow-xs transition-all ${
                                allPhoneGatesReady
                                  ? 'bg-gradient-to-r from-emerald-500 via-[#007AFF] to-purple-600'
                                  : 'bg-[#007AFF] hover:bg-blue-600'
                              }`}
                            >
                              📋 Submit Promo Packet ({nextLevel.code})
                            </button>

                            {/* Immediate Feedback Notice */}
                            {lastToast && (
                              <div
                                className={`flex items-center justify-between gap-1.5 rounded-xl border p-2 text-[10px] font-black ${
                                  lastToast.tone === 'bad'
                                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-800 dark:text-rose-200'
                                    : lastToast.tone === 'good'
                                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                                      : 'border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-200'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>{lastToast.emoji}</span>
                                  <span className="leading-tight">{lastToast.text}</span>
                                </div>
                                <button
                                  onClick={dismissToast}
                                  className="btn-press shrink-0 rounded bg-black/10 px-1.5 py-0.5 text-[9px]"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1.5 rounded-xl bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            👑 Top IC/Partner Level Achieved
                          </div>
                        )}
                      </div>

                      {/* Quick Work Mode Dispatch Buttons (Office / WFH / WFA) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-[var(--ink-soft)]">
                          <span>QUICK WORK SHIFT DISPATCH</span>
                          <button
                            onClick={toggleAutoWork}
                            className={`rounded-md px-2 py-0.5 text-[9px] font-black ${job.autoWork
                                ? 'bg-emerald-500 text-white'
                                : 'bg-black/5 text-[var(--ink)] dark:bg-white/10'
                              }`}
                          >
                            Auto: {job.autoWork ? 'ON' : 'OFF'}
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            disabled={!!workShift || !!travel}
                            onClick={() =>
                              isAtCampus
                                ? startWorkShift('office')
                                : commuteToOfficeAndWork
                                  ? commuteToOfficeAndWork(
                                    ownedCars.length > 0 ? 'tesla' : job.preferredCommute
                                  )
                                  : startWorkShift('office')
                            }
                            className="btn-press rounded-xl bg-emerald-600 py-2 text-[11px] font-extrabold text-white shadow-xs disabled:opacity-50"
                          >
                            🏢 Office ({job.officeDaysThisWeek || 0}/3)
                          </button>
                          <button
                            disabled={!!workShift || !!travel}
                            onClick={() => startWorkShift('wfh')}
                            className="btn-press rounded-xl bg-[#007AFF] py-2 text-[11px] font-extrabold text-white shadow-xs disabled:opacity-50"
                          >
                            🏠 WFH ({job.wfhDaysThisWeek || 0}/2)
                          </button>
                          <button
                            disabled={!!workShift || !!travel || (job.wfaDaysRemaining ?? 4) <= 0}
                            onClick={() => startWorkShift('wfa')}
                            className="btn-press rounded-xl bg-purple-600 py-2 text-[11px] font-extrabold text-white shadow-xs disabled:opacity-50"
                          >
                            🌍 WFA ({job.wfaDaysRemaining ?? 4}/4)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Active Work Exploration Project Card */}
                    <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{activeProj.emoji}</span>
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-wider text-indigo-500">
                              ACTIVE CHARTER · {activeProj.codeName}
                            </div>
                            <div className="text-xs font-black leading-tight">
                              {activeProj.title}
                            </div>
                          </div>
                        </div>
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black text-indigo-600 dark:text-indigo-300">
                          {projPct}%
                        </span>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${projPct}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          onClick={() => doWorkExploration?.(WORK_EXPLORATION_TASKS[0].id)}
                          className="btn-press flex-1 rounded-xl bg-indigo-600 py-1.5 text-[10px] font-extrabold text-white shadow-xs"
                        >
                          📐 Sprint Charter (+{WORK_EXPLORATION_TASKS[0].projectProgressGain}%)
                        </button>
                        <button
                          onClick={() => setActiveModal('career')}
                          className="btn-press rounded-xl bg-white/75 px-2.5 py-1.5 text-[10px] font-extrabold text-[var(--ink)] dark:bg-white/10"
                        >
                          All 6 Tasks ↗
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}

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
                      className={`btn-press flex flex-wrap items-center justify-between gap-1.5 rounded-xl px-3 py-2 text-left text-xs font-bold transition-all ${blitzFeedback === 'win' && opt.optimal
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-white/75 hover:bg-white dark:bg-white/10 dark:hover:bg-white/15'
                        }`}
                    >
                      <span>{opt.label}</span>
                      <span className="shrink-0 rounded-md bg-black/5 px-2 py-0.5 font-mono text-[10px] text-[var(--ink-soft)] dark:bg-white/10">
                        {opt.complexity}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selective Onsite Interview Loops & Career Track Switching */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5 px-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                    🌉 Career Track Prerequisites & Onsite Loops
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveModal('career', 'interview')}
                      className="btn-press rounded-lg bg-[#007AFF]/15 px-2 py-1 text-[9.5px] font-extrabold text-[#007AFF]"
                    >
                      🌉 Full Switcher ↗
                    </button>
                    <button
                      onClick={() => setActiveModal('career', 'tree')}
                      className="btn-press rounded-lg bg-amber-500/15 px-2 py-1 text-[9.5px] font-extrabold text-amber-700 dark:text-amber-300"
                    >
                      🌳 Tech Tree ↗
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[#007AFF]/20 bg-[#007AFF]/5 px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-[var(--ink-soft)]">
                  To switch tracks, unlock the company&apos;s <strong className="text-[var(--ink)]">Skill Tech Tree nodes</strong> (with ⚡ Karma), train <strong className="text-[var(--ink)]">Core Skill levels</strong>, and ship required <strong className="text-[var(--ink)]">R&amp;D Deliverables</strong>, then spend Energy to pass the onsite loop.
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {CAREERS.map((c) => {
                    const isCurrent = job?.careerId === c.id;
                    const entry = c.levels[0];
                    const top = c.levels[c.levels.length - 1];
                    const entryReq = c.entryRequirements;

                    const reqNodes = entryReq?.requiredTechNodes ?? [];
                    const reqSkills = entryReq?.requiredSkills ?? [];
                    const minDeliv = entryReq?.minDeliverables ?? 0;
                    const curDeliv = job?.deliverablesCompleted ?? 0;

                    const metNodesCount = reqNodes.filter((nid) =>
                      unlockedTechNodes.includes(nid)
                    ).length;
                    const metSkillsCount = reqSkills.filter(
                      (req) => Math.floor(skills[req.skill] ?? 0) >= req.level
                    ).length;
                    const delivMet = curDeliv >= minDeliv;

                    const totalPrereqs =
                      reqNodes.length + reqSkills.length + (minDeliv > 0 ? 1 : 0);
                    const metPrereqs =
                      metNodesCount + metSkillsCount + (minDeliv > 0 ? (delivMet ? 1 : 0) : 0);
                    const canPassGate = metPrereqs === totalPrereqs;

                    return (
                      <div
                        key={c.id}
                        className={`flex flex-col justify-between rounded-2xl p-3 border transition-all space-y-2 ${isCurrent
                            ? 'bg-[#007AFF]/10 border-[#007AFF]/40'
                            : canPassGate
                              ? 'bg-[var(--mist)] border-emerald-500/35'
                              : 'bg-[var(--mist)] border-transparent'
                          }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl">{c.emoji}</span>
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold leading-snug">
                                  {c.company}
                                </div>
                                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(entry.baseSalary + entry.rsuAnnual)} →{' '}
                                  {formatCurrency(top.baseSalary + top.rsuAnnual)} TC
                                </div>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                                isCurrent
                                  ? 'bg-[#007AFF] text-white'
                                  : canPassGate
                                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {isCurrent
                                ? '✓ Active'
                                : canPassGate
                                  ? `✅ ${metPrereqs}/${totalPrereqs} Ready`
                                  : `🔒 ${metPrereqs}/${totalPrereqs} Prereqs`}
                            </span>
                          </div>

                          {/* Selectivity Label Badge */}
                          {entryReq && (
                            <div className="flex flex-wrap items-center justify-between gap-1 rounded-xl bg-black/5 px-2.5 py-1 text-[10px] font-extrabold dark:bg-white/5">
                              <span>{entryReq.selectivityLabel}</span>
                              <span className="text-[9px] font-bold text-[var(--ink-soft)]">
                                -{entryReq.interviewEnergyCost} ⚡ Onsite
                              </span>
                            </div>
                          )}

                          {/* Required Custom Tech Tree Nodes & Core Skills Badges */}
                          {entryReq && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                                Prerequisites ({metPrereqs}/{totalPrereqs} Met):
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {reqNodes.map((nid) => {
                                  const nodeDef = SKILL_TREE_NODE_BY_ID[nid];
                                  const hasNode = unlockedTechNodes.includes(nid);
                                  return (
                                    <button
                                      key={nid}
                                      onClick={() => setActiveModal('career', 'tree')}
                                      className={`btn-press inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${hasNode
                                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                        }`}
                                      title="Open Skill Tech Tree"
                                    >
                                      {hasNode ? '✓' : '🔒'} {nodeDef?.codeName}: {nodeDef?.title || nid}
                                    </button>
                                  );
                                })}

                                {reqSkills.map((req) => {
                                  const skMeta = SKILLS_META.find((m) => m.key === req.skill);
                                  const curLvl = Math.floor(skills[req.skill] ?? 0);
                                  const met = curLvl >= req.level;
                                  return (
                                    <span
                                      key={req.skill}
                                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${met
                                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                        }`}
                                    >
                                      {met ? '✓' : '🔒'} {skMeta?.emoji} {skMeta?.label || req.skill} Lv.{curLvl}/{req.level}
                                    </span>
                                  );
                                })}

                                {minDeliv > 0 && (
                                  <button
                                    onClick={() => setActiveModal('career', 'explore')}
                                    className={`btn-press inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${delivMet
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                                      }`}
                                  >
                                    {delivMet ? '✓' : '🔒'} 🚀 {curDeliv}/{minDeliv} Shipped Deliverable
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          {isCurrent ? (
                            <span className="flex-1 rounded-xl bg-emerald-500/20 py-1.5 text-center text-[11px] font-extrabold text-emerald-600">
                              ✓ Current Career Track
                            </span>
                          ) : canPassGate ? (
                            <button
                              onClick={() => applyJob(c.id)}
                              className="btn-press flex-1 rounded-xl bg-emerald-600 py-1.5 text-[11px] font-extrabold text-white"
                            >
                              🎯 Pass Onsite &amp; Switch (-{entryReq?.interviewEnergyCost ?? 15} ⚡)
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setActiveModal('career', 'interview')}
                                className="btn-press flex-1 rounded-xl bg-amber-500/20 py-1.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300"
                              >
                                🌉 View Prereq Checklist ({metPrereqs}/{totalPrereqs})
                              </button>
                              <button
                                onClick={() => applyJob(c.id)}
                                className="btn-press rounded-xl bg-black/8 px-2.5 py-1.5 text-[10px] font-extrabold text-[var(--ink-soft)] dark:bg-white/10"
                                title="Check missing prerequisites"
                              >
                                🔒
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              2. SCHWAAB WEALTH + LIVE SPARKLINE + AI MOMENTUM TRADE
          ========================================================= */}
          {phoneApp === 'wealth' && (
            <div className="space-y-3.5">
              {/* Sub-Tab Bar: Market · Equity & RSUs · Cashflow */}
              <div className="grid grid-cols-3 rounded-2xl bg-[var(--mist)] p-1">
                {(
                  [
                    { id: 'market', label: '📈 Market' },
                    { id: 'equity', label: '💎 Equity & RSUs' },
                    { id: 'cashflow', label: '💸 Cashflow' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setWealthSubTab(tab.id)}
                    className={`rounded-xl py-1.5 text-[11px] font-extrabold transition-all ${
                      wealthSubTab === tab.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-[var(--ink-soft)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {wealthSubTab === 'market' && (
                <>
                  {/* Live Stock Sparkline & Net Worth Card */}
                  <div className="rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent p-4 border border-emerald-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {MARKET_ASSET_BY_TICKER[selectedTicker]?.name || 'NVDA / AI Semis'} · Total Net Worth
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
                          <div className="text-[9px] font-bold text-[#007AFF]">Equities</div>
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

                  {/* 1-Tap Index Chips, Portfolio Presets & AI Momentum Trade */}
                  <div className="rounded-3xl bg-[var(--mist)] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">⚡ 1-Tap Index & Presets</span>
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

                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'boglehead', label: '🌐 Boglehead' },
                          { id: 'ai_supercycle', label: '🟢 AI Supercycle' },
                          { id: 'treasury_barbell', label: '🏛️ T-Bill Barbell' },
                        ] as const
                      ).map((preset) => (
                        <button
                          key={preset.id}
                          disabled={cash < 500}
                          onClick={() => applyPortfolioPreset(preset.id)}
                          className="btn-press rounded-xl border border-black/10 bg-white/75 py-1.5 text-[9.5px] font-extrabold text-[var(--ink)] disabled:opacity-40 dark:border-white/10 dark:bg-black/30"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Interactive Pulse Trade & Covered Call Buttons */}
                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        disabled={tradeCooldown > 0}
                        onClick={handleAiMomentumTrade}
                        className="btn-press flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm disabled:opacity-50"
                      >
                        <span>📈 Trade AI Earnings Momentum</span>
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                          {tradeCooldown > 0
                            ? `${tradeCooldown}s`
                            : 'Lv.' + Math.floor(skills.investing) + ' Alpha'}
                        </span>
                      </button>
                      <button
                        disabled={portfolioValue < 2500}
                        onClick={() => executeOptionsStrategy('covered_call')}
                        className="btn-press flex w-full items-center justify-between rounded-xl bg-indigo-500/15 px-3.5 py-2 text-[10.5px] font-extrabold text-indigo-700 disabled:opacity-40 dark:text-indigo-300"
                      >
                        <span>🛡️ Write Covered Calls (1.8% Yield)</span>
                        <span className="text-[9.5px] font-bold">
                          {portfolioValue >= 2500
                            ? `+${formatCurrency(Math.round(portfolioValue * 0.018))}`
                            : 'Need $2.5k Equity'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Individual Tickers Desk */}
                  <div className="rounded-3xl bg-[var(--mist)] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">📊 Direct Ticker Execution</span>
                      <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                        Cash: {formatCurrency(cash)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {MARKET_ASSETS.map((asset) => {
                        const pos = finance.holdings[asset.ticker];
                        const curPrice =
                          finance.marketPrices[asset.ticker] ?? asset.basePrice;
                        const prevPrice =
                          finance.marketPrevClose[asset.ticker] ?? asset.basePrice;
                        const pctChange =
                          prevPrice > 0
                            ? ((curPrice - prevPrice) / prevPrice) * 100
                            : 0;
                        const shares = pos?.shares ?? 0;
                        const holdingValue = Math.round(shares * curPrice);
                        const isSelected = selectedTicker === asset.ticker;

                        return (
                          <div
                            key={asset.ticker}
                            onClick={() => setSelectedTicker(asset.ticker)}
                            className={`cursor-pointer rounded-2xl border p-2.5 transition-all ${
                              isSelected
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : 'border-black/5 bg-white/75 dark:border-white/10 dark:bg-black/30'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base">{asset.emoji}</span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black">
                                      {asset.ticker}
                                    </span>
                                    <span
                                      className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-bold ${
                                        pctChange >= 0
                                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                      }`}
                                    >
                                      ${curPrice.toFixed(0)} ({pctChange >= 0 ? '+' : ''}
                                      {pctChange.toFixed(1)}%)
                                    </span>
                                  </div>
                                  <div className="truncate text-[9.5px] font-semibold text-[var(--ink-soft)]">
                                    {asset.name} ·{' '}
                                    {holdingValue > 0
                                      ? `Held: ${formatCurrency(holdingValue)}`
                                      : `${(asset.dailyDividendYield * 365 * 100).toFixed(1)}% div`}
                                  </div>
                                </div>
                              </div>

                              <div
                                className="flex shrink-0 items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  disabled={cash < 1000}
                                  onClick={() => {
                                    setSelectedTicker(asset.ticker);
                                    buyStock(asset.ticker, 1000);
                                  }}
                                  className="btn-press rounded-lg bg-emerald-600 px-2 py-1 text-[9.5px] font-extrabold text-white disabled:opacity-35"
                                >
                                  +$1k
                                </button>
                                <button
                                  disabled={holdingValue < 100}
                                  onClick={() => {
                                    setSelectedTicker(asset.ticker);
                                    sellStock(asset.ticker, 1000, false);
                                  }}
                                  className="btn-press rounded-lg bg-black/10 px-2 py-1 text-[9.5px] font-extrabold text-[var(--ink)] disabled:opacity-35 dark:bg-white/10"
                                >
                                  -$1k
                                </button>
                                <button
                                  disabled={holdingValue <= 0}
                                  onClick={() => {
                                    setSelectedTicker(asset.ticker);
                                    sellStock(asset.ticker, 1, true);
                                  }}
                                  className="btn-press rounded-lg bg-rose-500/15 px-2 py-1 text-[9.5px] font-extrabold text-rose-600 disabled:opacity-35 dark:text-rose-300"
                                >
                                  Sell All
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {wealthSubTab === 'equity' && (
                <>
                  {/* RSU Vesting & Automation Card */}
                  <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-transparent p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          💎 Equity & RSU Treasury
                        </div>
                        <div className="text-lg font-black">
                          {formatCurrency(vestedRsu)} Vested · {formatCurrency(unvestedRsu)} Unvested
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-2xl bg-white/70 p-2.5 dark:bg-black/35">
                        <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                          Realized Alpha
                        </div>
                        <div className="mt-0.5 text-xs font-black text-emerald-600">
                          {formatCurrency(finance.realizedGains)}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-2.5 dark:bg-black/35">
                        <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                          Dividends Earned
                        </div>
                        <div className="mt-0.5 text-xs font-black text-[#007AFF]">
                          {formatCurrency(finance.dividendsEarnedTotal)}
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={vestedRsu <= 0}
                      onClick={vestRsuToCash}
                      className="btn-press w-full rounded-2xl bg-purple-600 py-2.5 text-xs font-extrabold text-white shadow-sm disabled:opacity-40"
                    >
                      {vestedRsu > 0
                        ? `💎 Liquidate ${formatCurrency(vestedRsu)} Vested RSUs`
                        : 'No Vested RSUs Ready to Liquidate'}
                    </button>

                    {/* Automation Toggles: DRIP & Auto-Sell RSU */}
                    <div className="space-y-1.5 pt-1">
                      <button
                        onClick={toggleDrip}
                        className="btn-press flex w-full items-center justify-between rounded-2xl bg-white/75 px-3 py-2 text-left text-xs font-bold dark:bg-black/35"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`size-4 ${
                              finance.dripEnabled
                                ? 'text-emerald-500'
                                : 'text-[var(--ink-soft)] opacity-45'
                            }`}
                          />
                          <div>
                            <div className="text-[11px] font-extrabold">
                              Dividend Reinvestment (DRIP)
                            </div>
                            <div className="text-[9.5px] font-medium text-[var(--ink-soft)]">
                              Auto-compound weekly dividends into QQQM / VOO
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9.5px] font-black ${
                            finance.dripEnabled
                              ? 'bg-emerald-500 text-white'
                              : 'bg-black/10 text-[var(--ink-soft)] dark:bg-white/10'
                          }`}
                        >
                          {finance.dripEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      <button
                        onClick={toggleAutoSellRsu}
                        className="btn-press flex w-full items-center justify-between rounded-2xl bg-white/75 px-3 py-2 text-left text-xs font-bold dark:bg-black/35"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`size-4 ${
                              finance.autoSellRsu
                                ? 'text-purple-500'
                                : 'text-[var(--ink-soft)] opacity-45'
                            }`}
                          />
                          <div>
                            <div className="text-[11px] font-extrabold">
                              10b5-1 Auto-Sell Vested RSUs
                            </div>
                            <div className="text-[9.5px] font-medium text-[var(--ink-soft)]">
                              Automatically convert vesting RSU tranches to cash
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9.5px] font-black ${
                            finance.autoSellRsu
                              ? 'bg-purple-600 text-white'
                              : 'bg-black/10 text-[var(--ink-soft)] dark:bg-white/10'
                          }`}
                        >
                          {finance.autoSellRsu ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* SAFE Note Repayment */}
                  {loanOwed > 0 && (
                    <div className="flex items-center justify-between rounded-2xl bg-amber-500/15 p-3 border border-amber-500/30">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-amber-600">
                          SAFE / Student Note
                        </div>
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

                  {/* EV Garage & Apple CarPlay Card */}
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#007AFF]/25 bg-[#007AFF]/8 p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🏎️</span>
                      <div>
                        <div className="text-xs font-extrabold">
                          Apple CarPlay & Bay Area EV Garage
                        </div>
                        <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                          {ownedCars.length > 0
                            ? 'EV Owned · $0 Fares, Fast HOV Autopilot & Scenic Joyrides'
                            : 'Prius ($4.2k) · Model 3 FSD ($12.5k) · Taycan GT ($18.5k)'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveModal('garage')}
                      className="btn-press shrink-0 rounded-xl bg-[#007AFF] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs"
                    >
                      {ownedCars.length > 0 ? '🚗 Open CarPlay' : '🚗 EV Showroom'}
                    </button>
                  </div>

                  {/* F.I.R.E. & Golden Handcuffs Sovereignty Tracker Card */}
                  <div className="rounded-3xl border border-amber-500/35 bg-gradient-to-br from-amber-500/12 via-orange-500/8 to-emerald-500/10 p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          🔓 F.I.R.E. & Golden Handcuffs Tracker
                        </div>
                        <div className="text-xs font-extrabold">
                          {job
                            ? unvestedRsu > 0
                              ? `Golden Handcuffs: ${formatCurrency(unvestedRsu)} Unvested RSU`
                              : '0 Unvested RSUs · Ready to Walk Away!'
                            : '🏖️ Sovereign · Post-W2 / Independent Founder'}
                        </div>
                        <div className="text-[10px] font-medium text-[var(--ink-soft)]">
                          Coast F.I.R.E. Target: $500k (
                          {Math.min(100, Math.round((netWorth / 500000) * 100))}%) · Fat F.I.R.E.: $2.5M
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveModal('guide', 'goals')}
                        className="btn-press shrink-0 rounded-xl bg-amber-500 px-2.5 py-1.5 text-[10px] font-black text-white shadow-xs"
                      >
                        🎯 Goals & Rewards
                      </button>
                    </div>
                    {job && (
                      <button
                        onClick={() => resignJob()}
                        className="btn-press flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-white/75 py-1.5 text-[10.5px] font-extrabold text-amber-700 hover:bg-amber-500/15 dark:bg-black/35 dark:text-amber-300"
                      >
                        <span>🔓 Break the Golden Handcuffs (Resign W-2 Job)</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {wealthSubTab === 'cashflow' && (
                <>
                  {/* Weekly Cashflow Summary Card */}
                  <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/12 via-sky-500/8 to-transparent p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          💸 Weekly Net Cashflow · Day {getDayNumber(time)}
                        </div>
                        <div
                          className={`text-xl font-black ${
                            cfMetrics.netWeeklyCashFlow >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {cfMetrics.netWeeklyCashFlow >= 0 ? '+' : ''}
                          {formatCurrency(cfMetrics.netWeeklyCashFlow)}/wk
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                        {cfMetrics.passiveCoveragePct}% Rent Covered · {Math.min(100, Math.round((netWorth / 500000) * 100))}% FIRE
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded-xl bg-white/70 p-2 dark:bg-black/35">
                        <div className="text-[8.5px] font-bold uppercase text-[var(--ink-soft)]">
                          W-2 + RSU/wk
                        </div>
                        <div className="text-[11px] font-black text-emerald-600">
                          +{formatCurrency(cfMetrics.weeklySalaryCash + cfMetrics.weeklySalaryRsu)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/70 p-2 dark:bg-black/35">
                        <div className="text-[8.5px] font-bold uppercase text-[var(--ink-soft)]">
                          Div + MRR/wk
                        </div>
                        <div className="text-[11px] font-black text-[#007AFF]">
                          +{formatCurrency(cfMetrics.weeklyDividendYield + cfMetrics.weeklyStartupRev)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/70 p-2 dark:bg-black/35">
                        <div className="text-[8.5px] font-bold uppercase text-[var(--ink-soft)]">
                          Rent + Burn/wk
                        </div>
                        <div className="text-[11px] font-black text-rose-500">
                          -{formatCurrency(cfMetrics.weeklyRentBurn + cfMetrics.weeklyCommuteBurn)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ledger Filter & Recent Transactions */}
                  <div className="rounded-3xl bg-[var(--mist)] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">🧾 Financial Ledger</span>
                      <div className="flex gap-1">
                        {(
                          [
                            { id: 'all', label: 'All' },
                            { id: 'inflow', label: 'Inflow' },
                            { id: 'outflow', label: 'Outflow' },
                            { id: 'trade', label: 'Trades' },
                          ] as const
                        ).map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setLedgerFilter(f.id)}
                            className={`rounded-lg px-2 py-0.5 text-[9.5px] font-extrabold ${
                              ledgerFilter === f.id
                                ? 'bg-[#007AFF] text-white'
                                : 'bg-black/5 text-[var(--ink-soft)] dark:bg-white/10'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                      {finance.ledger
                        .filter((entry) => {
                          if (ledgerFilter === 'inflow') return entry.amount > 0;
                          if (ledgerFilter === 'outflow') return entry.amount < 0;
                          if (ledgerFilter === 'trade') return entry.category === 'trade';
                          return true;
                        })
                        .slice(0, 18)
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-xl bg-white/75 px-3 py-2 text-xs dark:bg-black/30"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span>{entry.emoji}</span>
                              <div className="min-w-0">
                                <div className="truncate text-[10.5px] font-extrabold">
                                  {entry.label}
                                </div>
                                <div className="text-[9px] font-semibold text-[var(--ink-soft)]">
                                  Day {entry.day} · {entry.category.toUpperCase()}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 font-mono text-[11px] font-black ${
                                entry.amount >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {entry.amount >= 0 ? '+' : ''}
                              {formatCurrency(entry.amount)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
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

                {/* Difficulty Mode Selector */}
                <div className="mt-2.5 rounded-2xl bg-black/5 p-1 dark:bg-white/5">
                  <div className="flex items-center gap-1">
                    {(['easy', 'realistic', 'hardcore'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setStartupDifficulty(mode)}
                        className={`flex-1 rounded-xl py-1 text-[10px] font-extrabold transition-all ${
                          startupDifficulty === mode
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-[var(--ink-soft)] hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {mode === 'easy' ? '🌱 Casual' : mode === 'realistic' ? '⚡ Realistic SV' : '🔥 Hardcore'}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 px-1 text-center text-[9px] font-medium text-[var(--ink-soft)]">
                    {startupDifficulty === 'easy' && 'Zero cloud burn · Lenient VCs · No dev churn'}
                    {startupDifficulty === 'realistic' && `${dailyBurn > 0 ? `-$${dailyBurn}/d AWS GPU burn` : 'Modest cloud burn'} · 1.2% dev churn if idle · Traction gates`}
                    {startupDifficulty === 'hardcore' && `${dailyBurn > 0 ? `-$${dailyBurn}/d AWS GPU burn` : 'High GPU burn'} · 2.5% dev churn · Ruthless partner diligence`}
                  </div>
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
                    <h3 className="text-lg font-black leading-snug">🦄 {startup.name}</h3>
                    <p className="text-[11px] font-medium text-[var(--ink-soft)]">
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
                      {displayDevs.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Stage Milestones & Diligence Card */}
                {stageReq && stageReq.nextStage ? (
                  <div className="mt-3 rounded-2xl bg-white/60 p-3 text-left dark:bg-black/30 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="text-[var(--ink-soft)]">Next Round Target</span>
                      <span className="text-orange-600 dark:text-orange-400">{stageReq.stageTitle}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${startup.productProgress >= stageReq.minMvp ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-black/5 dark:bg-white/5 text-[var(--ink-soft)]'}`}>
                        <span>{startup.productProgress >= stageReq.minMvp ? '✓' : '○'}</span>
                        <span>MVP: {Math.round(startup.productProgress)}%/{stageReq.minMvp}%</span>
                      </div>
                      <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${displayDevs >= stageReq.minUsers ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-black/5 dark:bg-white/5 text-[var(--ink-soft)]'}`}>
                        <span>{displayDevs >= stageReq.minUsers ? '✓' : '○'}</span>
                        <span>Devs: {displayDevs.toLocaleString()}/{stageReq.minUsers.toLocaleString()}</span>
                      </div>
                      <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${startup.mrr >= stageReq.minMrr ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-black/5 dark:bg-white/5 text-[var(--ink-soft)]'}`}>
                        <span>{startup.mrr >= stageReq.minMrr ? '✓' : '○'}</span>
                        <span>MRR: {formatCurrency(startup.mrr)}/{formatCurrency(stageReq.minMrr)}</span>
                      </div>
                      <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${Math.floor(skills.hustle || 0) >= stageReq.minHustle ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-black/5 dark:bg-white/5 text-[var(--ink-soft)]'}`}>
                        <span>{Math.floor(skills.hustle || 0) >= stageReq.minHustle ? '✓' : '○'}</span>
                        <span>Hustle: Lv.{Math.floor(skills.hustle || 0)}/{stageReq.minHustle}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl bg-amber-500/15 p-2.5 text-center text-xs font-black text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    🏆 Generational Decacorn ($10B Market Cap) · Publicly Traded
                  </div>
                )}

                {/* Interactive Launch & VC Pitch Buttons */}
                <div className="mt-3.5 space-y-2">
                  <button
                    disabled={phCooldown > 0}
                    onClick={handleProductHuntLaunch}
                    className="btn-press flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#FF6154] to-orange-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm disabled:opacity-50"
                  >
                    <span>🚀 Drop Launch on ProductHunt</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                      {phCooldown > 0 ? `${phCooldown}s` : '+140 Devs · +$300 MRR'}
                    </span>
                  </button>

                  {stageReq && stageReq.nextStage ? (
                    <button
                      onClick={pitchStartupVC}
                      className={`btn-press flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-extrabold text-white shadow-sm ${
                        canPitchVC
                          ? 'bg-emerald-600 animate-pulse hover:bg-emerald-500'
                          : 'bg-orange-500/80 hover:bg-orange-500'
                      }`}
                    >
                      <Sparkles className="size-4 shrink-0" />
                      <span>
                        {canPitchVC
                          ? `🦄 Term Sheet Ready · Pitch ${stageReq.stageTitle}!`
                          : `Pitch Sand Hill VCs for ${stageReq.stageTitle}`}
                      </span>
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-emerald-600/20 py-2.5 text-center text-xs font-extrabold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      🏆 All Venture Rounds Closed · NASDAQ Bell Rung!
                    </div>
                  )}
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
                {DOORDASH_MENU.map((item) => {
                  const canAffordItem = cash >= item.price;
                  return (
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
                        <div className="mt-2 text-xs font-extrabold leading-snug">
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
                        disabled={!canAffordItem}
                        onClick={() => orderDoorDash(item.id)}
                        className="btn-press mt-3 w-full rounded-2xl bg-[#FF3B30] py-2 text-xs font-black text-white shadow-sm disabled:opacity-45"
                      >
                        {canAffordItem
                          ? `Order ${formatCurrency(item.price)}`
                          : `Need ${formatCurrency(item.price)}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================
              5. BLUEFIN BAY AREA REAL ESTATE & HOUSE-HUNTING (REDFIN STYLE)
          ========================================================= */}
          {phoneApp === 'bluefin' && (
            <div className="space-y-3">
              {/* Bluefin Hero Banner */}
              <div className="rounded-3xl border border-[#0284C7]/35 bg-gradient-to-br from-[#0284C7]/18 via-sky-500/10 to-indigo-500/15 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-[#0284C7] px-2 py-0.5 text-[9px] font-black tracking-wider text-white uppercase">
                      <span>🐟 Bluefin Premier · Bay Area MLS</span>
                    </div>
                    <div className="mt-1 text-xs font-extrabold text-[var(--ink)]">
                      Tour & Lease 5 Bay Area Residences
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium text-[var(--ink-soft)]">
                      Residences only appear on the Bay Area Map when house hunting via Bluefin.
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => openBluefinMap(homeId)}
                      className="btn-press shrink-0 rounded-xl bg-[#0284C7] px-2.5 py-1.5 text-[10px] font-extrabold text-white shadow-xs hover:bg-[#0369A1]"
                    >
                      🗺️ House Hunt Map
                    </button>
                    <button
                      onClick={() => setActiveModal('computer', 'bluefin')}
                      className="btn-press shrink-0 rounded-lg bg-white/80 px-2 py-0.5 text-[9.5px] font-extrabold text-[#0284C7] dark:bg-black/40 dark:text-sky-300"
                    >
                      🖥️ Open on PC
                    </button>
                  </div>
                </div>

                {/* Bluefin Filter Pills */}
                <div className="mt-2.5 grid grid-cols-4 gap-1 rounded-2xl bg-white/70 p-1 dark:bg-black/35">
                  {(
                    [
                      { id: 'all', label: `All (${HOMES.length})` },
                      { id: 'starter', label: 'T1–T2' },
                      { id: 'luxury', label: 'Luxury T3+' },
                      { id: 'owned', label: `Owned (${ownedHomes.length})` },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setBluefinFilter(f.id)}
                      className={`rounded-xl py-1 text-[10px] font-extrabold transition-all ${bluefinFilter === f.id
                          ? 'bg-[#0284C7] text-white shadow-xs'
                          : 'text-[var(--ink-soft)]'
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {HOMES.filter((h) => {
                if (bluefinFilter === 'starter') return h.tier <= 2;
                if (bluefinFilter === 'luxury') return h.tier >= 3;
                if (bluefinFilter === 'owned') return ownedHomes.includes(h.id) || h.id === homeId;
                return true;
              }).map((h) => {
                const isCurrent = homeId === h.id;
                const isOwned = ownedHomes.includes(h.id);
                const canAffordRent = cash >= h.weeklyRent;
                const canAffordBuy = cash >= h.buyPrice;
                const hqId = currentCareer?.locationId || 'soma_yc_loft';
                const hqVenue = LOCATION_BY_ID[hqId];
                const modeForEst = ownedCars.length > 0 ? 'tesla' : 'waymo';
                const hqCommute = calculateCommuteDetails(
                  h.id,
                  hqId,
                  h.id,
                  modeForEst
                );
                const currentHqCommute = calculateCommuteDetails(
                  homeId,
                  hqId,
                  homeId,
                  modeForEst
                );
                const commuteDelta = hqCommute.durationMinutes - currentHqCommute.durationMinutes;

                return (
                  <div
                    key={h.id}
                    className={`rounded-3xl border p-3.5 transition-all ${isCurrent
                        ? 'border-[#0284C7]/60 bg-[#0284C7]/12 ring-1 ring-[#0284C7]/30'
                        : 'border-black/5 bg-[var(--mist)] dark:border-white/5'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/75 text-2xl shadow-xs dark:bg-white/10">
                          {h.emoji}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${h.tier >= 5
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                  : h.tier >= 4
                                    ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                    : h.tier >= 3
                                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                                }`}
                            >
                              {h.tierLabel}
                            </span>
                            <span className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-[var(--ink-soft)] dark:bg-white/10">
                              {h.gridSize}×{h.gridSize} Grid
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs font-black leading-snug">
                            {h.name}
                          </div>
                          <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                            {h.area} · {h.district}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {isCurrent ? (
                          <span className="inline-block rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            🏠 Your Home
                          </span>
                        ) : isOwned ? (
                          <span className="inline-block rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
                            🔑 Deed Owned
                          </span>
                        ) : (
                          <div className="font-mono text-xs font-black text-[#0284C7] dark:text-sky-400">
                            {formatCurrency(h.weeklyRent)}/wk
                          </div>
                        )}
                        <div className="mt-0.5 font-mono text-[9.5px] font-bold text-[var(--ink-soft)]">
                          Bluefin Est: {formatCurrency(h.buyPrice)}
                        </div>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] leading-snug text-[var(--ink-soft)]">
                      {h.tagline}
                    </p>

                    {/* Luxury Perks & Commute Pills */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {h.perks.map((perk, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[var(--ink)] dark:bg-black/30"
                        >
                          <span>{perk.emoji}</span>
                          <span>{perk.label}:</span>
                          <span className="font-extrabold text-[#0284C7] dark:text-sky-300">
                            {perk.desc}
                          </span>
                        </span>
                      ))}
                      {hqVenue && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500/12 px-2 py-0.5 text-[10px] font-extrabold text-[#0284C7] dark:text-sky-300">
                          <span>🚆 To {hqVenue.shortName}:</span>
                          <span>
                            {hqCommute.miles} mi · {hqCommute.durationMinutes}m
                          </span>
                          {!isCurrent && commuteDelta !== 0 && (
                            <span
                              className={
                                commuteDelta < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-500'
                              }
                            >
                              ({commuteDelta < 0 ? `${commuteDelta}m` : `+${commuteDelta}m`})
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                      <button
                        disabled={isCurrent || (!isOwned && !canAffordRent)}
                        onClick={() => moveHome(h.id, false)}
                        className="btn-press rounded-xl bg-[#007AFF] px-2 py-2 text-[10.5px] font-extrabold text-white disabled:opacity-40"
                      >
                        {isCurrent
                          ? '🏠 Current'
                          : isOwned
                            ? '🔑 Move In'
                            : canAffordRent
                              ? `Lease ${formatCurrency(h.weeklyRent)}`
                              : `Need ${formatCurrency(h.weeklyRent)}`}
                      </button>
                      <button
                        disabled={isOwned || !canAffordBuy}
                        onClick={() => moveHome(h.id, true)}
                        className="btn-press rounded-xl bg-emerald-600 px-2 py-2 text-[10.5px] font-extrabold text-white disabled:opacity-40"
                      >
                        {isOwned
                          ? '✓ Owned'
                          : canAffordBuy
                            ? `Buy ${formatCurrency(h.buyPrice)}`
                            : `Deed ${formatCurrency(h.buyPrice)}`}
                      </button>
                      <button
                        onClick={() => openBluefinMap(h.id)}
                        className="btn-press rounded-xl bg-[#0284C7]/15 px-2 py-2 text-[10.5px] font-extrabold text-[#0284C7] hover:bg-[#0284C7]/25 dark:text-sky-300"
                      >
                        📍 Pin on Map
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
                  className={`rounded-xl py-1.5 text-xs font-extrabold transition-all ${blindTab === 'dm' ? 'bg-[#007AFF] text-white shadow-sm' : 'text-[var(--ink-soft)]'
                    }`}
                >
                  💬 iMessage Network
                </button>
                <button
                  onClick={() => setBlindTab('feed')}
                  className={`rounded-xl py-1.5 text-xs font-extrabold transition-all ${blindTab === 'feed' ? 'bg-[#AF52DE] text-white shadow-sm' : 'text-[var(--ink-soft)]'
                    }`}
                >
                  🔥 Verified Blind
                </button>
              </div>

              {blindTab === 'dm' ? (
                (() => {
                  const activeDmNpc = selectedDmNpcId
                    ? NPCS.find((n) => n.id === selectedDmNpcId) || null
                    : null;

                  if (activeDmNpc) {
                    const rel = relationships[activeDmNpc.id];
                    const score = rel?.score ?? 12;
                    const trust = rel?.trust ?? 10;
                    const romance = rel?.romance ?? 5;
                    const tierInfo = getRelationshipTierInfo(score);
                    const spotDef = LOCATION_BY_ID[activeDmNpc.favoriteSpot];
                    const npcMilestones = getNpcMilestones(activeDmNpc.id);
                    const claimedIds = rel?.claimedMilestones || [];
                    const unclaimedMilestones = npcMilestones.filter(
                      (m) =>
                        (score >= m.threshold ||
                          (rel?.unlockedMilestones || []).includes(m.id)) &&
                        !claimedIds.includes(m.id)
                    );
                    const availTopics = getAvailableTopicsForNpc(
                      activeDmNpc.id,
                      score,
                      rel?.completedTopics || []
                    );
                    const activeTopic =
                      availTopics.find((t) => t.id === rel?.activeTopicId) ||
                      availTopics[0] ||
                      null;
                    const messages = rel?.messages || [
                      { from: 'npc' as const, text: activeDmNpc.greeting, time: 450 },
                    ];
                    const unlockedInteractions = NPC_INTERACTIONS.filter(
                      (i) => score >= i.minScore
                    );
                    const lockedInteractions = NPC_INTERACTIONS.filter(
                      (i) => score < i.minScore
                    );

                    return (
                      <div className="space-y-2.5">
                        {/* Back Bar & Full Hub Shortcut */}
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setSelectedDmNpcId(null);
                              setShowDmGiftDrawer(false);
                            }}
                            className="btn-press inline-flex items-center gap-1 rounded-full bg-[var(--mist)] px-3 py-1 text-[11px] font-extrabold text-[#007AFF]"
                          >
                            ← All DMs
                          </button>
                          <button
                            onClick={() => setActiveModal('sim', 'relationships')}
                            className="btn-press inline-flex items-center gap-1 rounded-full bg-[#007AFF]/15 px-3 py-1 text-[10.5px] font-extrabold text-[#007AFF]"
                          >
                            🤝 Open Circle Hub
                          </button>
                        </div>

                        {/* NPC iMessage Header */}
                        <div className="rounded-3xl bg-[var(--mist)] p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Portrait
                                appearance={activeDmNpc.appearance}
                                size={42}
                                ringColor={tierInfo.color}
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs font-black">{activeDmNpc.name}</span>
                                  <span
                                    className="rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white"
                                    style={{ backgroundColor: tierInfo.color }}
                                  >
                                    {tierInfo.status} · {score}%
                                  </span>
                                </div>
                                <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                                  {activeDmNpc.role} · {activeDmNpc.company}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => inviteNpcHangout(activeDmNpc.id)}
                              className="btn-press shrink-0 rounded-xl bg-[#007AFF] px-2.5 py-1.5 text-[9.5px] font-black text-white shadow-xs"
                            >
                              📍 {spotDef?.shortName || 'Hangout'}
                            </button>
                          </div>

                          {/* Sub-meter Pills */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] font-extrabold">
                            <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-indigo-600 dark:text-indigo-300">
                              🤝 {trust} Trust
                            </span>
                            <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-pink-600 dark:text-pink-300">
                              💖 {romance} Vibe
                            </span>
                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[var(--ink-soft)] dark:bg-white/10">
                              ✨ {tierInfo.perkSummary}
                            </span>
                          </div>

                          {/* Unclaimed Milestone Alert Banner */}
                          {unclaimedMilestones.map((um) => (
                            <div
                              key={um.id}
                              className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="text-[10.5px] font-black text-amber-800 dark:text-amber-200">
                                  {um.emoji} {um.title} Ready!
                                </div>
                                <div className="truncate text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300">
                                  {um.perkLabel}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  claimRelationshipMilestone(activeDmNpc.id, um.id)
                                }
                                className="btn-press shrink-0 animate-pulse rounded-xl bg-amber-500 px-2.5 py-1.5 text-[10px] font-black text-white shadow-sm"
                              >
                                🎁 Claim Reward
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Scrollable Multi-Bubble iMessage Chat Thread */}
                        <div className="max-h-60 space-y-2 overflow-y-auto rounded-3xl border border-black/5 bg-[var(--mist)] p-3 dark:border-white/10">
                          {messages.map((msg, idx) => {
                            if (msg.from === 'milestone') {
                              return (
                                <div
                                  key={msg.id || idx}
                                  className="mx-auto rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-emerald-500/15 px-3 py-2 text-center"
                                >
                                  <div className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                                    {msg.text}
                                  </div>
                                  {unclaimedMilestones[0] && (
                                    <button
                                      onClick={() =>
                                        claimRelationshipMilestone(
                                          activeDmNpc.id,
                                          unclaimedMilestones[0].id
                                        )
                                      }
                                      className="btn-press mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[9.5px] font-black text-white"
                                    >
                                      🎁 Claim {unclaimedMilestones[0].title}
                                    </button>
                                  )}
                                </div>
                              );
                            }

                            const isMe = msg.from === 'me';
                            return (
                              <div
                                key={msg.id || idx}
                                className={`flex flex-col ${
                                  isMe ? 'items-end' : 'items-start'
                                }`}
                              >
                                <div className="mb-0.5 flex items-center gap-1 px-1 text-[8.5px] font-bold text-[var(--ink-soft)]">
                                  <span>{isMe ? 'You' : activeDmNpc.name.split(' ')[0]}</span>
                                  {msg.tag && (
                                    <span className="rounded bg-black/5 px-1 py-0.2 dark:bg-white/10">
                                      {msg.emoji} {msg.tag}
                                    </span>
                                  )}
                                  <span>· {formatTime(msg.time)}</span>
                                </div>
                                <div
                                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] font-medium leading-snug shadow-xs ${
                                    isMe
                                      ? 'rounded-br-xs bg-[#007AFF] text-white'
                                      : 'rounded-bl-xs bg-white/90 text-[var(--ink)] dark:bg-black/45'
                                  }`}
                                >
                                  {msg.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Incoming Topic Prompt Card Inside iMessage Thread */}
                        {activeTopic && (
                          <div className="rounded-3xl border border-[#007AFF]/40 bg-gradient-to-br from-[#007AFF]/12 via-indigo-500/10 to-purple-500/10 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[10.5px] font-black text-[#007AFF] dark:text-sky-400">
                                💬 Incoming Topic · {activeTopic.emoji} {activeTopic.title}
                              </span>
                              <span className="rounded-full bg-[#007AFF] px-2 py-0.5 text-[8.5px] font-extrabold uppercase text-white">
                                {activeTopic.category}
                              </span>
                            </div>

                            <div className="rounded-2xl rounded-tl-xs bg-white/85 px-3 py-2 text-[11px] font-semibold text-[var(--ink)] dark:bg-black/40">
                              “{activeTopic.promptText}”
                            </div>

                            <div className="space-y-1.5">
                              {activeTopic.choices.map((choice, idx) => {
                                const skCheck = choice.skillCheck;
                                const skMeta = skCheck
                                  ? SKILLS_META.find((m) => m.key === skCheck.skill)
                                  : null;
                                const playerSkLvl = skCheck ? skills[skCheck.skill] || 0 : 0;
                                const meetsSkill = skCheck
                                  ? playerSkLvl >= skCheck.level
                                  : true;

                                return (
                                  <button
                                    key={idx}
                                    onClick={() =>
                                      answerNpcTopic(activeDmNpc.id, activeTopic.id, idx)
                                    }
                                    className="btn-press w-full rounded-2xl border border-black/10 bg-white/85 p-2.5 text-left transition-all hover:border-[#007AFF] dark:border-white/10 dark:bg-black/35"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                      <span className="text-[10.5px] font-black text-[#007AFF] dark:text-sky-400">
                                        {choice.emoji} {choice.label}
                                      </span>
                                      <div className="flex items-center gap-1 text-[9px] font-extrabold">
                                        {skCheck && (
                                          <span
                                            className={`rounded-full px-1.5 py-0.5 ${
                                              meetsSkill
                                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                            }`}
                                          >
                                            {skMeta?.emoji} Lv.{skCheck.level}{' '}
                                            {meetsSkill ? '✓' : `(Lv.${Math.floor(playerSkLvl)})`}
                                          </span>
                                        )}
                                        <span className="rounded-full bg-pink-500/15 px-1.5 py-0.5 text-pink-600 dark:text-pink-300">
                                          +{choice.scoreDelta} Bond
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-0.5 text-[10.5px] font-medium text-[var(--ink)]">
                                      “{choice.playerText}”
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Quick-Tap Action Pills + Gift Toggle Below Thread */}
                        <div className="rounded-3xl bg-[var(--mist)] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                              ⚡ Quick-Tap iMessage Actions
                            </span>
                            <button
                              onClick={() => setShowDmGiftDrawer(!showDmGiftDrawer)}
                              className={`btn-press rounded-full px-2.5 py-0.5 text-[10px] font-extrabold transition-all ${
                                showDmGiftDrawer
                                  ? 'bg-pink-500 text-white'
                                  : 'bg-pink-500/15 text-pink-600 dark:text-pink-300'
                              }`}
                            >
                              🎁 {showDmGiftDrawer ? 'Hide Gifts' : 'Send Gift'}
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            {unlockedInteractions.map((act) => {
                              const lacksEnergy = needs.energy < act.energyCost;
                              const lacksCash = Boolean(act.cashCost && cash < act.cashCost);
                              const insufficient = lacksEnergy || lacksCash;
                              return (
                                <button
                                  key={act.id}
                                  disabled={insufficient}
                                  onClick={() => interactWithNpc(activeDmNpc.id, act.id)}
                                  className="btn-press flex flex-col items-center justify-center rounded-xl border border-black/5 bg-white/80 px-2 py-1.5 text-center disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-black/35"
                                >
                                  <span className="text-[10.5px] font-extrabold">
                                    {act.emoji} {act.shortLabel}
                                  </span>
                                  <span
                                    className="text-[8.5px] font-bold"
                                    style={{ color: act.accent }}
                                  >
                                    {lacksEnergy
                                      ? `Need ${act.energyCost}⚡`
                                      : lacksCash
                                        ? `Need $${act.cashCost}`
                                        : `+${act.baseScoreDelta} Bond${act.cashCost ? ` · $${act.cashCost}` : ''}`}
                                  </span>
                                </button>
                              );
                            })}
                            {lockedInteractions.slice(0, 3).map((act) => (
                              <button
                                key={act.id}
                                disabled
                                onClick={() => interactWithNpc(activeDmNpc.id, act.id)}
                                className="btn-press flex flex-col items-center justify-center rounded-xl bg-black/5 px-2 py-1.5 text-center opacity-55 disabled:cursor-not-allowed dark:bg-white/5"
                              >
                                <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                                  🔒 {act.shortLabel}
                                </span>
                                <span className="text-[8.5px] font-semibold text-[var(--ink-soft)]">
                                  Req {act.minScore}%
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Expandable Quick Gift Drawer */}
                          {showDmGiftDrawer && (
                            <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-black/5 pt-2 dark:border-white/10">
                              {NPC_GIFTS.map((g) => {
                                const isFav = g.favoriteOfNpcIds.includes(activeDmNpc.id);
                                const inBag = g.backpackItemId
                                  ? (inventory || []).find(
                                      (i) =>
                                        i.itemId === g.backpackItemId && i.quantity > 0
                                    )
                                  : undefined;

                                return (
                                  <button
                                    key={g.id}
                                    onClick={() => giftNpc(activeDmNpc.id, g.id)}
                                    className={`btn-press flex items-center justify-between gap-1.5 rounded-xl border p-2 text-left ${
                                      isFav
                                        ? 'border-pink-500/40 bg-pink-500/12'
                                        : 'border-black/5 bg-white/75 dark:border-white/10 dark:bg-black/30'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate text-[10px] font-extrabold">
                                        {g.emoji} {g.name}
                                      </div>
                                      <div className="text-[8.5px] font-bold text-pink-600 dark:text-pink-300">
                                        {isFav ? '⭐ Favorite!' : `+${g.baseScoreDelta} Bond`}
                                      </div>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-[#007AFF] px-1.5 py-0.5 text-[8.5px] font-black text-white">
                                      {inBag ? '🎒 Free' : `$${g.price}`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      {NPCS.map((npc) => {
                        const rel = relationships[npc.id];
                        const score = rel?.score || 12;
                        const trust = rel?.trust ?? 10;
                        const romance = rel?.romance ?? 5;
                        const tierInfo = getRelationshipTierInfo(score);
                        const lastMsg =
                          rel?.messages[rel.messages.length - 1]?.text || npc.greeting;
                        const npcMilestones = getNpcMilestones(npc.id);
                        const claimedIds = rel?.claimedMilestones || [];
                        const unclaimedCount = npcMilestones.filter(
                          (m) =>
                            (score >= m.threshold ||
                              (rel?.unlockedMilestones || []).includes(m.id)) &&
                            !claimedIds.includes(m.id)
                        ).length;
                        const hasTopic =
                          getAvailableTopicsForNpc(
                            npc.id,
                            score,
                            rel?.completedTopics || []
                          ).length > 0;

                        return (
                          <div
                            key={npc.id}
                            className="rounded-3xl bg-[var(--mist)] p-3 space-y-2 transition-all hover:ring-1 hover:ring-[#007AFF]/40"
                          >
                            <div
                              onClick={() => setSelectedDmNpcId(npc.id)}
                              className="flex cursor-pointer items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Portrait
                                  appearance={npc.appearance}
                                  size={40}
                                  ringColor={tierInfo.color}
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-black">{npc.name}</span>
                                    <span
                                      className="rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white"
                                      style={{ backgroundColor: tierInfo.color }}
                                    >
                                      {tierInfo.status}
                                    </span>
                                    {unclaimedCount > 0 && (
                                      <span className="animate-pulse rounded-full bg-amber-500 px-1.5 py-0.2 text-[8.5px] font-black text-white">
                                        🎁 {unclaimedCount} Reward
                                      </span>
                                    )}
                                    {hasTopic && (
                                      <span className="rounded-full bg-[#007AFF]/15 px-1.5 py-0.2 text-[8.5px] font-extrabold text-[#007AFF]">
                                        💬 Topic
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9.5px] font-semibold text-[var(--ink-soft)]">
                                    <span>
                                      {npc.role} · {npc.company}
                                    </span>
                                    <span className="text-indigo-600 dark:text-indigo-400">
                                      🤝 {trust}
                                    </span>
                                    <span className="text-pink-600 dark:text-pink-400">
                                      💖 {romance}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <span
                                  className="text-[11px] font-black"
                                  style={{ color: tierInfo.color }}
                                >
                                  {score}%
                                </span>
                                <span className="text-[9px] font-extrabold text-[#007AFF]">
                                  Thread →
                                </span>
                              </div>
                            </div>

                            {/* Latest iMessage Bubble (Tap to Open Thread) */}
                            <div
                              onClick={() => setSelectedDmNpcId(npc.id)}
                              className="cursor-pointer rounded-2xl rounded-tl-sm bg-white/80 px-3 py-2 text-[11px] font-medium text-[var(--ink)] dark:bg-black/35"
                            >
                              “{lastMsg}”
                            </div>

                            {/* 1-Tap iMessage Action Pills + Open Thread */}
                            <div className="grid grid-cols-5 gap-1.5">
                              {(
                                [
                                  {
                                    id: 'coffeeChat',
                                    label: '☕ Coffee',
                                    cls: 'bg-[#007AFF]/15 text-[#007AFF]',
                                  },
                                  {
                                    id: 'whiteboard',
                                    label: '🧠 Arch',
                                    cls: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
                                  },
                                  {
                                    id: 'pitch',
                                    label: '🦄 Pitch',
                                    cls: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
                                  },
                                  {
                                    id: 'flirt',
                                    label: '❤️ Vibe',
                                    cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
                                  },
                                ] as const
                              ).map((btn) => {
                                const actDef = NPC_INTERACTIONS.find((a) => a.id === btn.id);
                                const disabled = Boolean(
                                  actDef &&
                                    (score < actDef.minScore ||
                                      needs.energy < actDef.energyCost ||
                                      (actDef.cashCost && cash < actDef.cashCost))
                                );
                                return (
                                  <button
                                    key={btn.id}
                                    disabled={disabled}
                                    onClick={() => interactWithNpc(npc.id, btn.id)}
                                    className={`btn-press rounded-xl py-1.5 text-[10px] font-extrabold disabled:cursor-not-allowed disabled:opacity-40 ${btn.cls}`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => setSelectedDmNpcId(npc.id)}
                                className="btn-press rounded-xl bg-[#007AFF] py-1.5 text-[10px] font-extrabold text-white shadow-xs"
                              >
                                💬 Chat
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
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
                        <p className="text-[11px] text-[var(--ink-soft)] leading-relaxed">{post.body}</p>
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => handleLikeBlindPost(post.id)}
                            className={`btn-press inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${liked
                                ? 'bg-rose-500 text-white'
                                : 'bg-black/5 text-[var(--ink-soft)] dark:bg-white/10'
                              }`}
                          >
                            <Heart className="size-3" /> {post.likes + (liked ? 1 : 0)}
                          </button>
                          <div className="flex items-center gap-2">
                            {post.link && (
                              <a
                                href={post.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-press inline-flex items-center gap-1 rounded-full bg-[#007AFF] px-2.5 py-1 text-[10px] font-extrabold text-white shadow-2xs hover:bg-[#0066CC]"
                              >
                                <Globe className="size-2.5" />
                                <span>{post.linkLabel || 'Visit Site'}</span>
                                <ArrowUpRight className="size-2.5" />
                              </a>
                            )}
                            <span className="text-[10px] font-semibold text-[var(--ink-soft)]">
                              💬 {post.comments}
                            </span>
                          </div>
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
                    className={`relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br ${app.gradient} text-white shadow-md transition-transform ${active ? 'scale-110 ring-2 ring-white' : 'opacity-85 hover:opacity-100'
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
                    className={`text-[9px] font-extrabold tracking-tight ${active ? 'text-[#007AFF]' : 'text-[var(--ink-soft)]'
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
