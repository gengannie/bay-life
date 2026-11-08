import React, { useEffect, useMemo, useState } from 'react';
import {
  ACTIONS,
  CAREER_BY_ID,
  FURNITURE_CATALOG,
  HOMES,
  HOME_BY_ID,
  LOCATION_BY_ID,
  calculateCommuteDetails,
} from '../data/worldData';
import {
  formatCurrency,
  formatTime,
  getInstalledHomeComputer,
  isHomePowered,
  useGameStore,
} from '../store/useGameStore';
import { SkillKey } from '../types/game';
import {
  Cpu,
  Terminal,
  Sparkles,
  Rocket,
  Briefcase,
  CheckCircle2,
  Zap,
  ZapOff,
  X,
  ArrowUpCircle,
  Trash2,
  Play,
  Code2,
  Layers,
  HardDrive,
  Monitor,
  ShieldCheck,
  Home,
  Building2,
  Key,
  Navigation,
} from 'lucide-react';

type DesktopAppTab = 'ide' | 'ai_lab' | 'bounties' | 'bluefin' | 'hardware';

interface HardwareSpec {
  chip: string;
  memory: string;
  display: string;
  tflops: string;
  tokPerSec: number;
  yieldMult: number;
  badge: string;
  accent: string;
}

const COMPUTER_SPECS: Record<string, HardwareSpec> = {
  folding_desk: {
    chip: 'Apple M3 (8-Core CPU / 10-Core GPU)',
    memory: '16GB Unified Memory',
    display: '13.6" Liquid Retina (Single Screen)',
    tflops: '4.1 TFLOPs',
    tokPerSec: 38,
    yieldMult: 1.0,
    badge: 'Tier 1 · Starter Rig (1.0× Yield)',
    accent: '#64748B',
  },
  standing_desk: {
    chip: 'Apple M4 Pro (14-Core CPU / 20-Core GPU)',
    memory: '48GB Unified Memory',
    display: '27" 5K Apple Studio Display + Motorized Desk',
    tflops: '11.4 TFLOPs',
    tokPerSec: 84,
    yieldMult: 1.35,
    badge: 'Tier 2 · Ergonomic 5K Rig (1.35× Yield)',
    accent: '#0284C7',
  },
  mac_studio_desk: {
    chip: 'Apple M4 Ultra (32-Core CPU / 80-Core GPU)',
    memory: '192GB Unified Memory (800GB/s)',
    display: 'Dual 27" 5K Studio Displays',
    tflops: '34.8 TFLOPs',
    tokPerSec: 165,
    yieldMult: 1.75,
    badge: 'Tier 3 · Local LLM Workstation (1.75× Yield)',
    accent: '#0EA5E9',
  },
  xdr_workstation: {
    chip: 'Dual NVIDIA H100 SXM5 + Threadripper PRO',
    memory: '160GB HBM3e VRAM + 256GB DDR5',
    display: '32" 6K Pro Display XDR + Herman Miller Embody',
    tflops: '1,979 TFLOPs FP8',
    tokPerSec: 420,
    yieldMult: 2.25,
    badge: 'Tier 4 · Frontier H100 Cluster (2.25× Yield)',
    accent: '#6366F1',
  },
};

interface IdeTicket {
  id: string;
  title: string;
  module: string;
  skill: SkillKey;
  baseCash: number;
  baseXp: number;
  codeSnippet: string[];
  testOutput: string;
}

const IDE_TICKETS: IdeTicket[] = [
  {
    id: 'grpc_zero_copy',
    title: 'Zero-Copy Rust gRPC Arena Serializer',
    module: 'crates/rpc-core/src/arena.rs',
    skill: 'coding',
    baseCash: 280,
    baseXp: 0.24,
    codeSnippet: [
      'pub fn serialize_ring<' + "'a" + '>(buf: &' + "'a" + ' mut ArenaSlice) -> Result<Frame, RpcErr> {',
      '    let ptr = buf.reserve_aligned::<64>(payload.len())?;',
      '    unsafe { core::ptr::copy_nonoverlapping(payload.as_ptr(), ptr, payload.len()) };',
      '    Ok(Frame::from_raw_parts(ptr, payload.len()))',
      '}',
    ],
    testOutput: 'PASS: 142/142 tests · p99 latency dropped 4.2ms → 0.38ms (0 heap allocs)',
  },
  {
    id: 'raft_quorum',
    title: 'Multi-Region Spanner Raft Lease Failover',
    module: 'pkg/consensus/raft_lease.go',
    skill: 'systemDesign',
    baseCash: 340,
    baseXp: 0.28,
    codeSnippet: [
      'func (n *Node) VerifyLeaderLease(now TrueTimeInterval) bool {',
      '    if now.Earliest.After(n.leaseExpiresAt) {',
      '        n.StepDownToFollower(TermEpoch(n.currentTerm + 1))',
      '        return false',
      '    }',
      '    return n.quorumAcked.Load() >= (n.clusterSize/2 + 1)',
      '}',
    ],
    testOutput: 'PASS: Jepsen partition nemesis verified · 99.999% linearizable reads',
  },
  {
    id: 'flash_attn_fp8',
    title: 'FlashAttention-3 Warp-Specialized FP8 Kernel',
    module: 'csrc/kernels/flash_fwd_fp8.cu',
    skill: 'aiResearch',
    baseCash: 410,
    baseXp: 0.32,
    codeSnippet: [
      '__global__ void flash_fwd_fp8_kernel(const __nv_fp8_e4m3* Q, const __nv_fp8_e4m3* K) {',
      '    warpgroup_arrive();',
      '    cute::gemm(tiled_mma, tSrQ, tSrK, tSrS); // Async WGMMA pipeline',
      '    softmax_rescale_online(tSrS, row_max, row_sum);',
      '}',
    ],
    testOutput: 'PASS: 87.4% Tensor Core MFU · 1.88× faster prefill on 128k context',
  },
];

interface CodeReviewBug {
  id: string;
  title: string;
  buggyLine: string;
  options: Array<{ label: string; fix: string; optimal?: boolean }>;
}

const CODE_REVIEW_BUGS: CodeReviewBug[] = [
  {
    id: 'async_lock',
    title: 'P0 Production Deadlock in Worker Pool',
    buggyLine: 'let guard = mutex.lock().unwrap(); tokio::time::sleep(dur).await;',
    options: [
      {
        label: 'Drop std::sync::Mutex guard before .await point (or use tokio::sync::Mutex)',
        fix: 'Prevents worker thread starvation across async yield points',
        optimal: true,
      },
      {
        label: 'Increase thread pool size to 2,048 OS threads',
        fix: 'Masks symptom until traffic spikes',
      },
      {
        label: 'Wrap mutex in Arc<UnsafeCell<T>> without synchronization',
        fix: 'Data race UB under concurrent load',
      },
    ],
  },
  {
    id: 'n_plus_one',
    title: 'GraphQL Feed Endpoint OOM at 15k QPS',
    buggyLine: 'for (const id of postIds) { results.push(await db.queryUserById(id)); }',
    options: [
      {
        label: 'Batch keys with DataLoader + single WHERE id = ANY($1) query',
        fix: 'Collapses 500 serial roundtrips into 1 indexed batch read',
        optimal: true,
      },
      {
        label: 'Add a 30-second client retry loop on HTTP 504',
        fix: 'Causes retry storm against primary DB',
      },
      {
        label: 'Disable connection pooling',
        fix: 'Exhausts Postgres max_connections immediately',
      },
    ],
  },
  {
    id: 'kv_oom',
    title: 'LLM Inference Server VRAM Fragmentation',
    buggyLine: 'kv_cache = torch.empty((batch, max_seq_len, heads, dim), device="cuda")',
    options: [
      {
        label: 'Allocate non-contiguous PagedAttention blocks on demand (16 tokens/page)',
        fix: 'Eliminates internal fragmentation; 3.4× higher batch throughput',
        optimal: true,
      },
      {
        label: 'Truncate all user prompts to 256 tokens',
        fix: 'Breaks long-context agent workflows',
      },
      {
        label: 'Call torch.cuda.empty_cache() after every single token',
        fix: 'Synchronizes host-device stream and tanks tokens/sec',
      },
    ],
  },
];

