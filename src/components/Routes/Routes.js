import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Dashboard from '../Dashboard/Dashboard';
import Customers from '../Customers/Customers';
import Billing from '../Billing/Billing';
import Products from '../Products/Products';
import Inventory from '../Inventory/Inventory';
import Purchase from '../Purchase/Purchase';
import Financial from '../Financial/Financial';
import Assistant from '../Assistant/Assistant';
import Reports from '../Reports/Reports';
import Upgrade from '../Upgrade/Upgrade';
import Settings from '../Settings/Settings';
import { isModuleUnlocked, getUpgradeMessage } from '../../utils/planUtils';

const Routes = () => {
  const { state, dispatch } = useApp();

  // Check access when view changes
  useEffect(() => {
    // Skip check for upgrade page
    if (state.currentView === 'upgrade') return;
    
    // Check if current view is unlocked
    if (!isModuleUnlocked(state.currentView, state.currentPlan, state.currentPlanDetails)) {
      // Redirect to dashboard and show upgrade message
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'dashboard' });
      if (window.showToast) {
        window.showToast(getUpgradeMessage(state.currentView, state.currentPlan), 'warning');
      }
    }
  }, [state.currentView, state.currentPlan, state.currentPlanDetails, dispatch]);

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'billing':
        return <Billing />;
      case 'products':
        return <Products />;
      case 'inventory':
        return <Inventory />;
      case 'purchase':
        return <Purchase />;
      case 'financial':
        return <Financial />;
      case 'assistant':
        return <Assistant />;
      case 'reports':
        return <Reports />;
      case 'upgrade':
        return <Upgrade />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-full">
      {renderCurrentView()}
    </div>
  );
};

export default Routes;
