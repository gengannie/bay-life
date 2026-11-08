import {
  NpcConversationTopic,
  NpcDialogueExchange,
  NpcGiftDef,
  NpcInteractionDef,
  NpcInteractionKind,
  NpcMilestoneDef,
  RelationshipStatus,
} from '../types/game';

export interface RelationshipTierInfo {
  status: RelationshipStatus;
  minScore: number;
  emoji: string;
  color: string;
  perkSummary: string;
}

export const RELATIONSHIP_TIERS: RelationshipTierInfo[] = [
  {
    status: 'Stranger',
    minScore: 0,
    emoji: '👋',
    color: '#64748B',
    perkSummary: 'Open to intros & LinkedIn connects',
  },
  {
    status: 'LinkedIn 1st',
    minScore: 15,
    emoji: '🔗',
    color: '#0284C7',
    perkSummary: 'Unlocks Coffee Walks & 20% Tier 1 Milestone',
  },
  {
    status: 'Coffee Buddy',
    minScore: 30,
    emoji: '☕',
    color: '#0EA5E9',
    perkSummary: 'Unlocks Whiteboard Architecture & Deep Dives',
  },
  {
    status: 'Inner Circle',
    minScore: 50,
    emoji: '🌟',
    color: '#6366F1',
    perkSummary: 'Unlocks Warm Referrals, VC Intros & Tier 2 Milestone',
  },
  {
    status: 'Co-Founder Material',
    minScore: 70,
    emoji: '🦄',
    color: '#8B5CF6',
    perkSummary: 'Unlocks Co-Founder Syncs & Tier 3 Equity Milestone',
  },
  {
    status: 'Partner',
    minScore: 85,
    emoji: '💖',
    color: '#EC4899',
    perkSummary: 'Deep Bay Area Partner Synergy & Romance Chemistry',
  },
  {
    status: 'Ride-or-Die',
    minScore: 95,
    emoji: '👑',
    color: '#F59E0B',
    perkSummary: 'Max Tier · Legendary Bay Area Power Couple / Co-Founder Bond',
  },
];

export function getRelationshipTierInfo(score: number): RelationshipTierInfo {
  let current = RELATIONSHIP_TIERS[0];
  for (const tier of RELATIONSHIP_TIERS) {
    if (score >= tier.minScore) {
      current = tier;
    }
  }
  return current;
}

