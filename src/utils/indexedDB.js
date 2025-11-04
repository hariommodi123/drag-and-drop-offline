/**
 * Comprehensive IndexedDB utility for ERP_DB
 * Provides async wrapper with Promises for all CRUD operations
 * Model references based on backend data structures
 * 
 * Database Models:
 * - Customers: id, name, phone, email, address, createdAt, updatedAt
 * - Products: id, name, category, barcode, stock, price, expiryDate, unit, purchasePrice, createdAt, updatedAt
 * - Transactions: id, customerId, customerName, items[], subtotal, discount, tax, total, paymentMethod, status, createdAt, updatedAt
 * - PurchaseOrders: id, supplierName, items[], status, total, createdAt, updatedAt
 * - Activities: id, message, timestamp, type, createdAt
 * - Invoices: id, transactionId, invoiceNumber, customerId, items[], total, paymentStatus, createdAt, updatedAt
 * - Settings: id, userId, key, value, createdAt, updatedAt
 */

const DB_NAME = 'ERP_DB';
const DB_VERSION = 2; // Incremented for new stores

// Object Store Names
export const STORES = {
  customers: 'customers',
  products: 'products',
  transactions: 'transactions',
  purchaseOrders: 'purchaseOrders',
  activities: 'activities',
  invoices: 'invoices',
  settings: 'settings'
};

