import { Component, type ReactNode } from 'react';
import { HU_BRAND_GREEN } from '../config/appImages';
import { BrandLogo } from './BrandLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/** Prevents a blank white screen when something throws */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('ProjectHub error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'linear-gradient(180deg, #f0fdf4, #ffffff)' }}
        >
          <div className="max-w-md w-full text-center bg-white rounded-2xl border-2 p-8 shadow-xl" style={{ borderColor: `${HU_BRAND_GREEN}30` }}>
            <BrandLogo variant="loading" className="mb-4" />
            <h1 className="text-xl font-extrabold text-black">Hormuud ProjectHub</h1>
            <p className="text-sm font-bold text-black mt-3">
              Something went wrong loading this page.
            </p>
            <p className="text-xs font-semibold text-black/70 mt-2">
              Run START_HERE.bat, then press Ctrl+Shift+R.
            </p>
            {this.state.message && (
              <p className="text-[10px] font-mono text-red-600 mt-2 break-all">{this.state.message}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
                style={{ background: HU_BRAND_GREEN }}
              >
                Refresh page
              </button>
              <a
                href="/"
                onClick={() => this.setState({ hasError: false })}
                className="px-5 py-2.5 rounded-xl font-bold text-sm border-2 text-black"
                style={{ borderColor: HU_BRAND_GREEN }}
              >
                Go to homepage
              </a>
            </div>
            <p className="text-[10px] font-bold text-black/50 mt-6 uppercase tracking-wider">{UNIVERSITY_NAME}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
