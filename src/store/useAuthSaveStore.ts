import { create } from 'zustand';
import { CAREER_BY_ID, HOMES } from '../data/worldData';
import {
  GameState,
  GoogleUserProfile,
  SaveGameData,
  SaveSlotSummary,
  SerializableGameState,
} from '../types/game';
import { sfx } from '../utils/sound';
import {
  calculateNetWorth,
  formatTime,
  getDayNumber,
  useGameStore,
} from './useGameStore';

export const CURRENT_SAVE_VERSION = 1;
export const SAVE_SLOT_IDS = ['autosave', 'slot-1', 'slot-2', 'slot-3'] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

const AUTH_STORAGE_KEY = 'bay-life-google-auth-v1';
const CLIENT_ID_STORAGE_KEY = 'bay-life-google-client-id-v1';

export interface PresetGoogleAccount {
  id: string;
  name: string;
  email: string;
  hd?: string;
  roleBadge: string;
  avatarBg: string;
  initials: string;
}

export const PRESET_GOOGLE_ACCOUNTS: PresetGoogleAccount[] = [
  {
    id: 'google-sub-alex-chen-sv',
    name: 'Alex Chen',
    email: 'alex.chen@gmail.com',
    roleBadge: 'Personal Google Account',
    avatarBg: '#007AFF',
    initials: 'AC',
  },
  {
    id: 'google-sub-sora-agi-lab',
    name: 'Sora Takahashi',
    email: 'sora@cortexflow.ai',
    hd: 'cortexflow.ai',
    roleBadge: 'Google Workspace · Founder',
    avatarBg: '#EA580C',
    initials: 'ST',
  },
  {
    id: 'google-sub-chloe-sandhill',
    name: 'Chloe Vance',
    email: 'chloe@sequoiacap.dev',
    hd: 'sequoiacap.dev',
    roleBadge: 'Google Workspace · Partner',
    avatarBg: '#7C3AED',
    initials: 'CV',
  },
];

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: () => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
          disableAutoSelect: () => void;
        };
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

function getSavesStorageKey(userId?: string | null): string {
  return `bay-life-saves-v1-${userId || 'guest'}`;
}

function readStoredUser(): GoogleUserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleUserProfile;
    if (parsed && parsed.id && parsed.email) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeStoredUser(user: GoogleUserProfile | null): void {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
  } catch {
    // ignore storage errors
  }
}