export const NPC_INTERACTIONS: NpcInteractionDef[] = [
  {
    id: 'linkedin',
    label: 'DM / LinkedIn Sync',
    shortLabel: 'DM Sync',
    emoji: '🔗',
    category: 'professional',
    minScore: 0,
    energyCost: 4,
    baseScoreDelta: 5,
    trustDelta: 4,
    romanceDelta: 1,
    karmaBoost: 2,
    accent: '#0284C7',
    description: 'Trade notes on Bay Area tech news, arXiv drops, and mutual connections.',
  },
  {
    id: 'coffeeChat',
    label: 'Blue Bottle Coffee Walk',
    shortLabel: 'Coffee Chat',
    emoji: '☕',
    category: 'social',
    minScore: 0,
    energyCost: 6,
    cashCost: 14,
    baseScoreDelta: 8,
    trustDelta: 6,
    romanceDelta: 3,
    skillBoost: { skill: 'charisma', amount: 0.12 },
    karmaBoost: 3,
    moodletId: 'philz_buzz',
    accent: '#0EA5E9',
    description: 'Walk through Hayes Valley or SoMa over single-origin pour-overs.',
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard System Design',
    shortLabel: 'Whiteboard',
    emoji: '🧠',
    category: 'professional',
    minScore: 15,
    energyCost: 10,
    baseScoreDelta: 9,
    trustDelta: 9,
    romanceDelta: 1,
    skillBoost: { skill: 'systemDesign', amount: 0.18 },
    performanceBoost: 5,
    karmaBoost: 4,
    accent: '#6366F1',
    description: 'Jam on distributed consensus, GPU inference routing, and L6+ architecture.',
  },
  {
    id: 'pitch',
    label: 'Pitch Startup Thesis',
    shortLabel: 'Startup Pitch',
    emoji: '🦄',
    category: 'venture',
    minScore: 20,
    energyCost: 10,
    baseScoreDelta: 9,
    trustDelta: 8,
    romanceDelta: 2,
    skillBoost: { skill: 'hustle', amount: 0.16 },
    startupBoost: 4,
    karmaBoost: 4,
    accent: '#F97316',
    description: 'Pressure-test your YC product roadmap, GTM wedge, and Stripe MRR velocity.',
  },
  {
    id: 'flirt',
    label: 'Golden Hour Wine & Vibe',
    shortLabel: 'Vibe Check',
    emoji: '❤️',
    category: 'romance',
    minScore: 25,
    energyCost: 8,
    cashCost: 35,
    baseScoreDelta: 10,
    trustDelta: 5,
    romanceDelta: 12,
    skillBoost: { skill: 'charisma', amount: 0.15 },
    karmaBoost: 4,
    moodletId: 'dolores_sun',
    accent: '#EC4899',
    description: 'Natural wine in the Mission or sunset views at Dolores Park.',
  },
  {
    id: 'deepDive',
    label: 'Late-Night AI Research Jam',
    shortLabel: 'AI Deep Dive',
    emoji: '🔬',
    category: 'professional',
    minScore: 30,
    energyCost: 12,
    baseScoreDelta: 11,
    trustDelta: 10,
    romanceDelta: 3,
    skillBoost: { skill: 'aiResearch', amount: 0.22 },
    startupBoost: 5,
    karmaBoost: 5,
    accent: '#8B5CF6',
    description: 'Pair-debug custom CUDA kernels and post-training RLHF evals.',
  },
  {
    id: 'hangout',
    label: 'VIP Bay Area Hangout',
    shortLabel: 'VIP Hangout',
    emoji: '🥂',
    category: 'social',
    minScore: 35,
    energyCost: 10,
    cashCost: 48,
    baseScoreDelta: 12,
    trustDelta: 9,
    romanceDelta: 9,
    karmaBoost: 6,
    accent: '#10B981',
    description: 'Hit their favorite neighborhood spot for off-the-record Bay Area alpha.',
  },
  {
    id: 'referral',
    label: 'Executive Backchannel & Referral',
    shortLabel: 'Backchannel',
    emoji: '🏛️',
    category: 'professional',
    minScore: 50,
    energyCost: 12,
    baseScoreDelta: 11,
    trustDelta: 12,
    romanceDelta: 2,
    performanceBoost: 10,
    karmaBoost: 7,
    accent: '#059669',
    description: 'Get direct L6/L7 promo packet advocacy or warm Sand Hill VC backchanneling.',
  },
  {
    id: 'cofounderSync',
    label: 'Co-Founder & Vision Lock-In',
    shortLabel: 'Co-Founder Sync',
    emoji: '🚀',
    category: 'venture',
    minScore: 65,
    energyCost: 14,
    baseScoreDelta: 14,
    trustDelta: 14,
    romanceDelta: 8,
    startupBoost: 8,
    karmaBoost: 10,
    moodletId: 'shipped_high',
    accent: '#D97706',
    description: 'Align on long-term equity, F.I.R.E. sovereignty, and building generational tech.',
  },
];

export const NPC_INTERACTION_BY_ID: Record<NpcInteractionKind, NpcInteractionDef> =
  NPC_INTERACTIONS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<NpcInteractionKind, NpcInteractionDef>
  );

