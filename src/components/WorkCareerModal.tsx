import React, { useState } from 'react';
import {
  CAREERS,
  CAREER_BY_ID,
  HOMES,
  LOCATION_BY_ID,
  SKILL_TREE_BRANCHES,
  SKILL_TREE_NODES,
  SKILL_TREE_NODE_BY_ID,
  SKILLS_META,
  WORK_EXPLORATION_TASKS,
  WORK_PROJECTS,
  WORK_PROJECT_BY_ID,
  WORK_TONES,
} from '../data/worldData';
import {
  formatCurrency,
  formatTime,
  getDayOfWeekName,
  useGameStore,
} from '../store/useGameStore';
import {
  CommuteModeId,
  TechNodeId,
  WeekdayAttendance,
  WorkMode,
  WorkProjectDef,
} from '../types/game';
import { Portrait } from './Portrait';
import {
  Building2,
  Home,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Zap,
  Award,
  TrendingUp,
  Briefcase,
  Cpu,
  Layers,
  ShieldCheck,
  X,
  ArrowUpRight,
  Lock,
  Compass,
  FileCode2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Move,
} from 'lucide-react';

interface CareerStoreExtensions {
  startWorkShift: (preferredMode?: WorkMode) => void;
  commuteToOfficeAndWork?: (mode?: CommuteModeId) => void;
  selectWorkProject?: (projectId: string) => void;
  doWorkExploration?: (taskId: string) => void;
  submitPromoPacket?: () => void;
  unlockTechNode?: (nodeId: TechNodeId) => void;
  trainTechNodeSkill?: (nodeId: TechNodeId) => void;
}

