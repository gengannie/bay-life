import React, { useEffect, useRef, useState } from 'react';
import { CAREER_BY_ID, HOMES } from '../data/worldData';
import {
  PRESET_GOOGLE_ACCOUNTS,
  SAVE_SLOT_IDS,
  SaveSlotId,
  useAuthSaveStore,
} from '../store/useAuthSaveStore';
import {
  calculateNetWorth,
  formatCurrency,
  formatTime,
  getDayNumber,
  getDayOfWeekName,
  useGameStore,
} from '../store/useGameStore';
import { Portrait } from './Portrait';
import {
  CheckCircle2,
  Cloud,
  Download,
  FolderOpen,
  HardDrive,
  KeyRound,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserCheck,
  Volume2,
  VolumeX,
  X,
  Globe,
  ArrowUpRight,
} from 'lucide-react';

export const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

export function formatRelativeTimestamp(savedAtMs?: number | null): string {
  if (!savedAtMs) return 'Not saved yet';
  const diffSec = Math.max(0, Math.floor((Date.now() - savedAtMs) / 1000));
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const d = new Date(savedAtMs);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface AccountSaveModalProps {
  onClose: () => void;
}

export const AccountSaveModal: React.FC<AccountSaveModalProps> = ({ onClose }) => {
  const sim = useGameStore((s) => s.sim);
  const time = useGameStore((s) => s.time);
  const cash = useGameStore((s) => s.cash);
  const job = useGameStore((s) => s.job);
  const homeId = useGameStore((s) => s.homeId);
  const screen = useGameStore((s) => s.screen);
  const soundOn = useGameStore((s) => s.soundOn);
  const nightMode = useGameStore((s) => s.nightMode);
  const freeWill = useGameStore((s) => s.freeWill);

  const toggleSound = useGameStore((s) => s.toggleSound);
  const toggleNightMode = useGameStore((s) => s.toggleNightMode);
  const toggleFreeWill = useGameStore((s) => s.toggleFreeWill);
  const setScreen = useGameStore((s) => s.setScreen);
  const resetToFreshGame = useGameStore((s) => s.resetToFreshGame);

  const user = useAuthSaveStore((s) => s.user);
  const slots = useAuthSaveStore((s) => s.slots);
  const lastSavedAtMs = useAuthSaveStore((s) => s.lastSavedAtMs);
  const cloudSyncStatus = useAuthSaveStore((s) => s.cloudSyncStatus);
  const googleClientId = useAuthSaveStore((s) => s.googleClientId);
  const authNotice = useAuthSaveStore((s) => s.authNotice);

  const setGoogleClientId = useAuthSaveStore((s) => s.setGoogleClientId);
  const signInWithGoogleCredential = useAuthSaveStore((s) => s.signInWithGoogleCredential);
  const signInWithGoogleOAuthPopup = useAuthSaveStore((s) => s.signInWithGoogleOAuthPopup);
  const signInWithGoogleAccount = useAuthSaveStore((s) => s.signInWithGoogleAccount);
  const signOutGoogle = useAuthSaveStore((s) => s.signOutGoogle);
  const saveToSlot = useAuthSaveStore((s) => s.saveToSlot);
  const loadFromSlot = useAuthSaveStore((s) => s.loadFromSlot);
  const deleteSlot = useAuthSaveStore((s) => s.deleteSlot);
  const quickSaveNow = useAuthSaveStore((s) => s.quickSaveNow);
  const syncAllWithCloud = useAuthSaveStore((s) => s.syncAllWithCloud);
  const exportSaveToJson = useAuthSaveStore((s) => s.exportSaveToJson);
  const importSaveFromJson = useAuthSaveStore((s) => s.importSaveFromJson);
  const clearAuthNotice = useAuthSaveStore((s) => s.clearAuthNotice);

  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [showOAuthConfig, setShowOAuthConfig] = useState(false);
  const [clientIdDraft, setClientIdDraft] = useState(googleClientId);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<SaveSlotId | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gisButtonRef = useRef<HTMLDivElement | null>(null);

  const fullState = useGameStore.getState();
  const netWorth = calculateNetWorth(fullState);
  const homeDef = HOMES.find((h) => h.id === homeId) || HOMES[1];
  const careerDef = job ? CAREER_BY_ID[job.careerId] : null;
  const levelDef = careerDef && job ? careerDef.levels[job.levelIndex] : null;

  // Initialize official Google Identity Services button when clientId is configured
  useEffect(() => {
    if (!googleClientId || !window.google?.accounts?.id || !gisButtonRef.current) return;
    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resp) => {
          if (resp.credential) {
            void signInWithGoogleCredential(resp.credential);
            setShowAccountChooser(false);
          }
        },
      });
      window.google.accounts.id.renderButton(gisButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
      });
    } catch {
      // fallback to interactive Google Account Chooser
    }
  }, [googleClientId, signInWithGoogleCredential, showAccountChooser]);

  const handleGoogleSignInClick = () => {
    if (googleClientId && window.google?.accounts?.oauth2) {
      signInWithGoogleOAuthPopup();
    }
    setShowAccountChooser((v) => !v);
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawEmail = customEmail.trim() || 'founder@gmail.com';
    const normalizedEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@gmail.com`;
    const derivedName =
      customName.trim() ||
      normalizedEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    await signInWithGoogleAccount({
      name: derivedName,
      email: normalizedEmail,
      provider: 'google_instant',
    });
    setShowAccountChooser(false);
    setCustomName('');
    setCustomEmail('');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const res = importSaveFromJson(reader.result, 'slot-1');
        if (res.ok) {
          onClose();
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSlot = (slotId: SaveSlotId) => {
    const ok = loadFromSlot(slotId);
    if (ok) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
    >
      <div
        className="apple-glass-heavy relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-white/40 text-[var(--ink)] shadow-2xl dark:border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-black/8 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-[#007AFF]/15 text-[#007AFF]">
              <Cloud className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight sm:text-lg">
                  Google Account & Cloud Saves
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    user
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {user ? (
                    <>
                      <CheckCircle2 className="size-3" />
                      <span>Google Synced</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="size-3" />
                      <span>Local Guest</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-[var(--ink-soft)]">
                Sign in with Google to bind save slots to your profile · Auto-saved{' '}
                {formatRelativeTimestamp(lastSavedAtMs)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-press grid size-8 place-items-center rounded-full bg-[var(--mist)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="scrollbar-none flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Status Banner if present */}
          {authNotice && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#007AFF]/30 bg-[#007AFF]/10 px-3.5 py-2.5 text-xs font-bold text-[#007AFF] dark:text-sky-300">
              <span>{authNotice}</span>
              <button
                onClick={clearAuthNotice}
                className="rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* 1. GOOGLE AUTHENTICATION SECTION */}
          <div className="rounded-3xl border border-black/8 bg-[var(--mist)] p-4 dark:border-white/10">
            {!user ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#007AFF]">
                    <GoogleLogoSvg className="size-3.5" />
                    <span>Google Identity & Cloud Sync</span>
                  </div>
                  <h3 className="text-sm font-extrabold sm:text-base">
                    Sign in with Google to back up your Silicon Valley career
                  </h3>
                  <p className="text-xs text-[var(--ink-soft)]">
                    Keep up to 4 save slots synced to your Google account plus portable JSON backups.
                  </p>
                </div>

                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <button
                    onClick={handleGoogleSignInClick}
                    className="btn-press flex h-11 items-center justify-center gap-2.5 rounded-full border border-slate-300 bg-white px-5 text-xs font-extrabold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-white/20 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                  >
                    <GoogleLogoSvg className="size-4" />
                    <span>Continue with Google</span>
                  </button>
                  <div ref={gisButtonRef} className={googleClientId ? 'block' : 'hidden'} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="size-12 rounded-full border-2 border-[#007AFF] object-cover"
                    />
                  ) : (
                    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#EA4335] text-sm font-extrabold text-white shadow-sm">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-extrabold">{user.name}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-2xs dark:bg-white/10 dark:text-slate-200">
                        <GoogleLogoSvg className="size-3" />
                        <span>{user.hd || 'Google Account'}</span>
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[var(--ink-soft)]">{user.email}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      <span>
                        {cloudSyncStatus === 'syncing'
                          ? 'Syncing saves with cloud...'
                          : `Cloud profile active · Last saved ${formatRelativeTimestamp(lastSavedAtMs)}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void syncAllWithCloud()}
                    className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#0066CC]"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Sync Now</span>
                  </button>
                  <button
                    onClick={() => setShowAccountChooser((v) => !v)}
                    className="btn-press inline-flex items-center gap-1.5 rounded-full bg-black/8 px-3 py-2 text-xs font-bold text-[var(--ink)] hover:bg-black/12 dark:bg-white/10 dark:hover:bg-white/15"
                  >
                    <UserCheck className="size-3.5" />
                    <span>Switch Account</span>
                  </button>
                  <button
                    onClick={signOutGoogle}
                    className="btn-press inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/25 dark:text-rose-400"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Google Account Chooser Drawer */}
            {showAccountChooser && (
              <div className="mt-4 rounded-2xl border border-black/10 bg-white/85 p-4 shadow-inner dark:border-white/10 dark:bg-slate-900/85">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GoogleLogoSvg className="size-4" />
                    <span className="text-xs font-extrabold">
                      Choose a Google Account for Bay Life
                    </span>
                  </div>
                  <button
                    onClick={() => setShowOAuthConfig((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#007AFF] hover:underline"
                  >
                    <KeyRound className="size-3" />
                    <span>{showOAuthConfig ? 'Hide OAuth Config' : 'OAuth Client ID'}</span>
                  </button>
                </div>

                {/* Preset 1-Click Google Accounts */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {PRESET_GOOGLE_ACCOUNTS.map((acct) => (
                    <button
                      key={acct.id}
                      onClick={() => {
                        void signInWithGoogleAccount({
                          id: acct.id,
                          name: acct.name,
                          email: acct.email,
                          hd: acct.hd,
                          provider: 'google_instant',
                        });
                        setShowAccountChooser(false);
                      }}
                      className="btn-press flex items-center gap-2.5 rounded-2xl border border-black/8 bg-[var(--mist)] p-2.5 text-left hover:border-[#007AFF] dark:border-white/10"
                    >
                      <div
                        className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white"
                        style={{ backgroundColor: acct.avatarBg }}
                      >
                        {acct.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-extrabold">{acct.name}</div>
                        <div className="truncate text-[11px] text-[var(--ink-soft)]">
                          {acct.email}
                        </div>
                        <div className="mt-0.5 text-[9px] font-bold text-[#007AFF]">
                          {acct.roleBadge}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Google Email Sign-In Form */}
                <form
                  onSubmit={handleCustomGoogleSubmit}
                  className="mt-3 flex flex-col gap-2 border-t border-black/8 pt-3 sm:flex-row dark:border-white/10"
                >
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Annie Geng)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="h-9 flex-1 rounded-xl border border-black/15 bg-white px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#007AFF] focus:outline-none dark:border-white/15 dark:bg-slate-800 dark:text-white"
                  />
                  <input
                    type="email"
                    required
                    placeholder="your.email@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="h-9 flex-1 rounded-xl border border-black/15 bg-white px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#007AFF] focus:outline-none dark:border-white/15 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="btn-press inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#007AFF] px-4 text-xs font-extrabold text-white hover:bg-[#0066CC]"
                  >
                    <GoogleLogoSvg className="size-3.5" />
                    <span>Sign In</span>
                  </button>
                </form>

                {/* Optional Production Google OAuth Client ID Input */}
                {showOAuthConfig && (
                  <div className="mt-3 rounded-xl bg-black/5 p-3 dark:bg-white/5">
                    <div className="text-[11px] font-bold text-[var(--ink)]">
                      Production Google Identity Services Client ID (Optional)
                    </div>
                    <p className="mt-0.5 text-[10px] text-[var(--ink-soft)]">
                      Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env</code> or paste your
                      Google Cloud OAuth 2.0 Web Client ID below to use live Google One-Tap / Popup:
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="1234567890-abcdefg.apps.googleusercontent.com"
                        value={clientIdDraft}
                        onChange={(e) => setClientIdDraft(e.target.value)}
                        className="h-8 flex-1 rounded-lg border border-black/15 bg-white px-2.5 font-mono text-[11px] text-slate-900 dark:border-white/15 dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setGoogleClientId(clientIdDraft);
                          setShowOAuthConfig(false);
                        }}
                        className="btn-press rounded-lg bg-slate-900 px-3 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900"
                      >
                        Save Client ID
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. ACTIVE SESSION QUICK SAVE & JSON BACKUP BAR */}
          <div className="flex flex-col gap-3 rounded-3xl border border-[#007AFF]/25 bg-[#007AFF]/8 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Portrait appearance={sim.appearance} size={46} ringColor="#007AFF" />
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#007AFF]">
                    Active Session
                  </span>
                  <span className="text-sm font-extrabold">{sim.name}</span>
                  <span className="rounded-full bg-[#007AFF] px-2 py-0.5 text-[10px] font-bold text-white">
                    {levelDef ? `${careerDef?.company} ${levelDef.code}` : 'Founder'}
                  </span>
                </div>
                <div className="text-xs text-[var(--ink-soft)]">
                  Day {getDayNumber(time)} ({getDayOfWeekName(time)} {formatTime(time)}) ·{' '}
                  {homeDef.name}
                </div>
                <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(cash)} Cash · {formatCurrency(netWorth)} Net Worth
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => void quickSaveNow()}
                className="btn-press inline-flex items-center gap-1.5 rounded-2xl bg-[#007AFF] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#0066CC]"
              >
                <Save className="size-3.5" />
                <span>Quick Save</span>
              </button>

              <button
                onClick={() => exportSaveToJson()}
                title="Download a .json backup file of your current game"
                className="btn-press inline-flex items-center gap-1.5 rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-bold text-[var(--ink)] hover:bg-black/10 dark:hover:bg-white/15"
              >
                <Download className="size-3.5 text-[#007AFF]" />
                <span>Export .JSON</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Import a previously exported .json save file"
                className="btn-press inline-flex items-center gap-1.5 rounded-2xl bg-[var(--mist)] px-3 py-2 text-xs font-bold text-[var(--ink)] hover:bg-black/10 dark:hover:bg-white/15"
              >
                <Upload className="size-3.5 text-emerald-500" />
                <span>Import .JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
          </div>

          {/* 3. MULTI-SLOT SAVE & LOAD GRID */}
          <div>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
                <FolderOpen className="size-3.5 text-[#007AFF]" />
                <span>Save Slots ({user ? `${user.email}` : 'Local Browser Storage'})</span>
              </div>
              <span className="text-[11px] font-semibold text-[var(--ink-soft)]">
                1 Autosave + 3 Manual Slots
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SAVE_SLOT_IDS.map((slotId) => {
                const slot = slots[slotId];
                const isAutosave = slotId === 'autosave';
                const slotTitle = isAutosave
                  ? '☁️ Cloud Autosave'
                  : `💾 Save Slot ${slotId.replace('slot-', '')}`;

                return (
                  <div
                    key={slotId}
                    className={`flex flex-col justify-between rounded-3xl border p-3.5 transition-all ${
                      slot
                        ? 'border-black/10 bg-[var(--mist)] dark:border-white/12'
                        : 'border-dashed border-black/15 bg-black/[0.02] dark:border-white/15 dark:bg-white/[0.02]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#007AFF]">{slotTitle}</span>
                        <span className="font-mono text-[10px] font-semibold text-[var(--ink-soft)]">
                          {slot ? formatRelativeTimestamp(slot.savedAtMs) : 'Empty Slot'}
                        </span>
                      </div>

                      {slot ? (
                        <div className="mt-2.5 flex items-center gap-3">
                          <Portrait
                            appearance={slot.summary.appearance}
                            size={44}
                            ringColor={isAutosave ? '#34C759' : '#007AFF'}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-extrabold">
                                {slot.summary.simName}
                              </span>
                              <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-bold text-[#007AFF]">
                                {slot.summary.careerCompany} · {slot.summary.careerCode}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
                              Day {slot.summary.dayNumber} ({slot.summary.timeFormatted}) ·{' '}
                              {slot.summary.homeName}
                            </div>
                            <div className="mt-0.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(slot.summary.cash)} Cash ·{' '}
                              {formatCurrency(slot.summary.netWorth)} NW
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="my-5 text-center text-xs text-[var(--ink-soft)]">
                          No save stored in this slot yet.
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-black/8 pt-2.5 dark:border-white/10">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => void saveToSlot(slotId)}
                          className="btn-press inline-flex items-center gap-1 rounded-xl bg-[#007AFF] px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-[#0066CC]"
                        >
                          <Save className="size-3" />
                          <span>{slot ? 'Overwrite' : 'Save Here'}</span>
                        </button>

                        {slot && (
                          <button
                            onClick={() => handleLoadSlot(slotId)}
                            className="btn-press inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-[11px] font-extrabold text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
                          >
                            <FolderOpen className="size-3" />
                            <span>Load</span>
                          </button>
                        )}
                      </div>

                      {slot && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => exportSaveToJson(slotId)}
                            title="Export this slot as .json"
                            className="btn-press grid size-7 place-items-center rounded-xl bg-black/5 text-[var(--ink-soft)] hover:text-[var(--ink)] dark:bg-white/10"
                          >
                            <Download className="size-3.5" />
                          </button>

                          {confirmDeleteSlot === slotId ? (
                            <button
                              onClick={() => {
                                deleteSlot(slotId);
                                setConfirmDeleteSlot(null);
                              }}
                              className="btn-press rounded-xl bg-rose-500 px-2 py-1 text-[10px] font-extrabold text-white"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteSlot(slotId)}
                              title="Delete slot"
                              className="btn-press grid size-7 place-items-center rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. GAME PREFERENCES, SHORTCUTS & RESET */}
          <div className="flex flex-col gap-3 rounded-3xl border border-black/8 bg-[var(--mist)] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={toggleSound}
                className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-3 py-1.5 text-xs font-bold text-[var(--ink)] dark:bg-white/10"
              >
                {soundOn ? <Volume2 className="size-3.5 text-[#007AFF]" /> : <VolumeX className="size-3.5" />}
                <span>Sound: {soundOn ? 'On' : 'Muted'}</span>
              </button>

              <button
                onClick={toggleNightMode}
                className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-3 py-1.5 text-xs font-bold text-[var(--ink)] dark:bg-white/10"
              >
                {nightMode === 'dark' ? (
                  <Moon className="size-3.5 text-indigo-400" />
                ) : (
                  <Sun className="size-3.5 text-amber-500" />
                )}
                <span>Theme: {nightMode.toUpperCase()}</span>
              </button>

              <button
                onClick={toggleFreeWill}
                className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-3 py-1.5 text-xs font-bold text-[var(--ink)] dark:bg-white/10"
              >
                <Sparkles className="size-3.5 text-purple-500" />
                <span>Free Will: {freeWill ? 'On' : 'Off'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {screen === 'play' && (
                <button
                  onClick={() => {
                    onClose();
                    setScreen('title');
                  }}
                  className="btn-press rounded-xl bg-black/8 px-3 py-1.5 text-xs font-bold text-[var(--ink)] hover:bg-black/15 dark:bg-white/10"
                >
                  Title Screen
                </button>
              )}

              {confirmReset ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      resetToFreshGame();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="btn-press rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="btn-press rounded-xl bg-black/10 px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] dark:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="btn-press inline-flex items-center gap-1 rounded-xl bg-rose-500/12 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset Active Run</span>
                </button>
              )}
            </div>
          </div>

          {/* Footer Creator Link */}
          <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2.5 text-[11px] text-[var(--ink-soft)] dark:border-white/10">
            <span>
              Bay Life · Crafted by <strong className="font-bold text-[var(--ink)]">Annie</strong>
            </span>
            <a
              href="https://gengannie.github.io/personal_site/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-[#007AFF] hover:underline"
              title="Visit Annie's Portfolio & Side Projects"
            >
              <Globe className="size-3" />
              <span>Personal Site & Portfolio</span>
              <ArrowUpRight className="size-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