export function getNpcDialogueExchange(
  npcId: string,
  kind: NpcInteractionKind,
  _score: number,
  count: number
): NpcDialogueExchange {
  const byKind: Record<NpcInteractionKind, NpcDialogueExchange[]> = {
    linkedin: [
      {
        playerLine: 'Saw your thread on inference scaling laws—super sharp breakdown.',
        npcReply: 'Appreciate that! Half of X missed the memory-bandwidth bottleneck.',
        contextTag: 'LinkedIn Sync',
      },
      {
        playerLine: 'Quick ping—how is the team holding up before the quarterly roadmap lock?',
        npcReply: 'Honestly chaotic, but we are shipping our best work right now.',
        contextTag: 'DM Check-In',
      },
    ],
    coffeeChat: [
      {
        playerLine: 'Grabbed us two iced oat New Orleans coffees. Walk through Hayes?',
        npcReply: 'Best move all week. Stepping away from the monitor always unlocks clarity.',
        contextTag: 'Coffee Walk',
      },
      {
        playerLine: 'Real talk over espresso: Golden Handcuffs or full founder leap?',
        npcReply: 'Once your runway covers 3 years of burn, betting on yourself is undefeated.',
        contextTag: 'Coffee Chat',
      },
    ],
    whiteboard: [
      {
        playerLine: 'What if we shard the KV-cache across NVLink rings and bypass the coordinator?',
        npcReply: 'Wait—draw that out. That cuts p99 tail latency by almost 40%.',
        contextTag: 'Architecture Jam',
      },
    ],
    pitch: [
      {
        playerLine: 'Our developer retention hit 78% D30 and Stripe MRR is compounding weekly.',
        npcReply: 'That retention curve is top-decile YC. Keep shipping—VCs will chase you.',
        contextTag: 'Product Pitch',
      },
    ],
    flirt: [
      {
        playerLine: 'Rule for the next hour: zero talk about OKRs, GPUs, or promo packets.',
        npcReply: 'Deal. Watching the fog roll over the hills with you beats any launch party.',
        contextTag: 'Golden Hour',
      },
    ],
    deepDive: [
      {
        playerLine: 'Brought my laptop—let’s benchmark the speculative decoding kernel live.',
        npcReply: '3.2x tokens/sec speedup! This is why I love jamming with you.',
        contextTag: 'AI Research Jam',
      },
    ],
    hangout: [
      {
        playerLine: 'Pulled up to your favorite spot—first round is on me.',
        npcReply: 'You always bring the best energy. Best part of my week in the Bay.',
        contextTag: 'Bay Hangout',
      },
    ],
    referral: [
      {
        playerLine: 'Would love your honest read on my staff promo packet / VC partner intro.',
        npcReply: 'Already sent a glowing backchannel note for you. You have my full stamp.',
        contextTag: 'Warm Backchannel',
      },
    ],
    cofounderSync: [
      {
        playerLine: 'Whatever we build next in the Bay, I want you in the foxhole with me.',
        npcReply: '100% locked in. High trust, zero ego—we can build something iconic.',
        contextTag: 'Vision Sync',
      },
    ],
  };

  const list = byKind[kind] || byKind.linkedin;
  const picked = list[(count + npcId.length) % list.length];
  return picked;
}

const DEFAULT_MILESTONE_DEFS: Array<Omit<NpcMilestoneDef, 'id' | 'npcId'>> = [
  {
    threshold: 20,
    tierStatus: 'LinkedIn 1st',
    title: 'Warm Bay Area Insider',
    emoji: '🔗',
    description: 'Break the ice and enter their trusted Bay Area tech DMs.',
    unlockMessage: 'Always down to trade notes—hit me up anytime!',
    perkLabel: '+$1,500 Insider Alpha & +10⚡ Karma',
    rewardKarma: 10,
    rewardCash: 1500,
    rewardJobPerformance: 6,
  },
  {
    threshold: 45,
    tierStatus: 'Inner Circle',
    title: 'Inner Circle Backchannel',
    emoji: '🌟',
    description: 'Trusted confidant for promo committee alpha and private founder dinners.',
    unlockMessage: 'I put your name at the top of our private invite list.',
    perkLabel: '+$4,000 Cash, +8% Startup MVP & +18⚡ Karma',
    rewardKarma: 18,
    rewardCash: 4000,
    rewardStartupProgress: 8,
    rewardJobPerformance: 10,
  },
  {
    threshold: 70,
    tierStatus: 'Co-Founder Material',
    title: 'Co-Founder & Term Sheet Conviction',
    emoji: '🦄',
    description: 'High-conviction alliance that accelerates both career equity and venture scale.',
    unlockMessage: 'If you ever spin out or raise, count me in on day zero.',
    perkLabel: '+$10,000 Cash, +$6,000 RSU & +15% Startup MVP',
    rewardKarma: 28,
    rewardCash: 10000,
    rewardRsu: 6000,
    rewardStartupProgress: 15,
  },
  {
    threshold: 90,
    tierStatus: 'Ride-or-Die',
    title: 'Ride-or-Die Bay Area Legend',
    emoji: '👑',
    description: 'Unbreakable lifelong bond across Silicon Valley startups, wealth, and life.',
    unlockMessage: 'From garage prototypes to F.I.R.E. freedom—we made it in the Bay.',
    perkLabel: '+$25,000 Cash, +$12,000 RSU & +40⚡ Karma',
    rewardKarma: 40,
    rewardCash: 25000,
    rewardRsu: 12000,
    rewardStartupProgress: 20,
    moodletId: 'shipped_high',
  },
];

export function getNpcMilestones(npcId: string): NpcMilestoneDef[] {
  return DEFAULT_MILESTONE_DEFS.map((m, idx) => ({
    ...m,
    id: `${npcId}_ms_${idx + 1}`,
    npcId,
  }));
}

