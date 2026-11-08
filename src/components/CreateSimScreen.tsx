import React, { useState } from 'react';
import { ASPIRATIONS, HOMES, ORIGINS, TRAITS } from '../data/worldData';
import { formatCurrency, useGameStore } from '../store/useGameStore';
import {
  AspirationId,
  OriginId,
  SimAppearance,
  SimProfile,
  TraitId,
} from '../types/game';
import { Portrait } from './Portrait';
import { ArrowLeft, ArrowRight, Shuffle, Sparkles, Check } from 'lucide-react';

const SKIN_TONES = ['#F8DFC8', '#E8B89A', '#D49B72', '#B87A52', '#8D5524', '#5C3818'];
const HAIR_STYLES: SimAppearance['hair'][] = [
  'textured',
  'lowcut',
  'parted',
  'bob',
  'waves',
  'bun',
  'curly',
];
const HAIR_COLORS = ['#18181B', '#3F2E21', '#7C2D12', '#D97706', '#475569', '#6366F1'];
const OUTFITS: Array<{ id: SimAppearance['outfit']; label: string; emoji: string }> = [
  { id: 'patagonia', label: 'Patagonia Vest', emoji: '🦺' },
  { id: 'ychoodie', label: 'YC Hoodie', emoji: '🧡' },
  { id: 'turtleneck', label: 'Keynote Black', emoji: '🖤' },
  { id: 'arcteryx', label: 'Arc’teryx Shell', emoji: '🧥' },
  { id: 'founderlinen', label: 'Sand Hill Blazer', emoji: '👔' },
];
const TOP_COLORS = ['#007AFF', '#EA580C', '#1E293B', '#0D9488', '#7C3AED', '#E11D48', '#15803D'];
const ACCESSORIES: Array<{ id: SimAppearance['accessory']; label: string; emoji: string }> = [
  { id: 'none', label: 'Bare', emoji: '✨' },
  { id: 'glasses', label: 'Blue-Light', emoji: '👓' },
  { id: 'airpodsmax', label: 'AirPods Max', emoji: '🎧' },
  { id: 'visionpro', label: 'Vision Pro', emoji: '🥽' },
];

const RANDOM_NAMES = [
  'Alex Chen',
  'Rohan Sharma',
  'Elena Rostova',
  'Marcus Vance',
  'Sora Takahashi',
  'Chloe Nguyen',
  'Devon Brooks',
  'Aria Patel',
];

const TRAIT_BENTO: Record<TraitId, { tag: string; badge: string }> = {
  tenXEngineer: { tag: 'Ships clean PRs fast', badge: '📈 1.3x Code XP' },
  coffeeSnob: { tag: 'Single-origin espresso purist', badge: '☕ +35% Energy' },
  exFounder: { tag: 'Reality distortion pitch aura', badge: '📈 1.25x Pitch XP' },
  leetcodeGrinder: { tag: 'DP & graph speedrunner', badge: '🚀 +25% Promo' },
  biohacker: { tag: 'Cold plunge & HRV optimizer', badge: '🧬 -25% Drain' },
  blindPoster: { tag: 'TC or GTFO shitposter', badge: '💬 +30% Social' },
};

const ASPIRATION_BENTO: Record<AspirationId, { tag: string; badge: string }> = {
  fireFreedom: { tag: 'Compound ETFs to 100%+ burn coverage', badge: '🔥 $500k F.I.R.E.' },
  breakHandcuffs: { tag: 'Vest RSUs, build MRR & quit corporate W-2', badge: '🔓 Quit W-2 Free' },
  seriesAUnicorn: { tag: 'Bootstrap to Sequoia unicorn', badge: '🦄 $1B Valuation' },
  staffPrincipal: { tag: 'Climb the IC ladder', badge: '👑 L8 Principal' },
  paloAltoHome: { tag: 'Acquire luxury Bay estate', badge: '💎 $1.5M Worth' },
  sfConnector: { tag: 'Befriend Silicon Valley icons', badge: '🤝 4 Co-Founders' },
  indieLegend: { tag: 'Master frontier tech stack', badge: '🧠 Lvl 10 Skills' },
};

const ORIGIN_BENTO: Record<OriginId, { tag: string; chips: string[] }> = {
  newgrad: {
    tag: 'CS degree & hacker bunk',
    chips: ['💵 $4.8k', '📈 1.2x Code', '✨ $0 Debt'],
  },
  ycdropout: {
    tag: 'Left Stanford with SAFE note',
    chips: ['💵 $18k', '🚀 25% MVP', '🏦 $15k Note'],
  },
  h1bhustler: {
    tag: '400 LeetCode Hards memorized',
    chips: ['💵 $6.5k', '💎 $4k RSU', '📈 Lvl 2 Code'],
  },
  nepo: {
    tag: 'Early Google family office',
    chips: ['💵 $55k', '💎 $25k RSU', '🏎️ Free Tesla'],
  },
};