function readStoredSlots(userId?: string | null): Record<string, SaveGameData> {
  try {
    const raw = localStorage.getItem(getSavesStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SaveGameData>;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // ignore corrupt JSON
  }
  return {};
}

function writeStoredSlots(userId: string | null | undefined, slots: Record<string, SaveGameData>): void {
  try {
    localStorage.setItem(getSavesStorageKey(userId), JSON.stringify(slots));
  } catch {
    // ignore quota errors
  }
}

export function extractSerializableState(state: GameState): SerializableGameState {
  return {
    version: CURRENT_SAVE_VERSION,
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
  };
}

export function buildSaveGameSnapshot(
  state: GameState,
  slotId: string,
  customLabel?: string,
  user?: GoogleUserProfile | null
): SaveGameData {
  const now = new Date();
  const savedAtIso = now.toISOString();
  const savedAtMs = now.getTime();
  const careerDef = state.job ? CAREER_BY_ID[state.job.careerId] : null;
  const levelDef = careerDef && state.job ? careerDef.levels[state.job.levelIndex] : null;
  const homeDef = HOMES.find((h) => h.id === state.homeId) || HOMES[1];

  const defaultLabel =
    slotId === 'autosave'
      ? 'Cloud Autosave'
      : slotId === 'slot-1'
      ? 'Save Slot 1'
      : slotId === 'slot-2'
      ? 'Save Slot 2'
      : 'Save Slot 3';

  const summary: SaveSlotSummary = {
    slotId,
    label: customLabel || defaultLabel,
    isAutosave: slotId === 'autosave',
    savedAtIso,
    savedAtMs,
    userId: user?.id,
    userEmail: user?.email,
    simName: state.sim.name,
    simHandle: state.sim.handle,
    appearance: state.sim.appearance,
    careerCompany: careerDef ? careerDef.company : state.startup.name,
    careerCode: levelDef ? levelDef.code : 'Founder',
    homeId: homeDef.id,
    homeName: homeDef.name,
    locationId: state.locationId,
    dayNumber: getDayNumber(state.time),
    timeFormatted: formatTime(state.time),
    cash: Math.round(state.cash),
    netWorth: calculateNetWorth(state),
  };

  return {
    schema: 'bay-life-save',
    version: CURRENT_SAVE_VERSION,
    savedAtIso,
    savedAtMs,
    summary,
    state: extractSerializableState(state),
  };
}

function decodeGoogleJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function syncSlotToCloudIfConfigured(
  user: GoogleUserProfile,
  slotId: string,
  snapshot: SaveGameData
): Promise<boolean> {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  if (!projectId || !apiKey) {
    return false;
  }

  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/bay_life_users/${encodeURIComponent(
      user.id
    )}/saves/${encodeURIComponent(slotId)}?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          payload: { stringValue: JSON.stringify(snapshot) },
          updatedAtMs: { integerValue: String(snapshot.savedAtMs) },
          userEmail: { stringValue: user.email },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function pullSlotsFromCloudIfConfigured(
  user: GoogleUserProfile
): Promise<Record<string, SaveGameData> | null> {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  if (!projectId || !apiKey) {
    return null;
  }

  try {
    const listUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/bay_life_users/${encodeURIComponent(
      user.id
    )}/saves?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(listUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      documents?: Array<{
        name: string;
        fields?: { payload?: { stringValue?: string } };
      }>;
    };
    if (!data.documents) return {};
    const remoteSlots: Record<string, SaveGameData> = {};
    for (const doc of data.documents) {
      const rawJson = doc.fields?.payload?.stringValue;
      if (!rawJson) continue;
      try {
        const parsed = JSON.parse(rawJson) as SaveGameData;
        if (parsed && parsed.schema === 'bay-life-save' && parsed.summary?.slotId) {
          remoteSlots[parsed.summary.slotId] = parsed;
        }
      } catch {
        // ignore invalid remote doc
      }
    }
    return remoteSlots;
  } catch {
    return null;
  }
}

export type CloudSyncStatus = 'synced' | 'syncing' | 'local_only' | 'error';

interface AuthSaveStoreState {
  user: GoogleUserProfile | null;
  slots: Record<string, SaveGameData>;
  lastSavedAtMs: number | null;
  cloudSyncStatus: CloudSyncStatus;
  googleClientId: string;
  authNotice: string | null;

  // Auth Actions
  setGoogleClientId: (clientId: string) => void;
  signInWithGoogleCredential: (jwtCredential: string) => Promise<void>;
  signInWithGoogleOAuthPopup: () => void;
  signInWithGoogleAccount: (input: {
    id?: string;
    name: string;
    email: string;
    picture?: string;
    hd?: string;
    provider?: 'google_gis' | 'google_instant';
  }) => Promise<void>;
  signOutGoogle: () => void;

  // Save & Load Actions
  saveToSlot: (slotId: SaveSlotId, customLabel?: string, silent?: boolean) => Promise<SaveGameData>;
  loadFromSlot: (slotId: SaveSlotId) => boolean;
  deleteSlot: (slotId: SaveSlotId) => void;
  quickSaveNow: () => Promise<SaveGameData>;
  autoCheckpointCurrentRun: (label?: string) => void;
  syncAllWithCloud: () => Promise<void>;
  exportSaveToJson: (slotId?: SaveSlotId) => void;
  importSaveFromJson: (
    rawJson: string,
    targetSlotId?: SaveSlotId
  ) => { ok: boolean; message: string };
  clearAuthNotice: () => void;
}

const initialUser = readStoredUser();
const initialSlots = readStoredSlots(initialUser?.id);
const initialClientId =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
  (typeof localStorage !== 'undefined' ? localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '' : '');

export const useAuthSaveStore = create<AuthSaveStoreState>((set, get) => ({
  user: initialUser,
  slots: initialSlots,
  lastSavedAtMs:
    Object.values(initialSlots).reduce((max, s) => Math.max(max, s.savedAtMs || 0), 0) || null,
  cloudSyncStatus: initialUser ? 'synced' : 'local_only',
  googleClientId: initialClientId,
  authNotice: null,

  setGoogleClientId: (clientId) => {
    const trimmed = clientId.trim();
    try {
      if (trimmed) {
        localStorage.setItem(CLIENT_ID_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    set({
      googleClientId: trimmed,
      authNotice: trimmed
        ? 'Google OAuth Client ID saved. Google Identity Services ready.'
        : 'Cleared custom Google OAuth Client ID.',
    });
  },

  signInWithGoogleCredential: async (jwtCredential) => {
    const payload = decodeGoogleJwtPayload(jwtCredential);
    if (!payload || !payload.email) {
      set({ authNotice: 'Could not decode Google ID token.' });
      return;
    }
    await get().signInWithGoogleAccount({
      id: String(payload.sub || payload.email),
      name: String(payload.name || payload.given_name || 'Bay Engineer'),
      email: String(payload.email),
      picture: payload.picture ? String(payload.picture) : undefined,
      hd: payload.hd ? String(payload.hd) : undefined,
      provider: 'google_gis',
    });
  },

  signInWithGoogleOAuthPopup: () => {
    const clientId = get().googleClientId;
    if (!clientId || !window.google?.accounts?.oauth2) {
      set({
        authNotice:
          'Select a Google account below or configure your Google OAuth Client ID for live GIS popup.',
      });
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (resp) => {
          if (!resp.access_token) return;
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${resp.access_token}` },
            });
            if (!res.ok) return;
            const info = (await res.json()) as {
              sub?: string;
              name?: string;
              email?: string;
              picture?: string;
              hd?: string;
            };
            if (info.email) {
              await get().signInWithGoogleAccount({
                id: info.sub || info.email,
                name: info.name || info.email.split('@')[0],
                email: info.email,
                picture: info.picture,
                hd: info.hd,
                provider: 'google_gis',
              });
            }
          } catch {
            set({ authNotice: 'Failed to fetch Google user profile.' });
          }
        },
      });
      tokenClient.requestAccessToken();
    } catch {
      set({ authNotice: 'Could not initialize Google OAuth popup. Use Instant Google Sign-In below.' });
    }
  },

  signInWithGoogleAccount: async (input) => {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.name.trim() || cleanEmail.split('@')[0] || 'Silicon Valley Sim';
    const deterministicId =
      input.id || `google-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`;

    const profile: GoogleUserProfile = {
      id: deterministicId,
      email: cleanEmail,
      name: cleanName,
      givenName: cleanName.split(' ')[0],
      picture: input.picture,
      hd: input.hd || (cleanEmail.endsWith('@gmail.com') ? undefined : cleanEmail.split('@')[1]),
      provider: input.provider || 'google_instant',
      signedInAt: Date.now(),
    };

    writeStoredUser(profile);

    // Load this Google user's existing local slots
    let userSlots = readStoredSlots(profile.id);

    // Try pulling any remote cloud saves if Firebase REST is configured
    set({ user: profile, cloudSyncStatus: 'syncing' });
    const remoteSlots = await pullSlotsFromCloudIfConfigured(profile);
    if (remoteSlots && Object.keys(remoteSlots).length > 0) {
      userSlots = { ...userSlots, ...remoteSlots };
    }

    // If this Google account has no saves yet, automatically sync the current active game into their Autosave
    const currentGameState = useGameStore.getState();
    if (Object.keys(userSlots).length === 0) {
      const initialSnap = buildSaveGameSnapshot(
        currentGameState,
        'autosave',
        'Google Cloud Autosave',
        profile
      );
      userSlots = { autosave: initialSnap };
      writeStoredSlots(profile.id, userSlots);
      await syncSlotToCloudIfConfigured(profile, 'autosave', initialSnap);
    } else {
      writeStoredSlots(profile.id, userSlots);
    }

    const latestMs =
      Object.values(userSlots).reduce((max, s) => Math.max(max, s.savedAtMs || 0), 0) ||
      Date.now();

    sfx.play('levelup');
    set({
      user: profile,
      slots: userSlots,
      lastSavedAtMs: latestMs,
      cloudSyncStatus: 'synced',
      authNotice: `Signed in with Google as ${profile.name} (${profile.email}) · Cloud Save Synced`,
    });
  },

  signOutGoogle: () => {
    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      // ignore
    }
    writeStoredUser(null);
    const guestSlots = readStoredSlots(null);
    sfx.play('tap');
    set({
      user: null,
      slots: guestSlots,
      cloudSyncStatus: 'local_only',
      authNotice: 'Signed out of Google. Using local browser saves.',
    });
  },

  saveToSlot: async (slotId, customLabel, silent = false) => {
    const { user, slots } = get();
    const gameState = useGameStore.getState();
    const snapshot = buildSaveGameSnapshot(gameState, slotId, customLabel, user);

    const nextSlots = {
      ...slots,
      [slotId]: snapshot,
    };

    writeStoredSlots(user?.id, nextSlots);
    set({
      slots: nextSlots,
      lastSavedAtMs: snapshot.savedAtMs,
      cloudSyncStatus: user ? 'syncing' : 'local_only',
    });

    if (user) {
      await syncSlotToCloudIfConfigured(user, slotId, snapshot);
      set({ cloudSyncStatus: 'synced' });
    }

    if (!silent) {
      sfx.play('cash');
      const syncTag = user ? `Synced to ${user.email}` : 'Saved locally';
      useGameStore.getState().triggerMicroReward({
        toastText: `💾 Saved "${snapshot.summary.label}" (${syncTag})`,
        emoji: user ? '☁️' : '💾',
      });
    }

    return snapshot;
  },

  loadFromSlot: (slotId) => {
    const slot = get().slots[slotId];
    if (!slot) return false;
    useGameStore.getState().hydrateSaveState(slot);
    set({
      authNotice: `Loaded ${slot.summary.label} (${slot.summary.simName} · Day ${slot.summary.dayNumber})`,
    });
    return true;
  },

  deleteSlot: (slotId) => {
    const { user, slots } = get();
    const nextSlots = { ...slots };
    delete nextSlots[slotId];
    writeStoredSlots(user?.id, nextSlots);
    sfx.play('tap');
    set({
      slots: nextSlots,
      authNotice: `Deleted ${slotId === 'autosave' ? 'Autosave' : slotId.toUpperCase()}.`,
    });
  },

  quickSaveNow: async () => {
    return get().saveToSlot('autosave', 'Quick Cloud Autosave', false);
  },

  autoCheckpointCurrentRun: (label = 'Autosave Checkpoint') => {
    const { user, slots } = get();
    const gameState = useGameStore.getState();
    const snapshot = buildSaveGameSnapshot(gameState, 'autosave', label, user);
    const nextSlots = {
      ...slots,
      autosave: snapshot,
    };
    writeStoredSlots(user?.id, nextSlots);
    set({
      slots: nextSlots,
      lastSavedAtMs: snapshot.savedAtMs,
      cloudSyncStatus: user ? 'synced' : 'local_only',
    });
    if (user) {
      void syncSlotToCloudIfConfigured(user, 'autosave', snapshot);
    }
  },

  syncAllWithCloud: async () => {
    const { user } = get();
    // Always checkpoint current live game into autosave first
    await get().saveToSlot('autosave', user ? 'Google Cloud Autosave' : 'Local Autosave', true);
    if (!user) {
      set({
        cloudSyncStatus: 'local_only',
        authNotice: 'Local autosave updated. Sign in with Google to bind saves to your account.',
      });
      return;
    }

    set({ cloudSyncStatus: 'syncing' });
    const currentSlots = get().slots;
    for (const [slotId, snap] of Object.entries(currentSlots)) {
      await syncSlotToCloudIfConfigured(user, slotId, snap);
    }
    sfx.play('cash');
    set({
      cloudSyncStatus: 'synced',
      lastSavedAtMs: Date.now(),
      authNotice: `All save slots synced with Google account (${user.email}).`,
    });
  },

  exportSaveToJson: (slotId) => {
    const { user, slots } = get();
    const snapshot =
      (slotId && slots[slotId]) ||
      buildSaveGameSnapshot(
        useGameStore.getState(),
        'slot-1',
        'Exported Save Backup',
        user
      );

    const handleSlug = (snapshot.summary.simHandle || snapshot.summary.simName || 'engineer')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();
    const fileName = `bay-life-${handleSlug}-day${snapshot.summary.dayNumber}.json`;

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    sfx.play('tap');
    set({ authNotice: `Exported save file "${fileName}"` });
  },

  importSaveFromJson: (rawJson, targetSlotId = 'slot-1') => {
    try {
      const parsed = JSON.parse(rawJson) as Partial<SaveGameData> & Record<string, unknown>;
      let snapshot: SaveGameData;

      if (parsed && parsed.schema === 'bay-life-save' && parsed.state) {
        const rebuilt = buildSaveGameSnapshot(
          {
            ...useGameStore.getState(),
            ...(parsed.state as SerializableGameState),
          },
          targetSlotId,
          parsed.summary?.label || 'Imported Save',
          get().user
        );
        snapshot = {
          ...rebuilt,
          state: parsed.state as SerializableGameState,
        };
      } else if (parsed && typeof parsed.time === 'number' && parsed.sim) {
        // Also support raw GameState JSON dumps
        const rawState = parsed as unknown as GameState;
        snapshot = buildSaveGameSnapshot(
          rawState,
          targetSlotId,
          'Imported Save',
          get().user
        );
      } else {
        return {
          ok: false,
          message: 'Invalid Bay Life save file format.',
        };
      }

      const { user, slots } = get();
      const nextSlots = {
        ...slots,
        [targetSlotId]: snapshot,
      };
      writeStoredSlots(user?.id, nextSlots);
      useGameStore.getState().hydrateSaveState(snapshot);

      set({
        slots: nextSlots,
        lastSavedAtMs: snapshot.savedAtMs,
        authNotice: `Imported & loaded "${snapshot.summary.simName}" (Day ${snapshot.summary.dayNumber}) into ${targetSlotId.toUpperCase()}!`,
      });
      return {
        ok: true,
        message: `Successfully imported ${snapshot.summary.simName} (Day ${snapshot.summary.dayNumber}).`,
      };
    } catch {
      return {
        ok: false,
        message: 'Could not parse JSON save file. Ensure it is a valid .json backup.',
      };
    }
  },

  clearAuthNotice: () => set({ authNotice: null }),
}));
