import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { 
  addItem as addToIndexedDB, 
  updateItem as updateInIndexedDB, 
  deleteItem as deleteFromIndexedDB,
  getAllItems,
  STORES
} from '../utils/indexedDB';
import syncService, { setStoreFunctionsProvider } from '../services/syncService';
import { 
  fetchAllData, 
  fetchCustomers, 
  fetchProducts, 
  fetchTransactions, 
  fetchVendorOrders, 
  fetchCategories,
  isOnline,
  syncToIndexedDB
} from '../utils/dataFetcher';
import { apiRequest, createOrder } from '../utils/api';
import { setOrderHashPendingChecker, setOnItemSyncedCallback } from '../services/syncService';

// Track pending order API calls to prevent duplicates
// Key: order content hash, Value: order ID
const pendingOrderApiCalls = new Map();

// Store dispatch reference for async operations to update state
let globalDispatch = null;

export const setGlobalDispatch = (dispatch) => {
  globalDispatch = dispatch;
};

// Export function to check if an order is currently being processed
export const isOrderBeingProcessed = (order) => {
  if (!order) return false;
  const orderHash = createOrderHash(order);
  return pendingOrderApiCalls.has(orderHash);
};

// Export function to check if an order hash is being processed
export const isOrderHashBeingProcessed = (orderHash) => {
  return pendingOrderApiCalls.has(orderHash);
};

// Recompute metrics and chart data derived from orders/products
const recomputeDerivedData = (state) => {
  try {
    const orders = state.orders || [];
    const products = state.products || [];
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 29);

    // Build daily buckets for last 30 days
    const dayKey = (d) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    const days = [];
    const map = new Map();
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const k = dayKey(d);
      days.push(k);
      map.set(k, { sales: 0, profit: 0 });
    }

    let totalSales = 0;
    let totalProfit = 0;
    let salesToday = 0;
    let profitToday = 0;
    const todayKey = dayKey(now);

    for (const o of orders) {
      const d = new Date(o.createdAt || o.date || now);
      const k = dayKey(d);
      const orderTotal = Number(o.totalAmount || 0);
      const orderProfit = (o.items || []).reduce((acc, it) => {
        const sp = Number(it.sellingPrice || 0);
        const cp = Number(it.costPrice || 0);
        const qty = Number(it.quantity || 0);
        return acc + (sp - cp) * qty;
      }, 0);

      totalSales += orderTotal;
      totalProfit += orderProfit;
      if (k === todayKey) {
        salesToday += orderTotal;
        profitToday += orderProfit;
      }
      if (map.has(k)) {
        const v = map.get(k);
        v.sales += orderTotal;
        v.profit += orderProfit;
      }
    }

    const salesData = days.map(k => map.get(k)?.sales || 0);
    const profitData = days.map(k => map.get(k)?.profit || 0);

    // Minimal chart dataset structure; components can style further
    const salesChartData = {
      labels: days,
      datasets: [{ label: 'Sales', data: salesData }]
    };
    const profitChartData = {
      labels: days,
      datasets: [{ label: 'Profit', data: profitData }]
    };

    // Basic inventory summary (by quantity)
    const inventoryChartData = {
      labels: products.slice(0, 10).map(p => p.name || ''),
      datasets: [{ label: 'Stock', data: products.slice(0, 10).map(p => Number(p.quantity || p.stock || 0)) }]
    };

    return {
      salesChartData,
      profitChartData,
      inventoryChartData,
      totals: {
        totalSales,
        totalProfit,
        salesToday,
        profitToday
      }
    };
  } catch (e) {
    console.error('Error recomputing derived data:', e);
    return {};
  }
};