interface FreelanceBounty {
  id: string;
  client: string;
  title: string;
  emoji: string;
  skill: SkillKey;
  basePayout: number;
  energyCost: number;
  startupBoost: number;
  desc: string;
}

const FREELANCE_BOUNTIES: FreelanceBounty[] = [
  {
    id: 'bounty_stripe',
    client: 'YC W26 Fintech Seed',
    title: 'Ship Idempotent Stripe Webhook & Usage Metering',
    emoji: '💳',
    skill: 'coding',
    basePayout: 420,
    energyCost: 8,
    startupBoost: 4,
    desc: 'Build zero-double-charge billing webhooks with Redis idempotency keys.',
  },
  {
    id: 'bounty_rag',
    client: 'Series A LegalTech AI',
    title: 'Build Hybrid BM25 + HNSW Vector Retrieval Pipeline',
    emoji: '🔍',
    skill: 'aiResearch',
    basePayout: 560,
    energyCost: 10,
    startupBoost: 6,
    desc: 'Cut hallucination rate below 1.2% with reciprocal rank fusion & reranking.',
  },
  {
    id: 'bounty_infra',
    client: 'Sand Hill Stealth Infra',
    title: 'Architect Multi-AZ Kubernetes Auto-Scaler',
    emoji: '☸️',
    skill: 'systemDesign',
    basePayout: 680,
    energyCost: 12,
    startupBoost: 7,
    desc: 'Zero-downtime GPU node provisioning with sub-4s cold start.',
  },
];

