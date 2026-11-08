export type NeedKey = 'hunger' | 'energy' | 'hygiene' | 'bladder' | 'fun' | 'social';

export type SkillKey =
  | 'coding'
  | 'systemDesign'
  | 'aiResearch'
  | 'charisma'
  | 'fitness'
  | 'cooking'
  | 'hustle'
  | 'investing';

export type Gender = 'f' | 'm' | 'nb';

export interface SimAppearance {
  body: Gender;
  skin: string;
  hair: 'lowcut' | 'textured' | 'bun' | 'parted' | 'waves' | 'bob' | 'curly';
  hairColor: string;
  outfit: 'patagonia' | 'ychoodie' | 'turtleneck' | 'arcteryx' | 'founderlinen' | 'stanford';
  topColor: string;
  accessory: 'none' | 'glasses' | 'airpodsmax' | 'visionpro';
}

export type OriginId = 'newgrad' | 'ycdropout' | 'nepo' | 'h1bhustler';
export type AspirationId =
  | 'seriesAUnicorn'
  | 'staffPrincipal'
  | 'paloAltoHome'
  | 'sfConnector'
  | 'indieLegend';

export type TraitId =
  | 'tenXEngineer'
  | 'coffeeSnob'
  | 'exFounder'
  | 'leetcodeGrinder'
  | 'biohacker'
  | 'blindPoster';

export interface SimProfile {
  name: string;
  handle: string;
  appearance: SimAppearance;
  traits: TraitId[];
  aspiration: AspirationId;
  origin: OriginId;
}

export type NeedsState = Record<NeedKey, number>;
export type SkillsState = Record<SkillKey, number>;

export interface PlacedObject {
  uid: string;
  objectId: string;
  x: number;
  y: number;
  rot?: number;
}

export interface FurnitureDef {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  category: 'sleep' | 'compute' | 'kitchen' | 'bath' | 'comfort' | 'fitness' | 'power' | 'decor';
  price: number;
  quality: number; // 1 to 5
  footprint: [number, number];
  color: string;
  accentColor: string;
  actions: string[]; // action IDs available on this object
  powerBackup?: boolean;
  requiresPower?: boolean;
}

export interface ActionDef {
  id: string;
  label: string;
  emoji: string;
  durationMinutes: number;
  cost?: number;
  earn?: [number, number];
  needsDelta: Partial<NeedsState>;
  skillGain?: { skill: SkillKey; amount: number };
  startupProgress?: number;
  requiresPower?: boolean;
  requiresPantry?: number;
  moodletGranted?: string;
  category: 'care' | 'work' | 'skill' | 'social' | 'fun' | 'hustle';
  speechBubble?: string;
}

export interface QueuedAction {
  uid: string;
  actionId: string;
  label: string;
  emoji: string;
  totalMinutes: number;
  elapsedMinutes: number;
  targetObjectUid?: string;
  targetStationId?: string;
  targetPos?: { x: number; y: number };
  started: boolean;
  auto?: boolean;
}

export interface MoodletDef {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  delta: number; // e.g. +20 or -20
  durationMinutes: number;
  tone: 'good' | 'bad' | 'neutral';
}

export interface ActiveMoodlet {
  id: string;
  expiresAt: number; // game time in minutes
}

export type WorkMode = 'office' | 'wfh' | 'wfa';
export type WeekdayAttendance = 'none' | 'office' | 'wfh' | 'wfa' | 'missed';

export interface WorkProjectDef {
  id: string;
  careerId?: string; // optional career affinity or cross-company
  title: string;
  codeName: string;
  emoji: string;
  category: 'infra' | 'ai' | 'product' | 'venture';
  desc: string;
  deliverableName: string;
  primarySkill: SkillKey;
  rewardCash: number;
  rewardRsu: number;
  promoPerfBoost: number;
  accent: string;
}

export interface WorkExplorationTaskDef {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  energyCost: number;
  projectProgressGain: number;
  performanceGain: number;
  skill: SkillKey;
  skillGain: number;
  requiresOffice?: boolean;
  badgeLabel: string;
}

export type TechTreeBranchId = 'cloud' | 'frontier_ai' | 'silicon_os' | 'founder_vc';

