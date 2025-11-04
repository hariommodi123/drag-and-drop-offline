import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  Package, 
  Receipt, 
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  ShoppingCart,
  Truck,
  BarChart3,
  Calendar,
  CreditCard,
  Activity,
  Zap,
  Target,
  Award
} from 'lucide-react';
import { isModuleUnlocked, getUpgradeMessage } from '../../utils/planUtils';

const Dashboard = () => {
  const { state, dispatch } = useApp();
  const [timeRange, setTimeRange] = useState('7d');

  // Format large numbers to be more compact
  const formatNumber = (num) => {
    if (num >= 100000000) { // 10 crore
      return `₹${(num / 100000000).toFixed(2)}Cr`;
    } else if (num >= 10000000) { // 1 crore
      return `₹${(num / 10000000).toFixed(2)}Cr`;
    } else if (num >= 100000) { // 1 lakh
      return `₹${(num / 100000).toFixed(2)}L`;
    } else if (num >= 1000) { // 1 thousand
      return `₹${(num / 1000).toFixed(2)}K`;
    } else {
      return `₹${num.toFixed(2)}`;
    }
  };

  // Calculate days remaining in subscription
  const calculateDaysRemaining = () => {
    if (!state.subscription || !state.subscription.expiresAt) {
      return 0;
    }
    const expiresAt = new Date(state.subscription.expiresAt);
    const now = new Date();
    const diffTime = expiresAt - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = calculateDaysRemaining();

  const getDaysRemainingColor = (days) => {
    if (days >= 30) return 'text-green-600 bg-green-50 border-green-200';
    if (days >= 20) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (days >= 10) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-red-700 bg-red-100 border-red-300';
  };

  const getDaysRemainingMessage = (days) => {
    if (days === 0) return 'Subscription Expired';
    if (days <= 3) return 'Recharge Now!';
    if (days <= 10) return `${days} Days Left - Recharge Soon!`;
    if (days <= 20) return `${days} Days Remaining`;
    return `${days} Days Remaining`;
  };

  // Helper function to get transaction date
  const getTransactionDate = (transaction) => {
    return transaction.date || transaction.createdAt || new Date().toISOString();
  };

  // Helper function to get purchase order date
  const getPurchaseOrderDate = (order) => {
    return order.date || order.createdAt || new Date().toISOString();
  };

  // Calculate date range based on timeRange selector
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date(today);
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(today.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }
    
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Filter transactions by date range
  const filteredTransactions = state.transactions.filter(transaction => {
    const transactionDate = new Date(getTransactionDate(transaction));
    return transactionDate >= startDate && transactionDate <= endDate;
  });

  // Filter purchase orders by date range
  const filteredPurchaseOrders = state.purchaseOrders.filter(order => {
    const orderDate = new Date(getPurchaseOrderDate(order));
    return orderDate >= startDate && orderDate <= endDate;
  });

  // Calculate comprehensive dashboard stats
  const totalCustomers = state.customers.length;
  const totalProducts = state.products.length;
  const totalTransactions = state.transactions.length;
  const totalPurchaseOrders = state.purchaseOrders.length;
  
  // Calculate total balance due
  const totalBalanceDue = state.customers.reduce((sum, customer) => {
    return sum + (customer.balanceDue || 0);
  }, 0);

  // Calculate total sales (all time)
  const totalSales = state.transactions.reduce((sum, transaction) => {
    return sum + (transaction.total || 0);
  }, 0);

  // Calculate sales for selected time range
  const rangeSales = filteredTransactions.reduce((sum, transaction) => {
    return sum + (transaction.total || 0);
  }, 0);

  // Calculate total purchase value (all time)
  const totalPurchaseValue = state.purchaseOrders.reduce((sum, order) => {
    return sum + (order.total || 0);
  }, 0);

  // Calculate purchase value for selected time range
  const rangePurchaseValue = filteredPurchaseOrders.reduce((sum, order) => {
    return sum + (order.total || 0);
  }, 0);

  // Calculate actual profit from transaction items (selling price - cost price)
  const calculateActualProfit = (transactions) => {
    return transactions.reduce((profit, transaction) => {
      if (!transaction.items || !Array.isArray(transaction.items)) {
        // Fallback: estimate 20% profit margin if items not available
        return profit + ((transaction.total || 0) * 0.2);
      }
      
      return transaction.items.reduce((itemProfit, item) => {
        const product = state.products.find(p => p.id === item.id || p.id === item.productId);
        if (!product) return itemProfit;
        
        const costPrice = product.purchasePrice || product.costPrice || 0;
        const sellingPrice = item.price || 0;
        const quantity = item.quantity || 0;
        const profitPerItem = (sellingPrice - costPrice) * quantity;
        
        return itemProfit + profitPerItem;
      }, profit);
    }, 0);
  };

  // Calculate low stock products
  const lowStockProducts = state.products.filter(product => 
    (product.stock || 0) <= state.lowStockThreshold
  );

  // Calculate expiring products
  const expiringProducts = state.products.filter(product => {
    if (!product.expiryDate) return false;
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= state.expiryDaysThreshold && diffDays >= 0;
  });

  // Calculate pending payments
  const pendingPayments = state.customers.filter(customer => 
    (customer.balanceDue || 0) > 0
  ).length;

  // Calculate profit margin (using actual profit calculation)
  const actualProfit = calculateActualProfit(state.transactions);
  const profitMargin = totalSales > 0 ? ((actualProfit / totalSales) * 100) : 0;

  // Calculate daily profit
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const todayTransactions = state.transactions.filter(transaction => {
    const transactionDate = new Date(getTransactionDate(transaction));
    return transactionDate >= todayStart && transactionDate < todayEnd;
  });
  
  const todaySales = todayTransactions.reduce((sum, transaction) => sum + (transaction.total || 0), 0);
  const todayProfit = calculateActualProfit(todayTransactions);
  
  // Calculate monthly profit
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  const monthlyTransactions = state.transactions.filter(transaction => {
    const transactionDate = new Date(getTransactionDate(transaction));
    return transactionDate >= monthStart && transactionDate < monthEnd;
  });
  
  const monthlySales = monthlyTransactions.reduce((sum, transaction) => sum + (transaction.total || 0), 0);
  const monthlyProfit = calculateActualProfit(monthlyTransactions);

  // Calculate range profit for selected time period
  const rangeProfit = calculateActualProfit(filteredTransactions);

  // Recent transactions (sorted by date, most recent first)
  const recentTransactions = [...state.transactions]
    .sort((a, b) => {
      const dateA = new Date(getTransactionDate(a));
      const dateB = new Date(getTransactionDate(b));
      return dateB - dateA;
    })
    .slice(0, 5);

  // Comprehensive stats array with met black/white theme and colorful icons
  const stats = [
    {
      name: 'Total Customers',
      value: totalCustomers,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Active customers'
    },
    {
      name: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'bg-green-500',
      description: 'Items in inventory'
    },
    {
      name: timeRange === '1y' ? 'Total Sales' : `Sales (${timeRange})`,
      value: formatNumber(timeRange === '1y' ? totalSales : rangeSales),
      icon: DollarSign,
      color: 'bg-purple-500',
      description: timeRange === '1y' ? 'All time sales' : `Sales in selected period`
    },
    {
      name: 'Balance Due',
      value: formatNumber(totalBalanceDue),
      icon: CreditCard,
      color: 'bg-orange-500',
      description: 'Outstanding payments'
    },
    {
      name: 'Purchase Orders',
      value: totalPurchaseOrders,
      icon: Truck,
      color: 'bg-indigo-500',
      description: 'Orders placed'
    },
    {
      name: 'Profit Margin',
      value: `${profitMargin.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      description: 'Net profit ratio'
    },
    {
      name: 'Daily Profit',
      value: `₹${todayProfit.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-teal-500',
      description: 'Today\'s profit'
    },
    {
      name: 'Monthly Profit',
      value: `₹${monthlyProfit.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-pink-500',
      description: 'This month\'s profit'
    },
    {
      name: 'Range Profit',
      value: `₹${rangeProfit.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-cyan-500',
      description: `Profit (${timeRange})`
    }
  ];

  return (
    <div className="space-y-8 fade-in-up">
      {/* Welcome Section with Floating Boxes - Hidden on Mobile */}
      <div className="hidden lg:block relative overflow-hidden bg-[#1b1b1b] rounded-xl shadow-xl p-8 text-white">
        {/* Floating Mini Boxes */}
        <div className="absolute top-10 left-20 w-4 h-4 bg-white opacity-20 rounded floating-animation-1"></div>
        <div className="absolute top-20 right-30 w-6 h-6 bg-white opacity-15 rounded floating-animation-2"></div>
        <div className="absolute bottom-10 left-10 w-5 h-5 bg-white opacity-25 rounded floating-animation-3"></div>
        <div className="absolute bottom-20 right-20 w-3 h-3 bg-white opacity-30 rounded floating-animation-4"></div>
        <div className="absolute top-1/2 right-10 w-4 h-4 bg-white opacity-20 rounded floating-animation-5"></div>
        <div className="absolute top-1/3 left-1/3 w-7 h-7 bg-white opacity-10 rounded floating-animation-6"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-300 text-lg">Welcome back, {state.currentUser?.username || 'User'}! 👋</p>
            <div className="mt-3 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">System Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">All Systems Operational</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-300 text-sm mb-1">Current Time</div>
            <div className="text-xl font-semibold">
              {new Date().toLocaleDateString()}
            </div>
            <div className="text-lg font-medium">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Status Alert */}
      {daysRemaining > 0 && (
        <div className={`rounded-xl border-2 p-4 ${getDaysRemainingColor(daysRemaining)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6" />
              <div>
                <p className="font-semibold text-lg">{getDaysRemainingMessage(daysRemaining)}</p>
                <p className="text-sm opacity-80">Your subscription will expire soon. Please recharge to continue using all features.</p>
              </div>
            </div>
            {daysRemaining <= 3 && (
              <button
                onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'upgrade' })}
                className="px-4 py-2 bg-[#1b1b1b] text-white rounded-lg hover:bg-[#252525] transition-colors"
              >
                Recharge Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Business Overview</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="input-field w-40"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Stats Grid with Animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.name} 
              className="stat-card animate-float-up hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}
            >
              <div className="flex items-center w-full h-full">
                <div className={`p-4 rounded-xl ${stat.color} mr-4 flex-shrink-0 shadow-lg`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-base font-medium text-gray-600 mb-2">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900" title={stat.value}>{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            Important Alerts
          </h3>
          <div className="space-y-4">
            {lowStockProducts.length > 0 && (
              <div className="flex items-center p-4 bg-yellow-50 rounded-xl border-l-4 border-yellow-400">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mr-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800">
                    {lowStockProducts.length} products low in stock
                  </p>
                  <p className="text-sm text-yellow-600">
                    {lowStockProducts.slice(0, 3).map(product => product.name).join(', ')}
                    {lowStockProducts.length > 3 && ` and ${lowStockProducts.length - 3} more`}
                  </p>
                </div>
              </div>
            )}
            
            {expiringProducts.length > 0 && (
              <div className="flex items-center p-4 bg-red-50 rounded-xl border-l-4 border-red-400">
                <Clock className="h-6 w-6 text-red-600 mr-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">
                    {expiringProducts.length} products expiring soon
                  </p>
                  <p className="text-sm text-red-600">
                    {expiringProducts.slice(0, 3).map(product => product.name).join(', ')}
                    {expiringProducts.length > 3 && ` and ${expiringProducts.length - 3} more`}
                  </p>
                </div>
              </div>
            )}

            {pendingPayments > 0 && (
              <div className="flex items-center p-4 bg-blue-50 rounded-xl border-l-4 border-blue-400">
                <CreditCard className="h-6 w-6 text-blue-600 mr-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800">
                    {pendingPayments} customers have pending payments
                  </p>
                  <p className="text-sm text-blue-600">
                    Total outstanding: {formatNumber(totalBalanceDue)}
                  </p>
                </div>
              </div>
            )}
            
            {lowStockProducts.length === 0 && expiringProducts.length === 0 && pendingPayments === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-green-600 font-semibold">All good! No alerts at this time</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Receipt className="h-5 w-5 mr-2 text-green-600" />
            Recent Transactions
          </h3>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <Receipt className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.customerName || 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.paymentMethod || 'cash'} • {new Date(getTransactionDate(transaction)).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₹{transaction.total?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-green-600">Completed</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No recent transactions</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* New ERP Features Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-black" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'billing' })}
              className="p-4 bg-[#1b1b1b] text-white rounded-xl hover:bg-[#252525] transition-colors text-center"
            >
              <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
              <p className="font-semibold">New Bill</p>
            </button>
            <button 
              onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'products' })}
              className="p-4 bg-[#1b1b1b] text-white rounded-xl hover:bg-[#252525] transition-colors text-center"
            >
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p className="font-semibold">Add Product</p>
            </button>
            <button 
              onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'customers' })}
              className="p-4 bg-[#1b1b1b] text-white rounded-xl hover:bg-[#252525] transition-colors text-center"
            >
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p className="font-semibold">Add Customer</p>
            </button>
            <button 
              onClick={() => {
                if (!isModuleUnlocked('purchase', state.currentPlan)) {
                  if (window.showToast) window.showToast(getUpgradeMessage('purchase', state.currentPlan), 'warning');
                } else {
                  dispatch({ type: 'SET_CURRENT_VIEW', payload: 'purchase' });
                }
              }}
              className="p-4 bg-[#1b1b1b] text-white rounded-xl hover:bg-[#252525] transition-colors text-center"
            >
              <Truck className="h-8 w-8 mx-auto mb-2" />
              <p className="font-semibold">Purchase Order</p>
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-black" />
            Performance Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center">
                <Target className="h-5 w-5 text-black mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Sales Efficiency</p>
                  <p className="text-xs text-gray-600">Transactions per day</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-black">
                  {Math.round(monthlyTransactions.length / 30) || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-black mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Inventory Value</p>
                  <p className="text-xs text-gray-600">Total stock value</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-black">
                  {formatNumber(state.products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0))}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-black mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Avg Transaction</p>
                  <p className="text-xs text-gray-600">Per transaction</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-black">
                  ₹{totalTransactions > 0 ? (totalSales / totalTransactions).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;