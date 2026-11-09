import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ACTIONS,
  CAREER_BY_ID,
  COMMUTE_MODES,
  FURNITURE_BY_ID,
  GOALS,
  HOMES,
  LOCATION_BY_ID,
  NEEDS_META,
  WORK_PROJECT_BY_ID,
  WORK_PROJECTS,
  WORK_TONES,
} from '../data/worldData';
import {
  calculateOverallMood,
  evaluateAspirationProgress,
  formatCurrency,
  formatTime,
  getActiveVehicle,
  getDayNumber,
  getDayOfWeekName,
  getInstalledHomeComputer,
  hasPersonalCar,
  isHomePowered,
  useGameStore,
} from '../store/useGameStore';
import { AspirationActionType, NeedKey, SkillKey, WorkToneId } from '../types/game';
import { useAuthSaveStore } from '../store/useAuthSaveStore';
import { GoogleLogoSvg } from './AccountSaveModal';
import { Portrait } from './Portrait';
import {
  Map,
  Monitor,
  ShoppingBag,
  Smartphone,
  Briefcase,
  Home,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Zap,
  ZapOff,
  X,
  Sparkles,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Compass,
  Backpack,
  Car,
  Save,
  Target,
  ArrowRight,
  Globe,
  ArrowUpRight,
} from 'lucide-react';

interface SprintTarget {
  id: string;
  emoji: string;
  title: string;
  badge: string;
  accent: string;
  reward: {
    cashDelta?: number;
    karmaDelta?: number;
    skill?: SkillKey;
    skillDelta?: number;
    performanceDelta?: number;
    startupDelta?: number;
    needKey?: NeedKey;
    needDelta?: number;
  };
  popText: string;
}

interface FloatingRewardPop {
  id: string;
  text: string;
  color: string;
}

const SPRINT_TEMPLATES: Omit<SprintTarget, 'id'>[] = [
  {
    emoji: '🐛',
    title: 'Squash P0 Bug',
    badge: '+$220',
    accent: 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    reward: { cashDelta: 220, performanceDelta: 2, skill: 'coding', skillDelta: 0.08 },
    popText: '+$220 · +2% Promo',
  },
  {
    emoji: '🚀',
    title: 'Merge Hotfix',
    badge: '+5% Promo',
    accent: 'border-blue-500/40 bg-blue-500/12 text-blue-700 dark:text-blue-300',
    reward: { performanceDelta: 5, cashDelta: 120, skill: 'coding', skillDelta: 0.1 },
    popText: '+5% Promo · +$120',
  },
  {
    emoji: '☕',
    title: 'Espresso Shot',
    badge: '+15% Focus',
    accent: 'border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300',
    reward: { needKey: 'energy', needDelta: 15, performanceDelta: 2 },
    popText: '+15% Energy ⚡',
  },
  {
    emoji: '🤖',
    title: 'Ship AI Agent',
    badge: '+$350',
    accent: 'border-purple-500/40 bg-purple-500/12 text-purple-700 dark:text-purple-300',
    reward: { cashDelta: 350, startupDelta: 4, skill: 'aiResearch', skillDelta: 0.12 },
    popText: '+$350 · +4% AI',
  },
  {
    emoji: '📐',
    title: 'LGTM Design Doc',
    badge: '+6% Promo',
    accent: 'border-indigo-500/40 bg-indigo-500/12 text-indigo-700 dark:text-indigo-300',
    reward: { performanceDelta: 6, skill: 'systemDesign', skillDelta: 0.12 },
    popText: '+6% Promo · +0.12 Arch',
  },
  {
    emoji: '⚡',
    title: 'CUDA Kernel Tune',
    badge: '+$420',
    accent: 'border-rose-500/40 bg-rose-500/12 text-rose-700 dark:text-rose-300',
    reward: { cashDelta: 420, performanceDelta: 3, skill: 'aiResearch', skillDelta: 0.14 },
    popText: '+$420 · +3% Promo',
  },
  {
    emoji: '🖥️',
    title: 'Lock In at Desk',
    badge: '+8% Promo',
    accent: 'border-sky-500/40 bg-sky-500/12 text-sky-700 dark:text-sky-300',
    reward: { performanceDelta: 8, cashDelta: 180, skill: 'coding', skillDelta: 0.12 },
    popText: '+8% Promo · Standing Desk Flow',
  },
  {
    emoji: '🍣',
    title: 'Cafeteria Omakase',
    badge: '+25% Hunger',
    accent: 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    reward: { needKey: 'hunger', needDelta: 25, performanceDelta: 3 },
    popText: '+25% Hunger · Campus Feast',
  },
  {
    emoji: '🚨',
    title: 'SEV-1 War Room',
    badge: '+$500 Spot',
    accent: 'border-red-500/40 bg-red-500/12 text-red-700 dark:text-red-300',
    reward: { cashDelta: 500, performanceDelta: 9, skill: 'coding', skillDelta: 0.15 },
    popText: '+$500 · SEV-1 Resolved',
  },
];

const COMPACT_TONE_LABELS: Record<WorkToneId, string> = {
  deepWork: 'Deep',
  tenXGrind: '10x Grind',
  watercooler: 'Micro-Kitchen',
  alignSkip: 'VP Align',
  restAndVest: 'Rest & Vest',
};

const SMART_ACTION_PRIORITY = [
  'train_local_llm',
  'build_startup_mvp',
  'vibe_code_ai',
  'system_design_doc',
  'grind_leetcode',
  'tonal_strength',
  'zone2_peloton',
  'angel_deal_review',
  'spatial_cinema',
  'read_pg_essays',
];

const SMART_ACTION_SHORT_BADGE: Record<string, string> = {
  train_local_llm: '🧠 Train LLM',
  build_startup_mvp: '🚀 Build MVP',
  vibe_code_ai: '⚡ Vibe Code',
  system_design_doc: '📐 Arch Doc',
  grind_leetcode: '💻 LeetCode',
  tonal_strength: '🏋️ Strength',
  zone2_peloton: '🚴 Zone 2',
  angel_deal_review: '📈 Deal Memo',
  spatial_cinema: '🥽 Vision Pro',
  read_pg_essays: '📖 PG Essays',
};

