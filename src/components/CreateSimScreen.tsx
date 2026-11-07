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
const OUTFITS: Array<{ id: SimAppearance['outfit']; label: string }> = [
  { id: 'patagonia', label: 'Patagonia Vest' },
  { id: 'ychoodie', label: 'YC Startup Hoodie' },
  { id: 'turtleneck', label: 'Keynote Turtleneck' },
  { id: 'arcteryx', label: 'Arc’teryx Shell' },
  { id: 'founderlinen', label: 'Sand Hill Blazer' },
];
const TOP_COLORS = ['#007AFF', '#EA580C', '#1E293B', '#0D9488', '#7C3AED', '#E11D48', '#15803D'];
const ACCESSORIES: Array<{ id: SimAppearance['accessory']; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'glasses', label: 'Blue-Light Frames' },
  { id: 'airpodsmax', label: 'AirPods Max' },
  { id: 'visionpro', label: 'Vision Pro' },
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

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#dbeafe_0%,#f1f5f9_100%)] dark:bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)]">
      {/* Top Navigation Bar */}
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={() => (step === 1 ? setScreen('title') : setStep((step - 1) as 1 | 2))}
          className="apple-pill btn-press flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="size-3.5" />
          {step === 1 ? 'Title' : 'Back'}
        </button>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-7 bg-[#007AFF]' : s < step ? 'w-2 bg-[#007AFF]/50' : 'w-2 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={randomize}
          className="apple-pill btn-press flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#007AFF]"
        >
          <Shuffle className="size-3.5" />
          Randomize
        </button>
      </div>

      {/* Main Scrollable Card Area */}
      <div className="mx-auto flex-1 w-full max-w-2xl overflow-y-auto px-5 pb-6">
        <div className="apple-glass-heavy rounded-3xl p-5 sm:p-6">
          {/* Persistent Engineer Header Preview */}
          <div className="mb-5 flex items-center gap-4 border-b border-black/5 pb-4 dark:border-white/10">
            <Portrait appearance={appearance} size={68} ringColor="#007AFF" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold tracking-wider text-[#007AFF] uppercase">
                Step {step} of 3 ·{' '}
                {step === 1
                  ? 'Identity & Look'
                  : step === 2
                  ? 'Traits & Aspiration'
                  : 'Origin & Bay Area Home'}
              </div>
              <h2 className="truncate text-xl font-extrabold">{name || 'Your Engineer'}</h2>
              <p className="text-xs text-[var(--ink-soft)]">
                {handle} · {OUTFITS.find((o) => o.id === appearance.outfit)?.label}
              </p>
            </div>
          </div>

          {/* STEP 1: IDENTITY & LOOK */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--ink-soft)]">
                    Full Name
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
                  <label className="mb-1 block text-xs font-semibold text-[var(--ink-soft)]">
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

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--ink-soft)]">
                  Skin Tone
                </label>
                <div className="flex flex-wrap gap-2.5">
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--ink-soft)]">
                    Hairstyle
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {HAIR_STYLES.map((h) => (
                      <button
                        key={h}
                        onClick={() => setAppearance({ ...appearance, hair: h })}
                        className={`btn-press rounded-xl px-3 py-1.5 text-xs font-semibold capitalize ${
                          appearance.hair === h
                            ? 'bg-[#007AFF] text-white'
                            : 'bg-[var(--mist)] text-[var(--ink)]'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--ink-soft)]">
                    Hair Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {HAIR_COLORS.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setAppearance({ ...appearance, hairColor: hex })}
                        className={`btn-press size-7 rounded-full border-2 ${
                          appearance.hairColor === hex
                            ? 'scale-110 border-[#007AFF]'
                            : 'border-white/50'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--ink-soft)]">
                  Signature Bay Area Fit
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {OUTFITS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setAppearance({ ...appearance, outfit: o.id })}
                      className={`btn-press rounded-xl px-3 py-2 text-xs font-semibold ${
                        appearance.outfit === o.id
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[var(--mist)] text-[var(--ink)]'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--ink-soft)]">
                    Accent Color
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
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--ink-soft)]">
                    Wearable Tech
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCESSORIES.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => setAppearance({ ...appearance, accessory: acc.id })}
                        className={`btn-press rounded-xl px-2.5 py-1.5 text-xs font-semibold ${
                          appearance.accessory === acc.id
                            ? 'bg-[#007AFF] text-white'
                            : 'bg-[var(--mist)] text-[var(--ink)]'
                        }`}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TRAITS & ASPIRATION */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Engineer Traits (Pick 2)
                  </label>
                  <span className="text-xs font-semibold text-[#007AFF]">
                    {selectedTraits.length}/2 selected
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {TRAITS.map((tr) => {
                    const active = selectedTraits.includes(tr.id);
                    return (
                      <button
                        key={tr.id}
                        onClick={() => toggleTrait(tr.id)}
                        className={`btn-press flex items-start gap-3 rounded-2xl p-3 text-left border transition-all ${
                          active
                            ? 'border-[#007AFF] bg-[#007AFF]/12'
                            : 'border-transparent bg-[var(--mist)]'
                        }`}
                      >
                        <span className="text-2xl">{tr.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{tr.label}</span>
                            {active && <Check className="size-3.5 text-[#007AFF]" />}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{tr.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Silicon Valley Life Aspiration (Pick 1)
                </label>
                <div className="grid gap-2">
                  {ASPIRATIONS.map((asp) => {
                    const active = aspiration === asp.id;
                    return (
                      <button
                        key={asp.id}
                        onClick={() => setAspiration(asp.id)}
                        className={`btn-press flex items-center gap-3 rounded-2xl p-3 text-left border ${
                          active
                            ? 'border-[#007AFF] bg-[#007AFF]/12'
                            : 'border-transparent bg-[var(--mist)]'
                        }`}
                      >
                        <span className="text-2xl">{asp.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold">{asp.label}</div>
                          <div className="text-[11px] text-[var(--ink-soft)]">{asp.desc}</div>
                        </div>
                        {active && <Check className="size-4 text-[#007AFF]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ORIGIN & STARTER HOME */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Your Background & Runway
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ORIGINS.map((org) => {
                    const active = origin === org.id;
                    return (
                      <button
                        key={org.id}
                        onClick={() => {
                          setOrigin(org.id);
                          setHomeId(org.defaultHome);
                        }}
                        className={`btn-press flex flex-col justify-between rounded-2xl p-3 text-left border ${
                          active
                            ? 'border-[#007AFF] bg-[#007AFF]/12'
                            : 'border-transparent bg-[var(--mist)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold">
                              {org.emoji} {org.name}
                            </span>
                            <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-bold text-[#007AFF]">
                              {org.badge}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--ink-soft)]">{org.desc}</p>
                        </div>
                        <div className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {org.perkText}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Starter Neighborhood Apartment
                </label>
                <div className="grid gap-2">
                  {HOMES.slice(0, 4).map((h) => {
                    const active = homeId === h.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => setHomeId(h.id)}
                        className={`btn-press flex items-center justify-between gap-3 rounded-2xl p-3 text-left border ${
                          active
                            ? 'border-[#007AFF] bg-[#007AFF]/12'
                            : 'border-transparent bg-[var(--mist)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{h.emoji}</span>
                          <div>
                            <div className="text-xs font-bold">
                              {h.name} · <span className="text-[#007AFF]">{h.area}</span>
                            </div>
                            <div className="text-[11px] text-[var(--ink-soft)]">{h.tagline}</div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-bold">{formatCurrency(h.weeklyRent)}/wk</div>
                          <div className="text-[10px] text-[var(--ink-soft)]">
                            {h.gridSize}×{h.gridSize} loft
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Button */}
          <div className="mt-6">
            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as 2 | 3)}
                className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#007AFF] text-sm font-semibold text-white shadow-md shadow-[#007AFF]/25"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#34C759] text-[15px] font-bold text-white shadow-md shadow-emerald-500/25"
              >
                <Sparkles className="size-4" />
                Move Into the Bay Area
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