const HOME_BENTO: Record<string, { tag: string; perk: string }> = {
  daly_city_inlaw: { tag: 'Foggy BART garage studio', perk: '🛋️ 5 Gear' },
  sunnyvale_hacker: { tag: 'Whiteboards & fiber bunk', perk: '☕ 6 Gear' },
  mission_studio: { tag: 'Sunny Dolores walk-up', perk: '☀️ 7 Gear' },
  soma_loft: { tag: 'Concrete YC founder loft', perk: '🔋 Power Backup' },
  pac_heights_victorian: { tag: 'Golden Gate view mansion', perk: '⚡ Powerwall' },
};

export const CreateSimScreen: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const startNewGame = useGameStore((s) => s.startNewGame);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('Alex Chen');
  const [handle, setHandle] = useState('@alexbuilds');
  const [appearance, setAppearance] = useState<SimAppearance>({
    body: 'm',
    skin: '#E8B89A',
    hair: 'textured',
    hairColor: '#18181B',
    outfit: 'patagonia',
    topColor: '#007AFF',
    accessory: 'glasses',
  });
  const [selectedTraits, setSelectedTraits] = useState<TraitId[]>(['tenXEngineer', 'coffeeSnob']);
  const [aspiration, setAspiration] = useState<AspirationId>('seriesAUnicorn');
  const [origin, setOrigin] = useState<OriginId>('newgrad');
  const [homeId, setHomeId] = useState<string>('sunnyvale_hacker');

  const randomize = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const rName = pick(RANDOM_NAMES);
    setName(rName);
    setHandle(`@${rName.toLowerCase().replace(/\s+/g, '')}`);
    setAppearance({
      body: pick(['m', 'f', 'nb']),
      skin: pick(SKIN_TONES),
      hair: pick(HAIR_STYLES),
      hairColor: pick(HAIR_COLORS),
      outfit: pick(OUTFITS).id,
      topColor: pick(TOP_COLORS),
      accessory: pick(ACCESSORIES).id,
    });

    // Shuffle 2 distinct traits
    const shuffledTraits = [...TRAITS].sort(() => Math.random() - 0.5);
    setSelectedTraits([shuffledTraits[0].id, shuffledTraits[1].id]);

    // Shuffle aspiration & origin + starter home
    const randAsp = pick(ASPIRATIONS);
    const randOrigin = pick(ORIGINS);
    setAspiration(randAsp.id);
    setOrigin(randOrigin.id);
    setHomeId(randOrigin.defaultHome);
  };

  const toggleTrait = (id: TraitId) => {
    if (selectedTraits.includes(id)) {
      if (selectedTraits.length > 1) {
        setSelectedTraits(selectedTraits.filter((t) => t !== id));
      }
    } else if (selectedTraits.length < 2) {
      setSelectedTraits([...selectedTraits, id]);
    } else {
      setSelectedTraits([selectedTraits[1], id]);
    }
  };

  const handleLaunch = () => {
    const profile: SimProfile = {
      name: name.trim() || 'Alex Chen',
      handle: handle.trim() || '@alexbuilds',
      appearance,
      traits: selectedTraits,
      aspiration,
      origin,
    };
    startNewGame(profile, homeId);
  };

  const activeOrigin = ORIGINS.find((o) => o.id === origin) || ORIGINS[0];
  const activeAsp = ASPIRATIONS.find((a) => a.id === aspiration) || ASPIRATIONS[0];
  const activeHome = HOMES.find((h) => h.id === homeId) || HOMES[1];

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#dbeafe_0%,#f1f5f9_100%)] dark:bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)]">
      {/* Top Navigation Bar */}
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-4 pb-2.5">
        <button
          onClick={() => (step === 1 ? setScreen('title') : setStep((step - 1) as 1 | 2))}
          className="apple-pill btn-press flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="size-3.5" />
          {step === 1 ? 'Title' : 'Back'}
        </button>

        {/* Interactive Step Pills */}
        <div className="flex items-center gap-1.5">
          {([1, 2, 3] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`h-2.5 rounded-full transition-all ${
                s === step
                  ? 'w-8 bg-[#007AFF]'
                  : s < step
                  ? 'w-2.5 bg-[#007AFF]/50'
                  : 'w-2.5 bg-slate-300 dark:bg-slate-700'
              }`}
              aria-label={`Step ${s}`}
            />
          ))}
        </div>

        <button
          onClick={randomize}
          className="apple-pill btn-press flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-[#007AFF] shadow-sm"
        >
          <Shuffle className="size-3.5" />
          <span>🎲 Randomize Preset</span>
        </button>
      </div>

      {/* Main Scrollable Card Area */}
      <div className="mx-auto flex-1 w-full max-w-2xl overflow-y-auto px-5 pb-6">
        <div className="apple-glass-heavy rounded-3xl p-5 sm:p-6">
          {/* Persistent Engineer Bento Header Preview */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4 dark:border-white/10">
            <div className="flex items-center gap-3.5">
              <Portrait appearance={appearance} size={64} ringColor="#007AFF" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold tracking-wider text-[#007AFF] uppercase">
                  Step {step} of 3 ·{' '}
                  {step === 1
                    ? 'Identity & Look'
                    : step === 2
                    ? 'Traits & Goal'
                    : 'Runway & Loft'}
                </div>
                <h2 className="text-xl font-extrabold leading-snug">{name || 'Your Engineer'}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-lg bg-[var(--mist)] px-2 py-0.5 text-[10px] font-bold">
                    {handle}
                  </span>
                  <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    💵 {formatCurrency(activeOrigin.cashBonus)}
                  </span>
                  <span className="rounded-lg bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-bold text-[#007AFF]">
                    {activeAsp.emoji} {activeAsp.label}
                  </span>
                  <span className="rounded-lg bg-[var(--mist)] px-2 py-0.5 text-[10px] font-bold">
                    {activeHome.emoji} {activeHome.gridSize}×{activeHome.gridSize} Grid
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 1: IDENTITY & LOOK */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Engineer Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-[var(--mist)] px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#007AFF]"
                    placeholder="Alex Chen"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    X / GitHub Handle
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="w-full rounded-xl bg-[var(--mist)] px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#007AFF]"
                    placeholder="@alexbuilds"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Skin Tone
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SKIN_TONES.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setAppearance({ ...appearance, skin: hex })}
                        className={`btn-press size-8 rounded-full border-2 ${
                          appearance.skin === hex
                            ? 'scale-110 border-[#007AFF] ring-2 ring-[#007AFF]/30'
                            : 'border-white/60'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Hair Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {HAIR_COLORS.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setAppearance({ ...appearance, hairColor: hex })}
                        className={`btn-press size-8 rounded-full border-2 ${
                          appearance.hairColor === hex
                            ? 'scale-110 border-[#007AFF] ring-2 ring-[#007AFF]/30'
                            : 'border-white/50'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Hairstyle
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {HAIR_STYLES.map((h) => (
                    <button
                      key={h}
                      onClick={() => setAppearance({ ...appearance, hair: h })}
                      className={`btn-press rounded-xl px-3 py-1.5 text-xs font-bold capitalize ${
                        appearance.hair === h
                          ? 'bg-[#007AFF] text-white shadow-sm'
                          : 'bg-[var(--mist)] text-[var(--ink)]'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Signature Bay Area Fit
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {OUTFITS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setAppearance({ ...appearance, outfit: o.id })}
                      className={`btn-press flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                        appearance.outfit === o.id
                          ? 'bg-[#007AFF] text-white shadow-sm'
                          : 'bg-[var(--mist)] text-[var(--ink)]'
                      }`}
                    >
                      <span>{o.emoji}</span>
                      <span className="leading-snug">{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Fit Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TOP_COLORS.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setAppearance({ ...appearance, topColor: hex })}
                        className={`btn-press size-7 rounded-full border-2 ${
                          appearance.topColor === hex
                            ? 'scale-110 border-[#007AFF]'
                            : 'border-white/50'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Wearable Tech
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ACCESSORIES.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => setAppearance({ ...appearance, accessory: acc.id })}
                        className={`btn-press flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                          appearance.accessory === acc.id
                            ? 'bg-[#007AFF] text-white shadow-sm'
                            : 'bg-[var(--mist)] text-[var(--ink)]'
                        }`}
                      >
                        <span>{acc.emoji}</span>
                        <span className="leading-snug">{acc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VISUAL BENTO TRAITS & ASPIRATION */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Engineer Perks (Pick 2)
                  </label>
                  <span className="rounded-full bg-[#007AFF]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#007AFF]">
                    {selectedTraits.length}/2 Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {TRAITS.map((tr) => {
                    const active = selectedTraits.includes(tr.id);
                    const meta = TRAIT_BENTO[tr.id];
                    return (
                      <button
                        key={tr.id}
                        onClick={() => toggleTrait(tr.id)}
                        className={`btn-press flex flex-col justify-between rounded-2xl p-3 text-left border transition-all ${
                          active
                            ? 'border-[#007AFF] bg-[#007AFF]/12 shadow-sm'
                            : 'border-transparent bg-[var(--mist)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{tr.emoji}</span>
                            {active && (
                              <span className="grid size-5 place-items-center rounded-full bg-[#007AFF] text-white">
                                <Check className="size-3" />
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 text-xs font-extrabold">{tr.label}</div>
                          <p className="mt-0.5 text-[10px] font-medium text-[var(--ink-soft)]">
                            {meta.tag}
                          </p>
                        </div>
                        <div className="mt-2.5 inline-flex w-fit items-center rounded-lg bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                          {meta.badge}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  North Star Goal (Pick 1)
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ASPIRATIONS.map((asp) => {
                    const active = aspiration === asp.id;
                    const meta = ASPIRATION_BENTO[asp.id];
                    return (
                      <button
                        key={asp.id}
                        onClick={() => setAspiration(asp.id)}
                        className={`btn-press flex items-center justify-between gap-2.5 rounded-2xl p-3 text-left border transition-all ${
                          active
                            ? 'border-[#007AFF] bg-[#007AFF]/12 shadow-sm'
                            : 'border-transparent bg-[var(--mist)]'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/60 text-xl dark:bg-white/10">
                            {asp.emoji}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold leading-snug">{asp.label}</div>
                            <div className="text-[10px] font-medium leading-snug text-[var(--ink-soft)]">
                              {meta.tag}
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          {meta.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VISUAL BENTO ORIGINS & STARTER HOMES */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Starting Runway & Background
                </label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {ORIGINS.map((org) => {
                    const active = origin === org.id;
                    const meta = ORIGIN_BENTO[org.id];
                    return (
                      <button
                        key={org.id}
                        onClick={() => {
                          setOrigin(org.id);
                          setHomeId(org.defaultHome);
                        }}
                        className={`btn-press flex flex-col justify-between rounded-2xl p-3.5 text-left border transition-all ${
                          active
                            ? 'border-[#007AFF] bg-[#007AFF]/12 shadow-sm'
                            : 'border-transparent bg-[var(--mist)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold">
                              {org.emoji} {org.name}
                            </span>
                            {active && <Check className="size-4 text-[#007AFF]" />}
                          </div>
                          <p className="mt-0.5 text-[11px] font-medium text-[var(--ink-soft)]">
                            {meta.tag}
                          </p>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {meta.chips.map((chip) => (
                            <span
                              key={chip}
                              className="rounded-lg bg-white/70 px-2 py-0.5 text-[10px] font-extrabold text-[var(--ink)] dark:bg-white/10"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Starter Bay Area Apartment
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {HOMES.map((h) => {
                    const active = homeId === h.id;
                    const meta = HOME_BENTO[h.id] || {
                      tag: h.area,
                      perk: `${h.starterObjects.length} Gear`,
                    };
                    return (
                      <button
                        key={h.id}
                        onClick={() => setHomeId(h.id)}
                        className={`btn-press flex flex-col justify-between rounded-2xl p-3 text-left border transition-all ${
                          active
                            ? 'border-[#007AFF] bg-[#007AFF]/12 shadow-sm'
                            : 'border-transparent bg-[var(--mist)]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/60 text-xl dark:bg-white/10">
                            {h.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-700 dark:text-amber-300">
                                {h.tierLabel}
                              </span>
                            </div>
                            <div className="mt-0.5 text-xs font-extrabold leading-snug">{h.name}</div>
                            <div className="text-[10px] font-medium leading-snug text-[var(--ink-soft)]">
                              {h.commuteSummary || meta.tag}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1">
                          <span className="rounded-lg bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                            🏠 {h.gridSize}×{h.gridSize}
                          </span>
                          <span className="rounded-lg bg-white/70 px-2 py-0.5 text-[10px] font-extrabold dark:bg-white/10">
                            💸 {formatCurrency(h.weeklyRent)}/wk
                          </span>
                          {h.perks.slice(0, 2).map((p, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300"
                            >
                              {p.emoji} {p.label}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Button */}
          <div className="mt-6 flex gap-2.5">
            {step < 3 ? (
              <>
                <button
                  onClick={() => setStep((step + 1) as 2 | 3)}
                  className="btn-press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#007AFF] text-sm font-bold text-white shadow-md shadow-[#007AFF]/25"
                >
                  Next Step
                  <ArrowRight className="size-4" />
                </button>
                <button
                  onClick={handleLaunch}
                  className="btn-press flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-[#34C759] px-5 text-xs font-extrabold text-white shadow-md shadow-emerald-500/25"
                >
                  <Sparkles className="size-4" />
                  Instant Launch
                </button>
              </>
            ) : (
              <button
                onClick={handleLaunch}
                className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#34C759] text-[15px] font-bold text-white shadow-md shadow-emerald-500/25"
              >
                <Sparkles className="size-4" />
                Move Into {activeHome.name}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