export const AppleHUD: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const view = useGameStore((s) => s.view);
  const activeModal = useGameStore((s) => s.activeModal);
  const time = useGameStore((s) => s.time);
  const speed = useGameStore((s) => s.speed);
  const weather = useGameStore((s) => s.weather);
  const cash = useGameStore((s) => s.cash);
  const vestedRsu = useGameStore((s) => s.vestedRsu);
  const karma = useGameStore((s) => s.karma);
  const needs = useGameStore((s) => s.needs);
  const locationId = useGameStore((s) => s.locationId);
  const homeId = useGameStore((s) => s.homeId);
  const objects = useGameStore((s) => s.objects);
  const pos = useGameStore((s) => s.pos);
  const targetPos = useGameStore((s) => s.targetPos);
  const queue = useGameStore((s) => s.queue);
  const job = useGameStore((s) => s.job);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const activeCarId = useGameStore((s) => s.activeCarId);
  const inventory = useGameStore((s) => s.inventory || []);
  const workShift = useGameStore((s) => s.workShift);
  const travel = useGameStore((s) => s.travel);
  const activeEvent = useGameStore((s) => s.activeEvent);
  const lastToast = useGameStore((s) => s.lastToast);
  const goalIndex = useGameStore((s) => s.goalIndex);
  const soundOn = useGameStore((s) => s.soundOn);
  const nightMode = useGameStore((s) => s.nightMode);

  const setView = useGameStore((s) => s.setView);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const toggleNightMode = useGameStore((s) => s.toggleNightMode);
  const enqueueAction = useGameStore((s) => s.enqueueAction);
  const cancelQueuedAction = useGameStore((s) => s.cancelQueuedAction);
  const startWorkShift = useGameStore((s) => s.startWorkShift);
  const leaveWorkEarly = useGameStore((s) => s.leaveWorkEarly);
  const setWorkTone = useGameStore((s) => s.setWorkTone);
  const skipTravelNow = useGameStore((s) => s.skipTravelNow);
  const travelTo = useGameStore((s) => s.travelTo);
  const resolveEventChoice = useGameStore((s) => s.resolveEventChoice);
  const dismissToast = useGameStore((s) => s.dismissToast);
  const setScreen = useGameStore((s) => s.setScreen);
  const autoFixNeed = useGameStore((s) => s.autoFixNeed);
  const triggerMicroReward = useGameStore((s) => s.triggerMicroReward);
  const resignJob = useGameStore((s) => s.resignJob);

  const authUser = useAuthSaveStore((s) => s.user);
  const quickSaveNow = useAuthSaveStore((s) => s.quickSaveNow);

  const state = useGameStore.getState();
  const moodInfo = calculateOverallMood(state);
  const powered = isHomePowered(state);
  const activeEval = evaluateAspirationProgress(state, sim.aspiration);

  // Interactive Work Shift Mini-Game State
  const [sprintTargets, setSprintTargets] = useState<SprintTarget[]>([]);
  const [floatingPops, setFloatingPops] = useState<FloatingRewardPop[]>([]);
  const [sprintCombo, setSprintCombo] = useState(0);
  const [shiftBonusEarned, setShiftBonusEarned] = useState(0);
  const [isWorkCardCollapsed, setIsWorkCardCollapsed] = useState(false);
  const [isGoalCardCollapsed, setIsGoalCardCollapsed] = useState(false);

  const handleGoalAction = useCallback(
    (actionType: AspirationActionType) => {
      switch (actionType) {
        case 'wealth':
          setActiveModal('phone', 'wealth');
          break;
        case 'career':
          setActiveModal(job ? 'career' : 'phone', 'levels');
          break;
        case 'startup':
          setActiveModal('phone', 'startup');
          break;
        case 'map':
          setView('map');
          break;
        case 'skills': {
          if (locationId === 'home') {
            const codeActions = [
              'train_local_llm',
              'build_startup_mvp',
              'vibe_code_ai',
              'grind_leetcode',
            ];
            for (const actId of codeActions) {
              const matching = objects.find((o) =>
                FURNITURE_BY_ID[o.objectId]?.actions.includes(actId)
              );
              if (matching && powered) {
                enqueueAction(actId, {
                  objectUid: matching.uid,
                  pos: { x: matching.x, y: matching.y },
                });
                return;
              }
            }
          }
          setActiveModal('sim', 'skills');
          break;
        }
        case 'furnish':
          if (locationId === 'home') {
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
    },
    [enqueueAction, job, locationId, objects, powered, resignJob, setActiveModal, setView]
  );

  // Spawn interactive targets during an active workShift
  useEffect(() => {
    if (!workShift) {
      setSprintTargets([]);
      setSprintCombo(0);
      setShiftBonusEarned(0);
      setIsWorkCardCollapsed(false);
      return;
    }

    const createRandomTarget = (): SprintTarget => {
      const tpl = SPRINT_TEMPLATES[Math.floor(Math.random() * SPRINT_TEMPLATES.length)];
      return {
        ...tpl,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };
    };

    // Ensure immediate engaging targets when shift card opens
    setSprintTargets((prev) => (prev.length === 0 ? [createRandomTarget(), createRandomTarget()] : prev));

    if (speed === 0) return;

    const intervalMs = Math.max(1100, 2600 - speed * 400);
    const timer = window.setInterval(() => {
      setSprintTargets((prev) => {
        const trimmed = prev.length >= 3 ? prev.slice(1) : prev;
        return [...trimmed, createRandomTarget()];
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [Boolean(workShift), speed]);

  const handleClickSprintTarget = (target: SprintTarget) => {
    setSprintTargets((prev) => prev.filter((t) => t.id !== target.id));
    setSprintCombo((c) => c + 1);
    if (target.reward.cashDelta) {
      setShiftBonusEarned((b) => b + (target.reward.cashDelta || 0));
    }

    triggerMicroReward(target.reward);

    const popId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setFloatingPops((prev) => [
      ...prev.slice(-4),
      {
        id: popId,
        text: target.popText,
        color: target.reward.cashDelta ? '#34C759' : '#007AFF',
      },
    ]);

    window.setTimeout(() => {
      setFloatingPops((prev) => prev.filter((p) => p.id !== popId));
    }, 1150);
  };

  // Determine lowest need & Smart Next recommendation
  const lowestNeedEntry = useMemo(() => {
    const entries = NEEDS_META.map((m) => ({
      meta: m,
      value: Math.round(needs[m.key]),
    }));
    entries.sort((a, b) => a.value - b.value);
    return entries[0];
  }, [needs]);

  const smartRecommendation = useMemo(() => {
    if (lowestNeedEntry && lowestNeedEntry.value < 45) {
      return {
        shortBadge: `⚡ Auto-Fix: ${lowestNeedEntry.meta.shortLabel}`,
        fullLabel: `${lowestNeedEntry.meta.emoji} Auto-Fix ${lowestNeedEntry.meta.label} (${lowestNeedEntry.value}%)`,
        subHint: '1-Tap Need Recovery · Shortcut: A',
      };
    }

    if (locationId === 'home') {
      for (const actId of SMART_ACTION_PRIORITY) {
        const act = ACTIONS[actId];
        if (!act) continue;
        if (act.requiresPower && !powered) continue;
        if (act.cost && cash < act.cost) continue;
        const hasObj = objects.some((o) => FURNITURE_BY_ID[o.objectId]?.actions.includes(actId));
        if (hasObj) {
          return {
            shortBadge: SMART_ACTION_SHORT_BADGE[actId] || `${act.emoji} Flow State`,
            fullLabel: `${act.emoji} ${act.label}`,
            subHint: `⏱ ${act.durationMinutes}m · Highest-Value Action (Shortcut: A)`,
          };
        }
      }
    } else {
      const venue = LOCATION_BY_ID[locationId];
      if (venue) {
        const curFloorStations = venue.floors
          ? venue.floors[useGameStore.getState().campusFloorIndex || 0]?.stations || venue.stations
          : venue.stations;
        for (const st of curFloorStations) {
          for (const actId of st.actionIds) {
            const act = ACTIONS[actId];
            if (!act) continue;
            if (act.cost && cash < act.cost) continue;
            if (
              act.category === 'hustle' ||
              act.category === 'skill' ||
              act.category === 'social' ||
              act.category === 'work'
            ) {
              return {
                shortBadge: `${act.emoji} ${st.badge || 'Campus Action'}`,
                fullLabel: `${act.emoji} ${act.label}`,
                subHint: `⏱ ${act.durationMinutes}m at ${st.label} · Shortcut: A`,
              };
            }
          }
        }
        const firstSt = curFloorStations[0] || venue.stations[0];
        const firstAct = firstSt?.actionIds[0] ? ACTIONS[firstSt.actionIds[0]] : null;
        if (firstAct) {
          return {
            shortBadge: `${firstAct.emoji} ${firstSt?.badge || 'Campus Action'}`,
            fullLabel: `${firstAct.emoji} ${firstAct.label}`,
            subHint: `⏱ ${firstAct.durationMinutes}m at ${venue.shortName} · Shortcut: A`,
          };
        }
      }
    }

    return {
      shortBadge: `⚡ Boost ${lowestNeedEntry?.meta.shortLabel || 'Mood'}`,
      fullLabel: `${lowestNeedEntry?.meta.emoji || '✨'} Boost ${lowestNeedEntry?.meta.label || 'Wellbeing'}`,
      subHint: '1-Tap Smart Action · Shortcut: A',
    };
  }, [cash, locationId, lowestNeedEntry, objects, powered]);

  // "✨ Smart Next" Apple Intelligence One-Tap Handler
  const handleSmartNext = useCallback(() => {
    const s = useGameStore.getState();
    if (s.travel) return;

    // 1. If any need is < 45%, auto-fix the lowest need immediately
    const sortedNeeds = (Object.entries(s.needs) as Array<[NeedKey, number]>).sort(
      (a, b) => a[1] - b[1]
    );
    const [lowestKey, lowestVal] = sortedNeeds[0];
    if (lowestVal < 45) {
      autoFixNeed(lowestKey);
      return;
    }

    // 2. Otherwise queue the highest-value coding/startup/fitness action in the room
    const homeHasPower = isHomePowered(s);
    if (s.locationId === 'home') {
      for (const preferredActId of SMART_ACTION_PRIORITY) {
        const actDef = ACTIONS[preferredActId];
        if (!actDef) continue;
        if (actDef.requiresPower && !homeHasPower) continue;
        if (actDef.cost && s.cash < actDef.cost) continue;

        const matchingPlaced = s.objects.find((placed) => {
          const fDef = FURNITURE_BY_ID[placed.objectId];
          return fDef?.actions.includes(preferredActId);
        });

        if (matchingPlaced) {
          enqueueAction(preferredActId, {
            objectUid: matchingPlaced.uid,
            pos: { x: matchingPlaced.x, y: matchingPlaced.y },
          });
          return;
        }
      }
    } else {
      const venue = LOCATION_BY_ID[s.locationId];
      if (venue) {
        const curFloorStations = venue.floors
          ? venue.floors[s.campusFloorIndex || 0]?.stations || venue.stations
          : venue.stations;
        for (const st of curFloorStations) {
          for (const actId of st.actionIds) {
            const actDef = ACTIONS[actId];
            if (!actDef) continue;
            if (actDef.cost && s.cash < actDef.cost) continue;
            if (
              actDef.category === 'hustle' ||
              actDef.category === 'skill' ||
              actDef.category === 'social' ||
              actDef.category === 'work'
            ) {
              enqueueAction(actId, {
                stationId: st.id,
                pos: { x: st.x, y: st.y },
              });
              return;
            }
          }
        }
        // Fallback to first station action
        const firstSt = curFloorStations[0] || venue.stations[0];
        if (firstSt && firstSt.actionIds[0]) {
          enqueueAction(firstSt.actionIds[0], {
            stationId: firstSt.id,
            pos: { x: firstSt.x, y: firstSt.y },
          });
          return;
        }
      }
    }

    // Ultimate fallback: boost lowest need
    autoFixNeed(lowestKey);
  }, [autoFixNeed, enqueueAction]);

  // Global Keyboard Shortcuts (Space, 1/2/3, M, B, P, I, A)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void quickSaveNow();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const s = useGameStore.getState();
      if (s.screen !== 'play') return;

      // If an interactive dilemma modal is open, 1/2/3 selects the corresponding choice
      if (s.activeEvent) {
        if (e.key === '1' && s.activeEvent.choices[0]) {
          e.preventDefault();
          resolveEventChoice(0);
        } else if (e.key === '2' && s.activeEvent.choices[1]) {
          e.preventDefault();
          resolveEventChoice(1);
        } else if (e.key === '3' && s.activeEvent.choices[2]) {
          e.preventDefault();
          resolveEventChoice(2);
        }
        return;
      }

      const key = e.key.toLowerCase();
      // When in Furnishing Studio mode, suppress global modal shortcuts so decorating is undisturbed
      if (s.view === 'buy') {
        if (key === 'b' || key === 'escape') {
          e.preventDefault();
          setView('live');
        } else if (e.code === 'Space') {
          e.preventDefault();
          setSpeed(s.speed === 0 ? 1 : 0);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setSpeed(s.speed === 0 ? 1 : 0);
      } else if (key === '1') {
        e.preventDefault();
        setSpeed(1);
      } else if (key === '2') {
        e.preventDefault();
        setSpeed(2);
      } else if (key === '3') {
        e.preventDefault();
        setSpeed(3);
      } else if (key === 'm') {
        e.preventDefault();
        setView(s.view === 'map' ? 'live' : 'map');
      } else if (key === 'b' && s.locationId === 'home') {
        e.preventDefault();
        setView('buy');
      } else if (key === 'c' && s.locationId === 'home') {
        e.preventDefault();
        setActiveModal(s.activeModal === 'computer' ? null : 'computer');
      } else if (key === 'k') {
        e.preventDefault();
        setActiveModal(s.activeModal === 'backpack' ? null : 'backpack');
      } else if (key === 'g') {
        e.preventDefault();
        setActiveModal(s.activeModal === 'garage' ? null : 'garage');
      } else if (key === 'p') {
        e.preventDefault();
        setActiveModal(s.activeModal === 'phone' ? null : 'phone', 'levels');
      } else if (key === 'i') {
        e.preventDefault();
        setActiveModal(s.activeModal === 'sim' ? null : 'sim', 'needs');
      } else if (key === 'w') {
        e.preventDefault();
        setActiveModal(s.activeModal === 'career' ? null : 'career');
      } else if (key === 's') {
        e.preventDefault();
        setActiveModal(s.activeModal === 'account' ? null : 'account');
      } else if (key === 'q' || key === 'h') {
        e.preventDefault();
        setActiveModal(s.activeModal === 'guide' ? null : 'guide', 'goals');
      } else if (key === 'a') {
        e.preventDefault();
        handleSmartNext();
      } else if (key === '[' || key === ']') {
        const venue = s.locationId !== 'home' ? LOCATION_BY_ID[s.locationId] : null;
        if (venue?.floors && venue.floors.length > 1) {
          e.preventDefault();
          const curFloor = s.campusFloorIndex || 0;
          const nextFloor =
            key === '['
              ? Math.max(0, curFloor - 1)
              : Math.min(venue.floors.length - 1, curFloor + 1);
          if (nextFloor !== curFloor) {
            useGameStore.getState().setCampusFloor(nextFloor);
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSmartNext, quickSaveNow, resolveEventChoice, setActiveModal, setSpeed, setView]);

  const activeVehicle = getActiveVehicle({ ownedCars, activeCarId });
  const totalPackCount = inventory.reduce((sum, entry) => sum + entry.quantity, 0);
  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const currentPlaceName =
    locationId === 'home'
      ? homeDef.name
      : LOCATION_BY_ID[locationId]?.shortName || 'Bay Area';
  const currentPlaceEmoji =
    locationId === 'home'
      ? homeDef.emoji
      : LOCATION_BY_ID[locationId]?.emoji || '📍';

  const currentGoal = GOALS[goalIndex];
  const weatherLabel =
    weather === 'sunny'
      ? '☀️ 68°F'
      : weather === 'foggy'
      ? '🌫️ 56°F'
      : weather === 'breezy'
      ? '🌬️ 63°F'
      : '🌧️ 54°F';

  const careerDef = job ? CAREER_BY_ID[job.careerId] : null;
  const levelDef = careerDef && job ? careerDef.levels[job.levelIndex] : null;

  return (
    <>
      {/* TOP BAR HUD */}
      <div className="pointer-events-none fixed top-0 right-0 left-0 z-30 flex flex-wrap items-center justify-between gap-2 p-3 sm:px-5">
        {/* Left Status Pill: Location, Clock, Weather, Speed Controls */}
        <div className="apple-pill pointer-events-auto flex flex-wrap items-center gap-2 rounded-full px-3 py-1.5 text-xs text-[var(--ink)] sm:text-[13px]">
          <button
            onClick={() => setView(view === 'map' ? 'live' : 'map')}
            className="btn-press flex items-center gap-1.5 font-bold text-[var(--ink)] hover:text-[#007AFF]"
            title="Toggle Bay Map (M)"
          >
            <span className="text-sm">{currentPlaceEmoji}</span>
            <span>{currentPlaceName}</span>
          </button>

          <span className="text-slate-300 dark:text-slate-600">·</span>

          <div className="font-mono text-xs font-semibold text-[var(--ink)]">
            D{getDayNumber(time)} · {getDayOfWeekName(time).slice(0, 3)} {formatTime(time)}
          </div>

          <span className="hidden text-xs font-medium text-[var(--ink-soft)] md:inline">
            {weatherLabel}
          </span>

          {/* PG&E Power Alert (Only surfaced when outage occurs) */}
          {!powered && (
            <span
              className="inline-flex animate-pulse items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-500"
              title="PG&E Power Shutoff"
            >
              <ZapOff className="size-3" />
              <span>Outage</span>
            </span>
          )}

          {/* Speed Segmented Control */}
          <div
            className="ml-0.5 flex items-center gap-0.5 rounded-full bg-[var(--mist)] p-0.5"
            title="Shortcuts: Space (Pause/Play) · 1 / 2 / 3 (Speed)"
          >
            {([0, 1, 2, 3] as const).map((sp) => (
              <button
                key={sp}
                onClick={() => setSpeed(sp)}
                className={`btn-press flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold ${
                  speed === sp
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                {sp === 0 ? <Pause className="size-2.5" /> : sp === 1 ? <Play className="size-2.5" /> : `${sp}×`}
              </button>
            ))}
          </div>
        </div>

        {/* Right Status Pill: Cash, RSU, Karma, Theme & Sound */}
        <div className="apple-pill pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-[var(--ink)] sm:text-[13px]">
          <button
            onClick={() => setActiveModal('phone', 'wealth')}
            className="btn-press flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-600 sm:text-[13px] dark:text-emerald-400"
            title="Open Schwaab Private Wealth & Cash Flow"
          >
            <span>{formatCurrency(cash)}</span>
            {vestedRsu > 0 && (
              <span className="hidden rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-purple-600 sm:inline dark:text-purple-400">
                +{formatCurrency(vestedRsu)} RSU
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveModal('sim', 'perks')}
            className="btn-press rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400"
            title="Karma Points — Spend on Perks"
          >
            ⚡ {karma}
          </button>

          <div className="mx-0.5 h-3.5 w-px bg-black/10 dark:bg-white/15" />

          <button
            onClick={toggleSound}
            className="btn-press grid size-6.5 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink)]"
            aria-label="Toggle sound"
          >
            {soundOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </button>

          <button
            onClick={toggleNightMode}
            className="btn-press grid size-6.5 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink)]"
            title={`Theme: ${nightMode}`}
          >
            {nightMode === 'dark' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
          </button>

          <button
            onClick={() => setActiveModal(activeModal === 'guide' ? null : 'guide', 'goals')}
            className="btn-press inline-flex items-center gap-1 rounded-full bg-[#007AFF]/15 px-2.5 py-1 text-[11px] font-extrabold text-[#007AFF] hover:bg-[#007AFF]/25"
            title="Open Goals, F.I.R.E. Roadmap & How to Play Guide (Shortcut: Q)"
          >
            <Target className="size-3.5" />
            <span>Goals & Guide</span>
          </button>

          <button
            onClick={() => setActiveModal(activeModal === 'account' ? null : 'account')}
            className="btn-press inline-flex items-center gap-1 rounded-full bg-[var(--mist)] px-2.5 py-1 text-[11px] font-bold text-[var(--ink)] hover:bg-black/10 dark:hover:bg-white/15"
            title="Cloud Saves & Account (Shortcut: S · Quick Save: Cmd/Ctrl+S)"
          >
            {authUser ? (
              <>
                <span className="grid size-3.5 place-items-center rounded-full bg-[#007AFF] text-[8.5px] font-extrabold text-white">
                  {authUser.name[0]?.toUpperCase() || 'G'}
                </span>
                <span className="hidden sm:inline">{authUser.givenName || 'Saves'}</span>
              </>
            ) : (
              <>
                <Save className="size-3 text-[#007AFF]" />
                <span>Saves</span>
              </>
            )}
          </button>

          {/* Annie's Personal Site & Portfolio */}
          <a
            href="https://gengannie.github.io/personal_site/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-press inline-flex items-center gap-1 rounded-full bg-[#007AFF]/10 px-2.5 py-1 text-[11px] font-bold text-[#007AFF] hover:bg-[#007AFF]/20 transition-colors"
            title="Discover more projects on Annie's personal site & portfolio"
          >
            <Globe className="size-3" />
            <span className="hidden sm:inline">Annie's Site</span>
            <ArrowUpRight className="size-2.5 opacity-70" />
          </a>

          <button
            onClick={() => setScreen('title')}
            className="btn-press rounded-full bg-[var(--mist)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            Menu
          </button>
        </div>
      </div>

      {/* DYNAMIC ISLAND TOAST NOTIFICATION */}
      {lastToast && (
        <div className="pointer-events-none fixed top-14 left-1/2 z-[80] w-fit max-w-[calc(100%-32px)] -translate-x-1/2 animate-target-pop">
          <div
            className={`apple-glass-heavy pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-2.5 shadow-2xl transition-all ${
              lastToast.tone === 'bad'
                ? 'border-2 border-rose-500/80 bg-rose-500/20 text-rose-800 ring-2 ring-rose-500/30 dark:text-rose-200'
                : lastToast.tone === 'good'
                  ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                  : 'border border-black/10 text-[var(--ink)] dark:border-white/10'
            }`}
          >
            <span className="shrink-0 text-base">{lastToast.emoji}</span>
            <span className="line-clamp-2 max-w-md text-xs font-bold leading-tight">
              {lastToast.text}
            </span>
            <button
              onClick={dismissToast}
              className="btn-press grid size-5 shrink-0 place-items-center rounded-full bg-black/10 text-[var(--ink-soft)] hover:bg-black/20 dark:bg-white/10"
              aria-label="Dismiss notification"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-HEADER: COMPACT LEFT RAIL FOR NORTH STAR GOAL, STARTER TUTORIAL & LIVE ACTION QUEUE */}
      {view === 'live' && (
        <div className="pointer-events-none fixed top-15 left-3 z-20 flex w-72 flex-col items-start gap-2 sm:left-5 sm:w-80">
          {/* Interactive North Star Goal & Guided Starter Quest Card */}
          <div className="apple-glass-heavy pointer-events-auto flex w-full flex-col gap-2 rounded-2xl p-3 text-[var(--ink)] shadow-md">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setActiveModal('guide', 'goals')}
                className="btn-press flex min-w-0 items-center gap-2 text-left"
                title="Click to switch your North Star Goal or open the Playbook (Shortcut: Q)"
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-xl text-sm text-white shadow-xs"
                  style={{ backgroundColor: activeEval.aspDef.accent }}
                >
                  {activeEval.aspDef.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-extrabold">
                      {activeEval.aspDef.shortLabel}
                    </span>
                    <span className="rounded-full bg-[#007AFF]/15 px-1.5 py-0.2 font-mono text-[9.5px] font-extrabold text-[#007AFF]">
                      S{activeEval.activeStage.stage.stageNumber}/4 · {activeEval.overallPct}%
                    </span>
                  </div>
                  <div className="truncate text-[10px] font-semibold text-[var(--ink-soft)]">
                    {activeEval.activeStage.stage.emoji} {activeEval.activeStage.stage.title}
                  </div>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setActiveModal('guide', 'goals')}
                  className="btn-press rounded-full bg-[#007AFF]/12 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF] hover:bg-[#007AFF]/20"
                  title="Switch Goal / View 4-Stage Roadmap & Playbook (Shortcut: Q)"
                >
                  Switch
                </button>
                <button
                  onClick={() => setIsGoalCardCollapsed((c) => !c)}
                  className="btn-press grid size-6 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                  title={isGoalCardCollapsed ? 'Expand Goal & Tutorial Tracker' : 'Minimize Goal Tracker'}
                >
                  {isGoalCardCollapsed ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronUp className="size-3.5" />
                  )}
                </button>
              </div>
            </div>

            {!isGoalCardCollapsed && (
              <>
                {/* Active Stage Progress Bar & 1-Tap Action */}
                <div className="rounded-xl bg-[var(--mist)] p-2">
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                    <span className="truncate text-[var(--ink-soft)]">
                      {activeEval.activeStage.progressText}
                    </span>
                    <span className="shrink-0 font-mono text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(activeEval.activeStage.stage.rewardCash)} · +
                      {activeEval.activeStage.stage.rewardKarma}⚡
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#007AFF] transition-all"
                      style={{ width: `${activeEval.activeStage.pct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => setActiveModal('guide', 'playbook')}
                      className="text-[10px] font-bold text-[var(--ink-soft)] hover:text-[#007AFF] hover:underline"
                    >
                      📖 How to Play
                    </button>
                    <button
                      onClick={() => handleGoalAction(activeEval.activeStage.stage.actionType)}
                      className="btn-press inline-flex items-center gap-1 rounded-lg bg-[#007AFF] px-2.5 py-1 text-[10px] font-extrabold text-white shadow-2xs hover:bg-[#0066CC]"
                    >
                      <span>{activeEval.activeStage.stage.actionLabel}</span>
                      <ArrowRight className="size-2.5" />
                    </button>
                  </div>
                </div>

                {/* Guided Starter Tutorial Step (if still in onboarding) */}
                {currentGoal && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
                    <button
                      onClick={() => setActiveModal('guide', 'tutorial')}
                      className="min-w-0 flex-1 text-left"
                      title={currentGoal.howTo}
                    >
                      <div className="flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        <span>🎓 Starter Step {goalIndex + 1}/{GOALS.length}</span>
                        <span>·</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(currentGoal.rewardCash)}
                        </span>
                      </div>
                      <div className="truncate text-[11px] font-extrabold text-[var(--ink)]">
                        {currentGoal.emoji} {currentGoal.title}
                      </div>
                    </button>
                    <button
                      onClick={() => handleGoalAction(currentGoal.actionType)}
                      className="btn-press shrink-0 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-2xs hover:bg-amber-600"
                    >
                      Do Step →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Crystal-Clear Active Action Status Card & Contained Up-Next Stack */}
          {queue.length > 0 && (
            <div className="apple-glass-heavy pointer-events-auto flex flex-col gap-2 rounded-2xl px-3.5 py-3 text-[var(--ink)] shadow-md">
              {(() => {
                const activeItem = queue[0];
                const pct = Math.min(
                  100,
                  Math.round((activeItem.elapsedMinutes / activeItem.totalMinutes) * 100)
                );
                const remainingMins = Math.max(
                  1,
                  Math.ceil(activeItem.totalMinutes - activeItem.elapsedMinutes)
                );
                const isWalkingToTarget = Boolean(
                  targetPos && (pos.x !== targetPos.x || pos.y !== targetPos.y)
                );

                return (
                  <>
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#007AFF]/15 text-lg">
                          {activeItem.emoji}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                isWalkingToTarget
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                                  : 'bg-[#007AFF]/20 text-[#007AFF] dark:text-[#5AC8FA]'
                              }`}
                            >
                              {isWalkingToTarget
                                ? '🚶 Walking there...'
                                : `⚡ Active · ${remainingMins}m left`}
                            </span>
                            {!isWalkingToTarget && (
                              <span className="font-mono text-[11px] font-extrabold text-[#007AFF] dark:text-[#5AC8FA]">
                                {pct}%
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[13px] font-extrabold leading-snug text-[var(--ink)]">
                            {activeItem.label}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => cancelQueuedAction(activeItem.uid)}
                        title="Stop / Cancel current action"
                        className="btn-press flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-extrabold text-rose-600 hover:bg-rose-500/25 dark:text-rose-400"
                      >
                        <X className="size-3.5" />
                        <span>Stop</span>
                      </button>
                    </div>

                    {/* Full-Width Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isWalkingToTarget ? 'w-1/4 animate-pulse bg-amber-500' : 'bg-[#007AFF]'
                        }`}
                        style={isWalkingToTarget ? undefined : { width: `${pct}%` }}
                      />
                    </div>
                  </>
                );
              })()}

              {/* Contained Vertical Stack for Queued Follow-Up Actions (Never bleeds across screen) */}
              {queue.length > 1 && (
                <div className="mt-0.5 border-t border-black/10 pt-2 dark:border-white/10">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                    <span>Up Next ({queue.length - 1})</span>
                    <button
                      onClick={() => queue.slice(1).forEach((q) => cancelQueuedAction(q.uid))}
                      className="text-[10px] font-bold text-rose-500 hover:underline"
                    >
                      Clear Queue
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {queue.slice(1, 4).map((item) => (
                      <button
                        key={item.uid}
                        onClick={() => cancelQueuedAction(item.uid)}
                        title="Click to remove from queue"
                        className="btn-press group flex w-full items-center justify-between gap-2 rounded-xl bg-[var(--mist)] px-2.5 py-1.5 text-left text-xs font-bold text-[var(--ink)] hover:bg-rose-500/10"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.emoji}</span>
                          <span className="leading-tight text-[var(--ink)]">{item.label}</span>
                        </div>
                        <X className="size-3.5 shrink-0 text-[var(--ink-soft)] group-hover:text-rose-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* INTERACTIVE WORK SHIFT MINI-GAME ("LIVE CODE SPRINT & BUG SQUASH") — DOCKED TO TOP-RIGHT RAIL IN LIVE VIEW ONLY */}
      {view === 'live' && !activeModal && workShift && job && careerDef && levelDef && (
        <div className="pointer-events-none fixed top-16 right-3 z-20 w-[calc(100%-24px)] max-w-[385px] sm:right-5">
          <div className="apple-glass-heavy pointer-events-auto relative overflow-hidden rounded-3xl p-3.5 shadow-xl">
            {/* Floating +$$$ / +Promo Micro-Reward Popups */}
            <div className="pointer-events-none absolute top-3 right-12 z-40 flex flex-col items-end gap-1">
              {floatingPops.map((pop) => (
                <div
                  key={pop.id}
                  className="animate-reward-pop rounded-full bg-black/80 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-white shadow-md"
                  style={{ color: pop.color }}
                >
                  {pop.text}
                </div>
              ))}
            </div>

            {(() => {
              const shiftMode =
                workShift.mode ||
                (locationId === 'home'
                  ? 'wfh'
                  : locationId === careerDef.locationId
                  ? 'office'
                  : 'wfa');
              const nextLevel = careerDef.levels[job.levelIndex + 1] || null;
              const activeProj =
                (job.activeProjectId && WORK_PROJECT_BY_ID[job.activeProjectId]) ||
                WORK_PROJECTS?.[0] ||
                null;
              const projPct = Math.min(100, Math.round(job.projectProgress || 0));
              const shiftPct = Math.min(
                100,
                Math.round((workShift.elapsedMinutes / workShift.totalMinutes) * 100)
              );

              return (
                <>
                  {/* Header Row (Always visible, with Compact/Expand toggle) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[#007AFF]/15 text-lg">
                        {careerDef.emoji}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-extrabold">{careerDef.company}</span>
                          <span className="rounded-full bg-[#007AFF] px-2 py-0.5 text-[10px] font-bold text-white">
                            {levelDef.code}
                          </span>
                          {sprintCombo > 0 && (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                              🔥 {sprintCombo}× Flow
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--ink-soft)]">
                          Ends {formatTime(workShift.endsAt)} ·{' '}
                          <span className="font-mono font-bold text-[#007AFF]">{shiftPct}%</span>
                          {shiftBonusEarned > 0 && (
                            <span className="ml-1 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              · +{formatCurrency(shiftBonusEarned)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <div className="text-right font-mono">
                        <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(levelDef.shiftPay)}
                        </div>
                        <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                          +{formatCurrency(levelDef.rsuPerShift)} RSU
                        </div>
                      </div>
                      <button
                        onClick={() => setIsWorkCardCollapsed((c) => !c)}
                        title={
                          isWorkCardCollapsed
                            ? 'Expand Work Shift Sprint Card'
                            : 'Minimize Work Shift Card to see more of the room'
                        }
                        className="btn-press grid size-7 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                      >
                        {isWorkCardCollapsed ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronUp className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isWorkCardCollapsed ? (
                    /* Minimized Single-Bar View */
                    <div className="mt-2 space-y-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#007AFF] transition-all"
                          style={{ width: `${shiftPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                          🔒 On the Clock ({shiftMode.toUpperCase()})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setActiveModal('career')}
                            className="btn-press rounded-full bg-[#007AFF] px-2.5 py-0.5 text-[10px] font-extrabold text-white"
                          >
                            🔬 Career Hub
                          </button>
                          <button
                            onClick={leaveWorkEarly}
                            className="btn-press rounded-full bg-rose-500/12 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400"
                          >
                            Leave Early
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Sleek Mode Status Pill Strip */}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 rounded-xl bg-[var(--mist)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--ink-soft)]">
                        <span className="font-bold text-[var(--ink)]">
                          {shiftMode === 'office'
                            ? '🏢 In-Office · +20% Promo'
                            : shiftMode === 'wfh'
                            ? `🏠 Remote WFH (${job.wfhDaysThisWeek || 1}/2 wk)`
                            : `🌍 WFA Pass · ${currentPlaceName}`}
                        </span>
                        <span className="font-mono text-[9.5px] font-bold text-[#007AFF]">
                          {shiftMode === 'office'
                            ? `Office ${job.officeDaysThisWeek || 1}/3`
                            : `${job.wfaDaysRemaining ?? 3} WFA left`}
                        </span>
                      </div>

                      {/* Dual Compact Progress Bars: Shift & Multi-Gate Promo Packet */}
                      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-[var(--ink-soft)]">
                            <span>Shift Progress</span>
                            <span className="font-mono text-[var(--ink)]">{shiftPct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#007AFF] transition-all"
                              style={{ width: `${shiftPct}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[9px] font-semibold text-[var(--ink-soft)]">
                            Shifts: {Math.max(job.shiftsAtLevel ?? 0, job.shiftsCompleted ?? 0)}/{nextLevel?.minShiftsForPromo || 3} req
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-[var(--ink-soft)]">
                            <span>Calibration</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">
                              {Math.round(job.performance)}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${job.performance}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[9px] font-semibold text-[var(--ink-soft)]">
                            Deliverables {job.deliverablesCompleted || 0}/
                            {nextLevel?.requiredDeliverables || 1} · Shifts {Math.max(job.shiftsAtLevel ?? 0, job.shiftsCompleted ?? 0)}/
                            {nextLevel?.minShiftsForPromo || 3}
                          </div>
                        </div>
                      </div>

                      {/* Active Work Exploration Project Bar + 1-Tap Career Hub CTA */}
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl border border-[#007AFF]/25 bg-[#007AFF]/8 px-3 py-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold">
                            <span className="truncate text-[var(--ink)]">
                              {activeProj ? `${activeProj.emoji} ${activeProj.title}` : '🔬 Active R&D Milestone'}
                            </span>
                            <span className="shrink-0 font-mono text-[#007AFF]">{projPct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all"
                              style={{ width: `${projPct}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveModal('career')}
                          className="btn-press shrink-0 rounded-xl bg-[#007AFF] px-2.5 py-1.5 text-[10px] font-extrabold text-white shadow-xs hover:bg-[#0066CC]"
                        >
                          🔬 Career Hub
                        </button>
                      </div>

                      {/* Interactive Live Code Sprint & Bug Squash Arena */}
                      <div className="mt-2.5 rounded-2xl border border-black/8 bg-black/[0.03] p-2 dark:border-white/10 dark:bg-white/[0.04]">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#007AFF]">
                            ⚡ Live Code Sprint — Tap to Ship
                          </span>
                          <span className="text-[9.5px] font-medium text-[var(--ink-soft)]">
                            Instant cash & promo boosts
                          </span>
                        </div>

                        <div className="grid min-h-[42px] grid-cols-3 gap-1.5">
                          {sprintTargets.map((target) => (
                            <button
                              key={target.id}
                              onClick={() => handleClickSprintTarget(target)}
                              className={`animate-target-pop btn-press flex flex-col items-start justify-between rounded-xl border px-2 py-1.5 text-left shadow-xs ${target.accent}`}
                            >
                              <div className="flex w-full items-center justify-between gap-1">
                                <span className="text-sm leading-none">{target.emoji}</span>
                                <span className="font-mono text-[9px] font-extrabold">{target.badge}</span>
                              </div>
                              <div className="mt-1 w-full text-[10px] font-bold leading-tight text-[var(--ink)]">
                                {target.title}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ultra-Clean Compact Work Tone Icon Pills */}
                      <div className="mt-2 flex items-center justify-between gap-1.5">
                        <div className="scrollbar-none flex items-center gap-1 overflow-x-auto">
                          {WORK_TONES.map((wt) => {
                            const active = workShift.tone === wt.id;
                            return (
                              <button
                                key={wt.id}
                                onClick={() => setWorkTone(wt.id)}
                                title={`${wt.label} — ${wt.desc}`}
                                className={`btn-press flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-bold ${
                                  active
                                    ? 'bg-[#007AFF] text-white shadow-xs'
                                    : 'bg-[var(--mist)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                                }`}
                              >
                                <span>{wt.emoji}</span>
                                <span>{COMPACT_TONE_LABELS[wt.id]}</span>
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={leaveWorkEarly}
                          title="Badge out early and collect partial shift pay"
                          className="btn-press shrink-0 rounded-full bg-rose-500/12 px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                        >
                          Leave Early
                        </button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ACTIVE COMMUTE / TRANSIT OVERLAY CARD */}
      {view === 'live' && !activeModal && travel && (
        <div className="fixed top-24 left-1/2 z-30 w-[calc(100%-24px)] max-w-md -translate-x-1/2">
          <div className="apple-glass-heavy rounded-3xl p-4 shadow-xl">
            {(() => {
              const modeDef = COMMUTE_MODES.find((m) => m.id === travel.mode);
              const activeVehicle =
                travel.mode === 'tesla' ? getActiveVehicle({ ownedCars, activeCarId }) : null;
              const transitEmoji = activeVehicle?.emoji || modeDef?.emoji || '🚆';
              const transitName = activeVehicle?.name || modeDef?.name || 'Transit';
              const destName =
                travel.to === 'home'
                  ? homeDef.name
                  : LOCATION_BY_ID[travel.to]?.name || travel.to;
              const elapsed = Math.max(0, time - travel.startedAt);
              const pct = Math.min(100, Math.round((elapsed / travel.totalMinutes) * 100));

              return (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-2xl bg-[#007AFF]/15 text-2xl">
                        {transitEmoji}
                      </span>
                      <div>
                        <div className="text-sm font-extrabold">En Route to {destName}</div>
                        <div className="text-xs text-[var(--ink-soft)]">
                          {transitName} · ETA {formatTime(travel.arriveAt)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={skipTravelNow}
                      className="btn-press flex items-center gap-1 rounded-full bg-[#007AFF] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <SkipForward className="size-3.5" />
                      Arrive
                    </button>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#007AFF] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* STREAMLINED DILEMMA / EVENT MODAL WITH VISUAL OUTCOME CHIPS & KEYCAPS */}
      {activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="apple-glass-heavy w-full max-w-md rounded-3xl p-5 shadow-2xl">
            {/* Bold Visual Icon Header */}
            <div className="flex items-center gap-3.5">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-3xl shadow-inner">
                {activeEvent.emoji}
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <span>⚡ Silicon Valley Dilemma</span>
                </div>
                <h3 className="mt-1 text-base leading-snug font-extrabold">{activeEvent.title}</h3>
              </div>
            </div>

            {/* Concise 1-Sentence Summary */}
            <p className="mt-3 text-xs leading-relaxed text-[var(--ink-soft)]">
              {activeEvent.description}
            </p>

            {/* Tactile Choice Cards with Outcome Chips & Shortcut Badges */}
            <div className="mt-4 grid gap-2.5">
              {activeEvent.choices.map((ch, idx) => (
                <button
                  key={idx}
                  onClick={() => resolveEventChoice(idx)}
                  className="btn-press group flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[var(--mist)] p-3 text-left transition-colors hover:border-[#007AFF]/40 hover:bg-[#007AFF]/12 dark:border-white/10"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/70 text-xl shadow-2xs dark:bg-white/10">
                      {ch.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-snug">{ch.label}</div>

                      {/* Visual Outcome Chips */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {ch.cashDelta && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            💵 +{formatCurrency(ch.cashDelta)}
                          </span>
                        )}
                        {ch.rsuDelta && (
                          <span className="rounded-full bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-purple-600 dark:text-purple-400">
                            💎 +{formatCurrency(ch.rsuDelta)} RSU
                          </span>
                        )}
                        {ch.performanceDelta && (
                          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-blue-600 dark:text-blue-400">
                            📈 Promo +{ch.performanceDelta}%
                          </span>
                        )}
                        {ch.startupDelta && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                            🚀 MVP +{ch.startupDelta}%
                          </span>
                        )}
                        {ch.skillCheck && (
                          <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                            🎲 Lv.{ch.skillCheck.difficulty} Check
                          </span>
                        )}
                        {ch.needsDelta &&
                          (Object.entries(ch.needsDelta) as Array<[NeedKey, number]>).map(
                            ([k, val]) =>
                              val ? (
                                <span
                                  key={k}
                                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                                    val > 0
                                      ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                                      : 'bg-rose-500/15 text-rose-500'
                                  }`}
                                >
                                  {val > 0 ? `+${val}` : val} {k}
                                </span>
                              ) : null
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Keyboard Shortcut Badge (1, 2, 3) */}
                  <span className="keycap-hint shrink-0 group-hover:border-[#007AFF] group-hover:text-[#007AFF]">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM FLOATING APPLE DOCK */}
      {view !== 'buy' && (
      <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-30 flex flex-wrap items-end justify-between gap-2 p-3 sm:px-5">
        {/* Left: Sim Badge + Glanceable Apple Watch Activity Rings for Needs (1-Tap Auto-Fix) */}
        <div className="apple-glass-heavy pointer-events-auto flex items-center gap-3 rounded-3xl p-2 pr-4 text-[var(--ink)]">
          {/* Sim Portrait & Mood Inspector Button */}
          <button
            onClick={() => setActiveModal(activeModal === 'sim' ? null : 'sim', 'needs')}
            className="btn-press flex items-center gap-2.5 rounded-2xl pr-1 text-left"
            title="Open Sim Inspector (Shortcut: I)"
          >
            <Portrait appearance={sim.appearance} size={44} ringColor={moodInfo.color} />
            <div className="hidden sm:block">
              <div className="text-xs font-extrabold text-[var(--ink)]">
                {sim.name.split(' ')[0]}
              </div>
              <span
                className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                style={{ backgroundColor: moodInfo.color }}
              >
                {moodInfo.label}
              </span>
            </div>
          </button>

          <div className="h-9 w-px bg-black/10 dark:bg-white/15" />

          {/* 6 Apple Watch Activity Rings (Show percentage only when < 50% or on hover) */}
          <div className="flex items-center gap-1.5">
            {NEEDS_META.map((n) => {
              const v = Math.round(needs[n.key]);
              const radius = 16;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference * (1 - Math.max(0, Math.min(100, v)) / 100);
              const ringColor = v < 30 ? '#FF3B30' : v < 50 ? '#FF9500' : n.color;

              return (
                <button
                  key={n.key}
                  onClick={() => autoFixNeed(n.key)}
                  aria-label={`${n.label} ${v}% — Tap to Auto-Fix`}
                  className="btn-press group relative flex flex-col items-center rounded-2xl p-1 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <div className="relative grid size-9 place-items-center">
                    <svg className="size-9 -rotate-90" viewBox="0 0 40 40">
                      <circle
                        cx="20"
                        cy="20"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        className="text-black/10 dark:text-white/15"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r={radius}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="3.5"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    </svg>
                    <span className="pointer-events-none absolute text-sm leading-none">
                      {n.emoji}
                    </span>
                    {v < 30 && (
                      <span className="pointer-events-none absolute -top-0.5 -right-0.5 size-2.5 animate-ping rounded-full bg-rose-500" />
                    )}
                  </div>

                  {/* Show percentage inline only when attention is needed (< 50%) */}
                  {v < 50 && (
                    <span
                      className="mt-0.5 font-mono text-[9px] leading-none font-extrabold"
                      style={{ color: ringColor }}
                    >
                      {v}%
                    </span>
                  )}

                  {/* Crisp Hover Tooltip: Tap to Auto-Fix */}
                  <div className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-black/90 px-3 py-1.5 text-center text-[11px] font-bold text-white opacity-0 shadow-lg backdrop-blur-md transition-all group-hover:visible group-hover:opacity-100">
                    <div>
                      {n.emoji} {n.shortLabel}: <span className="font-mono">{v}%</span>
                    </div>
                    <div className="text-[10px] font-extrabold text-[#5AC8FA]">
                      ⚡ Tap to Auto-Fix
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Primary Navigation Dock + "✨ Smart Next" Apple Intelligence Button */}
        <div className="apple-glass-heavy pointer-events-auto flex items-center gap-1 rounded-3xl p-1.5">
          {/* "✨ Smart Next" Apple Intelligence 1-Tap Button */}
          <button
            onClick={handleSmartNext}
            title={`Apple Intelligence Smart Next (Shortcut: A) — ${smartRecommendation.fullLabel}`}
            className="apple-ai-btn btn-press group relative flex items-center gap-1.5 rounded-2xl px-3 py-2 text-white"
          >
            <Sparkles className="size-4 shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-[10px] font-extrabold whitespace-nowrap">
                Smart Next
              </div>
              <div className="text-[9px] font-semibold whitespace-nowrap text-white/95">
                {smartRecommendation.shortBadge}
              </div>
            </div>

            {/* Full Action Preview Hover Tooltip */}
            <div className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2.5 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-black/90 px-3 py-1.5 text-left text-[10px] font-bold text-white opacity-0 shadow-xl backdrop-blur-md transition-all group-hover:visible group-hover:opacity-100">
              <div className="text-white">{smartRecommendation.fullLabel}</div>
              <div className="text-[9px] font-semibold text-[#5AC8FA]">
                {smartRecommendation.subHint}
              </div>
            </div>
          </button>

          {locationId !== 'home' && view === 'live' && !workShift ? (
            <button
              onClick={() =>
                travelTo(
                  'home',
                  hasPersonalCar({ ownedCars }) ? 'tesla' : job?.preferredCommute || 'caltrain'
                )
              }
              title="Travel back to your apartment (Shortcut: H)"
              className="btn-press flex flex-col items-center gap-0.5 rounded-2xl bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
            >
              <Home className="size-4" />
              <span>Home</span>
            </button>
          ) : (
            <button
              onClick={() => setView('live')}
              className={`btn-press flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-bold ${
                view === 'live'
                  ? 'bg-[#007AFF] text-white'
                  : 'text-[var(--ink)] hover:bg-[var(--mist)]'
              }`}
              title={
                locationId === 'home'
                  ? 'View Apartment Room'
                  : `View ${currentPlaceName}`
              }
            >
              {locationId === 'home' ? <Home className="size-4" /> : <Compass className="size-4" />}
              <span>{locationId === 'home' ? 'Room' : 'Venue'}</span>
            </button>
          )}

          <button
            onClick={() => setView(view === 'map' ? 'live' : 'map')}
            className={`btn-press flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-bold ${
              view === 'map'
                ? 'bg-[#007AFF] text-white'
                : 'text-[var(--ink)] hover:bg-[var(--mist)]'
            }`}
            title="Bay Area Map (Shortcut: M)"
          >
            <Map className="size-4" />
            <span>Map</span>
          </button>

          {/* Furnish & Computer Icons ONLY visible when at Home */}
          {locationId === 'home' && (
            <>
              <button
                onClick={() => setView('buy')}
                className="btn-press flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-bold text-[var(--ink)] hover:bg-[var(--mist)]"
                title="Furnish Apartment (Shortcut: B)"
              >
                <ShoppingBag className="size-4" />
                <span>Furnish</span>
              </button>

              {(() => {
                const hasPC = Boolean(getInstalledHomeComputer({ objects }));
                return (
                  <button
                    onClick={() =>
                      setActiveModal(activeModal === 'computer' ? null : 'computer')
                    }
                    className={`btn-press relative flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-bold ${
                      activeModal === 'computer'
                        ? 'bg-[#007AFF] text-white'
                        : hasPC
                        ? 'text-[var(--ink)] hover:bg-[var(--mist)]'
                        : 'text-sky-600 hover:bg-[var(--mist)] dark:text-sky-400'
                    }`}
                    title={
                      hasPC
                        ? 'Open Interactive Home Computer OS (Shortcut: C)'
                        : 'Optional Purchase: Install Home Computer Rig (Shortcut: C)'
                    }
                  >
                    <Monitor className="size-4" />
                    <span>{hasPC ? 'Mac' : '+Mac'}</span>
                  </button>
                );
              })()}
            </>
          )}

          {/* Backpack / Everyday Carry Inventory (Shortcut: K) */}
          <button
            onClick={() => setActiveModal(activeModal === 'backpack' ? null : 'backpack')}
            className={`btn-press relative flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-bold ${
              activeModal === 'backpack'
                ? 'bg-[#007AFF] text-white'
                : 'text-[var(--ink)] hover:bg-[var(--mist)]'
            }`}
            title="Open Backpack & Everyday Carry Inventory (Shortcut: K)"
          >
            {totalPackCount > 0 && (
              <span className="absolute -top-0.5 right-1 rounded-full bg-[#007AFF] px-1 text-[8px] font-extrabold text-white">
                {totalPackCount}
              </span>
            )}
            <Backpack className="size-4" />
            <span>Pack</span>
          </button>

          {/* Apple CarPlay & EV Garage (Shortcut: G) */}
          <button
            onClick={() => setActiveModal(activeModal === 'garage' ? null : 'garage')}
            className={`btn-press relative flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-bold ${
              activeModal === 'garage'
                ? 'bg-[#007AFF] text-white'
                : 'text-[var(--ink)] hover:bg-[var(--mist)]'
            }`}
            title={
              activeVehicle
                ? `Apple CarPlay & EV Garage (${activeVehicle.shortName}) — 1-Tap Drives & Joyrides (Shortcut: G)`
                : 'Open EV Garage — Buy Prius ($4.2k), Tesla FSD ($12.5k) or Taycan ($18.5k) (Shortcut: G)'
            }
          >
            <Car className="size-4" />
            <span>{activeVehicle ? 'CarPlay' : 'Garage'}</span>
          </button>

          <button
            onClick={() => setActiveModal(activeModal === 'career' ? null : 'career')}
            className={`btn-press relative flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-bold ${
              activeModal === 'career'
                ? 'bg-[#007AFF] text-white'
                : 'text-[var(--ink)] hover:bg-[var(--mist)]'
            }`}
            title="Open Work & Career Hub (Shortcut: W)"
          >
            {workShift && (
              <span className="absolute top-1 right-1.5 size-2 rounded-full bg-emerald-500" />
            )}
            <Briefcase className="size-4" />
            <span>Work</span>
          </button>

          <button
            onClick={() => setActiveModal(activeModal === 'phone' ? null : 'phone', 'levels')}
            className="btn-press relative flex flex-col items-center gap-0.5 rounded-2xl bg-[#007AFF]/12 px-2.5 py-1.5 text-[10px] font-bold text-[#007AFF]"
            title="Open BayOS Phone (Shortcut: P)"
          >
            <Smartphone className="size-4" />
            <span>BayOS</span>
          </button>
        </div>
      </div>
      )}
    </>
  );
};
