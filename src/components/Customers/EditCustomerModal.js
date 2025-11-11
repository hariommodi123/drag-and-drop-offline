import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { sanitizeMobileNumber, isValidMobileNumber } from '../../utils/validation';

const EditCustomerModal = ({ customer, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: customer.name || '',
    mobileNumber: sanitizeMobileNumber(customer.mobileNumber || customer.phone || ''),
    email: customer.email || '',
    address: customer.address || '',
    balanceDue: customer.balanceDue || customer.dueAmount || 0,
  });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError('');

    setFormData((previous) => {
      let nextValue = value;
      if (name === 'balanceDue') {
        nextValue = parseFloat(value) || 0;
      } else if (name === 'mobileNumber') {
        nextValue = sanitizeMobileNumber(value);
      }
      return { ...previous, [name]: nextValue };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter customer name');
      alert('Please enter customer name');
      return;
    }

    const mobile = sanitizeMobileNumber(formData.mobileNumber);
    if (mobile && !isValidMobileNumber(mobile)) {
      const message = 'Please enter a valid 10-digit mobile number starting with 6-9.';
      setError(message);
      if (window.showToast) {
        window.showToast(message, 'error');
      } else {
        alert(message);
      }
      return;
    }

    const dueAmount = parseFloat(formData.balanceDue) || 0;

    const customerData = {
      ...customer,
      ...formData,
      mobileNumber: mobile,
      dueAmount,
      balanceDue: dueAmount,
    };

    onSubmit(customerData);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Edit Customer</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
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
              maxLength={10}
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
              Balance Due (₹)
            </label>
            <input
              type="number"
              id="balanceDue"
              name="balanceDue"
              value={formData.balanceDue}
              onChange={handleChange}
              step="0.01"
              className="input-field"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Update Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCustomerModal;