export type TechNodeId =
  | 'node_git_monorepo'
  | 'node_distributed_rpc'
  | 'node_spanner_sharding'
  | 'node_borg_orchestrator'
  | 'node_pytorch_autodiff'
  | 'node_cuda_triton'
  | 'node_rlhf_posttrain'
  | 'node_agi_scaling_laws'
  | 'node_cxx_memory'
  | 'node_metal_shaders'
  | 'node_ane_silicon'
  | 'node_spatial_os'
  | 'node_yc_pmf'
  | 'node_growth_loops'
  | 'node_cap_table_alpha'
  | 'node_midas_kingmaker';

export interface TechTreeNodeDef {
  id: TechNodeId;
  branch: TechTreeBranchId;
  tier: 1 | 2 | 3 | 4;
  title: string;
  codeName: string;
  emoji: string;
  desc: string;
  perkSummary: string;
  prereqNodes: TechNodeId[];
  requiredSkills: Array<{ skill: SkillKey; level: number }>;
  karmaCost: number;
  unlocksCareerId?: string;
  unlocksLevelLabel?: string;
  accent: string;
}

export interface CareerEntryRequirements {
  selectivityLabel: string;
  difficultyTier: 'Standard' | 'Selective' | 'Ultra-Selective';
  interviewLoopTitle: string;
  interviewEnergyCost: number;
  requiredSkills: Array<{ skill: SkillKey; level: number }>;
  requiredTechNodes: TechNodeId[];
  minDeliverables?: number;
}

export interface CareerLevel {
  level: number;
  code: string; // e.g., "L3", "L4", "L5", "L6", "L7", "L8"
  title: string;
  baseSalary: number; // annual USD
  rsuAnnual: number; // annual USD
  shiftPay: number; // per shift cash payout
  rsuPerShift: number; // per shift RSU grant
  requiredSkill: { skill: SkillKey; level: number };
  secondarySkill?: { skill: SkillKey; level: number };
  requiredTechNode?: TechNodeId; // specialized tech tree node required for this level
  minShiftsForPromo?: number; // minimum shifts at current level before promo packet
  requiredDeliverables?: number; // completed work exploration deliverables required for promo
  scopeSummary?: string; // what this level actually owns / explores
}

export interface CareerDef {
  id: string;
  company: string;
  name: string;
  emoji: string;
  district: 'South Bay' | 'San Francisco' | 'Peninsula';
  locationId: string;
  tagline: string;
  accent: string;
  shiftStartHour: number; // e.g. 9 (9:00 AM)
  shiftEndHour: number; // e.g. 17 (5:00 PM)
  entryRequirements?: CareerEntryRequirements;
  levels: CareerLevel[];
}

export type WorkToneId = 'deepWork' | 'tenXGrind' | 'watercooler' | 'alignSkip' | 'restAndVest';

export interface JobState {
  careerId: string;
  levelIndex: number; // 0-based index into CareerDef.levels
  performance: number; // 0 to 100
  shiftsCompleted: number;
  shiftsAtLevel?: number;
  deliverablesCompleted?: number;
  activeProjectId?: string;
  projectProgress?: number; // 0 to 100
  completedProjects?: string[];
  officeDaysThisWeek?: number; // 3 required per week for Hybrid Policy
  wfhDaysThisWeek?: number; // 2 remote WFH days OK per week
  wfaDaysRemaining?: number; // 4 WFA (Work From Anywhere) days bank
  weeklyAttendance?: WeekdayAttendance[]; // [Mon, Tue, Wed, Thu, Fri]
  lastWorkDayLogged?: number;
  rtoCompliant?: boolean;
  autoWork: boolean;
  preferredCommute: CommuteModeId;
}

export interface ActiveWorkShift {
  startedAt: number;
  endsAt: number;
  totalMinutes: number;
  elapsedMinutes: number;
  tone: WorkToneId;
  mode?: WorkMode;
  workLocationId?: string;
  dilemmaTriggered?: boolean;
}

export type CommuteModeId = 'caltrain' | 'gbus' | 'waymo' | 'uber' | 'tesla';

export type VehicleId = 'prius' | 'tesla' | 'taycan';

export interface VehicleDef {
  id: VehicleId;
  name: string;
  shortName: string;
  brand: string;
  emoji: string;
  tagline: string;
  price: number;
  speedTimeMult: number; // multiplier on personal car commute time
  baseMinutes: number;
  moodletId: string;
  moodBonusLabel: string;
  autopilotTier: string;
  tier?: string;
  tierLabel?: string;
  joyrideLabel?: string;
  joyrideReward: {
    fun: number;
    energy: number;
    karma: number;
    label: string;
  };
  accent: string;
}