// Helper function to create a hash of order content for duplicate detection
const createOrderHash = (order) => {
  // Normalize totalAmount to 2 decimal places to handle floating point precision issues
  const normalizedTotal = Math.round((order.totalAmount || 0) * 100) / 100;
  
  // Create hash based on sellerId, customerId, totalAmount, and items
  // Sort items by name for consistent hashing
  const itemsHash = JSON.stringify((order.items || []).map(i => ({
    name: (i.name || '').trim(),
    quantity: typeof i.quantity === 'number' ? i.quantity : parseFloat(i.quantity) || 0,
    sellingPrice: Math.round((typeof i.sellingPrice === 'number' ? i.sellingPrice : parseFloat(i.sellingPrice) || 0) * 100) / 100,
    costPrice: Math.round((typeof i.costPrice === 'number' ? i.costPrice : parseFloat(i.costPrice) || 0) * 100) / 100
  })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
  
  return `${order.sellerId || ''}_${order.customerId || 'null'}_${normalizedTotal}_${itemsHash}`;
};

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
    orders: [], // Sales/billing records (Order model)
    transactions: [], // ONLY for plan purchases (Transaction model)
    activities: [],
    categories: [],
    
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
    currentPlanDetails: null, // Will be fetched from backend
    
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
  SET_CURRENT_PLAN_DETAILS: 'SET_CURRENT_PLAN_DETAILS',
  
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
  
  SET_ORDERS: 'SET_ORDERS',
  ADD_ORDER: 'ADD_ORDER',
  UPDATE_ORDER: 'UPDATE_ORDER',
  DELETE_ORDER: 'DELETE_ORDER',
  
  SET_TRANSACTIONS: 'SET_TRANSACTIONS',
  ADD_TRANSACTION: 'ADD_TRANSACTION',
  UPDATE_TRANSACTION: 'UPDATE_TRANSACTION',
  
  SET_ACTIVITIES: 'SET_ACTIVITIES',
  ADD_ACTIVITY: 'ADD_ACTIVITY',
  
  // Categories
  SET_CATEGORIES: 'SET_CATEGORIES',
  ADD_CATEGORY: 'ADD_CATEGORY',
  DELETE_CATEGORY: 'DELETE_CATEGORY',
  
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

// Helper function to get store functions for sync service (defined outside reducer)
const getStoreFunctions = (storeName) => {
  const storeMap = {
    customers: { 
      getAllItems: () => getAllItems(STORES.customers), 
      updateItem: (item) => updateInIndexedDB(STORES.customers, item),
      deleteItem: (id) => deleteFromIndexedDB(STORES.customers, id)
    },
    products: { 
      getAllItems: () => getAllItems(STORES.products), 
      updateItem: (item) => updateInIndexedDB(STORES.products, item),
      deleteItem: (id) => deleteFromIndexedDB(STORES.products, id)
    },
    orders: { 
      getAllItems: () => getAllItems(STORES.orders), 
      updateItem: (item) => updateInIndexedDB(STORES.orders, item),
      deleteItem: (id) => deleteFromIndexedDB(STORES.orders, id)
    },
    transactions: { 
      getAllItems: () => getAllItems(STORES.transactions), 
      updateItem: (item) => updateInIndexedDB(STORES.transactions, item),
      deleteItem: (id) => deleteFromIndexedDB(STORES.transactions, id)
    },
    purchaseOrders: { 
      getAllItems: () => getAllItems(STORES.purchaseOrders), 
      updateItem: (item) => updateInIndexedDB(STORES.purchaseOrders, item),
      deleteItem: (id) => deleteFromIndexedDB(STORES.purchaseOrders, id)
    },
    categories: { 
      getAllItems: () => getAllItems(STORES.categories), 
      updateItem: (item) => updateInIndexedDB(STORES.categories, item),
      deleteItem: (id) => deleteFromIndexedDB(STORES.categories, id)
    }
  };
  return storeMap[storeName];
};

// Reducer function
const appReducer = (state, action) => {
  // Only log critical actions (skip UPDATE_CURRENT_TIME and other frequent actions)
  if (action.type === 'ADD_ORDER') {
    console.log('🎯 REDUCER: ADD_ORDER action received!', action);
  }
  // Skip logging UPDATE_CURRENT_TIME and other frequent actions to reduce console noise
  
  switch (action.type) {
    case ActionTypes.LOGIN:
      // Save auth to localStorage (including sellerId if provided)
      const authData = {
        isAuthenticated: true, 
        currentUser: action.payload,
        sellerId: action.payload.sellerId || null
      };
      localStorage.setItem('auth', JSON.stringify(authData));
      
      // Notify service worker that user is authenticated
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'AUTHENTICATED',
          user: action.payload
        });
      }
      
      // Start auto-sync after login
      setTimeout(() => {
        if (syncService.isOnline()) {
          syncService.startAutoSync(getStoreFunctions, 30000); // Sync every 30 seconds
          // Also do an immediate sync
          syncService.syncAll(getStoreFunctions).catch(err => console.error('Initial sync error:', err));
        }
      }, 2000);
      
      return {
        ...state,
        isAuthenticated: true,
        currentUser: action.payload
      };
      
    case ActionTypes.LOGOUT:
      // Clear auth from localStorage
      localStorage.removeItem('auth');
      
      // Stop auto-sync
      syncService.stopAutoSync();
      
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
      
    case ActionTypes.SET_CURRENT_PLAN_DETAILS:
      return {
        ...state,
        currentPlanDetails: action.payload
      };
      
    case ActionTypes.SET_VOICE_LANGUAGE:
      return {
        ...state,
        voiceAssistantLanguage: action.payload
      };
      
    case ActionTypes.SET_CUSTOMERS:
      // Ensure all customers are normalized (have both dueAmount and balanceDue)
      const normalizedCustomers = (action.payload || []).map(customer => {
        // Ensure balanceDue is set from dueAmount if missing (for offline data)
        const dueAmount = customer.dueAmount !== undefined ? customer.dueAmount : (customer.balanceDue !== undefined ? customer.balanceDue : 0);
        return {
          ...customer,
          dueAmount: typeof dueAmount === 'number' ? dueAmount : parseFloat(dueAmount) || 0,
          balanceDue: typeof dueAmount === 'number' ? dueAmount : parseFloat(dueAmount) || 0
        };
      });
      // Only update if customers array actually changed (prevent unnecessary re-renders)
      if (state.customers.length === normalizedCustomers.length && 
          state.customers.every((item, idx) => {
            const newItem = normalizedCustomers[idx];
            return newItem && item.id === newItem.id && 
                   JSON.stringify(item) === JSON.stringify(newItem);
          })) {
        return state;
      }
      return {
        ...state,
        customers: normalizedCustomers
      };
      
    case ActionTypes.ADD_CUSTOMER:
      // Step 1: Save to IndexedDB first with isSynced: false
      const newCustomer = { ...action.payload, isSynced: false };
      addToIndexedDB(STORES.customers, newCustomer)
        .then(() => {
          // Step 2: After IndexedDB save succeeds, sync to MongoDB if online
      if (syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(err => console.error('MongoDB sync error:', err));
      }
        })
        .catch(err => console.error('IndexedDB save error:', err));
      return {
        ...state,
        customers: [newCustomer, ...state.customers]
      };
      
    case ActionTypes.UPDATE_CUSTOMER:
      // Step 1: Save to IndexedDB first, ALWAYS mark as unsynced when updated
      const updatedCustomer = { 
        ...action.payload, 
        isSynced: false // Always mark as unsynced when updated
      };
      
      updateInIndexedDB(STORES.customers, updatedCustomer)
        .then(() => {
          // Step 2: After IndexedDB save succeeds, sync to MongoDB if online
      if (syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(() => {
              if (window.showToast) {
                window.showToast('Customer updated locally but sync failed. Will retry automatically.', 'warning');
              }
            });
          }
        })
        .catch(err => {
          console.error('IndexedDB save error:', err.message);
          if (window.showToast) {
            window.showToast(`Failed to update customer: ${err.message}`, 'error');
          }
        });
      // Only update if customer actually changed
      const existingCustomer = state.customers.find(c => c.id === action.payload.id);
      if (existingCustomer && JSON.stringify(existingCustomer) === JSON.stringify(updatedCustomer)) {
        return state; // No change
      }
      return {
        ...state,
        customers: state.customers.map(customer =>
          customer.id === action.payload.id ? updatedCustomer : customer
        )
      };
      
    case ActionTypes.DELETE_CUSTOMER:
      // Soft delete: Mark as deleted with isSynced: false instead of actually deleting
      const customerToDelete = state.customers.find(c => c.id === action.payload);
      if (customerToDelete) {
        const deletedCustomer = {
          ...customerToDelete,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          isSynced: false // Mark as unsynced so deletion syncs to backend
        };
        
        // Update in IndexedDB (soft delete - mark as deleted)
        updateInIndexedDB(STORES.customers, deletedCustomer)
          .then(() => {
            // Sync deletion to MongoDB if online
            if (syncService.isOnline()) {
              syncService.syncAll(getStoreFunctions).catch(err => console.error('Delete sync error:', err));
            }
          })
          .catch(err => console.error('IndexedDB update error:', err));
        
        // Remove from state (UI) but keep in IndexedDB for sync
        return {
          ...state,
          customers: state.customers.filter(c => c.id !== action.payload)
        };
      }
      return state;
      
    case ActionTypes.SET_PRODUCTS:
      // Only update if products array actually changed (deep comparison)
      if (state.products.length === action.payload.length && 
          state.products.every((item, idx) => {
            const newItem = action.payload[idx];
            return newItem && item.id === newItem.id && 
                   JSON.stringify(item) === JSON.stringify(newItem);
          })) {
        return state;
      }
      return {
        ...state,
        products: action.payload
      };
      
    case ActionTypes.ADD_PRODUCT:
      // Check for duplicate product (same name and description)
      const newProductName = (action.payload.name || '').trim().toLowerCase();
      const newProductDescription = (action.payload.description || '').trim().toLowerCase();
      
      // Find existing product with same name and description
      const duplicateProduct = state.products.find(p => {
        const existingName = (p.name || '').trim().toLowerCase();
        const existingDescription = (p.description || '').trim().toLowerCase();
        
        // Match if name is same and description is same (or both empty/null)
        return existingName === newProductName && 
               (existingDescription === newProductDescription || 
                (existingDescription === '' && newProductDescription === '') ||
                (existingDescription === null && newProductDescription === null) ||
                (existingDescription === undefined && newProductDescription === undefined));
      });
      
      if (duplicateProduct) {
        console.warn('⚠️ Duplicate product detected:', {
          name: action.payload.name,
          description: action.payload.description || 'No description',
          existingId: duplicateProduct.id
        });
        
        if (window.showToast) {
          window.showToast(
            `Product "${action.payload.name}" with the same description already exists. Use edit to update it.`,
            'warning'
          );
        }
        
        // Return state unchanged (don't add duplicate)
        return state;
      }
      
      // Step 1: Save to IndexedDB first with isSynced: false
      const newProduct = { ...action.payload, isSynced: false };
      addToIndexedDB(STORES.products, newProduct)
        .then(() => {
          // Step 2: After IndexedDB save succeeds, sync to MongoDB if online
      if (syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(err => console.error('MongoDB sync error:', err));
          }
        })
        .catch(err => {
          console.error('IndexedDB save error:', err);
          if (window.showToast) {
            window.showToast(`Failed to save product: ${err.message}`, 'error');
          }
        });
      return {
        ...state,
        products: [newProduct, ...state.products]
      };
      
    case ActionTypes.UPDATE_PRODUCT:
      // Step 1: Save to IndexedDB first
      // Preserve isSynced if provided (e.g., after successful backend sync)
      const updatedProduct = { 
        ...action.payload, 
        isSynced: action.payload.isSynced !== undefined ? action.payload.isSynced : false
      };
      
      updateInIndexedDB(STORES.products, updatedProduct)
        .then(() => {
          // Step 2: After IndexedDB save succeeds, sync to MongoDB if online
      if (syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(() => {
              if (window.showToast) {
                window.showToast('Product updated locally but sync failed. Will retry automatically.', 'warning');
              }
            });
          }
        })
        .catch(err => {
          console.error('IndexedDB save error:', err.message);
          if (window.showToast) {
            window.showToast(`Failed to update product: ${err.message}`, 'error');
          }
        });
      // Only update if product actually changed
      const existingProduct = state.products.find(p => p.id === action.payload.id);
      if (existingProduct && JSON.stringify(existingProduct) === JSON.stringify(updatedProduct)) {
        return state; // No change
      }
      {
        const nextProducts = state.products.map(product =>
          product.id === action.payload.id ? updatedProduct : product
        );
        const derived = recomputeDerivedData({ ...state, products: nextProducts });
        return {
          ...state,
          products: nextProducts,
          inventoryChartData: derived.inventoryChartData || state.inventoryChartData
        };
      }
      
    case ActionTypes.DELETE_PRODUCT:
      // Soft delete: Mark as deleted with isSynced: false instead of actually deleting
      const productToDelete = state.products.find(p => p.id === action.payload);
      if (productToDelete) {
        const deletedProduct = {
          ...productToDelete,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          isSynced: false // Mark as unsynced so deletion syncs to backend
        };
        
        // Update in IndexedDB (soft delete - mark as deleted)
        updateInIndexedDB(STORES.products, deletedProduct)
          .then(() => {
            // Sync deletion to MongoDB if online
            if (syncService.isOnline()) {
              syncService.syncAll(getStoreFunctions).catch(err => console.error('Delete sync error:', err));
            }
          })
          .catch(err => console.error('IndexedDB update error:', err));
        
        // Remove from state (UI) but keep in IndexedDB for sync
        return {
          ...state,
          products: state.products.filter(p => p.id !== action.payload)
        };
      }
      return state;
      
    case ActionTypes.SET_PURCHASE_ORDERS:
      // Only update if purchaseOrders array actually changed (deep comparison)
      if (state.purchaseOrders.length === action.payload.length && 
          state.purchaseOrders.every((item, idx) => {
            const newItem = action.payload[idx];
            return newItem && item.id === newItem.id && 
                   JSON.stringify(item) === JSON.stringify(newItem);
          })) {
        return state;
      }
      return {
        ...state,
        purchaseOrders: action.payload
      };
      
    case ActionTypes.SET_ORDERS:
      // Only update if orders array actually changed (deep comparison)
      if (state.orders.length === action.payload.length && 
          state.orders.every((item, idx) => {
            const newItem = action.payload[idx];
            return newItem && item.id === newItem.id && 
                   JSON.stringify(item) === JSON.stringify(newItem);
          })) {
        return state;
      }
      {
        const derived = recomputeDerivedData({ ...state, orders: action.payload });
        return {
          ...state,
          orders: action.payload,
          salesChartData: derived.salesChartData || state.salesChartData,
          profitChartData: derived.profitChartData || state.profitChartData,
          inventoryChartData: derived.inventoryChartData || state.inventoryChartData
        };
      }
      
    case ActionTypes.ADD_ORDER:
      // Only log critical order creation info
      console.log('🎯 ADD_ORDER: Order ID:', action.payload.id, 'Total:', action.payload.totalAmount);
      const newOrder = { ...action.payload, isSynced: false };
      
      // Validate order has all required fields before saving
      if (!newOrder.id) {
        console.error('❌ Order validation failed: id is missing');
        if (window.showToast) {
          window.showToast('Order creation failed: Missing order ID', 'error');
        }
        return state; // Don't update state if validation fails
      }
      
      if (!newOrder.sellerId) {
        console.error('❌ Order validation failed: sellerId is missing');
        if (window.showToast) {
          window.showToast('Order creation failed: User not authenticated', 'error');
        }
        return state; // Don't update state if validation fails
      }
      
      if (!newOrder.items || newOrder.items.length === 0) {
        console.error('❌ Order validation failed: items array is empty');
        if (window.showToast) {
          window.showToast('Order creation failed: No items in order', 'error');
        }
        return state; // Don't update state if validation fails
      }
      
      if (!newOrder.totalAmount || newOrder.totalAmount <= 0) {
        console.error('❌ Order validation failed: totalAmount is invalid:', newOrder.totalAmount);
        if (window.showToast) {
          window.showToast('Order creation failed: Invalid total amount', 'error');
        }
        return state; // Don't update state if validation fails
      }
      
      // Skip validation for now since we already validated above
      // But we need to ensure costPrice is a number for each item
      const validatedOrder = {
        ...newOrder,
        items: newOrder.items.map(item => ({
          ...item,
          costPrice: typeof item.costPrice === 'number' ? item.costPrice : 0,
          sellingPrice: typeof item.sellingPrice === 'number' ? item.sellingPrice : 0,
          quantity: typeof item.quantity === 'number' ? item.quantity : 1
        }))
      };
      
      // Create order hash for duplicate detection
      const orderHash = createOrderHash(validatedOrder);
      console.log('🔑 [ADD_ORDER] Order hash created:', orderHash.substring(0, 50) + '...');
      console.log('🔑 [ADD_ORDER] Current pending calls:', Array.from(pendingOrderApiCalls.keys()).map(h => h.substring(0, 30) + '...'));
      
      // ATOMIC CHECK: Check and set pending flag in one operation to prevent race conditions
      const isOnlineStatus = syncService.isOnline();
      if (isOnlineStatus) {
        // Check if an API call is already in progress for this order content
        if (pendingOrderApiCalls.has(orderHash)) {
          const existingOrderId = pendingOrderApiCalls.get(orderHash);
          console.warn('🚫 [ADD_ORDER] BLOCKED - Duplicate order prevented (pending API call exists):', existingOrderId);
          console.warn('🚫 [ADD_ORDER] Current order ID:', validatedOrder.id);
          console.warn('🚫 [ADD_ORDER] Order hash:', orderHash.substring(0, 50) + '...');
          // Don't process this order at all - return state without changes
          return state;
        }
        
        // Mark this order as being processed IMMEDIATELY (atomically, before any async operations)
        pendingOrderApiCalls.set(orderHash, validatedOrder.id);
        console.log('✅ [ADD_ORDER] ALLOWED - Marked order as pending API call:', validatedOrder.id);
        console.log('✅ [ADD_ORDER] Order hash:', orderHash.substring(0, 50) + '...');
      }
      
      // Check if we just added an identical order in the last 5 seconds (state check)
      // This catches React Strict Mode double renders
      const recentOrder = state.orders.find(o => {
        if (!o || !o.createdAt) return false;
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        const timeDiff = now.getTime() - orderDate.getTime();
        // Check if order was created in last 5 seconds
        if (timeDiff > 5000) return false;
        
        // Check if order has same hash
        const existingHash = createOrderHash(o);
        return existingHash === orderHash;
      });
      
      if (recentOrder) {
        console.warn('🚫 [ADD_ORDER] BLOCKED - Duplicate order detected in state (created within 5s):', recentOrder.id);
        console.warn('🚫 [ADD_ORDER] Current order ID:', validatedOrder.id);
        console.warn('🚫 [ADD_ORDER] Order hash:', orderHash.substring(0, 50) + '...');
        // Remove from pending calls if we added it
        if (isOnlineStatus && pendingOrderApiCalls.has(orderHash)) {
          pendingOrderApiCalls.delete(orderHash);
        }
        // Don't process this duplicate order
        return state;
      }
      
      // Save to IndexedDB FIRST (always save locally)
      console.log('💾 Attempting to save order to IndexedDB...', validatedOrder.id);
      console.log('💾 Order data being saved:', JSON.stringify(validatedOrder, null, 2));
      
      updateInIndexedDB(STORES.orders, validatedOrder, true) // Skip validation since we validated above
        .then((result) => {
          console.log('✅ Order successfully saved to IndexedDB!', validatedOrder.id, result);
          
          // Verify order was saved
          setTimeout(async () => {
            try {
              const allOrders = await getAllItems(STORES.orders);
              const savedOrder = allOrders.find(o => o.id === validatedOrder.id || o.id?.toString() === validatedOrder.id?.toString());
              if (savedOrder) {
                console.log('✅ Verified: Order exists in IndexedDB', savedOrder.id);
              } else {
                console.error('❌ WARNING: Order not found in IndexedDB after save!', validatedOrder.id);
                console.error('❌ All orders in IndexedDB:', allOrders.map(o => ({ id: o.id, _id: o._id })));
              }
            } catch (verifyErr) {
              console.error('Error verifying order in IndexedDB:', verifyErr);
            }
          }, 100);
          
          // Step 2: Create order on backend immediately if online (ONE TIME ONLY)
          // Note: Duplicate check already done above, and order is already marked as pending
          if (isOnlineStatus && pendingOrderApiCalls.has(createOrderHash(validatedOrder))) {
            console.log('🌐 [ADD_ORDER] Online - scheduling ONE-TIME order creation API call...');
            // Use a small delay to ensure IndexedDB write is complete
            setTimeout(async () => {
              const orderHash = createOrderHash(validatedOrder);
              // Double-check that this order is still pending (in case it was removed)
              if (!pendingOrderApiCalls.has(orderHash)) {
                console.warn('⚠️ [ADD_ORDER] Order was removed from pending calls, skipping API call:', validatedOrder.id);
                return;
              }
              
              console.log('🌐 [ADD_ORDER] ⏰ Timeout executed - Creating order on backend via API (ONE ATTEMPT)...', validatedOrder.id);
              console.log('🌐 [ADD_ORDER] Order to create:', JSON.stringify(validatedOrder, null, 2));
              console.log('🌐 [ADD_ORDER] createOrder function available:', typeof createOrder);
              
              try {
                // ONE-TIME API call - no retries, no fallback
                console.log('🌐 [ADD_ORDER] Calling createOrder function (ONE TIME ONLY)...');
                if (typeof createOrder !== 'function') {
                  console.error('❌ [ADD_ORDER] createOrder is not a function!', createOrder);
                  throw new Error('createOrder function not available');
                }
                
                const createResult = await createOrder(validatedOrder);
                
                // Remove from pending calls immediately after API call (success or failure)
                pendingOrderApiCalls.delete(orderHash);
                console.log('🌐 [ADD_ORDER] Removed order from pending calls:', validatedOrder.id);
                console.log('🌐 [ADD_ORDER] createOrder result:', createResult);
                
                if (createResult.success) {
                  console.log('✅ Order created on backend successfully!', createResult._id);
                  
                  // Update order in IndexedDB with _id and isSynced: true
                  const syncedOrder = {
                    ...validatedOrder,
                    _id: createResult._id,
                    isSynced: true,
                    syncedAt: new Date().toISOString()
                  };
                  
                  updateInIndexedDB(STORES.orders, syncedOrder, true) // Skip validation for synced order
                    .then(() => {
                      console.log('✅ Order marked as synced in IndexedDB');
                      // Update state immediately with synced order
                      if (globalDispatch) {
                        globalDispatch({ type: ActionTypes.UPDATE_ORDER, payload: syncedOrder });
                      }
                    })
                    .catch(err => console.error('Error updating synced order:', err));
                  
                  if (window.showToast) {
                    window.showToast('Order created and saved to server!', 'success');
                  }
                } else {
                  // API call failed - don't retry, just mark as unsynced and let sync service handle it
                  console.warn('⚠️ [ADD_ORDER] API call failed (ONE-TIME attempt):', createResult.error);
                  console.warn('⚠️ [ADD_ORDER] Order saved to IndexedDB with isSynced: false. Will be synced by background sync service.');
                  
                  // Order is already saved to IndexedDB with isSynced: false (from validatedOrder)
                  // No need to update it - it will be picked up by the sync service automatically
                  
                  if (window.showToast) {
                    window.showToast('Order saved locally. Will sync automatically in background.', 'info');
                  }
                }
              } catch (error) {
                // API call threw an error - don't retry, just mark as unsynced
                console.error('❌ [ADD_ORDER] Error creating order on backend (ONE-TIME attempt failed):', error);
                console.error('❌ [ADD_ORDER] Order saved to IndexedDB with isSynced: false. Will be synced by background sync service.');
                
                // Remove from pending calls on error (already done above, but just in case)
                pendingOrderApiCalls.delete(orderHash);
                console.log('🌐 [ADD_ORDER] Removed order from pending calls after error:', validatedOrder.id);
                
                // Order is already saved to IndexedDB with isSynced: false
                // No need to retry - background sync service will handle it
                
                if (window.showToast) {
                  window.showToast('Order saved locally. Will sync automatically in background.', 'info');
                }
              }
            }, 200);
          } else if (!isOnlineStatus) {
            console.log('📴 Offline - Order saved to IndexedDB, will sync when online');
            if (window.showToast) {
              window.showToast('Order saved locally. Will sync when online.', 'success');
            }
          }
        })
        .catch(err => {
          console.error('❌ IndexedDB save error:', err);
          console.error('Error message:', err.message);
          console.error('Error stack:', err.stack);
          console.error('Error name:', err.name);
          console.error('Order data that failed:', JSON.stringify(validatedOrder, null, 2));
          
          // Check if it's a validation error
          if (err.message && err.message.includes('Validation failed')) {
            console.error('❌ VALIDATION ERROR - Order validation failed!');
            console.error('Order details:', {
              id: newOrder.id,
              sellerId: newOrder.sellerId,
              itemsCount: newOrder.items?.length,
              totalAmount: newOrder.totalAmount,
              paymentMethod: newOrder.paymentMethod
            });
          }
          
          if (window.showToast) {
            window.showToast(`Failed to save order: ${err.message}`, 'error');
          }
        });
      
      // Update state immediately (optimistic update)
      // Note: If save fails, the order will still be in state temporarily
      // but won't be in IndexedDB. The user will see an error message.
      // The order will be updated with _id and isSynced: true after successful backend sync
      // via the IndexedDB update callback above
      {
        const nextOrders = [validatedOrder, ...state.orders];
        const derived = recomputeDerivedData({ ...state, orders: nextOrders });
        return {
          ...state,
          orders: nextOrders,
          salesChartData: derived.salesChartData || state.salesChartData,
          profitChartData: derived.profitChartData || state.profitChartData,
          inventoryChartData: derived.inventoryChartData || state.inventoryChartData
        };
      }
      
    case ActionTypes.UPDATE_ORDER:
      // Preserve isSynced status if already synced (don't mark as unsynced if updating synced order)
      const updatedOrder = { 
        ...action.payload, 
        isSynced: action.payload.isSynced !== undefined ? action.payload.isSynced : false
      };
      updateInIndexedDB(STORES.orders, updatedOrder)
        .then(() => {
          // Only sync if order is not already synced
          if (!updatedOrder.isSynced && syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(() => {
              if (window.showToast) {
                window.showToast('Order updated locally but sync failed. Will retry automatically.', 'warning');
              }
            });
          }
        })
        .catch(err => {
          console.error('IndexedDB update error:', err.message);
          if (window.showToast) {
            window.showToast(`Failed to update order: ${err.message}`, 'error');
          }
        });
      // Only update if order actually changed
      const existingOrder = state.orders.find(order => order.id === action.payload.id);
      if (existingOrder && JSON.stringify(existingOrder) === JSON.stringify(updatedOrder)) {
        return state; // No change
      }
      {
        const nextOrders = state.orders.map(order => order.id === action.payload.id ? updatedOrder : order);
        const derived = recomputeDerivedData({ ...state, orders: nextOrders });
        return {
          ...state,
          orders: nextOrders,
          salesChartData: derived.salesChartData || state.salesChartData,
          profitChartData: derived.profitChartData || state.profitChartData,
          inventoryChartData: derived.inventoryChartData || state.inventoryChartData
        };
      }
      
    case ActionTypes.DELETE_ORDER:
      deleteFromIndexedDB(STORES.orders, action.payload)
        .catch(err => console.error('IndexedDB delete error:', err));
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload)
      };
      
    case ActionTypes.ADD_PURCHASE_ORDER:
      // Step 1: Save to IndexedDB first with isSynced: false
      const newPO = { ...action.payload, isSynced: false };
      addToIndexedDB(STORES.purchaseOrders, newPO)
        .then(() => {
          // Step 2: After IndexedDB save succeeds, sync to MongoDB if online
      if (syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(err => console.error('MongoDB sync error:', err));
      }
        })
        .catch(err => console.error('IndexedDB save error:', err));
      return {
        ...state,
        purchaseOrders: [newPO, ...state.purchaseOrders]
      };
      
    case ActionTypes.UPDATE_PURCHASE_ORDER:
      // Step 1: Save to IndexedDB first, ALWAYS mark as unsynced when updated
      const updatedPO = { ...action.payload, isSynced: false };
      updateInIndexedDB(STORES.purchaseOrders, updatedPO)
        .then(() => {
          // Step 2: After IndexedDB save succeeds, sync to MongoDB if online
          if (syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(() => {
              if (window.showToast) {
                window.showToast('Purchase order updated locally but sync failed. Will retry automatically.', 'warning');
              }
            });
          }
        })
        .catch(err => {
          console.error('IndexedDB save error:', err.message);
          if (window.showToast) {
            window.showToast(`Failed to update purchase order: ${err.message}`, 'error');
          }
        });
      // Only update if purchase order actually changed
      const existingPO = state.purchaseOrders.find(po => po.id === action.payload.id);
      if (existingPO && JSON.stringify(existingPO) === JSON.stringify(updatedPO)) {
        return state; // No change
      }
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.map(po =>
          po.id === action.payload.id ? updatedPO : po
        )
      };
      
    case ActionTypes.DELETE_PURCHASE_ORDER:
      // Soft delete: Mark as deleted with isSynced: false instead of actually deleting
      const poToDelete = state.purchaseOrders.find(po => po.id === action.payload);
      if (poToDelete) {
        const deletedPO = {
          ...poToDelete,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          isSynced: false // Mark as unsynced so deletion syncs to backend
        };
        
        console.log('🗑️ [DELETE_PURCHASE_ORDER] Marking purchase order as deleted:', deletedPO.id);
        console.log('🗑️ [DELETE_PURCHASE_ORDER] Deleted PO data:', JSON.stringify(deletedPO, null, 2));
        
        // Update in IndexedDB (soft delete - mark as deleted)
        updateInIndexedDB(STORES.purchaseOrders, deletedPO)
          .then(() => {
            console.log('✅ [DELETE_PURCHASE_ORDER] Purchase order marked as deleted in IndexedDB');
            // Sync deletion to MongoDB if online
            if (syncService.isOnline()) {
              console.log('🌐 [DELETE_PURCHASE_ORDER] Online - syncing deletion to backend...');
              syncService.syncAll(getStoreFunctions).catch(err => console.error('Delete sync error:', err));
            } else {
              console.log('📴 [DELETE_PURCHASE_ORDER] Offline - deletion will sync when online');
            }
          })
          .catch(err => {
            console.error('❌ [DELETE_PURCHASE_ORDER] IndexedDB update error:', err);
          });
        
        // Remove from state (UI) but keep in IndexedDB for sync
        return {
          ...state,
          purchaseOrders: state.purchaseOrders.filter(po => po.id !== action.payload)
        };
      }
      return state;
      
    case ActionTypes.SET_TRANSACTIONS:
      // Only update if transactions array actually changed (deep comparison)
      if (state.transactions.length === action.payload.length && 
          state.transactions.every((item, idx) => {
            const newItem = action.payload[idx];
            return newItem && item.id === newItem.id && 
                   JSON.stringify(item) === JSON.stringify(newItem);
          })) {
        return state;
      }
      return {
        ...state,
        transactions: action.payload
      };
      
    case ActionTypes.ADD_TRANSACTION:
      // Step 1: Save to IndexedDB first with isSynced: false
      const newTransaction = { ...action.payload, isSynced: false };
      addToIndexedDB(STORES.transactions, newTransaction)
        .then(() => {
          // Step 2: After IndexedDB save succeeds, sync to MongoDB if online
      if (syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(err => console.error('MongoDB sync error:', err));
      }
        })
        .catch(err => console.error('IndexedDB save error:', err));
      return {
        ...state,
        transactions: [newTransaction, ...state.transactions]
      };
      
    case ActionTypes.UPDATE_TRANSACTION:
      // Step 1: Save to IndexedDB first, ALWAYS mark as unsynced when updated
      const updatedTransaction = { ...action.payload, isSynced: false };
      updateInIndexedDB(STORES.transactions, updatedTransaction)
        .then(() => {
          // Step 2: After IndexedDB save succeeds, sync to MongoDB if online
          if (syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(() => {
              if (window.showToast) {
                window.showToast('Transaction updated locally but sync failed. Will retry automatically.', 'warning');
              }
            });
          }
        })
        .catch(err => {
          console.error('IndexedDB save error:', err.message);
          if (window.showToast) {
            window.showToast(`Failed to update transaction: ${err.message}`, 'error');
          }
        });
      // Only update if transaction actually changed
      const existingTransaction = state.transactions.find(t => t.id === action.payload.id);
      if (existingTransaction && JSON.stringify(existingTransaction) === JSON.stringify(updatedTransaction)) {
        return state; // No change
      }
      return {
        ...state,
        transactions: state.transactions.map(transaction =>
          transaction.id === action.payload.id ? updatedTransaction : transaction
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
      
    case ActionTypes.SET_CATEGORIES:
      return {
        ...state,
        categories: action.payload
      };
      
    case ActionTypes.ADD_CATEGORY:
      // Step 1: Save to IndexedDB first with isSynced: false
      const newCategory = { ...action.payload, isSynced: false };
      addToIndexedDB(STORES.categories, newCategory)
        .then(() => {
          // Step 2: After IndexedDB save succeeds, sync to MongoDB if online
      if (syncService.isOnline()) {
            syncService.syncAll(getStoreFunctions).catch(err => console.error('MongoDB sync error:', err));
      }
        })
        .catch(err => console.error('IndexedDB save error:', err));
      return {
        ...state,
        categories: [newCategory, ...state.categories]
      };
      
    case ActionTypes.DELETE_CATEGORY:
      // Sync to IndexedDB
      deleteFromIndexedDB(STORES.categories, action.payload).catch(err => console.error('IndexedDB sync error:', err));
      return {
        ...state,
        categories: state.categories.filter(category => category.id !== action.payload)
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
      // Only update if time actually changed (prevent unnecessary re-renders)
      if (state.currentTime === action.payload) {
        return state; // No change, return same state reference
      }
      return {
        ...state,
        currentTime: action.payload
      };
      
    case ActionTypes.SET_SYSTEM_STATUS:
      // Only update if status actually changed (prevent unnecessary re-renders)
      if (state.systemStatus === action.payload) {
        return state; // No change, return same state reference
      }
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
      if (action.type === 'ADD_ORDER' || action.type === 'FORCE_REFRESH') {
        // FORCE_REFRESH is expected to not have a case, but ADD_ORDER should have one
        if (action.type === 'ADD_ORDER') {
          console.error('❌ ADD_ORDER action reached default case! This means the case is not matching!');
          console.error('ActionTypes.ADD_ORDER:', ActionTypes.ADD_ORDER);
          console.error('action.type:', action.type);
          console.error('Are they equal?', action.type === ActionTypes.ADD_ORDER);
        }
      }
      return state;
  }
};

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Store dispatch reference for async operations
  useEffect(() => {
    setGlobalDispatch(dispatch);
  }, [dispatch]);
  
  // Set store functions provider for sync service
  useEffect(() => {
    setStoreFunctionsProvider(getStoreFunctions);
    // Also set the order hash pending checker so sync service can skip orders being processed
    setOrderHashPendingChecker(isOrderHashBeingProcessed);
    
    // Set callback to update state when items are synced by sync service
    setOnItemSyncedCallback((storeName, syncedItem) => {
      if (!globalDispatch) return;
      
      // Dispatch appropriate UPDATE action based on store type
      switch (storeName) {
        case 'orders':
          globalDispatch({ type: ActionTypes.UPDATE_ORDER, payload: syncedItem });
          break;
        case 'customers':
          globalDispatch({ type: ActionTypes.UPDATE_CUSTOMER, payload: syncedItem });
          break;
        case 'products':
          globalDispatch({ type: ActionTypes.UPDATE_PRODUCT, payload: syncedItem });
          break;
        case 'purchaseOrders':
          globalDispatch({ type: ActionTypes.UPDATE_PURCHASE_ORDER, payload: syncedItem });
          break;
        case 'transactions':
          globalDispatch({ type: ActionTypes.UPDATE_TRANSACTION, payload: syncedItem });
          break;
        case 'categories':
          // Categories don't have UPDATE action, would need to reload or add one
          break;
        default:
          console.warn(`[SYNC] Unknown store type for state update: ${storeName}`);
      }
    });
  }, []);

  // Load data on mount - show IndexedDB first, then fetch from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        // Step 1: Load from IndexedDB FIRST (immediate display)
        const [indexedDBCustomers, indexedDBProducts, indexedDBOrders, indexedDBTransactions, indexedDBPurchaseOrders, indexedDBCategories, activities] = await Promise.all([
          getAllItems(STORES.customers).catch(() => []),
          getAllItems(STORES.products).catch(() => []),
          getAllItems(STORES.orders).catch(() => []),
          getAllItems(STORES.transactions).catch(() => []),
          getAllItems(STORES.purchaseOrders).catch(() => []),
          getAllItems(STORES.categories).catch(() => []),
          getAllItems(STORES.activities).catch(() => [])
        ]);

        // Normalize IndexedDB data
        const normalizedIndexedDBCustomers = (indexedDBCustomers || []).map(customer => {
          const normalized = {
            ...customer,
            dueAmount: customer.dueAmount !== undefined ? customer.dueAmount : (customer.balanceDue !== undefined ? customer.balanceDue : 0),
            balanceDue: customer.dueAmount !== undefined ? customer.dueAmount : (customer.balanceDue !== undefined ? customer.balanceDue : 0),
            mobileNumber: customer.mobileNumber || customer.phone || ''
          };
          return normalized;
        });
        
        const normalizedIndexedDBProducts = (indexedDBProducts || []).map(product => {
          const stock = product.stock !== undefined ? product.stock : (product.quantity !== undefined ? product.quantity : 0);
          const costPrice = product.costPrice !== undefined ? product.costPrice : (product.unitPrice !== undefined ? product.unitPrice : 0);
          return {
            ...product,
            stock: stock,
            quantity: stock,
            costPrice: costPrice,
            unitPrice: costPrice
          };
        });

        // Show IndexedDB data immediately
        dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: normalizedIndexedDBCustomers });
        dispatch({ type: ActionTypes.SET_PRODUCTS, payload: normalizedIndexedDBProducts });
        dispatch({ type: ActionTypes.SET_ORDERS, payload: indexedDBOrders || [] });
        dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: indexedDBTransactions || [] });
        dispatch({ type: ActionTypes.SET_PURCHASE_ORDERS, payload: indexedDBPurchaseOrders || [] });
        dispatch({ type: ActionTypes.SET_CATEGORIES, payload: indexedDBCategories || [] });
        dispatch({ type: ActionTypes.SET_ACTIVITIES, payload: activities || [] });

        // Step 2: Fetch from backend if online (will replace IndexedDB data)
        const isOnlineStatus = await isOnline();
        dispatch({ type: ActionTypes.SET_SYSTEM_STATUS, payload: isOnlineStatus ? 'online' : 'offline' });
        
        if (isOnlineStatus) {
          try {
            const result = await apiRequest('/data/all', { method: 'GET' });
            
            if (result.success && result.data?.data) {
              const { customers, products, orders, transactions, purchaseOrders, categories } = result.data.data;

              // Normalize backend data
              const normalizedBackendCustomers = (customers || []).map(customer => {
                const normalized = {
                  ...customer,
                  dueAmount: customer.dueAmount || 0,
                  balanceDue: customer.dueAmount || 0,
                  mobileNumber: customer.mobileNumber || customer.phone || ''
                };
                return normalized;
              });
              
              const normalizedBackendProducts = (products || []).map(product => {
                const stock = product.stock !== undefined ? product.stock : (product.quantity !== undefined ? product.quantity : 0);
                const costPrice = product.costPrice !== undefined ? product.costPrice : (product.unitPrice !== undefined ? product.unitPrice : 0);
                return {
                  ...product,
                  stock: stock,
                  quantity: stock,
                  costPrice: costPrice,
                  unitPrice: costPrice
                };
              });

              // Update IndexedDB with backend data
              await Promise.all([
                syncToIndexedDB(STORES.customers, normalizedBackendCustomers),
                syncToIndexedDB(STORES.products, normalizedBackendProducts),
                syncToIndexedDB(STORES.orders, orders || []),
                syncToIndexedDB(STORES.transactions, transactions || []),
                syncToIndexedDB(STORES.purchaseOrders, purchaseOrders || []),
                syncToIndexedDB(STORES.categories, categories || [])
              ]);

              // Replace state with backend data
              dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: normalizedBackendCustomers });
              dispatch({ type: ActionTypes.SET_PRODUCTS, payload: normalizedBackendProducts });
              dispatch({ type: ActionTypes.SET_ORDERS, payload: orders || [] });
        dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: transactions || [] });
        dispatch({ type: ActionTypes.SET_PURCHASE_ORDERS, payload: purchaseOrders || [] });
        dispatch({ type: ActionTypes.SET_CATEGORIES, payload: categories || [] });
            }
          } catch (backendError) {
            console.error('❌ Error fetching from backend:', backendError.message);
            // Keep IndexedDB data that was already shown
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
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
        dispatch({ type: ActionTypes.SET_SYSTEM_STATUS, payload: 'offline' });
      }
    };

    // Load data on mount
    loadData();
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
      dispatch({ type: ActionTypes.SET_CATEGORIES, payload: [] });
      return;
    }
    
    // Reload data when user changes - show IndexedDB first, then fetch from backend
    const loadUserData = async () => {
      try {
        // Step 1: Load from IndexedDB FIRST (immediate display)
        const [indexedDBCustomers, indexedDBProducts, indexedDBOrders, indexedDBTransactions, indexedDBPurchaseOrders, indexedDBCategories, activities] = await Promise.all([
          getAllItems(STORES.customers).catch(() => []),
          getAllItems(STORES.products).catch(() => []),
          getAllItems(STORES.orders).catch(() => []),
          getAllItems(STORES.transactions).catch(() => []),
          getAllItems(STORES.purchaseOrders).catch(() => []),
          getAllItems(STORES.categories).catch(() => []),
          getAllItems(STORES.activities).catch(() => [])
        ]);

        // Normalize IndexedDB data
        const normalizedIndexedDBCustomers = (indexedDBCustomers || []).map(customer => {
          const normalized = {
            ...customer,
            dueAmount: customer.dueAmount !== undefined ? customer.dueAmount : (customer.balanceDue !== undefined ? customer.balanceDue : 0),
            balanceDue: customer.dueAmount !== undefined ? customer.dueAmount : (customer.balanceDue !== undefined ? customer.balanceDue : 0),
            mobileNumber: customer.mobileNumber || customer.phone || ''
          };
          return normalized;
        });
        
        const normalizedIndexedDBProducts = (indexedDBProducts || []).map(product => {
          const stock = product.stock !== undefined ? product.stock : (product.quantity !== undefined ? product.quantity : 0);
          const costPrice = product.costPrice !== undefined ? product.costPrice : (product.unitPrice !== undefined ? product.unitPrice : 0);
          return {
            ...product,
            stock: stock,
            quantity: stock,
            costPrice: costPrice,
            unitPrice: costPrice
          };
        });

        // Show IndexedDB data immediately
        dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: normalizedIndexedDBCustomers });
        dispatch({ type: ActionTypes.SET_PRODUCTS, payload: normalizedIndexedDBProducts });
        dispatch({ type: ActionTypes.SET_ORDERS, payload: indexedDBOrders || [] });
        dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: indexedDBTransactions || [] });
        dispatch({ type: ActionTypes.SET_PURCHASE_ORDERS, payload: indexedDBPurchaseOrders || [] });
        dispatch({ type: ActionTypes.SET_CATEGORIES, payload: indexedDBCategories || [] });
        dispatch({ type: ActionTypes.SET_ACTIVITIES, payload: activities || [] });

        // Step 2: Fetch from backend if online (will replace IndexedDB data)
        const isOnlineStatus = await isOnline();
        dispatch({ type: ActionTypes.SET_SYSTEM_STATUS, payload: isOnlineStatus ? 'online' : 'offline' });
        
        if (isOnlineStatus) {
          try {
            const result = await apiRequest('/data/all', { method: 'GET' });
            
            if (result.success && result.data?.data) {
              const { customers, products, orders, transactions, purchaseOrders, categories } = result.data.data;
              
              // Normalize backend data
              const normalizedBackendCustomers = (customers || []).map(customer => {
                const normalized = {
                  ...customer,
                  dueAmount: customer.dueAmount || 0,
                  balanceDue: customer.dueAmount || 0,
                  mobileNumber: customer.mobileNumber || customer.phone || ''
                };
                return normalized;
              });
              
              const normalizedBackendProducts = (products || []).map(product => {
                const stock = product.stock !== undefined ? product.stock : (product.quantity !== undefined ? product.quantity : 0);
                const costPrice = product.costPrice !== undefined ? product.costPrice : (product.unitPrice !== undefined ? product.unitPrice : 0);
                return {
                  ...product,
                  stock: stock,
                  quantity: stock,
                  costPrice: costPrice,
                  unitPrice: costPrice
                };
              });

              // Update IndexedDB with backend data
              await Promise.all([
                syncToIndexedDB(STORES.customers, normalizedBackendCustomers),
                syncToIndexedDB(STORES.products, normalizedBackendProducts),
                syncToIndexedDB(STORES.orders, orders || []),
                syncToIndexedDB(STORES.transactions, transactions || []),
                syncToIndexedDB(STORES.purchaseOrders, purchaseOrders || []),
                syncToIndexedDB(STORES.categories, categories || [])
              ]);

              // Replace state with backend data
              dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: normalizedBackendCustomers });
              dispatch({ type: ActionTypes.SET_PRODUCTS, payload: normalizedBackendProducts });
              dispatch({ type: ActionTypes.SET_ORDERS, payload: orders || [] });
        dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: transactions || [] });
        dispatch({ type: ActionTypes.SET_PURCHASE_ORDERS, payload: purchaseOrders || [] });
        dispatch({ type: ActionTypes.SET_CATEGORIES, payload: categories || [] });
              
            }
          } catch (backendError) {
            console.error('❌ Error fetching user data from backend:', backendError.message);
          }
          
          // Fetch current plan details
          try {
            const planResult = await apiRequest('/data/current-plan');
            if (planResult.success && planResult.data) {
              const planData = Array.isArray(planResult.data) ? planResult.data : planResult.data.data || planResult.data;
              if (planData) {
                dispatch({ type: ActionTypes.SET_CURRENT_PLAN_DETAILS, payload: planData });
                // Also update currentPlan to planId for backward compatibility
                if (planData.planId) {
                  dispatch({ type: ActionTypes.SET_CURRENT_PLAN, payload: planData.planId });
                }
              }
            }
          } catch (planError) {
            console.error('Error fetching current plan details:', planError);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        dispatch({ type: ActionTypes.SET_SYSTEM_STATUS, payload: 'offline' });
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

  // Save user-specific data when it changes - batched to reduce localStorage writes
  useEffect(() => {
    const userId = state.currentUser?.email || state.currentUser?.uid;
    if (!userId) return;
    
    // Debounce localStorage writes to avoid excessive writes
    const timeoutId = setTimeout(() => {
    localStorage.setItem(getUserStorageKey('customers', userId), JSON.stringify(state.customers));
    localStorage.setItem(getUserStorageKey('products', userId), JSON.stringify(state.products));
    localStorage.setItem(getUserStorageKey('transactions', userId), JSON.stringify(state.transactions));
    localStorage.setItem(getUserStorageKey('purchaseOrders', userId), JSON.stringify(state.purchaseOrders));
    localStorage.setItem(getUserStorageKey('activities', userId), JSON.stringify(state.activities));
    }, 300); // Debounce by 300ms
    
    return () => clearTimeout(timeoutId);
  }, [state.customers, state.products, state.transactions, state.purchaseOrders, state.activities, state.currentUser]);

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

  // Update time every second - use useCallback to prevent recreation
  const updateTime = useCallback(() => {
    const newTime = new Date().toLocaleTimeString();
    // Only dispatch if time actually changed
    dispatch({ type: ActionTypes.UPDATE_CURRENT_TIME, payload: newTime });
  }, [dispatch]);

  useEffect(() => {
    let timerId = null;
    
    // Start timer
    timerId = setInterval(updateTime, 1000);
    
    // Initial update
    updateTime();

    return () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };
  }, [updateTime]);

  // Listen for online/offline events and refresh data accordingly
  useEffect(() => {
    let isMounted = true;
    
    const handleOnline = async () => {
      // Give a small delay to ensure network is fully connected
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify we're actually online
      if (!navigator.onLine || !isMounted) return;
      
      // First, sync all unsynced local changes to MongoDB
      try {
        const allCustomers = await getAllItems(STORES.customers);
        const allProducts = await getAllItems(STORES.products);
        const allOrders = await getAllItems(STORES.orders);
        const unsyncedCustomers = allCustomers.filter(c => !c.isSynced);
        const unsyncedProducts = allProducts.filter(p => !p.isSynced);
        const unsyncedOrders = allOrders.filter(o => !o.isSynced);
        
        if (unsyncedCustomers.length > 0 || unsyncedProducts.length > 0 || unsyncedOrders.length > 0) {
          const syncResult = await syncService.syncAll(getStoreFunctions);
          
          if (syncResult.success && isMounted) {
            if (window.showToast) {
              window.showToast(`All offline changes synced! (${syncResult.summary?.totalSynced || 0} items)`, 'success');
            }
          } else if (isMounted) {
            if (window.showToast) {
              window.showToast('Some changes could not be synced. Will retry automatically.', 'warning');
            }
          }
        }
      } catch (syncError) {
        console.error('❌ Error syncing unsynced changes:', syncError.message);
        if (isMounted && window.showToast) {
          window.showToast('Error syncing offline changes. Will retry automatically.', 'error');
        }
      }
      
      if (!isMounted) return;
      
      // Then, fetch latest data from backend to ensure we have the most up-to-date data
      try {
        const data = await fetchAllData();
        const activities = await getAllItems(STORES.activities).catch(() => []);

        // Normalize customers - ensure mobileNumber is set (convert phone to mobileNumber if needed)
        const normalizedCustomers = (data.customers || []).map(customer => {
          if (customer.phone && !customer.mobileNumber) {
            return { ...customer, mobileNumber: customer.phone };
          }
          if (!customer.mobileNumber && customer.phone) {
            return { ...customer, mobileNumber: customer.phone };
          }
          return customer;
        });
        
        if (isMounted) {
          dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: normalizedCustomers });
          dispatch({ type: ActionTypes.SET_PRODUCTS, payload: data.products || [] });
          dispatch({ type: ActionTypes.SET_ORDERS, payload: data.orders || [] });
          dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: data.transactions || [] });
          dispatch({ type: ActionTypes.SET_PURCHASE_ORDERS, payload: data.purchaseOrders || [] });
          dispatch({ type: ActionTypes.SET_CATEGORIES, payload: data.categories || [] });
          dispatch({ type: ActionTypes.SET_ACTIVITIES, payload: activities || [] });
          dispatch({ type: ActionTypes.SET_SYSTEM_STATUS, payload: 'online' });
        }
      } catch (error) {
        console.error('Error refreshing data after coming online:', error.message);
        if (isMounted) {
          dispatch({ type: ActionTypes.SET_SYSTEM_STATUS, payload: 'online' });
        }
      }
    };

    const handleOffline = () => {
      if (isMounted) {
        dispatch({ type: ActionTypes.SET_SYSTEM_STATUS, payload: 'offline' });
      }
    };

    // Also check immediately if already online when this effect runs
    if (navigator.onLine) {
      handleOnline();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Empty deps - getStoreFunctions is stable and doesn't need to be in deps

  // Memoize context value to prevent unnecessary re-renders
  // dispatch from useReducer is already stable and doesn't change
  // Only recreate when state actually changes
  const value = useMemo(() => ({
    state,
    dispatch
  }), [state, dispatch]);

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
