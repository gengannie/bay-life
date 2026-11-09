import React, { useState } from 'react';
import {
  ASPIRATIONS,
  CAREER_BY_ID,
  FURNITURE_BY_ID,
  GOALS,
  HOMES,
} from '../data/worldData';
import {
  calculateCashFlowMetrics,
  calculateNetWorth,
  evaluateAspirationProgress,
  formatCurrency,
  isHomePowered,
  useGameStore,
} from '../store/useGameStore';
import { AspirationActionType } from '../types/game';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  LockOpen,
  X,
  ArrowRight,
  Globe,
  ArrowUpRight,
} from 'lucide-react';

interface PlaybookCardDef {
  id: string;
  emoji: string;
  tag: string;
  title: string;
  summary: string;
  flowSteps: string[];
  accentText: string;
  accentBg: string;
  btnClass: string;
  ctaLabel: string;
  onCta: () => void;
  secondaryCta?: {
    label: string;
    btnClass: string;
    onClick: () => void;
  };
  details: Array<{ label: string; value: string }>;
}

export const GoalsGuideModal: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const guideTab = useGameStore((s) => s.guideTab) || 'goals';
  const goalIndex = useGameStore((s) => s.goalIndex);
  const wishes = useGameStore((s) => s.wishes);
  const job = useGameStore((s) => s.job);
  const vestedRsu = useGameStore((s) => s.vestedRsu);
  const unvestedRsu = useGameStore((s) => s.unvestedRsu);
  const portfolioValue = useGameStore((s) => s.portfolioValue);
  const karma = useGameStore((s) => s.karma);
  const locationId = useGameStore((s) => s.locationId);
  const objects = useGameStore((s) => s.objects);
  const unlockedPerks = useGameStore((s) => s.unlockedPerks);

  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const setView = useGameStore((s) => s.setView);
  const selectAspiration = useGameStore((s) => s.selectAspiration);
  const resignJob = useGameStore((s) => s.resignJob);
  const skipTutorial = useGameStore((s) => s.skipTutorial);
  const enqueueAction = useGameStore((s) => s.enqueueAction);

  // Progressive disclosure states (Apple HIG: hide secondary text behind toggles)
  const [showStrategyTip, setShowStrategyTip] = useState(false);
  const [expandedPlaybookIds, setExpandedPlaybookIds] = useState<Record<string, boolean>>({});
  const [expandedStepHint, setExpandedStepHint] = useState<Record<number, boolean>>({});

  const togglePlaybookCard = (id: string) => {
    setExpandedPlaybookIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStepHint = (idx: number) => {
    setExpandedStepHint((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const state = useGameStore.getState();
  const netWorth = calculateNetWorth(state);
  const cf = calculateCashFlowMetrics(state);
  const activeEval = evaluateAspirationProgress(state, sim.aspiration);
  const careerDef = job ? CAREER_BY_ID[job.careerId] : null;
  const levelDef = careerDef && job ? careerDef.levels[job.levelIndex] : null;
  const homeDef = HOMES.find((h) => h.id === state.homeId) || HOMES[1];

  const hasParachute =
    unlockedPerks.includes('perk_exec_halo') ||
    unlockedPerks.includes('perk_diamond_hands');
  const nonSalaryWeekly = cf.weeklyStartupRev + cf.weeklyDividendYield;
  const totalMilestoneCash = activeEval.stages.reduce(
    (sum, s) => sum + (s.stage.rewardCash || 0),
    0
  );
  const totalMilestoneKarma = activeEval.stages.reduce(
    (sum, s) => sum + (s.stage.rewardKarma || 0),
    0
  );

  const handleActionTrigger = (actionType: AspirationActionType) => {
    switch (actionType) {
      case 'wealth':
        setActiveModal('phone', 'wealth');
        break;
      case 'career':
        if (job) {
          setActiveModal('career');
        } else {
          setActiveModal('phone', 'levels');
        }
        break;
      case 'startup':
        setActiveModal('phone', 'startup');
        break;
      case 'map':
        setActiveModal(null);
        setView('map');
        break;
      case 'skills': {
        if (locationId === 'home') {
          const powered = isHomePowered(state);
          const codeActions = ['train_local_llm', 'build_startup_mvp', 'vibe_code_ai', 'grind_leetcode'];
          for (const actId of codeActions) {
            const matching = objects.find((o) =>
              FURNITURE_BY_ID[o.objectId]?.actions.includes(actId)
            );
            if (matching && powered) {
              enqueueAction(actId, {
                objectUid: matching.uid,
                pos: { x: matching.x, y: matching.y },
              });
              setActiveModal(null);
              return;
            }
          }
        }
        setActiveModal('sim', 'skills');
        break;
      }
      case 'furnish':
        if (locationId === 'home') {
          setActiveModal(null);
          setView('buy');
        } else {
          setActiveModal('phone', 'bluefin');
        }
        break;
      case 'bluefin':
        setActiveModal('phone', 'bluefin');
        break;
      case 'social':
        setActiveModal('sim', 'relationships');
        break;
      case 'resign':
        resignJob();
        break;
    }
  };

  const PLAYBOOK_CARDS: PlaybookCardDef[] = [
    {
      id: 'fire',
      emoji: '🔥',
      tag: 'Wealth & Sovereign Time',
      title: 'F.I.R.E. & Golden Handcuffs',
      summary: 'Turn W-2 RSUs into passive ETFs until work is 100% optional.',
      flowSteps: ['Vest RSUs', 'Buy ETFs', '100% Burn Covered', 'Quit W-2'],
      accentText: 'text-emerald-600 dark:text-emerald-400',
      accentBg: 'bg-emerald-500/15',
      btnClass: 'bg-emerald-600 hover:bg-emerald-500',
      ctaLabel: 'Schwaab Wealth',
      onCta: () => setActiveModal('phone', 'wealth'),
      details: [
        { label: 'Daily RSU Vest', value: '12%–16% of Unvested RSUs vest every morning while employed.' },
        { label: 'Passive Yield', value: 'Liquidate vested RSUs → buy QQQX / NVDAX / SGOV for daily dividends.' },
        { label: 'Break Handcuffs', value: 'Quit W-2 anytime to drop RTO mandates (+22 Mood, forfeits unvested RSUs).' },
      ],
    },
    {
      id: 'career',
      emoji: '💼',
      tag: 'Big Tech W-2 Loop',
      title: 'Shifts, RTO & Promotions',
      summary: 'Climb L3 → L8 for massive base pay and RSU grants.',
      flowSteps: ['3 Office Days/wk', 'Tap Sprint Bugs', 'Ship Deliverables', 'Promo'],
      accentText: 'text-[#007AFF]',
      accentBg: 'bg-[#007AFF]/15',
      btnClass: 'bg-[#007AFF] hover:bg-[#0066CC]',
      ctaLabel: 'Career Hub (W)',
      onCta: () => setActiveModal('career'),
      details: [
        { label: 'Hybrid 3+2 Policy', value: '3 Campus Days/wk grants +$500 Monday bonus & +20% promo speed.' },
        { label: 'Live Sprints', value: 'Tap pop-up bug/PR targets during shifts for instant cash & perf.' },
        { label: 'Promo Gates', value: 'Complete R&D Deliverables + Skill Tree nodes in Career Hub (W).' },
      ],
    },
    {
      id: 'startup',
      emoji: '🦄',
      tag: 'Founder Equity Loop',
      title: 'YC Startup & Stripe MRR',
      summary: 'Ship an AI MVP at night and scale recurring Stripe revenue.',
      flowSteps: ['Desk MVP → 50%', 'ProductHunt', 'Pitch VCs', 'Daily MRR'],
      accentText: 'text-orange-600 dark:text-orange-400',
      accentBg: 'bg-orange-500/15',
      btnClass: 'bg-orange-500 hover:bg-orange-600',
      ctaLabel: 'Startup Studio',
      onCta: () => setActiveModal('phone', 'startup'),
      details: [
        { label: 'Build MVP', value: 'Use Home Desk, PC IDE (C), or SoMa YC Loft to reach 50%+ MVP.' },
        { label: 'Raise Rounds', value: 'Pitch Sand Hill VCs: Prototype → YC Batch → Seed → Series A.' },
        { label: 'Passive Cashflow', value: 'Stripe MRR pays out automatically every morning—even without a W-2.' },
      ],
    },
    {
      id: 'qol',
      emoji: '✨',
      tag: 'Autopilot & Perks',
      title: 'Smart Next, Perks & Homes',
      summary: 'Automate needs, unlock permanent multipliers, and cut rent to $0.',
      flowSteps: ['Press A (Smart)', 'Spend ⚡ Karma', 'Buy EV (G)', 'Own Home'],
      accentText: 'text-purple-600 dark:text-purple-400',
      accentBg: 'bg-purple-500/15',
      btnClass: 'bg-purple-600 hover:bg-purple-500',
      ctaLabel: '⚡ Karma Tree',
      onCta: () => setActiveModal('sim', 'perks'),
      secondaryCta: {
        label: '🐟 Bluefin MLS',
        btnClass: 'bg-[#0284C7] hover:bg-[#0369A1]',
        onClick: () => setActiveModal('phone', 'bluefin'),
      },
      details: [
        { label: 'Smart Next (A)', value: '1-tap auto-fixes any need <45% or queues your best skill/startup action.' },
        { label: 'Karma Perks', value: 'Unlock Diamond Hands (+20% RSU), 1.5× Dividends & Need Shields.' },
        { label: 'Zero Rent Burn', value: 'Buy a home deed on Bluefin MLS to permanently eliminate weekly rent.' },
      ],
    },
  ];

  const TABS: Array<{ id: 'goals' | 'tutorial' | 'playbook'; label: string; emoji: string }> = [
    { id: 'goals', label: 'Goals & F.I.R.E.', emoji: '🎯' },
    { id: 'tutorial', label: `Quests (${Math.min(goalIndex, GOALS.length)}/${GOALS.length})`, emoji: '🎓' },
    { id: 'playbook', label: 'How to Play', emoji: '📖' },
  ];

  const allPlaybookExpanded = PLAYBOOK_CARDS.every((c) => expandedPlaybookIds[c.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-md sm:items-center"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="apple-glass-heavy flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Apple Sheet Header */}
        <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="grid size-11 shrink-0 place-items-center rounded-2xl text-2xl text-white shadow-sm"
              style={{ backgroundColor: activeEval.aspDef.accent }}
            >
              {activeEval.aspDef.emoji}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold tracking-wider text-[#007AFF] uppercase">
                  North Star Goal
                </span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                  ⚡ {karma}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(netWorth)}
                </span>
              </div>
              <h2 className="text-base font-extrabold tracking-tight sm:text-lg">
                {activeEval.aspDef.label}{' '}
                <span className="font-mono text-sm text-[#007AFF]">({activeEval.overallPct}%)</span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="btn-press grid size-8 shrink-0 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Apple Segmented Control */}
        <div className="my-2.5 grid grid-cols-3 gap-1 rounded-2xl bg-[var(--mist)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveModal('guide', t.id)}
              className={`btn-press flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-extrabold transition-all ${
                guideTab === t.id
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <span>{t.emoji}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-3.5 overflow-y-auto pr-0.5">
          {/* =====================================================================
              TAB 1: NORTH STAR GOALS, F.I.R.E. & GOLDEN HANDCUFFS
             ===================================================================== */}
          {guideTab === 'goals' && (
            <div className="space-y-3.5">
              {/* Compact Golden Handcuffs & F.I.R.E. Status Card */}
              <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-emerald-500/8 to-[#007AFF]/10 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 uppercase dark:text-amber-300">
                      {job
                        ? `🔒 ${careerDef ? `${careerDef.company} ${levelDef?.code || ''}`.trim() : 'W-2'} Handcuffs`
                        : '🔓 Sovereign · W-2 Free'}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                      🔥 {cf.passiveCoveragePct}% Burn Covered
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveModal('phone', 'wealth')}
                      className="btn-press rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-2xs"
                    >
                      💎 Schwaab
                    </button>
                    {job ? (
                      <button
                        onClick={resignJob}
                        title={
                          unvestedRsu > 0 && !hasParachute
                            ? `Forfeits ${formatCurrency(unvestedRsu)} unvested RSUs`
                            : 'Leave corporate W-2'
                        }
                        className="btn-press inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-2xs"
                      >
                        <LockOpen className="size-3" />
                        <span>Quit W-2</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveModal('phone', 'levels')}
                        className="btn-press rounded-xl bg-[#007AFF] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-2xs"
                      >
                        💼 Jobs
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Scannable Metric Pills */}
                <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
                  <div className="rounded-2xl bg-white/65 p-2 dark:bg-black/25">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">Invested</div>
                    <div className="mt-0.5 font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(portfolioValue + vestedRsu)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/65 p-2 dark:bg-black/25">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">Unvested</div>
                    <div className="mt-0.5 font-mono text-xs font-black text-purple-600 dark:text-purple-400">
                      {formatCurrency(unvestedRsu)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/65 p-2 dark:bg-black/25">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">Passive/wk</div>
                    <div className="mt-0.5 font-mono text-xs font-black text-[#007AFF]">
                      +{formatCurrency(nonSalaryWeekly)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/65 p-2 dark:bg-black/25">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                      {homeDef.shortName || 'Burn'}/wk
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-black text-rose-500">
                      {cf.isHomeOwned ? '$0' : `-${formatCurrency(cf.weeklyTotalOutflow)}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active 4-Stage Milestone Roadmap */}
              <div className="rounded-3xl bg-[var(--mist)] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#007AFF]">
                      🏆 {activeEval.stages.length} Milestones
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(totalMilestoneCash)} · +{totalMilestoneKarma}⚡ Total
                    </span>
                  </div>

                  <button
                    onClick={() => setShowStrategyTip((v) => !v)}
                    className="btn-press inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold text-[var(--ink-soft)] hover:text-[var(--ink)] dark:bg-white/10"
                  >
                    <HelpCircle className="size-3 text-[#007AFF]" />
                    <span>{showStrategyTip ? 'Hide Tip' : 'Strategy Tip'}</span>
                  </button>
                </div>

                {showStrategyTip && (
                  <div className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-[11px] font-medium text-[var(--ink-soft)] dark:bg-black/30">
                    💡 {activeEval.aspDef.playbookTip}
                  </div>
                )}

                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeEval.stages.map((item) => {
                    const isCurrent = activeEval.activeStage.stage.id === item.stage.id && !item.met;
                    return (
                      <div
                        key={item.stage.id}
                        className={`flex flex-col justify-between rounded-2xl border p-3 transition-all ${
                          item.met
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : isCurrent
                              ? 'border-[#007AFF] bg-white/90 ring-2 ring-[#007AFF]/20 dark:bg-slate-900/85'
                              : 'border-black/5 bg-white/60 dark:border-white/10 dark:bg-black/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-base">{item.stage.emoji}</span>
                              <span className="truncate text-xs font-extrabold">
                                {item.stage.stageNumber}. {item.stage.title}
                              </span>
                            </div>
                            {item.met ? (
                              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                            ) : isCurrent ? (
                              <span className="shrink-0 rounded-full bg-[#007AFF] px-2 py-0.5 text-[9px] font-extrabold text-white">
                                Active
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="truncate text-[var(--ink-soft)]">{item.progressText}</span>
                              <span className="font-mono font-extrabold text-[#007AFF]">{item.pct}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  item.met ? 'bg-emerald-500' : 'bg-[#007AFF]'
                                }`}
                                style={{ width: `${item.pct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-black/5 pt-2 dark:border-white/10">
                          <div className="flex items-center gap-1">
                            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(item.stage.rewardCash)}
                            </span>
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                              +{item.stage.rewardKarma}⚡
                            </span>
                          </div>

                          <button
                            onClick={() => handleActionTrigger(item.stage.actionType)}
                            className={`btn-press inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-extrabold ${
                              item.met
                                ? 'bg-black/5 text-[var(--ink-soft)] dark:bg-white/10'
                                : 'bg-[#007AFF] text-white shadow-2xs'
                            }`}
                          >
                            <span>{item.stage.actionLabel}</span>
                            <ArrowRight className="size-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Switch North Star Goal (Compact Bento Grid) */}
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                    Switch North Star Goal (Progress Saved)
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ASPIRATIONS.map((asp) => {
                    const isSelected = sim.aspiration === asp.id;
                    const previewEval = evaluateAspirationProgress(state, asp.id);
                    const completedCount = previewEval.stages.filter((s) => s.met).length;

                    return (
                      <button
                        key={asp.id}
                        onClick={() => selectAspiration(asp.id)}
                        className={`btn-press flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-[#007AFF] bg-[#007AFF]/12 ring-1 ring-[#007AFF]/30'
                            : 'border-black/5 bg-[var(--mist)] hover:border-[#007AFF]/40 dark:border-white/10'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/75 text-xl shadow-2xs dark:bg-white/10">
                            {asp.emoji}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-extrabold">{asp.label}</span>
                              <span
                                className="shrink-0 rounded-full px-1.5 py-0.2 text-[9px] font-extrabold text-white"
                                style={{ backgroundColor: asp.accent }}
                              >
                                {completedCount}/4
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-[10.5px] text-[var(--ink-soft)]">
                              {asp.desc}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#007AFF] px-2 py-1 text-[10px] font-extrabold text-white">
                              <Check className="size-3" /> Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-extrabold text-[#007AFF] dark:bg-white/10">
                              Select
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 2: STARTER QUESTS & ROTATING BOUNTIES (CONCISE & EXPANDABLE)
             ===================================================================== */}
          {guideTab === 'tutorial' && (
            <div className="space-y-3.5">
              <div className="rounded-3xl bg-[var(--mist)] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#007AFF]">
                      🎓 Starter Walkthrough ({Math.min(goalIndex, GOALS.length)}/{GOALS.length})
                    </h3>
                  </div>
                  {goalIndex < GOALS.length && (
                    <button
                      onClick={skipTutorial}
                      className="btn-press rounded-full bg-black/10 px-2.5 py-1 text-[10px] font-bold text-[var(--ink-soft)] hover:text-[var(--ink)] dark:bg-white/10"
                    >
                      Skip Tutorial
                    </button>
                  )}
                </div>

                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {GOALS.map((g, idx) => {
                    const isDone = idx < goalIndex;
                    const isCurrent = idx === goalIndex;
                    const showHint = isCurrent || Boolean(expandedStepHint[idx]);

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col justify-between rounded-2xl border p-3 transition-all ${
                          isDone
                            ? 'border-emerald-500/35 bg-emerald-500/10 opacity-85'
                            : isCurrent
                              ? 'border-[#007AFF] bg-white/90 shadow-xs ring-2 ring-[#007AFF]/20 dark:bg-slate-900/90'
                              : 'border-black/5 bg-white/60 dark:border-white/10 dark:bg-black/25'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-lg">{g.emoji}</span>
                              <span className="truncate text-xs font-extrabold">
                                {idx + 1}. {g.title}
                              </span>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              {!isCurrent && (
                                <button
                                  onClick={() => toggleStepHint(idx)}
                                  className="rounded-full bg-black/5 px-2 py-0.5 text-[9.5px] font-bold text-[var(--ink-soft)] hover:text-[var(--ink)] dark:bg-white/10"
                                >
                                  {showHint ? 'Hide' : 'How?'}
                                </button>
                              )}
                              {isDone ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : isCurrent ? (
                                <span className="rounded-full bg-[#007AFF] px-2 py-0.5 text-[9px] font-extrabold text-white">
                                  Next
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {showHint && (
                            <p className="mt-1.5 rounded-xl bg-black/5 px-2.5 py-1.5 text-[10.5px] leading-snug text-[var(--ink-soft)] dark:bg-white/5">
                              💡 {g.howTo}
                            </p>
                          )}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-black/5 pt-2 dark:border-white/10">
                          <div className="flex items-center gap-1">
                            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(g.rewardCash)}
                            </span>
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                              +{g.rewardKarma}⚡
                            </span>
                          </div>

                          <button
                            onClick={() => handleActionTrigger(g.actionType)}
                            className={`btn-press inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-extrabold ${
                              isCurrent
                                ? 'bg-[#007AFF] text-white shadow-2xs'
                                : 'bg-black/5 text-[var(--ink)] dark:bg-white/10'
                            }`}
                          >
                            <span>{g.actionLabel}</span>
                            <ArrowRight className="size-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rotating OKR Bounties */}
              <div className="rounded-3xl bg-[var(--mist)] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                    ⚡ Active OKR Bounties
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--ink-soft)]">
                    Auto-refreshes on completion
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {wishes.map((w) => {
                    const pct = Math.min(
                      100,
                      Math.round((w.progress / Math.max(1, w.targetValue)) * 100)
                    );
                    const wishAction: AspirationActionType =
                      w.kind === 'visit'
                        ? 'map'
                        : w.kind === 'social'
                          ? 'social'
                          : w.kind === 'startup'
                            ? 'startup'
                            : 'skills';

                    return (
                      <div
                        key={w.id}
                        className="flex flex-col justify-between rounded-2xl border border-black/5 bg-white/75 p-3 dark:border-white/10 dark:bg-black/25"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-lg">{w.emoji}</span>
                            <div className="flex items-center gap-1">
                              {w.cashReward && (
                                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                  +{formatCurrency(w.cashReward)}
                                </span>
                              )}
                              <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9.5px] font-extrabold text-amber-600 dark:text-amber-400">
                                +{w.karmaReward}⚡
                              </span>
                            </div>
                          </div>
                          <div className="mt-1 text-xs font-extrabold">{w.title}</div>
                        </div>

                        <div className="mt-2.5 space-y-2">
                          <div>
                            <div className="flex justify-between text-[9.5px] font-bold text-[var(--ink-soft)]">
                              <span>{w.desc}</span>
                              <span className="font-mono">
                                {Math.round(w.progress)}/{w.targetValue}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                              <div
                                className="h-full rounded-full bg-amber-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => handleActionTrigger(wishAction)}
                            className="btn-press flex w-full items-center justify-center gap-1 rounded-xl bg-[#007AFF]/12 py-1 text-[10px] font-extrabold text-[#007AFF] hover:bg-[#007AFF]/20"
                          >
                            <span>Go</span>
                            <ArrowRight className="size-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 3: APPLE-STYLE VISUAL PLAYBOOK (PROGRESSIVE DISCLOSURE)
             ===================================================================== */}
          {guideTab === 'playbook' && (
            <div className="space-y-3">
              {/* Top Keyboard Shortcut & Expand All Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--mist)] px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold text-[var(--ink-soft)]">
                  {[
                    { k: 'A', l: 'Smart Next' },
                    { k: 'W', l: 'Work' },
                    { k: 'P', l: 'Phone' },
                    { k: 'M', l: 'Map' },
                    { k: 'I', l: 'Sim' },
                    { k: 'Space', l: 'Pause' },
                  ].map((s) => (
                    <span
                      key={s.k}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-extrabold text-[var(--ink)] shadow-2xs dark:bg-black/35"
                    >
                      <kbd className="font-mono text-[#007AFF]">{s.k}</kbd>
                      <span>{s.l}</span>
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const nextVal = !allPlaybookExpanded;
                    const map: Record<string, boolean> = {};
                    PLAYBOOK_CARDS.forEach((c) => {
                      map[c.id] = nextVal;
                    });
                    setExpandedPlaybookIds(map);
                  }}
                  className="btn-press inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-extrabold text-[#007AFF] dark:bg-white/10"
                >
                  <span>{allPlaybookExpanded ? 'Collapse All' : 'Expand All Details'}</span>
                  {allPlaybookExpanded ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>
              </div>

              {/* 4 Scannable Bento Cards with Collapsible Details */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PLAYBOOK_CARDS.map((card) => {
                  const isOpen = Boolean(expandedPlaybookIds[card.id]);
                  return (
                    <div
                      key={card.id}
                      className="flex flex-col justify-between rounded-3xl border border-black/5 bg-[var(--mist)] p-3.5 transition-all dark:border-white/10"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`grid size-10 shrink-0 place-items-center rounded-2xl text-xl ${card.accentBg}`}
                            >
                              {card.emoji}
                            </span>
                            <div>
                              <span
                                className={`text-[9.5px] font-extrabold uppercase tracking-wider ${card.accentText}`}
                              >
                                {card.tag}
                              </span>
                              <h4 className="text-sm font-extrabold leading-tight">{card.title}</h4>
                            </div>
                          </div>

                          {/* Disclosure Toggle Pill */}
                          <button
                            onClick={() => togglePlaybookCard(card.id)}
                            className="btn-press inline-flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-extrabold text-[var(--ink-soft)] shadow-2xs hover:text-[var(--ink)] dark:bg-black/35"
                          >
                            <span>{isOpen ? 'Less' : 'Details'}</span>
                            {isOpen ? (
                              <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </button>
                        </div>

                        {/* One-Line Summary */}
                        <p className="mt-2 text-[11px] font-medium text-[var(--ink-soft)]">
                          {card.summary}
                        </p>

                        {/* Visual Step Pill Chain */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1">
                          {card.flowSteps.map((step, i) => (
                            <React.Fragment key={step}>
                              <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-extrabold text-[var(--ink)] dark:bg-black/35">
                                {step}
                              </span>
                              {i < card.flowSteps.length - 1 && (
                                <span className="text-[10px] font-bold text-[var(--ink-soft)]">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Progressive Disclosure Drawer (Hidden by Default) */}
                        {isOpen && (
                          <div className="mt-2.5 space-y-1.5 rounded-2xl bg-white/75 p-2.5 text-[11px] dark:bg-black/30">
                            {card.details.map((d) => (
                              <div
                                key={d.label}
                                className="flex items-baseline justify-between gap-2 border-b border-black/5 pb-1 last:border-b-0 last:pb-0 dark:border-white/5"
                              >
                                <span className="shrink-0 font-extrabold text-[var(--ink)]">
                                  {d.label}
                                </span>
                                <span className="text-right text-[10.5px] text-[var(--ink-soft)]">
                                  {d.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom 1-Tap Action Buttons */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={card.onCta}
                          className={`btn-press flex flex-1 items-center justify-center gap-1 rounded-2xl py-2 text-xs font-extrabold text-white shadow-2xs ${card.btnClass}`}
                        >
                          <span>{card.ctaLabel}</span>
                          <ArrowRight className="size-3" />
                        </button>
                        {card.secondaryCta && (
                          <button
                            onClick={card.secondaryCta.onClick}
                            className={`btn-press flex flex-1 items-center justify-center gap-1 rounded-2xl py-2 text-xs font-extrabold text-white shadow-2xs ${card.secondaryCta.btnClass}`}
                          >
                            <span>{card.secondaryCta.label}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Creator Spotlight & Personal Site Card */}
              <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-3xl border border-[#007AFF]/25 bg-gradient-to-r from-[#007AFF]/10 via-[#38BDF8]/10 to-transparent p-4 transition-all">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#007AFF] text-white shadow-sm">
                    <Globe className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#007AFF]">
                        Creator Spotlight
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-[var(--ink)]">
                      Crafted by Annie
                    </h4>
                    <p className="text-[11px] text-[var(--ink-soft)]">
                      Software engineer · heavy AI adopter · hobby vibe-coder building games & side projects
                    </p>
                  </div>
                </div>

                <a
                  href="https://gengannie.github.io/personal_site/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-pill btn-press inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#007AFF] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#0066CC]"
                >
                  <span>Visit Personal Site</span>
                  <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