export interface BackpackItemDef {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  category: 'consumable' | 'edc';
  price: number;
  consumable: boolean;
  needsDelta?: Partial<NeedsState>;
  skillGain?: { skill: SkillKey; amount: number };
  startupDelta?: number;
  cashBonus?: number;
  karmaBonus?: number;
  moodletId?: string;
  equipAccessory?: SimAppearance['accessory'];
  passiveBadge?: string;
  passiveBoost?: string;
  powerBackupPortable?: boolean;
  useLabel: string;
}

export interface InventoryEntry {
  itemId: string;
  kind: 'item' | 'furniture';
  quantity: number;
}

export interface CommuteModeDef {
  id: CommuteModeId;
  name: string;
  emoji: string;
  tagline: string;
  baseFare: number;
  durationMinutes: number;
  requiresCar?: boolean;
  requiresBigTech?: boolean;
  moodletId?: string;
}

export interface ActiveTravel {
  from: string;
  to: string;
  mode: CommuteModeId;
  startedAt: number;
  arriveAt: number;
  totalMinutes: number;
  fare: number;
  autoStartShiftOnArrival?: boolean;
}

export interface VenueStation {
  id: string;
  label: string;
  emoji: string;
  x: number;
  y: number;
  color: string;
  accent: string;
  kind: 'desk' | 'coffee' | 'stage' | 'gym' | 'park' | 'bar' | 'lounge' | 'food';
  actionIds: string[];
}

export interface LocationDef {
  id: string;
  name: string;
  shortName: string;
  area: string;
  district: 'San Francisco' | 'Peninsula' | 'South Bay' | 'East Bay';
  emoji: string;
  tagline: string;
  description: string;
  mapCoords: { x: number; y: number }; // percentage 0..100 on Bay Area map
  floorStyle: 'wood' | 'concrete' | 'grass' | 'marble' | 'club' | 'campus';
  accentColor: string;
  vibes: string[];
  stations: VenueStation[];
}

export interface HomePerkBadge {
  emoji: string;
  label: string;
  desc: string;
  boost?: string;
}

export interface HomeBonuses {
  needDecayMult: number; // < 1.0 slows need drain
  sleepRecoveryMult: number; // > 1.0 boosts sleep/care recovery
  skillXpMult: number; // > 1.0 boosts home skill XP
  startupMult: number; // > 1.0 boosts home startup progress
  commuteTimeMult: number; // < 1.0 speeds up commutes from this home
  ambientMoodletId: string;
  maxVisitors: number; // 1 to 3 NPCs visiting/around building
  builtInPowerBackup?: boolean; // built-in luxury building backup power
}

export interface HomeArchitecture {
  styleName: string;
  windowType:
    | 'garage_transom'
    | 'ranch_slider'
    | 'edwardian_bay'
    | 'soma_curtainwall'
    | 'pac_heights_terrace';
  rightWallFeature:
    | 'breaker_box'
    | 'founder_whiteboard'
    | 'vinyl_alcove'
    | 'acoustic_slats'
    | 'marble_fireplace';
  wallLeftGrad: [string, string];
  wallRightGrad: [string, string];
  wallLeftNight: [string, string];
  wallRightNight: [string, string];
  trimColor: string;
  floorPrimary: string;
  floorSecondary: string;
  rugColor?: string;
  rugAccent?: string;
  ambientGlow: string;
}

export interface HomeDef {
  id: string;
  name: string;
  shortName?: string;
  area: string;
  district: 'San Francisco' | 'Peninsula' | 'South Bay';
  tier: 1 | 2 | 3 | 4 | 5;
  tierLabel: string;
  emoji: string;
  tagline: string;
  weeklyRent: number;
  buyPrice: number;
  purchasePrice?: number;
  gridSize: number;
  floorStyle: 'wood' | 'concrete' | 'marble';
  mapCoords: { x: number; y: number };
  commuteSummary: string;
  starterMoney: number;
  starterObjects: Array<{ objectId: string; x: number; y: number }>;
  perks: HomePerkBadge[];
  bonuses: HomeBonuses;
  architecture: HomeArchitecture;
}

export interface NPCDef {
  id: string;
  name: string;
  handle: string;
  role: string;
  company: string;
  bio: string;
  favoriteSpot: string; // locationId
  appearance: SimAppearance;
  traits: string[];
  greeting: string;
}

