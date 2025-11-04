import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { 
  addItem as addToIndexedDB, 
  updateItem as updateInIndexedDB, 
  deleteItem as deleteFromIndexedDB,
  getAllItems,
  STORES
} from '../utils/indexedDB';

// Helper function to get user-specific storage keys
const getUserStorageKey = (key, userId) => {
  if (!userId) return key;
  return `${key}_${userId}`;
};

// Load initial state from localStorage if available
const getInitialState = () => {
  const savedAuth = localStorage.getItem('auth');
  const savedSettings = localStorage.getItem('settings');
  
  let authState = { isAuthenticated: false, currentUser: null };
  if (savedAuth) {
    try {
      authState = JSON.parse(savedAuth);
    } catch (e) {
      console.error('Error parsing saved auth:', e);
    }
  }
  
  let settingsState = {
    currentLanguage: 'en',
    voiceAssistantLanguage: 'en-US',
    voiceAssistantEnabled: true,
    expiryDaysThreshold: 3,
    lowStockThreshold: 10,
    subscriptionDays: 30,
    isSubscriptionActive: true,
    currentPlan: 'basic',
    gstNumber: '',
    storeName: 'Grocery Store'
  };
  
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      settingsState = { ...settingsState, ...parsed };
    } catch (e) {
      console.error('Error parsing saved settings:', e);
    }
  }
  
  return {
    // Authentication
    isAuthenticated: authState.isAuthenticated,
    currentUser: authState.currentUser || null,
    
    // Language settings
    currentLanguage: settingsState.currentLanguage,
    voiceAssistantLanguage: settingsState.voiceAssistantLanguage,
    voiceAssistantEnabled: settingsState.voiceAssistantEnabled,
    
    // Data
    customers: [],
    products: [],
    purchaseOrders: [],
    transactions: [],
    activities: [],
    
    // UI state
    currentView: 'dashboard',
    isListening: false,
    isLoading: false,
    refreshTrigger: 0,
    
    // Pagination
    customerCurrentPage: 1,
    productCurrentPage: 1,
    itemsPerPage: 50,
    
    // Current operations
    currentBillItems: [],
    currentPOItems: [],
    
    // Settings
    expiryDaysThreshold: settingsState.expiryDaysThreshold,
    lowStockThreshold: settingsState.lowStockThreshold,
    
    // Subscription system
    subscriptionDays: settingsState.subscriptionDays,
    isSubscriptionActive: settingsState.isSubscriptionActive,
    currentPlan: settingsState.currentPlan,
    
    // Business details
    gstNumber: settingsState.gstNumber,
    storeName: settingsState.storeName,
    
    // Scanner state
    isScannerActive: false,
    scannerType: 'html5-qrcode',
    
    // Charts and reports
    salesChartData: null,
    profitChartData: null,
    inventoryChartData: null,
    customerChartData: null,
    
    // Time and status
    currentTime: new Date().toLocaleTimeString(),
    systemStatus: 'online'
  };
};

const initialState = getInitialState();

