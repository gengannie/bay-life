import React, { useEffect } from 'react';
import { getHourOfDay, useGameStore } from './store/useGameStore';
import { TitleScreen } from './components/TitleScreen';
import { CreateSimScreen } from './components/CreateSimScreen';
import { IsometricScene } from './components/IsometricScene';
import { WorldMapModal } from './components/WorldMapModal';
import { BuyFurnishModal } from './components/BuyFurnishModal';
import { AppleHUD } from './components/AppleHUD';
import { BayPhoneModal } from './components/BayPhoneModal';
import { SimInspectorSheet } from './components/SimInspectorSheet';
import { WorkCareerModal } from './components/WorkCareerModal';

function getBaySkyGradient(hour: number, isDarkTheme: boolean): string {
  if (hour >= 7 && hour < 17.5) {
    return isDarkTheme
      ? 'linear-gradient(180deg, #1e293b 0%, #334155 60%, #475569 100%)'
      : 'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 58%, #f1f5f9 100%)';
  }
  if (hour >= 5.5 && hour < 7) {
    return 'linear-gradient(180deg, #7dd3fc 0%, #fdba74 68%, #fef3c7 100%)';
  }
  if (hour >= 17.5 && hour < 19.5) {
    return 'linear-gradient(180deg, #4f46e5 0%, #fb7185 58%, #fdba74 100%)';
  }
  return 'linear-gradient(180deg, #090d16 0%, #0f172a 65%, #1e1b4b 100%)';
}

export const App: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const view = useGameStore((s) => s.view);
  const activeModal = useGameStore((s) => s.activeModal);
  const time = useGameStore((s) => s.time);
  const nightMode = useGameStore((s) => s.nightMode);
  const lastToast = useGameStore((s) => s.lastToast);
  const tick = useGameStore((s) => s.tick);
  const dismissToast = useGameStore((s) => s.dismissToast);

  const hour = getHourOfDay(time);
  const isDark =
    nightMode === 'dark' || (nightMode === 'auto' && (hour < 6 || hour >= 19.5));

  // Sync dark mode class on root html element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Main Simulation Tick Loop
  useEffect(() => {
    const interval = setInterval(() => {
      tick(3);
    }, 900);
    return () => clearInterval(interval);
  }, [tick]);

  // Auto-dismiss Dynamic Island toast after 5.5s
  useEffect(() => {
    if (!lastToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 5500);
    return () => clearTimeout(timer);
  }, [lastToast, dismissToast]);

  if (screen === 'title') {
    return <TitleScreen />;
  }

  if (screen === 'create') {
    return <CreateSimScreen />;
  }

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden transition-[background] duration-1000"
      style={{ background: getBaySkyGradient(hour, isDark) }}
    >
      {/* Main View Layer */}
      <div className="absolute inset-0">
        {view === 'live' && <IsometricScene />}
        {view === 'map' && <WorldMapModal />}
        {view === 'buy' && <BuyFurnishModal />}
      </div>

      {/* Persistent Apple Glass HUD & Overlays */}
      <AppleHUD />

      {/* Modals */}
      {activeModal === 'phone' && <BayPhoneModal />}
      {activeModal === 'sim' && <SimInspectorSheet />}
      {activeModal === 'career' && <WorkCareerModal />}
    </div>
  );
};

export default App;

