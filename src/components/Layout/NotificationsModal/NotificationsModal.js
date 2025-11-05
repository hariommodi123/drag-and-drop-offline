import React from 'react';
import { useApp } from '../../../context/AppContext';
import { X, AlertTriangle, Package, Clock } from 'lucide-react';
import { getTranslation } from '../../../utils/translations';

const NotificationsModal = ({ onClose }) => {
  const { state } = useApp();

  const lowStockProducts = state.products.filter(p => (p.quantity || p.stock || 0) <= state.lowStockThreshold);
  const expiringProducts = state.products.filter(p => {
    if (!p.expiryDate) return false;
    const expiryDate = new Date(p.expiryDate);
    const now = new Date();
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= state.expiryDaysThreshold;
  });

  const notifications = [
    ...lowStockProducts.map(product => ({
      type: 'low_stock',
      title: getTranslation('lowStockAlert', state.currentLanguage),
      message: `${product.name} ${getTranslation('isRunningLow', state.currentLanguage)} (${product.quantity || product.stock || 0} ${getTranslation('unitsRemaining', state.currentLanguage)})`,
      icon: Package,
      color: 'yellow'
    })),
    ...expiringProducts.map(product => ({
      type: 'expiring',
      title: getTranslation('expiringSoon', state.currentLanguage),
      message: `${product.name} ${getTranslation('expiresIn', state.currentLanguage)} ${Math.ceil((new Date(product.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} ${getTranslation('days', state.currentLanguage)}`,
      icon: Clock,
      color: 'red'
    }))
  ];

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{getTranslation('notifications', state.currentLanguage)}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">{getTranslation('noNotifications', state.currentLanguage)}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => {
                const Icon = notification.icon;
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-l-4 ${
                      notification.color === 'yellow' 
                        ? 'bg-yellow-50 border-yellow-400' 
                        : 'bg-red-50 border-red-400'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`p-2 bg-${notification.color}-100 rounded-lg mr-3 flex-shrink-0`}>
                        <Icon className={`h-5 w-5 text-${notification.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;




