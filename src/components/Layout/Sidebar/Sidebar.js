import React from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Package, 
  Truck, 
  BrainCircuit, 
  BarChart3,
  Crown,
  Settings,
  X,
  Warehouse,
  DollarSign,
  Lock
} from 'lucide-react';
import { getTranslation } from '../../../utils/translations';
import { isModuleUnlocked, getUpgradeMessage } from '../../../utils/planUtils';

const parseExpiryDate = (rawValue) => {
  if (!rawValue) return null;
  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getSubscriptionExpiryDate = (state) => {
  if (!state) return null;
  const rawValue =
    state.subscription?.expiresAt ||
    state.subscription?.expiryDate ||
    state.subscription?.endDate ||
    state.currentPlanDetails?.expiresAt ||
    state.currentPlanDetails?.expiryDate ||
    state.currentPlanDetails?.endDate ||
    null;
  return parseExpiryDate(rawValue);
};

const Sidebar = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const subscriptionExpiryDate = getSubscriptionExpiryDate(state);
  const subscriptionStatus = typeof state.subscription?.status === 'string'
    ? state.subscription.status.toLowerCase()
    : null;
  const planExpired = state.isSubscriptionActive === false ||
    subscriptionStatus === 'expired' ||
    (subscriptionExpiryDate ? subscriptionExpiryDate.getTime() <= Date.now() : false);
  const planExpiredMessage = 'Your subscription has expired. Upgrade your plan to continue.';
  const settingsModuleUnlocked = isModuleUnlocked('settings', state.currentPlan, state.currentPlanDetails);
  const isSettingsUnlocked = planExpired ? false : settingsModuleUnlocked;
  
  const navigation = [
    { name: 'dashboard', href: 'dashboard', icon: LayoutDashboard },
    { name: 'customers', href: 'customers', icon: Users },
    { name: 'products', href: 'products', icon: Package },
    { name: 'inventory', href: 'inventory', icon: Warehouse },
    { name: 'billing', href: 'billing', icon: Receipt },
    { name: 'purchaseOrders', href: 'purchase', icon: Truck },
    { name: 'financial', href: 'financial', icon: DollarSign },
    { name: 'aiAssistant', href: 'assistant', icon: BrainCircuit },
    { name: 'reports', href: 'reports', icon: BarChart3 },
    { name: 'upgradePlan', href: 'upgrade', icon: Crown },
  ];

  const handleNavigation = (view) => {
    if (planExpired && view !== 'upgrade') {
      if (window.showToast) window.showToast(planExpiredMessage, 'warning');
      return;
    }

    // Check if module is unlocked
    if (view !== 'dashboard' && !isModuleUnlocked(view, state.currentPlan, state.currentPlanDetails)) {
      window.showToast(getUpgradeMessage(view, state.currentPlan), 'warning');
      return;
    }
    
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view });
    if (onClose) onClose();
  };

  const logoSrc = `${process.env.PUBLIC_URL || ''}/assets/drag-and-drop-logo.jpg`;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-gray-800 bg-[#1b1b1b]">
        <div className="flex items-center min-w-0">
          <div className="p-2 bg-white rounded-lg flex-shrink-0 shadow-lg">
            <img
              src={logoSrc}
              alt="Drag & Drop"
              className="w-10 h-10 object-contain"
            />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white ml-3 truncate">DRAG & DROP</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-white hover:text-gray-400 hover:bg-gray-900 flex-shrink-0 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <ul className="flex-1 flex flex-col py-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = state.currentView === item.href;
          const isUpgradePage = item.href === 'upgrade';
          const baseUnlocked = item.href === 'dashboard'
            ? true
            : isModuleUnlocked(item.href, state.currentPlan, state.currentPlanDetails);
          const isUnlocked = planExpired ? isUpgradePage : baseUnlocked;
          const buttonTitle = !isUnlocked
            ? planExpired && !isUpgradePage
              ? planExpiredMessage
              : getUpgradeMessage(item.href, state.currentPlan)
            : undefined;
          
          return (
            <li key={item.name}>
              <button
                onClick={() => handleNavigation(item.href)}
                className={`flex items-center px-4 py-3 mx-3 w-full text-left rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-white text-black shadow-lg font-semibold' 
                    : isUnlocked
                    ? isUpgradePage
                      ? 'text-white hover:bg-gray-900 border border-gray-700'
                      : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                    : 'text-gray-700 cursor-not-allowed'
                }`}
                title={buttonTitle}
                disabled={!isUnlocked}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-black' : isUnlocked ? isUpgradePage ? 'text-white' : 'text-gray-300' : 'text-gray-700'}`} />
                <span className="ml-3 font-medium">{getTranslation(item.name, state.currentLanguage)}</span>
                {!isUnlocked && (
                  <Lock className="w-4 h-4 ml-auto text-gray-700" />
                )}
                {isUpgradePage && (
                  <Crown className="w-4 h-4 ml-auto text-yellow-400" />
                )}
              </button>
            </li>
          );
        })}
        
        {/* Spacer */}
        <li className="flex-1"></li>
        
        {/* Settings Link */}
        <li>
          <button
            onClick={() => handleNavigation('settings')}
            title={
              planExpired
                ? planExpiredMessage
                : !settingsModuleUnlocked
                ? getUpgradeMessage('settings', state.currentPlan)
                : undefined
            }
            className={`flex items-center px-4 py-3 mx-3 w-full text-left rounded-lg transition-all duration-200 ${
              state.currentView === 'settings' 
                ? 'bg-white text-black shadow-lg font-semibold' 
                : planExpired
                ? 'text-gray-700 cursor-not-allowed'
                : settingsModuleUnlocked
                ? 'text-gray-300 hover:bg-gray-900 hover:text-white'
                : 'text-gray-700 cursor-not-allowed'
            }`}
            disabled={!isSettingsUnlocked}
          >
            <Settings className={`w-6 h-6 ${state.currentView === 'settings' ? 'text-black' : isSettingsUnlocked ? 'text-gray-300' : 'text-gray-700'}`} />
            <span className="ml-3 font-medium">{getTranslation('settings', state.currentLanguage)}</span>
            {!isSettingsUnlocked && (
              <Lock className="w-4 h-4 ml-auto text-gray-400" />
            )}
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
