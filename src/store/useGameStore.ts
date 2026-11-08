import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ACTIONS,
  ASPIRATIONS,
  BACKPACK_ITEM_BY_ID,
  BASE_NEEDS,
  calculateCommuteDetails,
  CAREER_BY_ID,
  COMMUTE_MODES,
  DOORDASH_MENU,
  FURNITURE_BY_ID,
  GOALS,
  HOMES,
  HOME_BY_ID,
  LOCATION_BY_ID,
  MARKET_ASSETS,
  MARKET_ASSET_BY_TICKER,
  MARKET_HEADLINES,
  MOODLETS,
  NPCS,
  ORIGINS,
  RANDOM_EVENTS,
  REWARD_PERKS,
  REWARD_PERK_BY_ID,
  SKILL_TREE_NODE_BY_ID,
  SKILLS_META,
  VEHICLE_BY_ID,
  WISH_TEMPLATES,
  WORK_EXPLORATION_TASKS,
  WORK_PROJECTS,
  WORK_PROJECT_BY_ID,
  WORK_TONES,
} from '../data/worldData';
import {
  CashFlowCategory,
  CashFlowEntry,
  CommuteModeId,
  FinanceState,
  FurnitureDef,
  GameState,
  InventoryEntry,
  MarketTicker,
  NeedKey,
  PlacedObject,
  RelationshipState,
  RelationshipStatus,
  SaveGameData,
  SimProfile,
  SkillKey,
  StockHolding,
  TechNodeId,
  VehicleDef,
  VehicleId,
  WeatherKind,
  WeekdayAttendance,
  WorkMode,
  WorkToneId,
} from '../types/game';
import { sfx } from '../utils/sound';

const clamp = (val: number, min = 0, max = 100) => Math.max(min, Math.min(max, val));
const uid = () => Math.random().toString(36).substring(2, 9);

