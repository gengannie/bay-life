import React, { useState } from 'react';
import {
  ASPIRATIONS,
  LOCATION_BY_ID,
  MOODLETS,
  NEEDS_META,
  NPCS,
  REWARD_PERKS,
  REWARD_PERK_BRANCHES,
  REWARD_PERK_BY_ID,
  SKILL_TREE_BRANCHES,
  SKILL_TREE_NODES,
  SKILL_TREE_NODE_BY_ID,
  SKILLS_META,
  TRAITS,
} from '../data/worldData';
import {
  RELATIONSHIP_TIERS,
  getRelationshipTierInfo,
  NPC_INTERACTIONS,
  getAvailableTopicsForNpc,
  getNpcMilestones,
  NPC_GIFTS,
} from '../data/relationshipData';
import { RewardPerkBranchId } from '../types/game';
import {
  calculateOverallMood,
  evaluateAspirationProgress,
  formatCurrency,
  formatTime,
  useGameStore,
} from '../store/useGameStore';
import { Portrait } from './Portrait';
import { X, Check, Sparkles, Zap, Lock, ArrowDown, GitBranch } from 'lucide-react';

export const SimInspectorSheet: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const simTab = useGameStore((s) => s.simTab);
  const needs = useGameStore((s) => s.needs);
  const skills = useGameStore((s) => s.skills);
  const cash = useGameStore((s) => s.cash);
  const inventory = useGameStore((s) => s.inventory);
  const moodlets = useGameStore((s) => s.moodlets);
  const wishes = useGameStore((s) => s.wishes);
  const karma = useGameStore((s) => s.karma);
  const unlockedPerks = useGameStore((s) => s.unlockedPerks);
  const unlockedTechNodes = useGameStore((s) => s.unlockedTechNodes) ?? ['node_git_monorepo'];
  const relationships = useGameStore((s) => s.relationships);
  const freeWill = useGameStore((s) => s.freeWill);
  const toggleFreeWill = useGameStore((s) => s.toggleFreeWill);
  const claimPerk = useGameStore((s) => s.claimPerk);
  const unlockTechNode = useGameStore((s) => s.unlockTechNode);
  const trainTechNodeSkill = useGameStore((s) => s.trainTechNodeSkill);
  const interactWithNpc = useGameStore((s) => s.interactWithNpc);
  const answerNpcTopic = useGameStore((s) => s.answerNpcTopic);
  const giftNpc = useGameStore((s) => s.giftNpc);
  const claimRelationshipMilestone = useGameStore((s) => s.claimRelationshipMilestone);
  const inviteNpcHangout = useGameStore((s) => s.inviteNpcHangout);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const autoFixNeed = useGameStore((s) => s.autoFixNeed);

  const state = useGameStore.getState();
  const moodInfo = calculateOverallMood(state);
  const aspDef = ASPIRATIONS.find((a) => a.id === sim.aspiration);
  const [perkBranch, setPerkBranch] = useState<'all' | RewardPerkBranchId>('all');
  const [selectedRelNpcId, setSelectedRelNpcId] = useState<string>(NPCS[0]?.id || 'npc_maya');
  const [relSection, setRelSection] = useState<'all' | 'dialogue' | 'milestones' | 'gifts' | 'dms'>('all');

  const TABS: Array<{ id: typeof simTab; label: string; emoji: string }> = [
    { id: 'needs', label: 'Vitals', emoji: '❤️' },
    { id: 'skills', label: 'Skills', emoji: '🧠' },
    { id: 'wishes', label: 'OKRs', emoji: '🎯' },
    { id: 'perks', label: `Tree · ${karma}⚡`, emoji: '🌳' },
    { id: 'relationships', label: 'Circle', emoji: '🤝' },
  ];

  const handleFixAllNeeds = () => {
    const sorted = [...NEEDS_META].sort((a, b) => needs[a.key] - needs[b.key]);
    if (sorted[0]) {
      autoFixNeed(sorted[0].key);
      setActiveModal(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-md sm:items-center"
      onClick={() => setActiveModal(null)}
    >
      <div
        className={`apple-glass-heavy flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-[34px] p-5 transition-all ${
          simTab === 'perks' || simTab === 'relationships' ? 'max-w-3xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Engineer Header */}
        <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3.5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Portrait appearance={sim.appearance} size={52} ringColor={moodInfo.color} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">{sim.name}</h3>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: moodInfo.color }}
                >
                  {moodInfo.label} · {moodInfo.score}%
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[var(--ink-soft)]">
                <span className="rounded-full bg-[var(--mist)] px-2 py-0.5">
                  {aspDef?.emoji} {aspDef?.label}
                </span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-600 dark:text-amber-400">
                  ⚡ {karma} Karma
                </span>
                <button
                  onClick={() => setActiveModal('backpack')}
                  className="btn-press rounded-full bg-[#007AFF]/15 px-2.5 py-0.5 font-extrabold text-[#007AFF] hover:bg-[#007AFF]/25"
                >
                  🎒 Backpack
                </button>
                <button
                  onClick={() => setActiveModal('garage')}
                  className="btn-press rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-extrabold text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
                >
                  🚗 EV Garage
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="btn-press grid size-8 place-items-center rounded-full bg-[var(--mist)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Apple Segmented Control Tabs */}
        <div className="scrollbar-none my-3 grid grid-cols-5 gap-1 rounded-2xl bg-[var(--mist)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveModal('sim', t.id)}
              className={`btn-press flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition-all ${
                simTab === t.id
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
          {/* NEEDS & MOODLETS (Apple Fitness Ring Style) */}
          {simTab === 'needs' && (
            <div className="space-y-3.5">
              {/* Top Quick Action Bar */}
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#007AFF]/15 to-emerald-500/15 px-3.5 py-2.5 border border-[#007AFF]/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#007AFF]" />
                  <span className="text-xs font-bold">One-Tap Bio Optimization</span>
                </div>
                <button
                  onClick={handleFixAllNeeds}
                  className="btn-press inline-flex items-center gap-1 rounded-full bg-[#007AFF] px-3 py-1 text-[11px] font-bold text-white shadow-sm"
                >
                  <Zap className="size-3" /> Auto-Fix Lowest
                </button>
              </div>

              {/* 2-Column Apple Fitness Ring Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                {NEEDS_META.map((n) => {
                  const val = Math.round(needs[n.key]);
                  const isLow = val < 35;
                  const ringColor = isLow ? '#FF3B30' : n.color;
                  const radius = 18;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (val / 100) * circumference;

                  return (
                    <div
                      key={n.key}
                      className={`flex items-center justify-between gap-2 rounded-2xl bg-[var(--mist)] p-3 transition-all ${
                        isLow ? 'ring-1 ring-rose-500/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Circular SVG Activity Ring */}
                        <div className="relative grid size-11 shrink-0 place-items-center">
                          <svg className="size-11 -rotate-90" viewBox="0 0 44 44">
                            <circle
                              cx="22"
                              cy="22"
                              r={radius}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-black/10 dark:text-white/10"
                            />
                            <circle
                              cx="22"
                              cy="22"
                              r={radius}
                              fill="none"
                              stroke={ringColor}
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                            />
                          </svg>
                          <span className="absolute text-sm">{n.emoji}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-snug">{n.shortLabel}</div>
                          <div
                            className="text-xs font-extrabold"
                            style={{ color: ringColor }}
                          >
                            {val}%
                          </div>
                        </div>
                      </div>

                      {val < 88 && (
                        <button
                          onClick={() => {
                            autoFixNeed(n.key);
                            setActiveModal(null);
                          }}
                          className={`btn-press shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm ${
                            isLow ? 'bg-rose-500 animate-pulse' : 'bg-[#007AFF]'
                          }`}
                        >
                          ⚡ Fix
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Active Moodlet Pills */}
              {moodlets.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Active Buffs
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {moodlets.map((m) => {
                      const def = MOODLETS[m.id];
                      if (!def) return null;
                      return (
                        <div
                          key={m.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mist)] px-3 py-1.5 text-xs font-bold"
                        >
                          <span>{def.emoji}</span>
                          <span>{def.label}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                              def.delta >= 0
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-rose-500/15 text-rose-500'
                            }`}
                          >
                            {def.delta >= 0 ? `+${def.delta}` : def.delta}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Autonomous Free Will Toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-[var(--mist)] px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <div>
                    <div className="text-xs font-bold">Autonomous Free Will</div>
                    <div className="text-[10px] text-[var(--ink-soft)]">
                      Auto-queue home needs when idle
                    </div>
                  </div>
                </div>
                <button
                  onClick={toggleFreeWill}
                  className={`btn-press rounded-full px-4 py-1 text-xs font-extrabold ${
                    freeWill ? 'bg-[#34C759] text-white' : 'bg-slate-400/30 text-[var(--ink)]'
                  }`}
                >
                  {freeWill ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}

          {/* TECH & FOUNDER SKILLS (Tech Tree Specializations + Visual 10-Segment Core Bars) */}
          {simTab === 'skills' && (
            <div className="space-y-4">
              {/* 🌳 Skill Tech Tree & Specializations Section */}
              <div className="space-y-3 rounded-3xl border border-[#007AFF]/25 bg-gradient-to-br from-[#007AFF]/10 via-purple-500/10 to-emerald-500/5 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black tracking-tight">
                        🌳 Skill Tech Tree & Specializations
                      </span>
                      <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                        {unlockedTechNodes.length} / {SKILL_TREE_NODES.length} Specializations
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] font-medium text-[var(--ink-soft)]">
                      Elite tracks (OpenMind AI, Cupertino OS, Sand Hill VC) gate offers & promos on custom Tech Tree nodes.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                      ⚡ {karma} Karma
                    </span>
                    <button
                      onClick={() => setActiveModal('career')}
                      className="btn-press rounded-xl bg-[#007AFF] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm"
                    >
                      🌳 Open Full Skill Tech Tree
                    </button>
                  </div>
                </div>

                {/* 4 Tech Tree Branches with their 4 Tier Nodes */}
                <div className="space-y-3">
                  {SKILL_TREE_BRANCHES.map((branch) => {
                    const branchNodes = SKILL_TREE_NODES.filter((n) => n.branch === branch.id);
                    const unlockedInBranch = branchNodes.filter((n) =>
                      unlockedTechNodes.includes(n.id)
                    ).length;

                    return (
                      <div
                        key={branch.id}
                        className="rounded-2xl border border-black/5 bg-[var(--mist)] p-3 dark:border-white/10"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{branch.emoji}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold">{branch.shortLabel}</span>
                                <span className="text-[10px] font-semibold text-[var(--ink-soft)]">
                                  · {branch.companyTarget}
                                </span>
                              </div>
                              <div className="truncate text-[10px] text-[var(--ink-soft)]">
                                {branch.desc}
                              </div>
                            </div>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                            style={{ backgroundColor: branch.accent }}
                          >
                            {unlockedInBranch}/4 Tiers
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {branchNodes.map((node) => {
                            const isUnlocked = unlockedTechNodes.includes(node.id);
                            const prereqsMet = node.prereqNodes.every((pid) =>
                              unlockedTechNodes.includes(pid)
                            );
                            const skillsMet = node.requiredSkills.every(
                              (req) => Math.floor(skills[req.skill] ?? 0) >= req.level
                            );
                            const karmaMet = karma >= node.karmaCost;
                            const isReady = !isUnlocked && prereqsMet && skillsMet && karmaMet;

                            return (
                              <div
                                key={node.id}
                                className={`flex flex-col justify-between gap-2 rounded-xl border p-2.5 transition-all ${
                                  isUnlocked
                                    ? 'border-emerald-500/40 bg-emerald-500/10'
                                    : isReady
                                    ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30'
                                    : 'border-black/5 bg-white/60 dark:border-white/10 dark:bg-black/25'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-[9px] font-extrabold dark:bg-white/10">
                                      T{node.tier} · {node.codeName}
                                    </span>
                                    {isUnlocked ? (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                        ✓ Unlocked
                                      </span>
                                    ) : isReady ? (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                                        ⚡ Ready to Unlock
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-black/10 px-2 py-0.5 text-[9px] font-bold text-[var(--ink-soft)] dark:bg-white/10">
                                        <Lock className="size-2.5" /> 🔒 Locked
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs font-extrabold leading-snug">
                                    {node.emoji} {node.title}
                                  </div>
                                  <div className="text-[10px] font-semibold text-[#007AFF] dark:text-sky-400">
                                    {node.perkSummary}
                                  </div>

                                  {/* Prereq & Core Skill Requirements */}
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {node.prereqNodes.map((pid) => {
                                      const pNode = SKILL_TREE_NODE_BY_ID[pid];
                                      const hasPrereq = unlockedTechNodes.includes(pid);
                                      return (
                                        <span
                                          key={pid}
                                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                            hasPrereq
                                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                          }`}
                                        >
                                          {hasPrereq ? '✓' : '🔒'} {pNode?.codeName || pid}
                                        </span>
                                      );
                                    })}
                                    {node.requiredSkills.map((req) => {
                                      const skMeta = SKILLS_META.find((m) => m.key === req.skill);
                                      const curLvl = Math.floor(skills[req.skill] ?? 0);
                                      const met = curLvl >= req.level;
                                      return (
                                        <span
                                          key={req.skill}
                                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                            met
                                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                          }`}
                                        >
                                          {met ? '✓' : '🔒'} {skMeta?.emoji} {req.skill} Lv.{curLvl}/{req.level}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Action Buttons: Unlock or Lab Study */}
                                {!isUnlocked ? (
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                      onClick={() => unlockTechNode(node.id)}
                                      className={`btn-press flex-1 rounded-lg py-1.5 text-[10px] font-extrabold text-white shadow-xs ${
                                        isReady
                                          ? 'bg-emerald-600 hover:bg-emerald-500'
                                          : 'bg-[#007AFF]/80 hover:bg-[#007AFF]'
                                      }`}
                                    >
                                      Unlock ({node.karmaCost} ⚡)
                                    </button>
                                    <button
                                      onClick={() => trainTechNodeSkill(node.id)}
                                      className="btn-press rounded-lg bg-purple-500/15 px-2 py-1.5 text-[10px] font-extrabold text-purple-600 hover:bg-purple-500/25 dark:text-purple-300"
                                      title="Study required skill (+0.55 XP · +3 Karma on Lv-Up)"
                                    >
                                      🔬 Lab Study (-16 Energy)
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                      ✓ Specialization Active
                                    </span>
                                    <button
                                      onClick={() => trainTechNodeSkill(node.id)}
                                      className="btn-press rounded-lg bg-emerald-500/15 px-2 py-1 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300"
                                    >
                                      🔬 Lab Study (-16 Energy)
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 8 Core Skill Level Bars (Lv.1–10) */}
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                    Core Engineering & Founder Skills (Lv.1–10)
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--ink-soft)]">
                    Required as foundations for Tech Tree nodes
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SKILLS_META.map((sk) => {
                    const raw = skills[sk.key] || 0;
                    const lvl = Math.floor(raw);
                    const pct = Math.round((raw - lvl) * 100);
                    return (
                      <div key={sk.key} className="rounded-2xl bg-[var(--mist)] p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">
                            {sk.emoji} {sk.label}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                            style={{ backgroundColor: sk.color }}
                          >
                            Lv.{lvl}
                          </span>
                        </div>
                        {/* 10-Segment Apple Level Indicator */}
                        <div className="mt-2 grid grid-cols-10 gap-1">
                          {Array.from({ length: 10 }).map((_, i) => {
                            const filled = i < lvl;
                            const active = i === lvl && lvl < 10;
                            return (
                              <div
                                key={i}
                                className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: filled ? '100%' : active ? `${pct}%` : '0%',
                                    backgroundColor: sk.color,
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--ink-soft)]">
                          <span>{lvl >= 10 ? 'Mastered' : `${pct}% to Lv.${lvl + 1}`}</span>
                          <span className="font-semibold">Max 10</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* WISHES & OKRs */}
          {simTab === 'wishes' && (
            <div className="space-y-3">
              {(() => {
                const evalRes = evaluateAspirationProgress(state, sim.aspiration);
                return (
                  <div className="rounded-2xl border border-[#007AFF]/25 bg-gradient-to-r from-[#007AFF]/15 to-purple-500/15 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{evalRes.aspDef.emoji}</span>
                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#007AFF]">
                            Active North Star Goal ({evalRes.overallPct}%)
                          </div>
                          <div className="text-sm font-extrabold">{evalRes.aspDef.label}</div>
                          <div className="text-[11px] text-[var(--ink-soft)]">
                            Stage {evalRes.activeStage.stage.stageNumber}/4:{' '}
                            {evalRes.activeStage.stage.title} ({evalRes.activeStage.progressText})
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveModal('guide', 'goals')}
                        className="btn-press shrink-0 rounded-full bg-[#007AFF] px-3 py-1.5 text-[10.5px] font-extrabold text-white shadow-xs"
                      >
                        🎯 Switch Goal / Guide
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="grid gap-2">
                {wishes.map((w) => {
                  const pct = Math.min(100, Math.round((w.progress / Math.max(1, w.targetValue)) * 100));
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--mist)] p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl">{w.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-snug">{w.title}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                              <div
                                className="h-full rounded-full bg-amber-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-extrabold text-[var(--ink-soft)]">
                              {Math.round(w.progress)}/{w.targetValue}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {w.cashReward && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-mono text-[10.5px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(w.cashReward)}
                          </span>
                        )}
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                          +{w.karmaReward} ⚡
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compact Trait Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sim.traits.map((tId) => {
                  const t = TRAITS.find((item) => item.id === tId);
                  return t ? (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mist)] px-3 py-1.5 text-xs font-bold"
                    >
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* KARMA REWARDS TREE (4 Branches × 4 Tiers = 16 Sequential Perks) */}
          {simTab === 'perks' && (
            <div className="space-y-3.5">
              {/* Top Karma Economy & Tree Progress Banner */}
              <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/12 via-[#007AFF]/10 to-purple-500/10 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="size-4 text-amber-500" />
                      <span className="text-sm font-black tracking-tight">
                        Karma Rewards Tree
                      </span>
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                        {unlockedPerks.length} / {REWARD_PERKS.length} Nodes Unlocked
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] font-medium text-[var(--ink-soft)]">
                      Unlock Tier 1 foundations to progress down each branch toward Tier 4 Apex Capstones.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-amber-500/20 px-3.5 py-1.5 border border-amber-500/30">
                    <span className="text-base">⚡</span>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Available Karma
                      </div>
                      <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                        {karma} ⚡
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Tree Completion Bar */}
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-[#007AFF] to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.round((unlockedPerks.length / REWARD_PERKS.length) * 100)}%`,
                    }}
                  />
                </div>

                {/* How to Earn Karma Guide */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                  <span className="text-[var(--ink-soft)]">Earn ⚡:</span>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 dark:bg-black/30">
                    🎯 OKRs +4–6⚡
                  </span>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 dark:bg-black/30">
                    🧠 Skill Lv-Up +3⚡
                  </span>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 dark:bg-black/30">
                    🚀 Ship Charter +4–5⚡
                  </span>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 dark:bg-black/30">
                    👑 Promo / VC Round +12⚡
                  </span>
                </div>
              </div>

              {/* Branch Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setPerkBranch('all')}
                  className={`btn-press inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                    perkBranch === 'all'
                      ? 'bg-[#007AFF] text-white shadow-sm'
                      : 'bg-[var(--mist)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  <span>🌟</span>
                  <span>All 4 Branches</span>
                </button>
                {REWARD_PERK_BRANCHES.map((b) => {
                  const bPerks = REWARD_PERKS.filter((p) => p.branch === b.id);
                  const bUnlocked = bPerks.filter((p) => unlockedPerks.includes(p.id)).length;
                  const active = perkBranch === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setPerkBranch(b.id)}
                      className={`btn-press inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                        active
                          ? 'text-white shadow-sm'
                          : 'bg-[var(--mist)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                      }`}
                      style={active ? { backgroundColor: b.accent } : undefined}
                    >
                      <span>{b.emoji}</span>
                      <span>{b.shortLabel}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                          active ? 'bg-white/25 text-white' : 'bg-black/10 dark:bg-white/10'
                        }`}
                      >
                        {bUnlocked}/4
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tree Columns */}
              <div
                className={`grid gap-3.5 ${
                  perkBranch === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {REWARD_PERK_BRANCHES.filter(
                  (b) => perkBranch === 'all' || b.id === perkBranch
                ).map((branch) => {
                  const branchPerks = REWARD_PERKS.filter((p) => p.branch === branch.id).sort(
                    (a, b) => a.tier - b.tier
                  );
                  const unlockedCount = branchPerks.filter((p) =>
                    unlockedPerks.includes(p.id)
                  ).length;

                  return (
                    <div
                      key={branch.id}
                      className="flex flex-col rounded-3xl border border-black/10 bg-[var(--mist)] p-3.5 dark:border-white/10"
                    >
                      {/* Branch Header */}
                      <div className="mb-3 flex items-center justify-between gap-2 border-b border-black/5 pb-2.5 dark:border-white/10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="grid size-9 shrink-0 place-items-center rounded-2xl text-lg shadow-xs"
                            style={{ backgroundColor: `${branch.accent}22` }}
                          >
                            {branch.emoji}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black tracking-tight">
                                {branch.label}
                              </span>
                            </div>
                            <div className="truncate text-[10px] text-[var(--ink-soft)]">
                              {branch.tagline}
                            </div>
                          </div>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs"
                          style={{ backgroundColor: branch.accent }}
                        >
                          {unlockedCount}/4 Tiers
                        </span>
                      </div>

                      {/* Sequential 4-Tier Tree Nodes with Connectors */}
                      <div className="flex flex-col">
                        {branchPerks.map((p, idx) => {
                          const owned = unlockedPerks.includes(p.id);
                          const prereqPerk = p.prereqId ? REWARD_PERK_BY_ID[p.prereqId] : null;
                          const prereqMet = !p.prereqId || unlockedPerks.includes(p.prereqId);
                          const canAfford = karma >= p.cost;
                          const isReady = !owned && prereqMet && canAfford;

                          const tierLabel =
                            p.tier === 1
                              ? 'TIER 1 · FOUNDATION'
                              : p.tier === 2
                              ? 'TIER 2 · SPECIALIST'
                              : p.tier === 3
                              ? 'TIER 3 · MASTERY'
                              : 'TIER 4 · APEX CAPSTONE';

                          return (
                            <React.Fragment key={p.id}>
                              {/* Vertical Tree Connector from Parent Tier */}
                              {idx > 0 && (
                                <div className="my-1 flex flex-col items-center justify-center">
                                  <div
                                    className={`h-3 w-0.5 transition-colors ${
                                      prereqMet
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-400/40 dark:bg-slate-600/50'
                                    }`}
                                  />
                                  <div
                                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                                      prereqMet
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-black/5 text-[var(--ink-soft)] dark:bg-white/5'
                                    }`}
                                  >
                                    <ArrowDown className="size-2.5" />
                                    <span>
                                      {prereqMet
                                        ? `Tier ${p.tier} Unlocked Path`
                                        : `Requires T${p.tier - 1}: ${prereqPerk?.name}`}
                                    </span>
                                  </div>
                                  <div
                                    className={`h-2 w-0.5 transition-colors ${
                                      prereqMet
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-400/40 dark:bg-slate-600/50'
                                    }`}
                                  />
                                </div>
                              )}

                              {/* Perk Node Card */}
                              <div
                                className={`relative flex flex-col justify-between gap-2 rounded-2xl border p-3 transition-all ${
                                  owned
                                    ? 'border-emerald-500/45 bg-emerald-500/10 shadow-xs'
                                    : isReady
                                    ? 'border-amber-500/55 bg-white/85 ring-1 ring-amber-500/30 dark:bg-black/40'
                                    : prereqMet
                                    ? 'border-black/10 bg-white/70 dark:border-white/15 dark:bg-black/30'
                                    : 'border-black/5 bg-black/[0.03] opacity-75 dark:border-white/5 dark:bg-white/[0.02]'
                                }`}
                              >
                                {/* Top Tier & Status Row */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-black text-white"
                                      style={{
                                        backgroundColor: owned
                                          ? '#10B981'
                                          : prereqMet
                                          ? branch.accent
                                          : '#64748B',
                                      }}
                                    >
                                      {tierLabel}
                                    </span>
                                    <span className="font-mono text-[9px] font-bold text-[var(--ink-soft)]">
                                      {p.codeName}
                                    </span>
                                  </div>

                                  {owned ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                      <Check className="size-2.5" /> Active
                                    </span>
                                  ) : !prereqMet ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-[9px] font-bold text-[var(--ink-soft)] dark:bg-white/10">
                                      <Lock className="size-2.5" /> Locked
                                    </span>
                                  ) : canAfford ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                                      ⚡ Ready · {p.cost} ⚡
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-[9px] font-bold text-[var(--ink-soft)] dark:bg-white/10">
                                      Cost: {p.cost} ⚡
                                    </span>
                                  )}
                                </div>

                                {/* Main Info */}
                                <div className="flex items-start gap-2.5">
                                  <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-black/5 text-xl dark:bg-white/10">
                                    {p.emoji}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-extrabold leading-snug">
                                      {p.name}
                                    </div>
                                    <div
                                      className="mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-extrabold"
                                      style={{
                                        backgroundColor: `${branch.accent}18`,
                                        color: branch.accent,
                                      }}
                                    >
                                      {p.shortEffect}
                                    </div>
                                    <div className="mt-1 text-[10px] leading-relaxed text-[var(--ink-soft)]">
                                      {p.desc}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Button */}
                                {owned ? (
                                  <div className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500/20 py-1.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                    <Check className="size-3.5" /> Tier {p.tier} Perk Active
                                  </div>
                                ) : !prereqMet ? (
                                  <button
                                    onClick={() => claimPerk(p.id)}
                                    className="btn-press inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-black/10 py-1.5 text-[11px] font-bold text-[var(--ink-soft)] dark:bg-white/10"
                                  >
                                    <Lock className="size-3" />
                                    <span>
                                      Requires T{p.tier - 1} {prereqPerk?.name} · {p.cost} ⚡
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => claimPerk(p.id)}
                                    className={`btn-press w-full rounded-xl py-1.5 text-xs font-extrabold text-white shadow-xs transition-all ${
                                      canAfford
                                        ? 'bg-[#007AFF] hover:bg-[#0062CC]'
                                        : 'bg-slate-500/60 opacity-75'
                                    }`}
                                  >
                                    {canAfford
                                      ? `Unlock Tier ${p.tier} · ${p.cost} ⚡`
                                      : `Need ${p.cost} ⚡ (Have ${karma} ⚡)`}
                                  </button>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BAY AREA RELATIONSHIPS (CIRCLE, DIALOGUE & MILESTONES HUB) */}
          {simTab === 'relationships' && (() => {
            const totalBond = NPCS.reduce(
              (acc, n) => acc + (relationships[n.id]?.score ?? 12),
              0
            );
            const avgBond = Math.round(totalBond / NPCS.length);
            const innerCircleCount = NPCS.filter(
              (n) => (relationships[n.id]?.score ?? 12) >= 52
            ).length;
            const cofounderCount = NPCS.filter(
              (n) => (relationships[n.id]?.score ?? 12) >= 68
            ).length;
            const partnerCount = NPCS.filter(
              (n) => (relationships[n.id]?.score ?? 12) >= 85
            ).length;
            const totalUnclaimedMilestones = NPCS.reduce((acc, n) => {
              const r = relationships[n.id];
              const sc = r?.score ?? 12;
              const claimed = r?.claimedMilestones || [];
              const unclaimed = getNpcMilestones(n.id).filter(
                (m) => (sc >= m.threshold || (r?.unlockedMilestones || []).includes(m.id)) && !claimed.includes(m.id)
              ).length;
              return acc + unclaimed;
            }, 0);

            const selectedNpc = NPCS.find((n) => n.id === selectedRelNpcId) || NPCS[0];
            const rel = relationships[selectedNpc.id];
            const score = rel?.score ?? 12;
            const trust = rel?.trust ?? 10;
            const romance = rel?.romance ?? 5;
            const tierInfo = getRelationshipTierInfo(score);
            const nextTier = RELATIONSHIP_TIERS.find((t) => t.minScore > score);
            const tierMin = tierInfo.minScore ?? 0;
            const tierMax = nextTier ? nextTier.minScore : 100;
            const tierProgressPct = nextTier
              ? Math.max(0, Math.min(100, Math.round(((score - tierMin) / Math.max(1, tierMax - tierMin)) * 100)))
              : 100;

            const spotDef = LOCATION_BY_ID[selectedNpc.favoriteSpot];
            const availTopics = getAvailableTopicsForNpc(
              selectedNpc.id,
              score,
              rel?.completedTopics || []
            );
            const activeTopic =
              availTopics.find((t) => t.id === rel?.activeTopicId) || availTopics[0] || null;
            const npcMilestones = getNpcMilestones(selectedNpc.id);
            const npcClaimedMilestones = rel?.claimedMilestones || [];
            const npcUnclaimedCount = npcMilestones.filter(
              (m) =>
                (score >= m.threshold || (rel?.unlockedMilestones || []).includes(m.id)) &&
                !npcClaimedMilestones.includes(m.id)
            ).length;
            const recentMessages = (rel?.messages || []).slice(-8);

            return (
              <div className="space-y-3.5">
                {/* 1. Top Circle Synergy Summary Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-[#007AFF]/25 bg-gradient-to-r from-[#007AFF]/12 via-purple-500/10 to-pink-500/12 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black tracking-tight">
                        🤝 Bay Area Circle & Deal Flow Hub
                      </span>
                      <span className="rounded-full bg-[#007AFF] px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                        {avgBond}% Avg Synergy
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10.5px] font-medium text-[var(--ink-soft)]">
                      Build Founder Trust & Chemistry through deep-dive dialogues, curated gifts, and milestone unlocks.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                    <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-indigo-600 dark:text-indigo-300">
                      🌟 {innerCircleCount}/6 Inner Circle+
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-300">
                      🦄 {cofounderCount} Co-Founder+ · 💖 {partnerCount} Partner+
                    </span>
                    {totalUnclaimedMilestones > 0 ? (
                      <span className="animate-pulse rounded-full bg-amber-500 px-2.5 py-1 text-white shadow-sm">
                        🎁 {totalUnclaimedMilestones} Unclaimed Milestone{totalUnclaimedMilestones > 1 ? 's' : ''}!
                      </span>
                    ) : (
                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-[var(--ink-soft)] dark:bg-white/10">
                        🏆 Milestones Synced
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Top Selectable NPC Roster Strip (6 NPCs) */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {NPCS.map((npc) => {
                    const nRel = relationships[npc.id];
                    const nScore = nRel?.score ?? 12;
                    const nTier = getRelationshipTierInfo(nScore);
                    const isSelected = npc.id === selectedNpc.id;
                    const nMilestones = getNpcMilestones(npc.id);
                    const nClaimed = nRel?.claimedMilestones || [];
                    const hasUnclaimedMilestone = nMilestones.some(
                      (m) =>
                        (nScore >= m.threshold || (nRel?.unlockedMilestones || []).includes(m.id)) &&
                        !nClaimed.includes(m.id)
                    );
                    const hasActiveTopic =
                      getAvailableTopicsForNpc(npc.id, nScore, nRel?.completedTopics || []).length > 0;

                    return (
                      <button
                        key={npc.id}
                        onClick={() => setSelectedRelNpcId(npc.id)}
                        className={`btn-press relative flex flex-col justify-between gap-1.5 rounded-2xl border p-2.5 text-left transition-all ${
                          isSelected
                            ? 'border-[#007AFF] bg-[#007AFF]/12 ring-2 ring-[#007AFF]/30'
                            : 'border-black/5 bg-[var(--mist)] hover:bg-black/10 dark:border-white/10 dark:hover:bg-white/10'
                        }`}
                      >
                        {(hasUnclaimedMilestone || hasActiveTopic) && (
                          <span
                            className={`absolute -top-1.5 -right-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm ${
                              hasUnclaimedMilestone
                                ? 'animate-bounce bg-amber-500'
                                : 'animate-pulse bg-[#007AFF]'
                            }`}
                            title={
                              hasUnclaimedMilestone
                                ? 'Unclaimed Milestone Reward!'
                                : 'Active Dialogue Topic Ready'
                            }
                          >
                            {hasUnclaimedMilestone ? '🎁' : '💬'}
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <Portrait
                            appearance={npc.appearance}
                            size={34}
                            ringColor={nTier.color}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11px] font-extrabold leading-tight">
                              {npc.name.split(' ')[0]}
                            </div>
                            <div className="truncate text-[9px] font-semibold text-[var(--ink-soft)]">
                              {npc.company}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="truncate rounded-full px-1.5 py-0.2 text-[8.5px] font-extrabold"
                              style={{
                                backgroundColor: `${nTier.color}22`,
                                color: nTier.color,
                              }}
                            >
                              {nTier.status}
                            </span>
                            <span className="shrink-0 text-[10px] font-black">{nScore}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${nScore}%`, backgroundColor: nTier.color }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 3. Selected NPC Deep Profile & Bond Meter Card */}
                <div className="rounded-3xl border border-black/10 bg-[var(--mist)] p-4 dark:border-white/10">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3">
                      <Portrait
                        appearance={selectedNpc.appearance}
                        size={58}
                        ringColor={tierInfo.color}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-base font-black tracking-tight">
                            {selectedNpc.name}
                          </h4>
                          <span className="text-[11px] font-semibold text-[var(--ink-soft)]">
                            {selectedNpc.handle}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs"
                            style={{ backgroundColor: tierInfo.color }}
                          >
                            {tierInfo.emoji} {tierInfo.status} · {score}%
                          </span>
                        </div>

                        <div className="mt-0.5 text-xs font-bold text-[var(--ink)]">
                          {selectedNpc.role} @ {selectedNpc.company}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                          {selectedNpc.bio}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-[#007AFF]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                            📍 Fav Spot: {spotDef?.emoji || '📍'} {spotDef?.name || selectedNpc.favoriteSpot}
                          </span>
                          {selectedNpc.traits.map((tr) => (
                            <span
                              key={tr}
                              className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)] dark:bg-white/10"
                            >
                              ✦ {tr}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Quick Favorite Spot Hangout CTA */}
                    <button
                      onClick={() => inviteNpcHangout(selectedNpc.id)}
                      className="btn-press shrink-0 rounded-2xl bg-gradient-to-r from-[#007AFF] to-indigo-600 px-3.5 py-2 text-left text-white shadow-md"
                    >
                      <div className="text-[11px] font-black">
                        📍 Hangout at {spotDef?.shortName || 'Favorite Spot'}
                      </div>
                      <div className="text-[9.5px] font-semibold text-white/85">
                        +16 Bond · +12 Trust · +8 Vibe · +3⚡
                      </div>
                    </button>
                  </div>

                  {/* Bond Progress Bar + Trust & Chemistry Sub-Meters */}
                  <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {/* Overall Tier Progress */}
                    <div className="rounded-2xl bg-white/70 p-2.5 dark:bg-black/30">
                      <div className="flex items-center justify-between text-[10px] font-extrabold">
                        <span>Bond Tier Progress</span>
                        <span style={{ color: tierInfo.color }}>
                          {nextTier
                            ? `Next: ${nextTier.status} (${score}/${nextTier.minScore}%)`
                            : 'Max Tier (100%)'}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${tierProgressPct}%`,
                            backgroundColor: tierInfo.color,
                          }}
                        />
                      </div>
                      <div className="mt-1 text-[9.5px] font-bold text-[var(--ink-soft)]">
                        ✨ {tierInfo.perkSummary}
                      </div>
                    </div>

                    {/* Founder Trust Meter */}
                    <div className="rounded-2xl bg-white/70 p-2.5 dark:bg-black/30">
                      <div className="flex items-center justify-between text-[10px] font-extrabold">
                        <span className="text-indigo-600 dark:text-indigo-400">
                          🤝 Founder Trust
                        </span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                          {trust}/100
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${trust}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[9.5px] font-medium text-[var(--ink-soft)]">
                        Referrals, VC intros & co-founder conviction
                      </div>
                    </div>

                    {/* Chemistry / Vibe Meter */}
                    <div className="rounded-2xl bg-white/70 p-2.5 dark:bg-black/30">
                      <div className="flex items-center justify-between text-[10px] font-extrabold">
                        <span className="text-pink-600 dark:text-pink-400">
                          💖 Chemistry / Vibe
                        </span>
                        <span className="font-black text-pink-600 dark:text-pink-400">
                          {romance}/100
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-pink-500 transition-all"
                          style={{ width: `${romance}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[9.5px] font-medium text-[var(--ink-soft)]">
                        Dates, favorite gifts & partner synergy
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Filter Pill Bar */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[var(--mist)] p-1.5">
                  {[
                    { id: 'all' as const, label: 'All Sections', emoji: '✨' },
                    {
                      id: 'dialogue' as const,
                      label: `Dialogue & 9 Actions${activeTopic ? ' · 1 Topic' : ''}`,
                      emoji: '💬',
                    },
                    {
                      id: 'milestones' as const,
                      label: `Milestones (${npcClaimedMilestones.length}/4)${npcUnclaimedCount > 0 ? ` · ${npcUnclaimedCount} Ready!` : ''}`,
                      emoji: '🏆',
                    },
                    { id: 'gifts' as const, label: 'Bay Area Gifts (6)', emoji: '🎁' },
                    {
                      id: 'dms' as const,
                      label: `DM History (${recentMessages.length})`,
                      emoji: '📱',
                    },
                  ].map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => setRelSection(sec.id)}
                      className={`btn-press flex items-center gap-1 rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold transition-all ${
                        relSection === sec.id
                          ? 'bg-[#007AFF] text-white shadow-xs'
                          : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <span>{sec.emoji}</span>
                      <span>{sec.label}</span>
                    </button>
                  ))}
                </div>

                {/* SECTION A: INTERACTIVE DIALOGUE & 9 ACTIONS */}
                {(relSection === 'all' || relSection === 'dialogue') && (
                  <div className="space-y-3">
                    {/* Active Conversation Topic Card */}
                    {activeTopic ? (
                      <div className="rounded-3xl border border-[#007AFF]/35 bg-gradient-to-br from-[#007AFF]/12 via-indigo-500/8 to-purple-500/10 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{activeTopic.emoji}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black">
                                  Active Topic: {activeTopic.title}
                                </span>
                                <span className="rounded-full bg-[#007AFF] px-2 py-0.5 text-[9px] font-extrabold uppercase text-white">
                                  {activeTopic.category}
                                </span>
                              </div>
                              <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                                Choose your response — skill checks grant bonus Karma, Cash & XP!
                              </div>
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-300">
                            💬 Live Prompt
                          </span>
                        </div>

                        {/* NPC Prompt Bubble */}
                        <div className="mt-2.5 rounded-2xl rounded-tl-xs border border-black/5 bg-white/85 p-3 text-xs font-semibold leading-relaxed text-[var(--ink)] shadow-xs dark:border-white/10 dark:bg-black/40">
                          <span className="mr-1.5 font-black text-[#007AFF]">
                            {selectedNpc.name.split(' ')[0]}:
                          </span>
                          “{activeTopic.promptText}”
                        </div>

                        {/* 3 Branching Choice Buttons */}
                        <div className="mt-2.5 grid grid-cols-1 gap-2">
                          {activeTopic.choices.map((choice, idx) => {
                            const skCheck = choice.skillCheck;
                            const skMeta = skCheck
                              ? SKILLS_META.find((m) => m.key === skCheck.skill)
                              : null;
                            const playerSkLvl = skCheck ? skills[skCheck.skill] || 0 : 0;
                            const meetsSkill = skCheck ? playerSkLvl >= skCheck.level : true;

                            return (
                              <button
                                key={idx}
                                onClick={() =>
                                  answerNpcTopic(selectedNpc.id, activeTopic.id, idx)
                                }
                                className="btn-press flex flex-col justify-between gap-1.5 rounded-2xl border border-black/10 bg-white/80 p-3 text-left transition-all hover:border-[#007AFF] hover:bg-[#007AFF]/8 dark:border-white/10 dark:bg-black/35"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{choice.emoji}</span>
                                    <span className="text-xs font-black text-[#007AFF] dark:text-sky-400">
                                      {choice.label}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1 text-[9.5px] font-extrabold">
                                    {skCheck && (
                                      <span
                                        className={`rounded-full px-2 py-0.5 ${
                                          meetsSkill
                                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                        }`}
                                      >
                                        {skMeta?.emoji || '🎯'} {skMeta?.label || skCheck.skill}{' '}
                                        Lv.{skCheck.level}{' '}
                                        {meetsSkill
                                          ? '✓ Pass'
                                          : `(You: Lv.${Math.floor(playerSkLvl)})`}
                                      </span>
                                    )}
                                    <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-pink-600 dark:text-pink-300">
                                      +{choice.scoreDelta} Bond
                                    </span>
                                    {choice.rewardKarma && (
                                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-600 dark:text-amber-300">
                                        +{choice.rewardKarma}⚡
                                      </span>
                                    )}
                                    {choice.rewardCash && (
                                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-300">
                                        +{formatCurrency(choice.rewardCash)}
                                      </span>
                                    )}
                                    {choice.rewardSkill && (
                                      <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-indigo-600 dark:text-indigo-300">
                                        +{choice.rewardSkill.skill} XP
                                      </span>
                                    )}
                                    {choice.rewardStartup && (
                                      <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-purple-600 dark:text-purple-300">
                                        +{choice.rewardStartup}% MVP
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-[11px] font-medium text-[var(--ink)]">
                                  “{choice.playerText}”
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[var(--mist)] px-3.5 py-2.5 text-xs dark:border-white/10">
                        <span className="font-bold text-[var(--ink-soft)]">
                          💬 Completed {(rel?.completedTopics || []).length} dialogue topics with{' '}
                          {selectedNpc.name}. Increase Bond % to unlock higher-tier discussions!
                        </span>
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          ✓ Up to Date
                        </span>
                      </div>
                    )}

                    {/* 9 Relationship Interactions Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                          ⚡ 9 Relationship Interactions & Networking Moves
                        </span>
                        <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                          {NPC_INTERACTIONS.filter((i) => score >= i.minScore).length} /{' '}
                          {NPC_INTERACTIONS.length} Unlocked
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {NPC_INTERACTIONS.map((def) => {
                          const unlocked = score >= def.minScore;
                          const count = rel?.interactionCounts?.[def.id] || 0;

                          return (
                            <button
                              key={def.id}
                              onClick={() => interactWithNpc(selectedNpc.id, def.id)}
                              className={`btn-press flex flex-col justify-between gap-2 rounded-2xl border p-3 text-left transition-all ${
                                unlocked
                                  ? 'border-black/10 bg-[var(--mist)] hover:border-[#007AFF]/50 dark:border-white/10'
                                  : 'border-black/5 bg-black/5 opacity-65 dark:border-white/5 dark:bg-white/5'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-extrabold">
                                    {def.emoji} {def.label}
                                  </span>
                                  {unlocked ? (
                                    <span
                                      className="shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold text-white"
                                      style={{ backgroundColor: def.accent }}
                                    >
                                      +{def.baseScoreDelta} Bond
                                    </span>
                                  ) : (
                                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-black/15 px-2 py-0.5 text-[9px] font-extrabold text-[var(--ink-soft)] dark:bg-white/15">
                                      <Lock className="size-2.5" /> Req {def.minScore}%
                                    </span>
                                  )}
                                </div>

                                <p className="text-[10px] leading-snug text-[var(--ink-soft)]">
                                  {def.description}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-1 pt-1 text-[9px] font-extrabold">
                                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
                                  -{def.energyCost}⚡
                                </span>
                                {def.cashCost ? (
                                  <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-rose-600 dark:text-rose-300">
                                    {formatCurrency(def.cashCost)}
                                  </span>
                                ) : null}
                                {def.trustDelta > 0 && (
                                  <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-indigo-600 dark:text-indigo-300">
                                    +{def.trustDelta} Trust
                                  </span>
                                )}
                                {def.romanceDelta > 0 && (
                                  <span className="rounded-md bg-pink-500/15 px-1.5 py-0.5 text-pink-600 dark:text-pink-300">
                                    +{def.romanceDelta} Vibe
                                  </span>
                                )}
                                {def.skillBoost && (
                                  <span className="rounded-md bg-[#007AFF]/15 px-1.5 py-0.5 text-[#007AFF]">
                                    +{def.skillBoost.skill}
                                  </span>
                                )}
                                {def.startupBoost && (
                                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-300">
                                    +{def.startupBoost}% MVP
                                  </span>
                                )}
                                {def.performanceBoost && (
                                  <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-purple-600 dark:text-purple-300">
                                    +{def.performanceBoost}% Perf
                                  </span>
                                )}
                                {def.karmaBoost && (
                                  <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-amber-600 dark:text-amber-300">
                                    +{def.karmaBoost}⚡ Karma
                                  </span>
                                )}
                                {count > 0 && (
                                  <span className="ml-auto text-[8.5px] font-bold text-[var(--ink-soft)]">
                                    ×{count}
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

                {/* SECTION B: RELATIONSHIP MILESTONES TRACK (4 TIERS: 20%, 45%, 70%, 90%) */}
                {(relSection === 'all' || relSection === 'milestones') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                        🏆 {selectedNpc.name}’s 4 Signature Relationship Milestones
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        {npcClaimedMilestones.length} / {npcMilestones.length} Claimed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {npcMilestones.map((m) => {
                        const isClaimed = npcClaimedMilestones.includes(m.id);
                        const isUnlocked =
                          score >= m.threshold ||
                          (rel?.unlockedMilestones || []).includes(m.id);
                        const mTierInfo = getRelationshipTierInfo(m.threshold);

                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col justify-between gap-2.5 rounded-2xl border p-3.5 transition-all ${
                              isClaimed
                                ? 'border-emerald-500/40 bg-emerald-500/10'
                                : isUnlocked
                                ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30'
                                : 'border-black/10 bg-[var(--mist)] dark:border-white/10'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-base">{m.emoji}</span>
                                  <span className="text-xs font-black">{m.title}</span>
                                </div>
                                <span
                                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white"
                                  style={{ backgroundColor: mTierInfo.color }}
                                >
                                  {m.tierStatus} · {m.threshold}%
                                </span>
                              </div>

                              <p className="text-[10.5px] leading-snug text-[var(--ink-soft)]">
                                {m.description}
                              </p>

                              <div className="inline-block rounded-lg bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                                🎁 Perk: {m.perkLabel}
                              </div>

                              {/* Reward Pills */}
                              <div className="flex flex-wrap gap-1 pt-0.5 text-[9.5px] font-extrabold">
                                {m.rewardKarma > 0 && (
                                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                                    +{m.rewardKarma}⚡ Karma
                                  </span>
                                )}
                                {m.rewardCash && (
                                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                                    +{formatCurrency(m.rewardCash)} Cash
                                  </span>
                                )}
                                {m.rewardRsu && (
                                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-indigo-700 dark:text-indigo-300">
                                    +{formatCurrency(m.rewardRsu)} RSU
                                  </span>
                                )}
                                {m.rewardSkill && (
                                  <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sky-700 dark:text-sky-300">
                                    +{m.rewardSkill.skill} XP
                                  </span>
                                )}
                                {m.rewardStartupProgress && (
                                  <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-purple-700 dark:text-purple-300">
                                    +{m.rewardStartupProgress}% Startup MVP
                                  </span>
                                )}
                                {m.rewardJobPerformance && (
                                  <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-pink-700 dark:text-pink-300">
                                    +{m.rewardJobPerformance}% Job Perf
                                  </span>
                                )}
                              </div>
                            </div>

                            {isClaimed ? (
                              <div className="space-y-1 rounded-xl bg-emerald-500/15 p-2">
                                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                                  <Check className="size-3.5" /> ✓ Claimed Milestone
                                </div>
                                <div className="text-[10px] italic text-[var(--ink-soft)]">
                                  “{m.unlockMessage}”
                                </div>
                              </div>
                            ) : isUnlocked ? (
                              <button
                                onClick={() =>
                                  claimRelationshipMilestone(selectedNpc.id, m.id)
                                }
                                className="btn-press w-full animate-pulse rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 py-2 text-xs font-black text-white shadow-md"
                              >
                                🎁 Claim Milestone Reward!
                              </button>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[9.5px] font-bold text-[var(--ink-soft)]">
                                  <span>🔒 Reach {m.threshold}% Bond to Unlock</span>
                                  <span>
                                    {score}/{m.threshold}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-[#007AFF] transition-all"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.round((score / m.threshold) * 100)
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION C: CURATED BAY AREA GIFTS */}
                {(relSection === 'all' || relSection === 'gifts') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                        🎁 Curated Bay Area Gifts for {selectedNpc.name}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                        ⭐ Favorites grant 1.75× Bond, +15 Trust, +12 Vibe & +10⚡ Karma
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {NPC_GIFTS.map((g) => {
                        const isFav = g.favoriteOfNpcIds.includes(selectedNpc.id);
                        const inBagEntry = g.backpackItemId
                          ? (inventory || []).find(
                              (i) => i.itemId === g.backpackItemId && i.quantity > 0
                            )
                          : undefined;
                        const canAfford = Boolean(inBagEntry) || cash >= g.price;
                        const estBond = isFav
                          ? Math.round(g.baseScoreDelta * 1.75)
                          : g.baseScoreDelta;

                        return (
                          <button
                            key={g.id}
                            onClick={() => giftNpc(selectedNpc.id, g.id)}
                            disabled={!canAfford}
                            className={`btn-press flex flex-col justify-between gap-2 rounded-2xl border p-3 text-left transition-all disabled:opacity-50 ${
                              isFav
                                ? 'border-pink-500/45 bg-pink-500/10 ring-1 ring-pink-500/25'
                                : 'border-black/10 bg-[var(--mist)] dark:border-white/10'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold">
                                  {g.emoji} {g.name}
                                </span>
                                {isFav && (
                                  <span className="shrink-0 rounded-full bg-pink-500 px-2 py-0.5 text-[9px] font-black text-white">
                                    ⭐ Favorite
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] leading-snug text-[var(--ink-soft)]">
                                {g.description}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                              <div className="flex flex-wrap items-center gap-1 text-[9px] font-extrabold">
                                <span className="rounded-md bg-pink-500/15 px-1.5 py-0.5 text-pink-600 dark:text-pink-300">
                                  +{estBond} Bond
                                </span>
                                <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-indigo-600 dark:text-indigo-300">
                                  +{isFav ? 15 : g.trustDelta ?? 8} Trust
                                </span>
                              </div>

                              {inBagEntry ? (
                                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9.5px] font-black text-white">
                                  🎒 In Backpack ({inBagEntry.quantity})
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#007AFF] px-2.5 py-0.5 text-[9.5px] font-black text-white">
                                  Gift · {formatCurrency(g.price)}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION D: RECENT DM HISTORY */}
                {(relSection === 'all' || relSection === 'dms') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                        📱 Recent iMessage Thread with {selectedNpc.name}
                      </span>
                      <button
                        onClick={() => setActiveModal('phone', 'messages')}
                        className="btn-press rounded-full bg-[#007AFF]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#007AFF]"
                      >
                        💬 Open Full Phone iMessage
                      </button>
                    </div>

                    <div className="space-y-2 rounded-3xl border border-black/5 bg-[var(--mist)] p-3.5 dark:border-white/10">
                      {recentMessages.map((msg, idx) => {
                        if (msg.from === 'milestone') {
                          return (
                            <div
                              key={msg.id || idx}
                              className="mx-auto max-w-md rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-emerald-500/15 px-3 py-2 text-center text-[10.5px] font-extrabold text-amber-700 dark:text-amber-300"
                            >
                              {msg.text}
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
                            <div className="mb-0.5 flex items-center gap-1.5 px-1 text-[9px] font-bold text-[var(--ink-soft)]">
                              <span>{isMe ? 'You' : selectedNpc.name}</span>
                              {msg.tag && (
                                <span className="rounded-md bg-black/5 px-1.5 py-0.2 dark:bg-white/10">
                                  {msg.emoji} {msg.tag}
                                </span>
                              )}
                              <span>· {formatTime(msg.time)}</span>
                            </div>
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[11px] font-medium leading-relaxed shadow-xs ${
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
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