type CareerModalTab = 'hybrid' | 'explore' | 'tree' | 'ladder';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const WorkCareerModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CareerModalTab>('hybrid');
  const [selectedLevelIdx, setSelectedLevelIdx] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<TechNodeId>('node_cuda_triton');
  const [treeZoom, setTreeZoom] = useState<number>(1.15);
  const [treePan, setTreePan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingTree, setIsDraggingTree] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [treeExpanded, setTreeExpanded] = useState<boolean>(true);

  const sim = useGameStore((s) => s.sim);
  const job = useGameStore((s) => s.job);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const workShift = useGameStore((s) => s.workShift);
  const travel = useGameStore((s) => s.travel);
  const skills = useGameStore((s) => s.skills);
  const needs = useGameStore((s) => s.needs);
  const karma = useGameStore((s) => s.karma);
  const unlockedPerks = useGameStore((s) => s.unlockedPerks);
  const unlockedTechNodes = useGameStore((s) => s.unlockedTechNodes);
  const locationId = useGameStore((s) => s.locationId);
  const homeId = useGameStore((s) => s.homeId);
  const time = useGameStore((s) => s.time);

  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const applyJob = useGameStore((s) => s.applyJob);
  const resignJob = useGameStore((s) => s.resignJob);
  const unvestedRsu = useGameStore((s) => s.unvestedRsu);
  const toggleAutoWork = useGameStore((s) => s.toggleAutoWork);
  const setWorkTone = useGameStore((s) => s.setWorkTone);
  const leaveWorkEarly = useGameStore((s) => s.leaveWorkEarly);

  const startWorkShift = useGameStore(
    (s) => (s as typeof s & CareerStoreExtensions).startWorkShift
  );
  const commuteToOfficeAndWork = useGameStore(
    (s) => (s as typeof s & CareerStoreExtensions).commuteToOfficeAndWork
  );
  const selectWorkProject = useGameStore(
    (s) => (s as typeof s & CareerStoreExtensions).selectWorkProject
  );
  const doWorkExploration = useGameStore(
    (s) => (s as typeof s & CareerStoreExtensions).doWorkExploration
  );
  const submitPromoPacket = useGameStore(
    (s) => (s as typeof s & CareerStoreExtensions).submitPromoPacket
  );
  const unlockTechNode = useGameStore(
    (s) => (s as typeof s & CareerStoreExtensions).unlockTechNode
  );
  const trainTechNodeSkill = useGameStore(
    (s) => (s as typeof s & CareerStoreExtensions).trainTechNodeSkill
  );

  if (!job) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-md"
        onClick={() => setActiveModal(null)}
      >
        <div
          className="apple-glass-heavy relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-[36px] p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-2xl">
                🔓
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Golden Handcuffs Broken · W-2 Free
                </div>
                <h2 className="text-lg font-black">Independent Founder / F.I.R.E. Sovereign</h2>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="btn-press grid size-8 place-items-center rounded-full bg-[var(--mist)]"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="my-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
            <p className="font-bold text-[var(--ink)]">
              You have officially resigned from corporate W-2 life! You have zero Hybrid RTO mandates and 100% control over your schedule.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveModal('guide', 'goals')}
                className="btn-press rounded-xl bg-emerald-600 px-3.5 py-2 font-extrabold text-white"
              >
                🎯 Open F.I.R.E. & Goals Roadmap
              </button>
              <button
                onClick={() => setActiveModal('phone', 'startup')}
                className="btn-press rounded-xl bg-orange-500 px-3.5 py-2 font-extrabold text-white"
              >
                🦄 Open Startup Studio
              </button>
              <button
                onClick={() => setActiveModal('phone', 'wealth')}
                className="btn-press rounded-xl bg-[#007AFF] px-3.5 py-2 font-extrabold text-white"
              >
                💎 Open Schwaab Wealth
              </button>
            </div>
          </div>

          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
            Want to Re-Enter Big Tech? Interview for a W-2 Track Below:
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {CAREERS.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--mist)] p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{c.emoji}</span>
                  <div>
                    <div className="text-xs font-extrabold">{c.company}</div>
                    <div className="text-[10px] text-[var(--ink-soft)]">
                      {c.name} · Starts at {formatCurrency(c.levels[0].baseSalary + c.levels[0].rsuAnnual)}/yr
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => applyJob(c.id)}
                  className="btn-press rounded-xl bg-[#007AFF] px-3 py-1.5 text-[11px] font-extrabold text-white"
                >
                  Interview
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const career = CAREER_BY_ID[job.careerId] || CAREERS[0];
  const currentLevel = career.levels[job.levelIndex] || career.levels[0];
  const nextLevel = career.levels[job.levelIndex + 1] || null;
  const campusLoc = LOCATION_BY_ID[career.locationId];
  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[0];
  const currentVenue = locationId === 'home' ? null : LOCATION_BY_ID[locationId];

  const isAtCampus = locationId === career.locationId;
  const isAtHome = locationId === 'home';

  // Hybrid Attendance metrics
  const officeDays = job.officeDaysThisWeek ?? 0;
  const wfhDays = job.wfhDaysThisWeek ?? 0;
  const wfaRemaining = job.wfaDaysRemaining ?? 4;
  const weeklyAttendance: WeekdayAttendance[] = job.weeklyAttendance ?? [
    'none',
    'none',
    'none',
    'none',
    'none',
  ];
  const rtoCompliant = job.rtoCompliant !== false;
  const currentDayIdx = Math.floor(time / 1440) % 7; // 0=Mon..4=Fri, 5=Sat, 6=Sun

  // Active Work Exploration Project
  const defaultProject =
    WORK_PROJECTS.find((p) => p.careerId === career.id) || WORK_PROJECTS[0];
  const activeProject: WorkProjectDef =
    (job.activeProjectId && WORK_PROJECT_BY_ID[job.activeProjectId]) || defaultProject;
  const projectProgress = Math.min(100, Math.max(0, Math.round(job.projectProgress ?? 0)));
  const deliverablesDone = job.deliverablesCompleted ?? 0;
  const completedProjects = job.completedProjects ?? [];

  // Multi-Gate Promo Checklist calculations
  const shiftsAtLevel = job.shiftsAtLevel ?? job.shiftsCompleted ?? 0;
  const reqShifts = nextLevel?.minShiftsForPromo ?? 3;
  const reqDeliverables = nextLevel?.requiredDeliverables ?? 1;
  const primarySkillKey = nextLevel?.requiredSkill.skill ?? currentLevel.requiredSkill.skill;
  const primarySkillReq = nextLevel?.requiredSkill.level ?? currentLevel.requiredSkill.level;
  const primarySkillCur = Math.floor(skills[primarySkillKey] ?? 0);
  const primarySkillMeta = SKILLS_META.find((sk) => sk.key === primarySkillKey);

  const secondarySkillKey = nextLevel?.secondarySkill?.skill;
  const secondarySkillReq = nextLevel?.secondarySkill?.level ?? 0;
  const secondarySkillCur = secondarySkillKey ? Math.floor(skills[secondarySkillKey] ?? 0) : 0;
  const secondarySkillMeta = secondarySkillKey
    ? SKILLS_META.find((sk) => sk.key === secondarySkillKey)
    : null;

  const unlockedNodes: TechNodeId[] = unlockedTechNodes ?? ['node_git_monorepo'];
  const reqTechNodeId = nextLevel?.requiredTechNode;
  const reqTechNodeDef = reqTechNodeId ? SKILL_TREE_NODE_BY_ID[reqTechNodeId] : null;
  const gateTechNodePass = !reqTechNodeId || unlockedNodes.includes(reqTechNodeId);

  const reqPerfGate = unlockedPerks.includes('perk_exec_halo') ? 82 : 92;
  const gatePerfPass = Math.round(job.performance) >= reqPerfGate;
  const gateTenurePass = shiftsAtLevel >= reqShifts;
  const gatePrimaryPass = primarySkillCur >= primarySkillReq;
  const gateSecondaryPass = !secondarySkillKey || secondarySkillCur >= secondarySkillReq;
  const gateDeliverablesPass = deliverablesDone >= reqDeliverables;
  const gateRtoPass = rtoCompliant;

  const gatesPassedCount = [
    gatePerfPass,
    gateTenurePass,
    gatePrimaryPass,
    gateSecondaryPass,
    gateTechNodePass,
    gateDeliverablesPass,
    gateRtoPass,
  ].filter(Boolean).length;
  const allPromoGatesReady = Boolean(nextLevel && gatesPassedCount === 7);

  const selectedNode = SKILL_TREE_NODE_BY_ID[selectedNodeId] || SKILL_TREE_NODES[5];

  const inspectedLevelIdx = selectedLevelIdx !== null ? selectedLevelIdx : job.levelIndex;
  const inspectedLevel = career.levels[inspectedLevelIdx] || currentLevel;

  const handleCommuteAndWork = () => {
    if (isAtCampus) {
      startWorkShift('office');
    } else if (commuteToOfficeAndWork) {
      commuteToOfficeAndWork(ownedCars.length > 0 ? 'tesla' : job.preferredCommute);
    } else {
      startWorkShift('office');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-md"
      onClick={() => setActiveModal(null)}
    >
      <div
        className={`apple-glass-heavy relative flex w-full flex-col overflow-hidden rounded-[36px] border border-white/50 shadow-[0_32px_100px_rgba(0,0,0,0.55)] transition-all duration-200 dark:border-white/15 ${
          activeTab === 'tree' && treeExpanded
            ? 'h-[94dvh] max-w-7xl'
            : 'h-[90dvh] max-w-6xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================
            MODAL HEADER BAR
        ========================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="grid size-11 place-items-center rounded-2xl text-2xl shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${career.accent}25, ${career.accent}10)`,
                border: `1px solid ${career.accent}40`,
              }}
            >
              {career.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">{career.company}</h2>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-black text-white shadow-xs"
                  style={{ backgroundColor: career.accent }}
                >
                  {currentLevel.code}
                </span>
                <span className="hidden rounded-full bg-[var(--mist)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--ink-soft)] sm:inline-block">
                  {currentLevel.title}
                </span>
              </div>
              <p className="text-xs font-semibold text-[var(--ink-soft)]">
                {getDayOfWeekName(time)} {formatTime(time)} · Campus: {campusLoc?.name || career.district} · TC{' '}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(currentLevel.baseSalary + currentLevel.rsuAnnual)}/yr
                </span>
                {unvestedRsu > 0 && (
                  <span className="ml-1.5 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-300">
                    🔒 {formatCurrency(unvestedRsu)} Unvested RSU
                  </span>
                )}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveModal('guide', 'goals')}
                  className="btn-press rounded-full bg-[#007AFF]/12 px-2.5 py-0.5 text-[10px] font-extrabold text-[#007AFF] hover:bg-[#007AFF]/20"
                >
                  🎯 F.I.R.E. & Goals Guide
                </button>
                <button
                  onClick={resignJob}
                  title="Resign from corporate W-2 to break the Golden Handcuffs and go 100% independent!"
                  className="btn-press rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
                >
                  🔓 Break Golden Handcuffs (Quit W-2)
                </button>
              </div>
            </div>
          </div>

          {/* 3-Tab Segmented Switcher + Close */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-2xl bg-[var(--mist)] p-1">
              <button
                onClick={() => setActiveTab('hybrid')}
                className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'hybrid'
                    ? 'bg-white text-[var(--ink)] shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                <Building2 className="size-3.5 text-[#007AFF]" />
                <span>🏢 Hybrid & Shift Dispatch</span>
              </button>
              <button
                onClick={() => setActiveTab('explore')}
                className={`btn-press flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'explore'
                    ? 'bg-white text-[var(--ink)] shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                <Cpu className="size-3.5 text-purple-500" />
                <span>🔬 Exploration</span>
                <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[10px] font-black text-purple-600 dark:text-purple-300">
                  {projectProgress}%
                </span>
              </button>
              <button
                onClick={() => setActiveTab('tree')}
                className={`btn-press flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'tree'
                    ? 'bg-white text-[var(--ink)] shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                <Layers className="size-3.5 text-amber-500" />
                <span>🌳 Skill Tech Tree</span>
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-black text-amber-600 dark:text-amber-300">
                  {unlockedNodes.length}/{SKILL_TREE_NODES.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('ladder')}
                className={`btn-press flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === 'ladder'
                    ? 'bg-white text-[var(--ink)] shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                <TrendingUp className="size-3.5 text-emerald-500" />
                <span>📈 Career & Promo</span>
                {nextLevel && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      allPromoGatesReady
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {gatesPassedCount}/7
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-press grid size-9 place-items-center rounded-full bg-[var(--mist)] hover:bg-black/10 dark:hover:bg-white/15"
              title="Close Career Hub"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* =========================================================
            LIVE SHIFT BANNER (IF CURRENTLY WORKING)
        ========================================================= */}
        {workShift && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/25 bg-gradient-to-r from-emerald-500/15 via-[#007AFF]/10 to-purple-500/15 px-6 py-2.5">
            <div className="flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
              </span>
              <div>
                <div className="flex items-center gap-2 text-xs font-black">
                  <span>
                    LIVE SHIFT IN PROGRESS ({workShift.mode?.toUpperCase() || 'OFFICE'})
                  </span>
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] dark:bg-white/10">
                    {Math.round((workShift.elapsedMinutes / workShift.totalMinutes) * 100)}% Complete
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-[var(--ink-soft)]">
                  🔒 Map travel is locked while clocked into a live shift — finish shift or clock out early to travel.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {WORK_TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setWorkTone(t.id)}
                  className={`btn-press rounded-xl px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                    workShift.tone === t.id
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'bg-white/70 text-[var(--ink)] hover:bg-white dark:bg-white/10'
                  }`}
                  title={t.desc}
                >
                  {t.emoji} {t.label.split(' ')[0]}
                </button>
              ))}
              <button
                onClick={leaveWorkEarly}
                className="btn-press ml-1 rounded-xl bg-rose-500/15 px-3 py-1 text-[11px] font-extrabold text-rose-600 hover:bg-rose-500/25 dark:text-rose-400"
              >
                Leave Shift Early
              </button>
            </div>
          </div>
        )}

        {/* =========================================================
            SCROLLABLE BODY CONTENT
        ========================================================= */}
        <div className="scrollbar-none flex-1 overflow-y-auto p-6 space-y-6">
          {/* =======================================================
              TAB 1: HYBRID & SHIFT DISPATCH
          ======================================================= */}
          {activeTab === 'hybrid' && (
            <div className="space-y-6">
              {/* Top Row: Silicon Valley Corporate ID Badge + Hybrid Policy Week Tracker */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* LEFT: Custom SVG Silicon Valley Employee ID Badge Card (5 cols) */}
                <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-5 text-white shadow-xl lg:col-span-5 dark:border-white/15">
                  {/* Decorative Lanyard Slot & Holographic SVG Overlay */}
                  <svg
                    viewBox="0 0 400 220"
                    className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
                  >
                    <defs>
                      <linearGradient id="holoBadgeGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={career.accent} stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#AF52DE" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#34C759" stopOpacity="0.6" />
                      </linearGradient>
                      <pattern id="badgeGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path
                          d="M 20 0 L 0 0 0 20"
                          fill="none"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="0.7"
                        />
                      </pattern>
                    </defs>
                    <rect width="400" height="220" fill="url(#badgeGrid)" />
                    <circle cx="350" cy="40" r="95" fill="url(#holoBadgeGrad)" />
                    {/* Lanyard punch hole */}
                    <rect
                      x="170"
                      y="6"
                      width="60"
                      height="10"
                      rx="5"
                      fill="rgba(255,255,255,0.25)"
                    />
                  </svg>

                  <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                    {/* Top Corporate Header */}
                    <div className="flex items-center justify-between border-b border-white/15 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{career.emoji}</span>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                            SILICON VALLEY CORPORATE ID
                          </div>
                          <div className="text-sm font-black tracking-tight">{career.company}</div>
                        </div>
                      </div>
                      <span
                        className="rounded-xl px-3 py-1 text-sm font-black text-white shadow-md"
                        style={{ backgroundColor: career.accent }}
                      >
                        {currentLevel.code}
                      </span>
                    </div>

                    {/* Employee Portrait & Details */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Portrait
                          appearance={sim.appearance}
                          size={68}
                          ringColor={career.accent}
                          mood="happy"
                        />
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
                          FTE
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-black">{sim.name}</div>
                        <div className="truncate text-xs font-semibold text-white/75">
                          {currentLevel.title}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {/* Live Location Status Pill */}
                          {isAtCampus ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300 ring-1 ring-emerald-400/40">
                              📍 At Campus ({campusLoc?.shortName || 'HQ'})
                            </span>
                          ) : isAtHome ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/25 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-300 ring-1 ring-sky-400/40">
                              🏠 At Home ({homeDef.shortName || homeDef.area})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/25 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-300 ring-1 ring-purple-400/40">
                              🌍 At Venue ({currentVenue?.shortName || 'Bay Area'})
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              rtoCompliant
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/25 text-amber-300'
                            }`}
                          >
                            {rtoCompliant ? '🟢 RTO Compliant' : '⚠️ RTO Warning'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom NFC Barcode & QR SVG */}
                    <div className="flex items-center justify-between rounded-2xl bg-black/40 px-3.5 py-2.5 backdrop-blur-xs border border-white/10">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                          CLEARANCE · SHIFT HOURS
                        </div>
                        <div className="font-mono text-xs font-bold text-white/90">
                          {career.shiftStartHour}:00 AM – {career.shiftEndHour - 12}:00 PM ·{' '}
                          {formatCurrency(currentLevel.shiftPay)}/shift
                        </div>
                      </div>
                      {/* Custom SVG Barcode + QR Chip */}
                      <svg viewBox="0 0 110 28" className="h-7 w-28 shrink-0">
                        <g fill="rgba(255,255,255,0.85)">
                          <rect x="2" y="2" width="3" height="24" rx="1" />
                          <rect x="8" y="2" width="1.5" height="24" />
                          <rect x="12" y="2" width="4" height="24" rx="1" />
                          <rect x="19" y="2" width="2" height="24" />
                          <rect x="24" y="2" width="1.5" height="24" />
                          <rect x="28" y="2" width="5" height="24" rx="1" />
                          <rect x="36" y="2" width="2" height="24" />
                          <rect x="41" y="2" width="3" height="24" />
                          <rect x="47" y="2" width="1.5" height="24" />
                          <rect x="51" y="2" width="4" height="24" rx="1" />
                          <rect x="58" y="2" width="2" height="24" />
                          <rect x="63" y="2" width="3.5" height="24" />
                          <rect x="69" y="2" width="1.5" height="24" />
                          <rect x="73" y="2" width="3" height="24" />
                        </g>
                        {/* Mini QR Matrix */}
                        <g transform="translate(82, 2)" fill="#38BDF8">
                          <rect x="0" y="0" width="24" height="24" rx="4" fill="rgba(56,189,248,0.18)" />
                          <rect x="3" y="3" width="6" height="6" rx="1" />
                          <rect x="15" y="3" width="6" height="6" rx="1" />
                          <rect x="3" y="15" width="6" height="6" rx="1" />
                          <rect x="11" y="11" width="4" height="4" />
                          <rect x="16" y="16" width="5" height="5" />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Visual Hybrid Work Policy Tracker & 4-Stamp WFA Passport (7 cols) */}
                <div className="flex flex-col justify-between rounded-3xl border border-black/8 bg-white/65 p-5 shadow-xs lg:col-span-7 dark:border-white/10 dark:bg-white/5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#007AFF]">
                          SILICON VALLEY HYBRID WORK POLICY
                        </div>
                        <h3 className="text-base font-black tracking-tight">
                          3 Days In-Office Required · 2 Days Remote WFH OK · 4 WFA Days
                        </h3>
                      </div>
                      <button
                        onClick={toggleAutoWork}
                        className={`btn-press rounded-full px-3 py-1 text-xs font-extrabold transition-all ${
                          job.autoWork
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-[var(--mist)] text-[var(--ink-soft)]'
                        }`}
                      >
                        Auto-Commute: {job.autoWork ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* Interactive Mon-Fri 5-Day Hybrid Week Strip */}
                    <div className="mt-3.5 grid grid-cols-5 gap-2">
                      {WEEKDAY_LABELS.map((dayLabel, idx) => {
                        const att: WeekdayAttendance = weeklyAttendance[idx] || 'none';
                        const isToday = currentDayIdx === idx;
                        const badgeMeta =
                          att === 'office'
                            ? {
                                label: 'Office',
                                icon: '🏢',
                                bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
                                ring: '#10B981',
                              }
                            : att === 'wfh'
                            ? {
                                label: 'Remote WFH',
                                icon: '🏠',
                                bg: 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300',
                                ring: '#007AFF',
                              }
                            : att === 'wfa'
                            ? {
                                label: 'WFA Pass',
                                icon: '🌍',
                                bg: 'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300',
                                ring: '#AF52DE',
                              }
                            : att === 'missed'
                            ? {
                                label: 'Missed',
                                icon: '⚠️',
                                bg: 'bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-300',
                                ring: '#F43F5E',
                              }
                            : {
                                label: isToday ? 'Today' : 'Upcoming',
                                icon: '⚪',
                                bg: isToday
                                  ? 'bg-[#007AFF]/10 border-[#007AFF]/50 text-[#007AFF]'
                                  : 'bg-[var(--mist)] border-transparent text-[var(--ink-soft)]',
                                ring: '#94A3B8',
                              };

                        return (
                          <div
                            key={dayLabel}
                            className={`relative flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all ${badgeMeta.bg}`}
                          >
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider">
                              <span>{dayLabel}</span>
                              {isToday && (
                                <span className="size-1.5 rounded-full bg-[#007AFF]" />
                              )}
                            </div>

                            {/* Custom SVG Day Attendance Icon */}
                            <svg viewBox="0 0 36 36" className="my-1 size-8">
                              <circle
                                cx="18"
                                cy="18"
                                r="15"
                                fill="none"
                                stroke={badgeMeta.ring}
                                strokeWidth="2"
                                strokeDasharray={att === 'none' ? '3 3' : 'none'}
                                opacity={att === 'none' ? 0.5 : 0.9}
                              />
                              <text
                                x="18"
                                y="22"
                                textAnchor="middle"
                                fontSize="14"
                              >
                                {badgeMeta.icon}
                              </text>
                            </svg>

                            <div className="text-[10px] font-extrabold leading-tight">
                              {badgeMeta.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 3 Policy Quota Bars + 4-Stamp WFA Passport Graphic */}
                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      {/* 1. In-Office 3/3 */}
                      <div className="rounded-2xl bg-[var(--mist)] p-3">
                        <div className="flex items-center justify-between text-xs font-extrabold">
                          <span>🏢 In-Office</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {officeDays} / 3 Req
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, (officeDays / 3) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] font-semibold text-[var(--ink-soft)]">
                          +20% Promo Velocity on Campus
                        </div>
                      </div>

                      {/* 2. Remote WFH 2/2 */}
                      <div className="rounded-2xl bg-[var(--mist)] p-3">
                        <div className="flex items-center justify-between text-xs font-extrabold">
                          <span>🏠 Remote WFH</span>
                          <span className="text-[#007AFF]">{wfhDays} / 2 Weekly</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#007AFF] transition-all duration-300"
                            style={{ width: `${Math.min(100, (wfhDays / 2) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] font-semibold text-[var(--ink-soft)]">
                          Zero commute · Work from Home
                        </div>
                      </div>

                      {/* 3. Visual 4-Stamp WFA Passport */}
                      <div className="rounded-2xl bg-purple-500/10 border border-purple-500/25 p-3">
                        <div className="flex items-center justify-between text-xs font-extrabold">
                          <span>🌍 WFA Passport</span>
                          <span className="text-purple-600 dark:text-purple-300">
                            {wfaRemaining} / 4 Left
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-1">
                          {[0, 1, 2, 3].map((stampIdx) => {
                            const active = stampIdx < wfaRemaining;
                            return (
                              <div
                                key={stampIdx}
                                className={`flex h-6 flex-1 items-center justify-center rounded-lg border text-[11px] font-black transition-all ${
                                  active
                                    ? 'border-purple-500/50 bg-purple-500 text-white shadow-2xs'
                                    : 'border-black/10 bg-black/5 text-[var(--ink-soft)] opacity-45 dark:border-white/10 dark:bg-white/5'
                                }`}
                                title={active ? 'Available WFA Pass' : 'Used WFA Pass'}
                              >
                                {active ? '🌍' : '✓'}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-1 text-[10px] font-semibold text-[var(--ink-soft)]">
                          Work from any cafe, park or venue!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* =======================================================
                  3 VISUAL WORK MODE DISPATCH CARDS (WITH CUSTOM SVGs)
              ======================================================= */}
              <div>
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <div className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                    CHOOSE TODAY’S WORK DISPATCH MODE
                  </div>
                  <div className="text-xs font-semibold text-[var(--ink-soft)]">
                    Current Location:{' '}
                    <span className="font-bold text-[var(--ink)]">
                      {isAtCampus
                        ? `🏢 ${campusLoc?.name}`
                        : isAtHome
                        ? `🏠 ${homeDef.name}`
                        : `🌍 ${currentVenue?.name || locationId}`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* CARD 1: IN-OFFICE SHIFT */}
                  <div className="flex flex-col justify-between rounded-3xl border border-emerald-500/35 bg-gradient-to-b from-emerald-500/12 via-white/60 to-white/80 p-4 shadow-sm dark:via-zinc-900/60 dark:to-zinc-900/80">
                    <div>
                      {/* Custom SVG Illustration: Silicon Valley Campus */}
                      <div className="relative mb-3 h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-900 to-sky-900 p-3">
                        <svg viewBox="0 0 240 90" className="h-full w-full">
                          {/* Sun & Sky */}
                          <circle cx="205" cy="22" r="14" fill="#FBBF24" opacity="0.85" />
                          {/* Spaceship / Plex Campus Ring Building */}
                          <rect
                            x="28"
                            y="34"
                            width="130"
                            height="42"
                            rx="10"
                            fill="#F8FAFC"
                            opacity="0.95"
                          />
                          <rect x="38" y="42" width="22" height="14" rx="3" fill="#38BDF8" />
                          <rect x="66" y="42" width="22" height="14" rx="3" fill="#38BDF8" />
                          <rect x="94" y="42" width="22" height="14" rx="3" fill="#38BDF8" />
                          <rect x="122" y="42" width="26" height="14" rx="3" fill="#10B981" />
                          {/* Redwood / Courtyard Trees */}
                          <circle cx="18" cy="62" r="12" fill="#10B981" />
                          <circle cx="176" cy="58" r="14" fill="#059669" />
                          {/* G-Bus Shuttle */}
                          <rect x="185" y="54" width="42" height="20" rx="5" fill="#007AFF" />
                          <rect x="190" y="58" width="14" height="8" rx="1.5" fill="#E0F2FE" />
                          <rect x="208" y="58" width="14" height="8" rx="1.5" fill="#E0F2FE" />
                          <circle cx="195" cy="75" r="4" fill="#1E293B" />
                          <circle cx="217" cy="75" r="4" fill="#1E293B" />
                        </svg>
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow">
                          +20% PROMO VELOCITY
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black">🏢 In-Office Shift</h4>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          {officeDays}/3 This Week
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[var(--ink-soft)] leading-relaxed">
                        Commute to <strong>{campusLoc?.shortName || career.company}</strong>. Counts
                        toward your 3-day RTO requirement, boosts calibration speed by +20%, and
                        unlocks Skip-Level VP demos.
                      </p>
                    </div>

                    <button
                      disabled={!!workShift || !!travel}
                      onClick={handleCommuteAndWork}
                      className="btn-press mt-4 w-full rounded-2xl bg-emerald-600 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {workShift
                        ? '⚡ Shift Active'
                        : travel
                        ? '🚌 Commuting...'
                        : isAtCampus
                        ? '🏢 Badge In at Campus'
                        : '🚌 Commute to Campus & Badge In'}
                    </button>
                  </div>

                  {/* CARD 2: REMOTE WFH SHIFT */}
                  <div className="flex flex-col justify-between rounded-3xl border border-[#007AFF]/35 bg-gradient-to-b from-[#007AFF]/12 via-white/60 to-white/80 p-4 shadow-sm dark:via-zinc-900/60 dark:to-zinc-900/80">
                    <div>
                      {/* Custom SVG Illustration: Home Desk Studio */}
                      <div className="relative mb-3 h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-sky-950 p-3">
                        <svg viewBox="0 0 240 90" className="h-full w-full">
                          {/* Desk Surface */}
                          <rect x="20" y="68" width="200" height="8" rx="4" fill="#94A3B8" />
                          {/* Ultrawide Pro Display XDR */}
                          <rect
                            x="68"
                            y="18"
                            width="104"
                            height="42"
                            rx="5"
                            fill="#0F172A"
                            stroke="#38BDF8"
                            strokeWidth="2"
                          />
                          {/* Code Lines on Screen */}
                          <rect x="78" y="26" width="38" height="4" rx="2" fill="#38BDF8" />
                          <rect x="78" y="34" width="64" height="4" rx="2" fill="#A855F7" />
                          <rect x="78" y="42" width="52" height="4" rx="2" fill="#34D399" />
                          <rect x="114" y="60" width="12" height="8" fill="#64748B" />
                          {/* Artisanal Espresso Mug & Lamp */}
                          <rect x="184" y="52" width="14" height="16" rx="3" fill="#F97316" />
                          <path
                            d="M188,48 Q191,42 194,48"
                            stroke="#FDE68A"
                            strokeWidth="1.5"
                            fill="none"
                          />
                          <circle cx="42" cy="40" r="10" fill="#FACC15" opacity="0.35" />
                        </svg>
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-[#007AFF] px-2.5 py-0.5 text-[10px] font-black text-white shadow">
                          2 DAYS / WK ALLOWED
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black">🏠 Remote WFH Shift</h4>
                        <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                          {wfhDays}/2 Used
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[var(--ink-soft)] leading-relaxed">
                        Clock in from your <strong>{homeDef.shortName || 'Home'}</strong> desk rig
                        with zero commute time. Up to 2 WFH days per week are included in standard
                        hybrid policy.
                      </p>
                    </div>

                    <button
                      disabled={!!workShift || !!travel}
                      onClick={() => startWorkShift('wfh')}
                      className="btn-press mt-4 w-full rounded-2xl bg-[#007AFF] py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                    >
                      {workShift
                        ? '⚡ Shift Active'
                        : `🏠 Start Remote WFH (${wfhDays}/2 used)`}
                    </button>
                  </div>

                  {/* CARD 3: WORK FROM ANYWHERE (WFA) */}
                  <div className="flex flex-col justify-between rounded-3xl border border-purple-500/35 bg-gradient-to-b from-purple-500/12 via-white/60 to-white/80 p-4 shadow-sm dark:via-zinc-900/60 dark:to-zinc-900/80">
                    <div>
                      {/* Custom SVG Illustration: WFA Cafe / Dolores Park Nomad */}
                      <div className="relative mb-3 h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 via-fuchsia-950 to-amber-900 p-3">
                        <svg viewBox="0 0 240 90" className="h-full w-full">
                          {/* Golden Gate Bridge Silhouette in background */}
                          <path
                            d="M15,72 L225,72 M55,22 L55,72 M185,22 L185,72 M55,26 Q120,62 185,26"
                            stroke="#F43F5E"
                            strokeWidth="2.5"
                            fill="none"
                            opacity="0.55"
                          />
                          {/* Cafe Table + MacBook + Matcha Latte */}
                          <rect x="52" y="66" width="136" height="7" rx="3.5" fill="#D97706" />
                          <polygon points="85,66 135,66 128,40 78,40" fill="#E2E8F0" />
                          <circle cx="106" cy="53" r="3.5" fill="#94A3B8" />
                          {/* Matcha Glass */}
                          <rect x="148" y="46" width="14" height="20" rx="3" fill="#34D399" />
                          {/* Wi-Fi Nomad Waves */}
                          <path
                            d="M106,28 Q116,20 126,28 M102,22 Q116,11 130,22"
                            stroke="#C084FC"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow">
                          WORK FROM ANYWHERE
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black">🌍 Work From Anywhere (WFA)</h4>
                        <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-extrabold text-purple-600 dark:text-purple-300">
                          {wfaRemaining}/4 Passes Left
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[var(--ink-soft)] leading-relaxed">
                        Use a WFA Pass to work from <strong>Blue Bottle, Dolores Park, or any Bay Area venue</strong>{' '}
                        (or cover an extra remote day) while keeping full RTO compliance!
                      </p>
                    </div>

                    <button
                      disabled={!!workShift || !!travel || wfaRemaining <= 0}
                      onClick={() => startWorkShift('wfa')}
                      className="btn-press mt-4 w-full rounded-2xl bg-purple-600 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50"
                    >
                      {workShift
                        ? '⚡ Shift Active'
                        : wfaRemaining <= 0
                        ? 'No WFA Passes Left'
                        : `🌍 Use WFA Pass (${wfaRemaining}/4 left)`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Why Can't I Travel During a Shift + Policy Explainer Footer */}
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-black/8 bg-[var(--mist)] p-4 text-xs sm:grid-cols-3 dark:border-white/10">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">🔒</span>
                  <div>
                    <div className="font-extrabold">Why Travel Locks During Shifts</div>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
                      While clocked into a live shift, your Sim is actively bound to their station.
                      Travel BEFORE badging in, or use <strong>Leave Shift Early</strong> for
                      pro-rated pay.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-base">🏢</span>
                  <div>
                    <div className="font-extrabold">3/2 Hybrid Calibration Bonus</div>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
                      Logging 3 In-Office days per week keeps your{' '}
                      <strong>🟢 RTO Standing Compliant</strong> for promo committees and grants
                      +20% faster performance gain.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-base">🌍</span>
                  <div>
                    <div className="font-extrabold">4 WFA Nomad Passes</div>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
                      Want to code from Hayes Valley or Dolores Park? Spend 1 of your 4 WFA Passes
                      to clock a full shift right from any venue!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              TAB 2: WORK EXPLORATION & ENGINEERING CHARTERS
          ======================================================= */}
          {activeTab === 'explore' && (
            <div className="space-y-6">
              {/* ACTIVE ENGINEERING CHARTER HERO WITH CUSTOM ANIMATED SVG DIAGRAM */}
              <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
                <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
                  {/* Left Charter Info & Progress (7 cols) */}
                  <div className="space-y-3.5 lg:col-span-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white"
                        style={{ backgroundColor: activeProject.accent }}
                      >
                        {activeProject.codeName}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-300">
                        Deliverables Shipped: {deliverablesDone}
                        {nextLevel ? ` / ${reqDeliverables} needed for ${nextLevel.code}` : ''}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <span>{activeProject.emoji}</span>
                        <span>{activeProject.title}</span>
                      </h3>
                      <p className="mt-1 text-xs font-medium text-white/75 leading-relaxed">
                        {activeProject.desc}
                      </p>
                    </div>

                    {/* Deliverable Progress Bar */}
                    <div className="rounded-2xl bg-black/35 p-3.5 border border-white/10">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="text-sky-300">
                          📦 Deliverable: {activeProject.deliverableName}
                        </span>
                        <span className="font-mono text-sm font-black text-emerald-400">
                          {projectProgress}% / 100%
                        </span>
                      </div>
                      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#007AFF] via-purple-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${projectProgress}%` }}
                        />
                      </div>

                      {/* Deliverable Completion Rewards */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-white/85">
                        <span>🎁 Completion Payout:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                            +{formatCurrency(activeProject.rewardCash)} Cash
                          </span>
                          <span className="rounded-lg bg-purple-500/20 px-2 py-0.5 text-purple-300">
                            +{formatCurrency(activeProject.rewardRsu)} RSU
                          </span>
                          <span className="rounded-lg bg-sky-500/20 px-2 py-0.5 text-sky-300">
                            +{activeProject.promoPerfBoost}% Promo Calibration
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Custom Animated SVG System / AI Architecture Blueprint (5 cols) */}
                  <div className="lg:col-span-5">
                    <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-white/15 bg-black/45 p-3">
                      <div className="flex items-center justify-between text-[10px] font-mono text-sky-300/80">
                        <span>TELEMETRY // {activeProject.codeName}</span>
                        <span>ENERGY: {Math.round(needs.energy)}% ⚡</span>
                      </div>

                      <svg viewBox="0 0 320 140" className="mt-1 h-36 w-full">
                        <defs>
                          <linearGradient id="archPulse" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#38BDF8" />
                            <stop offset="50%" stopColor="#A855F7" />
                            <stop offset="100%" stopColor="#34D399" />
                          </linearGradient>
                        </defs>

                        {/* Connecting Architecture Mesh Lines */}
                        <g stroke="url(#archPulse)" strokeWidth="2" opacity="0.65">
                          <line x1="55" y1="40" x2="160" y2="30" strokeDasharray="4 2" />
                          <line x1="55" y1="95" x2="160" y2="30" />
                          <line x1="55" y1="40" x2="160" y2="105" />
                          <line x1="55" y1="95" x2="160" y2="105" strokeDasharray="4 2" />
                          <line x1="160" y1="30" x2="265" y2="68" />
                          <line x1="160" y1="105" x2="265" y2="68" />
                        </g>

                        {/* Left Ingest Nodes */}
                        <g>
                          <rect
                            x="16"
                            y="22"
                            width="78"
                            height="34"
                            rx="8"
                            fill="#0F172A"
                            stroke="#38BDF8"
                            strokeWidth="1.5"
                          />
                          <text x="55" y="37" textAnchor="middle" fill="#E0F2FE" fontSize="8" fontWeight="bold">
                            {activeProject.category === 'ai'
                              ? 'RLHF ROLLOUTS'
                              : activeProject.category === 'venture'
                              ? 'DEAL FLOW'
                              : 'INGEST SHARDS'}
                          </text>
                          <text x="55" y="49" textAnchor="middle" fill="#38BDF8" fontSize="7" fontFamily="monospace">
                            99.99% OK
                          </text>

                          <rect
                            x="16"
                            y="78"
                            width="78"
                            height="34"
                            rx="8"
                            fill="#0F172A"
                            stroke="#A855F7"
                            strokeWidth="1.5"
                          />
                          <text x="55" y="93" textAnchor="middle" fill="#F3E8FF" fontSize="8" fontWeight="bold">
                            {activeProject.category === 'ai'
                              ? 'CUDA FP4 KERNEL'
                              : activeProject.category === 'product'
                              ? '120HZ COMPOSITOR'
                              : 'PAXOS QUORUM'}
                          </text>
                          <text x="55" y="105" textAnchor="middle" fill="#C084FC" fontSize="7" fontFamily="monospace">
                            p99: 1.8ms
                          </text>
                        </g>

                        {/* Center Core Compute Nodes */}
                        <g>
                          <rect
                            x="118"
                            y="12"
                            width="84"
                            height="36"
                            rx="9"
                            fill="#1E1B4B"
                            stroke="#818CF8"
                            strokeWidth="1.5"
                          />
                          <text x="160" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">
                            CORE ENGINE
                          </text>
                          <text x="160" y="40" textAnchor="middle" fill="#A5B4FC" fontSize="7" fontFamily="monospace">
                            {projectProgress}% BUILT
                          </text>

                          <rect
                            x="118"
                            y="86"
                            width="84"
                            height="36"
                            rx="9"
                            fill="#1E1B4B"
                            stroke="#34D399"
                            strokeWidth="1.5"
                          />
                          <text x="160" y="102" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">
                            EVAL SUITE
                          </text>
                          <text x="160" y="114" textAnchor="middle" fill="#6EE7B7" fontSize="7" fontFamily="monospace">
                            PASSING ✓
                          </text>
                        </g>

                        {/* Right Deliverable Output Node */}
                        <g>
                          <circle
                            cx="265"
                            cy="68"
                            r="32"
                            fill="#064E3B"
                            stroke="#10B981"
                            strokeWidth="2.5"
                          />
                          <text x="265" y="64" textAnchor="middle" fill="#FFFFFF" fontSize="14">
                            {activeProject.emoji}
                          </text>
                          <text
                            x="265"
                            y="80"
                            textAnchor="middle"
                            fill="#6EE7B7"
                            fontSize="8"
                            fontWeight="bold"
                          >
                            {projectProgress}%
                          </text>
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* =======================================================
                  6 INTERACTIVE WORK EXPLORATION TASKS
              ======================================================= */}
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                      ⚡ HANDS-ON WORK EXPLORATION SPRINT ACTIONS
                    </div>
                    <p className="text-xs font-medium text-[var(--ink-soft)]">
                      Execute deep technical & product deliverables to ship your charter, build skill
                      XP, and earn Promo Committee sponsorship.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-400">
                    ⚡ Sim Energy: {Math.round(needs.energy)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {WORK_EXPLORATION_TASKS.map((task) => {
                    const skMeta = SKILLS_META.find((s) => s.key === task.skill);
                    const needsCampus = Boolean(task.requiresOffice && !isAtCampus);
                    const lowEnergy = needs.energy < task.energyCost + 4;

                    return (
                      <div
                        key={task.id}
                        className="flex flex-col justify-between rounded-3xl border border-black/8 bg-white/75 p-4 shadow-xs transition-all hover:border-[#007AFF]/40 dark:border-white/10 dark:bg-white/5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--mist)] text-xl">
                                {task.emoji}
                              </span>
                              <div>
                                <h4 className="text-xs font-black leading-snug">{task.title}</h4>
                                <span className="inline-block rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-600 dark:text-purple-300">
                                  +{task.projectProgressGain}% Charter · +{task.performanceGain}% Perf
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="mt-2.5 text-[11px] font-medium text-[var(--ink-soft)] leading-relaxed">
                            {task.subtitle}
                          </p>

                          {/* Cost & XP Pills */}
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                            <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                              -{task.energyCost} ⚡ Energy
                            </span>
                            <span className="rounded-lg bg-sky-500/15 px-2 py-0.5 text-sky-700 dark:text-sky-300">
                              {skMeta?.emoji} +{task.skillGain} {skMeta?.label.split(' ')[0]}
                            </span>
                            {task.requiresOffice && (
                              <span
                                className={`rounded-lg px-2 py-0.5 ${
                                  isAtCampus
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                🏢 Campus Only
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          disabled={needsCampus || lowEnergy}
                          onClick={() => doWorkExploration?.(task.id)}
                          className={`btn-press mt-3.5 w-full rounded-2xl py-2 text-xs font-extrabold transition-all ${
                            needsCampus
                              ? 'bg-[var(--mist)] text-[var(--ink-soft)] opacity-60'
                              : lowEnergy
                              ? 'bg-amber-500/20 text-amber-600 opacity-60'
                              : 'bg-[#007AFF] text-white shadow-xs hover:bg-blue-500'
                          }`}
                        >
                          {needsCampus
                            ? '🏢 Commute to Campus First'
                            : lowEnergy
                            ? `Need ${task.energyCost}⚡ Energy`
                            : `${task.emoji} Execute (${task.badgeLabel.split('·')[0].trim()})`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* =======================================================
                  PROJECT CHARTER SELECTOR GRID (WORK_PROJECTS)
              ======================================================= */}
              <div>
                <div className="mb-2.5 px-1 text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                  🗂️ SWITCH TECHNICAL CHARTER / EXPLORATION PROJECT
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {WORK_PROJECTS.map((proj) => {
                    const isSelected = activeProject.id === proj.id;
                    const isDone = completedProjects.includes(proj.id);
                    const isTrackMatch = proj.careerId === career.id;

                    return (
                      <button
                        key={proj.id}
                        onClick={() => selectWorkProject?.(proj.id)}
                        className={`btn-press flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                          isSelected
                            ? 'border-[#007AFF] bg-[#007AFF]/12 shadow-xs'
                            : 'border-black/8 bg-white/60 hover:bg-white dark:border-white/10 dark:bg-white/5'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xl">{proj.emoji}</span>
                            <div className="flex items-center gap-1">
                              {isTrackMatch && (
                                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[9px] font-black text-[#007AFF]">
                                  Track Charter
                                </span>
                              )}
                              {isDone && (
                                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                                  ✓ Shipped
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--ink-soft)]">
                            {proj.codeName}
                          </div>
                          <div className="text-xs font-extrabold leading-snug">{proj.title}</div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between border-t border-black/5 pt-2 text-[10px] font-bold dark:border-white/10">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(proj.rewardCash + proj.rewardRsu)}
                          </span>
                          <span className="text-purple-600 dark:text-purple-400">
                            +{proj.promoPerfBoost}% Promo
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              TAB 2.5: INTERACTIVE SKILL TECH TREE & DEEP-DIVE LAB
          ======================================================= */}
          {activeTab === 'tree' && (
            <div className="space-y-6">
              {/* Top Row: Interactive Zoomable SVG Tech Tree Blueprint + Node Lab Inspector */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* LEFT / FULL: Interactive Zoomable & Pannable SVG 4-Branch Skill Tech Tree Graph */}
                <div
                  className={`flex flex-col justify-between rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-indigo-950/95 to-slate-900 p-5 text-white shadow-xl transition-all ${
                    treeExpanded ? 'lg:col-span-12' : 'lg:col-span-8'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-0.5 text-[10px] font-black tracking-wider text-amber-300 uppercase">
                          🌳 SILICON VALLEY SPECIALIZATION DAG · INTERACTIVE BLUEPRINT
                        </span>
                        <h3 className="mt-1.5 text-lg font-black tracking-tight sm:text-xl">
                          Custom Skill Tech Tree & Career Offer Gates
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-300">
                          ⚡ {karma} Karma Available
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300">
                          {unlockedNodes.length}/{SKILL_TREE_NODES.length} Unlocked
                        </span>
                        <button
                          onClick={() => setTreeExpanded((v) => !v)}
                          className="btn-press inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black text-white hover:bg-white/20"
                          title="Toggle between Full-Width Blueprint and Split Inspector View"
                        >
                          {treeExpanded ? (
                            <>
                              <Minimize2 className="size-3.5 text-sky-300" />
                              <span>◫ Split View</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="size-3.5 text-sky-300" />
                              <span>⛶ Full Width</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs font-medium text-white/70">
                      Scroll or use the zoom controls to inspect close-up, drag to pan across the blueprint, or double-click any node to zoom right into it. Unlock specializations required for{' '}
                      <strong className="text-purple-300">OpenMind Frontier Lab</strong>,{' '}
                      <strong className="text-amber-300">Fruit Co. Cupertino</strong>, and{' '}
                      <strong className="text-emerald-300">Sand Hill Venture</strong> onsite loops.
                    </p>

                    {/* Interactive Camera & Zoom Control Bar */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-2">
                      {/* Left: Zoom Controls */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() =>
                            setTreeZoom((z) => Math.max(0.75, Number((z - 0.2).toFixed(2))))
                          }
                          className="btn-press inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-black text-white hover:bg-white/20"
                          title="Zoom Out"
                        >
                          <ZoomOut className="size-3.5" />
                          <span>-</span>
                        </button>

                        <input
                          type="range"
                          min={0.75}
                          max={2.4}
                          step={0.05}
                          value={treeZoom}
                          onChange={(e) => setTreeZoom( parseFloat(e.target.value) )}
                          className="h-1.5 w-24 cursor-pointer accent-sky-400 sm:w-28"
                          title="Zoom Level Slider"
                        />

                        <span className="min-w-[46px] text-center font-mono text-xs font-black text-sky-300">
                          {Math.round(treeZoom * 100)}%
                        </span>

                        <button
                          onClick={() =>
                            setTreeZoom((z) => Math.min(2.4, Number((z + 0.2).toFixed(2))))
                          }
                          className="btn-press inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-black text-white hover:bg-white/20"
                          title="Zoom In"
                        >
                          <ZoomIn className="size-3.5" />
                          <span>+</span>
                        </button>

                        <button
                          onClick={() => {
                            const bIdx = SKILL_TREE_BRANCHES.findIndex(
                              (b) => b.id === selectedNode.branch
                            );
                            const cx = 250 + (selectedNode.tier - 1) * 235;
                            const cy = 104 + bIdx * 126;
                            setTreeZoom(1.75);
                            setTreePan({ x: 1080 / 2 - cx, y: 560 / 2 - cy });
                          }}
                          className="btn-press inline-flex items-center gap-1 rounded-xl border border-sky-400/40 bg-sky-500/20 px-2.5 py-1 text-[11px] font-black text-sky-200 hover:bg-sky-500/30"
                          title="Zoom in 175% on currently selected node"
                        >
                          <span>🔍 Focus {selectedNode.codeName}</span>
                        </button>

                        <button
                          onClick={() => {
                            setTreeZoom(1.0);
                            setTreePan({ x: 0, y: 0 });
                          }}
                          className="btn-press inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white/80 hover:bg-white/15"
                          title="Reset Zoom & Pan to Fit Entire Tree"
                        >
                          <RotateCcw className="size-3" />
                          <span>Fit All</span>
                        </button>
                      </div>

                      {/* Right: 1-Click Branch Camera Focus Pills */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="mr-1 hidden items-center gap-1 text-[10px] font-bold text-white/50 xl:inline-flex">
                          <Move className="size-3" /> Jump Branch:
                        </span>
                        {SKILL_TREE_BRANCHES.map((b, bIdx) => {
                          const branchY = 104 + bIdx * 126;
                          return (
                            <button
                              key={b.id}
                              onClick={() => {
                                setTreeZoom(1.35);
                                setTreePan({ x: -35, y: 560 / 2 - branchY });
                              }}
                              className="btn-press rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-extrabold text-white/85 hover:border-white/25 hover:bg-white/15"
                            >
                              {b.emoji} {b.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive High-Resolution SVG Tech Tree Canvas */}
                    {(() => {
                      const baseW = 1080;
                      const baseH = 560;
                      const vbW = baseW / treeZoom;
                      const vbH = baseH / treeZoom;
                      const vbX = (baseW - vbW) / 2 - treePan.x;
                      const vbY = (baseH - vbH) / 2 - treePan.y;

                      return (
                        <div
                          className={`relative mt-3 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-inner select-none ${
                            isDraggingTree ? 'cursor-grabbing' : 'cursor-grab'
                          }`}
                          onWheel={(e) => {
                            e.preventDefault();
                            const delta = e.deltaY < 0 ? 0.14 : -0.14;
                            setTreeZoom((z) =>
                              Math.min(2.4, Math.max(0.75, Number((z + delta).toFixed(2))))
                            );
                          }}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            setIsDraggingTree(true);
                            setDragStart({ x: e.clientX - treePan.x, y: e.clientY - treePan.y });
                          }}
                          onMouseMove={(e) => {
                            if (!isDraggingTree) return;
                            setTreePan({
                              x: Math.max(-460, Math.min(460, e.clientX - dragStart.x)),
                              y: Math.max(-280, Math.min(280, e.clientY - dragStart.y)),
                            });
                          }}
                          onMouseUp={() => setIsDraggingTree(false)}
                          onMouseLeave={() => setIsDraggingTree(false)}
                        >
                          <svg
                            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                            className={`w-full transition-all duration-75 ${
                              treeExpanded ? 'h-[480px] sm:h-[560px]' : 'h-[420px] sm:h-[460px]'
                            }`}
                          >
                            <defs>
                              <pattern
                                id="treeGrid"
                                width="36"
                                height="36"
                                patternUnits="userSpaceOnUse"
                              >
                                <path
                                  d="M 36 0 L 0 0 0 36"
                                  fill="none"
                                  stroke="rgba(148,163,184,0.08)"
                                  strokeWidth="1"
                                />
                              </pattern>
                              <filter id="nodeGlow" x="-15%" y="-15%" width="130%" height="130%">
                                <feDropShadow
                                  dx="0"
                                  dy="4"
                                  stdDeviation="6"
                                  floodColor="#38BDF8"
                                  floodOpacity="0.35"
                                />
                              </filter>
                            </defs>
                            <rect
                              x="-400"
                              y="-300"
                              width="1880"
                              height="1160"
                              fill="url(#treeGrid)"
                            />

                            {/* Tier Column Headers & Vertical Guides */}
                            {[
                              { tier: 1, label: 'TIER 1 · FOUNDATION', sub: 'Core Stack Entry', x: 250 },
                              {
                                tier: 2,
                                label: 'TIER 2 · ONSITE OFFER GATE',
                                sub: 'Unlocks Selectivity Loops',
                                x: 485,
                              },
                              {
                                tier: 3,
                                label: 'TIER 3 · SENIOR / STAFF',
                                sub: 'L5–L6 Architecture',
                                x: 720,
                              },
                              {
                                tier: 4,
                                label: 'TIER 4 · APEX FELLOW',
                                sub: 'Distinguished / Partner',
                                x: 955,
                              },
                            ].map((col) => (
                              <g key={col.tier}>
                                <line
                                  x1={col.x}
                                  y1="44"
                                  x2={col.x}
                                  y2="540"
                                  stroke="rgba(148,163,184,0.08)"
                                  strokeWidth="1.5"
                                  strokeDasharray="6 6"
                                />
                                <rect
                                  x={col.x - 92}
                                  y="8"
                                  width="184"
                                  height="32"
                                  rx="9"
                                  fill="rgba(15,23,42,0.9)"
                                  stroke="rgba(148,163,184,0.2)"
                                  strokeWidth="1"
                                />
                                <text
                                  x={col.x}
                                  y="22"
                                  textAnchor="middle"
                                  fontSize="10.5"
                                  fontWeight="900"
                                  fill="#E2E8F0"
                                >
                                  {col.label}
                                </text>
                                <text
                                  x={col.x}
                                  y="34"
                                  textAnchor="middle"
                                  fontSize="8.5"
                                  fontWeight="700"
                                  fill="#94A3B8"
                                >
                                  {col.sub}
                                </text>
                              </g>
                            ))}

                            {/* Branch Row Headers (Left Column) */}
                            {SKILL_TREE_BRANCHES.map((b, bIdx) => {
                              const yCenter = 104 + bIdx * 126;
                              const branchNodes = SKILL_TREE_NODES.filter((n) => n.branch === b.id);
                              const branchUnlockedCount = branchNodes.filter((n) =>
                                unlockedNodes.includes(n.id)
                              ).length;

                              return (
                                <g
                                  key={b.id}
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTreeZoom(1.35);
                                    setTreePan({ x: -35, y: baseH / 2 - yCenter });
                                  }}
                                >
                                  {/* Horizontal Branch Lane Highlight */}
                                  <rect
                                    x="10"
                                    y={yCenter - 54}
                                    width="1055"
                                    height="108"
                                    rx="18"
                                    fill={`${b.accent}09`}
                                    stroke={`${b.accent}22`}
                                    strokeWidth="1"
                                  />
                                  <rect
                                    x="16"
                                    y={yCenter - 46}
                                    width="118"
                                    height="92"
                                    rx="14"
                                    fill="rgba(15,23,42,0.95)"
                                    stroke={b.accent}
                                    strokeWidth="1.8"
                                  />
                                  <text
                                    x="75"
                                    y={yCenter - 16}
                                    textAnchor="middle"
                                    fontSize="24"
                                  >
                                    {b.emoji}
                                  </text>
                                  <text
                                    x="75"
                                    y={yCenter + 6}
                                    textAnchor="middle"
                                    fontSize="11.5"
                                    fontWeight="900"
                                    fill="#FFFFFF"
                                  >
                                    {b.shortLabel}
                                  </text>
                                  <text
                                    x="75"
                                    y={yCenter + 22}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight="700"
                                    fill="#94A3B8"
                                  >
                                    {branchUnlockedCount}/{branchNodes.length} Active
                                  </text>
                                  <text
                                    x="75"
                                    y={yCenter + 36}
                                    textAnchor="middle"
                                    fontSize="8"
                                    fontWeight="800"
                                    fill={b.accent}
                                  >
                                    🔍 Click to Focus
                                  </text>
                                </g>
                              );
                            })}

                            {/* Edges between prereqNodes and child nodes */}
                            {SKILL_TREE_NODES.map((node) => {
                              const bIdx = SKILL_TREE_BRANCHES.findIndex(
                                (b) => b.id === node.branch
                              );
                              const x2 = 250 + (node.tier - 1) * 235;
                              const y2 = 104 + bIdx * 126;
                              const isUnlocked = unlockedNodes.includes(node.id);

                              return node.prereqNodes.map((prereqId) => {
                                const parent = SKILL_TREE_NODE_BY_ID[prereqId];
                                if (!parent) return null;
                                const pBranchIdx = SKILL_TREE_BRANCHES.findIndex(
                                  (b) => b.id === parent.branch
                                );
                                const x1 = 250 + (parent.tier - 1) * 235;
                                const y1 = 104 + pBranchIdx * 126;
                                const parentUnlocked = unlockedNodes.includes(prereqId);
                                const strokeColor = isUnlocked
                                  ? node.accent
                                  : parentUnlocked
                                    ? '#FBBF24'
                                    : 'rgba(148,163,184,0.32)';

                                const startX = x1 + 98;
                                const endX = x2 - 98;
                                const midX = (startX + endX) / 2;
                                const d = `M ${startX} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${endX} ${y2}`;

                                return (
                                  <g key={`${prereqId}->${node.id}`}>
                                    <path
                                      d={d}
                                      fill="none"
                                      stroke={strokeColor}
                                      strokeWidth={isUnlocked ? '3.5' : parentUnlocked ? '2.5' : '1.8'}
                                      strokeDasharray={
                                        isUnlocked ? undefined : parentUnlocked ? '7 4' : '4 4'
                                      }
                                    />
                                    <circle
                                      cx={endX - 2}
                                      cy={y2}
                                      r="4"
                                      fill={strokeColor}
                                    />
                                  </g>
                                );
                              });
                            })}

                            {/* Interactive High-Detail SVG Nodes (196 x 96 Cards) */}
                            {SKILL_TREE_NODES.map((node) => {
                              const bIdx = SKILL_TREE_BRANCHES.findIndex(
                                (b) => b.id === node.branch
                              );
                              const cx = 250 + (node.tier - 1) * 235;
                              const cy = 104 + bIdx * 126;
                              const isUnlocked = unlockedNodes.includes(node.id);
                              const prereqsOk = node.prereqNodes.every((pid) =>
                                unlockedNodes.includes(pid)
                              );
                              const skillsOk = node.requiredSkills.every(
                                (req) => Math.floor(skills[req.skill] ?? 0) >= req.level
                              );
                              const isReady =
                                !isUnlocked && prereqsOk && skillsOk && karma >= node.karmaCost;
                              const isSelected = selectedNode.id === node.id;

                              const boxStroke = isSelected
                                ? '#FFFFFF'
                                : isUnlocked
                                  ? node.accent
                                  : isReady
                                    ? '#FBBF24'
                                    : prereqsOk
                                      ? '#64748B'
                                      : '#334155';

                              const shortTitle =
                                node.title.length > 23
                                  ? `${node.title.slice(0, 22)}…`
                                  : node.title;
                              const gateOrPerkText = node.unlocksLevelLabel
                                ? `🔑 ${node.unlocksLevelLabel}`
                                : node.perkSummary;
                              const shortSub =
                                gateOrPerkText.length > 29
                                  ? `${gateOrPerkText.slice(0, 28)}…`
                                  : gateOrPerkText;

                              return (
                                <g
                                  key={node.id}
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNodeId(node.id);
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNodeId(node.id);
                                    setTreeZoom(1.75);
                                    setTreePan({ x: baseW / 2 - cx, y: baseH / 2 - cy });
                                  }}
                                >
                                  {isSelected && (
                                    <rect
                                      x={cx - 103}
                                      y={cy - 53}
                                      width="206"
                                      height="106"
                                      rx="18"
                                      fill="none"
                                      stroke={node.accent}
                                      strokeWidth="2.5"
                                      strokeDasharray="6 3"
                                      filter="url(#nodeGlow)"
                                    />
                                  )}
                                  <rect
                                    x={cx - 98}
                                    y={cy - 48}
                                    width="196"
                                    height="96"
                                    rx="14"
                                    fill={
                                      isUnlocked
                                        ? `${node.accent}30`
                                        : isReady
                                          ? 'rgba(245,158,11,0.20)'
                                          : 'rgba(15,23,42,0.95)'
                                    }
                                    stroke={boxStroke}
                                    strokeWidth={isSelected ? '2.8' : '1.8'}
                                  />

                                  {/* Top Row: Emoji + CodeName Pill + Status Badge */}
                                  <text x={cx - 78} y={cy - 23} fontSize="18" textAnchor="middle">
                                    {node.emoji}
                                  </text>
                                  <rect
                                    x={cx - 62}
                                    y={cy - 37}
                                    width="54"
                                    height="18"
                                    rx="5"
                                    fill={node.accent}
                                  />
                                  <text
                                    x={cx - 35}
                                    y={cy - 25}
                                    fontSize="9.5"
                                    fontWeight="900"
                                    fill="#FFFFFF"
                                    textAnchor="middle"
                                  >
                                    {node.codeName}
                                  </text>

                                  <text
                                    x={cx + 88}
                                    y={cy - 25}
                                    fontSize="9"
                                    fontWeight="900"
                                    fill={
                                      isUnlocked
                                        ? '#34D399'
                                        : isReady
                                          ? '#FBBF24'
                                          : node.unlocksCareerId
                                            ? '#C084FC'
                                            : '#94A3B8'
                                    }
                                    textAnchor="end"
                                  >
                                    {isUnlocked
                                      ? '✓ UNLOCKED'
                                      : isReady
                                        ? `⚡ READY (${node.karmaCost}⚡)`
                                        : node.unlocksCareerId
                                          ? '🔥 OFFER GATE'
                                          : `🔒 ${node.karmaCost}⚡`}
                                  </text>

                                  {/* Middle Row: Full Specialization Title & Gate/Perk Summary */}
                                  <text
                                    x={cx - 86}
                                    y={cy - 2}
                                    fontSize="12"
                                    fontWeight="900"
                                    fill={isUnlocked ? '#FFFFFF' : '#F1F5F9'}
                                  >
                                    {shortTitle}
                                  </text>
                                  <text
                                    x={cx - 86}
                                    y={cy + 14}
                                    fontSize="9.2"
                                    fontWeight="700"
                                    fill={node.unlocksLevelLabel ? '#E9D5FF' : '#94A3B8'}
                                  >
                                    {shortSub}
                                  </text>

                                  {/* Bottom Row: Required Skill Pills Inside Card */}
                                  {node.requiredSkills.map((req, rIdx) => {
                                    const skMeta = SKILLS_META.find((m) => m.key === req.skill);
                                    const curLv = Math.floor(skills[req.skill] ?? 0);
                                    const met = curLv >= req.level;
                                    const pillX = cx - 86 + rIdx * 88;
                                    const pillY = cy + 23;
                                    const shortSkLabel =
                                      skMeta?.label.split(' ')[0] || req.skill;

                                    return (
                                      <g key={req.skill}>
                                        <rect
                                          x={pillX}
                                          y={pillY}
                                          width="82"
                                          height="17"
                                          rx="5"
                                          fill={
                                            met
                                              ? 'rgba(16,185,129,0.22)'
                                              : 'rgba(148,163,184,0.14)'
                                          }
                                          stroke={
                                            met
                                              ? 'rgba(52,211,153,0.5)'
                                              : 'rgba(148,163,184,0.25)'
                                          }
                                          strokeWidth="1"
                                        />
                                        <text
                                          x={pillX + 41}
                                          y={pillY + 11.5}
                                          fontSize="8.5"
                                          fontWeight="800"
                                          fill={met ? '#6EE7B7' : '#CBD5E1'}
                                          textAnchor="middle"
                                        >
                                          {met ? '✓' : '🔒'} {shortSkLabel} Lv.{req.level}
                                        </text>
                                      </g>
                                    );
                                  })}
                                </g>
                              );
                            })}
                          </svg>

                          {/* Floating Overlay Hint Badge */}
                          <div className="pointer-events-none absolute bottom-2.5 right-3 rounded-full border border-white/10 bg-slate-900/85 px-2.5 py-1 text-[10px] font-bold text-white/70 backdrop-blur-xs">
                            🖱️ Drag to pan · Scroll to zoom · Double-click node to focus
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Quick Selected-Node Action Bar right below the SVG Blueprint */}
                  {(() => {
                    const isNodeUnlocked = unlockedNodes.includes(selectedNode.id);
                    const missingPrereqs = selectedNode.prereqNodes.filter(
                      (pid) => !unlockedNodes.includes(pid)
                    );
                    const skillsMet = selectedNode.requiredSkills.every(
                      (req) => Math.floor(skills[req.skill] ?? 0) >= req.level
                    );
                    const canUnlockNow =
                      !isNodeUnlocked &&
                      missingPrereqs.length === 0 &&
                      skillsMet &&
                      karma >= selectedNode.karmaCost;

                    return (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{selectedNode.emoji}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black text-white"
                                style={{ backgroundColor: selectedNode.accent }}
                              >
                                {selectedNode.codeName}
                              </span>
                              <span className="text-xs font-black text-white">
                                {selectedNode.title}
                              </span>
                              {selectedNode.unlocksLevelLabel && (
                                <span className="rounded-md bg-purple-500/25 px-2 py-0.5 text-[10px] font-black text-purple-200">
                                  🔑 {selectedNode.unlocksLevelLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-medium text-white/70">
                              {selectedNode.perkSummary}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => trainTechNodeSkill?.(selectedNode.id)}
                            className="btn-press rounded-xl border border-sky-400/40 bg-sky-500/20 px-3 py-1.5 text-xs font-black text-sky-200 hover:bg-sky-500/30"
                          >
                            🔬 Lab Study {selectedNode.codeName} (-16⚡ · +0.55 Skill)
                          </button>
                          {!isNodeUnlocked ? (
                            <button
                              onClick={() => unlockTechNode?.(selectedNode.id)}
                              className={`btn-press rounded-xl px-3.5 py-1.5 text-xs font-black text-white shadow-xs ${
                                canUnlockNow
                                  ? 'bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-95'
                                  : 'bg-white/15 text-white/80 hover:bg-white/25'
                              }`}
                            >
                              {canUnlockNow
                                ? `🔓 Unlock Now (${selectedNode.karmaCost}⚡)`
                                : `🔒 Unlock (${selectedNode.karmaCost}⚡ Karma)`}
                            </button>
                          ) : (
                            <span className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-300">
                              ✓ Unlocked in Stack
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* RIGHT / BOTTOM: Selected Node Blueprint & Deep-Dive Lab Inspector */}
                <div
                  className={`flex flex-col justify-between rounded-3xl border border-black/10 bg-white/80 p-5 shadow-xs dark:border-white/10 dark:bg-white/5 ${
                    treeExpanded ? 'lg:col-span-12' : 'lg:col-span-4'
                  }`}
                >
                  {(() => {
                    const isNodeUnlocked = unlockedNodes.includes(selectedNode.id);
                    const missingPrereqs = selectedNode.prereqNodes.filter(
                      (pid) => !unlockedNodes.includes(pid)
                    );
                    const skillsMet = selectedNode.requiredSkills.every(
                      (req) => Math.floor(skills[req.skill] ?? 0) >= req.level
                    );
                    const canUnlockNow =
                      !isNodeUnlocked &&
                      missingPrereqs.length === 0 &&
                      skillsMet &&
                      karma >= selectedNode.karmaCost;
                    const branchMeta = SKILL_TREE_BRANCHES.find(
                      (b) => b.id === selectedNode.branch
                    );

                    return (
                      <>
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="grid size-12 place-items-center rounded-2xl text-2xl shadow-xs"
                                style={{
                                  backgroundColor: `${selectedNode.accent}20`,
                                  border: `1px solid ${selectedNode.accent}50`,
                                }}
                              >
                                {selectedNode.emoji}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="rounded-md px-2 py-0.5 font-mono text-[10px] font-black text-white"
                                    style={{ backgroundColor: selectedNode.accent }}
                                  >
                                    {selectedNode.codeName}
                                  </span>
                                  <span className="text-[10px] font-extrabold text-[var(--ink-soft)] uppercase">
                                    Tier {selectedNode.tier} · {branchMeta?.shortLabel}
                                  </span>
                                </div>
                                <h4 className="mt-0.5 text-base font-black leading-snug">
                                  {selectedNode.title}
                                </h4>
                              </div>
                            </div>
                            {isNodeUnlocked ? (
                              <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                ✓ Unlocked
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-black text-amber-600 dark:text-amber-300">
                                {selectedNode.karmaCost} ⚡ Karma
                              </span>
                            )}
                          </div>

                          <p className="mt-2.5 text-xs font-medium leading-relaxed text-[var(--ink-soft)]">
                            {selectedNode.desc}
                          </p>

                          {/* Passive Bonus & Career Gate Callout */}
                          <div className="mt-3 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-3">
                            <div className="text-[10px] font-black tracking-wider text-indigo-600 uppercase dark:text-indigo-300">
                              ✨ SPECIALIZATION PERK & CAREER UNLOCK
                            </div>
                            <div className="mt-0.5 text-xs font-extrabold text-[var(--ink)]">
                              {selectedNode.perkSummary}
                            </div>
                            {selectedNode.unlocksLevelLabel && (
                              <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-black text-purple-600 dark:bg-black/40 dark:text-purple-300">
                                <span>🔑 Gate:</span>
                                <span>{selectedNode.unlocksLevelLabel}</span>
                              </div>
                            )}
                          </div>

                          {/* Prerequisite Nodes */}
                          <div className="mt-3 space-y-2">
                            <div className="text-[10px] font-black tracking-wider text-[var(--ink-soft)] uppercase">
                              1. PREREQUISITE TECH TREE NODES
                            </div>
                            {selectedNode.prereqNodes.length === 0 ? (
                              <div className="rounded-xl bg-emerald-500/12 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                ✓ Root Foundation Node (No prior node required)
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedNode.prereqNodes.map((pid) => {
                                  const pNode = SKILL_TREE_NODE_BY_ID[pid];
                                  const pDone = unlockedNodes.includes(pid);
                                  return (
                                    <button
                                      key={pid}
                                      onClick={() => setSelectedNodeId(pid)}
                                      className={`btn-press flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold ${
                                        pDone
                                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                          : 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                      }`}
                                    >
                                      <span>{pDone ? '✓' : '🔒'}</span>
                                      <span>
                                        {pNode?.emoji} {pNode?.title || pid}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Required Core Skills */}
                          <div className="mt-3 space-y-2">
                            <div className="text-[10px] font-black tracking-wider text-[var(--ink-soft)] uppercase">
                              2. REQUIRED CORE SKILL BARS
                            </div>
                            <div className="space-y-1.5">
                              {selectedNode.requiredSkills.map((req) => {
                                const skMeta = SKILLS_META.find((m) => m.key === req.skill);
                                const rawVal = skills[req.skill] ?? 0;
                                const curFloor = Math.floor(rawVal);
                                const met = curFloor >= req.level;
                                const pct = Math.min(100, Math.round((rawVal / req.level) * 100));

                                return (
                                  <div
                                    key={req.skill}
                                    className="rounded-xl bg-[var(--mist)] p-2.5"
                                  >
                                    <div className="flex items-center justify-between text-xs font-bold">
                                      <span>
                                        {skMeta?.emoji} {skMeta?.label || req.skill}
                                      </span>
                                      <span
                                        className={
                                          met
                                            ? 'font-black text-emerald-600 dark:text-emerald-400'
                                            : 'font-black text-amber-600 dark:text-amber-400'
                                        }
                                      >
                                        {met ? '✓ ' : ''}Lv.{rawVal.toFixed(1)} / Lv.{req.level}
                                      </span>
                                    </div>
                                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                          width: `${pct}%`,
                                          backgroundColor: met
                                            ? '#10B981'
                                            : skMeta?.color || '#007AFF',
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons: Unlock Specialization OR Run Deep-Dive Lab Study */}
                        <div className="mt-4 space-y-2 border-t border-black/10 pt-3.5 dark:border-white/10">
                          {isNodeUnlocked ? (
                            <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 py-3 text-xs font-black text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="size-4" />
                              <span>Specialization Active in Your Engineering Stack</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => unlockTechNode?.(selectedNode.id)}
                              className={`btn-press flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-black text-white shadow-md transition-all ${
                                canUnlockNow
                                  ? 'bg-gradient-to-r from-emerald-500 via-[#007AFF] to-purple-600 hover:opacity-95'
                                  : 'bg-slate-600/80 hover:bg-slate-600'
                              }`}
                            >
                              <Sparkles className="size-4" />
                              <span>
                                {canUnlockNow
                                  ? `🔓 Unlock ${selectedNode.codeName} Now (${selectedNode.karmaCost} ⚡ Karma)`
                                  : `🔒 Unlock ${selectedNode.codeName} (${selectedNode.karmaCost} ⚡ Karma)`}
                              </span>
                            </button>
                          )}

                          <button
                            onClick={() => trainTechNodeSkill?.(selectedNode.id)}
                            className="btn-press flex w-full items-center justify-between rounded-2xl border border-[#007AFF]/40 bg-[#007AFF]/12 px-3.5 py-2.5 text-xs font-extrabold text-[#007AFF] hover:bg-[#007AFF]/20 dark:text-sky-300"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>🔬 Deep-Dive Lab Study ({selectedNode.codeName})</span>
                            </span>
                            <span className="rounded-lg bg-[#007AFF] px-2 py-0.5 text-[10px] font-black text-white">
                              -16⚡ Energy · +0.55 Skill & +6⚡
                            </span>
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom Section: 4-Branch Full Tech Tree Matrix */}
              <div>
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <div className="text-xs font-black tracking-wider text-[var(--ink-soft)] uppercase">
                    🧭 ALL 4 SPECIALIZATION BRANCHES · CLICK ANY NODE TO INSPECT OR TRAIN
                  </div>
                  <div className="text-xs font-bold text-[var(--ink-soft)]">
                    Energy: <strong className="text-amber-500">{Math.round(needs.energy)}%</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {SKILL_TREE_BRANCHES.map((branch) => {
                    const branchNodes = SKILL_TREE_NODES.filter((n) => n.branch === branch.id);
                    const unlockedInBranch = branchNodes.filter((n) =>
                      unlockedNodes.includes(n.id)
                    ).length;

                    return (
                      <div
                        key={branch.id}
                        className="flex flex-col justify-between rounded-3xl border border-black/10 bg-white/70 p-4 shadow-xs dark:border-white/10 dark:bg-white/5"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{branch.emoji}</span>
                            <span
                              className="rounded-full px-2.5 py-0.5 text-[10px] font-black text-white"
                              style={{ backgroundColor: branch.accent }}
                            >
                              {unlockedInBranch}/{branchNodes.length} Tier
                            </span>
                          </div>
                          <h4 className="mt-1.5 text-sm font-black">{branch.label}</h4>
                          <div className="text-[10px] font-extrabold text-[var(--ink-soft)]">
                            Target: {branch.companyTarget}
                          </div>

                          <div className="mt-3 space-y-2">
                            {branchNodes.map((node) => {
                              const unlocked = unlockedNodes.includes(node.id);
                              const prereqsOk = node.prereqNodes.every((pid) =>
                                unlockedNodes.includes(pid)
                              );
                              const skillsOk = node.requiredSkills.every(
                                (req) => Math.floor(skills[req.skill] ?? 0) >= req.level
                              );
                              const ready =
                                !unlocked && prereqsOk && skillsOk && karma >= node.karmaCost;
                              const isSel = selectedNode.id === node.id;

                              return (
                                <div
                                  key={node.id}
                                  onClick={() => setSelectedNodeId(node.id)}
                                  className={`cursor-pointer rounded-2xl border p-2.5 transition-all ${
                                    isSel
                                      ? 'border-[#007AFF] bg-[#007AFF]/12 ring-1 ring-[#007AFF]/40'
                                      : unlocked
                                        ? 'border-emerald-500/35 bg-emerald-500/10'
                                        : ready
                                          ? 'border-amber-500/45 bg-amber-500/10'
                                          : 'border-black/8 bg-[var(--mist)] dark:border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] font-black">
                                      {node.emoji} T{node.tier}: {node.title}
                                    </span>
                                    <span className="shrink-0 text-[10px] font-black">
                                      {unlocked ? '✓' : ready ? '⚡' : '🔒'}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-[var(--ink-soft)]">
                                    <span>{node.unlocksLevelLabel || node.codeName}</span>
                                    {!unlocked && <span>{node.karmaCost} ⚡</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              TAB 3: CAREER TRACK & PROMO COMMITTEE
          ======================================================= */}
          {activeTab === 'ladder' && (
            <div className="space-y-6">
              {/* Top Row: Multi-Gate Promo Packet Checklist + Visual SVG Compensation Curve */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* LEFT: "Why Promo Isn't Easy" Multi-Gate Promo Packet Checklist (6 cols) */}
                <div className="flex flex-col justify-between rounded-3xl border border-black/10 bg-white/75 p-5 shadow-xs lg:col-span-6 dark:border-white/10 dark:bg-white/5">
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          SILICON VALLEY PROMO COMMITTEE DOSSIER
                        </div>
                        <h3 className="text-base font-black tracking-tight">
                          {nextLevel
                            ? `Next Level Target: ${nextLevel.code} · ${nextLevel.title}`
                            : `👑 Max Level Achieved (${currentLevel.code})`}
                        </h3>
                      </div>
                      {nextLevel && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            allPromoGatesReady
                              ? 'bg-emerald-500 text-white'
                              : 'bg-[var(--mist)] text-[var(--ink)]'
                          }`}
                        >
                          {gatesPassedCount} / 7 Gates Met
                        </span>
                      )}
                    </div>

                    {nextLevel ? (
                      <div className="mt-4 space-y-2.5">
                        {/* Gate 1: Calibration Performance */}
                        <div className="rounded-2xl bg-[var(--mist)] p-3">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              {gatePerfPass ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="size-4 text-amber-500" />
                              )}
                              <span>1. Calibration Performance</span>
                            </span>
                            <span
                              className={
                                gatePerfPass
                                  ? 'font-black text-emerald-600 dark:text-emerald-400'
                                  : 'font-black text-[#007AFF]'
                              }
                            >
                              {Math.round(job.performance)}% / {reqPerfGate}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#007AFF] to-emerald-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, (job.performance / reqPerfGate) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Gate 2: Level Tenure (Shifts) */}
                        <div className="rounded-2xl bg-[var(--mist)] p-3">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              {gateTenurePass ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="size-4 text-amber-500" />
                              )}
                              <span>2. Level Tenure (Shifts at {currentLevel.code})</span>
                            </span>
                            <span
                              className={
                                gateTenurePass
                                  ? 'font-black text-emerald-600 dark:text-emerald-400'
                                  : 'font-black text-amber-600 dark:text-amber-400'
                              }
                            >
                              {shiftsAtLevel} / {reqShifts} shifts
                            </span>
                          </div>
                        </div>

                        {/* Gate 3: Primary Technical Bar */}
                        <div className="rounded-2xl bg-[var(--mist)] p-3">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              {gatePrimaryPass ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="size-4 text-amber-500" />
                              )}
                              <span>
                                3. Primary Bar ({primarySkillMeta?.emoji} {primarySkillMeta?.label})
                              </span>
                            </span>
                            <span
                              className={
                                gatePrimaryPass
                                  ? 'font-black text-emerald-600 dark:text-emerald-400'
                                  : 'font-black text-amber-600 dark:text-amber-400'
                              }
                            >
                              Lv.{primarySkillCur} / Lv.{primarySkillReq}
                            </span>
                          </div>
                        </div>

                        {/* Gate 4: Secondary Technical / Leadership Bar */}
                        <div className="rounded-2xl bg-[var(--mist)] p-3">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              {gateSecondaryPass ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="size-4 text-amber-500" />
                              )}
                              <span>
                                4. Secondary Bar{' '}
                                {secondarySkillMeta
                                  ? `(${secondarySkillMeta.emoji} ${secondarySkillMeta.label})`
                                  : '(Scope Alignment)'}
                              </span>
                            </span>
                            <span
                              className={
                                gateSecondaryPass
                                  ? 'font-black text-emerald-600 dark:text-emerald-400'
                                  : 'font-black text-amber-600 dark:text-amber-400'
                              }
                            >
                              {secondarySkillMeta
                                ? `Lv.${secondarySkillCur} / Lv.${secondarySkillReq}`
                                : 'Passed ✓'}
                            </span>
                          </div>
                        </div>

                        {/* Gate 5: Required Skill Tech Tree Specialization */}
                        <div className="rounded-2xl bg-[var(--mist)] p-3">
                          <div className="flex items-center justify-between gap-2 text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              {gateTechNodePass ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="size-4 text-amber-500" />
                              )}
                              <span>
                                5. Tech Tree Specialization{' '}
                                {reqTechNodeDef
                                  ? `(${reqTechNodeDef.emoji} ${reqTechNodeDef.title})`
                                  : '(Core Stack)'}
                              </span>
                            </span>
                            {gateTechNodePass ? (
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                Unlocked ✓
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (reqTechNodeId) setSelectedNodeId(reqTechNodeId);
                                  setActiveTab('tree');
                                }}
                                className="btn-press rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-700 hover:bg-amber-500/30 dark:text-amber-300"
                              >
                                🔒 Open Tech Tree →
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Gate 6: Shipped Deliverables (Work Exploration) */}
                        <div className="rounded-2xl bg-[var(--mist)] p-3">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              {gateDeliverablesPass ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="size-4 text-amber-500" />
                              )}
                              <span>6. Shipped Deliverables (Work Exploration)</span>
                            </span>
                            <span
                              className={
                                gateDeliverablesPass
                                  ? 'font-black text-emerald-600 dark:text-emerald-400'
                                  : 'font-black text-purple-600 dark:text-purple-400'
                              }
                            >
                              {deliverablesDone} / {reqDeliverables} deliverables
                            </span>
                          </div>
                        </div>

                        {/* Gate 7: Hybrid RTO Standing */}
                        <div className="rounded-2xl bg-[var(--mist)] p-3">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              {gateRtoPass ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="size-4 text-amber-500" />
                              )}
                              <span>7. Hybrid RTO Standing</span>
                            </span>
                            <span
                              className={
                                gateRtoPass
                                  ? 'font-black text-emerald-600 dark:text-emerald-400'
                                  : 'font-black text-rose-600 dark:text-rose-400'
                              }
                            >
                              {rtoCompliant ? '🟢 Compliant' : '⚠️ Needs 3/3 Office Days'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-emerald-500/15 p-4 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        👑 You have reached the pinnacle of the {career.company} technical ladder (
                        {currentLevel.code} · {currentLevel.title}) earning{' '}
                        {formatCurrency(currentLevel.baseSalary + currentLevel.rsuAnnual)}/yr!
                      </div>
                    )}
                  </div>

                  {/* Submit Promo Packet Button */}
                  {nextLevel && (
                    <button
                      onClick={() => submitPromoPacket?.()}
                      className={`btn-press mt-4 w-full rounded-2xl py-3 text-xs font-black tracking-wide text-white shadow-md transition-all ${
                        allPromoGatesReady
                          ? 'bg-gradient-to-r from-emerald-500 via-[#007AFF] to-purple-600 hover:opacity-95'
                          : 'bg-[#007AFF] hover:bg-blue-600'
                      }`}
                    >
                      📋 Submit Promo Packet to Committee ({nextLevel.code} ·{' '}
                      {formatCurrency(nextLevel.baseSalary + nextLevel.rsuAnnual)}/yr)
                    </button>
                  )}
                </div>

                {/* RIGHT: Interactive 6-Level SVG Career Track & Total Comp Curve (6 cols) */}
                <div className="flex flex-col justify-between rounded-3xl border border-black/10 bg-white/75 p-5 shadow-xs lg:col-span-6 dark:border-white/10 dark:bg-white/5">
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          LEVELS.FYI VERIFIED COMPENSATION CURVE
                        </div>
                        <h3 className="text-base font-black tracking-tight">
                          {career.levels[0].code} → {career.levels[career.levels.length - 1].code}{' '}
                          Total Comp (Base + RSU)
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-[var(--ink-soft)]">
                        Click level to inspect
                      </span>
                    </div>

                    {/* Interactive SVG Bar & Curve Graphic */}
                    <div className="mt-3 rounded-2xl bg-slate-950 p-4 text-white">
                      <svg viewBox="0 0 360 155" className="h-40 w-full overflow-visible">
                        {career.levels.map((lvl, idx) => {
                          const maxTc =
                            career.levels[career.levels.length - 1].baseSalary +
                            career.levels[career.levels.length - 1].rsuAnnual;
                          const totalTc = lvl.baseSalary + lvl.rsuAnnual;
                          const barHeight = Math.max(18, Math.round((totalTc / maxTc) * 95));
                          const baseHeight = Math.round((lvl.baseSalary / totalTc) * barHeight);
                          const rsuHeight = barHeight - baseHeight;
                          const x = 18 + idx * 56;
                          const yTop = 122 - barHeight;
                          const isCurrent = idx === job.levelIndex;
                          const isInspected = idx === inspectedLevelIdx;

                          return (
                            <g
                              key={lvl.code}
                              className="cursor-pointer"
                              onClick={() => setSelectedLevelIdx(idx)}
                            >
                              {/* Highlight Pillar if current or inspected */}
                              {(isCurrent || isInspected) && (
                                <rect
                                  x={x - 6}
                                  y="12"
                                  width="44"
                                  height="132"
                                  rx="8"
                                  fill={isCurrent ? 'rgba(16,185,129,0.16)' : 'rgba(56,189,248,0.14)'}
                                  stroke={isCurrent ? '#10B981' : '#38BDF8'}
                                  strokeWidth="1"
                                />
                              )}

                              {/* RSU Top Stack */}
                              <rect
                                x={x}
                                y={yTop}
                                width="32"
                                height={rsuHeight}
                                rx="4"
                                fill="#A855F7"
                              />
                              {/* Base Salary Bottom Stack */}
                              <rect
                                x={x}
                                y={yTop + rsuHeight}
                                width="32"
                                height={baseHeight}
                                rx="4"
                                fill="#007AFF"
                              />

                              {/* TC Label Above Bar */}
                              <text
                                x={x + 16}
                                y={yTop - 6}
                                textAnchor="middle"
                                fontSize="8.5"
                                fontWeight="bold"
                                fill={isCurrent ? '#34D399' : '#E2E8F0'}
                              >
                                ${Math.round(totalTc / 1000)}k
                              </text>

                              {/* Level Code Below Bar */}
                              <text
                                x={x + 16}
                                y="138"
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="bold"
                                fill={isCurrent ? '#34D399' : '#94A3B8'}
                              >
                                {lvl.code}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] font-bold text-white/70">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="size-2.5 rounded-xs bg-[#007AFF]" /> Base Salary
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="size-2.5 rounded-xs bg-purple-500" /> Annual RSU Grant
                          </span>
                        </div>
                        <span className="text-emerald-400">
                          Current: {currentLevel.code} (
                          {formatCurrency(currentLevel.baseSalary + currentLevel.rsuAnnual)})
                        </span>
                      </div>
                    </div>

                    {/* Inspected Level Scope & Details Card */}
                    <div className="mt-3.5 rounded-2xl border border-black/8 bg-[var(--mist)] p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-[#007AFF] px-2.5 py-0.5 text-xs font-black text-white">
                            {inspectedLevel.code}
                          </span>
                          <span className="text-xs font-black">{inspectedLevel.title}</span>
                        </div>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(inspectedLevel.baseSalary + inspectedLevel.rsuAnnual)}/yr
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-[var(--ink-soft)]">
                        {inspectedLevel.scopeSummary ||
                          'Own critical engineering systems, pass calibration, and mentor peers.'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold">
                        <span className="rounded-md bg-white/80 px-2 py-0.5 dark:bg-black/30">
                          Base: {formatCurrency(inspectedLevel.baseSalary)}
                        </span>
                        <span className="rounded-md bg-white/80 px-2 py-0.5 dark:bg-black/30">
                          RSU: {formatCurrency(inspectedLevel.rsuAnnual)}/yr
                        </span>
                        <span className="rounded-md bg-white/80 px-2 py-0.5 dark:bg-black/30">
                          Shift: +{formatCurrency(inspectedLevel.shiftPay)} cash / +
                          {formatCurrency(inspectedLevel.rsuPerShift)} RSU
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* =======================================================
                  COMPANY TRACK EXPLORER & ONSITE INTERVIEW LOOP GATES
              ======================================================= */}
              <div>
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="text-xs font-black uppercase tracking-wider text-[var(--ink-soft)]">
                    🌉 BAY AREA ONSITE INTERVIEW LOOPS · CUSTOM TECH TREE & SKILL GATES
                  </div>
                  <button
                    onClick={() => setActiveTab('tree')}
                    className="btn-press rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-black text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
                  >
                    🌳 Open Skill Tech Tree ({unlockedNodes.length}/{SKILL_TREE_NODES.length}) →
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {CAREERS.map((c) => {
                    const isCurrent = c.id === career.id;
                    const entry = c.levels[0];
                    const top = c.levels[c.levels.length - 1];
                    const cLoc = LOCATION_BY_ID[c.locationId];
                    const entryReq = c.entryRequirements;

                    const reqNodes = entryReq?.requiredTechNodes ?? [];
                    const missingNodes = reqNodes.filter((nid) => !unlockedNodes.includes(nid));
                    const reqSkills = entryReq?.requiredSkills ?? [];
                    const missingSkills = reqSkills.filter(
                      (r) => Math.floor(skills[r.skill] ?? 0) < r.level
                    );
                    const minDeliv = entryReq?.minDeliverables ?? 0;
                    const delivOk = deliverablesDone >= minDeliv;
                    const allGatesMet =
                      missingNodes.length === 0 && missingSkills.length === 0 && delivOk;

                    return (
                      <div
                        key={c.id}
                        className={`flex flex-col justify-between rounded-3xl border p-4 transition-all ${
                          isCurrent
                            ? 'border-[#007AFF] bg-[#007AFF]/10 shadow-xs'
                            : allGatesMet
                              ? 'border-emerald-500/35 bg-white/75 dark:bg-white/5'
                              : 'border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{c.emoji}</span>
                            <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-[10px] font-black dark:bg-white/10">
                              {entry.code} → {top.code}
                            </span>
                          </div>

                          {entryReq && (
                            <div
                              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-black ${
                                entryReq.difficultyTier === 'Ultra-Selective'
                                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                                  : entryReq.difficultyTier === 'Selective'
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {entryReq.selectivityLabel}
                            </div>
                          )}

                          <h4 className="mt-1.5 text-sm font-black">{c.company}</h4>
                          <div className="text-[11px] font-bold text-[var(--ink-soft)]">
                            {c.name}
                          </div>
                          <div className="mt-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(entry.baseSalary + entry.rsuAnnual)} →{' '}
                            {formatCurrency(top.baseSalary + top.rsuAnnual)}
                          </div>
                          <div className="mt-0.5 text-[10px] font-semibold text-[var(--ink-soft)]">
                            📍 {cLoc?.shortName || c.district} · {c.shiftStartHour}:00–
                            {c.shiftEndHour - 12}:00
                          </div>

                          {/* Custom Tech Tree & Core Skill Gate Checklist */}
                          {entryReq && (
                            <div className="mt-3 space-y-1.5 border-t border-black/8 pt-2.5 dark:border-white/10">
                              <div className="text-[9.5px] font-black tracking-wider text-[var(--ink-soft)] uppercase">
                                Required Tech Tree & Skills:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {reqNodes.map((nid) => {
                                  const nDef = SKILL_TREE_NODE_BY_ID[nid];
                                  const hasN = unlockedNodes.includes(nid);
                                  return (
                                    <button
                                      key={nid}
                                      onClick={() => {
                                        setSelectedNodeId(nid);
                                        setActiveTab('tree');
                                      }}
                                      className={`btn-press rounded-lg px-2 py-0.5 text-[9.5px] font-extrabold ${
                                        hasN
                                          ? 'bg-emerald-500/18 text-emerald-700 dark:text-emerald-300'
                                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                      }`}
                                      title="Click to inspect in Skill Tech Tree"
                                    >
                                      {hasN ? '✓' : '🔒'} {nDef?.codeName || nid}:{' '}
                                      {nDef?.title.split(' ')[0]}
                                    </button>
                                  );
                                })}
                                {reqSkills.map((r) => {
                                  const sMeta = SKILLS_META.find((m) => m.key === r.skill);
                                  const hasS = Math.floor(skills[r.skill] ?? 0) >= r.level;
                                  return (
                                    <span
                                      key={r.skill}
                                      className={`rounded-lg px-2 py-0.5 text-[9.5px] font-extrabold ${
                                        hasS
                                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                      }`}
                                    >
                                      {hasS ? '✓' : '🔒'} {sMeta?.emoji} {sMeta?.label} Lv.{r.level}
                                    </span>
                                  );
                                })}
                                {minDeliv > 0 && (
                                  <span
                                    className={`rounded-lg px-2 py-0.5 text-[9.5px] font-extrabold ${
                                      delivOk
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                                    }`}
                                  >
                                    {delivOk ? '✓' : '🔒'} 🚀 {deliverablesDone}/{minDeliv} Shipped
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {isCurrent ? (
                          <span className="mt-3.5 block w-full rounded-xl bg-emerald-500/20 py-2 text-center text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            ✓ Active Career Track
                          </span>
                        ) : allGatesMet ? (
                          <button
                            onClick={() => applyJob(c.id)}
                            className="btn-press mt-3.5 w-full rounded-xl bg-gradient-to-r from-[#007AFF] to-indigo-600 py-2 text-xs font-extrabold text-white shadow-sm hover:opacity-95"
                          >
                            🎯 Sit for Onsite Loop (-{entryReq?.interviewEnergyCost ?? 15}⚡)
                          </button>
                        ) : (
                          <div className="mt-3.5 flex gap-1.5">
                            <button
                              onClick={() => {
                                if (missingNodes[0]) setSelectedNodeId(missingNodes[0]);
                                setActiveTab('tree');
                              }}
                              className="btn-press flex-1 rounded-xl bg-amber-500/20 py-2 text-[11px] font-extrabold text-amber-700 hover:bg-amber-500/30 dark:text-amber-300"
                            >
                              🌳 Train in Tech Tree
                            </button>
                            <button
                              onClick={() => applyJob(c.id)}
                              className="btn-press rounded-xl bg-black/8 px-2.5 py-2 text-[11px] font-extrabold text-[var(--ink-soft)] hover:bg-black/15 dark:bg-white/10"
                              title="Check missing requirements"
                            >
                              🔒
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