export function getTopicsForNpc(npcId: string): NpcConversationTopic[] {
  return [
    {
      id: `${npcId}_topic_1`,
      npcId,
      title: 'The Golden Handcuffs Dilemma',
      emoji: '🔓',
      category: 'career',
      minScore: 0,
      promptText:
        'Half my team is resting-and-vesting for their next RSU cliff, and the other half wants to quit for YC. Where is your head at?',
      choices: [
        {
          label: 'Stack RSUs & Coast to F.I.R.E.',
          emoji: '🔥',
          playerText:
            'Compound liquid net worth and index funds until work becomes 100% optional.',
          npcResponse:
            'Smartest play in the Valley. Financial sovereignty gives you infinite leverage.',
          scoreDelta: 10,
          trustDelta: 9,
          skillCheck: { skill: 'investing', level: 2 },
          rewardKarma: 8,
          rewardCash: 1200,
          rewardSkill: { skill: 'investing', amount: 0.2 },
        },
        {
          label: 'Build the MVP at Night & Break Free',
          emoji: '🚀',
          playerText:
            'Use the W-2 paycheck as non-dilutive seed capital while shipping our startup MVP.',
          npcResponse: 'Love that hustle. Once Stripe MRR hits escape velocity, you never look back.',
          scoreDelta: 11,
          trustDelta: 10,
          skillCheck: { skill: 'hustle', level: 2 },
          rewardKarma: 8,
          rewardStartup: 6,
          rewardSkill: { skill: 'hustle', amount: 0.2 },
        },
        {
          label: 'Speedrun Staff Engineer First',
          emoji: '🏛️',
          playerText: 'Lock in L6+ architecture cred and executive network before making the leap.',
          npcResponse: 'Having Staff IC credentials opens every door on Sand Hill Road.',
          scoreDelta: 9,
          trustDelta: 8,
          rewardKarma: 6,
          rewardPerformance: 8,
        },
      ],
    },
    {
      id: `${npcId}_topic_2`,
      npcId,
      title: 'Next-Gen AI Architecture Bet',
      emoji: '🧠',
      category: 'tech',
      minScore: 25,
      promptText:
        'If we had 512 H100s for a weekend sprint, what wedge would you bet everything on?',
      choices: [
        {
          label: 'Autonomous Coding & Infra Agents',
          emoji: '⚡',
          playerText: 'Self-healing repo agents that verify builds, tests, and PRs end-to-end.',
          npcResponse: 'Every enterprise CTO in the Bay would sign a six-figure pilot tomorrow.',
          scoreDelta: 12,
          trustDelta: 11,
          skillCheck: { skill: 'coding', level: 3 },
          rewardKarma: 10,
          rewardStartup: 8,
          rewardSkill: { skill: 'aiResearch', amount: 0.25 },
        },
        {
          label: 'Low-Latency Edge Inference Engine',
          emoji: '🦀',
          playerText: 'Sub-20ms local model routing on Apple Silicon and consumer hardware.',
          npcResponse: 'Zero cloud GPU burn and instant UX—that is a killer technical moat.',
          scoreDelta: 12,
          trustDelta: 10,
          skillCheck: { skill: 'systemDesign', level: 3 },
          rewardKarma: 10,
          rewardCash: 2000,
          rewardSkill: { skill: 'systemDesign', amount: 0.25 },
        },
        {
          label: 'Human-Centered Creative Copilot',
          emoji: '✨',
          playerText: 'Fluid multimodal canvas that feels like magic instead of a chatbot.',
          npcResponse: 'Taste and craft are the ultimate differentiators now.',
          scoreDelta: 10,
          romanceDelta: 6,
          rewardKarma: 8,
          rewardSkill: { skill: 'charisma', amount: 0.2 },
        },
      ],
    },
    {
      id: `${npcId}_topic_3`,
      npcId,
      title: 'Life Beyond the Bay Area Grind',
      emoji: '🌅',
      category: 'romance',
      minScore: 50,
      promptText:
        'After we hit our number and close the laptop for good—what does the dream week actually look like?',
      choices: [
        {
          label: 'Big Sur Coastline & Zero Alarms',
          emoji: '🌊',
          playerText:
            'Morning espresso overlooking the Pacific, Porsche joyrides on Hwy 1, and building only for fun.',
          npcResponse: 'Sign me up right now. That is what true Bay Area freedom looks like.',
          scoreDelta: 14,
          trustDelta: 10,
          romanceDelta: 14,
          rewardKarma: 15,
          rewardCash: 3000,
          moodletId: 'golden_free',
        },
        {
          label: 'Angel Investing & Helping New Founders',
          emoji: '🦄',
          playerText: 'Writing first checks in Hayes Valley coffee shops and backing bold builders.',
          npcResponse: 'Paying it forward without any board pressure—the ultimate post-exit life.',
          scoreDelta: 13,
          trustDelta: 13,
          romanceDelta: 8,
          rewardKarma: 15,
          rewardStartup: 10,
        },
      ],
    },
  ];
}

