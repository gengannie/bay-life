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
  levels: CareerLevel[];
}

export type WorkToneId = 'deepWork' | 'tenXGrind' | 'watercooler' | 'alignSkip' | 'restAndVest';

export interface JobState {
  careerId: string;
  levelIndex: number; // 0-based index into CareerDef.levels
  performance: number; // 0 to 100
  shiftsCompleted: number;
  autoWork: boolean;
  preferredCommute: CommuteModeId;
}

export interface ActiveWorkShift {
  startedAt: number;
  endsAt: number;
  totalMinutes: number;
  elapsedMinutes: number;
  tone: WorkToneId;
  dilemmaTriggered?: boolean;
}

export type CommuteModeId = 'caltrain' | 'gbus' | 'waymo' | 'uber' | 'tesla';

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

export interface HomeDef {
  id: string;
  name: string;
  area: string;
  district: 'San Francisco' | 'Peninsula' | 'South Bay';
  emoji: string;
  tagline: string;
  weeklyRent: number;
  buyPrice: number;
  gridSize: number;
  floorStyle: 'wood' | 'concrete' | 'marble';
  starterMoney: number;
  starterObjects: Array<{ objectId: string; x: number; y: number }>;
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

export interface RewardPerkDef {
  id: string;
  name: string;
  emoji: string;
  cost: number; // karma points
  desc: string;
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

export interface GameState {
  version: number;
  screen: 'title' | 'create' | 'play';
  view: 'live' | 'map' | 'buy';
  activeModal: null | 'phone' | 'sim' | 'career' | 'commute' | 'wardrobe';
  phoneApp: 'messages' | 'levels' | 'wealth' | 'doordash' | 'startup' | 'zillow' | 'blind';
  simTab: 'needs' | 'skills' | 'relationships' | 'wishes' | 'perks';

  sim: SimProfile;
  needs: NeedsState;
  skills: SkillsState;

  // Finances & Assets
  cash: number;
  vestedRsu: number; // in USD (tracks QQQ/Tech index fluctuations)
  unvestedRsu: number;
  portfolioValue: number; // index funds
  loanOwed: number; // YC SAFE / Student loan
  karma: number; // aspiration points (like blessings in Lagos Life)
  unlockedPerks: string[];
  ownedCars: CommuteModeId[];
  ownedHomes: string[];
  pantryMeals: number;

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
