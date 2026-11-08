import React, { useState } from 'react';
import {
  ASPIRATIONS,
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
import { RewardPerkBranchId } from '../types/game';
import { calculateOverallMood, useGameStore } from '../store/useGameStore';
import { Portrait } from './Portrait';
import { X, Check, Sparkles, Zap, Lock, ArrowDown, GitBranch } from 'lucide-react';

export const SimInspectorSheet: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const simTab = useGameStore((s) => s.simTab);
  const needs = useGameStore((s) => s.needs);
  const skills = useGameStore((s) => s.skills);
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
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const autoFixNeed = useGameStore((s) => s.autoFixNeed);

  const state = useGameStore.getState();
  const moodInfo = calculateOverallMood(state);
  const aspDef = ASPIRATIONS.find((a) => a.id === sim.aspiration);
  const [perkBranch, setPerkBranch] = useState<'all' | RewardPerkBranchId>('all');

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
          simTab === 'perks' ? 'max-w-3xl' : 'max-w-lg'
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
              {aspDef && (
                <div className="flex items-center justify-between rounded-2xl border border-[#007AFF]/25 bg-gradient-to-r from-[#007AFF]/15 to-purple-500/15 p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{aspDef.emoji}</span>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#007AFF]">
                        North Star OKR
                      </div>
                      <div className="text-sm font-extrabold">{aspDef.label}</div>
                      <div className="text-[11px] text-[var(--ink-soft)]">
                        {aspDef.milestoneText}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#007AFF] px-2.5 py-1 text-[10px] font-extrabold text-white">
                    +$50k 🏆
                  </span>
                </div>
              )}

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
                      <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        +{w.karmaReward} ⚡
                      </span>
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

          {/* BAY AREA RELATIONSHIPS */}
          {simTab === 'relationships' && (
            <div className="space-y-2">
              {NPCS.map((npc) => {
                const rel = relationships[npc.id];
                const score = rel?.score || 10;
                return (
                  <div
                    key={npc.id}
                    className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--mist)] p-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Portrait appearance={npc.appearance} size={42} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold">{npc.name}</span>
                          <span className="shrink-0 rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[9px] font-extrabold text-[#007AFF]">
                            {rel?.status || 'Stranger'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--ink-soft)]">
                          {npc.role} · {npc.company}
                        </div>
                        <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-pink-500 transition-all"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => interactWithNpc(npc.id, 'coffeeChat')}
                        title="Coffee Chat"
                        className="btn-press rounded-xl bg-[#007AFF]/15 px-2.5 py-1.5 text-xs font-bold text-[#007AFF]"
                      >
                        ☕
                      </button>
                      <button
                        onClick={() => interactWithNpc(npc.id, 'whiteboard')}
                        title="Whiteboard Jam"
                        className="btn-press rounded-xl bg-purple-500/15 px-2.5 py-1.5 text-xs font-bold text-purple-600 dark:text-purple-400"
                      >
                        🧠
                      </button>
                      <button
                        onClick={() => interactWithNpc(npc.id, 'pitch')}
                        title="Co-Founder Pitch"
                        className="btn-press rounded-xl bg-emerald-500/15 px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                      >
                        🦄
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