// Database initialization
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const transaction = event.target.transaction;
      
      // Create Customers Store
      if (!db.objectStoreNames.contains(STORES.customers)) {
        const customerStore = db.createObjectStore(STORES.customers, { keyPath: 'id', autoIncrement: false });
        customerStore.createIndex('name', 'name', { unique: false });
        customerStore.createIndex('phone', 'phone', { unique: false });
        customerStore.createIndex('email', 'email', { unique: false });
        customerStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // Create Products Store
      if (!db.objectStoreNames.contains(STORES.products)) {
        const productStore = db.createObjectStore(STORES.products, { keyPath: 'id', autoIncrement: false });
        productStore.createIndex('name', 'name', { unique: false });
        productStore.createIndex('barcode', 'barcode', { unique: false });
        productStore.createIndex('category', 'category', { unique: false });
        productStore.createIndex('stock', 'stock', { unique: false });
        productStore.createIndex('expiryDate', 'expiryDate', { unique: false });
        productStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // Create Transactions Store
      if (!db.objectStoreNames.contains(STORES.transactions)) {
        const transactionStore = db.createObjectStore(STORES.transactions, { keyPath: 'id', autoIncrement: false });
        transactionStore.createIndex('customerId', 'customerId', { unique: false });
        transactionStore.createIndex('customerName', 'customerName', { unique: false });
        transactionStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
        transactionStore.createIndex('status', 'status', { unique: false });
        transactionStore.createIndex('createdAt', 'createdAt', { unique: false });
        transactionStore.createIndex('total', 'total', { unique: false });
      }
      
      // Create Purchase Orders Store
      if (!db.objectStoreNames.contains(STORES.purchaseOrders)) {
        const poStore = db.createObjectStore(STORES.purchaseOrders, { keyPath: 'id', autoIncrement: false });
        poStore.createIndex('supplierName', 'supplierName', { unique: false });
        poStore.createIndex('status', 'status', { unique: false });
        poStore.createIndex('createdAt', 'createdAt', { unique: false });
        poStore.createIndex('total', 'total', { unique: false });
      }
      
      // Create Activities Store
      if (!db.objectStoreNames.contains(STORES.activities)) {
        const activityStore = db.createObjectStore(STORES.activities, { keyPath: 'id', autoIncrement: false });
        activityStore.createIndex('type', 'type', { unique: false });
        activityStore.createIndex('timestamp', 'timestamp', { unique: false });
        activityStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // Create Invoices Store
      if (!db.objectStoreNames.contains(STORES.invoices)) {
        const invoiceStore = db.createObjectStore(STORES.invoices, { keyPath: 'id', autoIncrement: false });
        invoiceStore.createIndex('transactionId', 'transactionId', { unique: false });
        invoiceStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
        invoiceStore.createIndex('customerId', 'customerId', { unique: false });
        invoiceStore.createIndex('paymentStatus', 'paymentStatus', { unique: false });
        invoiceStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // Create Settings Store
      if (!db.objectStoreNames.contains(STORES.settings)) {
        const settingsStore = db.createObjectStore(STORES.settings, { keyPath: 'id', autoIncrement: false });
        settingsStore.createIndex('userId', 'userId', { unique: false });
        settingsStore.createIndex('key', 'key', { unique: false });
        settingsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

// ============================================
// GENERIC CRUD OPERATIONS
// ============================================

/**
 * Add a single item to a store
 * @param {string} storeName - Name of the object store
 * @param {Object} item - Item to add (must have id)
 * @returns {Promise<any>} - The key of the added item
 */
export const addItem = async (storeName, item) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all items from a store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<Array>} - Array of all items
 */
export const getAllItems = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get a single item by ID
 * @param {string} storeName - Name of the object store
 * @param {string|number} id - ID of the item
 * @returns {Promise<Object|null>} - The item or null if not found
 */
export const getItem = async (storeName, id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Update an existing item (or add if it doesn't exist)
 * @param {string} storeName - Name of the object store
 * @param {Object} item - Item to update (must have id)
 * @returns {Promise<any>} - The key of the updated item
 */
export const updateItem = async (storeName, item) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete an item by ID
 * @param {string} storeName - Name of the object store
 * @param {string|number} id - ID of the item to delete
 * @returns {Promise<void>}
 */
export const deleteItem = async (storeName, id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Count items in a store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<number>} - Count of items
 */
export const countItems = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Add multiple items to a store
 * @param {string} storeName - Name of the object store
 * @param {Array<Object>} items - Array of items to add
 * @returns {Promise<void>}
 */
export const addMultipleItems = async (storeName, items) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const promises = items.map(item => {
      return new Promise((res, rej) => {
        const request = store.add(item);
        request.onsuccess = () => res();
        request.onerror = () => rej(request.error);
      });
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    
    Promise.all(promises).catch(reject);
  });
};

/**
 * Update multiple items in a store
 * @param {string} storeName - Name of the object store
 * @param {Array<Object>} items - Array of items to update
 * @returns {Promise<void>}
 */
export const updateMultipleItems = async (storeName, items) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const promises = items.map(item => {
      return new Promise((res, rej) => {
        const request = store.put(item);
        request.onsuccess = () => res();
        request.onerror = () => rej(request.error);
      });
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    
    Promise.all(promises).catch(reject);
  });
};

/**
 * Delete multiple items by IDs
 * @param {string} storeName - Name of the object store
 * @param {Array<string|number>} ids - Array of IDs to delete
 * @returns {Promise<void>}
 */
export const deleteMultipleItems = async (storeName, ids) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const promises = ids.map(id => {
      return new Promise((res, rej) => {
        const request = store.delete(id);
        request.onsuccess = () => res();
        request.onerror = () => rej(request.error);
      });
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    
    Promise.all(promises).catch(reject);
  });
};

/**
 * Clear all items from a store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<void>}
 */
export const clearAllItems = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ============================================
// QUERY & SEARCH OPERATIONS
// ============================================

/**
 * Get items by index value
 * @param {string} storeName - Name of the object store
 * @param {string} indexName - Name of the index
 * @param {any} value - Value to search for
 * @returns {Promise<Array>} - Array of matching items
 */
export const getItemsByIndex = async (storeName, indexName, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get items by index range
 * @param {string} storeName - Name of the object store
 * @param {string} indexName - Name of the index
 * @param {IDBKeyRange} range - IDBKeyRange object
 * @returns {Promise<Array>} - Array of matching items
 */
export const getItemsByRange = async (storeName, indexName, range) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(range);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Search customers by name, phone, or email
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} - Array of matching customers
 */
export const searchCustomers = async (searchTerm) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.customers], 'readonly');
    const store = transaction.objectStore(STORES.customers);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const allCustomers = request.result;
      const term = searchTerm.toLowerCase();
      const filtered = allCustomers.filter(customer => 
        customer.name?.toLowerCase().includes(term) ||
        customer.phone?.includes(term) ||
        customer.email?.toLowerCase().includes(term)
      );
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Search products by name, category, or barcode
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} - Array of matching products
 */