export function getAvailableTopicsForNpc(
  npcId: string,
  score: number,
  completedTopicIds: string[]
): NpcConversationTopic[] {
  return getTopicsForNpc(npcId).filter(
    (t) => score >= t.minScore && !completedTopicIds.includes(t.id)
  );
}

export const NPC_GIFTS: NpcGiftDef[] = [
  {
    id: 'gift_ceremonial_matcha',
    name: 'Uji Ceremonial Matcha Tin',
    emoji: '🍵',
    price: 45,
    description: 'First-harvest Kyoto ceremonial grade matcha whisked to perfection.',
    baseScoreDelta: 8,
    trustDelta: 7,
    romanceDelta: 6,
    favoriteOfNpcIds: ['npc_maya', 'npc_chloe'],
    backpackItemId: 'item_matcha_tin',
  },
  {
    id: 'gift_tartine_box',
    name: 'Tartine Morning Bun & Croissant Box',
    emoji: '🥐',
    price: 38,
    description: 'Warm, flaky Mission District pastries skipped straight past the line.',
    baseScoreDelta: 7,
    trustDelta: 6,
    romanceDelta: 7,
    favoriteOfNpcIds: ['npc_chloe', 'npc_priya'],
  },
  {
    id: 'gift_hhkb_keeb',
    name: 'Custom Lubed Mechanical Keyboard',
    emoji: '⌨️',
    price: 220,
    description: 'Gasket-mounted aluminum 65% board with Holy Panda tactile switches.',
    baseScoreDelta: 12,
    trustDelta: 11,
    romanceDelta: 6,
    favoriteOfNpcIds: ['npc_priya', 'npc_mateo', 'npc_maya'],
  },
  {
    id: 'gift_napa_cab',
    name: 'Stag’s Leap Napa Reserve Bottle',
    emoji: '🍷',
    price: 165,
    description: 'Iconic Napa Valley Cabernet for celebrating term sheets and promos.',
    baseScoreDelta: 11,
    trustDelta: 9,
    romanceDelta: 12,
    favoriteOfNpcIds: ['npc_lucas', 'npc_chloe'],
  },
  {
    id: 'gift_vinyl_press',
    name: 'Rare Japanese Ambient Vinyl LP',
    emoji: '💿',
    price: 95,
    description: 'Audiophile pressing for late-night coding flow or rooftop sets.',
    baseScoreDelta: 9,
    trustDelta: 8,
    romanceDelta: 9,
    favoriteOfNpcIds: ['npc_mateo', 'npc_devon'],
  },
  {
    id: 'gift_titanium_espresso',
    name: 'Fellow Stagg EKG Pro Kettle',
    emoji: '🫖',
    price: 195,
    description: 'Matte black precision pour-over kettle for SF third-wave coffee purists.',
    baseScoreDelta: 11,
    trustDelta: 10,
    romanceDelta: 8,
    favoriteOfNpcIds: ['npc_devon', 'npc_lucas'],
  },
];

export const NPC_GIFT_BY_ID: Record<string, NpcGiftDef> = NPC_GIFTS.reduce(
  (acc, g) => {
    acc[g.id] = g;
    return acc;
  },
  {} as Record<string, NpcGiftDef>
);

export const NPC_GIFT_REACTIONS: Record<string, { favorite: string; standard: string }> = {
  npc_maya: {
    favorite: 'Wait—how did you know I was running low?! This is top-tier brain fuel for my next paper.',
    standard: 'So thoughtful! Bringing this to the lab today.',
  },
  npc_devon: {
    favorite: '10/10 founder intuition. You just leveled up to the top of my speed dial.',
    standard: 'Love this—super clean pick. Appreciate you!',
  },
  npc_priya: {
    favorite: 'Okay, this is elite engineering taste. Best surprise of the sprint!',
    standard: 'Thank you!! Huge morale boost after promo committee reviews.',
  },
  npc_lucas: {
    favorite: 'Impeccable taste. Let’s open this on the patio in Woodside after your next milestone.',
    standard: 'Very generous of you—thank you!',
  },
  npc_chloe: {
    favorite: 'The packaging, the craft, the vibe—you seriously know my aesthetic by heart.',
    standard: 'Aw, thank you! This totally made my afternoon.',
  },
  npc_mateo: {
    favorite: 'No way!! This goes straight into the booth tonight. Absolute legend!',
    standard: 'Yo, thank you! Immaculate vibes.',
  },
};
