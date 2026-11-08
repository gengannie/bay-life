import React from 'react';
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
import { AspirationActionType, AspirationId } from '../types/game';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Compass,
  Flame,
  LockOpen,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
  ArrowRight,
} from 'lucide-react';

export const GoalsGuideModal: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const guideTab = useGameStore((s) => s.guideTab) || 'goals';
  const goalIndex = useGameStore((s) => s.goalIndex);
  const wishes = useGameStore((s) => s.wishes);
  const job = useGameStore((s) => s.job);
  const cash = useGameStore((s) => s.cash);
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

  const TABS: Array<{ id: 'goals' | 'tutorial' | 'playbook'; label: string; emoji: string }> = [
    { id: 'goals', label: 'Life Goals & F.I.R.E.', emoji: '🎯' },
    { id: 'tutorial', label: `Starter Quests (${Math.min(goalIndex, GOALS.length)}/${GOALS.length})`, emoji: '🎓' },
    { id: 'playbook', label: 'How to Play Guide', emoji: '📖' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-md sm:items-center"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="apple-glass-heavy flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[34px] p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3.5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl text-white shadow-md"
              style={{ backgroundColor: activeEval.aspDef.accent }}
            >
              {activeEval.aspDef.emoji}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider text-[#007AFF] uppercase">
                  Bay Life Goals, Incentives & Playbook
                </span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                  ⚡ {karma} Karma
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  NW {formatCurrency(netWorth)}
                </span>
              </div>
              <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">
                Active Goal: {activeEval.aspDef.label} ({activeEval.overallPct}%)
              </h2>
            </div>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="btn-press grid size-8 shrink-0 place-items-center rounded-full bg-[var(--mist)]"
            aria-label="Close Goals & Guide"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="my-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-[var(--mist)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveModal('guide', t.id)}
              className={`btn-press flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition-all ${
                guideTab === t.id
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <span>{t.emoji}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {/* =====================================================================
              TAB 1: SELECTABLE NORTH STAR GOALS, F.I.R.E. & GOLDEN HANDCUFFS
             ===================================================================== */}
          {guideTab === 'goals' && (
            <div className="space-y-4">
              {/* Golden Handcuffs & F.I.R.E. Freedom Dashboard Strip */}
              <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/12 via-emerald-500/10 to-[#007AFF]/10 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 uppercase dark:text-amber-300">
                        {job ? '🔒 Golden Handcuffs Active' : '🔓 Golden Handcuffs Broken · W-2 Free'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                        🔥 {cf.passiveCoveragePct}% Passive Burn Coverage
                      </span>
                    </div>
                    <h3 className="text-sm font-black">
                      {job
                        ? `${careerDef?.company} ${levelDef?.code} · ${formatCurrency(unvestedRsu)} Unvested RSU Locked`
                        : 'Independent Founder / F.I.R.E. Sovereign (Zero RTO Mandates)'}
                    </h3>
                    <p className="text-[11px] font-medium text-[var(--ink-soft)]">
                      {job
                        ? `Passive Income: ${formatCurrency(cf.weeklyPassiveIncome)}/wk (Indie+Div: ${formatCurrency(nonSalaryWeekly)}/wk) vs. Living Burn: ${formatCurrency(cf.weeklyTotalOutflow)}/wk (${homeDef.shortName || homeDef.name}).`
                        : `Living on ${formatCurrency(nonSalaryWeekly)}/wk from Startup Stripe MRR & Schwaab Dividends vs. ${formatCurrency(cf.weeklyTotalOutflow)}/wk burn.`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveModal('phone', 'wealth')}
                      className="btn-press rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-500"
                    >
                      💎 Schwaab Wealth
                    </button>
                    {job ? (
                      <button
                        onClick={resignJob}
                        title={
                          unvestedRsu > 0 && !hasParachute
                            ? `Resigning forfeits ${formatCurrency(unvestedRsu)} unvested RSUs unless vested first!`
                            : 'Leave corporate W-2 and go 100% independent!'
                        }
                        className="btn-press flex items-center gap-1.5 rounded-2xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-amber-600"
                      >
                        <LockOpen className="size-3.5" />
                        <span>Break Handcuffs (Quit W-2)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveModal('phone', 'levels')}
                        className="btn-press rounded-2xl bg-[#007AFF] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs"
                      >
                        💼 Browse Jobs
                      </button>
                    )}
                  </div>
                </div>

                {/* 4-Pillar Mini Metrics */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-2xl bg-white/65 p-2.5 dark:bg-black/25">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                      Invested ETFs + Vested
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(portfolioValue + vestedRsu)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/65 p-2.5 dark:bg-black/25">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                      Unvested RSU Handcuffs
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-black text-purple-600 dark:text-purple-400">
                      {formatCurrency(unvestedRsu)}{' '}
                      <span className="text-[9px] font-semibold text-[var(--ink-soft)]">
                        (+{formatCurrency(cf.dailyRsuVest)}/d)
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/65 p-2.5 dark:bg-black/25">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                      Indie MRR + Dividends
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-black text-[#007AFF]">
                      {formatCurrency(nonSalaryWeekly)}/wk
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/65 p-2.5 dark:bg-black/25">
                    <div className="text-[9px] font-bold uppercase text-[var(--ink-soft)]">
                      Weekly Rent + Commute
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-black text-rose-500">
                      {cf.isHomeOwned ? '$0/wk (Owned!)' : `-${formatCurrency(cf.weeklyTotalOutflow)}/wk`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Goal 4-Stage Milestone Roadmap */}
              <div className="rounded-3xl border border-[#007AFF]/25 bg-[var(--mist)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black uppercase tracking-wider text-[#007AFF]">
                        🏆 4-Stage Milestone Roadmap & Incentives
                      </span>
                      <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                        +$73,500 & +60 ⚡ Total Goal Rewards
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-[var(--ink-soft)]">
                      💡 <span className="font-bold text-[var(--ink)]">Strategy Tip:</span>{' '}
                      {activeEval.aspDef.playbookTip}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {activeEval.stages.map((item) => {
                    const isCurrent = activeEval.activeStage.stage.id === item.stage.id && !item.met;
                    return (
                      <div
                        key={item.stage.id}
                        className={`flex flex-col justify-between rounded-2xl border p-3.5 transition-all ${
                          item.met
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : isCurrent
                              ? 'border-[#007AFF] bg-white/85 ring-2 ring-[#007AFF]/20 dark:bg-slate-900/80'
                              : 'border-black/5 bg-white/55 dark:border-white/10 dark:bg-black/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-lg bg-black/5 px-2 py-0.5 font-mono text-[10px] font-extrabold dark:bg-white/10">
                              Stage {item.stage.stageNumber}/4
                            </span>
                            {item.met ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3" /> Reward Claimed
                              </span>
                            ) : isCurrent ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#007AFF] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                                ⚡ Active Target
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                                Milestone {item.stage.stageNumber}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-start gap-2.5">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-black/5 text-lg dark:bg-white/10">
                              {item.stage.emoji}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-extrabold leading-snug">
                                {item.stage.title}
                              </div>
                              <p className="mt-0.5 text-[11px] leading-snug text-[var(--ink-soft)]">
                                {item.stage.desc}
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-2.5">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-[var(--ink-soft)]">{item.progressText}</span>
                              <span className="font-mono font-extrabold text-[#007AFF]">
                                {item.pct}%
                              </span>
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

                        {/* Bottom Incentive Pills + 1-Tap Action Button */}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-2.5 dark:border-white/10">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(item.stage.rewardCash)}
                            </span>
                            <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                              +{item.stage.rewardKarma} ⚡
                            </span>
                          </div>

                          <button
                            onClick={() => handleActionTrigger(item.stage.actionType)}
                            className={`btn-press inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10.5px] font-extrabold ${
                              item.met
                                ? 'bg-black/5 text-[var(--ink-soft)] hover:text-[var(--ink)] dark:bg-white/10'
                                : 'bg-[#007AFF] text-white shadow-xs hover:bg-[#0066CC]'
                            }`}
                          >
                            <span>{item.stage.actionLabel}</span>
                            <ArrowRight className="size-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Select / Switch Your North Star Goal Anytime (All 7 Goals) */}
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                      Switch or Select Your North Star Goal (7 Paths Available)
                    </h3>
                    <p className="text-[11px] text-[var(--ink-soft)]">
                      Switch your active goal anytime — completed stage bonuses carry over and never reset!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {ASPIRATIONS.map((asp) => {
                    const isSelected = sim.aspiration === asp.id;
                    const previewEval = evaluateAspirationProgress(state, asp.id);
                    const completedCount = previewEval.stages.filter((s) => s.met).length;

                    return (
                      <button
                        key={asp.id}
                        onClick={() => selectAspiration(asp.id)}
                        className={`btn-press flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                          isSelected
                            ? 'border-[#007AFF] bg-[#007AFF]/12 shadow-sm ring-1 ring-[#007AFF]/30'
                            : 'border-black/5 bg-[var(--mist)] hover:border-[#007AFF]/40 dark:border-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white"
                              style={{ backgroundColor: asp.accent }}
                            >
                              {asp.badge}
                            </span>
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#007AFF] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                                <Check className="size-3" /> Active Goal
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold text-[#007AFF]">
                                Select Goal →
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center gap-2.5">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/70 text-xl dark:bg-white/10">
                              {asp.emoji}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-extrabold leading-snug">{asp.label}</div>
                              <p className="mt-0.5 text-[11px] leading-snug text-[var(--ink-soft)]">
                                {asp.desc}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-2 dark:border-white/10">
                          <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                            Stages: {completedCount}/4 Completed ({previewEval.overallPct}%)
                          </span>
                          <span className="font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            Up to +$73.5k & +60 ⚡
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 2: INTERACTIVE STARTER TUTORIAL & SHORT-TERM OKR BOUNTIES
             ===================================================================== */}
          {guideTab === 'tutorial' && (
            <div className="space-y-4">
              {/* Starter Onboarding Questline Banner */}
              <div className="rounded-3xl border border-[#007AFF]/25 bg-gradient-to-r from-[#007AFF]/12 via-indigo-500/10 to-emerald-500/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#007AFF]">
                      🎓 Interactive Starter Walkthrough
                    </div>
                    <h3 className="text-base font-extrabold">
                      Silicon Valley Onboarding Questline ({Math.min(goalIndex, GOALS.length)}/{GOALS.length} Completed)
                    </h3>
                    <p className="text-xs text-[var(--ink-soft)]">
                      Complete each step in order (or use the 1-tap action buttons) to learn the ropes and earn instant seed cash & Karma!
                    </p>
                  </div>
                  {goalIndex < GOALS.length && (
                    <button
                      onClick={skipTutorial}
                      className="btn-press rounded-full bg-black/10 px-3 py-1.5 text-[11px] font-bold text-[var(--ink-soft)] hover:text-[var(--ink)] dark:bg-white/10"
                    >
                      Skip Tutorial
                    </button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {GOALS.map((g, idx) => {
                    const isDone = idx < goalIndex;
                    const isCurrent = idx === goalIndex;
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col justify-between rounded-2xl border p-3 transition-all ${
                          isDone
                            ? 'border-emerald-500/35 bg-emerald-500/10 opacity-85'
                            : isCurrent
                              ? 'border-[#007AFF] bg-white/90 shadow-sm ring-2 ring-[#007AFF]/25 dark:bg-slate-900/90'
                              : 'border-black/5 bg-white/55 dark:border-white/10 dark:bg-black/25'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-md bg-black/5 px-2 py-0.5 font-mono text-[10px] font-extrabold dark:bg-white/10">
                              Step {idx + 1} of {GOALS.length}
                            </span>
                            {isDone ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                ✓ Done
                              </span>
                            ) : isCurrent ? (
                              <span className="rounded-full bg-[#007AFF] px-2 py-0.5 text-[10px] font-extrabold text-white">
                                ⚡ Up Next
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-[var(--ink-soft)]">
                                Queued
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-start gap-2.5">
                            <span className="text-2xl">{g.emoji}</span>
                            <div>
                              <div className="text-xs font-extrabold">{g.title}</div>
                              <p className="mt-0.5 text-[11px] leading-snug text-[var(--ink-soft)]">
                                {g.desc}
                              </p>
                              <p className="mt-1 text-[10px] font-semibold text-[#007AFF]">
                                💡 {g.howTo}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-2 dark:border-white/10">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(g.rewardCash)}
                            </span>
                            <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                              +{g.rewardKarma} ⚡
                            </span>
                          </div>

                          <button
                            onClick={() => handleActionTrigger(g.actionType)}
                            className={`btn-press inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10.5px] font-extrabold ${
                              isCurrent
                                ? 'bg-[#007AFF] text-white shadow-xs'
                                : 'bg-black/5 text-[var(--ink)] dark:bg-white/10'
                            }`}
                          >
                            <span>{g.actionLabel}</span>
                            <ArrowRight className="size-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rotating Short-Term OKR Bounties (Wishes) */}
              <div className="rounded-3xl bg-[var(--mist)] p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                      ⚡ Live Short-Term OKR Bounties (Auto-Refreshing Incentives)
                    </h3>
                    <p className="text-[11px] text-[var(--ink-soft)]">
                      Completing any OKR below immediately awards Karma + Cash and spawns a new bounty!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
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
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-2xl">{w.emoji}</span>
                            <div className="flex items-center gap-1">
                              {w.cashReward && (
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                  +{formatCurrency(w.cashReward)}
                                </span>
                              )}
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                +{w.karmaReward} ⚡
                              </span>
                            </div>
                          </div>
                          <div className="mt-1.5 text-xs font-extrabold">{w.title}</div>
                          <p className="mt-0.5 text-[10.5px] text-[var(--ink-soft)]">{w.desc}</p>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div>
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>Progress</span>
                              <span className="font-mono">
                                {Math.round(w.progress)}/{w.targetValue} ({pct}%)
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
                            className="btn-press flex w-full items-center justify-center gap-1 rounded-xl bg-[#007AFF]/12 py-1.5 text-[10.5px] font-extrabold text-[#007AFF] hover:bg-[#007AFF]/20"
                          >
                            <span>Jump to Action</span>
                            <ArrowRight className="size-3" />
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
              TAB 3: HOW TO PLAY / BAY AREA SURVIVAL & WEALTH PLAYBOOK
             ===================================================================== */}
          {guideTab === 'playbook' && (
            <div className="space-y-3.5">
              <div className="rounded-3xl border border-[#007AFF]/25 bg-gradient-to-r from-[#007AFF]/12 to-emerald-500/12 p-4">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#007AFF] uppercase">
                  <BookOpen className="size-4" />
                  <span>Bay Life · Player Guide & Core Loops</span>
                </div>
                <h3 className="mt-1 text-base font-extrabold">
                  How to Thrive, Build Wealth, and Own Your Time in Silicon Valley
                </h3>
                <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                  Whether you want to climb to L8 Principal, bootstrap a $1B AI Unicorn, or hit F.I.R.E. and quit your corporate job, here is how every system works together:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Card 1: Golden Handcuffs & F.I.R.E. */}
                <div className="flex flex-col justify-between rounded-3xl bg-[var(--mist)] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-lg">
                        🔥
                      </span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
                          Wealth & Independence
                        </span>
                        <h4 className="text-sm font-extrabold">
                          The Golden Handcuffs & F.I.R.E.
                        </h4>
                      </div>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-[var(--ink-soft)]">
                      <li>
                        • <strong className="text-[var(--ink)]">Unvested RSUs:</strong> Every W-2 shift grants Unvested RSUs. While employed, <strong>12%–16% vests daily</strong> into Vested RSUs.
                      </li>
                      <li>
                        • <strong className="text-[var(--ink)]">Schwaab Compounding:</strong> Liquidate vested RSUs in <em>BayOS → Schwaab Wealth</em> and buy ETFs (QQQX, NVDAX, SGOV) to earn daily dividends & price appreciation.
                      </li>
                      <li>
                        • <strong className="text-[var(--ink)]">Breaking Free:</strong> Once your Startup MRR + Dividends cover your weekly rent burn (100%+ F.I.R.E. coverage), you can <strong>Resign your W-2</strong> and live free of RTO mandates!
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setActiveModal('phone', 'wealth')}
                    className="btn-press mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2 text-xs font-extrabold text-white"
                  >
                    <span>Open Schwaab Private Wealth</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>

                {/* Card 2: Corporate Ladder & Hybrid RTO */}
                <div className="flex flex-col justify-between rounded-3xl bg-[var(--mist)] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 place-items-center rounded-xl bg-[#007AFF]/15 text-lg">
                        💼
                      </span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#007AFF]">
                          Big Tech W-2 Loop
                        </span>
                        <h4 className="text-sm font-extrabold">
                          Shifts, Live Sprints & Promotions
                        </h4>
                      </div>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-[var(--ink-soft)]">
                      <li>
                        • <strong className="text-[var(--ink)]">Hybrid RTO Policy:</strong> Log <strong>3 Office Days/week</strong> at your company campus for a +$500 Monday stipend and +20% faster promo calibration (plus 2 WFH days).
                      </li>
                      <li>
                        • <strong className="text-[var(--ink)]">Live Code Sprints:</strong> During a work shift, tap the pop-up bug/PR targets in the top-right card for instant cash & promo boosts!
                      </li>
                      <li>
                        • <strong className="text-[var(--ink)]">Multi-Gate Promos:</strong> Ship R&D Charter Deliverables in <em>Career Hub (W)</em> and unlock required Skill Tree nodes to get promoted up to L8 Principal.
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setActiveModal('career')}
                    className="btn-press mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#007AFF] py-2 text-xs font-extrabold text-white"
                  >
                    <span>Open Work & Career Hub (W)</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>

                {/* Card 3: YC AI Startup & Venture Capital */}
                <div className="flex flex-col justify-between rounded-3xl bg-[var(--mist)] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 place-items-center rounded-xl bg-orange-500/15 text-lg">
                        🦄
                      </span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-orange-600 dark:text-orange-400">
                          Founder Equity Loop
                        </span>
                        <h4 className="text-sm font-extrabold">
                          AI Startup Studio & Stripe MRR
                        </h4>
                      </div>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-[var(--ink-soft)]">
                      <li>
                        • <strong className="text-[var(--ink)]">Build Your MVP:</strong> Use your apartment desk, Home PC IDE (<em>Shortcut: C</em>), or SoMa YC Loft to push MVP Readiness to 50%+.
                      </li>
                      <li>
                        • <strong className="text-[var(--ink)]">ProductHunt & VCs:</strong> Open <em>BayOS → Startup Studio</em> to drop a ProductHunt launch and pitch Sand Hill VCs to advance from Prototype → YC Batch → Seed → Series A Unicorn.
                      </li>
                      <li>
                        • <strong className="text-[var(--ink)]">Daily Stripe Payouts:</strong> Every stage multiplies your recurring Stripe MRR, paid into your cash balance every single morning!
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setActiveModal('phone', 'startup')}
                    className="btn-press mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-orange-500 py-2 text-xs font-extrabold text-white"
                  >
                    <span>Open YC Startup Studio</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>

                {/* Card 4: Smart Next, Skills, Karma & Real Estate */}
                <div className="flex flex-col justify-between rounded-3xl bg-[var(--mist)] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 place-items-center rounded-xl bg-purple-500/15 text-lg">
                        🌳
                      </span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-purple-600 dark:text-purple-400">
                          Progression & Quality of Life
                        </span>
                        <h4 className="text-sm font-extrabold">
                          Smart Next (A), Karma Perks & Homes
                        </h4>
                      </div>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-[var(--ink-soft)]">
                      <li>
                        • <strong className="text-[var(--ink)]">✨ Smart Next (Shortcut: A):</strong> One tap automatically fixes any low need (&lt;45%) or queues your highest-value coding/AI/startup action!
                      </li>
                      <li>
                        • <strong className="text-[var(--ink)]">⚡ Karma & Tech Trees:</strong> Spend Karma in <em>Sim Inspector (I) → Tree</em> on permanent perks (like <em>Diamond Hands +20% RSU</em> or <em>1.5x Dividends</em>).
                      </li>
                      <li>
                        • <strong className="text-[var(--ink)]">🏠 Bluefin MLS & EVs:</strong> Buy an EV (<em>G</em>) for $0 HOV commutes, and buy your home outright on Bluefin MLS to permanently eliminate weekly rent!
                      </li>
                    </ul>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setActiveModal('sim', 'perks')}
                      className="btn-press flex items-center justify-center gap-1 rounded-2xl bg-purple-600 py-2 text-xs font-extrabold text-white"
                    >
                      <span>⚡ Karma Tree</span>
                    </button>
                    <button
                      onClick={() => setActiveModal('phone', 'bluefin')}
                      className="btn-press flex items-center justify-center gap-1 rounded-2xl bg-[#0284C7] py-2 text-xs font-extrabold text-white"
                    >
                      <span>🐟 Bluefin Homes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
