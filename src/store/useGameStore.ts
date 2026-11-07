import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ACTIONS,
  ASPIRATIONS,
  BASE_NEEDS,
  CAREER_BY_ID,
  COMMUTE_MODES,
  DOORDASH_MENU,
  FURNITURE_BY_ID,
  GOALS,
  HOMES,
  LOCATION_BY_ID,
  MOODLETS,
  NPCS,
  ORIGINS,
  RANDOM_EVENTS,
  REWARD_PERKS,
  WISH_TEMPLATES,
  WORK_TONES,
} from '../data/worldData';
import {
  CommuteModeId,
  GameState,
  NeedKey,
  RelationshipState,
  RelationshipStatus,
  SimProfile,
  SkillKey,
  WeatherKind,
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

export function calculateNetWorth(state: GameState): number {
  const furnitureVal = state.objects.reduce((acc, obj) => {
    const def = FURNITURE_BY_ID[obj.objectId];
    return acc + (def ? Math.round(def.price * 0.7) : 0);
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
    homeVal -
    state.loanOwed
  );
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
  const score = clamp(Math.round(baseAvg + moodletSum * 0.5), 0, 100);
  if (score >= 82) return { score, label: 'Flow State', color: '#34C759' };
  if (score >= 66) return { score, label: 'Dialed In', color: '#007AFF' };
  if (score >= 48) return { score, label: 'Stable', color: '#FF9500' };
  if (score >= 30) return { score, label: 'Drained', color: '#FF6B00' };
  return { score, label: 'Burnout Risk', color: '#FF3B30' };
}

export function hasHomeBackupPower(state: GameState): boolean {
  return state.objects.some((o) => FURNITURE_BY_ID[o.objectId]?.powerBackup);
}

export function isHomePowered(state: GameState): boolean {
  return state.pgePowerOn || hasHomeBackupPower(state);
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

const DEFAULT_PROFILE: SimProfile = {
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

function createFreshState(profile: SimProfile, chosenHomeId?: string): GameState {
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
    karma: 10,
    unlockedPerks: [],
    ownedCars: profile.origin === 'nepo' ? ['tesla'] : [],
    ownedHomes: [],
    pantryMeals: 4,

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
      performance: 35,
      shiftsCompleted: 0,
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
    moodlets: [{ id: 'philz_buzz', expiresAt: startTime + 240 }],
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
  tick: (deltaGameMinutes: number) => void;
  moveToTile: (x: number, y: number) => void;
  enqueueAction: (
    actionId: string,
    opts?: { objectUid?: string; stationId?: string; pos?: { x: number; y: number }; auto?: boolean }
  ) => void;
  cancelQueuedAction: (uid: string) => void;
  travelTo: (destId: string, mode: CommuteModeId) => void;
  skipTravelNow: () => void;
  startWorkShift: () => void;
  leaveWorkEarly: () => void;
  setWorkTone: (tone: WorkToneId) => void;
  toggleAutoWork: () => void;
  applyJob: (careerId: string) => void;
  vestRsuToCash: () => void;
  investInPortfolio: (amount: number) => void;
  withdrawPortfolio: (amount: number) => void;
  payLoan: (amount: number) => void;
  buyFurniture: (furnitureId: string) => void;
  sellFurniture: (uid: string) => void;
  moveHome: (homeId: string, purchase?: boolean) => void;
  buyCar: (carMode: CommuteModeId, price: number) => void;
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

      moveToTile: (x, y) => {
        const s = get();
        if (s.travel || s.workShift) return;
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

        const newItem = {
          uid: uid(),
          actionId,
          label: def.label,
          emoji: def.emoji,
          totalMinutes: def.durationMinutes,
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
        if (s.travel || s.workShift) return;
        if (destId === s.locationId) {
          set({ view: 'live', activeModal: null });
          return;
        }

        const modeDef = COMMUTE_MODES.find((m) => m.id === mode) || COMMUTE_MODES[0];
        if (modeDef.requiresCar && !s.ownedCars.includes('tesla')) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: 'You don’t own a personal EV yet! Buy one in the Wealth App or take Waymo / Caltrain.',
            emoji: '🏎️',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        if (s.cash < modeDef.baseFare) {
          sfx.play('error');
          const notice = {
            id: uid(),
            text: `Not enough cash for ${modeDef.name} (${formatCurrency(modeDef.baseFare)}). Take the free G-Bus!`,
            emoji: '🚌',
            tone: 'bad' as const,
            time: s.time,
          };
          set({ notices: [notice, ...s.notices.slice(0, 29)], lastToast: notice });
          return;
        }

        sfx.play('open');
        set({
          cash: s.cash - modeDef.baseFare,
          queue: [],
          view: 'live',
          activeModal: null,
          travel: {
            from: s.locationId,
            to: destId,
            mode,
            startedAt: s.time,
            arriveAt: s.time + modeDef.durationMinutes,
            totalMinutes: modeDef.durationMinutes,
            fare: modeDef.baseFare,
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

        const nextMoodlets = [...s.moodlets];
        if (modeDef?.moodletId) {
          const mDef = MOODLETS[modeDef.moodletId];
          if (mDef) {
            const filtered = nextMoodlets.filter((m) => m.id !== mDef.id);
            filtered.push({ id: mDef.id, expiresAt: s.travel.arriveAt + mDef.durationMinutes });
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
          text: `Arrived at ${locName} via ${modeDef?.name || 'transit'}.`,
          emoji: modeDef?.emoji || '📍',
          tone: 'info' as const,
          time: s.travel.arriveAt,
        };

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
      },

      startWorkShift: () => {
        const s = get();
        if (!s.job || s.workShift || s.travel) return;
        const career = CAREER_BY_ID[s.job.careerId];
        if (!career) return;

        const duration = (career.shiftEndHour - career.shiftStartHour) * 60;
        sfx.play('open');
        const notice = {
          id: uid(),
          text: `Badged into ${career.company} (${career.levels[s.job.levelIndex].code}). Let’s ship!`,
          emoji: career.emoji,
          tone: 'info' as const,
          time: s.time,
        };

        set({
          locationId: career.locationId,
          queue: [],
          view: 'live',
          activeModal: null,
          workShift: {
            startedAt: s.time,
            endsAt: s.time + duration,
            totalMinutes: duration,
            elapsedMinutes: 0,
            tone: 'deepWork',
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
        const earnedCash = Math.round(lvl.shiftPay * ratio * 0.75);
        const earnedRsu = Math.round(lvl.rsuPerShift * ratio * 0.75);

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
          workShift: null,
          locationId: 'home',
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

        // Determine highest level player qualifies for (up to levelIndex 2 on direct entry)
        let qualifiedIndex = 0;
        for (let i = 0; i < Math.min(3, career.levels.length); i++) {
          const req = career.levels[i].requiredSkill;
          if (Math.floor(s.skills[req.skill]) >= req.level) {
            qualifiedIndex = i;
          }
        }

        const lvl = career.levels[qualifiedIndex];
        let goalIndex = s.goalIndex;
        let cash = s.cash;
        let karma = s.karma;
        if (goalIndex === 0) {
          goalIndex = 1;
          cash += GOALS[0].rewardCash;
          karma += GOALS[0].rewardKarma;
        }

        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: `Offer Signed! Joined ${career.company} as ${lvl.code} ${lvl.title} (${formatCurrency(lvl.baseSalary + lvl.rsuAnnual)}/yr TC).`,
          emoji: '🎉',
          tone: 'good' as const,
          time: s.time,
        };

        set({
          job: {
            careerId,
            levelIndex: qualifiedIndex,
            performance: 40,
            shiftsCompleted: 0,
            autoWork: s.job?.autoWork ?? false,
            preferredCommute: s.job?.preferredCommute ?? 'gbus',
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
        sfx.play('cash');
        const notice = {
          id: uid(),
          text: `Sold vested RSUs on Schwab for ${formatCurrency(payout)} cash!`,
          emoji: '💎',
          tone: 'cash' as const,
          time: s.time,
        };
        set({
          cash: s.cash + payout,
          vestedRsu: 0,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      investInPortfolio: (amount) => {
        const s = get();
        if (amount <= 0 || s.cash < amount) return;
        sfx.play('cash');
        const notice = {
          id: uid(),
          text: `Invested ${formatCurrency(amount)} into QQQ / NVDA AI Index.`,
          emoji: '📈',
          tone: 'info' as const,
          time: s.time,
        };
        set({
          cash: s.cash - amount,
          portfolioValue: s.portfolioValue + amount,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      withdrawPortfolio: (amount) => {
        const s = get();
        const actual = Math.min(amount, s.portfolioValue);
        if (actual <= 0) return;
        sfx.play('cash');
        set({
          cash: s.cash + actual,
          portfolioValue: s.portfolioValue - actual,
        });
      },

      payLoan: (amount) => {
        const s = get();
        const pay = Math.min(amount, s.loanOwed, s.cash);
        if (pay <= 0) return;
        sfx.play('cash');
        const remaining = s.loanOwed - pay;
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

        // Find an open tile on the grid
        let placedX = 2;
        let placedY = 2;
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
          text: `Delivered & installed ${def.name} in your apartment!`,
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
        const cost = purchase ? homeDef.buyPrice : homeDef.weeklyRent;
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

        // Keep existing high-tier furniture and merge starter objects if missing categories
        const newObjects = homeDef.starterObjects.map((o) => ({
          uid: uid(),
          objectId: o.objectId,
          x: o.x,
          y: o.y,
        }));

        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: `${purchase ? 'Purchased deed to' : 'Moved into'} ${homeDef.name} in ${homeDef.area}!`,
          emoji: homeDef.emoji,
          tone: 'good' as const,
          time: s.time,
        };

        set({
          cash: s.cash - cost,
          homeId: newHomeId,
          locationId: 'home',
          ownedHomes: purchase
            ? Array.from(new Set([...s.ownedHomes, newHomeId]))
            : s.ownedHomes,
          objects: newObjects,
          pos: { x: Math.floor(homeDef.gridSize / 2), y: Math.floor(homeDef.gridSize / 2) },
          targetPos: null,
          activeModal: null,
          notices: [notice, ...s.notices.slice(0, 29)],
          lastToast: notice,
        });
      },

      buyCar: (carMode, price) => {
        const s = get();
        if (s.ownedCars.includes(carMode)) return;
        if (s.cash < price) {
          sfx.play('error');
          return;
        }
        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: 'Took delivery of your new EV! HOV lane unlocked across the Bay.',
          emoji: '🏎️',
          tone: 'good' as const,
          time: s.time,
        };
        set({
          cash: s.cash - price,
          ownedCars: [...s.ownedCars, carMode],
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

        const newScore = clamp(currentRel.score + delta, 0, 100);
        const newStatus = getRelStatus(newScore);

        const nextSkills = { ...s.skills };
        if (skillBoost) {
          nextSkills[skillBoost.skill] = Math.min(
            10,
            +(nextSkills[skillBoost.skill] + skillBoost.amount / 100).toFixed(2)
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

        const fundingGrant =
          nextStage === 'Weekend Prototype'
            ? 25000
            : nextStage === 'YC Batch'
            ? 125000
            : nextStage === 'Seed Funded'
            ? 450000
            : 1500000;

        const newVal =
          nextStage === 'Weekend Prototype'
            ? 3500000
            : nextStage === 'YC Batch'
            ? 12000000
            : nextStage === 'Seed Funded'
            ? 42000000
            : 1000000000;

        const newMrr =
          nextStage === 'Weekend Prototype'
            ? 3500
            : nextStage === 'YC Batch'
            ? 18000
            : nextStage === 'Seed Funded'
            ? 85000
            : 320000;

        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: `TERM SHEET SIGNED! ${st.name} reached ${nextStage} (${formatCurrency(newVal)} valuation) · +${formatCurrency(fundingGrant)} founder liquidity!`,
          emoji: '🦄',
          tone: 'cash' as const,
          time: s.time,
        };

        set({
          cash: s.cash + fundingGrant,
          karma: s.karma + 20,
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
        if (!perk || s.unlockedPerks.includes(perkId) || s.karma < perk.cost) return;
        sfx.play('levelup');
        const notice = {
          id: uid(),
          text: `Unlocked Perk: ${perk.emoji} ${perk.name}!`,
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

      tick: (deltaMinutes) => {
        const s = get();
        if (s.screen !== 'play' || s.speed === 0 || s.activeEvent) return;

        const dt = deltaMinutes * s.speed;
        const prevTime = s.time;
        const newTime = prevTime + dt;
        const prevDay = getDayNumber(prevTime);
        const newDay = getDayNumber(newTime);

        let cash = s.cash;
        let vestedRsu = s.vestedRsu;
        let unvestedRsu = s.unvestedRsu;
        let portfolioValue = s.portfolioValue;
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

        // 1. Day rollover: RSU vesting, Startup MRR, Weekly Rent, Weather
        if (newDay > prevDay) {
          stats.daysLived = newDay;
          stats.earnedToday = 0;

          const weathers: WeatherKind[] = ['sunny', 'foggy', 'breezy', 'sunny', 'rain'];
          weather = weathers[newDay % weathers.length];

          // Daily RSU drip vest (10% of unvested vests daily in game time)
          if (unvestedRsu >= 100) {
            const dailyVest = Math.round(unvestedRsu * 0.12);
            unvestedRsu -= dailyVest;
            vestedRsu += dailyVest;
          }

          // Portfolio market growth (-1.5% to +3.2% daily tech drift)
          if (portfolioValue > 0) {
            const drift = 1 + (Math.sin(newDay * 1.7) * 0.02 + 0.008);
            portfolioValue = Math.round(portfolioValue * drift);
          }

          // Startup daily revenue payout
          if (startup.mrr > 0) {
            const dailyRev = Math.round(startup.mrr / 7);
            cash += dailyRev;
            stats.earnedToday += dailyRev;
            stats.earnedTotal += dailyRev;
            pushNotice(
              `Stripe Payout: +${formatCurrency(dailyRev)} recurring revenue from ${startup.name}!`,
              '💳',
              'cash'
            );
          }

          // Weekly rent every 7 days if home is not owned
          if (newDay % 7 === 0 && !s.ownedHomes.includes(s.homeId)) {
            const homeDef = HOMES.find((h) => h.id === s.homeId) || HOMES[1];
            if (cash >= homeDef.weeklyRent) {
              cash -= homeDef.weeklyRent;
              pushNotice(
                `Paid weekly apartment rent (${formatCurrency(homeDef.weeklyRent)}) for ${homeDef.name}.`,
                '🏠',
                'info'
              );
            } else {
              pushNotice(
                `Rent is due (${formatCurrency(homeDef.weeklyRent)})! Vest RSUs or ship a freelance bounty.`,
                '⚠️',
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
                moodlets.push({ id: 'pge_blackout', expiresAt: newTime + 150 });
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

        // 3. Passive Needs Decay
        const hoursElapsed = dt / 60;
        const biohackerMult = s.sim.traits.includes('biohacker') ? 0.75 : 1.0;
        const caffeinePerk = s.unlockedPerks.includes('perk_caffeine_synth') ? 0.7 : 1.0;
        const zenPerk = s.unlockedPerks.includes('perk_zero_burnout') ? 0.65 : 1.0;

        needs.hunger = clamp(needs.hunger - 3.2 * hoursElapsed);
        needs.energy = clamp(needs.energy - 2.8 * hoursElapsed * biohackerMult * caffeinePerk);
        needs.hygiene = clamp(needs.hygiene - 2.0 * hoursElapsed * biohackerMult);
        needs.bladder = clamp(needs.bladder - 3.6 * hoursElapsed);
        needs.fun = clamp(needs.fun - 2.5 * hoursElapsed * zenPerk);
        needs.social = clamp(needs.social - 2.1 * hoursElapsed * zenPerk);

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
            if (modeDef?.moodletId && MOODLETS[modeDef.moodletId]) {
              const mDef = MOODLETS[modeDef.moodletId];
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
          }
        }

        // 5. Auto-Work Check
        const hourNow = getHourOfDay(newTime);
        const dayIdx = Math.floor(newTime / 1440) % 7; // 0=Mon..4=Fri
        if (
          job &&
          job.autoWork &&
          !workShift &&
          !travel &&
          dayIdx < 5 &&
          hourNow >= CAREER_BY_ID[job.careerId].shiftStartHour &&
          hourNow < CAREER_BY_ID[job.careerId].shiftStartHour + 0.5
        ) {
          const career = CAREER_BY_ID[job.careerId];
          const duration = (career.shiftEndHour - career.shiftStartHour) * 60;
          locationId = career.locationId;
          queue = [];
          workShift = {
            startedAt: newTime,
            endsAt: newTime + duration,
            totalMinutes: duration,
            elapsedMinutes: 0,
            tone: 'deepWork',
          };
          pushNotice(`Auto-commuted to ${career.company} for your shift!`, career.emoji, 'info');
        }

        // 6. Active Work Shift Progression
        if (workShift && job) {
          const career = CAREER_BY_ID[job.careerId];
          const lvl = career.levels[job.levelIndex];
          const toneDef = WORK_TONES.find((t) => t.id === workShift!.tone) || WORK_TONES[0];

          workShift.elapsedMinutes += dt;
          const leetcodeMult = s.sim.traits.includes('leetcodeGrinder') ? 1.25 : 1.0;
          const promoPerk = s.unlockedPerks.includes('perk_promo_magnet') ? 1.3 : 1.0;

          const perfGain = (dt / 60) * 3.8 * toneDef.perfMult * leetcodeMult * promoPerk;
          job.performance = clamp(job.performance + perfGain, 0, 100);
          needs.energy = clamp(needs.energy - (dt / 60) * 2.2 * toneDef.energyDrainMult);
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
            const payCash = lvl.shiftPay;
            const payRsu = lvl.rsuPerShift;
            cash += payCash;
            unvestedRsu += payRsu;
            job.shiftsCompleted += 1;
            stats.earnedToday += payCash;
            stats.earnedTotal += payCash;

            // Check promotion!
            const nextLvl = career.levels[job.levelIndex + 1];
            if (
              nextLvl &&
              job.performance >= 92 &&
              skills[nextLvl.requiredSkill.skill] >= nextLvl.requiredSkill.level
            ) {
              job.levelIndex += 1;
              job.performance = 38;
              const spotBonus = Math.round(nextLvl.baseSalary * 0.05);
              cash += spotBonus;
              sfx.play('levelup');
              pushNotice(
                `PROMOTED to ${nextLvl.code} ${nextLvl.title} at ${career.company}! New TC: ${formatCurrency(nextLvl.baseSalary + nextLvl.rsuAnnual)}/yr + ${formatCurrency(spotBonus)} promo bonus!`,
                '👑',
                'good'
              );
            } else {
              sfx.play('cash');
              pushNotice(
                `Shift complete at ${career.company}! Earned ${formatCurrency(payCash)} cash + ${formatCurrency(payRsu)} RSU.`,
                '💸',
                'cash'
              );
            }

            workShift = null;
            locationId = 'home';
            pos = { x: 3, y: 3 };
          }
        }

        // 7. Tile-by-Tile Movement & Action Queue Execution
        if (!travel && !workShift) {
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
                }
                if (def.requiresPantry) {
                  pantryMeals = Math.max(0, pantryMeals - def.requiresPantry);
                }
              }

              current.elapsedMinutes += dt;
              const progressStep = dt / current.totalMinutes;

              // Apply needs deltas proportionally
              (Object.keys(def.needsDelta) as NeedKey[]).forEach((k) => {
                const delta = (def.needsDelta[k] || 0) * progressStep;
                needs[k] = clamp(needs[k] + delta);
              });

              // Apply skill gains proportionally
              if (def.skillGain) {
                const sk = def.skillGain.skill;
                const tenXMult =
                  s.sim.traits.includes('tenXEngineer') &&
                  (sk === 'coding' || sk === 'systemDesign' || sk === 'aiResearch')
                    ? 1.3
                    : 1.0;
                const perkMult =
                  s.unlockedPerks.includes('perk_flow_state') &&
                  (sk === 'coding' || sk === 'systemDesign' || sk === 'aiResearch')
                    ? 1.3
                    : 1.0;
                const prevFloor = Math.floor(skills[sk]);
                skills[sk] = Math.min(
                  10,
                  +(skills[sk] + (def.skillGain.amount / 100) * progressStep * tenXMult * perkMult).toFixed(3)
                );
                const newFloor = Math.floor(skills[sk]);
                if (newFloor > prevFloor) {
                  sfx.play('levelup');
                  karma += 5;
                  pushNotice(
                    `Level Up! Reached Level ${newFloor} in ${sk.replace(/([A-Z])/g, ' $1')} (+5 Karma ⚡)!`,
                    '🎯',
                    'good'
                  );
                }
              }

              // Startup progress
              if (def.startupProgress) {
                const gain = def.startupProgress * progressStep;
                startup.productProgress = clamp(startup.productProgress + gain, 0, 100);
                startup.users += Math.round(gain * 12);
              }

              if (current.elapsedMinutes >= current.totalMinutes) {
                // Action finished!
                if (def.earn) {
                  const [minE, maxE] = def.earn;
                  const bounty = Math.round(minE + Math.random() * (maxE - minE));
                  cash += bounty;
                  stats.earnedToday += bounty;
                  stats.earnedTotal += bounty;
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
                    return { ...w, progress: w.targetValue };
                  }
                  if (
                    w.kind === 'action' &&
                    w.targetKey === 'coffee' &&
                    (def.id === 'brew_pourover' ||
                      def.id === 'pull_espresso_shot' ||
                      def.id === 'whisk_matcha')
                  ) {
                    return { ...w, progress: w.targetValue };
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
          } else if (s.freeWill && locationId === 'home') {
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
            karma += 50;
            cash += 50000;
            sfx.play('levelup');
            const aspDef = ASPIRATIONS.find((a) => a.id === asp);
            pushNotice(
              `LIFE ASPIRATION ACHIEVED: ${aspDef?.emoji} ${aspDef?.label}! Awarded +$50,000 & +50 Karma!`,
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
    }
  )
);
