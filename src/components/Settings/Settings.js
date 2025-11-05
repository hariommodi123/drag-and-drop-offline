import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw,
  Bell,
  Package,
  Clock,
  Globe,
  Database,
  Download,
  Upload,
  AlertTriangle,
  User,
  Lock,
  Mic,
  Cloud,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { getTranslation } from '../../utils/translations';
import { syncDataToBackend, exportData as exportIndexedDB, importData as importIndexedDB, getAllItems } from '../../utils/indexedDB';
import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebase';

const Settings = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('general');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ message: '', type: 'info' });
  const [settings, setSettings] = useState({
    lowStockThreshold: state.lowStockThreshold || '',
    expiryDaysThreshold: state.expiryDaysThreshold || '',
    storeName: state.storeName || 'Grocery Store',
    gstNumber: state.gstNumber || '',
    currentLanguage: state.currentLanguage,
    username: state.currentUser?.username || '',
    password: '',
    voiceAssistantEnabled: state.voiceAssistantEnabled !== false,
    voiceAssistantLanguage: state.voiceAssistantLanguage || 'en-US'
  });

  const handleSaveSettings = () => {
    const lowStockValue = settings.lowStockThreshold === '' ? state.lowStockThreshold : parseInt(settings.lowStockThreshold);
    const expiryValue = settings.expiryDaysThreshold === '' ? state.expiryDaysThreshold : parseInt(settings.expiryDaysThreshold);
    
    if (isNaN(lowStockValue) || isNaN(expiryValue)) {
      if (window.showToast) {
        window.showToast('Please enter valid numbers for thresholds', 'error');
      }
      return;
    }
    
    dispatch({ type: 'SET_LOW_STOCK_THRESHOLD', payload: lowStockValue });
    dispatch({ type: 'SET_EXPIRY_DAYS_THRESHOLD', payload: expiryValue });
    dispatch({ type: 'SET_GST_NUMBER', payload: settings.gstNumber });
    dispatch({ type: 'SET_STORE_NAME', payload: settings.storeName });
    dispatch({ type: 'SET_LANGUAGE', payload: settings.currentLanguage });
    dispatch({ type: 'SET_VOICE_ASSISTANT_LANGUAGE', payload: settings.voiceAssistantLanguage });
    dispatch({ type: 'SET_VOICE_ASSISTANT_ENABLED', payload: settings.voiceAssistantEnabled });
    
    // Update username if changed
    if (settings.username && settings.username !== state.currentUser?.username) {
      dispatch({
        type: 'UPDATE_USER',
        payload: {
          ...state.currentUser,
          username: settings.username
        }
      });
    }
    
    // Update password if provided
    if (settings.password && settings.password.trim() !== '') {
      dispatch({
        type: 'UPDATE_USER',
        payload: {
          ...state.currentUser,
          password: settings.password
        }
      });
    }
    
    // Log to verify changes
    console.log('Settings saved:', { lowStockValue, expiryValue, voiceAssistantEnabled: settings.voiceAssistantEnabled });
    
    // Show success message
    if (window.showToast) {
      window.showToast(
        `Settings saved! Low Stock: ${lowStockValue}, Expiry Days: ${expiryValue}, Voice Assistant: ${settings.voiceAssistantEnabled ? 'ON' : 'OFF'}`, 
        'success'
      );
    }
  };

  const resetToDefaults = () => {
    setSettings({
      lowStockThreshold: '',
      expiryDaysThreshold: '',
      storeName: 'Grocery Store',
      gstNumber: '',
      currentLanguage: 'en',
      username: state.currentUser?.username || '',
      password: '',
      voiceAssistantEnabled: true,
      voiceAssistantLanguage: 'en-US'
    });
  };

  const exportData = () => {
    const data = {
      customers: state.customers,
      products: state.products,
      transactions: state.transactions,
      purchaseOrders: state.purchaseOrders,
      settings: {
        lowStockThreshold: state.lowStockThreshold,
        expiryDaysThreshold: state.expiryDaysThreshold,
        storeName: state.storeName,
        gstNumber: state.gstNumber
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grocery-erp-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    if (window.showToast) {
      window.showToast('Data exported successfully!', 'success');
    }
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.customers) dispatch({ type: 'SET_CUSTOMERS', payload: data.customers });
          if (data.products) dispatch({ type: 'SET_PRODUCTS', payload: data.products });
          if (data.transactions) dispatch({ type: 'SET_TRANSACTIONS', payload: data.transactions });
          if (data.purchaseOrders) dispatch({ type: 'SET_PURCHASE_ORDERS', payload: data.purchaseOrders });
          
          if (data.settings) {
            if (data.settings.lowStockThreshold) dispatch({ type: 'SET_LOW_STOCK_THRESHOLD', payload: data.settings.lowStockThreshold });
            if (data.settings.expiryDaysThreshold) dispatch({ type: 'SET_EXPIRY_DAYS_THRESHOLD', payload: data.settings.expiryDaysThreshold });
            if (data.settings.gstNumber) dispatch({ type: 'SET_GST_NUMBER', payload: data.settings.gstNumber });
          }
          
          if (window.showToast) {
            window.showToast('Data imported successfully!', 'success');
          }
        } catch (error) {
          if (window.showToast) {
            window.showToast('Error importing data. Please check the file format.', 'error');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    setSyncStatus({ message: 'Syncing data to cloud...', type: 'info' });
    
    try {
      const result = await syncDataToBackend();
      
      if (result.success) {
        setSyncStatus({ message: result.message || 'Data synced successfully!', type: 'success' });
        if (window.showToast) {
          window.showToast('Data synced to cloud successfully!', 'success');
        }
      } else {
        setSyncStatus({ message: result.message || 'Failed to sync data', type: 'error' });
        if (window.showToast) {
          window.showToast(result.message || 'Failed to sync data to cloud', 'error');
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus({ message: 'Error syncing data to cloud', type: 'error' });
      if (window.showToast) {
        window.showToast('Error syncing data to cloud. Please try again.', 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'data', label: 'Data', icon: Database }
  ];

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{getTranslation('settings', state.currentLanguage)}</h2>
          <p className="text-gray-600 mt-2">Manage your application settings and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <SettingsIcon className="h-5 w-5 mr-2 text-blue-600" />
                  General Settings
                </h3>
                
                <div className="space-y-6">
                  {/* Business Info */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Business Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Store Name
                        </label>
                        <input
                          type="text"
                          value={settings.storeName}
                          onChange={(e) => setSettings(prev => ({ ...prev, storeName: e.target.value }))}
                          className="input-field"
                          placeholder="Enter store name"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GST Number
                        </label>
                        <input
                          type="text"
                          value={settings.gstNumber}
                          onChange={(e) => setSettings(prev => ({ ...prev, gstNumber: e.target.value }))}
                          className="input-field"
                          placeholder="Enter GST number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* User Account */}
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2 text-blue-600" />
                      User Account
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={settings.username}
                          onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
                          className="input-field"
                          placeholder="Enter username"
                        />
                      </div>
                      
                      <div>
                        <label className="flex text-sm font-medium text-gray-700 mb-2 items-center">
                          <Lock className="h-4 w-4 mr-2" />
                          New Password
                        </label>
                        <input
                          type="password"
                          value={settings.password}
                          onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
                          className="input-field"
                          placeholder="Enter new password (leave blank to keep current)"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave blank to keep current password
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Voice Assistant */}
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Mic className="h-4 w-4 mr-2 text-purple-600" />
                      Voice Assistant
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Enable Voice Assistant</p>
                          <p className="text-sm text-gray-600">Allow voice commands and speech recognition</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.voiceAssistantEnabled}
                            onChange={(e) => setSettings(prev => ({ ...prev, voiceAssistantEnabled: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Voice Assistant Language
                        </label>
                        <select
                          value={settings.voiceAssistantLanguage}
                          onChange={(e) => setSettings(prev => ({ ...prev, voiceAssistantLanguage: e.target.value }))}
                          className="input-field"
                        >
                          <option value="en-US">English (US)</option>
                          <option value="hi-IN">Hindi (India)</option>
                          <option value="en-GB">English (UK)</option>
                          <option value="es-ES">Spanish</option>
                          <option value="fr-FR">French</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                          Language for voice recognition and speech synthesis
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const testText = settings.voiceAssistantLanguage === 'hi-IN' ? 'नमस्ते, यह एक परीक्षण है' : 'Hello, this is a test';
                            if (window.testSpeech) {
                              window.testSpeech();
                            } else {
                              console.log('Test speech function not available');
                            }
                          }}
                          className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Test Voice
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alert Settings */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-yellow-600" />
                  Alert Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      value={settings.lowStockThreshold}
                      onChange={(e) => setSettings(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                      className="input-field"
                      min="0"
                      placeholder="Enter threshold"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Products with stock at or below this number will trigger low stock alerts
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Days Threshold
                    </label>
                    <input
                      type="number"
                      value={settings.expiryDaysThreshold}
                      onChange={(e) => setSettings(prev => ({ ...prev, expiryDaysThreshold: e.target.value }))}
                      className="input-field"
                      min="0"
                      placeholder="Enter days"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Products expiring within this many days will trigger expiry alerts
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Language Settings */}
            {activeTab === 'language' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-green-600" />
                  Language Settings
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application Language
                  </label>
                  <select
                    value={settings.currentLanguage}
                    onChange={(e) => setSettings(prev => ({ ...prev, currentLanguage: e.target.value }))}
                    className="input-field"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose your preferred language for the application interface
                  </p>
                </div>
              </div>
            )}

            {/* Data Management */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-purple-600" />
                  Data Management
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Export Data</h4>
                    <p className="text-sm text-gray-600">
                      Download a backup of all your data including customers, products, transactions, and settings.
                    </p>
                    <button
                      onClick={exportData}
                      className="btn-secondary flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Import Data</h4>
                    <p className="text-sm text-gray-600">
                      Restore data from a previously exported backup file.
                    </p>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importData}
                      className="hidden"
                      id="import-file"
                    />
                    <label
                      htmlFor="import-file"
                      className="btn-secondary flex items-center cursor-pointer"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </label>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Sync to Cloud</h4>
                    <p className="text-sm text-gray-600">
                      Sync your data to the cloud backend for backup and cross-device access.
                    </p>
                    <button
                      onClick={handleSyncToCloud}
                      disabled={isSyncing}
                      className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Cloud className="h-4 w-4 mr-2" />
                          Sync Now
                        </>
                      )}
                    </button>
                    {syncStatus.message && (
                      <p className={`text-sm ${
                        syncStatus.type === 'success' ? 'text-green-600' : 
                        syncStatus.type === 'error' ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        {syncStatus.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">IndexedDB Export/Import</h4>
                    <p className="text-sm text-gray-600">
                      Export or import data from IndexedDB storage.
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const data = await exportIndexedDB();
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `indexeddb-backup-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                            if (window.showToast) {
                              window.showToast('IndexedDB data exported successfully!', 'success');
                            }
                          } catch (error) {
                            console.error('Export error:', error);
                            if (window.showToast) {
                              window.showToast('Error exporting IndexedDB data', 'error');
                            }
                          }
                        }}
                        className="btn-secondary flex items-center justify-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export IndexedDB
                      </button>
                      <input
                        type="file"
                        accept=".json"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              try {
                                const data = JSON.parse(event.target.result);
                                const result = await importIndexedDB(data);
                                if (result.success) {
                                  // Reload data from IndexedDB
                                  const customers = await getAllItems('customers');
                                  const products = await getAllItems('products');
                                  const transactions = await getAllItems('transactions');
                                  
                                  dispatch({ type: 'SET_CUSTOMERS', payload: customers });
                                  dispatch({ type: 'SET_PRODUCTS', payload: products });
                                  dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
                                  
                                  if (window.showToast) {
                                    window.showToast('IndexedDB data imported successfully!', 'success');
                                  }
                                } else {
                                  if (window.showToast) {
                                    window.showToast(result.message || 'Error importing IndexedDB data', 'error');
                                  }
                                }
                              } catch (error) {
                                console.error('Import error:', error);
                                if (window.showToast) {
                                  window.showToast('Error importing data. Please check the file format.', 'error');
                                }
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="hidden"
                        id="import-indexeddb-file"
                      />
                      <label
                        htmlFor="import-indexeddb-file"
                        className="btn-secondary flex items-center justify-center cursor-pointer"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import IndexedDB
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Important Notice</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Importing data will replace all existing data. Make sure to export your current data before importing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-6 border-t border-gray-200 gap-3">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <button
                  onClick={resetToDefaults}
                  className="btn-secondary flex items-center justify-center"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </button>
                
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to logout?')) {
                      try {
                        await signOut(auth);
                        dispatch({ type: 'LOGOUT' });
                      } catch (error) {
                        console.error('Sign out error:', error);
                        // Still dispatch logout even if Firebase sign out fails
                        dispatch({ type: 'LOGOUT' });
                      }
                    }
                  }}
                  className="btn-secondary flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 border-red-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
              
              <button
                onClick={handleSaveSettings}
                className="btn-primary flex items-center justify-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;