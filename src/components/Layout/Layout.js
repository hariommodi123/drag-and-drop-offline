import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Sidebar from './Sidebar/Sidebar';
import Header from './Header/Header';
import MobileNavigation from './MobileNavigation/MobileNavigation';

const Layout = ({ children }) => {
  // const { state } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Simple toast functionality
  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  // Expose showToast to global context
  React.useEffect(() => {
    window.showToast = showToast;
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Desktop Sidebar */}
      <nav className="w-64 bg-[#1b1b1b] shadow-2xl flex-shrink-0 hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen border-r border-gray-800">
        <Sidebar />
      </nav>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-80" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-[#1b1b1b] shadow-2xl border-r border-gray-800">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth no-scrollbar">
          <div className="p-2 sm:p-3 lg:p-4 xl:p-6 pb-20 sm:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Toast Notifications */}
      <div className="fixed top-20 right-4 z-50 flex flex-col-reverse">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start p-4 rounded-lg border-l-4 shadow-xl backdrop-blur-sm min-w-[300px] max-w-[500px] mb-2 ${
              toast.type === 'success' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-500 text-green-800' :
              toast.type === 'error' ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-500 text-red-800' :
              toast.type === 'warning' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-500 text-yellow-800' :
              'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-500 text-orange-800'
            }`}
          >
            <div className="flex-1 pr-2">
              <p className="text-sm font-medium whitespace-pre-wrap break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Layout;