// Action types
export const ActionTypes = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  
  // Language
  SET_LANGUAGE: 'SET_LANGUAGE',
  SET_VOICE_LANGUAGE: 'SET_VOICE_LANGUAGE',
  
  // Plan management
  SET_CURRENT_PLAN: 'SET_CURRENT_PLAN',
  
  // Data management
  SET_CUSTOMERS: 'SET_CUSTOMERS',
  ADD_CUSTOMER: 'ADD_CUSTOMER',
  UPDATE_CUSTOMER: 'UPDATE_CUSTOMER',
  DELETE_CUSTOMER: 'DELETE_CUSTOMER',
  
  SET_PRODUCTS: 'SET_PRODUCTS',
  ADD_PRODUCT: 'ADD_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  
  SET_PURCHASE_ORDERS: 'SET_PURCHASE_ORDERS',
  ADD_PURCHASE_ORDER: 'ADD_PURCHASE_ORDER',
  UPDATE_PURCHASE_ORDER: 'UPDATE_PURCHASE_ORDER',
  DELETE_PURCHASE_ORDER: 'DELETE_PURCHASE_ORDER',
  
  SET_TRANSACTIONS: 'SET_TRANSACTIONS',
  ADD_TRANSACTION: 'ADD_TRANSACTION',
  UPDATE_TRANSACTION: 'UPDATE_TRANSACTION',
  
  SET_ACTIVITIES: 'SET_ACTIVITIES',
  ADD_ACTIVITY: 'ADD_ACTIVITY',
  
  // UI state
  SET_CURRENT_VIEW: 'SET_CURRENT_VIEW',
  SET_LISTENING: 'SET_LISTENING',
  SET_LOADING: 'SET_LOADING',
  FORCE_REFRESH: 'FORCE_REFRESH',
  
  // Pagination
  SET_CUSTOMER_PAGE: 'SET_CUSTOMER_PAGE',
  SET_PRODUCT_PAGE: 'SET_PRODUCT_PAGE',
  
  // Current operations
  SET_BILL_ITEMS: 'SET_BILL_ITEMS',
  ADD_BILL_ITEM: 'ADD_BILL_ITEM',
  REMOVE_BILL_ITEM: 'REMOVE_BILL_ITEM',
  CLEAR_BILL_ITEMS: 'CLEAR_BILL_ITEMS',
  
  SET_PO_ITEMS: 'SET_PO_ITEMS',
  ADD_PO_ITEM: 'ADD_PO_ITEM',
  REMOVE_PO_ITEM: 'REMOVE_PO_ITEM',
  CLEAR_PO_ITEMS: 'CLEAR_PO_ITEMS',
  
  // Settings
  SET_LOW_STOCK_THRESHOLD: 'SET_LOW_STOCK_THRESHOLD',
  SET_EXPIRY_DAYS_THRESHOLD: 'SET_EXPIRY_DAYS_THRESHOLD',
  
  // Subscription
  SET_SUBSCRIPTION_DAYS: 'SET_SUBSCRIPTION_DAYS',
  SET_SUBSCRIPTION_ACTIVE: 'SET_SUBSCRIPTION_ACTIVE',
  
  // Business details
  SET_GST_NUMBER: 'SET_GST_NUMBER',
  SET_STORE_NAME: 'SET_STORE_NAME',
  
  // User
  UPDATE_USER: 'UPDATE_USER',
  SET_VOICE_ASSISTANT_LANGUAGE: 'SET_VOICE_ASSISTANT_LANGUAGE',
  SET_VOICE_ASSISTANT_ENABLED: 'SET_VOICE_ASSISTANT_ENABLED',
  
  // Scanner
  SET_SCANNER_ACTIVE: 'SET_SCANNER_ACTIVE',
  SET_SCANNER_TYPE: 'SET_SCANNER_TYPE',
  
  // Charts
  SET_SALES_CHART_DATA: 'SET_SALES_CHART_DATA',
  SET_PROFIT_CHART_DATA: 'SET_PROFIT_CHART_DATA',
  SET_INVENTORY_CHART_DATA: 'SET_INVENTORY_CHART_DATA',
  SET_CUSTOMER_CHART_DATA: 'SET_CUSTOMER_CHART_DATA',
  
  // Time and status
  UPDATE_CURRENT_TIME: 'UPDATE_CURRENT_TIME',
  SET_SYSTEM_STATUS: 'SET_SYSTEM_STATUS'
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.LOGIN:
      // Save auth to localStorage
      localStorage.setItem('auth', JSON.stringify({ 
        isAuthenticated: true, 
        currentUser: action.payload 
      }));
      
      // Notify service worker that user is authenticated
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'AUTHENTICATED',
          user: action.payload
        });
      }
      
      return {
        ...state,
        isAuthenticated: true,
        currentUser: action.payload
      };
      
    case ActionTypes.LOGOUT:
      // Clear auth from localStorage
      localStorage.removeItem('auth');
      
      // Notify service worker that user logged out
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'LOGGED_OUT'
        });
      }
      
      return {
        ...state,
        isAuthenticated: false,
        currentUser: null
      };
      
    case ActionTypes.SET_LANGUAGE:
      return {
        ...state,
        currentLanguage: action.payload
      };
      
    case ActionTypes.SET_CURRENT_PLAN:
      return {
        ...state,
        currentPlan: action.payload
      };
      
    case ActionTypes.SET_VOICE_LANGUAGE:
      return {
        ...state,
        voiceAssistantLanguage: action.payload
      };
      
    case ActionTypes.SET_CUSTOMERS:
      return {
        ...state,
        customers: action.payload
      };
      
    case ActionTypes.ADD_CUSTOMER:
      // Sync to IndexedDB
      addToIndexedDB(STORES.customers, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        customers: [action.payload, ...state.customers]
      };
      
    case ActionTypes.UPDATE_CUSTOMER:
      // Sync to IndexedDB
      updateInIndexedDB(STORES.customers, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        customers: state.customers.map(customer =>
          customer.id === action.payload.id ? action.payload : customer
        )
      };
      
    case ActionTypes.DELETE_CUSTOMER:
      // Sync to IndexedDB
      deleteFromIndexedDB(STORES.customers, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        customers: state.customers.filter(customer => customer.id !== action.payload)
      };
      
    case ActionTypes.SET_PRODUCTS:
      return {
        ...state,
        products: action.payload
      };
      
    case ActionTypes.ADD_PRODUCT:
      // Sync to IndexedDB
      addToIndexedDB(STORES.products, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        products: [action.payload, ...state.products]
      };
      
    case ActionTypes.UPDATE_PRODUCT:
      // Sync to IndexedDB
      updateInIndexedDB(STORES.products, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.payload.id ? action.payload : product
        )
      };
      
    case ActionTypes.DELETE_PRODUCT:
      // Sync to IndexedDB
      deleteFromIndexedDB(STORES.products, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        products: state.products.filter(product => product.id !== action.payload)
      };
      
    case ActionTypes.SET_PURCHASE_ORDERS:
      return {
        ...state,
        purchaseOrders: action.payload
      };
      
    case ActionTypes.ADD_PURCHASE_ORDER:
      // Sync to IndexedDB
      addToIndexedDB(STORES.purchaseOrders, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        purchaseOrders: [action.payload, ...state.purchaseOrders]
      };
      
    case ActionTypes.UPDATE_PURCHASE_ORDER:
      // Sync to IndexedDB
      updateInIndexedDB(STORES.purchaseOrders, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.map(po =>
          po.id === action.payload.id ? action.payload : po
        )
      };
      
    case ActionTypes.DELETE_PURCHASE_ORDER:
      // Sync to IndexedDB
      deleteFromIndexedDB(STORES.purchaseOrders, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.filter(po => po.id !== action.payload)
      };
      
    case ActionTypes.SET_TRANSACTIONS:
      return {
        ...state,
        transactions: action.payload
      };
      
    case ActionTypes.ADD_TRANSACTION:
      // Sync to IndexedDB
      addToIndexedDB(STORES.transactions, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        transactions: [action.payload, ...state.transactions]
      };
      
    case ActionTypes.UPDATE_TRANSACTION:
      // Sync to IndexedDB
      updateInIndexedDB(STORES.transactions, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        transactions: state.transactions.map(transaction =>
          transaction.id === action.payload.id ? action.payload : transaction
        )
      };
      
    case ActionTypes.SET_ACTIVITIES:
      return {
        ...state,
        activities: action.payload
      };
      
    case ActionTypes.ADD_ACTIVITY:
      // Sync to IndexedDB
      addToIndexedDB(STORES.activities, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        activities: [action.payload, ...state.activities]
      };
      
    case ActionTypes.SET_CURRENT_VIEW:
      return {
        ...state,
        currentView: action.payload
      };
      
    case ActionTypes.SET_LISTENING:
      return {
        ...state,
        isListening: action.payload
      };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
      
    case ActionTypes.FORCE_REFRESH:
      return {
        ...state,
        refreshTrigger: Date.now() // This will force re-render
      };
      
    case ActionTypes.SET_CUSTOMER_PAGE:
      return {
        ...state,
        customerCurrentPage: action.payload
      };
      
    case ActionTypes.SET_PRODUCT_PAGE:
      return {
        ...state,
        productCurrentPage: action.payload
      };
      
    case ActionTypes.SET_BILL_ITEMS:
      return {
        ...state,
        currentBillItems: action.payload
      };
      
    case ActionTypes.ADD_BILL_ITEM:
      return {
        ...state,
        currentBillItems: [...state.currentBillItems, action.payload]
      };
      
    case ActionTypes.REMOVE_BILL_ITEM:
      return {
        ...state,
        currentBillItems: state.currentBillItems.filter((_, index) => index !== action.payload)
      };
      
    case ActionTypes.CLEAR_BILL_ITEMS:
      return {
        ...state,
        currentBillItems: []
      };
      
    case ActionTypes.SET_PO_ITEMS:
      return {
        ...state,
        currentPOItems: action.payload
      };
      
    case ActionTypes.ADD_PO_ITEM:
      return {
        ...state,
        currentPOItems: [...state.currentPOItems, action.payload]
      };
      
    case ActionTypes.REMOVE_PO_ITEM:
      return {
        ...state,
        currentPOItems: state.currentPOItems.filter((_, index) => index !== action.payload)
      };
      
    case ActionTypes.CLEAR_PO_ITEMS:
      return {
        ...state,
        currentPOItems: []
      };
      
    case ActionTypes.SET_LOW_STOCK_THRESHOLD:
      return {
        ...state,
        lowStockThreshold: action.payload
      };
      
    case ActionTypes.SET_EXPIRY_DAYS_THRESHOLD:
      return {
        ...state,
        expiryDaysThreshold: action.payload
      };
      
    case ActionTypes.SET_SUBSCRIPTION_DAYS:
      return {
        ...state,
        subscriptionDays: action.payload
      };
      
    case ActionTypes.SET_SUBSCRIPTION_ACTIVE:
      return {
        ...state,
        isSubscriptionActive: action.payload
      };
      
    case ActionTypes.SET_SCANNER_ACTIVE:
      return {
        ...state,
        isScannerActive: action.payload
      };
      
    case ActionTypes.SET_SCANNER_TYPE:
      return {
        ...state,
        scannerType: action.payload
      };
      
    case ActionTypes.SET_SALES_CHART_DATA:
      return {
        ...state,
        salesChartData: action.payload
      };
      
    case ActionTypes.SET_PROFIT_CHART_DATA:
      return {
        ...state,
        profitChartData: action.payload
      };
      
    case ActionTypes.SET_INVENTORY_CHART_DATA:
      return {
        ...state,
        inventoryChartData: action.payload
      };
      
    case ActionTypes.SET_CUSTOMER_CHART_DATA:
      return {
        ...state,
        customerChartData: action.payload
      };
      
    case ActionTypes.UPDATE_CURRENT_TIME:
      return {
        ...state,
        currentTime: action.payload
      };
      
    case ActionTypes.SET_SYSTEM_STATUS:
      return {
        ...state,
        systemStatus: action.payload
      };
      
    case ActionTypes.SET_GST_NUMBER:
      return {
        ...state,
        gstNumber: action.payload
      };
      
    case ActionTypes.SET_STORE_NAME:
      return {
        ...state,
        storeName: action.payload
      };
      
    case ActionTypes.UPDATE_USER:
      return {
        ...state,
        currentUser: action.payload
      };
      
    case ActionTypes.SET_VOICE_ASSISTANT_LANGUAGE:
      return {
        ...state,
        voiceAssistantLanguage: action.payload
      };
      
    case ActionTypes.SET_VOICE_ASSISTANT_ENABLED:
      return {
        ...state,
        voiceAssistantEnabled: action.payload
      };
      
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadDataFromIndexedDB = async () => {
      try {
        // Load all data from IndexedDB
        const [customers, products, transactions, purchaseOrders, activities] = await Promise.all([
          getAllItems(STORES.customers).catch(() => []),
          getAllItems(STORES.products).catch(() => []),
          getAllItems(STORES.transactions).catch(() => []),
          getAllItems(STORES.purchaseOrders).catch(() => []),
          getAllItems(STORES.activities).catch(() => [])
        ]);

        // Always update state with data from IndexedDB (this is the source of truth)
        dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: customers || [] });
        dispatch({ type: ActionTypes.SET_PRODUCTS, payload: products || [] });
        dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: transactions || [] });
        dispatch({ type: ActionTypes.SET_PURCHASE_ORDERS, payload: purchaseOrders || [] });
        dispatch({ type: ActionTypes.SET_ACTIVITIES, payload: activities || [] });
      } catch (error) {
        console.error('Error loading data from IndexedDB:', error);
        // Fallback to localStorage if IndexedDB fails
        const userId = state.currentUser?.email || state.currentUser?.uid;
        if (userId) {
          const savedCustomers = localStorage.getItem(getUserStorageKey('customers', userId));
          const savedProducts = localStorage.getItem(getUserStorageKey('products', userId));
          const savedTransactions = localStorage.getItem(getUserStorageKey('transactions', userId));
          const savedPurchaseOrders = localStorage.getItem(getUserStorageKey('purchaseOrders', userId));
          const savedActivities = localStorage.getItem(getUserStorageKey('activities', userId));
          
          if (savedCustomers) {
            dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: JSON.parse(savedCustomers) });
          }
          if (savedProducts) {
            dispatch({ type: ActionTypes.SET_PRODUCTS, payload: JSON.parse(savedProducts) });
          }
          if (savedTransactions) {
            dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: JSON.parse(savedTransactions) });
          }
          if (savedPurchaseOrders) {
            dispatch({ type: ActionTypes.SET_PURCHASE_ORDERS, payload: JSON.parse(savedPurchaseOrders) });
          }
          if (savedActivities) {
            dispatch({ type: ActionTypes.SET_ACTIVITIES, payload: JSON.parse(savedActivities) });
          }
        }
      }
    };

    // Load data from IndexedDB on mount
    loadDataFromIndexedDB();
  }, []); // Only run on mount

  // Load user-specific data when user changes
  useEffect(() => {
    const userId = state.currentUser?.email || state.currentUser?.uid;
    
    if (!userId) {
      // User logged out - clear all data from state but keep IndexedDB
      dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: [] });
      dispatch({ type: ActionTypes.SET_PRODUCTS, payload: [] });
      dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: [] });
      dispatch({ type: ActionTypes.SET_PURCHASE_ORDERS, payload: [] });
      dispatch({ type: ActionTypes.SET_ACTIVITIES, payload: [] });
      return;
    }
    
    // Reload data from IndexedDB when user changes
    const loadUserData = async () => {
      try {
        const [customers, products, transactions, purchaseOrders, activities] = await Promise.all([
          getAllItems(STORES.customers).catch(() => []),
          getAllItems(STORES.products).catch(() => []),
          getAllItems(STORES.transactions).catch(() => []),
          getAllItems(STORES.purchaseOrders).catch(() => []),
          getAllItems(STORES.activities).catch(() => [])
        ]);

        dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: customers || [] });
        dispatch({ type: ActionTypes.SET_PRODUCTS, payload: products || [] });
        dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: transactions || [] });
        dispatch({ type: ActionTypes.SET_PURCHASE_ORDERS, payload: purchaseOrders || [] });
        dispatch({ type: ActionTypes.SET_ACTIVITIES, payload: activities || [] });
      } catch (error) {
        console.error('Error loading user data from IndexedDB:', error);
      }
    };
    
    loadUserData();
    
    // Also load settings from localStorage (settings are small and user-specific)
    const savedSettings = localStorage.getItem(getUserStorageKey('settings', userId));
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: ActionTypes.SET_LOW_STOCK_THRESHOLD, payload: settings.lowStockThreshold });
        dispatch({ type: ActionTypes.SET_EXPIRY_DAYS_THRESHOLD, payload: settings.expiryDaysThreshold });
        dispatch({ type: ActionTypes.SET_SUBSCRIPTION_DAYS, payload: settings.subscriptionDays });
        dispatch({ type: ActionTypes.SET_SUBSCRIPTION_ACTIVE, payload: settings.isSubscriptionActive });
        dispatch({ type: ActionTypes.SET_CURRENT_PLAN, payload: settings.currentPlan });
        if (settings.gstNumber) {
          dispatch({ type: ActionTypes.SET_GST_NUMBER, payload: settings.gstNumber });
        }
        if (settings.storeName) {
          dispatch({ type: ActionTypes.SET_STORE_NAME, payload: settings.storeName });
        }
        if (settings.voiceAssistantEnabled !== undefined) {
          dispatch({ type: ActionTypes.SET_VOICE_ASSISTANT_ENABLED, payload: settings.voiceAssistantEnabled });
        }
        if (settings.voiceAssistantLanguage) {
          dispatch({ type: ActionTypes.SET_VOICE_ASSISTANT_LANGUAGE, payload: settings.voiceAssistantLanguage });
        }
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    }
  }, [state.currentUser]);

  // Save user-specific data when it changes
  useEffect(() => {
    const userId = state.currentUser?.email || state.currentUser?.uid;
    if (!userId) return;
    
    localStorage.setItem(getUserStorageKey('customers', userId), JSON.stringify(state.customers));
  }, [state.customers, state.currentUser]);

  useEffect(() => {
    const userId = state.currentUser?.email || state.currentUser?.uid;
    if (!userId) return;
    
    localStorage.setItem(getUserStorageKey('products', userId), JSON.stringify(state.products));
  }, [state.products, state.currentUser]);

  useEffect(() => {
    const userId = state.currentUser?.email || state.currentUser?.uid;
    if (!userId) return;
    
    localStorage.setItem(getUserStorageKey('transactions', userId), JSON.stringify(state.transactions));
  }, [state.transactions, state.currentUser]);

  useEffect(() => {
    const userId = state.currentUser?.email || state.currentUser?.uid;
    if (!userId) return;
    
    localStorage.setItem(getUserStorageKey('purchaseOrders', userId), JSON.stringify(state.purchaseOrders));
  }, [state.purchaseOrders, state.currentUser]);

  useEffect(() => {
    const userId = state.currentUser?.email || state.currentUser?.uid;
    if (!userId) return;
    
    localStorage.setItem(getUserStorageKey('activities', userId), JSON.stringify(state.activities));
  }, [state.activities, state.currentUser]);

  useEffect(() => {
    const userId = state.currentUser?.email || state.currentUser?.uid;
    if (!userId) return;
    
    const settings = {
      lowStockThreshold: state.lowStockThreshold,
      expiryDaysThreshold: state.expiryDaysThreshold,
      subscriptionDays: state.subscriptionDays,
      isSubscriptionActive: state.isSubscriptionActive,
      currentPlan: state.currentPlan,
      gstNumber: state.gstNumber,
      storeName: state.storeName,
      voiceAssistantEnabled: state.voiceAssistantEnabled,
      voiceAssistantLanguage: state.voiceAssistantLanguage
    };
    localStorage.setItem(getUserStorageKey('settings', userId), JSON.stringify(settings));
  }, [state.lowStockThreshold, state.expiryDaysThreshold, state.subscriptionDays, state.isSubscriptionActive, state.currentPlan, state.gstNumber, state.storeName, state.voiceAssistantEnabled, state.voiceAssistantLanguage, state.currentUser]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: ActionTypes.UPDATE_CURRENT_TIME, payload: new Date().toLocaleTimeString() });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const value = {
    state,
    dispatch
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