export type RelationshipStatus =
  | 'Stranger'
  | 'LinkedIn 1st'
  | 'Coffee Buddy'
  | 'Co-Founder Material'
  | 'Partner';

export interface RelationshipState {
  npcId: string;
  score: number; // 0 to 100
  status: RelationshipStatus;
  lastInteractionDay: number;
  messages: Array<{ from: 'npc' | 'me'; text: string; time: number }>;
}

export interface WishItem {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  karmaReward: number;
  kind: 'skill' | 'visit' | 'action' | 'social' | 'earn' | 'startup';
  targetKey?: string;
  targetValue: number;
  progress: number;
}

export type RewardPerkBranchId = 'engineering' | 'career' | 'wealth' | 'biohack';

export interface RewardPerkBranchDef {
  id: RewardPerkBranchId;
  label: string;
  shortLabel: string;
  emoji: string;
  accent: string;
  tagline: string;
}

export interface RewardPerkDef {
  id: string;
  branch: RewardPerkBranchId;
  tier: 1 | 2 | 3 | 4;
  codeName: string;
  name: string;
  emoji: string;
  cost: number; // karma points
  shortEffect: string;
  desc: string;
  prereqId?: string;
  accent: string;
}

export interface DilemmaChoice {
  label: string;
  emoji: string;
  skillCheck?: { skill: SkillKey; difficulty: number };
  successText: string;
  failText?: string;
  cashDelta?: number;
  rsuDelta?: number;
  performanceDelta?: number;
  startupDelta?: number;
  moodletId?: string;
  needsDelta?: Partial<NeedsState>;
}

export interface InteractiveEvent {
  id: string;
  title: string;
  category: 'work' | 'bayArea' | 'startup' | 'grid';
  emoji: string;
  description: string;
  choices: DilemmaChoice[];
}

export interface StartupState {
  name: string;
  tagline: string;
  stage: 'Ideation' | 'Weekend Prototype' | 'YC Batch' | 'Seed Funded' | 'Series A Unicorn';
  productProgress: number; // 0 to 100
  users: number;
  mrr: number; // monthly recurring revenue (paid out weekly/4)
  valuation: number;
  ycAccepted: boolean;
  fundedAmount: number;
}

export interface NoticeItem {
  id: string;
  text: string;
  emoji: string;
  tone: 'info' | 'good' | 'bad' | 'cash';
  time: number;
}

export type WeatherKind = 'sunny' | 'foggy' | 'breezy' | 'rain';

export type MarketTicker = 'QQQX' | 'NVDAX' | 'GOGL' | 'FRUT' | 'AI3X' | 'SGOV';

export type MarketRegime =
  | 'AI Supercycle'
  | 'Rate Cut Rally'
  | 'Earnings Volatility'
  | 'Sector Rotation'
  | 'Macro Jitters';

export interface MarketAssetDef {
  ticker: MarketTicker;
  name: string;
  subtitle: string;
  emoji: string;
  sector:
    | 'Index ETF'
    | 'AI Compute'
    | 'Cloud & Search'
    | 'Consumer Tech'
    | '3x Leveraged'
    | 'Treasury Yield';
  basePrice: number;
  volatility: number; // daily volatility factor
  drift: number; // average daily drift
  dailyDividendYield: number; // daily dividend/yield ratio (e.g. 0.002 = 0.2%/day)
  color: string;
  desc: string;
}

export interface StockHolding {
  shares: number;
  avgCost: number;
}

export type CashFlowInflowKey = 'salary' | 'rsu' | 'startup' | 'investments' | 'bounties';
export type CashFlowOutflowKey = 'rent' | 'living' | 'upgrades' | 'investments';

export type CashFlowCategory =
  | 'salary'
  | 'rsu'
  | 'startup'
  | 'investments'
  | 'bounties'
  | 'rent'
  | 'living'
  | 'upgrades'
  | 'trade';

export interface CashFlowEntry {
  id: string;
  time: number;
  day: number;
  label: string;
  emoji: string;
  amount: number; // positive = inflow, negative = outflow
  category: CashFlowCategory;
}

export interface FinanceState {
  marketPrices: Record<MarketTicker, number>;
  marketPrevClose: Record<MarketTicker, number>;
  marketHistory: Record<MarketTicker, number[]>;
  holdings: Record<MarketTicker, StockHolding>;
  marketRegime: MarketRegime;
  marketNews: string;
  dripEnabled: boolean;
  autoSellRsu: boolean;
  realizedGains: number;
  dividendsEarnedTotal: number;
  dividendsEarnedToday: number;
  inflowsBySource: Record<CashFlowInflowKey, number>;
  outflowsBySource: Record<CashFlowOutflowKey, number>;
  ledger: CashFlowEntry[];
}

