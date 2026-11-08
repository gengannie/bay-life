import React from 'react';
import {
  ASPIRATIONS,
  MOODLETS,
  NEEDS_META,
  NPCS,
  REWARD_PERKS,
  SKILLS_META,
  TRAITS,
} from '../data/worldData';
import { calculateOverallMood, useGameStore } from '../store/useGameStore';
import { Portrait } from './Portrait';
import { X, Check, Sparkles, Zap } from 'lucide-react';

export const SimInspectorSheet: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const simTab = useGameStore((s) => s.simTab);
  const needs = useGameStore((s) => s.needs);
  const skills = useGameStore((s) => s.skills);
  const moodlets = useGameStore((s) => s.moodlets);
  const wishes = useGameStore((s) => s.wishes);
  const karma = useGameStore((s) => s.karma);
  const unlockedPerks = useGameStore((s) => s.unlockedPerks);
  const relationships = useGameStore((s) => s.relationships);
  const freeWill = useGameStore((s) => s.freeWill);
  const toggleFreeWill = useGameStore((s) => s.toggleFreeWill);
  const claimPerk = useGameStore((s) => s.claimPerk);
  const interactWithNpc = useGameStore((s) => s.interactWithNpc);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const autoFixNeed = useGameStore((s) => s.autoFixNeed);

  const state = useGameStore.getState();
  const moodInfo = calculateOverallMood(state);
  const aspDef = ASPIRATIONS.find((a) => a.id === sim.aspiration);

  const TABS: Array<{ id: typeof simTab; label: string; emoji: string }> = [
    { id: 'needs', label: 'Vitals', emoji: '❤️' },
    { id: 'skills', label: 'Skills', emoji: '🧠' },
    { id: 'wishes', label: 'OKRs', emoji: '🎯' },
    { id: 'perks', label: `${karma} ⚡`, emoji: '✨' },
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
        className="apple-glass-heavy flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-[34px] p-5"
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
                          <div className="truncate text-xs font-bold">{n.shortLabel}</div>
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

          {/* TECH & FOUNDER SKILLS (Visual 10-Segment Bars) */}
          {simTab === 'skills' && (
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
                          <div className="truncate text-xs font-bold">{w.title}</div>
                          <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-amber-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
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

          {/* KARMA REWARD PERKS */}
          {simTab === 'perks' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {REWARD_PERKS.map((p) => {
                const owned = unlockedPerks.includes(p.id);
                const canAfford = karma >= p.cost;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between gap-2.5 rounded-2xl bg-[var(--mist)] p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl">{p.emoji}</span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold">{p.name}</div>
                        <div className="line-clamp-2 text-[10px] text-[var(--ink-soft)]">
                          {p.desc}
                        </div>
                      </div>
                    </div>
                    {owned ? (
                      <span className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500/20 py-1.5 text-[11px] font-bold text-emerald-600">
                        <Check className="size-3.5" /> Active
                      </span>
                    ) : (
                      <button
                        disabled={!canAfford}
                        onClick={() => claimPerk(p.id)}
                        className="btn-press w-full rounded-xl bg-[#007AFF] py-1.5 text-xs font-extrabold text-white disabled:opacity-40"
                      >
                        Unlock · {p.cost} ⚡
                      </button>
                    )}
                  </div>
                );
              })}
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
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-bold">{npc.name}</span>
                          <span className="shrink-0 rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[9px] font-extrabold text-[#007AFF]">
                            {rel?.status || 'Stranger'}
                          </span>
                        </div>
                        <div className="truncate text-[10px] text-[var(--ink-soft)]">
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
