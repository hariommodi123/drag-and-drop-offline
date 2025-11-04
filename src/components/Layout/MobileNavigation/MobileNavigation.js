import React from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Package, 
  Warehouse,
  Truck,
  DollarSign,
  Bot, 
  BarChart3,
  Crown,
  Settings
} from 'lucide-react';
import { isModuleUnlocked, getUpgradeMessage } from '../../../utils/planUtils';

const MobileNavigation = () => {
  const { state, dispatch } = useApp();
  
  const navigation = [
    { name: 'Dashboard', href: 'dashboard', icon: LayoutDashboard },
    { name: 'Customers', href: 'customers', icon: Users },
    { name: 'Products', href: 'products', icon: Package },
    { name: 'Inventory', href: 'inventory', icon: Warehouse },
    { name: 'Billing', href: 'billing', icon: Receipt },
    { name: 'Purchase', href: 'purchase', icon: Truck },
    { name: 'Financial', href: 'financial', icon: DollarSign },
    { name: 'Assistant', href: 'assistant', icon: Bot },
    { name: 'Reports', href: 'reports', icon: BarChart3 },
    { name: 'Upgrade', href: 'upgrade', icon: Crown },
  ];

  const handleNavigation = (view) => {
    if (!isModuleUnlocked(view, state.currentPlan)) {
      if (window.showToast) window.showToast(getUpgradeMessage(view, state.currentPlan), 'warning');
      return;
    }
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view });
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex justify-around py-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = state.currentView === item.href;
          
          const isUnlocked = isModuleUnlocked(item.href, state.currentPlan);
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={`flex flex-col items-center p-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-green-600'
                  : isUnlocked ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400'
              }`}
              disabled={!isUnlocked}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavigation;
