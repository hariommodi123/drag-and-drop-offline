import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, 
  Search, 
  Download, 
  Edit, 
  Trash2, 
  CreditCard,
  ChevronLeft,
  ChevronRight,   
  Users
} from 'lucide-react';
import jsPDF from 'jspdf';
import AddCustomerModal from './AddCustomerModal';
import EditCustomerModal from './EditCustomerModal';
import PaymentModal from './PaymentModal';
import { getPlanLimits, canAddCustomer } from '../../utils/planUtils';

const Customers = () => {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = state.itemsPerPage;

  // Plan limits
  const { maxCustomers } = getPlanLimits(state.currentPlan);
  const totalCustomers = state.customers.length;
  const atCustomerLimit = !canAddCustomer(totalCustomers, state.currentPlan);

  // Filter customers based on search term
  const filteredCustomers = state.customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const handleAddCustomer = (customerData) => {
    // Enforce plan limit before adding
    if (atCustomerLimit) {
      if (window.showToast) {
        window.showToast(
          maxCustomers === Infinity
            ? 'Unlimited plan — no limit.'
            : `Customer limit reached (${totalCustomers}/${maxCustomers}). Upgrade your plan or delete a customer to add a new one.`,
          'warning'
        );
      }
    
      return;
    }
    const newCustomer = {
      id: Date.now().toString(),
      ...customerData,
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
    setShowAddModal(false);
  };

  const handleEditCustomer = (customerData) => {
    dispatch({ type: 'UPDATE_CUSTOMER', payload: customerData });
    setShowEditModal(false);
    setSelectedCustomer(null);
  };

  const handleDeleteCustomer = (customerId) => {
    // Find the customer to check balance due
    const customer = state.customers.find(c => c.id === customerId);
    
    // Prevent deletion if customer has outstanding balance
    if (customer && (customer.balanceDue || 0) !== 0) {
      const balanceDue = Math.abs(customer.balanceDue || 0);
      if (window.showToast) {
        window.showToast(
          `Cannot delete customer. Outstanding balance of ₹${balanceDue.toFixed(2)} must be cleared first.`,
          'error'
        );
      }
      return;
    }

    // Professional confirm using toast-like inline confirm
    const proceed = () => dispatch({ type: 'DELETE_CUSTOMER', payload: customerId });
    if (window?.showToastConfirm) {
      // If a confirm API exists in Layout, use it
      window.showToastConfirm({
        title: 'Delete customer?',
        message: 'This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: proceed
      });
      return;
    }
    // Fallback: styled custom confirm dialog
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-40 z-[1000] flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5">
        <h3 class="text-lg font-semibold text-gray-900 mb-1">Delete customer?</h3>
        <p class="text-sm text-gray-600 mb-4">This action cannot be undone.</p>
        <div class="flex justify-end space-x-2">
          <button id="cc-cancel" class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button id="cc-confirm" class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const cleanup = () => document.body.removeChild(overlay);
    overlay.querySelector('#cc-cancel').onclick = cleanup;
    overlay.querySelector('#cc-confirm').onclick = () => { cleanup(); proceed(); };
  };

  const handlePayment = (customer) => {
    setSelectedCustomer(customer);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (amount) => {
    if (selectedCustomer && amount > 0) {
      const updatedCustomer = {
        ...selectedCustomer,
        balanceDue: (selectedCustomer.balanceDue || 0) - amount
      };
      dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });
      
      // Add transaction record
      const transaction = {
        id: Date.now().toString(),
        type: 'payment',
        date: new Date().toISOString(),
        total: amount,
        customer: selectedCustomer.name,
        items: []
      };
      dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
      
      setShowPaymentModal(false);
      setSelectedCustomer(null);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const exportCustomersPDF = () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFont('helvetica', 'normal');

      // Header
      pdf.setFontSize(18);
      pdf.text('Customer Report', pageWidth / 2, 15, { align: 'center' });

      // Store info line
      pdf.setFontSize(11);
      pdf.text(`${state.username || 'Grocery Store'}  |  Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 22, { align: 'center' });

      // Summary band
      pdf.setDrawColor(230);
      pdf.setFillColor(245, 247, 250);
      pdf.rect(10, 28, pageWidth - 20, 18, 'F');
      pdf.setTextColor(60);
      pdf.setFontSize(10);
      const total = state.customers.length;
      const dueCount = state.customers.filter(c => (c.balanceDue || 0) > 0).length;
      const dueSum = state.customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0).toFixed(2);
      pdf.text(`Total Customers: ${total}`, 14, 40);
      pdf.text(`With Balance Due: ${dueCount}`, 70, 40);
      pdf.text(`Total Outstanding: Rs ${dueSum}`, 130, 40);

      // Table header
      const startY = 52;
      const colX = { idx: 12, name: 25, phone: 90, email: 130, balance: 180 };
      pdf.setFillColor(234, 238, 243);
      pdf.setDrawColor(220);
      pdf.rect(10, startY - 6, pageWidth - 20, 8, 'F');
      pdf.setTextColor(30);
      pdf.setFontSize(10);
      pdf.text('#', colX.idx, startY);
      pdf.text('Name', colX.name, startY);
      pdf.text('Phone', colX.phone, startY);
      pdf.text('Email', colX.email, startY);
      pdf.text('Balance Due (Rs)', colX.balance, startY, { align: 'right' });

      // Rows
      let y = startY + 6;
      pdf.setTextColor(50);
      pdf.setFontSize(9);
      state.customers.forEach((customer, index) => {
        if (y > pageHeight - 20) {
          pdf.addPage();
          // redraw header on new page
          pdf.setFillColor(234, 238, 243);
          pdf.setDrawColor(220);
          pdf.rect(10, 10, pageWidth - 20, 8, 'F');
          pdf.setTextColor(30);
          pdf.setFontSize(10);
          pdf.text('#', colX.idx, 16);
          pdf.text('Name', colX.name, 16);
          pdf.text('Phone', colX.phone, 16);
          pdf.text('Email', colX.email, 16);
          pdf.text('Balance Due (Rs)', colX.balance, 16, { align: 'right' });
          y = 24;
          pdf.setTextColor(50);
          pdf.setFontSize(9);
        }

        const bal = (customer.balanceDue || 0).toFixed(2);
        pdf.text(String(index + 1), colX.idx, y);
        pdf.text((customer.name || '').toString().substring(0, 20), colX.name, y);
        pdf.text((customer.phone || '').toString().substring(0, 12), colX.phone, y);
        pdf.text((customer.email || '').toString().substring(0, 18), colX.email, y);
        pdf.text(`Rs ${bal}`, colX.balance, y, { align: 'right' });
        y += 6;
      });

      // Footer page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`Page ${i} of ${pageCount}`, 12, pageHeight - 8);
        pdf.text(`${state.username || 'Grocery Store'} • Customer Report`, pageWidth - 12, pageHeight - 8, { align: 'right' });
      }

      pdf.save(`customers-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      if (window.showToast) {
        window.showToast('Customer report exported successfully!', 'success');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (window.showToast) {
        window.showToast('Error generating PDF. Please try again.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {maxCustomers === Infinity ? (
              <>Total: {totalCustomers} / Unlimited</>
            ) : (
              <>Total: {totalCustomers} / {maxCustomers}</>
            )}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => {
              if (atCustomerLimit) {
                if (window.showToast) {
                  window.showToast(
                    maxCustomers === Infinity
                      ? 'Unlimited plan — no limit.'
                      : `Customer limit reached (${totalCustomers}/${maxCustomers}). Upgrade your plan or delete a customer to add a new one.`,
                    'warning'
                  );
                }
                return;
              }
              setShowAddModal(true);
            }}
            className={`btn-primary flex items-center ${atCustomerLimit ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={atCustomerLimit}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        <button 
          onClick={exportCustomersPDF}
          className="btn-secondary flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </button>
      </div>

      {/* Customers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCustomers.length > 0 ? (
          paginatedCustomers.map((customer) => (
            <div key={customer.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customer.name}
                  </h3>
                  {customer.phone && (
                    <p className="text-sm text-gray-600 mt-1">{customer.phone}</p>
                  )}
                  {customer.email && (
                    <p className="text-sm text-gray-600">{customer.email}</p>
                  )}
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (customer.balanceDue || 0) > 0 
                        ? 'bg-red-100 text-red-800' 
                        : (customer.balanceDue || 0) < 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      Balance: ₹{(customer.balanceDue || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePayment(customer)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                    title="Record Payment"
                  >
                    <CreditCard className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit Customer"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
                    disabled={(customer.balanceDue || 0) !== 0}
                    className={`p-2 rounded-lg ${
                      (customer.balanceDue || 0) !== 0
                        ? 'text-gray-300 cursor-not-allowed opacity-50'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title={
                      (customer.balanceDue || 0) !== 0
                        ? `Cannot delete. Outstanding balance: ₹${Math.abs(customer.balanceDue || 0).toFixed(2)}`
                        : 'Delete Customer'
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                Add Customer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddCustomer}
        />
      )}
      
      {showEditModal && selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          onSubmit={handleEditCustomer}
        />
      )}
      
      {showPaymentModal && selectedCustomer && (
        <PaymentModal
          customer={selectedCustomer}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedCustomer(null);
          }}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  );
};

export default Customers;
