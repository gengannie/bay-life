import React, { useState } from 'react';
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
  Check,
  Sparkles,
  Car,
  Heart,
} from 'lucide-react';

export const BayPhoneModal: React.FC = () => {
  const phoneApp = useGameStore((s) => s.phoneApp);
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

  const [startupNameInput, setStartupNameInput] = useState(startup.name);
  const [startupTagInput, setStartupTagInput] = useState(startup.tagline);

  const state = useGameStore.getState();
  const netWorth = calculateNetWorth(state);
  const currentCareer = job ? CAREER_BY_ID[job.careerId] : null;
  const currentLevel = currentCareer && job ? currentCareer.levels[job.levelIndex] : null;
  const nextLevel = currentCareer && job ? currentCareer.levels[job.levelIndex + 1] : null;

  const APPS: Array<{ id: typeof phoneApp; label: string; icon: React.ReactNode; color: string }> = [
    { id: 'levels', label: 'Levels.fyi', icon: <Briefcase className="size-4" />, color: '#007AFF' },
    { id: 'wealth', label: 'Schwab', icon: <TrendingUp className="size-4" />, color: '#34C759' },
    { id: 'startup', label: 'YC Studio', icon: <Rocket className="size-4" />, color: '#FF9500' },
    { id: 'doordash', label: 'DoorDash', icon: <ShoppingBag className="size-4" />, color: '#FF3B30' },
    { id: 'zillow', label: 'Zillow Bay', icon: <Home className="size-4" />, color: '#5856D6' },
    { id: 'blind', label: 'Blind & Chat', icon: <MessageSquare className="size-4" />, color: '#AF52DE' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm"
      onClick={() => setActiveModal(null)}
    >
      {/* iPhone 16 Pro / BayOS Frame */}
      <div
        className="apple-glass-heavy relative flex h-[86dvh] w-full max-w-md flex-col overflow-hidden rounded-[40px] border-2 border-white/50 shadow-2xl dark:border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Island Top Status Bar */}
        <div className="flex items-center justify-between px-6 pt-3.5 pb-2 text-xs font-semibold">
          <span>{formatTime(time)}</span>
          <div className="h-5 w-24 rounded-full bg-black/90 dark:bg-black" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(cash)}
            </span>
            <button
              onClick={() => setActiveModal(null)}
              className="btn-press grid size-6 place-items-center rounded-full bg-[var(--mist)]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* App Switcher Segmented Dock */}
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto border-b border-black/5 px-4 pb-2.5 dark:border-white/10">
          {APPS.map((app) => {
            const active = phoneApp === app.id;
            return (
              <button
                key={app.id}
                onClick={() => setActiveModal('phone', app.id)}
                className={`btn-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? 'bg-[#007AFF] text-white shadow-sm'
                    : 'bg-[var(--mist)] text-[var(--ink)]'
                }`}
              >
                {app.icon}
                <span>{app.label}</span>
              </button>
            );
          })}
        </div>

        {/* App Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. LEVELS.FYI & CAREER LADDER */}
          {phoneApp === 'levels' && (
            <div className="space-y-4">
              {currentCareer && currentLevel && job && (
                <div className="rounded-3xl bg-gradient-to-br from-[#007AFF]/15 to-indigo-500/10 p-4 border border-[#007AFF]/25">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-wider text-[#007AFF] uppercase">
                      Current Role · {currentCareer.district}
                    </span>
                    <span className="rounded-full bg-[#007AFF] px-2.5 py-0.5 text-xs font-extrabold text-white">
                      {currentLevel.code}
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-extrabold">
                    {currentCareer.emoji} {currentCareer.company}
                  </h3>
                  <p className="text-xs font-medium text-[var(--ink-soft)]">{currentLevel.title}</p>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-white/60 p-2.5 text-center dark:bg-black/30">
                    <div>
                      <div className="text-[10px] text-[var(--ink-soft)]">Total Comp</div>
                      <div className="text-xs font-extrabold text-[#007AFF]">
                        {formatCurrency(currentLevel.baseSalary + currentLevel.rsuAnnual)}/yr
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--ink-soft)]">Shift Cash</div>
                      <div className="text-xs font-extrabold text-emerald-600">
                        +{formatCurrency(currentLevel.shiftPay)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--ink-soft)]">Shift RSU</div>
                      <div className="text-xs font-extrabold text-purple-600">
                        +{formatCurrency(currentLevel.rsuPerShift)}
                      </div>
                    </div>
                  </div>

                  {/* Promo Progress */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Promo Packet Readiness</span>
                      <span>{Math.round(job.performance)}% / 92%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#007AFF] transition-all"
                        style={{ width: `${job.performance}%` }}
                      />
                    </div>
                    {nextLevel && (
                      <div className="mt-1.5 text-[11px] text-[var(--ink-soft)]">
                        Next Level: <b>{nextLevel.code} {nextLevel.title}</b> (Requires{' '}
                        {nextLevel.requiredSkill.skill} Lv.{nextLevel.requiredSkill.level} · You are Lv.
                        {Math.floor(skills[nextLevel.requiredSkill.skill])})
                      </div>
                    )}
                  </div>

                  <div className="mt-3.5 flex items-center gap-2">
                    <button
                      onClick={startWorkShift}
                      className="btn-press flex-1 rounded-2xl bg-[#007AFF] py-2.5 text-xs font-bold text-white shadow-sm"
                    >
                      Clock In for Shift Now
                    </button>
                    <button
                      onClick={toggleAutoWork}
                      className={`btn-press rounded-2xl px-3 py-2.5 text-xs font-semibold ${
                        job.autoWork
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[var(--mist)] text-[var(--ink)]'
                      }`}
                    >
                      Auto-Work: {job.autoWork ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Bay Area Tech Companies Hiring
                </h4>
                <div className="space-y-2.5">
                  {CAREERS.map((c) => {
                    const isCurrent = job?.careerId === c.id;
                    const entry = c.levels[0];
                    const top = c.levels[c.levels.length - 1];
                    return (
                      <div
                        key={c.id}
                        className="rounded-2xl bg-[var(--mist)] p-3.5 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold">
                              {c.emoji} {c.company}
                            </div>
                            <div className="text-xs text-[var(--ink-soft)]">{c.name} · {c.district}</div>
                          </div>
                          <span className="rounded-full bg-[#007AFF]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#007AFF]">
                            {entry.code} → {top.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--ink-soft)]">{c.tagline}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(entry.baseSalary + entry.rsuAnnual)} –{' '}
                            {formatCurrency(top.baseSalary + top.rsuAnnual)}/yr
                          </span>
                          <button
                            disabled={isCurrent}
                            onClick={() => applyJob(c.id)}
                            className={`btn-press rounded-xl px-3.5 py-1.5 text-xs font-bold ${
                              isCurrent
                                ? 'bg-emerald-500/20 text-emerald-600'
                                : 'bg-[#007AFF] text-white'
                            }`}
                          >
                            {isCurrent ? 'Employed Here' : 'Accept Offer'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. SCHWAB WEALTH & EV GARAGE */}
          {phoneApp === 'wealth' && (
            <div className="space-y-4">
              <div className="rounded-3xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-4 border border-emerald-500/25">
                <div className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">
                  Total Silicon Valley Net Worth
                </div>
                <div className="mt-1 text-3xl font-extrabold">{formatCurrency(netWorth)}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white/60 p-2.5 dark:bg-black/30">
                    <div className="text-[10px] text-[var(--ink-soft)]">Liquid Cash</div>
                    <div className="font-bold">{formatCurrency(cash)}</div>
                  </div>
                  <div className="rounded-xl bg-white/60 p-2.5 dark:bg-black/30">
                    <div className="text-[10px] text-[var(--ink-soft)]">Vested RSUs</div>
                    <div className="font-bold text-purple-600">{formatCurrency(vestedRsu)}</div>
                  </div>
                  <div className="rounded-xl bg-white/60 p-2.5 dark:bg-black/30">
                    <div className="text-[10px] text-[var(--ink-soft)]">Unvested RSUs</div>
                    <div className="font-bold">{formatCurrency(unvestedRsu)}</div>
                  </div>
                  <div className="rounded-xl bg-white/60 p-2.5 dark:bg-black/30">
                    <div className="text-[10px] text-[var(--ink-soft)]">QQQ / NVDA Index</div>
                    <div className="font-bold text-emerald-600">{formatCurrency(portfolioValue)}</div>
                  </div>
                </div>

                {vestedRsu > 0 && (
                  <button
                    onClick={vestRsuToCash}
                    className="btn-press mt-3 w-full rounded-2xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-sm"
                  >
                    Liquidate {formatCurrency(vestedRsu)} Vested RSUs to Cash
                  </button>
                )}
              </div>

              {/* Index Fund Investing */}
              <div className="rounded-2xl bg-[var(--mist)] p-3.5 space-y-2.5">
                <div className="text-xs font-bold">📈 Nasdaq-100 & AI Semiconductor Index</div>
                <p className="text-[11px] text-[var(--ink-soft)]">
                  Compounds daily with Silicon Valley tech earnings momentum.
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={cash < 2000}
                    onClick={() => investInPortfolio(2000)}
                    className="btn-press flex-1 rounded-xl bg-[#007AFF] py-2 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Invest $2,000
                  </button>
                  <button
                    disabled={portfolioValue <= 0}
                    onClick={() => withdrawPortfolio(2000)}
                    className="btn-press flex-1 rounded-xl bg-slate-500/20 py-2 text-xs font-bold disabled:opacity-40"
                  >
                    Withdraw $2,000
                  </button>
                </div>
              </div>

              {/* Loan / SAFE Note Repayment */}
              {loanOwed > 0 && (
                <div className="rounded-2xl bg-amber-500/12 p-3.5 border border-amber-500/25 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>🏦 Outstanding Note / Student Balance</span>
                    <span className="text-amber-600">{formatCurrency(loanOwed)}</span>
                  </div>
                  <button
                    disabled={cash < 1000}
                    onClick={() => payLoan(Math.min(5000, loanOwed))}
                    className="btn-press w-full rounded-xl bg-amber-500 py-2 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Pay {formatCurrency(Math.min(5000, loanOwed))}
                  </button>
                </div>
              )}

              {/* EV Showroom */}
              <div className="rounded-2xl bg-[var(--mist)] p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏎️</span>
                  <div>
                    <div className="text-xs font-bold">Porsche Taycan / Model S Plaid</div>
                    <div className="text-[11px] text-[var(--ink-soft)]">
                      Unlocks zero-fare 12-min HOV commute across the Bay
                    </div>
                  </div>
                </div>
                {ownedCars.includes('tesla') ? (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600">
                    In Garage
                  </span>
                ) : (
                  <button
                    disabled={cash < 18500}
                    onClick={() => buyCar('tesla', 18500)}
                    className="btn-press shrink-0 rounded-xl bg-[#007AFF] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Buy $18,500
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. YC STARTUP STUDIO */}
          {phoneApp === 'startup' && (
            <div className="space-y-4">
              <div className="rounded-3xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 p-4 border border-orange-500/25">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                    {startup.stage}
                  </span>
                  <span className="text-xs font-bold text-orange-600">
                    Valuation: {formatCurrency(startup.valuation)}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-extrabold">🦄 {startup.name}</h3>
                <p className="text-xs text-[var(--ink-soft)]">{startup.tagline}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/60 p-2.5 text-center dark:bg-black/30">
                  <div>
                    <div className="text-[10px] text-[var(--ink-soft)]">Monthly Revenue (MRR)</div>
                    <div className="text-xs font-extrabold text-emerald-600">
                      {formatCurrency(startup.mrr)}/mo
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--ink-soft)]">Active Developers</div>
                    <div className="text-xs font-extrabold">{startup.users.toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Next Milestone Product Readiness</span>
                    <span>{Math.round(startup.productProgress)}% (Pitch at 50%+)</span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all"
                      style={{ width: `${startup.productProgress}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={pitchStartupVC}
                  className="btn-press mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow-sm"
                >
                  <Sparkles className="size-4" />
                  Pitch Sand Hill VCs for Next Round
                </button>
              </div>

              <div className="rounded-2xl bg-[var(--mist)] p-3.5 space-y-2.5">
                <div className="text-xs font-bold">Pivot / Rebrand Startup</div>
                <input
                  type="text"
                  value={startupNameInput}
                  onChange={(e) => setStartupNameInput(e.target.value)}
                  className="w-full rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold dark:bg-black/40"
                  placeholder="Startup Name"
                />
                <input
                  type="text"
                  value={startupTagInput}
                  onChange={(e) => setStartupTagInput(e.target.value)}
                  className="w-full rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold dark:bg-black/40"
                  placeholder="One-line pitch"
                />
                <button
                  onClick={() => renameStartup(startupNameInput, startupTagInput)}
                  className="btn-press w-full rounded-xl bg-[#007AFF] py-2 text-xs font-bold text-white"
                >
                  Update Pitch Deck
                </button>
              </div>
            </div>
          )}

          {/* 4. DOORDASH & INSTACART */}
          {phoneApp === 'doordash' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-[var(--mist)] px-3.5 py-2.5 text-xs">
                <span className="font-semibold">🍱 Home Fridge Pantry Stock:</span>
                <span className="font-extrabold text-[#007AFF]">{pantryMeals} Meals Ready</span>
              </div>
              {DOORDASH_MENU.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--mist)] p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <div className="text-xs font-bold">{item.name}</div>
                      <div className="text-[11px] text-[var(--ink-soft)]">{item.vendor}</div>
                      <div className="mt-0.5 text-[10px] font-semibold text-emerald-600">
                        {item.pantryAdd > 0
                          ? `+${item.pantryAdd} Home Pantry Meals`
                          : `+${item.hunger} Fuel · +${item.fun} Vibe`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => orderDoorDash(item.id)}
                    className="btn-press shrink-0 rounded-xl bg-[#FF3B30] px-3 py-2 text-xs font-bold text-white"
                  >
                    {formatCurrency(item.price)}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 5. ZILLOW BAY AREA REAL ESTATE */}
          {phoneApp === 'zillow' && (
            <div className="space-y-3">
              {HOMES.map((h) => {
                const isCurrent = homeId === h.id;
                const isOwned = ownedHomes.includes(h.id);
                return (
                  <div key={h.id} className="rounded-2xl bg-[var(--mist)] p-3.5 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{h.emoji}</span>
                        <div>
                          <div className="text-xs font-bold">{h.name}</div>
                          <div className="text-[11px] text-[var(--ink-soft)]">
                            {h.area} · {h.gridSize}×{h.gridSize} Grid
                          </div>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                          Current Home
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--ink-soft)]">{h.tagline}</p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        disabled={isCurrent}
                        onClick={() => moveHome(h.id, false)}
                        className="btn-press flex-1 rounded-xl bg-[#007AFF] py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        Lease ({formatCurrency(h.weeklyRent)}/wk)
                      </button>
                      <button
                        disabled={isOwned}
                        onClick={() => moveHome(h.id, true)}
                        className="btn-press flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {isOwned ? 'Deed Owned' : `Buy (${formatCurrency(h.buyPrice)})`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 6. BLIND & MESSAGES */}
          {phoneApp === 'blind' && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Direct Messages · Bay Area Network
                </h4>
                <div className="space-y-2">
                  {NPCS.map((npc) => {
                    const rel = relationships[npc.id];
                    const lastMsg =
                      rel?.messages[rel.messages.length - 1]?.text || npc.greeting;
                    return (
                      <div
                        key={npc.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--mist)] p-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Portrait appearance={npc.appearance} size={40} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold">{npc.name}</span>
                              <span className="text-[10px] text-[#007AFF] font-semibold">
                                {rel?.status || 'Stranger'}
                              </span>
                            </div>
                            <div className="truncate text-[11px] text-[var(--ink-soft)]">
                              {lastMsg}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => interactWithNpc(npc.id, 'coffeeChat')}
                          className="btn-press shrink-0 rounded-xl bg-[#007AFF] px-3 py-1.5 text-[11px] font-bold text-white"
                        >
                          Reply
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Verified Anonymous Blind Feed
                </h4>
                <div className="space-y-2.5">
                  {BLIND_POSTS.map((post) => (
                    <div key={post.id} className="rounded-2xl bg-[var(--mist)] p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#007AFF]">
                        <span>{post.company}</span>
                        <span>{post.author}</span>
                      </div>
                      <div className="text-xs font-bold">{post.title}</div>
                      <p className="text-[11px] text-[var(--ink-soft)]">{post.body}</p>
                      <div className="flex items-center gap-4 pt-1 text-[10px] text-[var(--ink-soft)]">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="size-3 text-rose-500" /> {post.likes}
                        </span>
                        <span>💬 {post.comments} comments</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

