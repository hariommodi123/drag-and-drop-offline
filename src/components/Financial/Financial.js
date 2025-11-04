import React, { useState } from 'react';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Financial = () => {
  const { state } = useApp();
  const [timeRange, setTimeRange] = useState('30d');

  // ✅ Helper functions must come before use
  const calculateMonthlyRevenue = () => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyData = [];

    for (let i = 0; i < 6; i++) {
      const month = new Date(sixMonthsAgo);
      month.setMonth(month.getMonth() + i);
      const monthTransactions = state.transactions.filter(t => {
        const tDate = new Date(t.date);
        return (
          tDate.getMonth() === month.getMonth() &&
          tDate.getFullYear() === month.getFullYear()
        );
      });
      const monthRevenue = monthTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
      monthlyData.push(monthRevenue);
    }
    return monthlyData;
  };

  const calculateMonthlyExpenses = (revenues) => {
    // 30% of revenue assumed as expenses
    return revenues.map(r => r * 0.3);
  };

  const calculatePaymentMethods = () => {
    const cash = state.transactions.filter(t => t.paymentMethod === 'cash').length;
    const card = state.transactions.filter(t => t.paymentMethod === 'card').length;
    const upi = state.transactions.filter(t => t.paymentMethod === 'upi').length;
    const credit = state.transactions.filter(t => t.paymentMethod === 'due' || t.paymentMethod === 'credit').length;
    return [cash, card, upi, credit];
  };

  // ✅ Financial metrics
  const totalRevenue = state.transactions.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalExpenses = state.purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const totalReceivables = state.customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
  const customersWithDebt = state.customers.filter(c => (c.balanceDue || 0) > 0).length;

  const recentTransactions = state.transactions.slice(0, 10);
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

  const paymentMethodData = {
    labels: ['Cash', 'Card', 'UPI', 'Credit'],
    datasets: [
      {
        data: calculatePaymentMethods(),
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
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
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

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Financial Management</h2>
          <p className="text-gray-600 mt-2">Track revenue, expenses, and performance</p>
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
            <PieChart className="h-5 w-5 mr-2 text-purple-600" /> Payment Methods
          </h3>
          <div className="h-64">
            <Pie data={paymentMethodData} options={pieChartOptions} />
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
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-2">
                <div>
                  <p className="font-medium">{t.customerName || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{t.type} • {new Date(t.date).toLocaleDateString()}</p>
                </div>
                <p className="font-semibold">₹{t.total?.toFixed(2) || '0.00'}</p>
              </div>
            ))
          ) : <p className="text-gray-500 text-center py-6">No recent transactions</p>}
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
