import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Menu, Bell, Clock, Globe, Download } from 'lucide-react';
import NotificationsModal from '../NotificationsModal/NotificationsModal';
import { getTranslation } from '../../../utils/translations';
import { usePWAInstall } from '../../../hooks/usePWAInstall';

const Header = ({ onMenuClick }) => {
  const { state, dispatch } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const getViewTitle = (view) => {
    return getTranslation(view, state.currentLanguage);
  };

  const toggleLanguage = () => {
    const newLanguage = state.currentLanguage === 'en' ? 'hi' : 'en';
    dispatch({ type: 'SET_LANGUAGE', payload: newLanguage });
  };

  return (
    <header className="bg-[#1b1b1b] shadow-lg border-b border-gray-900 px-6 py-5 flex justify-between items-center flex-shrink-0 z-10">
      <div className="flex items-center space-x-8">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-white hover:text-gray-200 hover:bg-gray-900 transition-all"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Page title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
          {getViewTitle(state.currentView)}
        </h1>

        {/* Current Time Display - Inline */}
        <div className="hidden sm:flex items-center space-x-2 text-gray-200">
          <Clock className="w-5 h-5" />
          <span className="font-mono text-lg font-semibold tracking-wide">
            {state.currentTime}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Install App Button - Only show if installable and not already installed */}
        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all flex items-center space-x-2 shadow-lg"
            title="Install App"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm">Install App</span>
          </button>
        )}

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-lg text-white hover:text-gray-200 hover:bg-gray-900 transition-all flex items-center space-x-2"
          title={`Switch to ${state.currentLanguage === 'en' ? 'Hindi' : 'English'}`}
        >
          <Globe className="h-5 w-5" />
          <span className="text-sm font-medium">
            {state.currentLanguage === 'en' ? 'हिं' : 'EN'}
          </span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(true)}
            className="p-2 rounded-lg text-white hover:text-gray-200 hover:bg-gray-900 transition-all relative"
          >
            <Bell className="h-5 w-5" />
            {/* Badge for alerts */}
            {(() => {
              const lowStockCount = state.products.filter(p => (p.stock || 0) <= state.lowStockThreshold).length;
              const expiringCount = state.products.filter(p => {
                if (!p.expiryDate) return false;
                const expiryDate = new Date(p.expiryDate);
                const now = new Date();
                const diffTime = expiryDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= state.expiryDaysThreshold;
              }).length;
              const totalAlerts = lowStockCount + expiringCount;
              return totalAlerts > 0 ? (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                  {totalAlerts}
                </span>
              ) : null;
            })()}
          </button>
        </div>

        {/* User menu */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-white">
              {state.currentUser?.username || 'User'}
            </p>
            <p className="text-xs text-gray-300">Admin</p>
          </div>
          <div className="flex-shrink-0">
            <img
              className="h-8 w-8 rounded-full ring-2 ring-white shadow-lg"
              src={state.currentUser?.photoURL || `https://placehold.co/40x40/1b1b1b/ffffff?text=${state.currentUser?.username?.charAt(0).toUpperCase()}`}
              alt="User avatar"
              onError={(e) => {
                e.currentTarget.src = `https://placehold.co/40x40/1b1b1b/ffffff?text=${state.currentUser?.username?.charAt(0).toUpperCase()}`;
              }}
            />
          </div>
        </div>
      </div>

      {showNotifications && (
        <NotificationsModal onClose={() => setShowNotifications(false)} />
      )}
    </header>
  );
};

export default Header;