export const searchProducts = async (searchTerm) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.products], 'readonly');
    const store = transaction.objectStore(STORES.products);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const allProducts = request.result;
      const term = searchTerm.toLowerCase();
      const filtered = allProducts.filter(product => 
        product.name?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.barcode?.includes(term)
      );
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get products by category
 * @param {string} category - Category name
 * @returns {Promise<Array>} - Array of products in category
 */
export const getProductsByCategory = async (category) => {
  return getItemsByIndex(STORES.products, 'category', category);
};

/**
 * Get low stock products
 * @param {number} threshold - Stock threshold
 * @returns {Promise<Array>} - Array of low stock products
 */
export const getLowStockProducts = async (threshold) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.products], 'readonly');
    const store = transaction.objectStore(STORES.products);
    const index = store.index('stock');
    const range = IDBKeyRange.upperBound(threshold);
    const request = index.getAll(range);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get expiring products
 * @param {Date} expiryDate - Expiry date threshold
 * @returns {Promise<Array>} - Array of expiring products
 */
export const getExpiringProducts = async (expiryDate) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.products], 'readonly');
    const store = transaction.objectStore(STORES.products);
    const index = store.index('expiryDate');
    const range = IDBKeyRange.upperBound(expiryDate.toISOString());
    const request = index.getAll(range);
    
    request.onsuccess = () => {
      const products = request.result;
      // Filter out products without expiry dates and past expiry dates
      const filtered = products.filter(product => {
        if (!product.expiryDate) return false;
        const expiry = new Date(product.expiryDate);
        return expiry >= new Date() && expiry <= expiryDate;
      });
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get transactions by customer ID
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} - Array of transactions
 */
export const getTransactionsByCustomer = async (customerId) => {
  return getItemsByIndex(STORES.transactions, 'customerId', customerId);
};

/**
 * Get transactions by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of transactions
 */
export const getTransactionsByDateRange = async (startDate, endDate) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.transactions], 'readonly');
    const store = transaction.objectStore(STORES.transactions);
    const index = store.index('createdAt');
    const range = IDBKeyRange.bound(
      startDate.toISOString(),
      endDate.toISOString()
    );
    const request = index.getAll(range);
    
    request.onsuccess = () => {
      const transactions = request.result;
      // Filter by actual date range
      const filtered = transactions.filter(t => {
        const date = new Date(t.createdAt);
        return date >= startDate && date <= endDate;
      });
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get purchase orders by status
 * @param {string} status - Order status
 * @returns {Promise<Array>} - Array of purchase orders
 */
export const getPurchaseOrdersByStatus = async (status) => {
  return getItemsByIndex(STORES.purchaseOrders, 'status', status);
};

/**
 * Get activities by type
 * @param {string} type - Activity type
 * @returns {Promise<Array>} - Array of activities
 */
export const getActivitiesByType = async (type) => {
  return getItemsByIndex(STORES.activities, 'type', type);
};

/**
 * Get activities by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of activities
 */
export const getActivitiesByDateRange = async (startDate, endDate) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.activities], 'readonly');
    const store = transaction.objectStore(STORES.activities);
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(
      startDate.toISOString(),
      endDate.toISOString()
    );
    const request = index.getAll(range);
    
    request.onsuccess = () => {
      const activities = request.result;
      const filtered = activities.filter(a => {
        const date = new Date(a.timestamp || a.createdAt);
        return date >= startDate && date <= endDate;
      });
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
};

// ============================================
// PAGINATION OPERATIONS
// ============================================

/**
 * Get paginated items from a store
 * @param {string} storeName - Name of the object store
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Items per page
 * @param {string} sortBy - Index name to sort by (optional)
 * @param {boolean} descending - Sort descending (default: false)
 * @returns {Promise<{items: Array, total: number, page: number, pageSize: number, totalPages: number}>}
 */
