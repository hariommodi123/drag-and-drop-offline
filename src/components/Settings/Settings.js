import React, { useState } from 'react';
import { useApp, ActionTypes } from '../../context/AppContext';
import { 
  Settings as SettingsIcon, 
  Save,
  Bell,
  AlertTriangle,
  RefreshCw,
  LogOut,
  X,
  WifiOff,
  Store,
  CreditCard,
  User,
  MapPin,
  Phone,
  Mail,
  Building2
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { apiRequest } from '../../utils/api';

const Settings = () => {
  const { state, dispatch } = useApp();
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settings, setSettings] = useState({
    lowStockThreshold: state.lowStockThreshold || '',
    expiryDaysThreshold: state.expiryDaysThreshold || '',
    storeName: state.storeName || 'Grocery Store',
    gstNumber: state.gstNumber || '',
    upiId: state.currentUser?.upiId || state.upiId || '',
    // Seller Profile
    sellerName: state.currentUser?.username || state.currentUser?.name || '',
    sellerEmail: state.currentUser?.email || '',
    sellerPhone: state.currentUser?.phone || state.currentUser?.mobileNumber || '',
    // Business Profile
    businessAddress: state.currentUser?.address || state.storeAddress || '',
    businessCity: state.currentUser?.city || '',
    businessState: state.currentUser?.state || '',
    businessPincode: state.currentUser?.pincode || '',
    businessCategory: state.currentUser?.businessCategory || 'Retail'
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [logoutUnsyncedSummary, setLogoutUnsyncedSummary] = useState([]);
  const [logoutFeedback, setLogoutFeedback] = useState({ message: '', offline: false });

  const handleSaveSettings = async () => {
    if (isSavingSettings) return;
    setIsSavingSettings(true);

    const lowStockValue = settings.lowStockThreshold === '' ? state.lowStockThreshold : parseInt(settings.lowStockThreshold);
    const expiryValue = settings.expiryDaysThreshold === '' ? state.expiryDaysThreshold : parseInt(settings.expiryDaysThreshold);
    
    if (isNaN(lowStockValue) || isNaN(expiryValue)) {
      if (window.showToast) {
        window.showToast('Please enter valid numbers for thresholds', 'error');
      }
      setIsSavingSettings(false);
      return;
    }
    
    // Dispatch all settings updates
    dispatch({ type: 'SET_LOW_STOCK_THRESHOLD', payload: lowStockValue });
    dispatch({ type: 'SET_EXPIRY_DAYS_THRESHOLD', payload: expiryValue });
    dispatch({ type: 'SET_GST_NUMBER', payload: settings.gstNumber });
    dispatch({ type: 'SET_STORE_NAME', payload: settings.storeName });
    
    // Update user profile with seller and business information
    if (state.currentUser) {
      const updatedUser = {
        ...state.currentUser,
        username: settings.sellerName,
        name: settings.sellerName,
        email: settings.sellerEmail,
        phone: settings.sellerPhone,
        mobileNumber: settings.sellerPhone,
        address: settings.businessAddress,
        city: settings.businessCity,
        state: settings.businessState,
        pincode: settings.businessPincode,
        businessCategory: settings.businessCategory,
        shopName: settings.storeName,
        shopAddress: settings.businessAddress
      };
      
      dispatch({
        type: ActionTypes.UPDATE_USER,
        payload: updatedUser
      });
      
      // Also save to localStorage directly for persistence
      try {
        const authData = JSON.parse(localStorage.getItem('auth') || '{}');
        authData.currentUser = updatedUser;
        localStorage.setItem('auth', JSON.stringify(authData));
        
        // Save settings separately
        const userId = state.currentUser?.email || state.currentUser?.uid;
        if (userId) {
          const settingsData = {
            lowStockThreshold: lowStockValue,
            expiryDaysThreshold: expiryValue,
            gstNumber: settings.gstNumber,
            storeName: settings.storeName,
            storeAddress: settings.businessAddress
          };
          localStorage.setItem(`settings_${userId}`, JSON.stringify(settingsData));
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
    
    const trimmedUpi = (settings.upiId || '').trim();
    setSettings(prev => ({ ...prev, upiId: trimmedUpi }));
    
    try {
      const response = await apiRequest('/data/seller/settings', {
        method: 'PUT',
        body: {
          upiId: trimmedUpi,
          username: settings.sellerName,
          phone: settings.sellerPhone,
          address: settings.businessAddress,
          city: settings.businessCity,
          state: settings.businessState,
          pincode: settings.businessPincode,
          businessCategory: settings.businessCategory,
          storeName: settings.storeName,
          gstNumber: settings.gstNumber
        }
      });

      if (response.success) {
        const updatedUpi = response.data?.seller?.upiId || '';
        dispatch({ type: ActionTypes.SET_UPI_ID, payload: updatedUpi });
        if (state.currentUser) {
          dispatch({
            type: ActionTypes.UPDATE_USER,
            payload: {
              ...state.currentUser,
              upiId: updatedUpi
            }
          });
        }
        setSettings(prev => ({ ...prev, upiId: updatedUpi }));
        if (window.showToast) {
          window.showToast('Settings saved successfully!', 'success');
        }
      } else {
        if (window.showToast) {
          window.showToast(response.error || response.data?.message || 'Failed to update settings', 'error');
        }
      }
    } catch (error) {
      console.error('Error updating seller settings:', error);
      if (window.showToast) {
        window.showToast('Error updating settings. Please try again.', 'error');
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCancelLogout = () => {
    if (isProcessingLogout) return;
    setShowLogoutModal(false);
    setLogoutUnsyncedSummary([]);
    setLogoutFeedback({ message: '', offline: false });
  };

  const handleConfirmLogout = async () => {
    if (isProcessingLogout) return;
    setIsProcessingLogout(true);
    setLogoutUnsyncedSummary([]);
    setLogoutFeedback({ message: '', offline: false });

    try {
      const logoutResult = await dispatch({ type: 'REQUEST_LOGOUT' });

      if (!logoutResult?.success) {
        if (logoutResult?.unsynced?.length) {
          setLogoutUnsyncedSummary(logoutResult.unsynced);
        }
        if (logoutResult?.message && window.showToast) {
          window.showToast(
            logoutResult.message,
            logoutResult?.toastType || (logoutResult?.offline ? 'info' : 'warning')
          );
        }
        setLogoutFeedback({
          message: logoutResult?.message || '',
          offline: !!logoutResult?.offline
        });
        setIsProcessingLogout(false);
        return;
      }

      await signOut(auth);
      await dispatch({ type: ActionTypes.LOGOUT });
      if (window.showToast) {
        window.showToast('Logged out successfully.', 'success');
      }
      setShowLogoutModal(false);
      setLogoutUnsyncedSummary([]);
      setLogoutFeedback({ message: '', offline: false });
    } catch (error) {
      console.error('Sign out error:', error);
      await dispatch({ type: ActionTypes.LOGOUT });
      if (window.showToast) {
        window.showToast('Logged out. Some local data may not have been synced.', 'warning');
      }
      setShowLogoutModal(false);
      setLogoutUnsyncedSummary([]);
      setLogoutFeedback({ message: '', offline: false });
    } finally {
      setIsProcessingLogout(false);
    }
  };

  return (
    <>
      <div className="space-y-8 pb-16 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-2">Manage your business settings and preferences</p>
        </div>

        {/* Settings Card */}
        <div className="card space-y-8">
          {/* Seller Profile */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Seller Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <User className="h-4 w-4 mr-1.5 text-gray-500" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={settings.sellerName}
                  onChange={(e) => setSettings(prev => ({ ...prev, sellerName: e.target.value }))}
                  className="input-field"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Mail className="h-4 w-4 mr-1.5 text-gray-500" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.sellerEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, sellerEmail: e.target.value }))}
                  className="input-field"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Phone className="h-4 w-4 mr-1.5 text-gray-500" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.sellerPhone}
                  onChange={(e) => setSettings(prev => ({ ...prev, sellerPhone: e.target.value }))}
                  className="input-field"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

          {/* Business Profile */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-purple-600" />
              Business Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Store className="h-4 w-4 mr-1.5 text-gray-500" />
                  Store/Business Name
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
                  Business Category
                </label>
                <select
                  value={settings.businessCategory}
                  onChange={(e) => setSettings(prev => ({ ...prev, businessCategory: e.target.value }))}
                  className="input-field"
                >
                  <option value="Retail">Retail Store</option>
                  <option value="Grocery">Grocery Store</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing & Fashion</option>
                  <option value="Food">Food & Beverages</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <MapPin className="h-4 w-4 mr-1.5 text-gray-500" />
                  Business Address
                </label>
                <textarea
                  value={settings.businessAddress}
                  onChange={(e) => setSettings(prev => ({ ...prev, businessAddress: e.target.value }))}
                  className="input-field"
                  rows="2"
                  placeholder="Enter complete business address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={settings.businessCity}
                  onChange={(e) => setSettings(prev => ({ ...prev, businessCity: e.target.value }))}
                  className="input-field"
                  placeholder="Enter city"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={settings.businessState}
                  onChange={(e) => setSettings(prev => ({ ...prev, businessState: e.target.value }))}
                  className="input-field"
                  placeholder="Enter state"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  value={settings.businessPincode}
                  onChange={(e) => setSettings(prev => ({ ...prev, businessPincode: e.target.value }))}
                  className="input-field"
                  placeholder="Enter pincode"
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
                  placeholder="Enter GST number (optional)"
                />
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-green-600" />
              Payment Settings
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UPI ID
              </label>
              <input
                type="text"
                value={settings.upiId}
                onChange={(e) => setSettings(prev => ({ ...prev, upiId: e.target.value }))}
                className="input-field"
                placeholder="e.g. store@upi"
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide your business UPI ID to accept digital payments on invoices.
              </p>
            </div>
          </div>

          {/* Alert Settings */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-6 border-t border-gray-200 gap-3">
            <button
              onClick={() => {
                setLogoutUnsyncedSummary([]);
                setLogoutFeedback({ message: '', offline: false });
                setShowLogoutModal(true);
              }}
              className="btn-secondary flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 border-red-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
            
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className={`btn-primary flex items-center justify-center ${isSavingSettings ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
              <button
                onClick={handleCancelLogout}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-sm text-gray-600">
              {logoutUnsyncedSummary.length > 0
                ? 'We detected pending offline changes. Sync them before logging out to avoid data loss.'
                : 'Make sure all your data is synced to the cloud before logging out.'}
            </p>

            {logoutUnsyncedSummary.length > 0 && (
              <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center text-sm font-medium text-orange-700">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Pending sync items
                </div>
                <ul className="mt-2 space-y-1 text-sm text-orange-700">
                  {logoutUnsyncedSummary.map(item => (
                    <li key={item.key} className="flex justify-between">
                      <span>{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {logoutFeedback.message && (
              <div className={`mt-4 rounded-lg border p-3 text-sm flex items-start space-x-2 ${
                logoutFeedback.offline
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-yellow-200 bg-yellow-50 text-yellow-700'
              }`}>
                {logoutFeedback.offline ? (
                  <WifiOff className="h-4 w-4 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                )}
                <span>{logoutFeedback.message}</span>
              </div>
            )}

            {isProcessingLogout && (
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking unsynced data and attempting to sync...
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCancelLogout}
                className="btn-secondary"
                disabled={isProcessingLogout}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="btn-primary bg-red-500 hover:bg-red-600 border-red-500"
                disabled={isProcessingLogout}
              >
                {isProcessingLogout ? 'Syncing...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
