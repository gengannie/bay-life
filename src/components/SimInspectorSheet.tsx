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
import { X, Zap, Sparkles, Check, Heart } from 'lucide-react';

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

  const state = useGameStore.getState();
  const moodInfo = calculateOverallMood(state);
  const aspDef = ASPIRATIONS.find((a) => a.id === sim.aspiration);

  const TABS: Array<{ id: typeof simTab; label: string }> = [
    { id: 'needs', label: 'Needs & Mood' },
    { id: 'skills', label: 'Tech Skills' },
    { id: 'wishes', label: 'Wishes & OKRs' },
    { id: 'perks', label: `Perks (${karma} ⚡)` },
    { id: 'relationships', label: 'Network' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="apple-glass-heavy flex max-h-[84dvh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Engineer Header */}
        <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3.5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Portrait appearance={sim.appearance} size={52} ringColor={moodInfo.color} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold">{sim.name}</h3>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: moodInfo.color }}
                >
                  {moodInfo.label} ({moodInfo.score}%)
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--ink-soft)]">
                <span>
                  {aspDef?.emoji} {aspDef?.label}
                </span>
                <span>·</span>
                <span>⚡ {karma} Karma</span>
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

        {/* Segmented Control Tabs */}
        <div className="scrollbar-none my-3 flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveModal('sim', t.id)}
              className={`btn-press shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                simTab === t.id
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'bg-[var(--mist)] text-[var(--ink)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* NEEDS & MOODLETS */}
          {simTab === 'needs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {NEEDS_META.map((n) => {
                  const val = Math.round(needs[n.key]);
                  return (
                    <div key={n.key} className="rounded-2xl bg-[var(--mist)] p-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>
                          {n.emoji} {n.label}
                        </span>
                        <span style={{ color: val < 30 ? '#FF3B30' : n.color }}>{val}%</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${val}%`,
                            backgroundColor: val < 30 ? '#FF3B30' : n.color,
                          }}
                        />
                      </div>
                      {val < 38 && (
                        <div className="mt-1 text-[10px] text-rose-500">{n.lowHint}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Active Moodlets */}
              <div>
                <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Active Moodlets & Buffs
                </div>
                <div className="grid gap-2">
                  {moodlets.map((m) => {
                    const def = MOODLETS[m.id];
                    if (!def) return null;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-2xl bg-[var(--mist)] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{def.emoji}</span>
                          <div>
                            <div className="text-xs font-bold">{def.label}</div>
                            <div className="text-[11px] text-[var(--ink-soft)]">{def.desc}</div>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-extrabold ${
                            def.delta >= 0 ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          {def.delta >= 0 ? `+${def.delta}` : def.delta} Mood
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Autonomous Free Will Toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-[var(--mist)] p-3.5">
                <div>
                  <div className="text-xs font-bold">🤖 Autonomous Sim Free Will</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">
                    Automatically takes care of low needs at home when idle
                  </div>
                </div>
                <button
                  onClick={toggleFreeWill}
                  className={`btn-press rounded-full px-4 py-1.5 text-xs font-bold ${
                    freeWill ? 'bg-[#34C759] text-white' : 'bg-slate-400/30 text-[var(--ink)]'
                  }`}
                >
                  {freeWill ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}

          {/* TECH & FOUNDER SKILLS */}
          {simTab === 'skills' && (
            <div className="space-y-2.5">
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
                      <span className="rounded-full bg-[#007AFF]/15 px-2.5 py-0.5 text-xs font-extrabold text-[#007AFF]">
                        Level {lvl} / 10
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{sk.desc}</p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${lvl >= 10 ? 100 : pct}%`, backgroundColor: sk.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* WISHES & ASPIRATION */}
          {simTab === 'wishes' && (
            <div className="space-y-3">
              {aspDef && (
                <div className="rounded-2xl bg-gradient-to-r from-[#007AFF]/15 to-purple-500/15 p-3.5 border border-[#007AFF]/25">
                  <div className="text-[10px] font-bold uppercase text-[#007AFF]">
                    Life Aspiration
                  </div>
                  <div className="text-sm font-extrabold">
                    {aspDef.emoji} {aspDef.label}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)]">{aspDef.milestoneText}</div>
                </div>
              )}

              <div className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Active Daily Wishes (Complete for Karma ⚡)
              </div>
              {wishes.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--mist)] p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{w.emoji}</span>
                    <div>
                      <div className="text-xs font-bold">{w.title}</div>
                      <div className="text-[11px] text-[var(--ink-soft)]">{w.desc}</div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-extrabold text-amber-600">
                    +{w.karmaReward} ⚡
                  </span>
                </div>
              ))}

              {/* Active Traits */}
              <div className="pt-2">
                <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Your Personality Traits
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sim.traits.map((tId) => {
                    const t = TRAITS.find((item) => item.id === tId);
                    return t ? (
                      <div key={t.id} className="rounded-2xl bg-[var(--mist)] p-2.5">
                        <div className="text-xs font-bold">
                          {t.emoji} {t.label}
                        </div>
                        <div className="text-[10px] text-[var(--ink-soft)]">{t.desc}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}

          {/* KARMA REWARD PERKS */}
          {simTab === 'perks' && (
            <div className="space-y-2.5">
              {REWARD_PERKS.map((p) => {
                const owned = unlockedPerks.includes(p.id);
                const canAfford = karma >= p.cost;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--mist)] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.emoji}</span>
                      <div>
                        <div className="text-xs font-bold">{p.name}</div>
                        <div className="text-[11px] text-[var(--ink-soft)]">{p.desc}</div>
                      </div>
                    </div>
                    {owned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600">
                        <Check className="size-3.5" /> Unlocked
                      </span>
                    ) : (
                      <button
                        disabled={!canAfford}
                        onClick={() => claimPerk(p.id)}
                        className="btn-press shrink-0 rounded-xl bg-[#007AFF] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {p.cost} ⚡
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* BAY AREA RELATIONSHIPS */}
          {simTab === 'relationships' && (
            <div className="space-y-2.5">
              {NPCS.map((npc) => {
                const rel = relationships[npc.id];
                const score = rel?.score || 10;
                return (
                  <div
                    key={npc.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--mist)] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Portrait appearance={npc.appearance} size={44} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{npc.name}</span>
                          <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-bold text-[#007AFF]">
                            {rel?.status || 'Stranger'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--ink-soft)]">
                          {npc.role} · {npc.company}
                        </div>
                        <div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-pink-500"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => interactWithNpc(npc.id, 'coffeeChat')}
                      className="btn-press rounded-xl bg-[#007AFF] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Coffee Chat
                    </button>
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

