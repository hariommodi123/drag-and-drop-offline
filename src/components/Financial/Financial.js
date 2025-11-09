import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Receipt,
  BarChart3,
  PieChart,
  Download,
  Calculator,
  Wallet,
  Banknote,
  Target,
  AlertCircle
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { getAllItems, STORES } from '../../utils/indexedDB';
import { fetchOrders, fetchTransactions, fetchVendorOrders, fetchCustomers, isOnline, syncToIndexedDB } from '../../utils/dataFetcher';
import { apiRequest } from '../../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Financial = () => {
  const { state, dispatch } = useApp();
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('IndexedDB'); // Track current data source

  // Load data: IndexedDB first, then MongoDB
  useEffect(() => {
    const loadFinancialData = async () => {
      try {
        setIsLoading(true);
        
        // Step 1: Load from IndexedDB FIRST (immediate display)
        const [indexedDBOrders, indexedDBTransactions, indexedDBPurchaseOrders, indexedDBCustomers] = await Promise.all([
          getAllItems(STORES.orders).catch(() => []),
          getAllItems(STORES.transactions).catch(() => []),
          getAllItems(STORES.purchaseOrders).catch(() => []),
          getAllItems(STORES.customers).catch(() => [])
        ]);

        // Normalize IndexedDB data
        const normalizedCustomers = (indexedDBCustomers || []).map(customer => ({
          ...customer,
          dueAmount: customer.dueAmount !== undefined ? customer.dueAmount : (customer.balanceDue !== undefined ? customer.balanceDue : 0),
          balanceDue: customer.dueAmount !== undefined ? customer.dueAmount : (customer.balanceDue !== undefined ? customer.balanceDue : 0),
          mobileNumber: customer.mobileNumber || customer.phone || ''
        }));

        // Update state with IndexedDB data immediately
        dispatch({ type: 'SET_ORDERS', payload: indexedDBOrders || [] });
        dispatch({ type: 'SET_TRANSACTIONS', payload: indexedDBTransactions || [] });
        dispatch({ type: 'SET_PURCHASE_ORDERS', payload: indexedDBPurchaseOrders || [] });
        dispatch({ type: 'SET_CUSTOMERS', payload: normalizedCustomers });
        setDataSource('IndexedDB');
        setIsLoading(false);

        // Step 2: Fetch from MongoDB if online (compare and update if different)
        const online = await isOnline();
        if (online) {
          try {
            const result = await apiRequest('/data/all', { method: 'GET' });
            
            if (result.success && result.data?.data) {
              const { orders, transactions, purchaseOrders, customers } = result.data.data;

              // Normalize backend data
              const normalizedBackendCustomers = (customers || []).map(customer => ({
                ...customer,
                dueAmount: customer.dueAmount || 0,
                balanceDue: customer.dueAmount || 0,
                mobileNumber: customer.mobileNumber || customer.phone || ''
              }));

              // Compare with IndexedDB data to see if different
              // Use a simple comparison: check if lengths are different or if IDs don't match
              const ordersChanged = (indexedDBOrders?.length || 0) !== (orders?.length || 0) ||
                (orders?.length > 0 && indexedDBOrders?.length > 0 && 
                 orders[0]?._id !== indexedDBOrders[0]?._id && orders[0]?.id !== indexedDBOrders[0]?.id);
              
              const transactionsChanged = (indexedDBTransactions?.length || 0) !== (transactions?.length || 0) ||
                (transactions?.length > 0 && indexedDBTransactions?.length > 0 && 
                 transactions[0]?._id !== indexedDBTransactions[0]?._id && transactions[0]?.id !== indexedDBTransactions[0]?.id);
              
              const purchaseOrdersChanged = (indexedDBPurchaseOrders?.length || 0) !== (purchaseOrders?.length || 0) ||
                (purchaseOrders?.length > 0 && indexedDBPurchaseOrders?.length > 0 && 
                 purchaseOrders[0]?._id !== indexedDBPurchaseOrders[0]?._id && purchaseOrders[0]?.id !== indexedDBPurchaseOrders[0]?.id);
              
              const customersChanged = (normalizedCustomers?.length || 0) !== (normalizedBackendCustomers?.length || 0) ||
                (normalizedBackendCustomers?.length > 0 && normalizedCustomers?.length > 0 && 
                 normalizedBackendCustomers[0]?._id !== normalizedCustomers[0]?._id && normalizedBackendCustomers[0]?.id !== normalizedCustomers[0]?.id);

              // Update state if MongoDB data is different or if we want to always refresh from MongoDB
              // For now, always update if MongoDB has data (more reliable source)
              if (orders || transactions || purchaseOrders || customers) {
                if (ordersChanged || transactionsChanged || purchaseOrdersChanged || customersChanged || 
                    (orders?.length > 0 || transactions?.length > 0 || purchaseOrders?.length > 0)) {
                  dispatch({ type: 'SET_ORDERS', payload: orders || [] });
                  dispatch({ type: 'SET_TRANSACTIONS', payload: transactions || [] });
                  dispatch({ type: 'SET_PURCHASE_ORDERS', payload: purchaseOrders || [] });
                  dispatch({ type: 'SET_CUSTOMERS', payload: normalizedBackendCustomers });
                  setDataSource('MongoDB');
                  
                  // Update IndexedDB with MongoDB data
                  await Promise.all([
                    syncToIndexedDB(STORES.orders, orders || []),
                    syncToIndexedDB(STORES.transactions, transactions || []),
                    syncToIndexedDB(STORES.purchaseOrders, purchaseOrders || []),
                    syncToIndexedDB(STORES.customers, normalizedBackendCustomers)
                  ]);
                }
              }
            }
          } catch (backendError) {
            console.error('Error fetching financial data from MongoDB:', backendError);
            // Keep IndexedDB data that was already shown
          }
        }
      } catch (error) {
        console.error('Error loading financial data:', error);
        setIsLoading(false);
      }
    };

    loadFinancialData();
  }, [dispatch]);

  // ✅ Helper functions must come before use
  const calculateMonthlyRevenue = () => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyData = [];

    for (let i = 0; i < 6; i++) {
      const month = new Date(sixMonthsAgo);
      month.setMonth(month.getMonth() + i);
      // Use orders (sales) for revenue, not transactions
      const monthOrders = state.orders.filter(o => {
        const oDate = new Date(o.createdAt || o.date);
        return (
          oDate.getMonth() === month.getMonth() &&
          oDate.getFullYear() === month.getFullYear()
        );
      });
      const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      monthlyData.push(monthRevenue);
    }
    return monthlyData;
  };

  const calculateMonthlyExpenses = (revenues) => {
    // 30% of revenue assumed as expenses
    return revenues.map(r => r * 0.3);
  };

  const calculatePaymentMethods = () => {
    // Use orders (sales) for payment methods, not transactions (plan purchases)
    const cash = state.orders.filter(o => o.paymentMethod === 'cash').length;
    const card = state.orders.filter(o => o.paymentMethod === 'card').length;
    const upi = state.orders.filter(o => o.paymentMethod === 'upi').length;
    const credit = state.orders.filter(o => o.paymentMethod === 'due' || o.paymentMethod === 'credit').length;
    return [cash, card, upi, credit];
  };

  const calculatePaymentMethodAmounts = () => {
    // Calculate amounts by payment method from orders
    const cash = state.orders
      .filter(o => o.paymentMethod === 'cash')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const card = state.orders
      .filter(o => o.paymentMethod === 'card')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const upi = state.orders
      .filter(o => o.paymentMethod === 'upi')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const credit = state.orders
      .filter(o => o.paymentMethod === 'due' || o.paymentMethod === 'credit')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return [cash, card, upi, credit];
  };

  // ✅ Financial metrics
  // Use orders (sales) for revenue, not transactions (plan purchases)
  const totalRevenue = state.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalExpenses = state.purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const totalReceivables = state.customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
  const customersWithDebt = state.customers.filter(c => (c.balanceDue || 0) > 0).length;

  // Show recent sales orders instead of transactions (transactions are only for plan purchases)
  const recentTransactions = state.orders
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 10)
    .map(order => {
      // Find customer name from customerId
      const customer = order.customerId 
        ? state.customers.find(c => c.id === order.customerId || c._id === order.customerId)
        : null;
      return {
        id: order.id || order._id,
        customerName: customer?.name || 'Walk-in Customer',
        total: order.totalAmount || 0,
        paymentMethod: order.paymentMethod || 'cash',
        date: order.createdAt || order.date || new Date(),
        type: 'Sale'
      };
    });
  
  const recentPayments = state.customers
    .filter(c => c.paymentHistory && c.paymentHistory.length > 0)
    .flatMap(c => c.paymentHistory.map(p => ({ ...p, customerName: c.name })))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  // ✅ Chart Data
  const monthlyRevenue = calculateMonthlyRevenue();
  const monthlyExpenses = calculateMonthlyExpenses(monthlyRevenue);

  const revenueChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: monthlyRevenue,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
      {
        label: 'Expenses',
        data: monthlyExpenses,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const paymentMethodCounts = calculatePaymentMethods();
  const paymentMethodAmounts = calculatePaymentMethodAmounts();
  
  // Use amounts for better financial visualization
  const paymentMethodData = {
    labels: ['Cash', 'Card', 'UPI', 'Credit/Due'],
    datasets: [
      {
        label: 'Amount (₹)',
        data: paymentMethodAmounts,
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(249, 115, 22, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(249, 115, 22, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { usePointStyle: true, padding: 20 },
      },
    },
    scales: {
      y: { beginAtZero: true },
      x: { grid: { display: false } },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom', 
        labels: { 
          usePointStyle: true, 
          padding: 20,
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0];
                const value = dataset.data[i];
                const count = paymentMethodCounts[i];
                return {
                  text: `${label}: ₹${value.toLocaleString('en-IN')} (${count} orders)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor[i],
                  lineWidth: dataset.borderWidth,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        } 
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const count = paymentMethodCounts[context.dataIndex];
            const total = paymentMethodAmounts.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ₹${value.toLocaleString('en-IN')} (${count} orders, ${percentage}%)`;
          }
        }
      }
    },
  };

  const exportFinancialReport = () => {
    const reportData = {
      summary: { totalRevenue, totalExpenses, netProfit, profitMargin, totalReceivables, customersWithDebt },
      transactions: recentTransactions,
      payments: recentPayments,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Show loading state while initial data loads
  if (isLoading && state.orders.length === 0 && state.transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Financial Management</h2>
          <p className="text-gray-600 mt-2">Track revenue, expenses, and performance</p>
          <p className="text-xs text-gray-500 mt-1">
            Data source: {dataSource} {state.systemStatus === 'online' ? '🌐' : '📴'}
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="input-field w-40">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button onClick={exportFinancialReport} className="btn-secondary flex items-center">
            <Download className="h-4 w-4 mr-2" /> Export Report
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Revenue', value: totalRevenue, color: 'green', icon: <TrendingUp /> },
          { title: 'Total Expenses', value: totalExpenses, color: 'red', icon: <TrendingDown /> },
          { title: 'Net Profit', value: netProfit, color: 'blue', icon: <Calculator /> },
          { title: 'Receivables', value: totalReceivables, color: 'orange', icon: <CreditCard /> },
        ].map((card, i) => (
          <div key={i} className="stat-card flex items-center">
            <div className={`p-3 bg-${card.color}-100 rounded-xl text-${card.color}-600`}>{card.icon}</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">₹{card.value.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" /> Revenue vs Expenses
          </h3>
          <div className="h-64">
            <Bar data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-purple-600" /> Payment Methods (Revenue)
          </h3>
          <div className="h-64">
            <Pie data={paymentMethodData} options={pieChartOptions} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {paymentMethodData.labels.map((label, index) => {
              const amount = paymentMethodAmounts[index];
              const count = paymentMethodCounts[index];
              const total = paymentMethodAmounts.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium text-gray-700">{label}:</span>
                  <span className="text-gray-900">
                    ₹{amount.toLocaleString('en-IN')} ({count}, {percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transactions & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transactions */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Receipt className="h-5 w-5 mr-2 text-green-600" /> Recent Transactions
          </h3>
          {recentTransactions.length ? (
            recentTransactions.map((t, i) => (
              <div key={t.id || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-2">
                <div>
                  <p className="font-medium">{t.customerName || 'Walk-in Customer'}</p>
                  <p className="text-xs text-gray-500">
                    {t.paymentMethod?.toUpperCase() || 'Cash'} • {new Date(t.date).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-semibold">₹{t.total?.toFixed(2) || '0.00'}</p>
              </div>
            ))
          ) : <p className="text-gray-500 text-center py-6">No recent sales</p>}
        </div>

        {/* Payments */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Wallet className="h-5 w-5 mr-2 text-blue-600" /> Recent Payments
          </h3>
          {recentPayments.length ? (
            recentPayments.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-2">
                <div>
                  <p className="font-medium">{p.customerName || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">Payment • {new Date(p.date).toLocaleDateString()}</p>
                </div>
                <p className="font-semibold">₹{p.amount?.toFixed(2) || '0.00'}</p>
              </div>
            ))
          ) : <p className="text-gray-500 text-center py-6">No recent payments</p>}
        </div>
      </div>

      {/* Alerts */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" /> Financial Alerts
        </h3>

        {totalReceivables > 0 && (
          <div className="p-4 bg-yellow-50 rounded-xl border-l-4 border-yellow-400 mb-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 inline mr-2" />
            <span className="font-semibold">Outstanding Receivables:</span> ₹{totalReceivables.toFixed(2)}
          </div>
        )}

        {profitMargin < 10 && (
          <div className="p-4 bg-red-50 rounded-xl border-l-4 border-red-400 mb-3">
            <TrendingDown className="h-6 w-6 text-red-600 inline mr-2" />
            Low Profit Margin ({profitMargin.toFixed(1)}%)
          </div>
        )}

        {netProfit < 0 && (
          <div className="p-4 bg-red-50 rounded-xl border-l-4 border-red-400 mb-3">
            <AlertCircle className="h-6 w-6 text-red-600 inline mr-2" />
            Negative Profit: ₹{Math.abs(netProfit).toFixed(2)}
          </div>
        )}

        {totalReceivables === 0 && profitMargin >= 10 && netProfit >= 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-green-600 font-semibold">Great! Your finances are healthy 🎯</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Financial;
