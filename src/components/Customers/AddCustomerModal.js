import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const AddCustomerModal = ({
  onClose,
  onSubmit,
  existingCustomers = [],
  planLimitError = '',
  onClearPlanLimitError
}) => {
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    address: '',
    balanceDue: 0
  });
  const [duplicateError, setDuplicateError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'balanceDue' ? parseFloat(value) || 0 : value
    }));

    if (duplicateError && (name === 'mobileNumber' || name === 'email')) {
      setDuplicateError('');
    }

    if (planLimitError && onClearPlanLimitError) {
      onClearPlanLimitError();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter customer name');
      return;
    }

    const mobile = formData.mobileNumber.trim();
    const email = formData.email.trim().toLowerCase();

    if (mobile || email) {
      const matchedCustomer = existingCustomers.find(customer => {
        const existingMobile = (customer.mobileNumber || customer.phone || '').trim();
        const existingEmail = (customer.email || '').trim().toLowerCase();
        const mobileMatch = mobile && existingMobile && existingMobile === mobile;
        const emailMatch = email && existingEmail && existingEmail === email;
        return mobileMatch || emailMatch;
      });

      if (matchedCustomer) {
        setDuplicateError(
          `${matchedCustomer.name} नाम का एक ग्राहक पहले से मौजूद है${mobile ? ` (मोबाइल: ${mobile})` : ''}${email ? ` (ईमेल: ${formData.email.trim()})` : ''}. कृपया नया विवरण दर्ज करें।`
        );
        return;
      }
    }
    
    // Ensure dueAmount is set from balanceDue (database uses dueAmount)
    const dueAmount = parseFloat(formData.balanceDue) || 0;
    
    const customerData = {
      ...formData,
      dueAmount: dueAmount, // MongoDB uses dueAmount field
      balanceDue: dueAmount // Keep for backward compatibility
    };
    
    console.log('AddCustomerModal - Submitting customer data:', customerData);
    console.log('dueAmount:', customerData.dueAmount, 'balanceDue:', customerData.balanceDue);
    
    onSubmit(customerData);
  };


  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Add New Customer</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {planLimitError && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 p-4 shadow-md">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-amber-700">Plan limit reached</p>
                  <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                    {planLimitError}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {duplicateError && (
            <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-red-100 to-red-50 p-4 shadow-md">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-red-700">Duplicate customer detected</p>
                  <p className="mt-1 text-xs text-red-600 leading-relaxed">
                    {duplicateError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-600 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter customer name"
              required
            />
          </div>

          <div>
            <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-600 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              id="mobileNumber"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter mobile number"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-600 mb-1">
              Address (Optional)
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="input-field"
              placeholder="Enter address"
            />
          </div>

          <div>
            <label htmlFor="balanceDue" className="block text-sm font-medium text-gray-600 mb-1">
              Initial Balance Due (₹)
            </label>
            <input
              type="number"
              id="balanceDue"
              name="balanceDue"
              value={formData.balanceDue}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="input-field"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomerModal;
