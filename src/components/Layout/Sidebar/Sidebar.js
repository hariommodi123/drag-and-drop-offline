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
  ShoppingCart,
  X,
  Warehouse,
  DollarSign,
  Lock
} from 'lucide-react';
import { getTranslation } from '../../../utils/translations';
import { isModuleUnlocked, getUpgradeMessage } from '../../../utils/planUtils';

const Sidebar = ({ onClose }) => {
  const { state, dispatch } = useApp();
  
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
    // Check if module is unlocked
    if (!isModuleUnlocked(view, state.currentPlan)) {
      window.showToast(getUpgradeMessage(view, state.currentPlan), 'warning');
      return;
    }
    
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view });
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-gray-800 bg-[#1b1b1b]">
        <div className="flex items-center min-w-0">
          <div className="p-2 bg-white rounded-lg flex-shrink-0 shadow-lg">
            <ShoppingCart className="w-8 h-8 text-black" />
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
          const isUnlocked = isModuleUnlocked(item.href, state.currentPlan);
          const isUpgradePage = item.href === 'upgrade';
          
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
            className={`flex items-center px-4 py-3 mx-3 w-full text-left rounded-lg transition-all duration-200 ${
              state.currentView === 'settings' 
                ? 'bg-white text-black shadow-lg font-semibold' 
                : isModuleUnlocked('settings', state.currentPlan)
                ? 'text-gray-300 hover:bg-gray-900 hover:text-white'
                : 'text-gray-700 cursor-not-allowed'
            }`}
            disabled={!isModuleUnlocked('settings', state.currentPlan)}
          >
            <Settings className={`w-6 h-6 ${state.currentView === 'settings' ? 'text-black' : isModuleUnlocked('settings', state.currentPlan) ? 'text-gray-300' : 'text-gray-700'}`} />
            <span className="ml-3 font-medium">{getTranslation('settings', state.currentLanguage)}</span>
            {!isModuleUnlocked('settings', state.currentPlan) && (
              <Lock className="w-4 h-4 ml-auto text-gray-400" />
            )}
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