export interface GameState {
  version: number;
  screen: 'title' | 'create' | 'play';
  view: 'live' | 'map' | 'buy';
  activeModal:
    | null
    | 'phone'
    | 'sim'
    | 'career'
    | 'commute'
    | 'wardrobe'
    | 'backpack'
    | 'garage'
    | 'computer'
    | 'account';
  phoneApp: 'messages' | 'levels' | 'wealth' | 'doordash' | 'startup' | 'zillow' | 'blind';
  simTab: 'needs' | 'skills' | 'relationships' | 'wishes' | 'perks' | 'backpack';

  sim: SimProfile;
  needs: NeedsState;
  skills: SkillsState;

  // Finances & Assets
  cash: number;
  vestedRsu: number; // in USD (tracks QQQ/Tech index fluctuations)
  unvestedRsu: number;
  portfolioValue: number; // index funds
  loanOwed: number; // YC SAFE / Student loan
  finance?: FinanceState;
  karma: number; // aspiration points (like blessings in Lagos Life)
  unlockedPerks: string[];
  unlockedTechNodes?: TechNodeId[];
  ownedCars: Array<CommuteModeId | VehicleId>;
  activeCarId?: VehicleId | null;
  ownedHomes: string[];
  pantryMeals: number;
  inventory: InventoryEntry[];

  // Time & Environment
  time: number; // minutes since Day 1 00:00 (starts Day 1 at 07:30 = 450)
  speed: 0 | 1 | 2 | 3;
  weather: WeatherKind;
  pgePowerOn: boolean; // Bay Area equivalent of NEPA light!
  pgeChangeAt: number;
  nightMode: 'auto' | 'light' | 'dark';
  soundOn: boolean;
  freeWill: boolean;

  // Location, Home & Movement
  homeId: string;
  locationId: string; // 'home' or venue id
  objects: PlacedObject[];
  pos: { x: number; y: number };
  targetPos: { x: number; y: number } | null;
  facing: 'se' | 'sw' | 'ne' | 'nw';
  queue: QueuedAction[];

  // Career, Commute & Startup
  job: JobState | null;
  workShift: ActiveWorkShift | null;
  travel: ActiveTravel | null;
  startup: StartupState;

  // Social, Mood & Events
  relationships: Record<string, RelationshipState>;
  moodlets: ActiveMoodlet[];
  wishes: WishItem[];
  activeEvent: InteractiveEvent | null;
  notices: NoticeItem[];
  lastToast: NoticeItem | null;

  // Rent & Progression Stats
  lastRentDay: number;
  rentOwed: number;
  stats: {
    daysLived: number;
    earnedToday: number;
    earnedTotal: number;
    leetCodeSolved: number;
    commitsPushed: number;
    coffeeConsumed: number;
    placesVisited: string[];
    aspirationCompleted: boolean;
  };
  goalIndex: number;
}

export interface GoogleUserProfile {
  id: string; // Google 'sub' claim or deterministic ID
  email: string;
  name: string;
  givenName?: string;
  picture?: string;
  hd?: string; // Google Workspace hosted domain if any
  provider: 'google_gis' | 'google_instant';
  signedInAt: number;
}

export type SerializableGameState = Omit<
  GameState,
  'screen' | 'view' | 'activeModal' | 'phoneApp' | 'simTab' | 'lastToast'
>;

export interface SaveSlotSummary {
  slotId: string; // 'autosave' | 'slot-1' | 'slot-2' | 'slot-3'
  label: string;
  isAutosave: boolean;
  savedAtIso: string;
  savedAtMs: number;
  userId?: string;
  userEmail?: string;
  simName: string;
  simHandle: string;
  appearance: SimAppearance;
  careerCompany: string;
  careerCode: string;
  homeId: string;
  homeName: string;
  locationId: string;
  dayNumber: number;
  timeFormatted: string;
  cash: number;
  netWorth: number;
}

export interface SaveGameData {
  schema: 'bay-life-save';
  version: number;
  savedAtIso: string;
  savedAtMs: number;
  summary: SaveSlotSummary;
  state: SerializableGameState;
}


