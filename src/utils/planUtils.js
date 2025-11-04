// Plan-based feature unlocking utility

export const PLAN_FEATURES = {
  basic: {
    unlockedModules: [
      'dashboard',
      'customers', 
      'products',
      'inventory',
      'billing',
      'settings'
    ],
    lockedModules: [
      'purchase',
      'financial',
      'assistant',
      'reports'
    ],
    maxCustomers: 149,
    maxProducts: 499,
    voiceAssistant: false,
    advancedReports: false,
    userManagement: false
  },
  standard: {
    unlockedModules: [
      'dashboard',
      'customers',
      'products', 
      'inventory',
      'billing',
      'purchase',
      'reports',
      'settings'
    ],
    lockedModules: [
      'financial',
      'assistant'
    ],
    maxCustomers: 299,
    maxProducts: 899,
    voiceAssistant: false, // Only text access
    advancedReports: false,
    userManagement: false
  },
  premium: {
    unlockedModules: [
      'dashboard',
      'customers',
      'products',
      'inventory', 
      'billing',
      'purchase',
      'financial',
      'assistant',
      'reports',
      'settings'
    ],
    lockedModules: [],
    maxCustomers: Infinity,
    maxProducts: Infinity,
    voiceAssistant: true,
    advancedReports: true,
    userManagement: true
  }
};

// Check if a module is unlocked for the current plan
export const isModuleUnlocked = (moduleName, currentPlan) => {
  // Always allow access to upgrade page
  if (moduleName === 'upgrade') return true;
  
  const planFeatures = PLAN_FEATURES[currentPlan];
  if (!planFeatures) return false;
  
  return planFeatures.unlockedModules.includes(moduleName);
};

// Check if user can add more customers
export const canAddCustomer = (currentCustomers, currentPlan) => {
  const planFeatures = PLAN_FEATURES[currentPlan];
  if (!planFeatures) return false;
  
  return currentCustomers < planFeatures.maxCustomers;
};

// Check if user can add more products
export const canAddProduct = (currentProducts, currentPlan) => {
  const planFeatures = PLAN_FEATURES[currentPlan];
  if (!planFeatures) return false;
  
  return currentProducts < planFeatures.maxProducts;
};

// Check if voice assistant is available
export const isVoiceAssistantAvailable = (currentPlan) => {
  const planFeatures = PLAN_FEATURES[currentPlan];
  if (!planFeatures) return false;
  
  return planFeatures.voiceAssistant;
};

// Check if advanced reports are available
export const isAdvancedReportsAvailable = (currentPlan) => {
  const planFeatures = PLAN_FEATURES[currentPlan];
  if (!planFeatures) return false;
  
  return planFeatures.advancedReports;
};

// Check if user management is available
export const isUserManagementAvailable = (currentPlan) => {
  const planFeatures = PLAN_FEATURES[currentPlan];
  if (!planFeatures) return false;
  
  return planFeatures.userManagement;
};

// Get plan limits
export const getPlanLimits = (currentPlan) => {
  const planFeatures = PLAN_FEATURES[currentPlan];
  if (!planFeatures) return { maxCustomers: 0, maxProducts: 0 };
  
  return {
    maxCustomers: planFeatures.maxCustomers,
    maxProducts: planFeatures.maxProducts
  };
};

// Get upgrade message for locked features
export const getUpgradeMessage = (feature, currentPlan) => {
  // No upgrade message for upgrade page itself
  if (feature === 'upgrade') return '';
  
  const messages = {
    purchase: 'Upgrade to Standard Plan to manage purchase orders',
    financial: 'Upgrade to Premium Plan to access financial management',
    assistant: currentPlan === 'basic' ? 'Upgrade to Premium Plan for voice assistant' : 'Upgrade to Premium Plan for full voice features',
    reports: currentPlan === 'basic' ? 'Upgrade to Standard Plan for basic reports' : 'Upgrade to Premium Plan for advanced reports',
    settings: 'Upgrade to Premium Plan for full settings control'
  };
  
  return messages[feature] || 'Upgrade your plan to access this feature';
};