export const HomeComputerModal: React.FC = () => {
  const cash = useGameStore((s) => s.cash);
  const needs = useGameStore((s) => s.needs);
  const skills = useGameStore((s) => s.skills);
  const time = useGameStore((s) => s.time);
  const homeId = useGameStore((s) => s.homeId);
  const locationId = useGameStore((s) => s.locationId);
  const objects = useGameStore((s) => s.objects);
  const job = useGameStore((s) => s.job);
  const workShift = useGameStore((s) => s.workShift);
  const startup = useGameStore((s) => s.startup);
  const stats = useGameStore((s) => s.stats);
  const ownedHomes = useGameStore((s) => s.ownedHomes);
  const ownedCars = useGameStore((s) => s.ownedCars);
  const computerTab = useGameStore((s) => s.computerTab);

  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const enqueueAction = useGameStore((s) => s.enqueueAction);
  const startWorkShift = useGameStore((s) => s.startWorkShift);
  const installOrUpgradeHomeComputer = useGameStore((s) => s.installOrUpgradeHomeComputer);
  const sellFurniture = useGameStore((s) => s.sellFurniture);
  const buyFurniture = useGameStore((s) => s.buyFurniture);
  const pitchStartupVC = useGameStore((s) => s.pitchStartupVC);
  const triggerMicroReward = useGameStore((s) => s.triggerMicroReward);
  const moveHome = useGameStore((s) => s.moveHome);
  const openBluefinMap = useGameStore((s) => s.openBluefinMap);

  const state = useGameStore.getState();
  const powered = isHomePowered(state);
  const installedComputer = useMemo(
    () => getInstalledHomeComputer({ objects }),
    [objects]
  );

  const computeCatalog = useMemo(
    () => FURNITURE_CATALOG.filter((f) => f.category === 'compute'),
    []
  );

  const [activeTab, setActiveTab] = useState<DesktopAppTab>(() => {
    if (computerTab === 'bluefin') return 'bluefin';
    return installedComputer ? computerTab || 'ide' : 'hardware';
  });

  useEffect(() => {
    if (computerTab === 'bluefin') {
      setActiveTab('bluefin');
    } else if (computerTab && installedComputer) {
      setActiveTab(computerTab);
    }
  }, [computerTab, installedComputer]);

  const [selectedBluefinHomeId, setSelectedBluefinHomeId] = useState<string>(
    () => HOMES.find((h) => h.id !== homeId)?.id || homeId
  );

  // IDE Interactive State
  const [selectedTicketIdx, setSelectedTicketIdx] = useState(0);
  const [ideStage, setIdeStage] = useState<0 | 1 | 2>(0); // 0=Write, 1=Test, 2=Merge
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'bayos@workstation ~ % cursor --workspace ~/repos/cortexflow',
    '✓ LSP Server ready (rust-analyzer + pyright + clangd)',
    '✓ Ready for interactive compilation & deployment.',
  ]);
  const [bugIdx, setBugIdx] = useState(() => stats.leetCodeSolved % CODE_REVIEW_BUGS.length);
  const [bugFeedback, setBugFeedback] = useState<string | null>(null);

  // AI Lab Interactive State
  const [selectedModel, setSelectedModel] = useState<'8b' | '32b' | '70b'>('32b');
  const [quantMode, setQuantMode] = useState<'FP16' | 'FP8' | 'INT4'>('FP8');
  const [loraRank, setLoraRank] = useState<16 | 64 | 128>(64);
  const [epochCount, setEpochCount] = useState(1);
  const [currentLoss, setCurrentLoss] = useState(2.42);
  const [aiStatusLog, setAiStatusLog] = useState<string>(
    'CUDA / Metal backend initialized. Select hyperparameters and run a training epoch.'
  );

  // Bounties State
  const [completedBountiesSession, setCompletedBountiesSession] = useState<number>(0);

  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const currentSpec = installedComputer
    ? COMPUTER_SPECS[installedComputer.def.id] || COMPUTER_SPECS.folding_desk
    : null;
  const yieldMult = currentSpec?.yieldMult || 1.0;

  const activeTicket = IDE_TICKETS[selectedTicketIdx] || IDE_TICKETS[0];
  const activeBug = CODE_REVIEW_BUGS[bugIdx % CODE_REVIEW_BUGS.length];

  const handleAdvanceIdeStage = () => {
    if (!installedComputer || !powered) return;
    if (needs.energy < 8) {
      triggerMicroReward({
        toastText: 'Low Energy! Grab an espresso or power nap before compiling.',
        emoji: '☕',
      });
      return;
    }

    if (ideStage === 0) {
      setIdeStage(1);
      setTerminalLogs((prev) => [
        ...prev.slice(-6),
        `$ git checkout -b feat/${activeTicket.id}`,
        `✓ Wrote ${activeTicket.codeSnippet.length} lines in ${activeTicket.module}`,
      ]);
      triggerMicroReward({
        skill: activeTicket.skill,
        skillDelta: 0.06 * yieldMult,
        needKey: 'energy',
        needDelta: -3,
      });
    } else if (ideStage === 1) {
      setIdeStage(2);
      setTerminalLogs((prev) => [
        ...prev.slice(-6),
        `$ bazel test //... --config=asan`,
        `✓ ${activeTicket.testOutput}`,
      ]);
      triggerMicroReward({
        skill: activeTicket.skill,
        skillDelta: 0.08 * yieldMult,
        needKey: 'energy',
        needDelta: -3,
      });
    } else {
      const payout = Math.round(activeTicket.baseCash * yieldMult);
      const xpGain = +(activeTicket.baseXp * yieldMult).toFixed(2);
      setIdeStage(0);
      setSelectedTicketIdx((i) => (i + 1) % IDE_TICKETS.length);
      setTerminalLogs((prev) => [
        ...prev.slice(-6),
        `$ git push origin HEAD && gh pr merge --squash`,
        `🚀 Merged & deployed ${activeTicket.title}! Earned +${formatCurrency(payout)} & +${xpGain} XP`,
      ]);
      triggerMicroReward({
        cashDelta: payout,
        skill: activeTicket.skill,
        skillDelta: xpGain,
        performanceDelta: 4,
        startupDelta: 3,
        needKey: 'energy',
        needDelta: -4,
        toastText: `Shipped ${activeTicket.title} on ${installedComputer.def.name}! +${formatCurrency(payout)} & +${xpGain} XP`,
        emoji: '💻',
      });
    }
  };

  const handleSolveCodeReview = (opt: { label: string; fix: string; optimal?: boolean }) => {
    if (!installedComputer || !powered) return;
    if (opt.optimal) {
      const rewardCash = Math.round(210 * yieldMult);
      setBugFeedback(`✅ LGTM! ${opt.fix} (+${formatCurrency(rewardCash)} · +0.18 Coding XP)`);
      setBugIdx((i) => i + 1);
      triggerMicroReward({
        cashDelta: rewardCash,
        skill: 'coding',
        skillDelta: +(0.18 * yieldMult).toFixed(2),
        performanceDelta: 3,
        karmaDelta: 1,
        toastText: `Squashed P0 Bug in Code Review! +${formatCurrency(rewardCash)}`,
        emoji: '🐛',
      });
    } else {
      setBugFeedback(`⚠️ CI Rejected: ${opt.fix}. Try the optimal fix!`);
      triggerMicroReward({
        skill: 'coding',
        skillDelta: 0.04,
      });
    }
  };

  const handleRunAiEpoch = () => {
    if (!installedComputer || !powered) return;
    if (needs.energy < 10) {
      triggerMicroReward({
        toastText: 'Need at least 10% Energy to run a local GPU training epoch!',
        emoji: '⚡',
      });
      return;
    }

    const modelBonus = selectedModel === '70b' ? 1.35 : selectedModel === '32b' ? 1.15 : 1.0;
    const nextLoss = Math.max(0.48, +(currentLoss * (0.82 + Math.random() * 0.08)).toFixed(2));
    const aiXp = +(0.26 * yieldMult * modelBonus).toFixed(2);
    const mvpGain = Math.round(5 * yieldMult * modelBonus);
    const computeGrant = Math.round(240 * yieldMult);

    setEpochCount((e) => e + 1);
    setCurrentLoss(nextLoss);
    setAiStatusLog(
      `Epoch #${epochCount} converged (${selectedModel.toUpperCase()} · ${quantMode} · LoRA r=${loraRank}) → Val Loss: ${nextLoss} at ${Math.round((currentSpec?.tokPerSec || 45) * (quantMode === 'INT4' ? 1.4 : quantMode === 'FP8' ? 1.2 : 1.0))} tok/s!`
    );

    triggerMicroReward({
      cashDelta: computeGrant,
      skill: 'aiResearch',
      skillDelta: aiXp,
      startupDelta: mvpGain,
      needKey: 'energy',
      needDelta: -8,
      toastText: `Fine-tuned ${selectedModel.toUpperCase()} Model (Loss ${nextLoss})! +${mvpGain}% Startup MVP · +${formatCurrency(computeGrant)}`,
      emoji: '🧠',
    });
  };

  const handleCompleteBounty = (bounty: FreelanceBounty) => {
    if (!installedComputer || !powered) return;
    if (needs.energy < bounty.energyCost) {
      triggerMicroReward({
        toastText: `Need ${bounty.energyCost}% Energy to complete ${bounty.title}!`,
        emoji: '☕',
      });
      return;
    }

    const finalPayout = Math.round(bounty.basePayout * yieldMult);
    const xpGain = +(0.22 * yieldMult).toFixed(2);
    setCompletedBountiesSession((c) => c + 1);

    triggerMicroReward({
      cashDelta: finalPayout,
      skill: bounty.skill,
      skillDelta: xpGain,
      startupDelta: bounty.startupBoost,
      needKey: 'energy',
      needDelta: -bounty.energyCost,
      toastText: `Delivered "${bounty.title}" for ${bounty.client}! +${formatCurrency(finalPayout)}`,
      emoji: bounty.emoji,
    });
  };

  const career = job ? CAREER_BY_ID[job.careerId] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-md"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="apple-glass-heavy relative flex h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[34px] border border-white/40 shadow-[0_32px_100px_rgba(0,0,0,0.65)] dark:border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================
            MACOS / BAYOS DESKTOP TOP MENU BAR
        ========================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-slate-900 px-5 py-3 text-white dark:border-white/10">
          <div className="flex items-center gap-3">
            {/* macOS Window Traffic Lights */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveModal(null)}
                className="size-3 rounded-full bg-rose-500 hover:opacity-80"
                title="Close Workstation (Esc / C)"
              />
              <span className="size-3 rounded-full bg-amber-400" />
              <span className="size-3 rounded-full bg-emerald-500" />
            </div>

            <span className="text-slate-600">|</span>

            <div className="flex items-center gap-2">
              <Monitor className="size-4 text-sky-400" />
              <span className="text-xs font-black tracking-tight sm:text-sm">
                {installedComputer
                  ? `${installedComputer.def.emoji} ${installedComputer.def.name}`
                  : '🖥️ Home Computer Workstation (Optional Purchase)'}
              </span>
              {currentSpec && (
                <span className="hidden rounded-full bg-sky-500/20 px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-sky-300 sm:inline-block">
                  {currentSpec.badge}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono font-extrabold text-emerald-300">
              {formatCurrency(cash)}
            </span>

            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${powered ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                }`}
            >
              {powered ? <Zap className="size-3" /> : <ZapOff className="size-3" />}
              <span>{powered ? 'AC Power' : 'Outage'}</span>
            </span>

            <span className="hidden font-mono text-[11px] font-bold text-slate-300 md:inline">
              {formatTime(time)}
            </span>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-press grid size-7 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              title="Close Computer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* =========================================================
            DESKTOP NAVIGATION TABS
        ========================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 bg-[var(--mist)] px-5 py-2.5 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            {installedComputer ? (
              <>
                <button
                  onClick={() => setActiveTab('ide')}
                  className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${activeTab === 'ide'
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                >
                  <Terminal className="size-3.5" />
                  <span>💻 Cursor IDE & Terminal</span>
                </button>

                <button
                  onClick={() => setActiveTab('ai_lab')}
                  className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${activeTab === 'ai_lab'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                >
                  <Cpu className="size-3.5" />
                  <span>🧠 Local AI & GPU Lab</span>
                </button>

                <button
                  onClick={() => setActiveTab('bounties')}
                  className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${activeTab === 'bounties'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                >
                  <Rocket className="size-3.5" />
                  <span>🚀 Bounties & Startup</span>
                </button>

                <button
                  onClick={() => setActiveTab('bluefin')}
                  className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${activeTab === 'bluefin'
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                >
                  <Home className="size-3.5" />
                  <span>🐟 Bluefin Real Estate</span>
                </button>

                <button
                  onClick={() => setActiveTab('hardware')}
                  className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${activeTab === 'hardware'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                >
                  <HardDrive className="size-3.5" />
                  <span>⚙️ WFH, Queue & Upgrade Rig</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('hardware')}
                  className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${activeTab !== 'bluefin'
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                >
                  <HardDrive className="size-3.5" />
                  <span>🖥️ Hardware Showroom</span>
                </button>

                <button
                  onClick={() => setActiveTab('bluefin')}
                  className={`btn-press flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${activeTab === 'bluefin'
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                >
                  <Home className="size-3.5" />
                  <span>🐟 Bluefin Real Estate</span>
                </button>
              </>
            )}
          </div>

          {currentSpec && (
            <div className="hidden items-center gap-2 text-[11px] font-bold text-[var(--ink-soft)] lg:flex">
              <span>⚡ {currentSpec.chip}</span>
              <span>·</span>
              <span className="font-mono text-[#007AFF] dark:text-[#5AC8FA]">
                {currentSpec.tokPerSec} tok/s
              </span>
            </div>
          )}
        </div>

        {/* =========================================================
            MAIN WORKSTATION BODY
        ========================================================= */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* BLUEFIN DESKTOP REAL ESTATE PORTAL (Accessible Anytime) */}
          {activeTab === 'bluefin' ? (
            (() => {
              const selectedHome =
                HOME_BY_ID[selectedBluefinHomeId] || HOMES.find((h) => h.id !== homeId) || homeDef;
              const isCurrent = selectedHome.id === homeId;
              const isOwned = ownedHomes.includes(selectedHome.id);
              const canAffordRent = cash >= selectedHome.weeklyRent;
              const canAffordBuy = cash >= selectedHome.buyPrice;
              const hqLocId = career?.locationId || 'soma_yc_loft';
              const hqVenue = LOCATION_BY_ID[hqLocId];
              const modeForEst = ownedCars.length > 0 ? 'tesla' : 'waymo';
              const sampleHubIds = Array.from(
                new Set([hqLocId, 'soma_yc_loft', 'sand_hill_vc', 'mountain_view_plex'])
              ).slice(0, 4);

              return (
                <div className="space-y-4">
                  {/* Bluefin Web Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#0284C7]/35 bg-gradient-to-r from-[#0284C7]/15 via-sky-500/10 to-indigo-500/15 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#0284C7] text-2xl text-white shadow-sm">
                        🐟
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black tracking-tight">
                            Bluefin Bay Area Real Estate & Commute Analyzer
                          </h3>
                          <span className="rounded-full bg-[#0284C7]/20 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0284C7] dark:text-sky-300">
                            5 Verified Listings · T1 to T5
                          </span>
                        </div>
                        <p className="text-xs text-[var(--ink-soft)]">
                          Compare Bay Area neighborhoods, custom window views, passive XP & need-drain shields, and commute times before signing a lease or buying a deed.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => openBluefinMap(selectedHome.id)}
                      className="btn-press flex items-center gap-1.5 rounded-2xl bg-[#0284C7] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#0369A1]"
                    >
                      <Navigation className="size-3.5" />
                      <span>🗺️ Open Fullscreen Bluefin Map</span>
                    </button>
                  </div>

                  {/* Main Split-Screen Redfin/Bluefin Layout */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* Left 5 Cols: Interactive Bay Area Property Radar Map + 5 Listings List */}
                    <div className="space-y-3 lg:col-span-5">
                      {/* Mini Interactive Bay Area Property Radar SVG */}
                      <div className="relative h-52 w-full overflow-hidden rounded-3xl border border-sky-400/35 bg-[#dbeafe] shadow-inner dark:bg-slate-900">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                          <rect width="100" height="100" fill="#bae6fd" className="dark:fill-slate-900" />
                          {/* Peninsula & East Bay Landmasses */}
                          <path
                            d="M 10,14 L 50,12 L 56,46 L 64,64 L 86,74 L 94,100 L 8,100 L 8,48 Z"
                            fill="#ecfdf5"
                            className="dark:fill-slate-800"
                            stroke="#10b981"
                            strokeWidth="0.6"
                          />
                          <path
                            d="M 64,0 L 100,0 L 100,82 L 88,68 L 74,40 L 62,14 Z"
                            fill="#ecfdf5"
                            className="dark:fill-slate-800"
                            stroke="#10b981"
                            strokeWidth="0.6"
                          />
                          {/* Golden Gate & Bay Bridge */}
                          <line x1="24" y1="9" x2="24" y2="14.5" stroke="#ea580c" strokeWidth="1.6" />
                          <line
                            x1="50"
                            y1="18"
                            x2="70"
                            y2="15"
                            stroke="#94a3b8"
                            strokeWidth="0.9"
                            strokeDasharray="1.5,1"
                          />
                          {/* Commute Line from Selected Listing to HQ */}
                          {hqVenue && (
                            <line
                              x1={selectedHome.mapCoords.x}
                              y1={selectedHome.mapCoords.y}
                              x2={hqVenue.mapCoords.x}
                              y2={hqVenue.mapCoords.y}
                              stroke="#0284c7"
                              strokeWidth="1.2"
                              strokeDasharray="2,1.5"
                            />
                          )}
                        </svg>

                        {/* HQ Pin on Radar */}
                        {hqVenue && (
                          <div
                            style={{
                              left: `${hqVenue.mapCoords.x}%`,
                              top: `${hqVenue.mapCoords.y}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            className="pointer-events-none absolute z-10 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white shadow-sm ring-1 ring-white"
                          >
                            🏢 HQ: {hqVenue.shortName}
                          </div>
                        )}

                        {/* All 5 Bluefin Residence Pins on Radar */}
                        {HOMES.map((h) => {
                          const active = h.id === selectedHome.id;
                          const current = h.id === homeId;
                          return (
                            <button
                              key={h.id}
                              onClick={() => setSelectedBluefinHomeId(h.id)}
                              style={{
                                left: `${h.mapCoords.x}%`,
                                top: `${h.mapCoords.y}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                              className={`btn-press absolute flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold shadow-md transition-all ${active
                                  ? 'z-30 scale-110 bg-[#0284C7] text-white ring-2 ring-white'
                                  : current
                                    ? 'z-20 bg-emerald-600 text-white ring-1 ring-white'
                                    : 'z-15 bg-white/95 text-slate-900 ring-1 ring-[#0284C7]/50 hover:scale-105 dark:bg-slate-900/95 dark:text-white'
                                }`}
                            >
                              <span>{h.emoji}</span>
                              <span>${(h.weeklyRent / 1000).toFixed(1)}k</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* 5 Clickable Listing Cards */}
                      <div className="space-y-2">
                        {HOMES.map((h) => {
                          const active = h.id === selectedHome.id;
                          const current = h.id === homeId;
                          const owned = ownedHomes.includes(h.id);
                          return (
                            <button
                              key={h.id}
                              onClick={() => setSelectedBluefinHomeId(h.id)}
                              className={`btn-press flex w-full items-center justify-between gap-2.5 rounded-2xl border p-3 text-left transition-all ${active
                                  ? 'border-[#0284C7] bg-[#0284C7]/12 shadow-xs'
                                  : 'border-black/8 bg-[var(--mist)] hover:border-[#0284C7]/40 dark:border-white/10'
                                }`}
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/80 text-xl shadow-2xs dark:bg-white/10">
                                  {h.emoji}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="truncate text-xs font-black">{h.name}</span>
                                    {current && (
                                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                                        YOUR HOME
                                      </span>
                                    )}
                                    {!current && owned && (
                                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:text-amber-300">
                                        🔑 OWNED
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-semibold text-[var(--ink-soft)]">
                                    {h.tierLabel} · {h.area} ({h.gridSize}×{h.gridSize} Grid)
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-right font-mono">
                                <div className="text-xs font-black text-[#0284C7] dark:text-sky-400">
                                  {formatCurrency(h.weeklyRent)}/wk
                                </div>
                                <div className="text-[9.5px] font-semibold text-[var(--ink-soft)]">
                                  {formatCurrency(h.buyPrice)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right 7 Cols: Selected Property Dossier, Perks & Commute Comparison Matrix */}
                    <div className="flex flex-col justify-between rounded-3xl border border-black/8 bg-[var(--mist)] p-5 lg:col-span-7 dark:border-white/10">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/85 text-3xl shadow-xs dark:bg-white/10">
                              {selectedHome.emoji}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded-full bg-[#0284C7]/20 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0284C7] dark:text-sky-300">
                                  {selectedHome.tierLabel}
                                </span>
                                <span className="rounded-full bg-black/5 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[var(--ink-soft)] dark:bg-white/10">
                                  {selectedHome.gridSize}×{selectedHome.gridSize} Floor Grid
                                </span>
                                {isCurrent && (
                                  <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white">
                                    🏠 Current Active Residence
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-1 text-lg font-black">{selectedHome.name}</h3>
                              <p className="text-xs font-semibold text-[var(--ink-soft)]">
                                {selectedHome.area} · {selectedHome.district}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white/80 px-3.5 py-2 text-right font-mono dark:bg-black/35">
                            <div className="text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                              Weekly Lease / Bluefin Est.
                            </div>
                            <div className="text-sm font-black text-[#0284C7] dark:text-sky-400">
                              {formatCurrency(selectedHome.weeklyRent)}/wk
                            </div>
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Deed: {formatCurrency(selectedHome.buyPrice)}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
                          {selectedHome.tagline}
                        </p>

                        {/*Passive Luxury Perks & Multipliers */}
                        <div className="rounded-2xl border border-[#0284C7]/25 bg-white/75 p-3.5 dark:bg-black/30">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-[#0284C7] uppercase dark:text-sky-300">
                              <Sparkles className="size-3.5" />
                              <span>Bluefin Verified Luxury Perks & Passive Multipliers</span>
                            </span>
                            <span className="font-mono text-[10px] font-bold text-[var(--ink-soft)]">
                              100% Furniture Preserved on Move
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {selectedHome.perks.map((perk, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-xl bg-[var(--mist)] px-3 py-2 text-xs"
                              >
                                <span className="font-bold text-[var(--ink)]">
                                  {perk.emoji} {perk.label}
                                </span>
                                <span className="rounded-md bg-[#0284C7]/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#0284C7] dark:text-sky-300">
                                  {perk.desc}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Multi-Hub Commute Comparison Matrix */}
                        <div className="rounded-2xl bg-white/75 p-3.5 dark:bg-black/30">
                          <div className="mb-2 text-[10px] font-extrabold tracking-wider text-[var(--ink-soft)] uppercase">
                            🚆 Commute Comparison from {selectedHome.shortName} vs. Current Home ({homeDef.shortName})
                          </div>
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {sampleHubIds.map((hubId) => {
                              const hub = LOCATION_BY_ID[hubId];
                              if (!hub) return null;
                              const fromSelected = calculateCommuteDetails(
                                selectedHome.id,
                                hubId,
                                selectedHome.id,
                                modeForEst
                              );
                              const fromCurrent = calculateCommuteDetails(
                                homeId,
                                hubId,
                                homeId,
                                modeForEst
                              );
                              const diff =
                                fromSelected.durationMinutes - fromCurrent.durationMinutes;
                              const isHq = hubId === career?.locationId;

                              return (
                                <div
                                  key={hubId}
                                  className="flex items-center justify-between rounded-xl bg-[var(--mist)] px-3 py-2 text-xs"
                                >
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <span>{hub.emoji}</span>
                                    <span className="truncate">{hub.shortName}</span>
                                    {isHq && (
                                      <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[8.5px] font-black text-indigo-700 dark:text-indigo-300">
                                        HQ
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-extrabold">
                                    <span className="text-[var(--ink-soft)]">
                                      {fromSelected.miles}mi
                                    </span>
                                    <span className="text-[#0284C7] dark:text-sky-400">
                                      {fromSelected.durationMinutes}m
                                    </span>
                                    {!isCurrent && diff !== 0 && (
                                      <span
                                        className={`rounded px-1 py-0.2 text-[9.5px] ${diff < 0
                                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                                          }`}
                                      >
                                        {diff < 0 ? `${diff}m` : `+${diff}m`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Lease / Buy Deed / Inspect on Map CTA Row */}
                      <div className="mt-4 grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-3">
                        <button
                          disabled={isCurrent || (!isOwned && !canAffordRent)}
                          onClick={() => moveHome(selectedHome.id, false)}
                          className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-[#007AFF] px-3 py-2.5 text-xs font-extrabold text-white shadow-sm disabled:opacity-40"
                        >
                          <Building2 className="size-4" />
                          <span>
                            {isCurrent
                              ? '🏠 Current Home'
                              : isOwned
                                ? '🔑 Move In ($0/wk)'
                                : canAffordRent
                                  ? `Sign Lease (${formatCurrency(selectedHome.weeklyRent)}/wk)`
                                  : `Need ${formatCurrency(selectedHome.weeklyRent)}/wk`}
                          </span>
                        </button>

                        <button
                          disabled={isOwned || !canAffordBuy}
                          onClick={() => moveHome(selectedHome.id, true)}
                          className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2.5 text-xs font-extrabold text-white shadow-sm disabled:opacity-40"
                        >
                          <Key className="size-4" />
                          <span>
                            {isOwned
                              ? '✓ Deed Owned ($0 Rent)'
                              : canAffordBuy
                                ? `Buy Deed (${formatCurrency(selectedHome.buyPrice)})`
                                : `Deed ${formatCurrency(selectedHome.buyPrice)}`}
                          </span>
                        </button>

                        <button
                          onClick={() => openBluefinMap(selectedHome.id)}
                          className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-[#0284C7] px-3 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#0369A1]"
                        >
                          <Navigation className="size-4" />
                          <span>📍 Pin on Bay Map</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : !installedComputer ? (
            <div className="mx-auto max-w-4xl space-y-5">
              <div className="rounded-3xl border border-[#007AFF]/30 bg-gradient-to-r from-[#007AFF]/15 via-indigo-500/10 to-purple-500/15 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3.5">
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#007AFF] text-3xl text-white shadow-md">
                      🖥️
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF]/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#007AFF] dark:text-[#5AC8FA]">
                        <span>✨ Optional Home Upgrade · {homeDef.name}</span>
                      </div>
                      <h3 className="mt-1 text-lg font-black">
                        Install a Home Computer Workstation
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                        Your apartment starts without a desktop computer so you can save runway cash or choose the exact rig you want. Installing a computer unlocks the interactive Cursor IDE, Local LLM Training Lab, Freelance Bounties, and Remote WFH shifts!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {computeCatalog.map((item) => {
                  const spec = COMPUTER_SPECS[item.id] || COMPUTER_SPECS.folding_desk;
                  const canAfford = cash >= item.price;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between rounded-3xl border border-black/8 bg-[var(--mist)] p-4 transition-all hover:border-[#007AFF]/40 dark:border-white/10"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/80 text-2xl shadow-xs dark:bg-white/10">
                              {item.emoji}
                            </span>
                            <div>
                              <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF] dark:text-[#5AC8FA]">
                                {spec.badge}
                              </span>
                              <h4 className="mt-1 text-sm font-black">{item.name}</h4>
                            </div>
                          </div>
                          <div className="text-right font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.price)}
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-[var(--ink-soft)]">{item.subtitle}</p>

                        {/* Hardware Specs Grid */}
                        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-black/5 p-2.5 text-[11px] dark:bg-white/5">
                          <div>
                            <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                              Silicon / GPU
                            </span>
                            <div className="font-extrabold">{spec.chip}</div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                              Memory / VRAM
                            </span>
                            <div className="font-extrabold">{spec.memory}</div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                              Compute Speed
                            </span>
                            <div className="font-mono font-extrabold text-[#007AFF] dark:text-[#5AC8FA]">
                              {spec.tflops} · {spec.tokPerSec} tok/s
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                              Payout & XP Multiplier
                            </span>
                            <div className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                              {spec.yieldMult}× Rewards
                            </div>
                          </div>
                        </div>

                        {/* Unlocked Actions */}
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {item.actions.map((actId) => {
                            const act = ACTIONS[actId];
                            return act ? (
                              <span
                                key={actId}
                                className="rounded-lg bg-white/70 px-2 py-0.5 text-[10px] font-bold text-[var(--ink)] dark:bg-white/10"
                              >
                                {act.emoji} {act.label.split('(')[0].trim()}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>

                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          installOrUpgradeHomeComputer(item.id);
                          setActiveTab('ide');
                        }}
                        className={`btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-extrabold shadow-sm ${canAfford
                            ? 'bg-[#007AFF] text-white hover:bg-[#0066CC]'
                            : 'cursor-not-allowed bg-black/10 text-[var(--ink-soft)] opacity-60 dark:bg-white/10'
                          }`}
                      >
                        <Sparkles className="size-4" />
                        <span>
                          {canAfford
                            ? `Buy & Install in Apartment · ${formatCurrency(item.price)}`
                            : `Need ${formatCurrency(item.price)} (${formatCurrency(item.price - cash)} short)`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !powered && activeTab !== 'hardware' ? (
            /* CASE 2: PG&E POWER OUTAGE AT HOME */
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-3xl border border-rose-500/35 bg-rose-500/10 p-8 text-center">
              <ZapOff className="size-12 text-rose-500" />
              <h3 className="mt-3 text-lg font-black">
                PG&E Grid Shutoff · Workstation Offline
              </h3>
              <p className="mt-1.5 text-xs text-[var(--ink-soft)]">
                Your {installedComputer.def.name} requires AC power. Install an EcoFlow Delta Pro ($3,200) or Tesla Powerwall 3 ($11,500) to keep your computer online during blackouts!
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <button
                  disabled={cash < 3200}
                  onClick={() => buyFurniture('ecoflow_delta')}
                  className="btn-press rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
                >
                  🔋 Buy EcoFlow Backup ($3,200)
                </button>
                <button
                  onClick={() => setActiveTab('hardware')}
                  className="btn-press rounded-2xl bg-[var(--mist)] px-4 py-2.5 text-xs font-bold"
                >
                  ⚙️ View Hardware Settings
                </button>
              </div>
            </div>
          ) : (
            /* CASE 3: INTERACTIVE DESKTOP APPS */
            <>
              {/* =====================================================
                  TAB 1: CURSOR IDE & INTERACTIVE TERMINAL
              ===================================================== */}
              {activeTab === 'ide' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  {/* Left 7 Cols: Interactive Code Editor & 3-Step Build/Deploy Pipeline */}
                  <div className="space-y-4 lg:col-span-7">
                    <div className="rounded-3xl border border-black/10 bg-slate-950 p-4 text-slate-100 shadow-inner dark:border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <Code2 className="size-4 text-sky-400" />
                          <span className="font-mono text-xs font-extrabold text-sky-300">
                            {activeTicket.module}
                          </span>
                        </div>
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-300">
                          Reward: +{formatCurrency(Math.round(activeTicket.baseCash * yieldMult))} · +
                          {(activeTicket.baseXp * yieldMult).toFixed(2)} {activeTicket.skill} XP
                        </span>
                      </div>

                      {/* Ticket Selector Pills */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {IDE_TICKETS.map((t, idx) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedTicketIdx(idx);
                              setIdeStage(0);
                            }}
                            className={`btn-press rounded-xl px-2.5 py-1 text-[11px] font-bold ${selectedTicketIdx === idx
                                ? 'bg-sky-500 text-white'
                                : 'bg-white/10 text-slate-300 hover:bg-white/15'
                              }`}
                          >
                            {t.title}
                          </button>
                        ))}
                      </div>

                      {/* Code Buffer View */}
                      <div className="mt-3 rounded-2xl bg-slate-900/90 p-3.5 font-mono text-xs leading-relaxed">
                        {activeTicket.codeSnippet.map((line, i) => (
                          <div
                            key={i}
                            className={`flex gap-3 ${ideStage >= 1 ? 'text-emerald-300' : 'text-slate-300'
                              }`}
                          >
                            <span className="select-none text-slate-600">{i + 1}</span>
                            <span className="break-all">{line}</span>
                          </div>
                        ))}
                      </div>

                      {/* 3-Step Interactive Execution Pipeline */}
                      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          <span
                            className={`rounded-lg px-2 py-1 ${ideStage === 0
                                ? 'bg-sky-500/25 text-sky-300 ring-1 ring-sky-400'
                                : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                          >
                            1. Write Code
                          </span>
                          <span className="text-slate-600">→</span>
                          <span
                            className={`rounded-lg px-2 py-1 ${ideStage === 1
                                ? 'bg-sky-500/25 text-sky-300 ring-1 ring-sky-400'
                                : ideStage > 1
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                          >
                            2. Run Benchmark
                          </span>
                          <span className="text-slate-600">→</span>
                          <span
                            className={`rounded-lg px-2 py-1 ${ideStage === 2
                                ? 'bg-emerald-500/30 text-emerald-200 ring-1 ring-emerald-400'
                                : 'bg-white/5 text-slate-500'
                              }`}
                          >
                            3. Merge & Ship
                          </span>
                        </div>

                        <button
                          onClick={handleAdvanceIdeStage}
                          className="btn-press flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-md"
                        >
                          <Play className="size-3.5 fill-current" />
                          <span>
                            {ideStage === 0
                              ? '✍️ Step 1: Write Implementation'
                              : ideStage === 1
                                ? '🧪 Step 2: Run Unit & Load Tests'
                                : `🚀 Step 3: Merge & Ship (+${formatCurrency(Math.round(activeTicket.baseCash * yieldMult))})`}
                          </span>
                        </button>
                      </div>

                      {/* Live Terminal Output */}
                      <div className="mt-3.5 rounded-2xl border border-white/10 bg-black/70 p-3 font-mono text-[11px] text-emerald-400">
                        <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>zsh — interactive terminal</span>
                          <span>Commits Pushed: {stats.commitsPushed}</span>
                        </div>
                        {terminalLogs.map((log, idx) => (
                          <div key={idx} className="leading-snug">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right 5 Cols: Interactive Code Review & P0 Bug Squash */}
                  <div className="space-y-4 lg:col-span-5">
                    <div className="rounded-3xl border border-black/8 bg-[var(--mist)] p-4 dark:border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                          🐛 Live PR Code Review
                        </span>
                        <span className="font-mono text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(Math.round(210 * yieldMult))} / bug
                        </span>
                      </div>

                      <h4 className="mt-2 text-sm font-black">{activeBug.title}</h4>
                      <div className="mt-2 rounded-2xl bg-slate-900 p-3 font-mono text-[11px] text-rose-300">
                        - {activeBug.buggyLine}
                      </div>

                      <p className="mt-2.5 text-[11px] font-bold text-[var(--ink-soft)]">
                        Select the optimal patch to approve & merge:
                      </p>

                      <div className="mt-2 grid gap-2">
                        {activeBug.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSolveCodeReview(opt)}
                            className="btn-press rounded-2xl border border-black/5 bg-white/80 p-3 text-left text-xs transition-all hover:border-[#007AFF] dark:border-white/10 dark:bg-white/5"
                          >
                            <div className="font-extrabold text-[var(--ink)]">{opt.label}</div>
                            <div className="mt-0.5 text-[10px] text-[var(--ink-soft)]">
                              {opt.fix}
                            </div>
                          </button>
                        ))}
                      </div>

                      {bugFeedback && (
                        <div className="mt-3 rounded-2xl bg-[#007AFF]/12 px-3 py-2 text-xs font-bold text-[#007AFF] dark:text-[#5AC8FA]">
                          {bugFeedback}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* =====================================================
                  TAB 2: LOCAL AI & GPU CLUSTER LAB
              ===================================================== */}
              {activeTab === 'ai_lab' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="space-y-4 lg:col-span-7">
                    <div className="rounded-3xl border border-purple-500/30 bg-slate-950 p-5 text-white">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="rounded-full bg-purple-500/25 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-300">
                            🧠 Local Frontier Training & Eval Harness
                          </span>
                          <h3 className="mt-1.5 text-base font-black">
                            {currentSpec?.chip} · {currentSpec?.memory}
                          </h3>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-xs font-extrabold text-emerald-400">
                            Loss: {currentLoss}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Epochs Run: {epochCount}
                          </div>
                        </div>
                      </div>

                      {/* Interactive Hyperparameter Selectors */}
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white/5 p-3">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            1. Base Checkpoint
                          </div>
                          <div className="mt-1.5 flex flex-col gap-1">
                            {(['8b', '32b', '70b'] as const).map((m) => (
                              <button
                                key={m}
                                onClick={() => setSelectedModel(m)}
                                className={`btn-press rounded-xl px-2.5 py-1.5 text-left text-xs font-extrabold ${selectedModel === m
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-slate-300'
                                  }`}
                              >
                                {m === '8b'
                                  ? 'Llama-4-8B-Fast'
                                  : m === '32b'
                                    ? 'DeepSeek-MoE-32B'
                                    : 'Cortex-70B-Reasoning'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white/5 p-3">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            2. Tensor Precision
                          </div>
                          <div className="mt-1.5 flex flex-col gap-1">
                            {(['FP16', 'FP8', 'INT4'] as const).map((q) => (
                              <button
                                key={q}
                                onClick={() => setQuantMode(q)}
                                className={`btn-press rounded-xl px-2.5 py-1.5 text-left text-xs font-extrabold ${quantMode === q
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-white/5 text-slate-300'
                                  }`}
                              >
                                {q} Quantization
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white/5 p-3">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            3. LoRA Adapter Rank
                          </div>
                          <div className="mt-1.5 flex flex-col gap-1">
                            {([16, 64, 128] as const).map((r) => (
                              <button
                                key={r}
                                onClick={() => setLoraRank(r)}
                                className={`btn-press rounded-xl px-2.5 py-1.5 text-left text-xs font-extrabold ${loraRank === r
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white/5 text-slate-300'
                                  }`}
                              >
                                Rank r={r}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-black/50 p-3 font-mono text-xs text-purple-200">
                        {aiStatusLog}
                      </div>

                      <button
                        onClick={handleRunAiEpoch}
                        className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-extrabold text-white shadow-lg"
                      >
                        <Zap className="size-4 fill-current" />
                        <span>
                          ⚡ Run Local Fine-Tune Epoch (-8% Energy · +AI Research XP · +Startup MVP
                          · +{formatCurrency(Math.round(240 * yieldMult))})
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 lg:col-span-5">
                    <div className="rounded-3xl border border-black/8 bg-[var(--mist)] p-4 dark:border-white/10">
                      <h4 className="text-sm font-black">Hardware Telemetry & AI Skill</h4>
                      <p className="mt-1 text-xs text-[var(--ink-soft)]">
                        Higher-tier home computers multiply your AI training speed, token throughput, and cash grants.
                      </p>

                      <div className="mt-3 space-y-2.5">
                        <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                          <div className="flex justify-between text-xs font-bold">
                            <span>🧠 AI / LLM Research Skill</span>
                            <span className="font-mono text-purple-600 dark:text-purple-400">
                              Lv.{Math.floor(skills.aiResearch)} ({skills.aiResearch.toFixed(2)})
                            </span>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                          <div className="flex justify-between text-xs font-bold">
                            <span>🚀 {startup.name} MVP Progress</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">
                              {Math.round(startup.productProgress)}%
                            </span>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                          <div className="flex justify-between text-xs font-bold">
                            <span>⚡ Hardware Multiplier</span>
                            <span className="font-mono text-[#007AFF]">{yieldMult}× Yield</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =====================================================
                  TAB 3: FREELANCE BOUNTIES & STARTUP LAUNCHPAD
              ===================================================== */}
              {activeTab === 'bounties' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="space-y-3 lg:col-span-7">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black">
                        💸 Live Freelance & AI Bounties ({yieldMult}× Hardware Payout)
                      </h3>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        Completed Today: {completedBountiesSession}
                      </span>
                    </div>

                    {FREELANCE_BOUNTIES.map((b) => {
                      const scaledPay = Math.round(b.basePayout * yieldMult);
                      return (
                        <div
                          key={b.id}
                          className="flex flex-col justify-between gap-3 rounded-3xl border border-black/8 bg-[var(--mist)] p-4 sm:flex-row sm:items-center dark:border-white/10"
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-2xl dark:bg-white/10">
                              {b.emoji}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                                  {b.client}
                                </span>
                                <span className="text-[11px] font-bold text-[var(--ink-soft)]">
                                  ⚡ -{b.energyCost}% Energy
                                </span>
                              </div>
                              <h4 className="mt-1 text-sm font-black">{b.title}</h4>
                              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">{b.desc}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleCompleteBounty(b)}
                            className="btn-press shrink-0 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-500"
                          >
                            Ship Bounty · +{formatCurrency(scaledPay)}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4 lg:col-span-5">
                    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-300">
                          🦄 {startup.stage}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(startup.mrr)}/wk MRR
                        </span>
                      </div>
                      <h4 className="mt-2 text-base font-black">{startup.name}</h4>
                      <p className="text-xs text-[var(--ink-soft)]">{startup.tagline}</p>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs font-bold">
                          <span>Product MVP Readiness</span>
                          <span className="font-mono">{Math.round(startup.productProgress)}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all"
                            style={{ width: `${Math.min(100, startup.productProgress)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2">
                        <button
                          onClick={() => {
                            enqueueAction('build_startup_mvp', {
                              objectUid: installedComputer.placed.uid,
                              pos: {
                                x: installedComputer.placed.x,
                                y: installedComputer.placed.y,
                              },
                            });
                            setActiveModal(null);
                          }}
                          className="btn-press rounded-2xl bg-[#007AFF] py-2.5 text-xs font-extrabold text-white"
                        >
                          🚀 Queue Deep-Work MVP Sprint on Sim (90m)
                        </button>

                        {startup.productProgress >= 50 && (
                          <button
                            onClick={pitchStartupVC}
                            className="btn-press rounded-2xl bg-emerald-600 py-2.5 text-xs font-extrabold text-white"
                          >
                            🦄 Pitch Sand Hill VCs for Next Round!
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =====================================================
                  TAB 4: WFH DISPATCH, SIM QUEUE & HARDWARE CONFIGURATOR
              ===================================================== */}
              {activeTab === 'hardware' && (
                <div className="space-y-5">
                  {/* Top Row: WFH Shift + Sim Autonomous Desk Queue */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Remote WFH Shift Card */}
                    <div className="rounded-3xl border border-black/8 bg-[var(--mist)] p-4 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#007AFF]">
                          <Briefcase className="size-3" />
                          <span>Remote Work From Home (WFH)</span>
                        </span>
                        {job && (
                          <span className="font-mono text-xs font-bold text-[var(--ink-soft)]">
                            WFH Used: {job.wfhDaysThisWeek || 0}/2 wk
                          </span>
                        )}
                      </div>
                      <h4 className="mt-2 text-sm font-black">
                        {career
                          ? `Clock Into ${career.company} from Your Apartment`
                          : 'No Active Engineering Job'}
                      </h4>
                      <p className="mt-1 text-xs text-[var(--ink-soft)]">
                        Hybrid policy allows 2 WFH days/week (plus 4 WFA passes) without commuting.
                      </p>
                      {job && (
                        <button
                          disabled={Boolean(workShift) || locationId !== 'home'}
                          onClick={() => {
                            startWorkShift('wfh');
                            setActiveModal(null);
                          }}
                          className="btn-press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#007AFF] py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
                        >
                          🏠 Start Remote WFH Shift Now
                        </button>
                      )}
                    </div>

                    {/* Queue Sim Timed Actions on Desk */}
                    <div className="rounded-3xl border border-black/8 bg-[var(--mist)] p-4 dark:border-white/10">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                        Queue Sim Action at Desk
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {installedComputer.def.actions.map((actId) => {
                          const act = ACTIONS[actId];
                          if (!act) return null;
                          return (
                            <button
                              key={actId}
                              onClick={() => {
                                enqueueAction(actId, {
                                  objectUid: installedComputer.placed.uid,
                                  pos: {
                                    x: installedComputer.placed.x,
                                    y: installedComputer.placed.y,
                                  },
                                });
                                setActiveModal(null);
                              }}
                              className="btn-press flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-left text-xs font-bold hover:bg-[#007AFF]/15 dark:bg-white/10"
                            >
                              <span className="truncate">
                                {act.emoji} {act.label.split('(')[0].trim()}
                              </span>
                              <span className="ml-1 shrink-0 font-mono text-[10px] text-[var(--ink-soft)]">
                                {act.durationMinutes}m
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Hardware Upgrade & Uninstall Section */}
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black">
                          🖥️ Upgrade or Uninstall Home Computer Hardware
                        </h3>
                        <p className="text-xs text-[var(--ink-soft)]">
                          Upgrading trades in your current {installedComputer.def.name} for 65% credit ({formatCurrency(Math.round(installedComputer.def.price * 0.65))}).
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          sellFurniture(installedComputer.placed.uid);
                        }}
                        className="btn-press flex items-center gap-1.5 rounded-2xl bg-rose-500/15 px-3.5 py-2 text-xs font-extrabold text-rose-600 hover:bg-rose-500/25 dark:text-rose-400"
                      >
                        <Trash2 className="size-3.5" />
                        <span>
                          Uninstall & Sell (+
                          {formatCurrency(Math.round(installedComputer.def.price * 0.65))})
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {computeCatalog.map((item) => {
                        const spec = COMPUTER_SPECS[item.id] || COMPUTER_SPECS.folding_desk;
                        const isCurrent = installedComputer.def.id === item.id;
                        const tradeIn = Math.round(installedComputer.def.price * 0.65);
                        const netCost = Math.max(0, item.price - tradeIn);
                        const canAfford = cash >= netCost;

                        return (
                          <div
                            key={item.id}
                            className={`flex flex-col justify-between rounded-2xl border p-3.5 ${isCurrent
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-black/8 bg-[var(--mist)] dark:border-white/10'
                              }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-2xl">{item.emoji}</span>
                                <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#007AFF]">
                                  {spec.yieldMult}× Yield
                                </span>
                              </div>
                              <h4 className="mt-2 text-xs font-black">{item.name}</h4>
                              <p className="mt-1 text-[10px] text-[var(--ink-soft)]">
                                {spec.chip} · {spec.memory}
                              </p>
                            </div>

                            <div className="mt-3 pt-2">
                              {isCurrent ? (
                                <span className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-emerald-500/20 py-1.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-300">
                                  <CheckCircle2 className="size-3.5" /> Installed
                                </span>
                              ) : (
                                <button
                                  disabled={!canAfford}
                                  onClick={() => installOrUpgradeHomeComputer(item.id)}
                                  className="btn-press flex w-full items-center justify-center gap-1 rounded-xl bg-[#007AFF] py-1.5 text-[11px] font-extrabold text-white disabled:opacity-45"
                                >
                                  <ArrowUpCircle className="size-3.5" />
                                  <span>
                                    {item.price > installedComputer.def.price ? 'Upgrade' : 'Swap'} ·{' '}
                                    {formatCurrency(netCost)}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
