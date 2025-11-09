import React, { useState, useEffect, useMemo } from 'react';
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
import { getSellerIdFromAuth } from '../../utils/api';

const parseExpiryDate = (rawValue) => {
  if (!rawValue) {
    return null;
  }
  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const calculateExpiryCountdown = (expiryDate) => {
  if (!expiryDate) {
    return null;
  }
  const diff = expiryDate.getTime() - Date.now();
  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    expired: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

const formatCountdownValue = (value) => String(value ?? 0).padStart(2, '0');

const Dashboard = () => {
  const { state, dispatch } = useApp();
  const [timeRange, setTimeRange] = useState('7d');

  const subscriptionExpiryRaw =
    state.subscription?.expiresAt ||
    state.currentPlanDetails?.expiresAt ||
    state.currentPlanDetails?.expiryDate ||
    null;

  const subscriptionExpiryDate = useMemo(
    () => parseExpiryDate(subscriptionExpiryRaw),
    [subscriptionExpiryRaw]
  );

  const [expiryCountdown, setExpiryCountdown] = useState(() =>
    calculateExpiryCountdown(subscriptionExpiryDate)
  );

  const daysRemaining = subscriptionExpiryDate
    ? Math.max(
        0,
        Math.ceil(
          (subscriptionExpiryDate.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const planNameLabel =
    state.currentPlanDetails?.planName ||
    state.subscription?.planName ||
    (state.currentPlan
      ? state.currentPlan.charAt(0).toUpperCase() + state.currentPlan.slice(1)
      : null);

  const formattedExpiryDate = subscriptionExpiryDate
    ? subscriptionExpiryDate.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const planExpiryStatusText = formattedExpiryDate
    ? (planNameLabel
        ? `${planNameLabel} ${daysRemaining === 0 ? 'expired on' : 'expires on'} ${formattedExpiryDate}`
        : `Plan ${daysRemaining === 0 ? 'expired on' : 'expires on'} ${formattedExpiryDate}`)
    : (planNameLabel
        ? `${planNameLabel} expiry date not available`
        : 'Plan expiry date not available');

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

  const getDaysRemainingColor = (days) => {
    if (days > 10) return 'text-green-700 bg-green-50 border-green-200';
    if (days > 3) return 'text-orange-700 bg-orange-50 border-orange-200';
    if (days > 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-red-700 bg-red-100 border-red-300';
  };

  const getDaysRemainingMessage = (days) => {
    if (days === 0) return 'Subscription Expired';
    if (days <= 3) return `${days} Day${days === 1 ? '' : 's'} Left - Recharge Now!`;
    if (days <= 10) return `${days} Days Left - Recharge Soon!`;
    return `${days} Days Remaining`;
  };

  useEffect(() => {
    if (!subscriptionExpiryDate) {
      setExpiryCountdown(null);
      return;
    }

    const updateCountdown = () => {
      setExpiryCountdown(calculateExpiryCountdown(subscriptionExpiryDate));
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [subscriptionExpiryDate]);

  // Helper function to get transaction/order date
  const getTransactionDate = (transaction) => {
    return transaction.date || transaction.createdAt || new Date().toISOString();
  };

  // Helper function to get order date
  const getOrderDate = (order) => {
    return order.createdAt || order.date || new Date().toISOString();
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

  // Get sellerId to filter orders for this seller only
  const sellerId = getSellerIdFromAuth();
  
  // Filter orders by sellerId (sales/billing records)
  const sellerOrders = sellerId ? state.orders.filter(order => order.sellerId === sellerId) : state.orders;
  
  // Filter orders by date range
  const filteredOrders = sellerOrders.filter(order => {
    const orderDate = new Date(getOrderDate(order));
    return orderDate >= startDate && orderDate <= endDate;
  });

  // Filter purchase orders by date range and sellerId
  const sellerPurchaseOrders = sellerId ? state.purchaseOrders.filter(po => po.sellerId === sellerId) : state.purchaseOrders;
  const filteredPurchaseOrders = sellerPurchaseOrders.filter(order => {
    const orderDate = new Date(getPurchaseOrderDate(order));
    return orderDate >= startDate && orderDate <= endDate;
  });

  // Calculate comprehensive dashboard stats
  const totalCustomers = state.customers.length;
  const totalProducts = state.products.length;
  const totalOrders = sellerOrders.length;
  const totalPurchaseOrders = sellerPurchaseOrders.length;
  
  // Calculate total balance due (using dueAmount field from database)
  const totalBalanceDue = state.customers.reduce((sum, customer) => {
    return sum + (customer.dueAmount || customer.balanceDue || 0);
  }, 0);

  // Calculate total sales from orders (all time) - use totalAmount from Order model
  const totalSales = sellerOrders.reduce((sum, order) => {
    return sum + (order.totalAmount || 0);
  }, 0);

  // Calculate sales for selected time range from orders
  const rangeSales = filteredOrders.reduce((sum, order) => {
    return sum + (order.totalAmount || 0);
  }, 0);

  // Calculate total purchase value (all time) - filtered by sellerId
  const totalPurchaseValue = sellerPurchaseOrders.reduce((sum, order) => {
    return sum + (order.total || 0);
  }, 0);

  // Calculate purchase value for selected time range
  const rangePurchaseValue = filteredPurchaseOrders.reduce((sum, order) => {
    return sum + (order.total || 0);
  }, 0);

  // Calculate profit from orders: profit = sum((sellingPrice - costPrice) * quantity) for each item
  // Profit = Total Sales Revenue (from orders) - Total Purchase Costs (from purchase orders)
  const calculateProfitFromOrderItems = (orders) => {
    const toNumber = (value) => (typeof value === 'number' ? value : parseFloat(value)) || 0;

    return orders.reduce((totalProfit, order) => {
      if (!order.items || !Array.isArray(order.items)) return totalProfit;

      const orderProfit = order.items.reduce((orderItemProfit, item) => {
        const sellingPrice = toNumber(item.totalSellingPrice ?? item.sellingPrice);
        const costPrice = toNumber(item.totalCostPrice ?? item.costPrice);
        const itemProfit = sellingPrice - costPrice;
        return orderItemProfit + itemProfit;
      }, 0);

      return totalProfit + orderProfit;
    }, 0);
  };

  // Calculate profit for a specific date range
  const calculateProfitForRange = (orders, purchaseOrders, startDate, endDate) => {
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(getOrderDate(order));
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    const filteredPurchaseOrders = purchaseOrders.filter(order => {
      const orderDate = new Date(getPurchaseOrderDate(order));
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    // Use order items profit calculation (more accurate)
    return calculateProfitFromOrderItems(filteredOrders) - filteredPurchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  };

  // Calculate low stock products
  const lowStockProducts = state.products.filter(product => 
    (product.quantity || product.stock || 0) <= state.lowStockThreshold
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

  // Calculate pending payments (using dueAmount field from database)
  const pendingPayments = state.customers.filter(customer => 
    (customer.dueAmount || customer.balanceDue || 0) > 0
  ).length;

  // Calculate total profit (all time) using orders and purchase orders
  const totalProfit = calculateProfitFromOrderItems(sellerOrders) - sellerPurchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;

  // Calculate today's sales and profit
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  
  const todayOrders = sellerOrders.filter(order => {
    const orderDate = new Date(getOrderDate(order));
    return orderDate >= todayStart && orderDate < todayEnd;
  });
  
  const todayPurchaseOrders = sellerPurchaseOrders.filter(order => {
    const orderDate = new Date(getPurchaseOrderDate(order));
    return orderDate >= todayStart && orderDate < todayEnd;
  });
  
  const todaySales = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const todayProfit = calculateProfitFromOrderItems(todayOrders) - todayPurchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  
  // Calculate monthly sales and profit
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  monthEnd.setHours(0, 0, 0, 0);
  
  const monthlyOrders = sellerOrders.filter(order => {
    const orderDate = new Date(getOrderDate(order));
    return orderDate >= monthStart && orderDate < monthEnd;
  });
  
  const monthlyPurchaseOrders = sellerPurchaseOrders.filter(order => {
    const orderDate = new Date(getPurchaseOrderDate(order));
    return orderDate >= monthStart && orderDate < monthEnd;
  });
  
  const monthlySales = monthlyOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const monthlyProfit = calculateProfitFromOrderItems(monthlyOrders) - monthlyPurchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);

  // Calculate range profit for selected time period
  const rangeProfit = calculateProfitForRange(
    sellerOrders, 
    sellerPurchaseOrders, 
    startDate, 
    endDate
  );

  // Recent transactions (orders) from IndexedDB (sorted by date, most recent first)
  // Orders are sales/billing records - use state.orders instead of state.transactions
  // Filter by sellerId
  const recentTransactions = [...(sellerOrders || [])]
    .sort((a, b) => {
      const dateA = new Date(getOrderDate(a));
      const dateB = new Date(getOrderDate(b));
      return dateB - dateA;
    })
    .slice(0, 5);

  // Recent activities from IndexedDB (sorted by date, most recent first)
  // Show activities when there are no transactions
  const recentActivities = [...(state.activities || [])]
    .sort((a, b) => {
      const dateA = new Date(a.timestamp || a.createdAt || 0);
      const dateB = new Date(b.timestamp || b.createdAt || 0);
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
      name: 'Today\'s Sales',
      value: formatNumber(todaySales),
      icon: DollarSign,
      color: 'bg-blue-500',
      description: 'Sales today from orders'
    },
    {
      name: 'Today\'s Profit',
      value: formatNumber(todayProfit),
      icon: TrendingUp,
      color: 'bg-green-500',
      description: 'Profit today (Sales - Purchases)'
    },
    {
      name: 'Monthly Sales',
      value: formatNumber(monthlySales),
      icon: DollarSign,
      color: 'bg-purple-500',
      description: 'Sales this month from orders'
    },
    {
      name: 'Monthly Profit',
      value: formatNumber(monthlyProfit),
      icon: TrendingUp,
      color: 'bg-pink-500',
      description: 'Profit this month (Sales - Purchases)'
    },
    {
      name: timeRange === '1y' ? 'Total Sales' : `Sales (${timeRange})`,
      value: formatNumber(timeRange === '1y' ? totalSales : rangeSales),
      icon: DollarSign,
      color: 'bg-indigo-500',
      description: timeRange === '1y' ? 'All time sales from orders' : `Sales in selected period`
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
      name: 'Total Profit',
      value: formatNumber(totalProfit),
      icon: TrendingUp,
      color: 'bg-emerald-500',
      description: 'All time profit (Sales - Purchases)'
    },
    {
      name: 'Profit Margin',
      value: `${profitMargin.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-teal-500',
      description: 'Net profit ratio'
    },
    {
      name: `Profit (${timeRange})`,
      value: formatNumber(timeRange === '1y' ? totalProfit : rangeProfit),
      icon: TrendingUp,
      color: 'bg-cyan-500',
      description: `Profit in selected period`
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
      {subscriptionExpiryDate && (
        <div className={`rounded-xl border-2 p-4 ${getDaysRemainingColor(daysRemaining)}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start space-x-3">
              <Clock className="h-6 w-6" />
              <div>
                <p className="font-semibold text-lg">
                  {getDaysRemainingMessage(daysRemaining)}
                </p>
                <p className="text-sm opacity-80">
                  {planExpiryStatusText}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:justify-end">
              {expiryCountdown ? (
                expiryCountdown.expired ? (
                  <div className="text-sm font-semibold">
                    Plan expired
                  </div>
                ) : (
                  <div className="flex items-center gap-2 sm:gap-3">
                    {[
                      { label: 'Days', value: expiryCountdown.days },
                      { label: 'Hours', value: expiryCountdown.hours },
                      { label: 'Minutes', value: expiryCountdown.minutes },
                      { label: 'Seconds', value: expiryCountdown.seconds },
                    ].map((segment) => (
                      <div
                        key={segment.label}
                        className="bg-white/80 text-gray-900 rounded-lg px-3 py-2 min-w-[64px] text-center shadow-sm"
                      >
                        <div className="text-xl font-bold leading-none">
                          {formatCountdownValue(segment.value)}
                        </div>
                        <div className="text-xs uppercase tracking-wide text-gray-600">
                          {segment.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-sm font-semibold">
                  No active plan
                </div>
              )}
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
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((order, index) => {
                // Get customer name from customerId
                const customer = order.customerId 
                  ? state.customers.find(c => c.id === order.customerId || c._id === order.customerId || c._id === order.customerId?.toString())
                  : null;
                const customerName = customer?.name || 'Walk-in Customer';
                
                // Format payment method
                const paymentMethod = order.paymentMethod || 'cash';
                const paymentMethodDisplay = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
                
                // Get order date
                const orderDate = new Date(getOrderDate(order));
                
                return (
                  <div key={order.id || order._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <Receipt className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                          {customerName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {paymentMethodDisplay} • {orderDate.toLocaleDateString('en-IN', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {order.items && order.items.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {order.items.length} item{order.items.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ₹{(order.totalAmount || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-green-600">
                        Sale
                      </p>
                    </div>
                  </div>
                );
              })
            ) : recentActivities.length > 0 ? (
              // Show recent activities when there are no transactions
              recentActivities.map((activity, index) => {
                const activityDate = new Date(activity.timestamp || activity.createdAt || Date.now());
                
                // Get icon and color based on activity type
                const getActivityIcon = (type) => {
                  switch (type) {
                    case 'bill_generated':
                      return { icon: Receipt, color: 'bg-green-100 text-green-600' };
                    case 'po_status_changed':
                      return { icon: Truck, color: 'bg-blue-100 text-blue-600' };
                    case 'product_added':
                      return { icon: Package, color: 'bg-purple-100 text-purple-600' };
                    case 'customer_added':
                      return { icon: Users, color: 'bg-indigo-100 text-indigo-600' };
                    default:
                      return { icon: Activity, color: 'bg-gray-100 text-gray-600' };
                  }
                };
                
                const { icon: ActivityIcon, color } = getActivityIcon(activity.type);
                
                return (
                  <div key={activity.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <div className={`p-2 ${color} rounded-lg mr-3`}>
                        <ActivityIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {activity.message || 'Activity'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activityDate.toLocaleDateString('en-IN', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {activity.type || 'activity'}
                    </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No recent transactions</p>
                <p className="text-xs text-gray-400 mt-2">Transactions will appear here after you make sales</p>
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
                if (!isModuleUnlocked('purchase', state.currentPlan, state.currentPlanDetails)) {
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
                  {todayOrders.length || 0}
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
                  {formatNumber(state.products.reduce((sum, p) => {
                    const quantity = p.quantity || p.stock || 0;
                    const costPrice = p.costPrice || p.unitPrice || 0;
                    return sum + (quantity * costPrice);
                  }, 0))}
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
                  ₹{totalSales > 0 && totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0.00'}
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