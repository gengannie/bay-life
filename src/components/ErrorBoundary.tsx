import React from 'react';
import { useAuthSaveStore } from '../store/useAuthSaveStore';
import { useGameStore } from '../store/useGameStore';
import { AlertTriangle, Download, Home, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected simulation error',
    };
  }

  handleRecoverToTitle = () => {
    try {
      useGameStore.setState({
        screen: 'title',
        view: 'live',
        activeModal: null,
      });
    } catch {
      // ignore
    }
    this.setState({ hasError: false, errorMessage: '' });
  };

  handleEmergencyExport = () => {
    try {
      useAuthSaveStore.getState().exportSaveToJson();
    } catch {
      // ignore
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-[#0f172a] p-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="size-6" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                BayOS Kernel Recovery
              </div>
              <h2 className="text-lg font-extrabold">Simulation Paused Safely</h2>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-300">
            Your save data is intact. You can resume from the Title Screen, export a JSON backup of
            your current progress, or reload the application.
          </p>

          {this.state.errorMessage && (
            <div className="mt-3 rounded-xl bg-black/40 p-2.5 font-mono text-[11px] text-rose-300">
              {this.state.errorMessage}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={this.handleRecoverToTitle}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[#007AFF] text-xs font-extrabold text-white hover:bg-[#0066CC]"
            >
              <Home className="size-4" />
              <span>Return to Title Screen (Keep Progress)</span>
            </button>

            <button
              onClick={this.handleEmergencyExport}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 text-xs font-bold text-white hover:bg-white/15"
            >
              <Download className="size-4 text-emerald-400" />
              <span>Export Emergency Save (.JSON)</span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-white/5 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              <RefreshCw className="size-3.5" />
              <span>Reload Browser Tab</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
