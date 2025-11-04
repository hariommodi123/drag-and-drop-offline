import React, { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const AddProductModal = ({ onClose, onSave, scannedBarcode = '' }) => {
  const { state } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    stock: '',
    barcode: scannedBarcode, // Use scanned barcode if provided
    expiryDate: '',
    mfgDate: '',
    costPrice: '',
    sellingPrice: '',
    quantityUnit: 'pcs',
    imageUrl: ''
  });

  // Update barcode when scannedBarcode prop changes
  useEffect(() => {
    if (scannedBarcode) {
      setFormData(prev => ({ ...prev, barcode: scannedBarcode }));
    }
  }, [scannedBarcode]);

  const [isScannerActive, setIsScannerActive] = useState(false);

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;
    
    // Strict integer handling for stock
    if (name === 'stock') {
      value = value.replace(/[^0-9]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Search for product by barcode when barcode changes
    if (name === 'barcode' && value.trim()) {
      searchProductByBarcode(value);
    }
  };

  // Search for existing product by barcode
  const searchProductByBarcode = (barcode) => {
    if (!barcode.trim()) return;
    
    // Search in existing products
    const existingProduct = state.products.find(p => p.barcode === barcode);
    
    if (existingProduct) {
      // Auto-fill product details if found
      setFormData(prev => ({
        ...prev,
        name: existingProduct.name,
        description: existingProduct.description || '',
        category: existingProduct.category || '',
        costPrice: existingProduct.costPrice || '',
        sellingPrice: existingProduct.sellingPrice || '',
        quantityUnit: existingProduct.quantityUnit || 'pcs',
        imageUrl: existingProduct.imageUrl || ''
      }));
      
      // Show notification
      window.showToast(`Product "${existingProduct.name}" found! Details auto-filled.`, 'success');
    } else {
      // Clear name if barcode doesn't match any product
      setFormData(prev => ({ ...prev, name: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter product name');
      return;
    }
    
    const productData = {
      ...formData,
      stock: parseInt(formData.stock) || 0,
      costPrice: parseFloat(formData.costPrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      quantityUnit: formData.quantityUnit || 'pcs'
    };
    
    onSave(productData);
  };


  const handleScanResult = (result) => {
    setFormData(prev => ({
      ...prev,
      barcode: result
    }));
    setIsScannerActive(false);
  };

  // Note: Scanner integration would be implemented here
  // For now, this is a placeholder for future barcode scanning functionality

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg mr-2 sm:mr-3">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Product</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select Category</option>
                <option value="grocery">Grocery</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="dairy">Dairy</option>
                <option value="beverages">Beverages</option>
                <option value="snacks">Snacks</option>
                <option value="household">Household</option>
                <option value="personal-care">Personal Care</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input-field"
              rows={3}
              placeholder="Enter product description"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Price (₹)
              </label>
              <input
                type="number"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                className="input-field"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price (₹)
              </label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                className="input-field"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Unit *
              </label>
              <select
                name="quantityUnit"
                value={formData.quantityUnit || 'pcs'}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="gm">Grams (gm)</option>
                <option value="liters">Liters (L)</option>
                <option value="ml">Milliliters (mL)</option>
                <option value="boxes">Boxes</option>
                <option value="packets">Packets</option>
                <option value="bottles">Bottles</option>
              </select>
            </div>
          </div>

          {/* Inventory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                onWheel={(e) => e.currentTarget.blur()}
                className="input-field"
                placeholder="0"
                min="0"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MFG Date
              </label>
              <input
                type="date"
                name="mfgDate"
                value={formData.mfgDate}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>

          {/* Product Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Image URL (Optional)
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="input-field w-full"
              placeholder="Enter image URL"
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode
            </label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              className="input-field w-full"
              placeholder="Enter barcode"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 sm:pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto order-1 sm:order-2"
            >
              Add Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