export const getPaginatedItems = async (storeName, page = 1, pageSize = 50, sortBy = null, descending = false) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    // Get total count
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      const total = countRequest.result;
      const totalPages = Math.ceil(total / pageSize);
      
      // Get all items
      const getAllRequest = sortBy ? store.index(sortBy).getAll() : store.getAll();
      getAllRequest.onsuccess = () => {
        let items = getAllRequest.result;
        
        // Sort if needed
        if (sortBy && items.length > 0) {
          items.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            if (descending) {
              return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            } else {
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            }
          });
        }
        
        // Paginate
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedItems = items.slice(startIndex, endIndex);
        
        resolve({
          items: paginatedItems,
          total,
          page,
          pageSize,
          totalPages
        });
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    countRequest.onerror = () => reject(countRequest.error);
  });
};

// ============================================
// STATISTICS & AGGREGATION OPERATIONS
// ============================================

/**
 * Get total sales amount
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<number>} - Total sales amount
 */
export const getTotalSales = async (startDate = null, endDate = null) => {
  const transactions = startDate && endDate
    ? await getTransactionsByDateRange(startDate, endDate)
    : await getAllItems(STORES.transactions);
  
  return transactions.reduce((sum, transaction) => sum + (transaction.total || 0), 0);
};

/**
 * Get total purchase orders amount
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<number>} - Total purchase orders amount
 */
export const getTotalPurchaseOrders = async (startDate = null, endDate = null) => {
  const orders = await getAllItems(STORES.purchaseOrders);
  
  let filtered = orders;
  if (startDate && endDate) {
    filtered = orders.filter(order => {
      const date = new Date(order.createdAt);
      return date >= startDate && date <= endDate;
    });
  }
  
  return filtered.reduce((sum, order) => sum + (order.total || 0), 0);
};

/**
 * Get inventory value (stock * price)
 * @returns {Promise<number>} - Total inventory value
 */
export const getInventoryValue = async () => {
  const products = await getAllItems(STORES.products);
  return products.reduce((sum, product) => {
    const stock = product.stock || 0;
    const price = product.price || 0;
    return sum + (stock * price);
  }, 0);
};

/**
 * Get customer statistics
 * @returns {Promise<{total: number, withTransactions: number, totalSpent: number}>}
 */
export const getCustomerStats = async () => {
  const customers = await getAllItems(STORES.customers);
  const transactions = await getAllItems(STORES.transactions);
  
  const customerIds = new Set(transactions.map(t => t.customerId).filter(Boolean));
  const totalSpent = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
  
  return {
    total: customers.length,
    withTransactions: customerIds.size,
    totalSpent
  };
};

// ============================================
// EXPORT & IMPORT OPERATIONS
// ============================================

/**
 * Export all data as JSON
 * @returns {Promise<Object>} - All data as JSON object
 */
