import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BarChart3, TrendingUp, Package, Users } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Reports = () => {
  const { state, dispatch } = useApp();
  const [reportType, setReportType] = useState('sales');

  // Generate real sales chart data from transactions
  const generateSalesChart = () => {
    if (state.transactions.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Sales',
            data: [0],
            backgroundColor: 'rgba(156, 163, 175, 0.8)',
            borderColor: 'rgba(156, 163, 175, 1)',
            borderWidth: 1,
          },
        ],
      };
    }

    // Get last 6 months of transactions
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const monthlySales = {};
    for (let i = 0; i < 6; i++) {
      const month = new Date(sixMonthsAgo);
      month.setMonth(month.getMonth() + i);
      const monthKey = month.toLocaleDateString('en-US', { month: 'short' });
      monthlySales[monthKey] = 0;
    }

    state.transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      if (transactionDate >= sixMonthsAgo) {
        const monthKey = transactionDate.toLocaleDateString('en-US', { month: 'short' });
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + (transaction.total || 0);
      }
    });

    const labels = Object.keys(monthlySales);
    const salesData = Object.values(monthlySales);

    return {
      labels,
      datasets: [
        {
          label: 'Sales (₹)',
          data: salesData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const generateInventoryChart = () => {
    if (state.products.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Stock Quantity',
            data: [0],
            backgroundColor: 'rgba(156, 163, 175, 0.8)',
            borderColor: 'rgba(156, 163, 175, 1)',
            borderWidth: 1,
          },
        ],
      };
    }

    // Get real product data (top 10 by stock)
    const sortedProducts = [...state.products]
      .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
      .slice(0, 10);

    const labels = sortedProducts.map(p => p.name);
    const stockData = sortedProducts.map(p => p.quantity || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Stock Quantity',
          data: stockData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const generateCustomerChart = () => {
    if (state.customers.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Customers',
            data: [0],
            backgroundColor: ['rgba(156, 163, 175, 0.8)'],
            borderColor: ['rgba(156, 163, 175, 1)'],
            borderWidth: 1,
          },
        ],
      };
    }

    // Categorize customers by balance
    const newCustomers = state.customers.filter(c => {
      const balance = c.balanceDue || 0;
      return balance === 0;
    }).length;

    const withDue = state.customers.filter(c => {
      const balance = c.balanceDue || 0;
      return balance > 0;
    }).length;

    const withCredit = state.customers.filter(c => {
      const balance = c.balanceDue || 0;
      return balance < 0;
    }).length;

    const labels = ['No Due', 'Has Due', 'Has Credit'];
    const customerData = [newCustomers, withDue, withCredit];

    return {
      labels,
      datasets: [
        {
          label: 'Customers',
          data: customerData,
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(59, 130, 246, 0.8)',
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(249, 115, 22, 1)',
            'rgba(59, 130, 246, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: reportType === 'sales' ? 'Sales & Profit Report' : 
              reportType === 'inventory' ? 'Inventory Report' : 'Customer Report',
      },
    },
  };

  const getChartData = () => {
    switch (reportType) {
      case 'sales':
        return generateSalesChart();
      case 'inventory':
        return generateInventoryChart();
      case 'customers':
        return generateCustomerChart();
      default:
        return generateSalesChart();
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">View detailed reports and analytics</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="input-field"
          >
            <option value="sales">Sales Report</option>
            <option value="inventory">Inventory Report</option>
            <option value="customers">Customer Report</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{state.transactions.reduce((sum, t) => sum + (t.total || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profit</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{Math.max(0, state.transactions.reduce((sum, t) => sum + (t.total || 0), 0) - state.products.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.quantitySold || 0)), 0)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Products</p>
              <p className="text-2xl font-bold text-gray-900">{state.products.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900">{state.customers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="h-96">
          <Bar data={getChartData()} options={chartOptions} />
        </div>
      </div>

      {/* Report Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {state.products.slice(0, 5).map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-orange-600">{index + 1}</span>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{product.name}</span>
                </div>
                <span className="text-sm text-gray-600">{product.stock || 0} units</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {state.transactions.slice(0, 5).map((transaction, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{transaction.customerName}</p>
                  <p className="text-xs text-gray-600">{transaction.date}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">₹{(transaction.amount || transaction.total || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