export function formatTime(minutesTotal: number): string {
  const minsInDay = ((Math.floor(minutesTotal) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(minsInDay / 60);
  const minute = minsInDay % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

export function getDayNumber(minutesTotal: number): number {
  return Math.floor(minutesTotal / 1440) + 1;
}

export function getDayOfWeekName(minutesTotal: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const d = Math.floor(minutesTotal / 1440) % 7;
  return days[d];
}

export function getHourOfDay(minutesTotal: number): number {
  return (((minutesTotal % 1440) + 1440) % 1440) / 60;
}

export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  return `$${rounded.toLocaleString('en-US')}`;
}

export function hasPersonalCar(state: Pick<GameState, 'ownedCars'>): boolean {
  return Boolean(state.ownedCars && state.ownedCars.length > 0);
}

export function getActiveVehicle(
  state: Pick<GameState, 'ownedCars' | 'activeCarId'>
): VehicleDef | null {
  if (!state.ownedCars || state.ownedCars.length === 0) return null;
  if (state.activeCarId && VEHICLE_BY_ID[state.activeCarId]) {
    return VEHICLE_BY_ID[state.activeCarId];
  }
  if (state.ownedCars.includes('taycan')) return VEHICLE_BY_ID.taycan;
  if (state.ownedCars.includes('tesla')) return VEHICLE_BY_ID.tesla;
  if (state.ownedCars.includes('prius')) return VEHICLE_BY_ID.prius;
  return VEHICLE_BY_ID.tesla;
}

export function calculateNetWorth(state: GameState): number {
  const furnitureVal = state.objects.reduce((acc, obj) => {
    const def = FURNITURE_BY_ID[obj.objectId];
    return acc + (def ? Math.round(def.price * 0.7) : 0);
  }, 0);
  const backpackVal = (state.inventory || []).reduce((acc, entry) => {
    if (entry.kind === 'furniture') {
      const fDef = FURNITURE_BY_ID[entry.itemId];
      return acc + (fDef ? Math.round(fDef.price * 0.7) * entry.quantity : 0);
    }
    const bDef = BACKPACK_ITEM_BY_ID[entry.itemId];
    return acc + (bDef ? Math.round(bDef.price * 0.7) * entry.quantity : 0);
  }, 0);
  const carIds = new Set(
    (state.ownedCars || []).filter((c): c is VehicleId => c in VEHICLE_BY_ID)
  );
  const carsVal = Array.from(carIds).reduce((acc, cId) => {
    const vDef = VEHICLE_BY_ID[cId];
    return acc + (vDef ? Math.round(vDef.price * 0.8) : 0);
  }, 0);
  const homeVal = state.ownedHomes.reduce((acc, hId) => {
    const h = HOMES.find((item) => item.id === hId);
    return acc + (h ? h.buyPrice : 0);
  }, 0);
  return (
    state.cash +
    state.vestedRsu +
    Math.round(state.unvestedRsu * 0.4) +
    state.portfolioValue +
    furnitureVal +
    backpackVal +
    carsVal +
    homeVal -
    state.loanOwed
  );
}

export function buildInitialFinanceState(
  startPortfolio = 0,
  startCash = 4800,
  startTime = 450
): FinanceState {
  const marketPrices = {} as Record<MarketTicker, number>;
  const marketPrevClose = {} as Record<MarketTicker, number>;
  const marketHistory = {} as Record<MarketTicker, number[]>;
  const holdings = {} as Record<MarketTicker, StockHolding>;

  MARKET_ASSETS.forEach((asset, idx) => {
    marketPrices[asset.ticker] = asset.basePrice;
    marketPrevClose[asset.ticker] = +(asset.basePrice * (1 - (idx % 2 === 0 ? 0.012 : -0.006))).toFixed(2);
    const series: number[] = [];
    for (let i = 11; i >= 1; i--) {
      const wave = Math.sin(i * 0.8 + idx) * asset.volatility * 0.9 - i * asset.drift * 0.65;
      series.push(+(asset.basePrice * (1 + wave)).toFixed(2));
    }
    series.push(asset.basePrice);
    marketHistory[asset.ticker] = series;
    holdings[asset.ticker] = { shares: 0, avgCost: asset.basePrice };
  });

  if (startPortfolio > 0) {
    const qqqAlloc = startPortfolio * 0.6;
    const nvdaAlloc = startPortfolio * 0.4;
    holdings.QQQX = {
      shares: +(qqqAlloc / marketPrices.QQQX).toFixed(4),
      avgCost: +(marketPrices.QQQX * 0.94).toFixed(2),
    };
    holdings.NVDAX = {
      shares: +(nvdaAlloc / marketPrices.NVDAX).toFixed(4),
      avgCost: +(marketPrices.NVDAX * 0.91).toFixed(2),
    };
  }

  return {
    marketPrices,
    marketPrevClose,
    marketHistory,
    holdings,
    marketRegime: MARKET_HEADLINES[0].regime,
    marketNews: MARKET_HEADLINES[0].headline,
    dripEnabled: false,
    autoSellRsu: false,
    realizedGains: 0,
    dividendsEarnedTotal: 0,
    dividendsEarnedToday: 0,
    inflowsBySource: {
      salary: 0,
      rsu: 0,
      startup: 0,
      investments: 0,
      bounties: startCash,
    },
    outflowsBySource: {
      rent: 0,
      living: 0,
      upgrades: 0,
      investments: 0,
    },
    ledger: [
      {
        id: uid(),
        time: startTime,
        day: 1,
        label: 'Initial Bay Area Runway & Seed Capital',
        emoji: '🏦',
        amount: startCash,
        category: 'bounties',
      },
    ],
  };
}

export function ensureFinanceState(state: GameState): FinanceState {
  if (state.finance && state.finance.marketPrices && state.finance.holdings) {
    const fin = state.finance;
    const holdings = { ...fin.holdings };
    const marketPrices = { ...fin.marketPrices };
    const marketPrevClose = { ...fin.marketPrevClose };
    const marketHistory = { ...fin.marketHistory };
    for (const asset of MARKET_ASSETS) {
      if (!marketPrices[asset.ticker]) marketPrices[asset.ticker] = asset.basePrice;
      if (!marketPrevClose[asset.ticker]) marketPrevClose[asset.ticker] = asset.basePrice;
      if (!marketHistory[asset.ticker] || marketHistory[asset.ticker].length === 0) {
        marketHistory[asset.ticker] = [asset.basePrice * 0.97, asset.basePrice * 0.99, asset.basePrice];
      }
      if (!holdings[asset.ticker]) {
        holdings[asset.ticker] = { shares: 0, avgCost: marketPrices[asset.ticker] };
      }
    }
    return {
      ...fin,
      marketPrices,
      marketPrevClose,
      marketHistory,
      holdings,
      inflowsBySource: fin.inflowsBySource || {
        salary: 0,
        rsu: 0,
        startup: 0,
        investments: 0,
        bounties: 0,
      },
      outflowsBySource: fin.outflowsBySource || {
        rent: 0,
        living: 0,
        upgrades: 0,
        investments: 0,
      },
      ledger: fin.ledger || [],
    };
  }
  return buildInitialFinanceState(state.portfolioValue || 0, state.cash || 4800, state.time || 450);
}

export function computePortfolioValue(finance: FinanceState): number {
  let total = 0;
  for (const asset of MARKET_ASSETS) {
    const h = finance.holdings[asset.ticker];
    const p = finance.marketPrices[asset.ticker] || asset.basePrice;
    if (h && h.shares > 0) {
      total += h.shares * p;
    }
  }
  return Math.round(total);
}

export function recordCashFlow(
  finance: FinanceState,
  entry: {
    time: number;
    label: string;
    emoji: string;
    amount: number;
    category: CashFlowCategory;
  }
): FinanceState {
  const rounded = Math.round(entry.amount);
  if (rounded === 0) return finance;
  const item: CashFlowEntry = {
    id: uid(),
    time: entry.time,
    day: getDayNumber(entry.time),
    label: entry.label,
    emoji: entry.emoji,
    amount: rounded,
    category: entry.category,
  };
  const inflowsBySource = { ...finance.inflowsBySource };
  const outflowsBySource = { ...finance.outflowsBySource };

  if (rounded > 0) {
    if (
      entry.category === 'salary' ||
      entry.category === 'rsu' ||
      entry.category === 'startup' ||
      entry.category === 'investments' ||
      entry.category === 'bounties'
    ) {
      inflowsBySource[entry.category] = (inflowsBySource[entry.category] || 0) + rounded;
    }
  } else if (rounded < 0) {
    const absVal = Math.abs(rounded);
    if (
      entry.category === 'rent' ||
      entry.category === 'living' ||
      entry.category === 'upgrades' ||
      entry.category === 'investments'
    ) {
      outflowsBySource[entry.category] = (outflowsBySource[entry.category] || 0) + absVal;
    }
  }

  return {
    ...finance,
    inflowsBySource,
    outflowsBySource,
    ledger: [item, ...(finance.ledger || []).slice(0, 44)],
  };
}

export function calculateCashFlowMetrics(state: GameState) {
  const fin = ensureFinanceState(state);
  const career = state.job ? CAREER_BY_ID[state.job.careerId] : null;
  const lvl = career && state.job ? career.levels[state.job.levelIndex] : null;
  const homeDef = HOMES.find((h) => h.id === state.homeId) || HOMES[1];
  const isHomeOwned = state.ownedHomes.includes(state.homeId);

  const execHaloMult = state.unlockedPerks.includes('perk_exec_halo') ? 1.25 : 1.0;
  const shiftCashPay = lvl ? Math.round(lvl.shiftPay * execHaloMult) : 0;
  const shiftRsuPay = lvl ? Math.round(lvl.rsuPerShift * execHaloMult) : 0;
  const weeklySalaryCash = shiftCashPay * 5;
  const weeklySalaryRsu = shiftRsuPay * 5;

  const rsuLiquidationMult = state.unlockedPerks.includes('perk_diamond_hands') ? 1.2 : 1.0;
  const rsuVestRate = state.unlockedPerks.includes('perk_diamond_hands') ? 0.16 : 0.12;
  const dailyRsuVestRaw = state.unvestedRsu >= 100 ? Math.round(state.unvestedRsu * rsuVestRate) : 0;
  const dailyRsuVest = Math.round(dailyRsuVestRaw * rsuLiquidationMult);
  const weeklyRsuVest = dailyRsuVest * 7;

  const vcMrrMult = state.unlockedPerks.includes('perk_vc_whisperer') ? 1.35 : 1.0;
  const dailyStartupRev = state.startup.mrr > 0 ? Math.round((state.startup.mrr * vcMrrMult) / 7) : 0;
  const weeklyStartupRev = Math.round(state.startup.mrr * vcMrrMult);

  const quantPerkMult = state.unlockedPerks.includes('perk_renaissance_quant') ? 1.5 : 1.0;
  const quantYieldMult = (1 + (state.skills.investing || 0) * 0.04) * quantPerkMult;
  let dailyDividendRaw = 0;
  for (const asset of MARKET_ASSETS) {
    const h = fin.holdings[asset.ticker];
    const p = fin.marketPrices[asset.ticker] || asset.basePrice;
    if (h && h.shares > 0 && asset.dailyDividendYield > 0) {
      dailyDividendRaw += h.shares * p * asset.dailyDividendYield * quantYieldMult;
    }
  }
  const dailyDividendYield = Math.round(dailyDividendRaw);
  const weeklyDividendYield = dailyDividendYield * 7;

  const weeklyRtoStipend = state.job ? 500 : 0;

  const dailyPassiveIncome = dailyStartupRev + dailyDividendYield + dailyRsuVest;
  const weeklyPassiveIncome = dailyPassiveIncome * 7;

  const rentPerkMult = state.unlockedPerks.includes('perk_renaissance_quant') ? 0.75 : 1.0;
  const weeklyRentBurn = isHomeOwned ? 0 : Math.round(homeDef.weeklyRent * rentPerkMult);
  const dailyRentBurn = Math.round(weeklyRentBurn / 7);

  let weeklyCommuteBurn = 0;
  if (
    state.job &&
    career &&
    !hasPersonalCar(state) &&
    !state.unlockedPerks.includes('perk_clipper_vip')
  ) {
    const est = calculateCommuteDetails(
      state.homeId,
      career.locationId,
      state.homeId,
      state.job.preferredCommute || 'gbus'
    );
    weeklyCommuteBurn = est.fare * 3;
  }

  const weeklyTotalInflow =
    weeklySalaryCash + weeklyStartupRev + weeklyDividendYield + weeklyRsuVest + weeklyRtoStipend;
  const weeklyTotalOutflow = weeklyRentBurn + weeklyCommuteBurn;
  const netWeeklyCashFlow = weeklyTotalInflow - weeklyTotalOutflow;

  const passiveCoveragePct =
    weeklyRentBurn <= 0
      ? 100
      : Math.min(200, Math.round((weeklyPassiveIncome / Math.max(1, weeklyRentBurn)) * 100));

  return {
    careerCompany: career?.company || 'Unemployed',
    careerCode: lvl?.code || 'Founder',
    shiftCashPay,
    shiftRsuPay,
    weeklySalaryCash,
    weeklySalaryRsu,
    dailyRsuVest,
    weeklyRsuVest,
    dailyStartupRev,
    weeklyStartupRev,
    dailyDividendYield,
    weeklyDividendYield,
    weeklyRtoStipend,
    dailyPassiveIncome,
    weeklyPassiveIncome,
    isHomeOwned,
    weeklyRentBurn,
    dailyRentBurn,
    weeklyCommuteBurn,
    weeklyTotalInflow,
    weeklyTotalOutflow,
    netWeeklyCashFlow,
    passiveCoveragePct,
  };
}

export function calculateOverallMood(state: GameState): {
  score: number;
  label: 'Flow State' | 'Dialed In' | 'Stable' | 'Drained' | 'Burnout Risk';
  color: string;
} {
  const n = state.needs;
  const baseAvg = (n.hunger + n.energy + n.hygiene + n.bladder + n.fun + n.social) / 6;
  const moodletSum = state.moodlets.reduce((acc, m) => {
    const def = MOODLETS[m.id];
    return acc + (def ? def.delta : 0);
  }, 0);
  const bionicBonus = state.unlockedPerks.includes('perk_bionic_flow') ? 12 : 0;
  const score = clamp(Math.round(baseAvg + moodletSum * 0.5 + bionicBonus), 0, 100);
  if (score >= 82) return { score, label: 'Flow State', color: '#34C759' };
  if (score >= 66) return { score, label: 'Dialed In', color: '#007AFF' };
  if (score >= 48) return { score, label: 'Stable', color: '#FF9500' };
  if (score >= 30) return { score, label: 'Drained', color: '#FF6B00' };
  return { score, label: 'Burnout Risk', color: '#FF3B30' };
}

export function hasHomeBackupPower(state: GameState): boolean {
  const homeDef = HOME_BY_ID[state.homeId];
  const hasPortableBank = (state.inventory || []).some(
    (entry) => entry.itemId === 'edc_anker_bank' && entry.quantity > 0
  );
  return Boolean(
    homeDef?.bonuses?.builtInPowerBackup ||
      hasPortableBank ||
      state.objects.some((o) => FURNITURE_BY_ID[o.objectId]?.powerBackup)
  );
}

export function isHomePowered(state: GameState): boolean {
  return state.pgePowerOn || hasHomeBackupPower(state);
}

export function getHomeDeskCoord(homeId: string): { x: number; y: number } {
  const homeDef = HOME_BY_ID[homeId] || HOMES[1];
  if (homeId === 'soma_loft') return { x: 6, y: 1 };
  if (homeId === 'pac_heights_victorian') return { x: 7, y: 1 };
  return { x: Math.max(2, homeDef.gridSize - 2), y: 1 };
}

export function getInstalledHomeComputer(
  state: Pick<GameState, 'objects'>
): { placed: PlacedObject; def: FurnitureDef } | null {
  const computeObjects = (state.objects || [])
    .map((placed) => ({ placed, def: FURNITURE_BY_ID[placed.objectId] }))
    .filter((entry): entry is { placed: PlacedObject; def: FurnitureDef } =>
      Boolean(entry.def && entry.def.category === 'compute')
    )
    .sort((a, b) => b.def.quality - a.def.quality);
  return computeObjects[0] || null;
}

function getNextCareerProject(
  careerId: string,
  currentProjId?: string,
  completedIds: string[] = []
): string {
  const careerProjs = WORK_PROJECTS.filter((p) => p.careerId === careerId);
  const uncompletedCareer = careerProjs.find(
    (p) => p.id !== currentProjId && !completedIds.includes(p.id)
  );
  if (uncompletedCareer) return uncompletedCareer.id;
  const anyUncompleted = WORK_PROJECTS.find(
    (p) => p.id !== currentProjId && !completedIds.includes(p.id)
  );
  if (anyUncompleted) return anyUncompleted.id;
  const fallbackCareer = careerProjs.find((p) => p.id !== currentProjId);
  if (fallbackCareer) return fallbackCareer.id;
  return WORK_PROJECTS[0].id;
}

function logShiftAttendance(
  job: NonNullable<GameState['job']>,
  mode: WorkMode,
  timeMinutes: number
): NonNullable<GameState['job']> {
  const today = getDayNumber(timeMinutes);
  const dayIdx = Math.floor(timeMinutes / 1440) % 7; // 0=Mon..4=Fri
  if (job.lastWorkDayLogged === today) {
    return job;
  }
  const weekly: WeekdayAttendance[] = [
    ...(job.weeklyAttendance || ['none', 'none', 'none', 'none', 'none']),
  ];
  while (weekly.length < 5) weekly.push('none');
  if (dayIdx >= 0 && dayIdx < 5) {
    weekly[dayIdx] = mode;
  }

  let officeDaysThisWeek = job.officeDaysThisWeek || 0;
  let wfhDaysThisWeek = job.wfhDaysThisWeek || 0;
  let wfaDaysRemaining = job.wfaDaysRemaining ?? 4;

  if (mode === 'office') {
    officeDaysThisWeek += 1;
  } else if (mode === 'wfh') {
    wfhDaysThisWeek += 1;
  } else if (mode === 'wfa') {
    wfaDaysRemaining = Math.max(0, wfaDaysRemaining - 1);
  }

  return {
    ...job,
    officeDaysThisWeek,
    wfhDaysThisWeek,
    wfaDaysRemaining,
    weeklyAttendance: weekly,
    lastWorkDayLogged: today,
    rtoCompliant: officeDaysThisWeek >= 3 ? true : job.rtoCompliant,
  };
}

function getRelStatus(score: number): RelationshipStatus {
  if (score >= 85) return 'Partner';
  if (score >= 65) return 'Co-Founder Material';
  if (score >= 38) return 'Coffee Buddy';
  if (score >= 15) return 'LinkedIn 1st';
  return 'Stranger';
}

function buildInitialRelationships(): Record<string, RelationshipState> {
  const rels: Record<string, RelationshipState> = {};
  for (const npc of NPCS) {
    rels[npc.id] = {
      npcId: npc.id,
      score: 12,
      status: 'Stranger',
      lastInteractionDay: 0,
      messages: [
        {
          from: 'npc',
          text: npc.greeting,
          time: 450,
        },
      ],
    };
  }
  return rels;
}

export const DEFAULT_PROFILE: SimProfile = {
  name: 'Alex Chen',
  handle: '@alexbuilds',
  appearance: {
    body: 'm',
    skin: '#E8B89A',
    hair: 'textured',
    hairColor: '#18181B',
    outfit: 'patagonia',
    topColor: '#007AFF',
    accessory: 'glasses',
  },
  traits: ['tenXEngineer', 'coffeeSnob'],
  aspiration: 'seriesAUnicorn',
  origin: 'newgrad',
};

export function createFreshState(profile: SimProfile, chosenHomeId?: string): GameState {
  const originDef = ORIGINS.find((o) => o.id === profile.origin) || ORIGINS[0];
  const homeId = chosenHomeId || originDef.defaultHome;
  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];

  const startSkills = {
    coding: profile.origin === 'h1bhustler' ? 2.2 : profile.origin === 'newgrad' ? 1.2 : 1.0,
    systemDesign: profile.origin === 'h1bhustler' ? 1.2 : 0.4,
    aiResearch: profile.origin === 'ycdropout' ? 1.5 : 0.5,
    charisma: profile.origin === 'nepo' ? 2.0 : 0.6,
    fitness: 0.8,
    cooking: 0.5,
    hustle: profile.origin === 'ycdropout' ? 2.0 : 0.8,
    investing: profile.origin === 'nepo' ? 2.2 : 0.3,
  };

  const startTime = 7 * 60 + 30; // Day 1, 7:30 AM

  const initialNotice = {
    id: uid(),
    text: `Welcome to ${homeDef.area}, ${profile.name}! Time to build your Silicon Valley story.`,
    emoji: '🌉',
    tone: 'info' as const,
    time: startTime,
  };

  return {
    version: 1,
    screen: 'play',
    view: 'live',
    activeModal: null,
    phoneApp: 'levels',
    simTab: 'needs',

    sim: profile,
    needs: { ...BASE_NEEDS },
    skills: startSkills,

    cash: originDef.cashBonus,
    vestedRsu: originDef.rsuBonus,
    unvestedRsu: profile.origin === 'nepo' ? 30000 : 0,
    portfolioValue: profile.origin === 'nepo' ? 20000 : 0,
    loanOwed: originDef.loanAmount,
    finance: buildInitialFinanceState(
      profile.origin === 'nepo' ? 20000 : 0,
      originDef.cashBonus,
      startTime
    ),
    karma: 6,
    unlockedPerks: [],
    unlockedTechNodes: [
      'node_git_monorepo',
      ...(profile.origin === 'ycdropout' ? (['node_yc_pmf'] as TechNodeId[]) : []),
    ],
    ownedCars: profile.origin === 'nepo' ? ['tesla'] : [],
    activeCarId: profile.origin === 'nepo' ? 'tesla' : null,
    ownedHomes: [],
    pantryMeals: 4,
    inventory: [
      { itemId: 'edc_macbook', kind: 'item', quantity: 1 },
      { itemId: 'snack_bluebottle', kind: 'item', quantity: 2 },
      { itemId: 'snack_soylent', kind: 'item', quantity: 2 },
      ...(profile.origin === 'nepo'
        ? [{ itemId: 'edc_airpods_max', kind: 'item' as const, quantity: 1 }]
        : profile.origin === 'ycdropout'
        ? [{ itemId: 'edc_field_notes', kind: 'item' as const, quantity: 1 }]
        : profile.origin === 'h1bhustler'
        ? [{ itemId: 'edc_anker_bank', kind: 'item' as const, quantity: 1 }]
        : [{ itemId: 'snack_tartine', kind: 'item' as const, quantity: 1 }]),
    ],

    time: startTime,
    speed: 1,
    weather: 'sunny',
    pgePowerOn: true,
    pgeChangeAt: startTime + 680,
    nightMode: 'auto',
    soundOn: true,
    freeWill: true,

    homeId: homeDef.id,
    locationId: 'home',
    objects: homeDef.starterObjects.map((o) => ({
      uid: uid(),
      objectId: o.objectId,
      x: o.x,
      y: o.y,
    })),
    pos: { x: Math.floor(homeDef.gridSize / 2), y: Math.floor(homeDef.gridSize / 2) },
    targetPos: null,
    facing: 'se',
    queue: [],

    job: {
      careerId: 'bigtech_swe',
      levelIndex: 0,
      performance: 22,
      shiftsCompleted: 0,
      shiftsAtLevel: 0,
      deliverablesCompleted: 0,
      activeProjectId: WORK_PROJECTS[0].id,
      projectProgress: 15,
      completedProjects: [],
      officeDaysThisWeek: 0,
      wfhDaysThisWeek: 0,
      wfaDaysRemaining: 4,
      weeklyAttendance: ['none', 'none', 'none', 'none', 'none'],
      lastWorkDayLogged: 0,
      rtoCompliant: true,
      autoWork: false,
      preferredCommute: profile.origin === 'nepo' ? 'tesla' : 'gbus',
    },
    workShift: null,
    travel: null,
    startup: {
      name: 'CortexFlow AI',
      tagline: 'Autonomous multi-agent code & infra co-pilot',
      stage: profile.origin === 'ycdropout' ? 'Weekend Prototype' : 'Ideation',
      productProgress: profile.origin === 'ycdropout' ? 25 : 8,
      users: profile.origin === 'ycdropout' ? 420 : 25,
      mrr: profile.origin === 'ycdropout' ? 1200 : 0,
      valuation: profile.origin === 'ycdropout' ? 2500000 : 500000,
      ycAccepted: false,
      fundedAmount: 0,
    },

    relationships: buildInitialRelationships(),
    moodlets: [
      { id: 'philz_buzz', expiresAt: startTime + 240 },
      ...(homeDef.bonuses?.ambientMoodletId
        ? [{ id: homeDef.bonuses.ambientMoodletId, expiresAt: startTime + 1440 }]
        : []),
    ],
    wishes: WISH_TEMPLATES.slice(0, 3).map((w) => ({ ...w, progress: 0 })),
    activeEvent: null,
    notices: [initialNotice],
    lastToast: initialNotice,

    lastRentDay: 1,
    rentOwed: 0,
    stats: {
      daysLived: 1,
      earnedToday: 0,
      earnedTotal: 0,
      leetCodeSolved: 0,
      commitsPushed: 0,
      coffeeConsumed: 1,
      placesVisited: ['home'],
      aspirationCompleted: false,
    },
    goalIndex: 0,
  };
}

interface GameActions {
  setScreen: (screen: GameState['screen']) => void;
  setView: (view: GameState['view']) => void;
  setActiveModal: (
    modal: GameState['activeModal'],
    sub?: GameState['phoneApp'] | GameState['simTab']
  ) => void;
  setSpeed: (speed: 0 | 1 | 2 | 3) => void;
  toggleNightMode: () => void;
  toggleSound: () => void;
  toggleFreeWill: () => void;
  startNewGame: (profile: SimProfile, homeId?: string) => void;
  hydrateSaveState: (snapshot: SaveGameData) => void;
  resetToFreshGame: () => void;
  tick: (deltaGameMinutes: number) => void;
  moveToTile: (x: number, y: number) => void;
  enqueueAction: (
    actionId: string,
    opts?: { objectUid?: string; stationId?: string; pos?: { x: number; y: number }; auto?: boolean }
  ) => void;
  cancelQueuedAction: (uid: string) => void;
  travelTo: (destId: string, mode: CommuteModeId) => void;
  skipTravelNow: () => void;
  startWorkShift: (preferredMode?: WorkMode) => void;
  commuteToOfficeAndWork: (mode?: CommuteModeId) => void;
  selectWorkProject: (projectId: string) => void;
  doWorkExploration: (taskId: string) => void;
  submitPromoPacket: () => void;
  unlockTechNode: (nodeId: TechNodeId) => void;
  trainTechNodeSkill: (nodeId: TechNodeId) => void;
  leaveWorkEarly: () => void;
  setWorkTone: (tone: WorkToneId) => void;
  toggleAutoWork: () => void;
  applyJob: (careerId: string) => void;
  vestRsuToCash: () => void;
  investInPortfolio: (amount: number) => void;
  withdrawPortfolio: (amount: number) => void;
  buyStock: (ticker: MarketTicker, dollarAmount: number) => void;
  sellStock: (ticker: MarketTicker, amountOrFraction: number, isFraction?: boolean) => void;
  applyPortfolioPreset: (preset: 'boglehead' | 'ai_supercycle' | 'treasury_barbell') => void;
  toggleDrip: () => void;
  toggleAutoSellRsu: () => void;
  executeOptionsStrategy: (strategy: 'covered_call' | 'earnings_straddle') => void;
  payLoan: (amount: number) => void;
  buyFurniture: (furnitureId: string) => void;
  installOrUpgradeHomeComputer: (furnitureId: string) => void;
  sellFurniture: (uid: string) => void;
  moveHome: (homeId: string, purchase?: boolean) => void;
  buyHomeProperty: (homeId: string) => void;
  buyCar: (carMode: CommuteModeId | VehicleId, price: number) => void;
  buyVehicle: (vehicleId: VehicleId) => void;
  selectActiveCar: (vehicleId: VehicleId) => void;
  takeCarJoyride: () => void;
  buyBackpackItem: (itemId: string) => void;
  useBackpackItem: (itemId: string) => void;
  storeFurnitureInBackpack: (placedUid: string) => void;
  placeFurnitureFromBackpack: (furnitureId: string) => void;
  sellBackpackItem: (itemId: string, kind: 'item' | 'furniture') => void;
  interactWithNpc: (
    npcId: string,
    kind: 'linkedin' | 'coffeeChat' | 'whiteboard' | 'pitch' | 'flirt'
  ) => void;
  orderDoorDash: (itemId: string) => void;
  pitchStartupVC: () => void;
  renameStartup: (name: string, tagline: string) => void;
  claimPerk: (perkId: string) => void;
  resolveEventChoice: (choiceIndex: number) => void;
  dismissToast: () => void;
  updateAppearance: (appearance: SimProfile['appearance']) => void;
  autoFixNeed: (needKey: NeedKey) => void;
  triggerMicroReward: (opts: {
    cashDelta?: number;
    karmaDelta?: number;
    skill?: SkillKey;
    skillDelta?: number;
    performanceDelta?: number;
    startupDelta?: number;
    needKey?: NeedKey;
    needDelta?: number;
    toastText?: string;
    emoji?: string;
  }) => void;
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...createFreshState(DEFAULT_PROFILE, 'mission_studio'),
      screen: 'title',

      setScreen: (screen) => {
        sfx.play('tap');
        set({ screen });
      },

      setView: (view) => {
        const s = get();
        if (view === 'buy' && s.locationId !== 'home') {
          const notice = {
            id: uid(),
            text: 'Head home first to buy and arrange furniture in your apartment!',
            emoji: '🏠',
            tone: 'info' as const,
            time: s.time,
          };
          sfx.play('error');
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }
        sfx.play('open');
        set({ view, activeModal: null });
      },

      setActiveModal: (modal, sub) => {
        sfx.play(modal ? 'open' : 'tap');
        const patch: Partial<GameState> = { activeModal: modal };
        if (modal === 'phone' && sub) {
          patch.phoneApp = sub as GameState['phoneApp'];
        } else if (modal === 'sim' && sub) {
          patch.simTab = sub as GameState['simTab'];
        }
        set(patch);
      },

      setSpeed: (speed) => {
        sfx.play('tap');
        set({ speed });
      },

      toggleNightMode: () => {
        sfx.play('tap');
        const current = get().nightMode;
        const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
        set({ nightMode: next });
      },

      toggleSound: () => {
        const next = !get().soundOn;
        sfx.enabled = next;
        if (next) sfx.play('tap');
        set({ soundOn: next });
      },

      toggleFreeWill: () => {
        sfx.play('tap');
        set({ freeWill: !get().freeWill });
      },

      startNewGame: (profile, homeId) => {
        sfx.play('levelup');
        const fresh = createFreshState(profile, homeId);
        set({ ...fresh, screen: 'play' });
      },

      hydrateSaveState: (snapshot) => {
        if (!snapshot || !snapshot.state) return;
        const raw = snapshot.state;
        const fallback = createFreshState(
          raw.sim || DEFAULT_PROFILE,
          raw.homeId && HOME_BY_ID[raw.homeId] ? raw.homeId : 'mission_studio'
        );

        const validHomeId = raw.homeId && HOME_BY_ID[raw.homeId] ? raw.homeId : fallback.homeId;
        const homeDef = HOME_BY_ID[validHomeId] || HOMES[1];
        const validLocationId =
          raw.locationId === 'home' || (raw.locationId && LOCATION_BY_ID[raw.locationId])
            ? raw.locationId
            : 'home';
        const gridSize = validLocationId === 'home' ? homeDef.gridSize : 7;

        const validObjects = Array.isArray(raw.objects)
          ? raw.objects
              .filter((o) => o && FURNITURE_BY_ID[o.objectId])
              .map((o) => ({
                ...o,
                x: clamp(o.x, 0, Math.max(0, homeDef.gridSize - 1)),
                y: clamp(o.y, 0, Math.max(0, homeDef.gridSize - 1)),
              }))
          : fallback.objects;

        const validPos = raw.pos
          ? {
              x: clamp(raw.pos.x, 0, Math.max(0, gridSize - 1)),
              y: clamp(raw.pos.y, 0, Math.max(0, gridSize - 1)),
            }
          : fallback.pos;

        const safeTime = typeof raw.time === 'number' && raw.time >= 0 ? raw.time : fallback.time;
        const validQueue = Array.isArray(raw.queue)
          ? raw.queue.filter((q) => q && ACTIONS[q.actionId])
          : [];
        const validMoodlets = Array.isArray(raw.moodlets)
          ? raw.moodlets.filter((m) => m && MOODLETS[m.id] && m.expiresAt > safeTime)
          : fallback.moodlets;

        const merged: GameState = {
          ...fallback,
          ...raw,
          version: 1,
          screen: 'play',
          view: 'live',
          activeModal: null,
          phoneApp: 'levels',
          simTab: 'needs',
          homeId: validHomeId,
          locationId: validLocationId,
          objects: validObjects,
          pos: validPos,
          targetPos: null,
          queue: validQueue,
          moodlets: validMoodlets,
          inventory: Array.isArray(raw.inventory) ? raw.inventory : fallback.inventory,
          ownedHomes: Array.isArray(raw.ownedHomes) ? raw.ownedHomes : fallback.ownedHomes,
          ownedCars: Array.isArray(raw.ownedCars) ? raw.ownedCars : fallback.ownedCars,
          unlockedPerks: Array.isArray(raw.unlockedPerks)
            ? raw.unlockedPerks
            : fallback.unlockedPerks,
          unlockedTechNodes: Array.isArray(raw.unlockedTechNodes)
            ? raw.unlockedTechNodes
            : fallback.unlockedTechNodes,
          speed: raw.speed === 2 || raw.speed === 3 ? raw.speed : 1,
        };

        merged.finance = ensureFinanceState(merged);
        merged.portfolioValue = computePortfolioValue(merged.finance);
        sfx.enabled = Boolean(merged.soundOn);
        sfx.play('levelup');

        const loadNotice = {
          id: uid(),
          text: `Loaded "${snapshot.summary?.label || 'Saved Game'}" · ${merged.sim.name} (Day ${getDayNumber(merged.time)})`,
          emoji: '☁️',
          tone: 'good' as const,
          time: merged.time,
        };

        set({
          ...merged,
          notices: [loadNotice, ...(merged.notices || []).slice(0, 29)],
          lastToast: loadNotice,
        });
      },

      resetToFreshGame: () => {
        sfx.play('tap');
        const fresh = createFreshState(DEFAULT_PROFILE, 'mission_studio');
        set({ ...fresh, screen: 'title', activeModal: null, view: 'live' });
      },

      moveToTile: (x, y) => {
        const s = get();
        if (s.travel) return;
        const facing =
          x > s.pos.x ? 'se' : x < s.pos.x ? 'nw' : y > s.pos.y ? 'sw' : 'ne';
        set({ targetPos: { x, y }, facing });
      },

      enqueueAction: (actionId, opts) => {
        const s = get();
        const def = ACTIONS[actionId];
        if (!def) return;

        if (def.requiresPower && s.locationId === 'home' && !isHomePowered(s)) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: 'PG&E Grid Outage! No power for your desk rig. Buy an EcoFlow/Powerwall or head to a cafe!',
            emoji: '🕯️',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        if (def.requiresPantry && s.pantryMeals < def.requiresPantry) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: 'Fridge is empty! Order Instacart/DoorDash on your Phone or visit Ferry Building Market.',
            emoji: '🛒',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        if (def.cost && s.cash < def.cost) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${formatCurrency(def.cost)} for ${def.label}.`,
            emoji: '💳',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        if (!opts?.auto) sfx.play('tap');

        let targetPos = opts?.pos;
        if (!targetPos && opts?.objectUid) {
          const foundObj = s.objects.find((o) => o.uid === opts.objectUid);
          if (foundObj) targetPos = { x: foundObj.x, y: foundObj.y };
        }
        if (!targetPos && opts?.stationId && s.locationId !== 'home') {
          const loc = LOCATION_BY_ID[s.locationId];
          const st = loc?.stations.find((stItem) => stItem.id === opts.stationId);
          if (st) targetPos = { x: st.x, y: st.y };
        }

        const overclockMult =
          s.unlockedPerks.includes('perk_h100_overclock') &&
          (def.category === 'skill' || def.category === 'hustle' || def.category === 'work')
            ? 0.8
            : 1.0;

        const newItem = {
          uid: uid(),
          actionId,
          label: def.label,
          emoji: def.emoji,
          totalMinutes: Math.max(10, Math.round(def.durationMinutes * overclockMult)),
          elapsedMinutes: 0,
          targetObjectUid: opts?.objectUid,
          targetStationId: opts?.stationId,
          targetPos,
          started: false,
          auto: opts?.auto,
        };

        // Replace auto-queued items if player manually queues something
        const existingQueue = opts?.auto
          ? s.queue
          : s.queue.filter((q) => !q.auto || q.started);

        set({
          queue: [...existingQueue.slice(0, 4), newItem],
          targetPos: existingQueue.length === 0 && targetPos ? targetPos : s.targetPos,
        });
      },

      cancelQueuedAction: (actionUid) => {
        sfx.play('tap');
        set((s) => ({
          queue: s.queue.filter((item) => item.uid !== actionUid),
        }));
      },

      travelTo: (destId, mode) => {
        const s = get();
        if (s.travel) return;
        if (s.workShift) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: '🔒 You are clocked into a live work shift! Finish your shift or click "Leave Early" before traveling.',
            emoji: '🔒',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }
        if (destId === s.locationId) {
          set({ view: 'live', activeModal: null });
          return;
        }

        const modeDef = COMMUTE_MODES.find((m) => m.id === mode) || COMMUTE_MODES[0];
        if (modeDef.requiresCar && !hasPersonalCar(s)) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: 'You don’t own a personal EV yet! Open the EV Garage (CarPlay) to buy a Prius, Tesla FSD, or Taycan.',
            emoji: '🏎️',
            tone: 'bad' as const,
            time: s.time,
          };
          set({
            activeModal: 'garage',
            notices: [notice, ...s.notices.slice(0, 29)],
            lastToast: notice,
          });
          return;
        }

        const activeVehicle = getActiveVehicle(s);
        const commuteEst = calculateCommuteDetails(
          s.locationId,
          destId,
          s.homeId,
          mode,
          activeVehicle?.id
        );
        const hasClipperVip = s.unlockedPerks.includes('perk_clipper_vip');
        const actualFare = hasClipperVip ? 0 : commuteEst.fare;
        const actualDuration = hasClipperVip
          ? Math.max(8, Math.round(commuteEst.durationMinutes * 0.8))
          : commuteEst.durationMinutes;

        if (s.cash < actualFare) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Not enough cash for ${modeDef.name} (${formatCurrency(actualFare)}). Take the free G-Bus!`,
            emoji: '🚌',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        sfx.play('open');
        set({
          cash: s.cash - actualFare,
          queue: [],
          view: 'live',
          activeModal: null,
          travel: {
            from: s.locationId,
            to: destId,
            mode,
            startedAt: s.time,
            arriveAt: s.time + actualDuration,
            totalMinutes: actualDuration,
            fare: actualFare,
          },
        });
      },

      skipTravelNow: () => {
        const s = get();
        if (!s.travel) return;
        const dest = s.travel.to;
        const modeDef = COMMUTE_MODES.find((m) => m.id === s.travel!.mode);
        const visited = s.stats.placesVisited.includes(dest)
          ? s.stats.placesVisited
          : [...s.stats.placesVisited, dest];

        const activeVehicle = getActiveVehicle(s);
        const effectiveMoodletId =
          s.travel.mode === 'tesla' && activeVehicle
            ? activeVehicle.moodletId
            : modeDef?.moodletId;

        let nextMoodlets = [...s.moodlets];
        if (effectiveMoodletId) {
          const mDef = MOODLETS[effectiveMoodletId];
          if (mDef) {
            nextMoodlets = [
              ...nextMoodlets.filter((m) => m.id !== mDef.id),
              { id: mDef.id, expiresAt: s.travel.arriveAt + mDef.durationMinutes },
            ];
          }
        }

        const locName =
          dest === 'home'
            ? HOMES.find((h) => h.id === s.homeId)?.name || 'Home'
            : LOCATION_BY_ID[dest]?.name || dest;

        // Check goal #2 (Explore the Bay Area)
        let goalIndex = s.goalIndex;
        let cash = s.cash;
        let karma = s.karma;
        if (goalIndex === 2 && dest !== 'home') {
          goalIndex = 3;
          cash += GOALS[2].rewardCash;
          karma += GOALS[2].rewardKarma;
        }

        // Check visit wishes
        const wishes = s.wishes.map((w) => {
          if (w.kind === 'visit' && w.targetKey === dest) {
            return { ...w, progress: w.targetValue };
          }
          return w;
        });

        const notice = {
          id: uid(),
          text: `Arrived at ${locName} via ${
            s.travel.mode === 'tesla' && activeVehicle
              ? activeVehicle.name
              : modeDef?.name || 'transit'
          }.`,
          emoji:
            (s.travel.mode === 'tesla' && activeVehicle ? activeVehicle.emoji : modeDef?.emoji) ||
            '📍',
          tone: 'info' as const,
          time: s.travel.arriveAt,
        };

        const shouldStartShift = Boolean(s.travel.autoStartShiftOnArrival);

        sfx.play('tap');
        set({
          time: s.travel.arriveAt,
          locationId: dest,
          travel: null,
          pos: { x: 3, y: 3 },
          targetPos: null,
          moodlets: nextMoodlets,
          wishes,
          goalIndex,
          cash,
          karma,
          stats: { ...s.stats, placesVisited: visited },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });

        if (shouldStartShift) {
          get().startWorkShift('office');
        }
      },

      startWorkShift: (preferredMode) => {
        const s = get();
        if (!s.job || s.workShift || s.travel) return;
        const career = CAREER_BY_ID[s.job.careerId];
        if (!career) return;

        const atOffice = s.locationId === career.locationId;
        const atHome = s.locationId === 'home';
        const wfhUsed = s.job.wfhDaysThisWeek || 0;
        const wfaLeft = s.job.wfaDaysRemaining ?? 4;

        let resolvedMode: WorkMode;

        if (preferredMode === 'office') {
          if (!atOffice) {
            get().commuteToOfficeAndWork();
            return;
          }
          resolvedMode = 'office';
        } else if (preferredMode === 'wfh') {
          if (!atHome) {
            sfx.play('error');
            const notice = {
              id: uid(),
              text: '🏠 Head home first to work from your apartment desk, or use a 🌍 WFA (Work From Anywhere) pass here!',
              emoji: '🏠',
              tone: 'bad' as const,
              time: s.time,
            };
            set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
            return;
          }
          if (!isHomePowered(s)) {
            sfx.play('error');
            const outNotice = {
              id: uid(),
              text: 'PG&E Grid Outage at home! Commute to campus or work from a cafe with Wi-Fi (WFA).',
              emoji: '🕯️',
              tone: 'bad' as const,
              time: s.time,
            };
            set({ notices: [outNotice, ...s.notices.slice(0, 29)], lastToast: outNotice });
            return;
          }
          if (!getInstalledHomeComputer(s)) {
            sfx.play('error');
            const pcNotice = {
              id: uid(),
              text: '🖥️ Install a Home Computer Workstation (optional purchase) to work from home, or commute to campus!',
              emoji: '🖥️',
              tone: 'info' as const,
              time: s.time,
            };
            set({
              activeModal: 'computer',
              notices: [pcNotice, ...s.notices.slice(0, 29)],
              lastToast: pcNotice,
            });
            return;
          }
          if (wfhUsed < 2) {
            resolvedMode = 'wfh';
          } else if (wfaLeft > 0) {
            resolvedMode = 'wfa';
          } else {
            sfx.play('error');
            const notice = {
              id: uid(),
              text: '🏢 Hybrid Policy Limit: 2/2 WFH days & 0/4 WFA passes left! Commute to your office campus (3 days/week required).',
              emoji: '🏢',
              tone: 'bad' as const,
              time: s.time,
            };
            set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
            return;
          }
        } else if (preferredMode === 'wfa') {
          if (wfaLeft <= 0) {
            sfx.play('error');
            const notice = {
              id: uid(),
              text: '🌍 0/4 WFA passes remaining! Hybrid Policy requires 3 days in-office (2 WFH days OK). Commute to your campus!',
              emoji: '🌍',
              tone: 'bad' as const,
              time: s.time,
            };
            set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
            return;
          }
          resolvedMode = 'wfa';
        } else {
          if (atOffice) {
            resolvedMode = 'office';
          } else if (atHome) {
            if (!isHomePowered(s) || !getInstalledHomeComputer(s)) {
              get().commuteToOfficeAndWork();
              return;
            }
            if (wfhUsed < 2) {
              resolvedMode = 'wfh';
            } else if (wfaLeft > 0) {
              resolvedMode = 'wfa';
            } else {
              get().commuteToOfficeAndWork();
              return;
            }
          } else {
            if (wfaLeft > 0) {
              resolvedMode = 'wfa';
            } else {
              get().commuteToOfficeAndWork();
              return;
            }
          }
        }

        const nextLocationId = s.locationId;
        const updatedJob = logShiftAttendance(s.job, resolvedMode, s.time);
        const duration = (career.shiftEndHour - career.shiftStartHour) * 60;
        sfx.play('open');

        const modeLabel =
          resolvedMode === 'office'
            ? `${career.company} Campus (${updatedJob.officeDaysThisWeek || 1}/3 Office Days)`
            : resolvedMode === 'wfh'
            ? `Remote WFH Studio (${updatedJob.wfhDaysThisWeek || 1}/2 WFH Days)`
            : `WFA at ${LOCATION_BY_ID[nextLocationId]?.shortName || 'Home Studio'} (${updatedJob.wfaDaysRemaining ?? 3}/4 WFA Left)`;

        const notice = {
          id: uid(),
          text: `Badged into ${modeLabel} (${career.levels[s.job.levelIndex].code}). Travel locked while on the clock!`,
          emoji: resolvedMode === 'office' ? career.emoji : resolvedMode === 'wfh' ? '🏠' : '🌍',
          tone: 'info' as const,
          time: s.time,
        };

        set({
          locationId: nextLocationId,
          job: updatedJob,
          queue: [],
          view: 'live',
          activeModal: null,
          workShift: {
            startedAt: s.time,
            endsAt: s.time + duration,
            totalMinutes: duration,
            elapsedMinutes: 0,
            tone: 'deepWork',
            mode: resolvedMode,
            workLocationId: nextLocationId,
          },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      commuteToOfficeAndWork: (mode) => {
        const s = get();
        if (!s.job || s.workShift || s.travel) return;
        const career = CAREER_BY_ID[s.job.careerId];
        if (!career) return;

        if (s.locationId === career.locationId) {
          get().startWorkShift('office');
          return;
        }

        const chosenMode = hasPersonalCar(s)
          ? mode && mode !== s.job.preferredCommute
            ? mode
            : 'tesla'
          : mode || s.job.preferredCommute || 'gbus';
        const modeDef = COMMUTE_MODES.find((m) => m.id === chosenMode) || COMMUTE_MODES[0];
        const commuteMode: CommuteModeId =
          modeDef.requiresCar && !hasPersonalCar(s) ? 'gbus' : chosenMode;
        const activeVehicle = getActiveVehicle(s);
        const commuteEst = calculateCommuteDetails(
          s.locationId,
          career.locationId,
          s.homeId,
          commuteMode,
          activeVehicle?.id
        );
        const hasClipperVip = s.unlockedPerks.includes('perk_clipper_vip');
        const actualFare = hasClipperVip ? 0 : s.cash >= commuteEst.fare ? commuteEst.fare : 0;
        const commuteDuration = hasClipperVip
          ? Math.max(8, Math.round(commuteEst.durationMinutes * 0.8))
          : commuteEst.durationMinutes;

        sfx.play('open');
        set({
          cash: Math.max(0, s.cash - actualFare),
          job: { ...s.job, preferredCommute: commuteMode },
          queue: [],
          view: 'live',
          activeModal: null,
          travel: {
            from: s.locationId,
            to: career.locationId,
            mode: commuteMode,
            startedAt: s.time,
            arriveAt: s.time + commuteDuration,
            totalMinutes: commuteDuration,
            fare: actualFare,
            autoStartShiftOnArrival: true,
          },
        });
      },

      selectWorkProject: (projectId) => {
        const s = get();
        if (!s.job) return;
        const proj = WORK_PROJECT_BY_ID[projectId];
        if (!proj) return;
        sfx.play('tap');
        const notice = {
          id: uid(),
          text: `Switched Technical Charter to ${proj.emoji} ${proj.title} (${proj.codeName}).`,
          emoji: proj.emoji,
          tone: 'info' as const,
          time: s.time,
        };
        set({
          job: {
            ...s.job,
            activeProjectId: proj.id,
            projectProgress: s.job.activeProjectId === proj.id ? s.job.projectProgress : 0,
          },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      doWorkExploration: (taskId) => {
        const s = get();
        if (!s.job) return;
        const task = WORK_EXPLORATION_TASKS.find((t) => t.id === taskId);
        if (!task) return;
        const career = CAREER_BY_ID[s.job.careerId];
        if (!career) return;

        if (task.requiresOffice && s.locationId !== career.locationId) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `${task.title} requires on-site campus lab access at ${career.company}!`,
            emoji: '🏢',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        if (s.needs.energy < task.energyCost) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${task.energyCost}⚡ Energy to execute ${task.title}. Grab an espresso or rest!`,
            emoji: '☕',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        const activeProjId =
          s.job.activeProjectId || getNextCareerProject(career.id, undefined, s.job.completedProjects);
        const proj = WORK_PROJECT_BY_ID[activeProjId] || WORK_PROJECTS[0];
        const isCampusBonus = s.locationId === career.locationId ? 1.2 : 1.0;
        const overclockBonus = s.unlockedPerks.includes('perk_h100_overclock') ? 1.25 : 1.0;
        const flowPerkMult =
          s.unlockedPerks.includes('perk_flow_state') &&
          (task.skill === 'coding' || task.skill === 'systemDesign' || task.skill === 'aiResearch')
            ? 1.3
            : 1.0;
        const principalPerkMult = s.unlockedPerks.includes('perk_principal_architect') ? 1.35 : 1.0;

        const nextSkills = {
          ...s.skills,
          [task.skill]: clamp(
            +(s.skills[task.skill] + task.skillGain * flowPerkMult * principalPerkMult).toFixed(2),
            0,
            10
          ),
        };
        const nextNeeds = {
          ...s.needs,
          energy: clamp(s.needs.energy - task.energyCost, 0, 100),
        };

        let nextProgress =
          (s.job.projectProgress || 0) +
          Math.round(task.projectProgressGain * isCampusBonus * overclockBonus);
        let nextPerf = clamp(
          s.job.performance + Math.round(task.performanceGain * isCampusBonus),
          0,
          100
        );
        let nextDeliverables = s.job.deliverablesCompleted || 0;
        let nextCompleted = [...(s.job.completedProjects || [])];
        let nextProjId = proj.id;
        let cash = s.cash;
        let unvestedRsu = s.unvestedRsu;
        let karma = s.karma;
        let notice;

        if (nextProgress >= 100) {
          nextDeliverables += 1;
          if (!nextCompleted.includes(proj.id)) {
            nextCompleted.push(proj.id);
          }
          cash += proj.rewardCash;
          unvestedRsu += proj.rewardRsu;
          karma += 5;
          nextPerf = clamp(nextPerf + proj.promoPerfBoost, 0, 100);
          nextProjId = getNextCareerProject(career.id, proj.id, nextCompleted);
          nextProgress = 0;
          sfx.play('levelup');
          notice = {
            id: uid(),
            text: `SHIPPED CHARTER: ${proj.emoji} ${proj.title}! Awarded +${formatCurrency(proj.rewardCash)} Spot Bonus, +${formatCurrency(proj.rewardRsu)} RSU, +5 ⚡ Karma & +1 Promo Deliverable!`,
            emoji: '🚀',
            tone: 'good' as const,
            time: s.time,
          };
        } else {
          sfx.play('tap');
          notice = {
            id: uid(),
            text: `${task.emoji} ${task.title}: Charter at ${nextProgress}% (+${task.performanceGain}% Calibration Perf)`,
            emoji: task.emoji,
            tone: 'info' as const,
            time: s.time,
          };
        }

        let fin = ensureFinanceState(s);
        if (cash > s.cash) {
          fin = recordCashFlow(fin, {
            time: s.time,
            label: `Shipped Charter Bonus: ${proj.title}`,
            emoji: '🚀',
            amount: cash - s.cash,
            category: 'bounties',
          });
        }

        set({
          cash,
          unvestedRsu,
          karma,
          finance: fin,
          skills: nextSkills,
          needs: nextNeeds,
          job: {
            ...s.job,
            activeProjectId: nextProjId,
            projectProgress: nextProgress,
            performance: nextPerf,
            deliverablesCompleted: nextDeliverables,
            completedProjects: nextCompleted,
          },
          stats: {
            ...s.stats,
            earnedToday: s.stats.earnedToday + (cash - s.cash),
            earnedTotal: s.stats.earnedTotal + (cash - s.cash),
            commitsPushed: s.stats.commitsPushed + 1,
          },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      submitPromoPacket: () => {
        const s = get();
        if (!s.job) return;
        const career = CAREER_BY_ID[s.job.careerId];
        if (!career) return;
        const nextLvl = career.levels[s.job.levelIndex + 1];
        if (!nextLvl) return;

        const shiftsAtLevel = s.job.shiftsAtLevel ?? s.job.shiftsCompleted ?? 0;
        const reqShifts = nextLvl.minShiftsForPromo ?? 3;
        const reqDeliverables = nextLvl.requiredDeliverables ?? 1;
        const deliverablesDone = s.job.deliverablesCompleted ?? 0;
        const primaryPass =
          Math.floor(s.skills[nextLvl.requiredSkill.skill] ?? 0) >= nextLvl.requiredSkill.level;
        const secondaryPass =
          !nextLvl.secondarySkill ||
          Math.floor(s.skills[nextLvl.secondarySkill.skill] ?? 0) >= nextLvl.secondarySkill.level;
        const unlockedNodes = s.unlockedTechNodes ?? ['node_git_monorepo'];
        const techNodePass =
          !nextLvl.requiredTechNode || unlockedNodes.includes(nextLvl.requiredTechNode);
        const reqPerf = s.unlockedPerks.includes('perk_exec_halo') ? 82 : 92;
        const perfPass = Math.round(s.job.performance) >= reqPerf;
        const tenurePass = shiftsAtLevel >= reqShifts;
        const delivPass = deliverablesDone >= reqDeliverables;
        const rtoPass = s.job.rtoCompliant !== false;

        if (
          perfPass &&
          tenurePass &&
          primaryPass &&
          secondaryPass &&
          techNodePass &&
          delivPass &&
          rtoPass
        ) {
          const spotBonus = Math.round(nextLvl.baseSalary * 0.06);
          const fin = recordCashFlow(ensureFinanceState(s), {
            time: s.time,
            label: `Promotion Bonus (${nextLvl.code} ${nextLvl.title} @ ${career.company})`,
            emoji: '👑',
            amount: spotBonus,
            category: 'salary',
          });
          sfx.play('levelup');
          const notice = {
            id: uid(),
            text: `PROMO COMMITTEE APPROVED! Promoted to ${nextLvl.code} ${nextLvl.title} at ${career.company} (${formatCurrency(nextLvl.baseSalary + nextLvl.rsuAnnual)}/yr TC + ${formatCurrency(spotBonus)} bonus + 12 ⚡ Karma)!`,
            emoji: '👑',
            tone: 'good' as const,
            time: s.time,
          };
          set({
            cash: s.cash + spotBonus,
            karma: s.karma + 12,
            finance: fin,
            job: {
              ...s.job,
              levelIndex: s.job.levelIndex + 1,
              performance: 42,
              shiftsAtLevel: 0,
            },
            stats: {
              ...s.stats,
              earnedToday: s.stats.earnedToday + spotBonus,
              earnedTotal: s.stats.earnedTotal + spotBonus,
            },
            notices: [notice, ...s.notices.slice(0, 29)],
            lastToast: notice,
          });
        } else {
          sfx.play('error');
          const missing: string[] = [];
          if (!perfPass) missing.push(`${reqPerf}% Perf (at ${Math.round(s.job.performance)}%)`);
          if (!tenurePass) missing.push(`${reqShifts} Shifts (at ${shiftsAtLevel})`);
          if (!primaryPass)
            missing.push(`${nextLvl.requiredSkill.skill} Lv.${nextLvl.requiredSkill.level}`);
          if (!secondaryPass && nextLvl.secondarySkill)
            missing.push(`${nextLvl.secondarySkill.skill} Lv.${nextLvl.secondarySkill.level}`);
          if (!techNodePass && nextLvl.requiredTechNode) {
            const reqNodeDef = SKILL_TREE_NODE_BY_ID[nextLvl.requiredTechNode];
            missing.push(`Tech Tree: ${reqNodeDef?.title || nextLvl.requiredTechNode}`);
          }
          if (!delivPass)
            missing.push(`${reqDeliverables} Shipped Deliverables (at ${deliverablesDone})`);
          if (!rtoPass) missing.push('3/3 Hybrid Office Days');

          const notice = {
            id: uid(),
            text: `Promo Committee Feedback for ${nextLvl.code}: Complete remaining gates — ${missing.join(' · ')}.`,
            emoji: '📋',
            tone: 'info' as const,
            time: s.time,
          };
          set({
            notices: [notice, ...s.notices.slice(0, 29)],
            lastToast: notice,
          });
        }
      },

      unlockTechNode: (nodeId) => {
        const s = get();
        const node = SKILL_TREE_NODE_BY_ID[nodeId];
        if (!node) return;
        const unlocked = s.unlockedTechNodes ?? ['node_git_monorepo'];
        if (unlocked.includes(nodeId)) return;

        // Check parent prerequisite nodes
        const missingPrereqs = node.prereqNodes.filter((pid) => !unlocked.includes(pid));
        if (missingPrereqs.length > 0) {
          sfx.play('error');
          const prereqNames = missingPrereqs
            .map((pid) => SKILL_TREE_NODE_BY_ID[pid]?.title || pid)
            .join(', ');
          const notice = {
            id: uid(),
            text: `🔒 Prerequisite Required: Unlock ${prereqNames} in the Skill Tech Tree first!`,
            emoji: '🌳',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        // Check required core skills
        const missingSkills = node.requiredSkills.filter(
          (req) => Math.floor(s.skills[req.skill] ?? 0) < req.level
        );
        if (missingSkills.length > 0) {
          sfx.play('error');
          const skList = missingSkills
            .map((req) => {
              const meta = SKILLS_META.find((m) => m.key === req.skill);
              return `${meta?.emoji || ''} ${meta?.label || req.skill} Lv.${req.level} (at Lv.${Math.floor(s.skills[req.skill] ?? 0)})`;
            })
            .join(' & ');
          const notice = {
            id: uid(),
            text: `🔒 Core Skill Bar Not Met for ${node.title}: Need ${skList}. Use "Lab Study" to train!`,
            emoji: '📚',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        // Check Karma cost
        if (s.karma < node.karmaCost) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${node.karmaCost} ⚡ Karma (have ${s.karma} ⚡) to unlock ${node.title}. Run a Lab Study or ship work deliverables!`,
            emoji: '⚡',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        sfx.play('levelup');
        const nextUnlocked = [...unlocked, nodeId];
        const notice = {
          id: uid(),
          text: `🌳 Tech Tree Specialization Unlocked: ${node.emoji} ${node.title} (${node.codeName}) — ${node.perkSummary}!`,
          emoji: node.emoji,
          tone: 'good' as const,
          time: s.time,
        };

        set({
          karma: s.karma - node.karmaCost,
          unlockedTechNodes: nextUnlocked,
          job: s.job
            ? {
                ...s.job,
                performance: clamp(s.job.performance + 5, 0, 100),
              }
            : null,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      trainTechNodeSkill: (nodeId) => {
        const s = get();
        const node = SKILL_TREE_NODE_BY_ID[nodeId];
        if (!node) return;
        const energyCost = 16;
        if (s.needs.energy < energyCost) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Too exhausted for ${node.codeName} Deep-Dive Lab (${energyCost} Energy needed). Grab an espresso or rest!`,
            emoji: '☕',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        // Pick first unmet required skill, or primary skill of the node
        const targetReq =
          node.requiredSkills.find((req) => Math.floor(s.skills[req.skill] ?? 0) < req.level) ||
          node.requiredSkills[0];
        const sk = targetReq.skill;
        const meta = SKILLS_META.find((m) => m.key === sk);
        const prevFloor = Math.floor(s.skills[sk] ?? 0);
        const nextVal = Math.min(10, +((s.skills[sk] ?? 0) + 0.55).toFixed(2));
        const newFloor = Math.floor(nextVal);
        const leveledUp = newFloor > prevFloor;
        const karmaGain = leveledUp ? 3 : 0;
        const royaltyCash =
          leveledUp && s.unlockedPerks.includes('perk_principal_architect') ? 1500 : 0;

        sfx.play(leveledUp ? 'levelup' : 'tap');
        const notice = {
          id: uid(),
          text: leveledUp
            ? `🔬 ${node.codeName} Lab Breakthrough! ${meta?.emoji || '🎯'} ${meta?.label || sk} reached Lv.${newFloor} (+${karmaGain} ⚡ Karma${royaltyCash > 0 ? ` & +${formatCurrency(royaltyCash)} patent royalty` : ''})!`
            : `🔬 Studied ${node.title}: +0.55 ${meta?.label || sk} (now ${nextVal.toFixed(1)}/${targetReq.level})! Reach Lv.${prevFloor + 1} for +3 ⚡ Karma.`,
          emoji: leveledUp ? '🎉' : '🔬',
          tone: (leveledUp ? 'good' : 'info') as 'good' | 'info',
          time: s.time,
        };

        set({
          cash: s.cash + royaltyCash,
          karma: s.karma + karmaGain,
          skills: {
            ...s.skills,
            [sk]: nextVal,
          },
          needs: {
            ...s.needs,
            energy: clamp(s.needs.energy - energyCost, 0, 100),
          },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      leaveWorkEarly: () => {
        const s = get();
        if (!s.workShift || !s.job) return;
        const career = CAREER_BY_ID[s.job.careerId];
        const lvl = career.levels[s.job.levelIndex];
        const ratio = Math.max(0.1, s.workShift.elapsedMinutes / s.workShift.totalMinutes);
        const execHaloMult = s.unlockedPerks.includes('perk_exec_halo') ? 1.25 : 1.0;
        const earnedCash = Math.round(lvl.shiftPay * ratio * 0.75 * execHaloMult);
        const earnedRsu = Math.round(lvl.rsuPerShift * ratio * 0.75 * execHaloMult);
        const fin = recordCashFlow(ensureFinanceState(s), {
          time: s.time,
          label: `${career.company} Partial Shift Pay (${lvl.code})`,
          emoji: career.emoji,
          amount: earnedCash,
          category: 'salary',
        });

        sfx.play('cash');
        const notice = {
          id: uid(),
          text: `Left shift early · Collected ${formatCurrency(earnedCash)} cash + ${formatCurrency(earnedRsu)} RSU.`,
          emoji: '💸',
          tone: 'cash' as const,
          time: s.time,
        };

        set({
          cash: s.cash + earnedCash,
          unvestedRsu: s.unvestedRsu + earnedRsu,
          finance: fin,
          workShift: null,
          stats: {
            ...s.stats,
            earnedToday: s.stats.earnedToday + earnedCash,
            earnedTotal: s.stats.earnedTotal + earnedCash,
          },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      setWorkTone: (tone) => {
        sfx.play('tap');
        const s = get();
        if (!s.workShift) return;
        set({ workShift: { ...s.workShift, tone } });
      },

      toggleAutoWork: () => {
        sfx.play('tap');
        const s = get();
        if (!s.job) return;
        set({ job: { ...s.job, autoWork: !s.job.autoWork } });
      },

      applyJob: (careerId) => {
        const s = get();
        const career = CAREER_BY_ID[careerId];
        if (!career) return;

        if (s.workShift || s.travel) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: '🔒 Finish your active shift or transit before sitting for a multi-round onsite interview loop!',
            emoji: '🔒',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        const unlockedNodes = s.unlockedTechNodes ?? ['node_git_monorepo'];
        const entryReq = career.entryRequirements;

        if (entryReq) {
          const missingTechNodes = entryReq.requiredTechNodes.filter(
            (nid) => !unlockedNodes.includes(nid)
          );
          const missingSkills = entryReq.requiredSkills.filter(
            (req) => Math.floor(s.skills[req.skill] ?? 0) < req.level
          );
          const minDeliv = entryReq.minDeliverables ?? 0;
          const curDeliv = s.job?.deliverablesCompleted ?? 0;
          const missingDeliv = curDeliv < minDeliv;

          if (missingTechNodes.length > 0 || missingSkills.length > 0 || missingDeliv) {
            sfx.play('error');
            const reasons: string[] = [];
            if (missingTechNodes.length > 0) {
              const nodeNames = missingTechNodes
                .map((nid) => {
                  const n = SKILL_TREE_NODE_BY_ID[nid];
                  return n ? `${n.emoji} ${n.title}` : nid;
                })
                .join(' + ');
              reasons.push(`Tech Tree: ${nodeNames}`);
            }
            if (missingSkills.length > 0) {
              const skNames = missingSkills
                .map((req) => {
                  const meta = SKILLS_META.find((m) => m.key === req.skill);
                  return `${meta?.label || req.skill} Lv.${req.level} (at Lv.${Math.floor(s.skills[req.skill] ?? 0)})`;
                })
                .join(', ');
              reasons.push(`Skills: ${skNames}`);
            }
            if (missingDeliv) {
              reasons.push(`Shipped Deliverables: ${curDeliv}/${minDeliv}`);
            }

            const notice = {
              id: uid(),
              text: `🔒 ${career.company} Onsite Loop Gate (${entryReq.selectivityLabel}): Missing ${reasons.join(' · ')}. Unlock custom skills in the Skill Tech Tree!`,
              emoji: career.emoji,
              tone: 'bad' as const,
              time: s.time,
            };
            set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
            return;
          }

          if (s.needs.energy < entryReq.interviewEnergyCost) {
            sfx.play('error');
            const notice = {
              id: uid(),
              text: `Too tired for ${career.company}’s ${entryReq.interviewLoopTitle} (needs ${entryReq.interviewEnergyCost} Energy). Recharge first!`,
              emoji: '☕',
              tone: 'bad' as const,
              time: s.time,
            };
            set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
            return;
          }
        }

        // Determine highest level player qualifies for (up to levelIndex 1 on direct entry — Senior L5+ requires promo packet!)
        let qualifiedIndex = 0;
        for (let i = 0; i < Math.min(2, career.levels.length); i++) {
          const req = career.levels[i].requiredSkill;
          const sec = career.levels[i].secondarySkill;
          const reqNode = career.levels[i].requiredTechNode;
          const hasPrimary = Math.floor(s.skills[req.skill]) >= req.level;
          const hasSecondary = !sec || Math.floor(s.skills[sec.skill]) >= sec.level;
          const hasNode = !reqNode || unlockedNodes.includes(reqNode);
          if (hasPrimary && hasSecondary && hasNode) {
            qualifiedIndex = i;
          }
        }

        const lvl = career.levels[qualifiedIndex];
        let goalIndex = s.goalIndex;
        const signOnBonus =
          entryReq?.difficultyTier === 'Ultra-Selective'
            ? 6000
            : entryReq?.difficultyTier === 'Selective'
              ? 3000
              : 0;
        let cash = s.cash + signOnBonus;
        let karma = s.karma + (signOnBonus > 0 ? 6 : 0);
        if (goalIndex === 0) {
          goalIndex = 1;
          cash += GOALS[0].rewardCash;
          karma += GOALS[0].rewardKarma;
        }

        const energyCost = entryReq?.interviewEnergyCost ?? 15;

        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: `PASSED ${career.company.toUpperCase()} ONSITE LOOP! Signed as ${lvl.code} ${lvl.title} (${formatCurrency(lvl.baseSalary + lvl.rsuAnnual)}/yr TC${signOnBonus > 0 ? ` + ${formatCurrency(signOnBonus)} sign-on bonus` : ''})!`,
          emoji: '🎉',
          tone: 'good' as const,
          time: s.time,
        };

        set({
          needs: {
            ...s.needs,
            energy: clamp(s.needs.energy - energyCost, 0, 100),
          },
          job: {
            careerId,
            levelIndex: qualifiedIndex,
            performance: 35,
            shiftsCompleted: 0,
            shiftsAtLevel: 0,
            deliverablesCompleted: s.job?.deliverablesCompleted ?? 0,
            activeProjectId: getNextCareerProject(careerId, undefined, s.job?.completedProjects),
            projectProgress: 0,
            completedProjects: s.job?.completedProjects ?? [],
            officeDaysThisWeek: s.job?.officeDaysThisWeek ?? 0,
            wfhDaysThisWeek: s.job?.wfhDaysThisWeek ?? 0,
            wfaDaysRemaining: s.job?.wfaDaysRemaining ?? 4,
            weeklyAttendance: s.job?.weeklyAttendance ?? ['none', 'none', 'none', 'none', 'none'],
            rtoCompliant: true,
            autoWork: s.job?.autoWork ?? false,
            preferredCommute: hasPersonalCar(s) ? 'tesla' : s.job?.preferredCommute ?? 'gbus',
          },
          goalIndex,
          cash,
          karma,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      vestRsuToCash: () => {
        const s = get();
        if (s.vestedRsu <= 0) return;
        const mult = s.unlockedPerks.includes('perk_diamond_hands') ? 1.2 : 1.0;
        const payout = Math.round(s.vestedRsu * mult);
        const fin = recordCashFlow(ensureFinanceState(s), {
          time: s.time,
          label: `Liquidated Vested RSUs on Schwaab${mult > 1 ? ' (+20% QSBS)' : ''}`,
          emoji: '💎',
          amount: payout,
          category: 'rsu',
        });
        sfx.play('cash');
        const notice = {
          id: uid(),
          text: `Sold vested RSUs on Schwaab for ${formatCurrency(payout)} cash!`,
          emoji: '💎',
          tone: 'cash' as const,
          time: s.time,
        };
        set({
          cash: s.cash + payout,
          vestedRsu: 0,
          finance: fin,
          stats: {
            ...s.stats,
            earnedToday: s.stats.earnedToday + payout,
            earnedTotal: s.stats.earnedTotal + payout,
          },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      investInPortfolio: (amount) => {
        get().buyStock('QQQX', amount);
      },

      withdrawPortfolio: (amount) => {
        const s = get();
        const fin = ensureFinanceState(s);
        const totalPort = computePortfolioValue(fin);
        if (totalPort <= 0 || amount <= 0) return;
        const fraction = clamp(amount / totalPort, 0.01, 1);
        const holdings = { ...fin.holdings };
        let totalProceeds = 0;
        let totalRealized = 0;

        for (const asset of MARKET_ASSETS) {
          const h = holdings[asset.ticker];
          const p = fin.marketPrices[asset.ticker] || asset.basePrice;
          if (h && h.shares > 0) {
            const sellSh = +(h.shares * fraction).toFixed(4);
            const proc = sellSh * p;
            const basis = sellSh * h.avgCost;
            totalProceeds += proc;
            totalRealized += proc - basis;
            const rem = Math.max(0, +(h.shares - sellSh).toFixed(4));
            holdings[asset.ticker] = {
              shares: rem,
              avgCost: rem > 0 ? h.avgCost : p,
            };
          }
        }

        const roundedProceeds = Math.round(totalProceeds);
        const roundedRealized = Math.round(totalRealized);
        let nextFin: FinanceState = {
          ...fin,
          holdings,
          realizedGains: (fin.realizedGains || 0) + roundedRealized,
        };
        if (roundedRealized !== 0) {
          nextFin = recordCashFlow(nextFin, {
            time: s.time,
            label: `Realized Portfolio P&L (${roundedRealized >= 0 ? 'Gain' : 'Loss'})`,
            emoji: roundedRealized >= 0 ? '📈' : '📉',
            amount: roundedRealized,
            category: 'investments',
          });
        }
        nextFin = recordCashFlow(nextFin, {
          time: s.time,
          label: `Withdrew ${formatCurrency(roundedProceeds)} from Schwaab Portfolio`,
          emoji: '🏦',
          amount: roundedProceeds,
          category: 'trade',
        });

        sfx.play('cash');
        set({
          cash: s.cash + roundedProceeds,
          portfolioValue: computePortfolioValue(nextFin),
          finance: nextFin,
        });
      },

      buyStock: (ticker, dollarAmount) => {
        const s = get();
        const actual = Math.min(Math.floor(dollarAmount), Math.floor(s.cash));
        if (actual <= 0) return;
        const fin = ensureFinanceState(s);
        const asset = MARKET_ASSET_BY_TICKER[ticker] || MARKET_ASSETS[0];
        const price = fin.marketPrices[ticker] || asset.basePrice;
        const boughtShares = actual / price;
        const prev = fin.holdings[ticker] || { shares: 0, avgCost: price };
        const newShares = +(prev.shares + boughtShares).toFixed(4);
        const newAvgCost =
          newShares > 0
            ? +((prev.shares * prev.avgCost + actual) / newShares).toFixed(2)
            : price;

        const nextHoldings = {
          ...fin.holdings,
          [ticker]: { shares: newShares, avgCost: newAvgCost },
        };
        let nextFin: FinanceState = {
          ...fin,
          holdings: nextHoldings,
        };
        nextFin = recordCashFlow(nextFin, {
          time: s.time,
          label: `Bought ${boughtShares.toFixed(2)} sh ${ticker} @ $${price.toFixed(2)}`,
          emoji: asset.emoji,
          amount: -actual,
          category: 'trade',
        });

        const nextPortfolioVal = computePortfolioValue(nextFin);
        const nextSkills = {
          ...s.skills,
          investing: clamp((s.skills.investing || 0) + 0.04, 0, 10),
        };

        sfx.play('cash');
        const notice = {
          id: uid(),
          text: `Order Filled: Bought ${boughtShares.toFixed(2)} sh ${ticker} (${formatCurrency(actual)}) @ $${price.toFixed(2)} on Schwaab.`,
          emoji: asset.emoji,
          tone: 'info' as const,
          time: s.time,
        };
        set({
          cash: s.cash - actual,
          portfolioValue: nextPortfolioVal,
          finance: nextFin,
          skills: nextSkills,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      sellStock: (ticker, amountOrFraction, isFraction = false) => {
        const s = get();
        const fin = ensureFinanceState(s);
        const asset = MARKET_ASSET_BY_TICKER[ticker] || MARKET_ASSETS[0];
        const prev = fin.holdings[ticker];
        if (!prev || prev.shares <= 0.0001) return;

        const price = fin.marketPrices[ticker] || asset.basePrice;
        const sellShares = isFraction
          ? +(prev.shares * clamp(amountOrFraction, 0.01, 1)).toFixed(4)
          : Math.min(prev.shares, +(amountOrFraction / price).toFixed(4));
        if (sellShares <= 0) return;

        const proceeds = Math.round(sellShares * price);
        const costBasis = Math.round(sellShares * prev.avgCost);
        const realizedPnl = proceeds - costBasis;
        const remShares = Math.max(0, +(prev.shares - sellShares).toFixed(4));

        const nextHoldings = {
          ...fin.holdings,
          [ticker]: {
            shares: remShares < 0.001 ? 0 : remShares,
            avgCost: remShares < 0.001 ? price : prev.avgCost,
          },
        };

        let nextFin: FinanceState = {
          ...fin,
          holdings: nextHoldings,
          realizedGains: (fin.realizedGains || 0) + realizedPnl,
        };

        if (realizedPnl !== 0) {
          nextFin = recordCashFlow(nextFin, {
            time: s.time,
            label: `${ticker} Realized ${realizedPnl >= 0 ? 'Gain' : 'Loss'} (${sellShares.toFixed(2)} sh)`,
            emoji: realizedPnl >= 0 ? '📈' : '📉',
            amount: realizedPnl,
            category: 'investments',
          });
        }

        nextFin = recordCashFlow(nextFin, {
          time: s.time,
          label: `Sold ${sellShares.toFixed(2)} sh ${ticker} @ $${price.toFixed(2)} (${realizedPnl >= 0 ? '+' : ''}${formatCurrency(realizedPnl)})`,
          emoji: asset.emoji,
          amount: proceeds,
          category: 'trade',
        });

        const nextPortfolioVal = computePortfolioValue(nextFin);
        sfx.play('cash');
        const notice = {
          id: uid(),
          text: `Sold ${sellShares.toFixed(2)} sh ${ticker} for ${formatCurrency(proceeds)} (${realizedPnl >= 0 ? '+' : ''}${formatCurrency(realizedPnl)} P&L).`,
          emoji: realizedPnl >= 0 ? '💰' : '📊',
          tone: (realizedPnl >= 0 ? 'cash' : 'info') as 'cash' | 'info',
          time: s.time,
        };

        set({
          cash: s.cash + proceeds,
          portfolioValue: nextPortfolioVal,
          finance: nextFin,
          stats:
            realizedPnl > 0
              ? {
                  ...s.stats,
                  earnedToday: s.stats.earnedToday + realizedPnl,
                  earnedTotal: s.stats.earnedTotal + realizedPnl,
                }
              : s.stats,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      applyPortfolioPreset: (preset) => {
        const s = get();
        const deployAmount = Math.min(Math.floor(s.cash), s.cash >= 5000 ? 5000 : Math.floor(s.cash * 0.5));
        if (deployAmount < 500) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: 'Need at least $500 cash to deploy an automated portfolio allocation!',
            emoji: '📊',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        const weights: Array<{ ticker: MarketTicker; weight: number }> =
          preset === 'boglehead'
            ? [
                { ticker: 'QQQX', weight: 0.5 },
                { ticker: 'FRUT', weight: 0.25 },
                { ticker: 'SGOV', weight: 0.25 },
              ]
            : preset === 'ai_supercycle'
            ? [
                { ticker: 'NVDAX', weight: 0.45 },
                { ticker: 'GOGL', weight: 0.35 },
                { ticker: 'AI3X', weight: 0.2 },
              ]
            : [
                { ticker: 'SGOV', weight: 0.7 },
                { ticker: 'QQQX', weight: 0.3 },
              ];

        const fin = ensureFinanceState(s);
        const nextHoldings = { ...fin.holdings };
        for (const w of weights) {
          const sliceUsd = deployAmount * w.weight;
          const price = fin.marketPrices[w.ticker] || MARKET_ASSET_BY_TICKER[w.ticker].basePrice;
          const boughtSh = sliceUsd / price;
          const prev = nextHoldings[w.ticker] || { shares: 0, avgCost: price };
          const newSh = +(prev.shares + boughtSh).toFixed(4);
          const newAvg =
            newSh > 0 ? +((prev.shares * prev.avgCost + sliceUsd) / newSh).toFixed(2) : price;
          nextHoldings[w.ticker] = { shares: newSh, avgCost: newAvg };
        }

        const presetLabel =
          preset === 'boglehead'
            ? '3-Fund Tech & Treasury Basket'
            : preset === 'ai_supercycle'
            ? 'AI Supercycle Basket'
            : 'T-Bill Yield Barbell';

        let nextFin: FinanceState = { ...fin, holdings: nextHoldings };
        nextFin = recordCashFlow(nextFin, {
          time: s.time,
          label: `Auto-Allocated ${formatCurrency(deployAmount)} → ${presetLabel}`,
          emoji: '⚖️',
          amount: -deployAmount,
          category: 'trade',
        });

        sfx.play('cash');
        const notice = {
          id: uid(),
          text: `Deployed ${formatCurrency(deployAmount)} into ${presetLabel} on Schwaab!`,
          emoji: '⚖️',
          tone: 'good' as const,
          time: s.time,
        };

        set({
          cash: s.cash - deployAmount,
          portfolioValue: computePortfolioValue(nextFin),
          finance: nextFin,
          skills: { ...s.skills, investing: clamp((s.skills.investing || 0) + 0.08, 0, 10) },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      toggleDrip: () => {
        sfx.play('tap');
        const s = get();
        const fin = ensureFinanceState(s);
        set({
          finance: { ...fin, dripEnabled: !fin.dripEnabled },
        });
      },

      toggleAutoSellRsu: () => {
        sfx.play('tap');
        const s = get();
        const fin = ensureFinanceState(s);
        set({
          finance: { ...fin, autoSellRsu: !fin.autoSellRsu },
        });
      },

      executeOptionsStrategy: (strategy) => {
        const s = get();
        const fin = ensureFinanceState(s);
        const portVal = computePortfolioValue(fin);

        if (strategy === 'covered_call') {
          if (portVal < 2000) {
            sfx.play('error');
            const notice = {
              id: uid(),
              text: 'Hold at least $2,000 in stocks on Schwaab to write Covered Calls for option premium!',
              emoji: '📑',
              tone: 'bad' as const,
              time: s.time,
            };
            set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
            return;
          }
          const quantOptMult = s.unlockedPerks.includes('perk_renaissance_quant') ? 1.25 : 1.0;
          const premium = Math.round(
            Math.min(2800, Math.max(220, portVal * 0.025 + (s.skills.investing || 0) * 75)) *
              quantOptMult
          );
          const nextFin = recordCashFlow(fin, {
            time: s.time,
            label: 'Weekly Covered Call Option Premium Collected',
            emoji: '📑',
            amount: premium,
            category: 'investments',
          });
          sfx.play('cash');
          const notice = {
            id: uid(),
            text: `Wrote OTM Covered Calls against portfolio: Collected +${formatCurrency(premium)} instant option premium (+0.20 Quant)!`,
            emoji: '📑',
            tone: 'cash' as const,
            time: s.time,
          };
          set({
            cash: s.cash + premium,
            finance: {
              ...nextFin,
              realizedGains: (nextFin.realizedGains || 0) + premium,
            },
            skills: { ...s.skills, investing: clamp((s.skills.investing || 0) + 0.2, 0, 10) },
            stats: {
              ...s.stats,
              earnedToday: s.stats.earnedToday + premium,
              earnedTotal: s.stats.earnedTotal + premium,
            },
            notices: [notice, ...s.notices.slice(0, 29)],
            lastToast: notice,
          });
          return;
        }

        // 'earnings_straddle' / 0DTE AI Catalyst Play
        const quantWinBoost = s.unlockedPerks.includes('perk_renaissance_quant') ? 0.1 : 0;
        const quantOptMult = s.unlockedPerks.includes('perk_renaissance_quant') ? 1.25 : 1.0;
        const winProb = Math.min(
          0.95,
          0.72 + Math.min(0.18, (s.skills.investing || 0) * 0.02) + quantWinBoost
        );
        const win = Math.random() < winProb;
        if (win) {
          const gain = Math.round(
            (440 + (s.skills.investing || 0) * 110 + Math.min(1200, portVal * 0.015)) *
              quantOptMult
          );
          const nextFin = recordCashFlow(fin, {
            time: s.time,
            label: 'NVDAX / AI Earnings Catalyst Call Hit',
            emoji: '📈',
            amount: gain,
            category: 'investments',
          });
          sfx.play('cash');
          const notice = {
            id: uid(),
            text: `AI Earnings Catalyst Call Hit! +${formatCurrency(gain)} Alpha & +0.25 Quant`,
            emoji: '📈',
            tone: 'cash' as const,
            time: s.time,
          };
          set({
            cash: s.cash + gain,
            finance: {
              ...nextFin,
              realizedGains: (nextFin.realizedGains || 0) + gain,
            },
            skills: { ...s.skills, investing: clamp((s.skills.investing || 0) + 0.25, 0, 10) },
            needs: { ...s.needs, fun: clamp(s.needs.fun + 8, 0, 100) },
            stats: {
              ...s.stats,
              earnedToday: s.stats.earnedToday + gain,
              earnedTotal: s.stats.earnedTotal + gain,
            },
            notices: [notice, ...s.notices.slice(0, 29)],
            lastToast: notice,
          });
        } else {
          const loss = 150;
          const nextFin = recordCashFlow(fin, {
            time: s.time,
            label: '0DTE Option Theta Decay Clip (Hedged)',
            emoji: '📊',
            amount: -loss,
            category: 'investments',
          });
          sfx.play('tap');
          const notice = {
            id: uid(),
            text: `IV crush & theta clipped -${formatCurrency(loss)} · Hedged delta exposure (+0.15 Quant)`,
            emoji: '📊',
            tone: 'info' as const,
            time: s.time,
          };
          set({
            cash: Math.max(0, s.cash - loss),
            finance: {
              ...nextFin,
              realizedGains: (nextFin.realizedGains || 0) - loss,
            },
            skills: { ...s.skills, investing: clamp((s.skills.investing || 0) + 0.15, 0, 10) },
            notices: [notice, ...s.notices.slice(0, 29)],
            lastToast: notice,
          });
        }
      },

      payLoan: (amount) => {
        const s = get();
        const pay = Math.min(amount, s.loanOwed, s.cash);
        if (pay <= 0) return;
        sfx.play('cash');
        const remaining = s.loanOwed - pay;
        const fin = recordCashFlow(ensureFinanceState(s), {
          time: s.time,
          label: `SAFE / Student Note Repayment (${remaining === 0 ? 'Paid Off!' : `${formatCurrency(remaining)} left`})`,
          emoji: '🏦',
          amount: -pay,
          category: 'upgrades',
        });
        const notice = {
          id: uid(),
          text:
            remaining === 0
              ? 'SAFE / Student Note 100% paid off! You are debt-free!'
              : `Paid ${formatCurrency(pay)} toward note. Remaining: ${formatCurrency(remaining)}.`,
          emoji: '🏦',
          tone: 'good' as const,
          time: s.time,
        };
        set({
          cash: s.cash - pay,
          loanOwed: remaining,
          finance: fin,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      buyFurniture: (furnitureId) => {
        const s = get();
        const def = FURNITURE_BY_ID[furnitureId];
        if (!def) return;
        if (s.cash < def.price) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${formatCurrency(def.price)} to buy ${def.name}.`,
            emoji: '🛋️',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        const homeDef = HOMES.find((h) => h.id === s.homeId) || HOMES[1];
        const gridSize = homeDef.gridSize;

        // Prefer the apartment's desk alcove coordinate for compute rigs if open
        let placedX = 2;
        let placedY = 2;
        const preferredDesk = getHomeDeskCoord(s.homeId);
        if (
          def.category === 'compute' &&
          !s.objects.some((o) => o.x === preferredDesk.x && o.y === preferredDesk.y)
        ) {
          placedX = preferredDesk.x;
          placedY = preferredDesk.y;
        } else {
          outer: for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
              const occupied = s.objects.some((o) => o.x === x && o.y === y);
              if (!occupied) {
                placedX = x;
                placedY = y;
                break outer;
              }
            }
          }
        }

        let goalIndex = s.goalIndex;
        let karma = s.karma;
        let bonusCash = 0;
        if (goalIndex === 4) {
          goalIndex = 5;
          bonusCash = GOALS[4].rewardCash;
          karma += GOALS[4].rewardKarma;
        }

        sfx.play('cash');
        const notice = {
          id: uid(),
          text:
            def.category === 'compute'
              ? `Installed ${def.name}! Click your computer or press C to launch the interactive desktop workstation.`
              : `Delivered & installed ${def.name} in your apartment!`,
          emoji: def.emoji,
          tone: 'good' as const,
          time: s.time,
        };

        set({
          cash: s.cash - def.price + bonusCash,
          karma,
          goalIndex,
          objects: [
            ...s.objects,
            {
              uid: uid(),
              objectId: def.id,
              x: placedX,
              y: placedY,
            },
          ],
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      installOrUpgradeHomeComputer: (furnitureId) => {
        const s = get();
        const def = FURNITURE_BY_ID[furnitureId];
        if (!def || def.category !== 'compute') return;

        const existing = getInstalledHomeComputer(s);
        const tradeInValue = existing ? Math.round(existing.def.price * 0.65) : 0;
        const netCost = Math.max(0, def.price - tradeInValue);

        if (s.cash < netCost) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${formatCurrency(netCost)} (${existing ? `after ${formatCurrency(tradeInValue)} trade-in` : 'cash'}) to install ${def.name}.`,
            emoji: '🖥️',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        const homeDef = HOMES.find((h) => h.id === s.homeId) || HOMES[1];
        const gridSize = homeDef.gridSize;
        const preferredDesk = getHomeDeskCoord(s.homeId);

        let targetX = existing ? existing.placed.x : preferredDesk.x;
        let targetY = existing ? existing.placed.y : preferredDesk.y;

        if (
          !existing &&
          s.objects.some((o) => o.x === targetX && o.y === targetY)
        ) {
          outerSpot: for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
              if (!s.objects.some((o) => o.x === x && o.y === y)) {
                targetX = x;
                targetY = y;
                break outerSpot;
              }
            }
          }
        }

        let goalIndex = s.goalIndex;
        let karma = s.karma + (existing ? 4 : 6);
        let bonusCash = 0;
        if (goalIndex === 4) {
          goalIndex = 5;
          bonusCash = GOALS[4].rewardCash;
          karma += GOALS[4].rewardKarma;
        }

        const nextObjects = existing
          ? s.objects.map((o) =>
              o.uid === existing.placed.uid
                ? { ...o, objectId: def.id, x: targetX, y: targetY }
                : o
            )
          : [
              ...s.objects,
              {
                uid: uid(),
                objectId: def.id,
                x: targetX,
                y: targetY,
              },
            ];

        const fin = recordCashFlow(ensureFinanceState(s), {
          time: s.time,
          label: existing
            ? `Upgraded Home Computer → ${def.name} (Trade-in +${formatCurrency(tradeInValue)})`
            : `Installed Home Computer: ${def.name}`,
          emoji: def.emoji,
          amount: -netCost,
          category: 'upgrades',
        });

        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: existing
            ? `Upgraded Home Workstation to ${def.emoji} ${def.name} (Trade-in credit: ${formatCurrency(tradeInValue)})!`
            : `Installed ${def.emoji} ${def.name} in your apartment! Interactive Desktop OS online.`,
          emoji: def.emoji,
          tone: 'good' as const,
          time: s.time,
        };

        set({
          cash: s.cash - netCost + bonusCash,
          karma,
          goalIndex,
          finance: fin,
          objects: nextObjects,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      sellFurniture: (objUid) => {
        const s = get();
        const found = s.objects.find((o) => o.uid === objUid);
        if (!found) return;
        const def = FURNITURE_BY_ID[found.objectId];
        const resale = def ? Math.round(def.price * 0.65) : 200;
        sfx.play('cash');
        set({
          cash: s.cash + resale,
          objects: s.objects.filter((o) => o.uid !== objUid),
        });
      },

      moveHome: (newHomeId, purchase = false) => {
        const s = get();
        const homeDef = HOMES.find((h) => h.id === newHomeId);
        if (!homeDef) return;
        const alreadyOwned = s.ownedHomes.includes(newHomeId);
        const cost = purchase ? homeDef.buyPrice : alreadyOwned ? 0 : homeDef.weeklyRent;
        if (s.cash < cost) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${formatCurrency(cost)} to ${purchase ? 'buy' : 'lease'} ${homeDef.name}.`,
            emoji: '🏡',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        // If already living in this home and just purchasing the deed, keep existing room layout intact
        if (s.homeId === newHomeId && purchase) {
          sfx.play('levelup');
          const notice = {
            id: uid(),
            text: `Purchased Property Deed to ${homeDef.name}! $0/wk rent forever & +${formatCurrency(homeDef.buyPrice)} real estate equity.`,
            emoji: '🔑',
            tone: 'good' as const,
            time: s.time,
          };
          set({
            cash: s.cash - cost,
            ownedHomes: Array.from(new Set([...s.ownedHomes, newHomeId])),
            notices: [notice, ...s.notices.slice(0, 29)],
            lastToast: notice,
          });
          return;
        }

        // Keep existing high-tier furniture and merge starter objects if missing categories
        const newObjects = homeDef.starterObjects.map((o) => ({
          uid: uid(),
          objectId: o.objectId,
          x: o.x,
          y: o.y,
        }));

        let carriedOverCount = 0;
        let nextInventory = [...(s.inventory || [])];
        for (const prevPlaced of s.objects) {
          const prevDef = FURNITURE_BY_ID[prevPlaced.objectId];
          if (!prevDef) continue;
          // Check if the new home has an item in the same category with lower quality
          const sameCatIdx = newObjects.findIndex((no) => {
            const noDef = FURNITURE_BY_ID[no.objectId];
            return noDef && noDef.category === prevDef.category && noDef.quality < prevDef.quality;
          });
          if (sameCatIdx !== -1) {
            newObjects[sameCatIdx] = {
              ...newObjects[sameCatIdx],
              objectId: prevDef.id,
            };
            carriedOverCount++;
          } else if (!newObjects.some((no) => no.objectId === prevDef.id)) {
            // Find an open tile on the new home's grid for extra owned gear (fitness, power, decor, etc.)
            let openTile: { x: number; y: number } | null = null;
            outerCarry: for (let gy = 0; gy < homeDef.gridSize; gy++) {
              for (let gx = 0; gx < homeDef.gridSize; gx++) {
                if (!newObjects.some((no) => no.x === gx && no.y === gy)) {
                  openTile = { x: gx, y: gy };
                  break outerCarry;
                }
              }
            }
            if (openTile) {
              newObjects.push({
                uid: uid(),
                objectId: prevDef.id,
                x: openTile.x,
                y: openTile.y,
              });
              carriedOverCount++;
            } else {
              // Automatically pack overflow furniture into Backpack so nothing is ever lost!
              const existingIdx = nextInventory.findIndex(
                (entry) => entry.itemId === prevDef.id && entry.kind === 'furniture'
              );
              if (existingIdx !== -1) {
                nextInventory[existingIdx] = {
                  ...nextInventory[existingIdx],
                  quantity: nextInventory[existingIdx].quantity + 1,
                };
              } else {
                nextInventory.push({ itemId: prevDef.id, kind: 'furniture', quantity: 1 });
              }
            }
          }
        }

        // Swap home ambient moodlet to the new residence's signature aura
        const allHomeMoodletIds = new Set(
          HOMES.map((h) => h.bonuses.ambientMoodletId).filter(Boolean)
        );
        const updatedMoodlets = [
          ...s.moodlets.filter((m) => !allHomeMoodletIds.has(m.id)),
          { id: homeDef.bonuses.ambientMoodletId, expiresAt: s.time + 1440 },
        ];

        sfx.play('levelup');
        const perkSummary = homeDef.perks.map((p) => `${p.emoji} ${p.label}`).join(' · ');
        const notice = {
          id: uid(),
          text: `${purchase ? 'Purchased Deed to' : 'Moved into'} ${homeDef.name} (${homeDef.tierLabel})! Unlocked: ${perkSummary}${carriedOverCount > 0 ? ` · Moved ${carriedOverCount} custom gear!` : ''}`,
          emoji: homeDef.emoji,
          tone: 'good' as const,
          time: s.time,
        };

        set({
          cash: s.cash - cost,
          homeId: newHomeId,
          locationId: 'home',
          view: 'live',
          ownedHomes: purchase
            ? Array.from(new Set([...s.ownedHomes, newHomeId]))
            : s.ownedHomes,
          objects: newObjects,
          inventory: nextInventory,
          moodlets: updatedMoodlets,
          pos: { x: Math.floor(homeDef.gridSize / 2), y: Math.floor(homeDef.gridSize / 2) },
          targetPos: null,
          activeModal: null,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      buyHomeProperty: (homeId) => {
        get().moveHome(homeId, true);
      },

      buyCar: (carMode, price) => {
        const s = get();
        if (s.ownedCars.includes(carMode)) return;
        if (s.cash < price) {
          sfx.play('error');
          return;
        }
        const vehId: VehicleId =
          carMode === 'prius' || carMode === 'tesla' || carMode === 'taycan' ? carMode : 'tesla';
        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: 'Took delivery of your new EV! HOV lane & $0 personal drives unlocked across the Bay.',
          emoji: '🏎️',
          tone: 'good' as const,
          time: s.time,
        };
        set({
          cash: s.cash - price,
          ownedCars: Array.from(new Set([...s.ownedCars, carMode, 'tesla'])),
          activeCarId: vehId,
          job: s.job ? { ...s.job, preferredCommute: 'tesla' } : s.job,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      buyVehicle: (vehicleId) => {
        const s = get();
        const veh = VEHICLE_BY_ID[vehicleId];
        if (!veh) return;
        if (s.ownedCars.includes(vehicleId)) {
          get().selectActiveCar(vehicleId);
          return;
        }
        if (s.cash < veh.price) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${formatCurrency(veh.price)} cash to take delivery of ${veh.name}.`,
            emoji: veh.emoji,
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }
        sfx.play('levelup');
        const moodDef = MOODLETS[veh.moodletId];
        const nextMoodlets = moodDef
          ? [
              ...s.moodlets.filter((m) => m.id !== moodDef.id),
              { id: moodDef.id, expiresAt: s.time + moodDef.durationMinutes },
            ]
          : s.moodlets;
        const notice = {
          id: uid(),
          text: `Delivered ${veh.name} (${veh.tierLabel || veh.autopilotTier})! $0 Fares Forever, HOV Autopilot (${veh.baseMinutes}m drives), & CarPlay active!`,
          emoji: veh.emoji,
          tone: 'good' as const,
          time: s.time,
        };
        set({
          cash: s.cash - veh.price,
          ownedCars: Array.from(new Set([...s.ownedCars, vehicleId, 'tesla'])),
          activeCarId: vehicleId,
          job: s.job ? { ...s.job, preferredCommute: 'tesla' } : s.job,
          moodlets: nextMoodlets,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      selectActiveCar: (vehicleId) => {
        const s = get();
        const veh = VEHICLE_BY_ID[vehicleId];
        if (!veh || !s.ownedCars.includes(vehicleId)) return;
        sfx.play('tap');
        const notice = {
          id: uid(),
          text: `${veh.name} set as your primary daily driver (${veh.baseMinutes}m base commute · $0 fare).`,
          emoji: veh.emoji,
          tone: 'info' as const,
          time: s.time,
        };
        set({
          activeCarId: vehicleId,
          job: s.job ? { ...s.job, preferredCommute: 'tesla' } : s.job,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      takeCarJoyride: () => {
        const s = get();
        const veh = getActiveVehicle(s);
        if (!veh) {
          sfx.play('error');
          return;
        }
        const existingMoodlet = s.moodlets.find((m) => m.id === veh.moodletId);
        if (existingMoodlet && existingMoodlet.expiresAt - s.time > 120) {
          sfx.play('tap');
          const notice = {
            id: uid(),
            text: `Already cruised in your ${veh.shortName} recently! Let the battery cool down before another Karma joyride.`,
            emoji: veh.emoji,
            tone: 'info' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }
        sfx.play('levelup');
        const moodDef = MOODLETS[veh.moodletId];
        const nextMoodlets = moodDef
          ? [
              ...s.moodlets.filter((m) => m.id !== moodDef.id),
              { id: moodDef.id, expiresAt: s.time + moodDef.durationMinutes },
            ]
          : s.moodlets;
        const joyLabel = veh.joyrideLabel || veh.joyrideReward.label;
        const notice = {
          id: uid(),
          text: `${joyLabel} in your ${veh.shortName}! +${veh.joyrideReward.fun}% Fun, +${veh.joyrideReward.energy}% Energy, +${veh.joyrideReward.karma} Karma ⚡`,
          emoji: veh.emoji,
          tone: 'good' as const,
          time: s.time + 15,
        };
        set({
          time: s.time + 15,
          needs: {
            ...s.needs,
            fun: clamp(s.needs.fun + veh.joyrideReward.fun, 0, 100),
            energy: clamp(s.needs.energy + veh.joyrideReward.energy, 0, 100),
          },
          karma: s.karma + veh.joyrideReward.karma,
          moodlets: nextMoodlets,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      buyBackpackItem: (itemId) => {
        const s = get();
        const def = BACKPACK_ITEM_BY_ID[itemId];
        if (!def) return;
        const inv = [...(s.inventory || [])];
        const existingIdx = inv.findIndex((i) => i.itemId === itemId && i.kind === 'item');
        if (!def.consumable && existingIdx !== -1 && inv[existingIdx].quantity > 0) {
          // Already owns this reusable EDC item; trigger use instead
          get().useBackpackItem(itemId);
          return;
        }
        if (s.cash < def.price) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${formatCurrency(def.price)} to buy ${def.name}.`,
            emoji: def.emoji,
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }
        if (existingIdx !== -1) {
          inv[existingIdx] = { ...inv[existingIdx], quantity: inv[existingIdx].quantity + 1 };
        } else {
          inv.push({ itemId, kind: 'item', quantity: 1 });
        }
        sfx.play('cash');
        const nextSim = def.equipAccessory
          ? {
              ...s.sim,
              appearance: { ...s.sim.appearance, accessory: def.equipAccessory },
            }
          : s.sim;
        const passiveTxt = def.passiveBoost || def.passiveBadge;
        const notice = {
          id: uid(),
          text: `Added ${def.name} to your Backpack! ${passiveTxt ? `(${passiveTxt})` : 'Ready to use anytime.'}`,
          emoji: def.emoji,
          tone: 'good' as const,
          time: s.time,
        };
        set({
          cash: s.cash - def.price,
          inventory: inv,
          sim: nextSim,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      useBackpackItem: (itemId) => {
        const s = get();
        const def = BACKPACK_ITEM_BY_ID[itemId];
        if (!def) return;
        const inv = [...(s.inventory || [])];
        const idx = inv.findIndex((i) => i.itemId === itemId && i.kind === 'item' && i.quantity > 0);
        if (idx === -1) return;

        const nd = def.needsDelta || {};
        // Check if reusable EDC item costs energy and player is too exhausted
        if (!def.consumable && (nd.energy || 0) < 0 && s.needs.energy < 14) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Too exhausted to use ${def.name}! Drink a coffee or rest first.`,
            emoji: '🪫',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        if (def.consumable) {
          if (inv[idx].quantity <= 1) {
            inv.splice(idx, 1);
          } else {
            inv[idx] = { ...inv[idx], quantity: inv[idx].quantity - 1 };
          }
        }

        const nextNeeds = { ...s.needs };
        (Object.keys(nd) as NeedKey[]).forEach((k) => {
          const delta = nd[k] || 0;
          nextNeeds[k] = clamp(nextNeeds[k] + delta, 0, 100);
        });

        const nextSkills = { ...s.skills };
        let karmaAdd = 0;
        if (def.skillGain) {
          const sk = def.skillGain.skill;
          const xpAdd =
            def.skillGain.amount > 1
              ? +(def.skillGain.amount / 100).toFixed(2)
              : def.skillGain.amount;
          const prevFloor = Math.floor(nextSkills[sk]);
          nextSkills[sk] = Math.min(10, +(nextSkills[sk] + xpAdd).toFixed(2));
          if (Math.floor(nextSkills[sk]) > prevFloor) {
            karmaAdd += 3;
          }
        }

        const nextStartup = def.startupDelta
          ? {
              ...s.startup,
              productProgress: clamp(s.startup.productProgress + def.startupDelta, 0, 100),
              users: s.startup.users + Math.round(def.startupDelta * 15),
            }
          : s.startup;

        const cashAdd = def.cashBonus || 0;
        let nextMoodlets = [...s.moodlets];
        if (def.moodletId && MOODLETS[def.moodletId]) {
          const mDef = MOODLETS[def.moodletId];
          nextMoodlets = [
            ...nextMoodlets.filter((m) => m.id !== mDef.id),
            { id: mDef.id, expiresAt: s.time + mDef.durationMinutes },
          ];
        }

        const nextSim = def.equipAccessory
          ? {
              ...s.sim,
              appearance: { ...s.sim.appearance, accessory: def.equipAccessory },
            }
          : s.sim;

        sfx.play(cashAdd > 0 ? 'cash' : def.skillGain ? 'levelup' : 'tap');
        const summaryParts: string[] = [];
        if (nd.energy && nd.energy > 0) summaryParts.push(`+${nd.energy}% Energy`);
        if (nd.hunger && nd.hunger > 0) summaryParts.push(`+${nd.hunger}% Hunger`);
        if (nd.fun && nd.fun > 0) summaryParts.push(`+${nd.fun}% Fun`);
        if (def.skillGain) summaryParts.push(`+${def.skillGain.amount} ${def.skillGain.skill} XP`);
        if (def.startupDelta) summaryParts.push(`+${def.startupDelta}% Startup Product`);
        if (cashAdd > 0) summaryParts.push(`+${formatCurrency(cashAdd)}`);

        const notice = {
          id: uid(),
          text: `${def.consumable ? 'Consumed' : 'Used'} ${def.name}! ${summaryParts.join(' · ')}`,
          emoji: def.emoji,
          tone: (cashAdd > 0 ? 'cash' : 'good') as 'cash' | 'good',
          time: s.time,
        };

        set({
          inventory: inv,
          needs: nextNeeds,
          skills: nextSkills,
          startup: nextStartup,
          cash: s.cash + cashAdd,
          karma: s.karma + karmaAdd,
          moodlets: nextMoodlets,
          sim: nextSim,
          stats: {
            ...s.stats,
            earnedToday: s.stats.earnedToday + cashAdd,
            earnedTotal: s.stats.earnedTotal + cashAdd,
          },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      storeFurnitureInBackpack: (placedUid) => {
        const s = get();
        const found = s.objects.find((o) => o.uid === placedUid);
        if (!found) return;
        const def = FURNITURE_BY_ID[found.objectId];
        const inv = [...(s.inventory || [])];
        const idx = inv.findIndex((i) => i.itemId === found.objectId && i.kind === 'furniture');
        if (idx !== -1) {
          inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + 1 };
        } else {
          inv.push({ itemId: found.objectId, kind: 'furniture', quantity: 1 });
        }
        sfx.play('tap');
        const notice = {
          id: uid(),
          text: `Packed ${def?.name || 'Furniture'} into your Backpack (100% value preserved).`,
          emoji: '🎒',
          tone: 'info' as const,
          time: s.time,
        };
        set({
          objects: s.objects.filter((o) => o.uid !== placedUid),
          inventory: inv,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      placeFurnitureFromBackpack: (furnitureId) => {
        const s = get();
        const def = FURNITURE_BY_ID[furnitureId];
        if (!def) return;
        const inv = [...(s.inventory || [])];
        const idx = inv.findIndex(
          (i) => i.itemId === furnitureId && i.kind === 'furniture' && i.quantity > 0
        );
        if (idx === -1) return;

        const homeDef = HOMES.find((h) => h.id === s.homeId) || HOMES[1];
        const gridSize = homeDef.gridSize;
        let placedX = 2;
        let placedY = 2;
        outerPlace: for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            const occupied = s.objects.some((o) => o.x === x && o.y === y);
            if (!occupied) {
              placedX = x;
              placedY = y;
              break outerPlace;
            }
          }
        }

        if (inv[idx].quantity <= 1) {
          inv.splice(idx, 1);
        } else {
          inv[idx] = { ...inv[idx], quantity: inv[idx].quantity - 1 };
        }

        sfx.play('tap');
        const notice = {
          id: uid(),
          text: `Unpacked ${def.name} from Backpack and placed in ${homeDef.shortName}!`,
          emoji: def.emoji,
          tone: 'good' as const,
          time: s.time,
        };

        set({
          inventory: inv,
          locationId: 'home',
          objects: [
            ...s.objects,
            {
              uid: uid(),
              objectId: def.id,
              x: placedX,
              y: placedY,
            },
          ],
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      sellBackpackItem: (itemId, kind) => {
        const s = get();
        const inv = [...(s.inventory || [])];
        const idx = inv.findIndex((i) => i.itemId === itemId && i.kind === kind && i.quantity > 0);
        if (idx === -1) return;

        const basePrice =
          kind === 'furniture'
            ? FURNITURE_BY_ID[itemId]?.price || 200
            : BACKPACK_ITEM_BY_ID[itemId]?.price || 30;
        const itemName =
          kind === 'furniture'
            ? FURNITURE_BY_ID[itemId]?.name || 'Gear'
            : BACKPACK_ITEM_BY_ID[itemId]?.name || 'Item';
        const resale = Math.max(10, Math.round(basePrice * 0.7));

        if (inv[idx].quantity <= 1) {
          inv.splice(idx, 1);
        } else {
          inv[idx] = { ...inv[idx], quantity: inv[idx].quantity - 1 };
        }

        sfx.play('cash');
        const notice = {
          id: uid(),
          text: `Sold ${itemName} from Backpack for ${formatCurrency(resale)} cash!`,
          emoji: '💵',
          tone: 'cash' as const,
          time: s.time,
        };

        set({
          cash: s.cash + resale,
          inventory: inv,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      interactWithNpc: (npcId, kind) => {
        const s = get();
        const npc = NPCS.find((n) => n.id === npcId);
        if (!npc) return;
        const currentRel = s.relationships[npcId] || {
          npcId,
          score: 10,
          status: 'Stranger' as RelationshipStatus,
          lastInteractionDay: 0,
          messages: [],
        };

        const charismaBonus = s.sim.traits.includes('exFounder') ? 4 : 0;
        let delta = 8 + charismaBonus;
        let reply = '';
        let skillBoost: { skill: SkillKey; amount: number } | null = null;
        let startupBoost = 0;

        if (kind === 'linkedin') {
          delta = 10 + charismaBonus;
          reply = `Connected! Let’s grab a Blue Bottle cortado in ${npc.favoriteSpot.replace('_', ' ')} sometime.`;
        } else if (kind === 'coffeeChat') {
          delta = 14 + charismaBonus;
          reply = `Loved chatting about ${npc.company} architecture and Bay Area life!`;
          skillBoost = { skill: 'charisma', amount: 18 };
        } else if (kind === 'whiteboard') {
          delta = 15 + charismaBonus;
          reply = `That system design breakdown was L7-tier. Learned a ton!`;
          skillBoost = { skill: 'systemDesign', amount: 22 };
        } else if (kind === 'pitch') {
          delta = 12 + charismaBonus;
          startupBoost = 10;
          reply = `Super sharp wedge for ${s.startup.name}. I’ll intro you to two Sand Hill angels!`;
          skillBoost = { skill: 'hustle', amount: 20 };
        } else if (kind === 'flirt') {
          delta = 16 + charismaBonus;
          reply = `Sunset walk at Dolores Park or oysters at Ferry Building next Friday? ✨`;
        }

        const superConnMult = s.unlockedPerks.includes('perk_super_connector') ? 1.4 : 1.0;
        const superConnSkillMult = s.unlockedPerks.includes('perk_super_connector') ? 1.5 : 1.0;
        const newScore = clamp(currentRel.score + Math.round(delta * superConnMult), 0, 100);
        const newStatus = getRelStatus(newScore);

        const nextSkills = { ...s.skills };
        if (skillBoost) {
          nextSkills[skillBoost.skill] = Math.min(
            10,
            +(
              nextSkills[skillBoost.skill] +
              (skillBoost.amount * superConnSkillMult) / 100
            ).toFixed(2)
          );
        }

        let goalIndex = s.goalIndex;
        let cash = s.cash;
        let karma = s.karma;
        if (goalIndex === 3) {
          goalIndex = 4;
          cash += GOALS[3].rewardCash;
          karma += GOALS[3].rewardKarma;
        }

        const wishes = s.wishes.map((w) => {
          if (w.kind === 'social') {
            return { ...w, progress: Math.min(w.targetValue, w.progress + 1) };
          }
          return w;
        });

        sfx.play('notice');
        const notice = {
          id: uid(),
          text: `${npc.name} (${newStatus}): "${reply}"`,
          emoji: '💬',
          tone: 'good' as const,
          time: s.time,
        };

        set({
          skills: nextSkills,
          needs: {
            ...s.needs,
            social: clamp(s.needs.social + 22),
            fun: clamp(s.needs.fun + 12),
          },
          startup: {
            ...s.startup,
            productProgress: clamp(s.startup.productProgress + startupBoost),
          },
          relationships: {
            ...s.relationships,
            [npcId]: {
              ...currentRel,
              score: newScore,
              status: newStatus,
              lastInteractionDay: getDayNumber(s.time),
              messages: [
                ...currentRel.messages.slice(-15),
                { from: 'npc', text: reply, time: s.time },
              ],
            },
          },
          wishes,
          goalIndex,
          cash,
          karma,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      orderDoorDash: (itemId) => {
        const s = get();
        const item = DOORDASH_MENU.find((d) => d.id === itemId);
        if (!item) return;
        if (s.cash < item.price) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${formatCurrency(item.price)} for ${item.name}.`,
            emoji: '🛵',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        const nextMoodlets = [...s.moodlets];
        if (item.moodlet && MOODLETS[item.moodlet]) {
          const mDef = MOODLETS[item.moodlet];
          nextMoodlets.push({ id: mDef.id, expiresAt: s.time + mDef.durationMinutes });
        }

        const fin = recordCashFlow(ensureFinanceState(s), {
          time: s.time,
          label: `DoorDash: ${item.name}`,
          emoji: item.emoji,
          amount: -item.price,
          category: 'living',
        });

        sfx.play('cash');
        const notice = {
          id: uid(),
          text: `DoorDash delivered ${item.name}!`,
          emoji: item.emoji,
          tone: 'good' as const,
          time: s.time,
        };

        set({
          cash: s.cash - item.price,
          pantryMeals: s.pantryMeals + item.pantryAdd,
          finance: fin,
          needs: {
            ...s.needs,
            hunger: clamp(s.needs.hunger + item.hunger),
            energy: clamp(s.needs.energy + item.energy),
            fun: clamp(s.needs.fun + item.fun),
          },
          moodlets: nextMoodlets,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      pitchStartupVC: () => {
        const s = get();
        const st = s.startup;
        if (st.productProgress < 50) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Build your Startup MVP to at least 50% (currently ${Math.round(st.productProgress)}%) before pitching VCs!`,
            emoji: '🚀',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        const stages: Array<GameState['startup']['stage']> = [
          'Ideation',
          'Weekend Prototype',
          'YC Batch',
          'Seed Funded',
          'Series A Unicorn',
        ];
        const currIdx = stages.indexOf(st.stage);
        const nextStage = stages[Math.min(stages.length - 1, currIdx + 1)];

        const vcMult = s.unlockedPerks.includes('perk_vc_whisperer') ? 1.35 : 1.0;
        const fundingGrant = Math.round(
          (nextStage === 'Weekend Prototype'
            ? 25000
            : nextStage === 'YC Batch'
            ? 125000
            : nextStage === 'Seed Funded'
            ? 450000
            : 1500000) * vcMult
        );

        const newVal = Math.round(
          (nextStage === 'Weekend Prototype'
            ? 3500000
            : nextStage === 'YC Batch'
            ? 12000000
            : nextStage === 'Seed Funded'
            ? 42000000
            : 1000000000) * vcMult
        );

        const newMrr = Math.round(
          (nextStage === 'Weekend Prototype'
            ? 3500
            : nextStage === 'YC Batch'
            ? 18000
            : nextStage === 'Seed Funded'
            ? 85000
            : 320000) * vcMult
        );

        const fin = recordCashFlow(ensureFinanceState(s), {
          time: s.time,
          label: `${st.name} ${nextStage} VC Secondary Liquidity`,
          emoji: '🦄',
          amount: fundingGrant,
          category: 'startup',
        });

        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: `TERM SHEET SIGNED! ${st.name} reached ${nextStage} (${formatCurrency(newVal)} valuation) · +${formatCurrency(fundingGrant)} founder liquidity & +12 ⚡ Karma!`,
          emoji: '🦄',
          tone: 'cash' as const,
          time: s.time,
        };

        set({
          cash: s.cash + fundingGrant,
          karma: s.karma + 12,
          finance: fin,
          startup: {
            ...st,
            stage: nextStage,
            productProgress: nextStage === 'Series A Unicorn' ? 100 : 20,
            users: st.users * 4 + 2500,
            mrr: newMrr,
            valuation: newVal,
            ycAccepted: nextStage === 'YC Batch' || st.ycAccepted,
            fundedAmount: st.fundedAmount + fundingGrant,
          },
          moodlets: [
            ...s.moodlets.filter((m) => m.id !== 'yc_momentum'),
            { id: 'yc_momentum', expiresAt: s.time + 480 },
          ],
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      renameStartup: (name, tagline) => {
        sfx.play('tap');
        set((s) => ({
          startup: {
            ...s.startup,
            name: name.trim() || s.startup.name,
            tagline: tagline.trim() || s.startup.tagline,
          },
        }));
      },

      claimPerk: (perkId) => {
        const s = get();
        const perk = REWARD_PERKS.find((p) => p.id === perkId);
        if (!perk || s.unlockedPerks.includes(perkId)) return;

        if (perk.prereqId && !s.unlockedPerks.includes(perk.prereqId)) {
          sfx.play('error');
          const prereq = REWARD_PERK_BY_ID[perk.prereqId];
          const notice = {
            id: uid(),
            text: `🔒 Prerequisite Required: Unlock Tier ${prereq?.tier ?? (perk.tier - 1)} "${prereq?.name || perk.prereqId}" first in the ${perk.branch.toUpperCase()} tree!`,
            emoji: '🔒',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        if (s.karma < perk.cost) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Need ${perk.cost} ⚡ Karma (have ${s.karma} ⚡) to unlock ${perk.name}. Complete Bay Area OKRs or level up skills!`,
            emoji: '⚡',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: `🌳 Karma Tree Tier ${perk.tier} Unlocked: ${perk.emoji} ${perk.name} (${perk.shortEffect})!`,
          emoji: perk.emoji,
          tone: 'good' as const,
          time: s.time,
        };
        set({
          karma: s.karma - perk.cost,
          unlockedPerks: [...s.unlockedPerks, perkId],
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      resolveEventChoice: (choiceIndex) => {
        const s = get();
        if (!s.activeEvent) return;
        const choice = s.activeEvent.choices[choiceIndex];
        if (!choice) return;

        let success = true;
        if (choice.skillCheck) {
          const playerLevel = s.skills[choice.skillCheck.skill] || 0;
          success = playerLevel + Math.random() * 2.5 >= choice.skillCheck.difficulty;
        }

        const text = success ? choice.successText : choice.failText || choice.successText;
        const cashAdd = success ? choice.cashDelta || 0 : Math.round((choice.cashDelta || 0) * 0.35);
        const rsuAdd = success ? choice.rsuDelta || 0 : 0;
        const perfAdd = success ? choice.performanceDelta || 0 : 2;
        const startupAdd = success ? choice.startupDelta || 0 : 5;

        const nextNeeds = { ...s.needs };
        if (choice.needsDelta) {
          (Object.keys(choice.needsDelta) as NeedKey[]).forEach((k) => {
            nextNeeds[k] = clamp(nextNeeds[k] + (choice.needsDelta![k] || 0));
          });
        }

        const nextMoodlets = [...s.moodlets];
        if (success && choice.moodletId && MOODLETS[choice.moodletId]) {
          const mDef = MOODLETS[choice.moodletId];
          nextMoodlets.push({ id: mDef.id, expiresAt: s.time + mDef.durationMinutes });
        }

        sfx.play(success ? 'cash' : 'tap');
        const notice = {
          id: uid(),
          text,
          emoji: choice.emoji,
          tone: (success ? 'good' : 'info') as 'good' | 'info',
          time: s.time,
        };

        set({
          activeEvent: null,
          cash: s.cash + cashAdd,
          vestedRsu: s.vestedRsu + rsuAdd,
          needs: nextNeeds,
          moodlets: nextMoodlets,
          job: s.job
            ? { ...s.job, performance: clamp(s.job.performance + perfAdd, 0, 100) }
            : null,
          startup: {
            ...s.startup,
            productProgress: clamp(s.startup.productProgress + startupAdd, 0, 100),
          },
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      dismissToast: () => set({ lastToast: null }),

      updateAppearance: (appearance) => {
        sfx.play('tap');
        set((s) => ({
          sim: { ...s.sim, appearance },
        }));
      },

      autoFixNeed: (needKey) => {
        const s = get();
        if (s.locationId === 'home') {
          let bestActionId: string | null = null;
          let bestGain = 0;
          let bestPlacedUid: string | undefined;
          let bestPos: { x: number; y: number } | undefined;

          for (const placed of s.objects) {
            const fDef = FURNITURE_BY_ID[placed.objectId];
            if (!fDef) continue;
            for (const actId of fDef.actions) {
              const act = ACTIONS[actId];
              if (!act) continue;
              const gain = act.needsDelta?.[needKey] || 0;
              if (gain > bestGain) {
                bestGain = gain;
                bestActionId = actId;
                bestPlacedUid = placed.uid;
                bestPos = { x: placed.x, y: placed.y };
              }
            }
          }

          if (bestActionId && bestPlacedUid) {
            get().enqueueAction(bestActionId, { objectUid: bestPlacedUid, pos: bestPos });
            return;
          }
        } else {
          const venue = LOCATION_BY_ID[s.locationId];
          if (venue) {
            let bestActionId: string | null = null;
            let bestGain = 0;
            let bestStationId: string | undefined;
            let bestPos: { x: number; y: number } | undefined;

            for (const st of venue.stations) {
              for (const actId of st.actionIds) {
                const act = ACTIONS[actId];
                if (!act) continue;
                const gain = act.needsDelta?.[needKey] || 0;
                if (gain > bestGain) {
                  bestGain = gain;
                  bestActionId = actId;
                  bestStationId = st.id;
                  bestPos = { x: st.x, y: st.y };
                }
              }
            }

            if (bestActionId && bestStationId) {
              get().enqueueAction(bestActionId, { stationId: bestStationId, pos: bestPos });
              return;
            }
          }
        }

        // Fallback: instant micro-boost if no object in current venue restores this need
        sfx.play('tap');
        const nextNeeds = { ...s.needs, [needKey]: clamp(s.needs[needKey] + 22) };
        const notice = {
          id: uid(),
          text: `Quick ${needKey} recharge (+22%)`,
          emoji: '✨',
          tone: 'info' as const,
          time: s.time,
        };
        set({
          needs: nextNeeds,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      triggerMicroReward: (opts) => {
        const s = get();
        let cashAdd = opts.cashDelta || 0;
        let karmaAdd = opts.karmaDelta || 0;
        let goalIndex = s.goalIndex;
        if (
          goalIndex === 1 &&
          (opts.skill === 'coding' ||
            opts.skill === 'systemDesign' ||
            opts.skill === 'aiResearch' ||
            opts.startupDelta)
        ) {
          goalIndex = 2;
          cashAdd += GOALS[1].rewardCash;
          karmaAdd += GOALS[1].rewardKarma;
        }
        const nextSkills = { ...s.skills };
        if (opts.skill && opts.skillDelta) {
          nextSkills[opts.skill] = clamp(nextSkills[opts.skill] + opts.skillDelta, 0, 10);
        }
        const nextNeeds = { ...s.needs };
        if (opts.needKey && opts.needDelta) {
          nextNeeds[opts.needKey] = clamp(nextNeeds[opts.needKey] + opts.needDelta, 0, 100);
        }
        const nextJob =
          s.job && opts.performanceDelta
            ? { ...s.job, performance: clamp(s.job.performance + opts.performanceDelta, 0, 100) }
            : s.job;
        const nextStartup = opts.startupDelta
          ? {
              ...s.startup,
              productProgress: clamp(s.startup.productProgress + opts.startupDelta, 0, 100),
              users: s.startup.users + Math.max(0, Math.round(opts.startupDelta * 18)),
            }
          : s.startup;

        sfx.play(cashAdd > 0 ? 'cash' : opts.skillDelta || opts.karmaDelta ? 'levelup' : 'tap');

        const notice = opts.toastText
          ? {
              id: uid(),
              text: opts.toastText,
              emoji: opts.emoji || '⚡',
              tone: (cashAdd > 0 ? 'cash' : 'good') as 'cash' | 'good',
              time: s.time,
            }
          : null;

        let fin = ensureFinanceState(s);
        if (cashAdd !== 0) {
          fin = recordCashFlow(fin, {
            time: s.time,
            label: opts.toastText ? opts.toastText.split('!')[0] : 'Micro-Action Cash Flow',
            emoji: opts.emoji || '💸',
            amount: cashAdd,
            category: cashAdd > 0 ? 'bounties' : 'living',
          });
        }

        set({
          cash: Math.max(0, s.cash + cashAdd),
          karma: Math.max(0, s.karma + karmaAdd),
          goalIndex,
          finance: fin,
          skills: nextSkills,
          needs: nextNeeds,
          job: nextJob,
          startup: nextStartup,
          stats: {
            ...s.stats,
            earnedToday: s.stats.earnedToday + Math.max(0, cashAdd),
            earnedTotal: s.stats.earnedTotal + Math.max(0, cashAdd),
            leetCodeSolved:
              opts.skill === 'coding' ? s.stats.leetCodeSolved + 1 : s.stats.leetCodeSolved,
            commitsPushed:
              opts.startupDelta || opts.performanceDelta
                ? s.stats.commitsPushed + 1
                : s.stats.commitsPushed,
          },
          notices: notice ? [notice, ...s.notices.slice(0, 29)] : s.notices,
          lastToast: notice || s.lastToast,
        });
      },

      tick: (deltaMinutes) => {
        const s = get();
        if (s.screen !== 'play' || s.speed === 0 || s.activeEvent) return;

        const dt = deltaMinutes * s.speed;
        const prevTime = s.time;
        const newTime = prevTime + dt;
        const prevDay = getDayNumber(prevTime);
        const newDay = getDayNumber(newTime);
        const prevHourBucket = Math.floor(prevTime / 60);
        const newHourBucket = Math.floor(newTime / 60);

        let cash = s.cash;
        let vestedRsu = s.vestedRsu;
        let unvestedRsu = s.unvestedRsu;
        let finance = ensureFinanceState(s);
        let portfolioValue = computePortfolioValue(finance);
        let karma = s.karma;
        let pantryMeals = s.pantryMeals;
        let pgePowerOn = s.pgePowerOn;
        let pgeChangeAt = s.pgeChangeAt;
        let weather = s.weather;
        let locationId = s.locationId;
        let travel = s.travel ? { ...s.travel } : null;
        let workShift = s.workShift ? { ...s.workShift } : null;
        let job = s.job ? { ...s.job } : null;
        let startup = { ...s.startup };
        let pos = { ...s.pos };
        let targetPos = s.targetPos ? { ...s.targetPos } : null;
        let queue = [...s.queue];
        let needs = { ...s.needs };
        let skills = { ...s.skills };
        let moodlets = s.moodlets.filter((m) => m.expiresAt > newTime);
        let wishes = [...s.wishes];
        let notices = [...s.notices];
        let lastToast = s.lastToast;
        let activeEvent: GameState['activeEvent'] = s.activeEvent;
        let goalIndex = s.goalIndex;
        let stats = { ...s.stats };

        const pushNotice = (
          text: string,
          emoji: string,
          tone: 'info' | 'good' | 'bad' | 'cash' = 'info'
        ) => {
          const item = { id: uid(), text, emoji, tone, time: newTime };
          notices = [item, ...notices.slice(0, 29)];
          lastToast = item;
        };

        // 0. Intraday Stock Market Price Movement (updates every game hour)
        if (newHourBucket > prevHourBucket && newDay === prevDay) {
          const regimeBias =
            finance.marketRegime === 'AI Supercycle'
              ? 0.0022
              : finance.marketRegime === 'Rate Cut Rally'
              ? 0.0014
              : finance.marketRegime === 'Sector Rotation'
              ? 0.0008
              : -0.0011;
          const nextPrices = { ...finance.marketPrices };
          const nextHist = { ...finance.marketHistory };
          for (const asset of MARKET_ASSETS) {
            const curP = nextPrices[asset.ticker] || asset.basePrice;
            const hourlyStep =
              asset.drift / 10 +
              (asset.sector === 'Treasury Yield' ? 0.0001 : regimeBias) +
              (Math.sin(newHourBucket * 1.37 + asset.basePrice) * 0.45 + (Math.random() - 0.48) * 0.55) *
                (asset.volatility / 4);
            const updatedP = Math.max(
              asset.basePrice * 0.35,
              +(curP * (1 + hourlyStep)).toFixed(2)
            );
            nextPrices[asset.ticker] = updatedP;
            const histArr = [...(nextHist[asset.ticker] || [curP]), updatedP].slice(-14);
            nextHist[asset.ticker] = histArr;
          }
          finance = {
            ...finance,
            marketPrices: nextPrices,
            marketHistory: nextHist,
          };
          portfolioValue = computePortfolioValue(finance);
        }

        // 1. Day rollover: Stock Market Close/Open, Dividends, RSU vesting, Startup MRR, Weekly Rent, Weather
        if (newDay > prevDay) {
          stats.daysLived = newDay;
          stats.earnedToday = 0;

          const weathers: WeatherKind[] = ['sunny', 'foggy', 'breezy', 'sunny', 'rain'];
          weather = weathers[newDay % weathers.length];

          // Rotate market headline & regime for the new trading session
          const headlineItem = MARKET_HEADLINES[newDay % MARKET_HEADLINES.length];
          const prevClose = { ...finance.marketPrices };
          const nextPrices = { ...finance.marketPrices };
          const nextHist = { ...finance.marketHistory };
          const regimeMult =
            headlineItem.regime === 'AI Supercycle'
              ? 1.35
              : headlineItem.regime === 'Rate Cut Rally'
              ? 1.15
              : headlineItem.regime === 'Sector Rotation'
              ? 1.05
              : 0.65;

          for (const asset of MARKET_ASSETS) {
            const curP = nextPrices[asset.ticker] || asset.basePrice;
            const dailyMove =
              asset.drift * regimeMult +
              Math.sin(newDay * 1.7 + asset.basePrice) * asset.volatility * 0.6;
            const updatedP = Math.max(
              asset.basePrice * 0.35,
              +(curP * (1 + dailyMove)).toFixed(2)
            );
            nextPrices[asset.ticker] = updatedP;
            nextHist[asset.ticker] = [...(nextHist[asset.ticker] || [curP]), updatedP].slice(-14);
          }

          // Calculate daily dividends & treasury yield across held positions
          const nextHoldings = { ...finance.holdings };
          let totalDivPayout = 0;
          const quantPerkMult = s.unlockedPerks.includes('perk_renaissance_quant') ? 1.5 : 1.0;
          const quantBoost = (1 + (skills.investing || 0) * 0.04) * quantPerkMult;
          for (const asset of MARKET_ASSETS) {
            const h = nextHoldings[asset.ticker];
            const p = nextPrices[asset.ticker] || asset.basePrice;
            if (h && h.shares > 0 && asset.dailyDividendYield > 0) {
              const divUsd = h.shares * p * asset.dailyDividendYield * quantBoost;
              totalDivPayout += divUsd;
              if (finance.dripEnabled && p > 0) {
                const dripShares = divUsd / p;
                nextHoldings[asset.ticker] = {
                  shares: +(h.shares + dripShares).toFixed(4),
                  avgCost: h.avgCost,
                };
              }
            }
          }

          const roundedDiv = Math.round(totalDivPayout);
          finance = {
            ...finance,
            holdings: nextHoldings,
            marketPrices: nextPrices,
            marketPrevClose: prevClose,
            marketHistory: nextHist,
            marketRegime: headlineItem.regime,
            marketNews: headlineItem.headline,
            dividendsEarnedToday: roundedDiv,
            dividendsEarnedTotal: (finance.dividendsEarnedTotal || 0) + roundedDiv,
          };

          if (roundedDiv > 0) {
            if (!finance.dripEnabled) {
              cash += roundedDiv;
            }
            stats.earnedToday += roundedDiv;
            stats.earnedTotal += roundedDiv;
            finance = recordCashFlow(finance, {
              time: newTime,
              label: finance.dripEnabled
                ? `Schwaab Dividend & T-Bill Yield (DRIP Reinvested)`
                : `Schwaab Dividend & T-Bill Yield Payout`,
              emoji: '🏛️',
              amount: roundedDiv,
              category: 'investments',
            });
          }

          portfolioValue = computePortfolioValue(finance);

          // Daily RSU drip vest (12% of unvested vests daily in game time, 16% with Diamond Hands)
          if (unvestedRsu >= 100) {
            const vestRate = s.unlockedPerks.includes('perk_diamond_hands') ? 0.16 : 0.12;
            const dailyVest = Math.round(unvestedRsu * vestRate);
            unvestedRsu -= dailyVest;
            vestedRsu += dailyVest;

            if (finance.autoSellRsu && vestedRsu > 0) {
              const mult = s.unlockedPerks.includes('perk_diamond_hands') ? 1.2 : 1.0;
              const rsuCash = Math.round(vestedRsu * mult);
              cash += rsuCash;
              stats.earnedToday += rsuCash;
              stats.earnedTotal += rsuCash;
              finance = recordCashFlow(finance, {
                time: newTime,
                label: `Auto-Sold Vested RSUs on Schwaab (${formatCurrency(vestedRsu)} vest)`,
                emoji: '💎',
                amount: rsuCash,
                category: 'rsu',
              });
              vestedRsu = 0;
              pushNotice(
                `Schwaab Auto-Liquidate: Vested RSUs converted to +${formatCurrency(rsuCash)} cash!`,
                '💎',
                'cash'
              );
            }
          }

          // Startup daily revenue payout
          if (startup.mrr > 0) {
            const vcMrrMult = s.unlockedPerks.includes('perk_vc_whisperer') ? 1.35 : 1.0;
            const dailyRev = Math.round((startup.mrr * vcMrrMult) / 7);
            cash += dailyRev;
            stats.earnedToday += dailyRev;
            stats.earnedTotal += dailyRev;
            finance = recordCashFlow(finance, {
              time: newTime,
              label: `Stripe MRR Payout (${startup.name})`,
              emoji: '💳',
              amount: dailyRev,
              category: 'startup',
            });
            pushNotice(
              `Stripe Payout: +${formatCurrency(dailyRev)} recurring revenue from ${startup.name}!`,
              '💳',
              'cash'
            );
          }

          // Weekly rent every 7 days if home is not owned
          if (newDay % 7 === 0 && !s.ownedHomes.includes(s.homeId)) {
            const homeDef = HOMES.find((h) => h.id === s.homeId) || HOMES[1];
            const rentMult = s.unlockedPerks.includes('perk_renaissance_quant') ? 0.75 : 1.0;
            const actualWeeklyRent = Math.round(homeDef.weeklyRent * rentMult);
            if (cash >= actualWeeklyRent) {
              cash -= actualWeeklyRent;
              finance = recordCashFlow(finance, {
                time: newTime,
                label: `Weekly Rent (${homeDef.shortName}${rentMult < 1 ? ' · Tax Arb -25%' : ''})`,
                emoji: '🏠',
                amount: -actualWeeklyRent,
                category: 'rent',
              });
              pushNotice(
                `Paid weekly apartment rent (${formatCurrency(actualWeeklyRent)}) for ${homeDef.name}.`,
                '🏠',
                'info'
              );
            } else {
              pushNotice(
                `Rent is due (${formatCurrency(actualWeeklyRent)})! Vest RSUs or ship a freelance bounty.`,
                '⚠️',
                'bad'
              );
            }
          }

          // Weekly Monday Hybrid RTO Policy Rollover & Compliance Audit
          const weekdayAfterRollover = Math.floor(newTime / 1440) % 7;
          if (weekdayAfterRollover === 0 && newDay > 2 && job) {
            const officeLogged = job.officeDaysThisWeek ?? 0;
            const career = CAREER_BY_ID[job.careerId];
            if (officeLogged >= 3) {
              const stipend = 500;
              cash += stipend;
              stats.earnedToday += stipend;
              stats.earnedTotal += stipend;
              finance = recordCashFlow(finance, {
                time: newTime,
                label: `Hybrid RTO Commuter Stipend (${career?.company || 'HQ'})`,
                emoji: '🏢',
                amount: stipend,
                category: 'salary',
              });
              job = {
                ...job,
                rtoCompliant: true,
                performance: clamp(job.performance + 8, 0, 100),
                officeDaysThisWeek: 0,
                wfhDaysThisWeek: 0,
                weeklyAttendance: ['none', 'none', 'none', 'none', 'none'],
                wfaDaysRemaining: Math.min(4, (job.wfaDaysRemaining ?? 4) + 2),
              };
              pushNotice(
                `Hybrid RTO Audit Passed (${officeLogged}/3 Office Days at ${career?.company || 'HQ'})! +$500 Commuter Stipend, +8% Calibration, & WFA Passport topped up.`,
                '🏢',
                'good'
              );
            } else {
              job = {
                ...job,
                rtoCompliant: false,
                performance: clamp(job.performance - 12, 0, 100),
                officeDaysThisWeek: 0,
                wfhDaysThisWeek: 0,
                weeklyAttendance: ['none', 'none', 'none', 'none', 'none'],
                wfaDaysRemaining: Math.min(4, (job.wfaDaysRemaining ?? 4) + 1),
              };
              pushNotice(
                `Hybrid RTO Warning: Only ${officeLogged}/3 required Office Days logged last week! -12% Calibration & Promo Packet frozen until compliant.`,
                '🚨',
                'bad'
              );
            }
          }
        }

        // 2. PG&E Power Outage cycle (Lagos Life's NEPA mechanic adapted to Bay Area!)
        if (newTime >= pgeChangeAt) {
          if (pgePowerOn) {
            // 30% chance of a brief PG&E grid event when timer hits
            if (Math.random() < 0.35) {
              pgePowerOn = false;
              pgeChangeAt = newTime + 150; // 2.5h outage
              if (hasHomeBackupPower(s)) {
                sfx.play('powerUp');
                pushNotice(
                  'PG&E transformer tripped in your neighborhood, but your Backup Battery kicked in seamlessly! 🔋',
                  '🔋',
                  'good'
                );
              } else {
                sfx.play('powerDown');
                if (!s.unlockedPerks.includes('perk_bionic_flow')) {
                  moodlets.push({ id: 'pge_blackout', expiresAt: newTime + 150 });
                }
                pushNotice(
                  'PG&E Grid Shutoff! Power & Xfinity Wi-Fi are out at home. Buy an EcoFlow/Powerwall or work from a cafe!',
                  '🕯️',
                  'bad'
                );
              }
            } else {
              pgeChangeAt = newTime + 600;
            }
          } else {
            pgePowerOn = true;
            pgeChangeAt = newTime + 720;
            moodlets = moodlets.filter((m) => m.id !== 'pge_blackout');
            sfx.play('powerUp');
            pushNotice('PG&E restored grid power & fiber internet! ⚡', '⚡', 'good');
          }
        }

        // 3. Passive Needs Decay & Home Ambient Luxury Aura
        const currentHomeDef = HOME_BY_ID[s.homeId] || HOMES[1];
        const homeDecayMult = currentHomeDef.bonuses?.needDecayMult ?? 1.0;
        const homeAmbientId = currentHomeDef.bonuses?.ambientMoodletId;
        if (homeAmbientId && MOODLETS[homeAmbientId]) {
          const allHomeMoodletIds = new Set(
            HOMES.map((h) => h.bonuses.ambientMoodletId).filter(Boolean)
          );
          moodlets = [
            ...moodlets.filter((m) => !allHomeMoodletIds.has(m.id)),
            { id: homeAmbientId, expiresAt: newTime + 1440 },
          ];
        }

        const hoursElapsed = dt / 60;
        const biohackerMult = s.sim.traits.includes('biohacker') ? 0.75 : 1.0;
        const caffeinePerk = s.unlockedPerks.includes('perk_caffeine_synth') ? 0.7 : 1.0;
        const zenPerk = s.unlockedPerks.includes('perk_zero_burnout') ? 0.65 : 1.0;
        const circadianPerk = s.unlockedPerks.includes('perk_circadian_pod') ? 0.7 : 1.0;

        needs.hunger = clamp(needs.hunger - 3.2 * hoursElapsed * circadianPerk * homeDecayMult);
        needs.energy = clamp(
          needs.energy - 2.8 * hoursElapsed * biohackerMult * caffeinePerk * homeDecayMult
        );
        needs.hygiene = clamp(
          needs.hygiene - 2.0 * hoursElapsed * biohackerMult * circadianPerk * homeDecayMult
        );
        needs.bladder = clamp(needs.bladder - 3.6 * hoursElapsed * circadianPerk * homeDecayMult);
        needs.fun = clamp(needs.fun - 2.5 * hoursElapsed * zenPerk * homeDecayMult);
        needs.social = clamp(needs.social - 2.1 * hoursElapsed * zenPerk * homeDecayMult);

        // 4. Travel Progression
        if (travel) {
          if (newTime >= travel.arriveAt) {
            const dest = travel.to;
            const modeDef = COMMUTE_MODES.find((m) => m.id === travel!.mode);
            locationId = dest;
            travel = null;
            pos = { x: 3, y: 3 };
            targetPos = null;
            if (!stats.placesVisited.includes(dest)) {
              stats.placesVisited = [...stats.placesVisited, dest];
            }
            const activeVehOnArrival = s.travel?.mode === 'tesla' ? getActiveVehicle(s) : null;
            const arrivalMoodletId = activeVehOnArrival?.moodletId || modeDef?.moodletId;
            if (arrivalMoodletId && MOODLETS[arrivalMoodletId]) {
              const mDef = MOODLETS[arrivalMoodletId];
              moodlets = [
                ...moodlets.filter((m) => m.id !== mDef.id),
                { id: mDef.id, expiresAt: newTime + mDef.durationMinutes },
              ];
            }
            if (goalIndex === 2 && dest !== 'home') {
              goalIndex = 3;
              cash += GOALS[2].rewardCash;
              karma += GOALS[2].rewardKarma;
            }
            wishes = wishes.map((w) =>
              w.kind === 'visit' && w.targetKey === dest ? { ...w, progress: w.targetValue } : w
            );

            if (s.travel?.autoStartShiftOnArrival && job) {
              const career = CAREER_BY_ID[job.careerId];
              if (career) {
                const duration = (career.shiftEndHour - career.shiftStartHour) * 60;
                job = logShiftAttendance(job, 'office', newTime);
                workShift = {
                  startedAt: newTime,
                  endsAt: newTime + duration,
                  totalMinutes: duration,
                  elapsedMinutes: 0,
                  tone: 'deepWork',
                  mode: 'office',
                  workLocationId: career.locationId,
                };
                pushNotice(
                  `Arrived & badged into ${career.company} Campus (${career.levels[job.levelIndex].code}). Let’s ship!`,
                  career.emoji,
                  'info'
                );
              }
            }
          }
        }

        // 5. Auto-Work Check (Hybrid-Aware: commutes to campus for 3 required office days or starts WFH)
        const hourNow = getHourOfDay(newTime);
        const dayIdx = Math.floor(newTime / 1440) % 7; // 0=Mon..4=Fri
        if (
          job &&
          job.autoWork &&
          !workShift &&
          !travel &&
          dayIdx < 5 &&
          hourNow >= CAREER_BY_ID[job.careerId].shiftStartHour &&
          hourNow < CAREER_BY_ID[job.careerId].shiftStartHour + 0.5 &&
          job.lastWorkDayLogged !== newDay
        ) {
          const career = CAREER_BY_ID[job.careerId];
          const duration = (career.shiftEndHour - career.shiftStartHour) * 60;
          queue = [];

          if (locationId === career.locationId) {
            job = logShiftAttendance(job, 'office', newTime);
            workShift = {
              startedAt: newTime,
              endsAt: newTime + duration,
              totalMinutes: duration,
              elapsedMinutes: 0,
              tone: 'deepWork',
              mode: 'office',
              workLocationId: career.locationId,
            };
            pushNotice(`Auto-badged into ${career.company} Campus shift!`, career.emoji, 'info');
          } else if (
            locationId === 'home' &&
            (job.officeDaysThisWeek ?? 0) >= 3 &&
            (job.wfhDaysThisWeek ?? 0) < 2 &&
            (pgePowerOn || hasHomeBackupPower(s)) &&
            Boolean(getInstalledHomeComputer(s))
          ) {
            job = logShiftAttendance(job, 'wfh', newTime);
            workShift = {
              startedAt: newTime,
              endsAt: newTime + duration,
              totalMinutes: duration,
              elapsedMinutes: 0,
              tone: 'deepWork',
              mode: 'wfh',
              workLocationId: 'home',
            };
            pushNotice(`Auto-logged into Remote WFH shift (${job.wfhDaysThisWeek}/2 WFH days)!`, '🏡', 'info');
          } else {
            const preferredId: CommuteModeId = hasPersonalCar(s)
              ? 'tesla'
              : job!.preferredCommute || 'gbus';
            const preferred = COMMUTE_MODES.find((m) => m.id === preferredId) || COMMUTE_MODES[0];
            const activeVeh = preferredId === 'tesla' ? getActiveVehicle(s) : null;
            const commuteEst = calculateCommuteDetails(
              locationId,
              career.locationId,
              s.homeId,
              preferred.id,
              activeVeh?.id || s.activeCarId
            );
            const hasClipperVip = s.unlockedPerks.includes('perk_clipper_vip');
            const cost = hasClipperVip ? 0 : commuteEst.fare;
            if (cash >= cost) {
              cash -= cost;
              const mins = hasClipperVip
                ? Math.max(8, Math.round(commuteEst.durationMinutes * 0.8))
                : commuteEst.durationMinutes;
              travel = {
                from: locationId,
                to: career.locationId,
                mode: preferred.id,
                startedAt: newTime,
                arriveAt: newTime + mins,
                totalMinutes: mins,
                fare: cost,
                autoStartShiftOnArrival: true,
              };
              pushNotice(
                `Auto-commuting via ${activeVeh ? activeVeh.name : preferred.name} to ${career.company} Campus (${commuteEst.miles} mi · ${mins}m)...`,
                activeVeh ? activeVeh.emoji : preferred.emoji,
                'info'
              );
            }
          }
        }

        // 6. Active Work Shift Progression
        if (workShift && job) {
          const career = CAREER_BY_ID[job.careerId];
          const lvl = career.levels[job.levelIndex];
          const toneDef = WORK_TONES.find((t) => t.id === workShift!.tone) || WORK_TONES[0];

          workShift.elapsedMinutes += dt;
          const leetcodeMult = s.sim.traits.includes('leetcodeGrinder') ? 1.25 : 1.0;
          const promoPerk = s.unlockedPerks.includes('perk_promo_magnet') ? 1.3 : 1.0;
          const officeBonus = workShift.mode === 'office' ? 1.18 : 1.0;

          const perfGain = (dt / 60) * 1.55 * toneDef.perfMult * leetcodeMult * promoPerk * officeBonus;
          job.performance = clamp(job.performance + perfGain, 0, 100);
          const charterPerkMult = s.unlockedPerks.includes('perk_promo_magnet') ? 1.15 : 1.0;
          const nextProjProg =
            (job.projectProgress || 0) +
            (dt / 60) * 3.2 * toneDef.perfMult * officeBonus * charterPerkMult;
          if (nextProjProg >= 100) {
            const finishedId = job.activeProjectId || getNextCareerProject(job.careerId, undefined, job.completedProjects);
            const projDef = WORK_PROJECT_BY_ID[finishedId];
            const completedList = job.completedProjects || [];
            const nextCompleted = completedList.includes(finishedId) ? completedList : [...completedList, finishedId];
            const bonusCash = projDef?.rewardCash ?? 1400;
            const bonusPerf = projDef?.promoPerfBoost ?? 10;
            cash += bonusCash;
            karma += 4;
            stats.earnedToday += bonusCash;
            stats.earnedTotal += bonusCash;
            finance = recordCashFlow(finance, {
              time: newTime,
              label: `Charter Milestone Bonus (${projDef?.title || 'Core Initiative'})`,
              emoji: projDef?.emoji || '🚀',
              amount: bonusCash,
              category: 'bounties',
            });
            job.deliverablesCompleted = (job.deliverablesCompleted ?? 0) + 1;
            job.completedProjects = nextCompleted;
            job.activeProjectId = getNextCareerProject(job.careerId, finishedId, nextCompleted);
            job.projectProgress = 0;
            job.performance = clamp(job.performance + bonusPerf, 0, 100);
            pushNotice(
              `Shipped Charter Milestone "${projDef?.title || 'Core Initiative'}" during shift! +1 Deliverable, +4 ⚡ Karma & +${formatCurrency(bonusCash)} spot bonus!`,
              projDef?.emoji || '🚀',
              'good'
            );
          } else {
            job.projectProgress = clamp(nextProjProg, 0, 100);
          }
          const shiftDrainMult = s.unlockedPerks.includes('perk_bionic_flow') ? 0.65 : 1.0;
          needs.energy = clamp(
            needs.energy - (dt / 60) * 2.2 * toneDef.energyDrainMult * shiftDrainMult
          );
          needs.social = clamp(needs.social + (dt / 60) * (toneDef.socialBonus * 0.25));

          // Mid-shift interactive dilemma (once per shift around 45% mark)
          if (
            !workShift.dilemmaTriggered &&
            workShift.elapsedMinutes >= workShift.totalMinutes * 0.45 &&
            Math.random() < 0.28
          ) {
            workShift.dilemmaTriggered = true;
            const evPool = RANDOM_EVENTS;
            activeEvent = evPool[Math.floor(Math.random() * evPool.length)];
            sfx.play('notice');
          }

          if (workShift.elapsedMinutes >= workShift.totalMinutes) {
            // Shift complete!
            const execHaloMult = s.unlockedPerks.includes('perk_exec_halo') ? 1.25 : 1.0;
            const payCash = Math.round(lvl.shiftPay * execHaloMult);
            const payRsu = Math.round(lvl.rsuPerShift * execHaloMult);
            cash += payCash;
            unvestedRsu += payRsu;
            job.shiftsCompleted += 1;
            job.shiftsAtLevel = (job.shiftsAtLevel ?? 0) + 1;
            stats.earnedToday += payCash;
            stats.earnedTotal += payCash;
            finance = recordCashFlow(finance, {
              time: newTime,
              label: `${career.company} W-2 Shift Pay (${lvl.code})`,
              emoji: career.emoji,
              amount: payCash,
              category: 'salary',
            });

            // Multi-gate Promotion Committee Check!
            const nextLvl = career.levels[job.levelIndex + 1];
            const reqShifts = nextLvl?.minShiftsForPromo ?? 4;
            const reqDeliv = nextLvl?.requiredDeliverables ?? 1;
            const reqPerf = s.unlockedPerks.includes('perk_exec_halo') ? 82 : 92;
            const hasPrimary = nextLvl ? Math.floor(skills[nextLvl.requiredSkill.skill]) >= nextLvl.requiredSkill.level : false;
            const hasSecondary = nextLvl?.secondarySkill
              ? Math.floor(skills[nextLvl.secondarySkill.skill]) >= nextLvl.secondarySkill.level
              : true;
            const unlockedNodes = s.unlockedTechNodes ?? ['node_git_monorepo'];
            const hasTechNode =
              !nextLvl?.requiredTechNode || unlockedNodes.includes(nextLvl.requiredTechNode);
            const rtoOk = job.rtoCompliant !== false && ((job.officeDaysThisWeek ?? 0) >= 3 || job.shiftsCompleted <= 3);

            if (
              nextLvl &&
              job.performance >= reqPerf &&
              job.shiftsAtLevel >= reqShifts &&
              (job.deliverablesCompleted ?? 0) >= reqDeliv &&
              hasPrimary &&
              hasSecondary &&
              hasTechNode &&
              rtoOk
            ) {
              job.levelIndex += 1;
              job.performance = 35;
              job.shiftsAtLevel = 0;
              const spotBonus = Math.round(nextLvl.baseSalary * 0.06);
              cash += spotBonus;
              karma += 12;
              finance = recordCashFlow(finance, {
                time: newTime,
                label: `Promotion Bonus (${nextLvl.code} @ ${career.company})`,
                emoji: '👑',
                amount: spotBonus,
                category: 'salary',
              });
              sfx.play('levelup');
              pushNotice(
                `PROMO COMMITTEE APPROVED: Promoted to ${nextLvl.code} ${nextLvl.title} at ${career.company}! New TC: ${formatCurrency(nextLvl.baseSalary + nextLvl.rsuAnnual)}/yr + ${formatCurrency(spotBonus)} bonus + 12 ⚡ Karma!`,
                '👑',
                'good'
              );
            } else {
              sfx.play('cash');
              const modeTag =
                workShift.mode === 'office'
                  ? `🏢 Campus (${job.officeDaysThisWeek}/3 Office)`
                  : workShift.mode === 'wfh'
                    ? `🏡 Remote (${job.wfhDaysThisWeek}/2 WFH)`
                    : `✈️ WFA (${job.wfaDaysRemaining}/4 Pass Left)`;
              pushNotice(
                `Shift complete (${modeTag})! Earned ${formatCurrency(payCash)} cash + ${formatCurrency(payRsu)} RSU.`,
                '💸',
                'cash'
              );
            }

            workShift = null;
          }
        }

        // 7. Tile-by-Tile Movement & Action Queue Execution
        if (!travel) {
          if (targetPos && (pos.x !== targetPos.x || pos.y !== targetPos.y)) {
            const dx = targetPos.x - pos.x;
            const dy = targetPos.y - pos.y;
            const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
            const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
            pos = { x: pos.x + stepX, y: pos.y + stepY };
            if (pos.x === targetPos.x && pos.y === targetPos.y) {
              targetPos = null;
            }
          }

          if (queue.length > 0) {
            const current = { ...queue[0] };
            const def = ACTIONS[current.actionId];
            if (!def) {
              queue.shift();
            } else {
              if (!current.started) {
                current.started = true;
                if (current.targetPos) {
                  targetPos = current.targetPos;
                }
                if (def.cost) {
                  cash = Math.max(0, cash - def.cost);
                  finance = recordCashFlow(finance, {
                    time: newTime,
                    label: def.label,
                    emoji: def.emoji,
                    amount: -def.cost,
                    category: 'living',
                  });
                }
                if (def.requiresPantry) {
                  pantryMeals = Math.max(0, pantryMeals - def.requiresPantry);
                }
              }

              current.elapsedMinutes += dt;
              const progressStep = dt / current.totalMinutes;

              // Apply needs deltas proportionally (boosted by Home Luxury Recovery when at home & Circadian Pod perk)
              const homeCareMult =
                locationId === 'home' ? currentHomeDef.bonuses?.sleepRecoveryMult ?? 1.0 : 1.0;
              const circadianRecoveryMult = s.unlockedPerks.includes('perk_circadian_pod')
                ? 1.3
                : 1.0;
              (Object.keys(def.needsDelta) as NeedKey[]).forEach((k) => {
                const rawDelta = def.needsDelta[k] || 0;
                const scaledDelta =
                  rawDelta > 0
                    ? rawDelta *
                      circadianRecoveryMult *
                      (k === 'energy' || k === 'hygiene' || k === 'fun' ? homeCareMult : 1.0)
                    : rawDelta;
                const delta = scaledDelta * progressStep;
                needs[k] = clamp(needs[k] + delta);
              });

              // Apply skill gains proportionally (boosted by Home Luxury Studio XP multiplier & Karma Tree perks)
              if (def.skillGain) {
                const sk = def.skillGain.skill;
                const homeSkillMult =
                  locationId === 'home' ? currentHomeDef.bonuses?.skillXpMult ?? 1.0 : 1.0;
                const tenXMult =
                  s.sim.traits.includes('tenXEngineer') &&
                  (sk === 'coding' || sk === 'systemDesign' || sk === 'aiResearch')
                    ? 1.3
                    : 1.0;
                const rubberDuckMult =
                  s.unlockedPerks.includes('perk_rubber_duck') &&
                  (sk === 'coding' || sk === 'systemDesign')
                    ? 1.15
                    : 1.0;
                const perkMult =
                  s.unlockedPerks.includes('perk_flow_state') &&
                  (sk === 'coding' || sk === 'systemDesign' || sk === 'aiResearch')
                    ? 1.3
                    : 1.0;
                const superConnSkillMult =
                  s.unlockedPerks.includes('perk_super_connector') &&
                  (sk === 'charisma' || sk === 'hustle')
                    ? 1.5
                    : 1.0;
                const principalMult = s.unlockedPerks.includes('perk_principal_architect')
                  ? 1.35
                  : 1.0;
                const edcMacbookMult =
                  (s.inventory || []).some((i) => i.itemId === 'edc_macbook' && i.quantity > 0) &&
                  (sk === 'coding' || sk === 'systemDesign' || sk === 'aiResearch')
                    ? 1.05
                    : 1.0;
                const prevFloor = Math.floor(skills[sk]);
                skills[sk] = Math.min(
                  10,
                  +(
                    skills[sk] +
                    (def.skillGain.amount / 100) *
                      progressStep *
                      tenXMult *
                      rubberDuckMult *
                      perkMult *
                      superConnSkillMult *
                      principalMult *
                      edcMacbookMult *
                      homeSkillMult
                  ).toFixed(3)
                );
                const newFloor = Math.floor(skills[sk]);
                if (newFloor > prevFloor) {
                  sfx.play('levelup');
                  karma += 3;
                  const royaltyBonus = s.unlockedPerks.includes('perk_principal_architect')
                    ? 1500
                    : 0;
                  if (royaltyBonus > 0) {
                    cash += royaltyBonus;
                    stats.earnedToday += royaltyBonus;
                    stats.earnedTotal += royaltyBonus;
                  }
                  pushNotice(
                    `Level Up! Reached Level ${newFloor} in ${sk.replace(/([A-Z])/g, ' $1')} (+3 Karma ⚡${royaltyBonus > 0 ? ` & +${formatCurrency(royaltyBonus)} patent royalty` : ''})!`,
                    '🎯',
                    'good'
                  );
                }
              }

              // Startup progress (boosted by Home Founder Incubator/Loft multiplier & Angel Scout perk)
              if (def.startupProgress) {
                const homeStartupMult =
                  locationId === 'home' ? currentHomeDef.bonuses?.startupMult ?? 1.0 : 1.0;
                const angelMult = s.unlockedPerks.includes('perk_angel_scout') ? 1.25 : 1.0;
                const angelUserMult = s.unlockedPerks.includes('perk_angel_scout') ? 1.3 : 1.0;
                const gain = def.startupProgress * progressStep * homeStartupMult * angelMult;
                startup.productProgress = clamp(startup.productProgress + gain, 0, 100);
                startup.users += Math.round(gain * 12 * angelUserMult);
              }

              if (current.elapsedMinutes >= current.totalMinutes) {
                // Action finished!
                if (def.earn) {
                  const [minE, maxE] = def.earn;
                  const rubberBountyMult = s.unlockedPerks.includes('perk_rubber_duck')
                    ? 1.15
                    : 1.0;
                  const diamondBountyMult = s.unlockedPerks.includes('perk_diamond_hands')
                    ? 1.2
                    : 1.0;
                  const bounty = Math.round(
                    (minE + Math.random() * (maxE - minE)) * rubberBountyMult * diamondBountyMult
                  );
                  cash += bounty;
                  stats.earnedToday += bounty;
                  stats.earnedTotal += bounty;
                  finance = recordCashFlow(finance, {
                    time: newTime,
                    label: `Bounty / Consulting: ${def.label}`,
                    emoji: def.emoji,
                    amount: bounty,
                    category: 'bounties',
                  });
                  sfx.play('cash');
                  pushNotice(
                    `Completed ${def.label} · Collected ${formatCurrency(bounty)}!`,
                    '💸',
                    'cash'
                  );
                }

                if (def.id === 'ferry_farmers_market') {
                  pantryMeals += 5;
                  pushNotice('Stocked 5 organic home-cooked meals in your kitchen!', '🍓', 'good');
                }

                if (def.moodletGranted && MOODLETS[def.moodletGranted]) {
                  const mDef = MOODLETS[def.moodletGranted];
                  moodlets = [
                    ...moodlets.filter((m) => m.id !== mDef.id),
                    { id: mDef.id, expiresAt: newTime + mDef.durationMinutes },
                  ];
                }

                if (def.id === 'grind_leetcode') stats.leetCodeSolved += 1;
                if (def.category === 'skill' || def.category === 'hustle') stats.commitsPushed += 1;
                if (
                  def.id === 'brew_pourover' ||
                  def.id === 'pull_espresso_shot' ||
                  def.id === 'whisk_matcha'
                ) {
                  stats.coffeeConsumed += 1;
                }

                // Check Goal #1 (Lock Into Flow State at Desk)
                if (
                  goalIndex === 1 &&
                  (def.id === 'grind_leetcode' ||
                    def.id === 'build_startup_mvp' ||
                    def.id === 'vibe_code_ai')
                ) {
                  goalIndex = 2;
                  cash += GOALS[1].rewardCash;
                  karma += GOALS[1].rewardKarma;
                }

                // Update wishes
                wishes = wishes.map((w) => {
                  if (w.kind === 'action' && w.targetKey === def.id) {
                    return { ...w, progress: Math.min(w.targetValue, w.progress + 1) };
                  }
                  if (
                    w.kind === 'action' &&
                    w.targetKey === 'coffee' &&
                    (def.id === 'brew_pourover' ||
                      def.id === 'pull_espresso_shot' ||
                      def.id === 'whisk_matcha')
                  ) {
                    return { ...w, progress: Math.min(w.targetValue, w.progress + 1) };
                  }
                  if (w.kind === 'startup' && def.startupProgress) {
                    return {
                      ...w,
                      progress: Math.min(w.targetValue, w.progress + def.startupProgress),
                    };
                  }
                  return w;
                });

                queue.shift();
              } else {
                queue[0] = current;
              }
            }
          } else if (s.freeWill && !workShift && locationId === 'home') {
            // Autonomous Free Will when idle at home!
            let chosenAction: string | null = null;
            let chosenObjUid: string | undefined;

            const findObjWithAction = (actId: string) => {
              for (const placed of s.objects) {
                const fDef = FURNITURE_BY_ID[placed.objectId];
                if (fDef?.actions.includes(actId)) return placed;
              }
              return undefined;
            };

            if (needs.bladder < 25) {
              const obj =
                findObjWithAction('use_smart_washlet') || findObjWithAction('use_restroom');
              if (obj) {
                chosenAction = FURNITURE_BY_ID[obj.objectId].actions[0];
                chosenObjUid = obj.uid;
              }
            } else if (needs.energy < 26) {
              const obj =
                findObjWithAction('sleep_biohack') ||
                findObjWithAction('sleep_full') ||
                findObjWithAction('power_nap');
              if (obj) {
                chosenAction = 'power_nap';
                chosenObjUid = obj.uid;
              }
            } else if (needs.hunger < 30) {
              const obj =
                findObjWithAction('drink_soylent') ||
                findObjWithAction('brew_pourover') ||
                findObjWithAction('pull_espresso_shot');
              if (obj) {
                chosenAction = obj ? FURNITURE_BY_ID[obj.objectId].actions[0] : null;
                chosenObjUid = obj.uid;
              }
            } else if (needs.hygiene < 28) {
              const obj =
                findObjWithAction('aesop_shower') || findObjWithAction('quick_shower');
              if (obj) {
                chosenAction = FURNITURE_BY_ID[obj.objectId].actions[0];
                chosenObjUid = obj.uid;
              }
            }

            if (chosenAction && ACTIONS[chosenAction]) {
              const actDef = ACTIONS[chosenAction];
              const foundObj = s.objects.find((o) => o.uid === chosenObjUid);
              queue.push({
                uid: uid(),
                actionId: chosenAction,
                label: actDef.label,
                emoji: actDef.emoji,
                totalMinutes: actDef.durationMinutes,
                elapsedMinutes: 0,
                targetObjectUid: chosenObjUid,
                targetPos: foundObj ? { x: foundObj.x, y: foundObj.y } : undefined,
                started: false,
                auto: true,
              });
            }
          }
        }

        // 8. Check completed Wishes & replace with new ones
        wishes = wishes.map((w) => {
          if (w.progress >= w.targetValue) {
            karma += w.karmaReward;
            sfx.play('levelup');
            pushNotice(
              `Wish Fulfilled: ${w.emoji} ${w.title} (+${w.karmaReward} Karma ⚡)!`,
              '✨',
              'good'
            );
            const available = WISH_TEMPLATES.filter(
              (tpl) => !wishes.some((existing) => existing.id === tpl.id)
            );
            const replacement =
              available[Math.floor(Math.random() * available.length)] || WISH_TEMPLATES[0];
            return { ...replacement, progress: 0 };
          }
          return w;
        });

        // 9. Check Aspiration completion
        if (!stats.aspirationCompleted) {
          const asp = s.sim.aspiration;
          const nw = calculateNetWorth(s);
          const highRels = Object.values(s.relationships).filter((r) => r.score >= 75).length;
          const done =
            (asp === 'seriesAUnicorn' && startup.stage === 'Series A Unicorn') ||
            (asp === 'staffPrincipal' && job && job.levelIndex >= 5) ||
            (asp === 'paloAltoHome' && nw >= 1500000) ||
            (asp === 'sfConnector' && highRels >= 4) ||
            (asp === 'indieLegend' && (skills.coding >= 10 || skills.aiResearch >= 10));

          if (done) {
            stats.aspirationCompleted = true;
            karma += 35;
            cash += 50000;
            sfx.play('levelup');
            const aspDef = ASPIRATIONS.find((a) => a.id === asp);
            pushNotice(
              `LIFE ASPIRATION ACHIEVED: ${aspDef?.emoji} ${aspDef?.label}! Awarded +$50,000 & +35 Karma ⚡!`,
              '🏆',
              'good'
            );
          }
        }

        set({
          time: newTime,
          cash,
          vestedRsu,
          unvestedRsu,
          portfolioValue,
          finance,
          karma,
          pantryMeals,
          pgePowerOn,
          pgeChangeAt,
          weather,
          locationId,
          travel,
          workShift,
          job,
          startup,
          pos,
          targetPos,
          queue,
          needs,
          skills,
          moodlets,
          wishes,
          notices,
          lastToast,
          activeEvent,
          goalIndex,
          stats,
        });
      },
    }),
    {
      name: 'bay-life-save-v1',
      version: 1,
      partialize: (state) => ({
        version: state.version,
        screen: state.screen === 'create' ? 'title' : state.screen,
        view: state.view === 'buy' && state.locationId !== 'home' ? 'live' : state.view,
        sim: state.sim,
        needs: state.needs,
        skills: state.skills,
        cash: state.cash,
        vestedRsu: state.vestedRsu,
        unvestedRsu: state.unvestedRsu,
        portfolioValue: state.portfolioValue,
        loanOwed: state.loanOwed,
        finance: state.finance,
        karma: state.karma,
        unlockedPerks: state.unlockedPerks,
        unlockedTechNodes: state.unlockedTechNodes,
        ownedCars: state.ownedCars,
        activeCarId: state.activeCarId,
        ownedHomes: state.ownedHomes,
        pantryMeals: state.pantryMeals,
        inventory: state.inventory,
        time: state.time,
        speed: state.speed,
        weather: state.weather,
        pgePowerOn: state.pgePowerOn,
        pgeChangeAt: state.pgeChangeAt,
        nightMode: state.nightMode,
        soundOn: state.soundOn,
        freeWill: state.freeWill,
        homeId: state.homeId,
        locationId: state.locationId,
        objects: state.objects,
        pos: state.pos,
        targetPos: state.targetPos,
        facing: state.facing,
        queue: state.queue,
        job: state.job,
        workShift: state.workShift,
        travel: state.travel,
        startup: state.startup,
        relationships: state.relationships,
        moodlets: state.moodlets,
        wishes: state.wishes,
        activeEvent: state.activeEvent,
        notices: state.notices,
        lastRentDay: state.lastRentDay,
        rentOwed: state.rentOwed,
        stats: state.stats,
        goalIndex: state.goalIndex,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          sfx.enabled = Boolean(state.soundOn);
          if (!Array.isArray(state.inventory)) {
            state.inventory = [
              { itemId: 'edc_macbook', kind: 'item', quantity: 1 },
              { itemId: 'snack_bluebottle', kind: 'item', quantity: 2 },
              { itemId: 'snack_soylent', kind: 'item', quantity: 2 },
            ];
          }
        }
      },
    }
  )
);