export const exportData = async () => {
  try {
    const [customers, products, transactions, purchaseOrders, activities, invoices, settings] = await Promise.all([
      getAllItems(STORES.customers),
      getAllItems(STORES.products),
      getAllItems(STORES.transactions),
      getAllItems(STORES.purchaseOrders),
      getAllItems(STORES.activities),
      getAllItems(STORES.invoices),
      getAllItems(STORES.settings)
    ]);

    const data = {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      customers,
      products,
      transactions,
      purchaseOrders,
      activities,
      invoices,
      settings
    };

    return data;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

/**
 * Import data from JSON
 * @param {Object} data - Data object to import
 * @param {boolean} clearExisting - Whether to clear existing data first (default: true)
 * @returns {Promise<{success: boolean, message: string, imported: Object}>}
 */
export const importData = async (data, clearExisting = true) => {
  try {
    if (clearExisting) {
      await Promise.all([
        clearAllItems(STORES.customers),
        clearAllItems(STORES.products),
        clearAllItems(STORES.transactions),
        clearAllItems(STORES.purchaseOrders),
        clearAllItems(STORES.activities),
        clearAllItems(STORES.invoices),
        clearAllItems(STORES.settings)
      ]);
    }

    const imported = {
      customers: 0,
      products: 0,
      transactions: 0,
      purchaseOrders: 0,
      activities: 0,
      invoices: 0,
      settings: 0
    };

    if (data.customers && data.customers.length > 0) {
      await addMultipleItems(STORES.customers, data.customers);
      imported.customers = data.customers.length;
    }
    if (data.products && data.products.length > 0) {
      await addMultipleItems(STORES.products, data.products);
      imported.products = data.products.length;
    }
    if (data.transactions && data.transactions.length > 0) {
      await addMultipleItems(STORES.transactions, data.transactions);
      imported.transactions = data.transactions.length;
    }
    if (data.purchaseOrders && data.purchaseOrders.length > 0) {
      await addMultipleItems(STORES.purchaseOrders, data.purchaseOrders);
      imported.purchaseOrders = data.purchaseOrders.length;
    }
    if (data.activities && data.activities.length > 0) {
      await addMultipleItems(STORES.activities, data.activities);
      imported.activities = data.activities.length;
    }
    if (data.invoices && data.invoices.length > 0) {
      await addMultipleItems(STORES.invoices, data.invoices);
      imported.invoices = data.invoices.length;
    }
    if (data.settings && data.settings.length > 0) {
      await addMultipleItems(STORES.settings, data.settings);
      imported.settings = data.settings.length;
    }

    return {
      success: true,
      message: 'Data imported successfully',
      imported
    };
  } catch (error) {
    console.error('Error importing data:', error);
    return {
      success: false,
      message: error.message,
      imported: {}
    };
  }
};

// ============================================
// SYNC OPERATIONS
// ============================================

/**
 * Sync data to backend
 * @param {string} backendUrl - Backend API URL
 * @param {Object} options - Sync options
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export const syncDataToBackend = async (backendUrl = 'https://your-backend-api.com/sync', options = {}) => {
  if (!navigator.onLine && !options.force) {
    console.warn('Device is offline. Cannot sync data.');
    return { success: false, message: 'Device is offline' };
  }

  try {
    const data = await exportData();
    data.syncedAt = new Date().toISOString();
    data.userId = options.userId || null;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Backend sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Data synced successfully:', result);
    return { success: true, message: 'Data synced successfully', data: result };
  } catch (error) {
    console.error('Error syncing data:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Sync data from backend
 * @param {string} backendUrl - Backend API URL
 * @param {Object} options - Sync options
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export const syncDataFromBackend = async (backendUrl = 'https://your-backend-api.com/sync', options = {}) => {
  if (!navigator.onLine && !options.force) {
    console.warn('Device is offline. Cannot sync data.');
    return { success: false, message: 'Device is offline' };
  }

  try {
    const url = new URL(backendUrl);
    if (options.userId) {
      url.searchParams.append('userId', options.userId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Backend fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    const result = await importData(data, options.clearExisting !== false);
    
    return { success: result.success, message: result.message, data: result.imported };
  } catch (error) {
    console.error('Error syncing data from backend:', error);
    return { success: false, message: error.message };
  }
};

// ============================================
// DATABASE MANAGEMENT OPERATIONS
// ============================================

/**
 * Delete the entire database
 * @returns {Promise<void>}
 */
export const deleteDatabase = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('Database deletion blocked. Close all tabs with this database open.');
      reject(new Error('Database deletion blocked'));
    };
  });
};

/**
 * Get database size information
 * @returns {Promise<{stores: Object, totalSize: number}>}
 */
export const getDatabaseInfo = async () => {
  const db = await openDB();
  const stores = {};
  let totalSize = 0;

  for (const storeName of db.objectStoreNames) {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const countRequest = store.count();
    
    await new Promise((resolve, reject) => {
      countRequest.onsuccess = () => {
        stores[storeName] = {
          count: countRequest.result,
          name: storeName
        };
        resolve();
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  // Estimate size (rough calculation)
  const allData = await exportData();
  const dataString = JSON.stringify(allData);
  totalSize = new Blob([dataString]).size;

  return {
    stores,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
  };
};

// Export openDB for direct access if needed
export { openDB };
