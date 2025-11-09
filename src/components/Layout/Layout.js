import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Sidebar from './Sidebar/Sidebar';
import Header from './Header/Header';
import MobileNavigation from './MobileNavigation/MobileNavigation';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const Layout = ({ children }) => {
  const { state } = useApp();
  const isSeller = Boolean(state.currentUser?.sellerId);
  const planBootstrapState = state.planBootstrap || {};
  const shouldShowPlanLoader = isSeller && planBootstrapState.isActive && !planBootstrapState.hasCompleted;
  const [isPlanLoaderVisible, setIsPlanLoaderVisible] = useState(shouldShowPlanLoader);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const { prompt, isInstallable, isInstalled, install } = usePWAInstall();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [hasDismissedInstallPrompt, setHasDismissedInstallPrompt] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return sessionStorage.getItem('pwa-install-dismissed') === 'true';
  });

  useEffect(() => {
    if (shouldShowPlanLoader) {
      setIsPlanLoaderVisible(true);
      return;
    }
    if (!isPlanLoaderVisible) return;
    const timeout = setTimeout(() => setIsPlanLoaderVisible(false), 400);
    return () => clearTimeout(timeout);
  }, [shouldShowPlanLoader, isPlanLoaderVisible]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('pwa-install-dismissed', hasDismissedInstallPrompt ? 'true' : 'false');
  }, [hasDismissedInstallPrompt]);

  useEffect(() => {
    if (isInstallable && !isInstalled && !hasDismissedInstallPrompt) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 800);
      return () => clearTimeout(timer);
    }
    setShowInstallPrompt(false);
  }, [isInstallable, isInstalled, hasDismissedInstallPrompt]);

  // Simple toast functionality
  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  // Expose showToast to global context
  React.useEffect(() => {
    window.showToast = showToast;
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const installState = {
    prompt,
    isInstallable,
    isInstalled,
    install
  };

  const handleInstallClick = async () => {
    if (!install) {
      setHasDismissedInstallPrompt(true);
      setShowInstallPrompt(false);
      return;
    }

    try {
      await install();
    } finally {
      setHasDismissedInstallPrompt(true);
      setShowInstallPrompt(false);
    }
  };

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Desktop Sidebar */}
      <nav className="w-64 bg-[#1b1b1b] shadow-2xl flex-shrink-0 hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen border-r border-gray-800">
        <Sidebar />
      </nav>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-80" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-[#1b1b1b] shadow-2xl border-r border-gray-800">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <Header onMenuClick={() => setSidebarOpen(true)} installState={installState} />
        
        {state.systemStatus === 'offline' && (
          <div className="bg-amber-100 border-b border-amber-300 text-amber-800 text-sm px-4 py-2 text-center flex items-center justify-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true"></span>
            <span>You're offline. Changes will sync automatically when you reconnect.</span>
          </div>
        )}
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth no-scrollbar">
          <div className="p-2 sm:p-3 lg:p-4 xl:p-6 pb-6 sm:pb-20">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {isPlanLoaderVisible && (
        <div
          className={`fixed inset-0 z-[70] flex flex-col items-center justify-center transition-opacity duration-500 ease-out ${
            shouldShowPlanLoader ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-xl" aria-hidden="true"></div>
          <div className="relative flex flex-col items-center justify-center gap-6 rounded-3xl border border-white/10 bg-white/10 px-10 py-12 shadow-[0_35px_90px_-25px_rgba(15,23,42,0.65)] backdrop-blur-2xl">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-white/10 blur-xl"></div>
              <div className="h-16 w-16 animate-spin rounded-full border-[3px] border-white/25 border-t-white"></div>
            </div>
            <div className="space-y-2 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Please wait</p>
              <h2 className="text-2xl font-semibold">We are preparing your dashboard...</h2>
              <p className="text-sm text-white/70 max-w-sm">
                Fetching the latest plan details and unlocking your workspace.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-20 right-4 z-50 flex flex-col-reverse">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start p-4 rounded-lg border-l-4 shadow-xl backdrop-blur-sm min-w-[300px] max-w-[500px] mb-2 ${
              toast.type === 'success' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-500 text-green-800' :
              toast.type === 'error' ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-500 text-red-800' :
              toast.type === 'warning' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-500 text-yellow-800' :
              'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-500 text-orange-800'
            }`}
          >
            <div className="flex-1 pr-2">
              <p className="text-sm font-medium whitespace-pre-wrap break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {showInstallPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Install App</p>
              <h2 className="text-xl font-semibold text-slate-900">Drag &amp; Drop on your device</h2>
              <p className="text-sm text-slate-500">
                Install the PWA for instant access, faster launches, and full offline support.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setHasDismissedInstallPrompt(true);
                  setShowInstallPrompt(false);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-black/90 transition"
              >
                Install now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
