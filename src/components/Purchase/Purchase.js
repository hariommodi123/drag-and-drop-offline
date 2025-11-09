import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, 
  Search, 
  Package, 
  Truck, 
  Calendar,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

const Purchase = () => {
  const { state, dispatch } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  // Filter purchase orders - exclude deleted items
  const filteredOrders = state.purchaseOrders.filter(order => {
    // Exclude deleted items from UI (they're kept in IndexedDB for sync)
    if (order.isDeleted === true) return false;
    
    const matchesSearch = order.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  // Calculate stats - exclude deleted items
  const activeOrders = state.purchaseOrders.filter(order => order.isDeleted !== true);
  const totalOrders = activeOrders.length;
  const pendingOrders = activeOrders.filter(order => order.status === 'pending').length;
  const completedOrders = activeOrders.filter(order => order.status === 'completed').length;
  const totalValue = activeOrders.reduce((sum, order) => sum + (order.total || 0), 0);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const handleStatusChange = (orderId, newStatus) => {
    const order = state.purchaseOrders.find(o => o.id === orderId);
    if (order) {
      const updatedOrder = { ...order, status: newStatus };
      dispatch({ type: 'UPDATE_PURCHASE_ORDER', payload: updatedOrder });
      
      dispatch({ type: 'ADD_ACTIVITY', payload: {
        id: Date.now().toString(),
        message: `Purchase order ${orderId} status changed to ${newStatus}`,
        timestamp: new Date().toISOString(),
        type: 'po_status_changed'
      }});
    }
  };

  const handleDeleteOrder = (orderId) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      dispatch({ type: 'DELETE_PURCHASE_ORDER', payload: orderId });
      
      dispatch({ type: 'ADD_ACTIVITY', payload: {
        id: Date.now().toString(),
        message: `Purchase order ${orderId} deleted`,
        timestamp: new Date().toISOString(),
        type: 'po_deleted'
      }});
    }
  };

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Purchase Orders</h2>
          <p className="text-gray-600 mt-2">Manage supplier orders and inventory</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Purchase Order
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedOrders}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="professional-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                  <td className="font-medium text-blue-600">#{order.id}</td>
                  <td>{order.supplierName || 'Unknown Supplier'}</td>
                  <td>
                    <span className="badge badge-info">
                      {order.items?.length || 0} items
                    </span>
                  </td>
                  <td className="font-semibold">₹{order.total?.toFixed(2) || '0.00'}</td>
                  <td>
                    <span className={getStatusBadge(order.status)}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1 capitalize">{order.status}</span>
                    </span>
                  </td>
                  <td className="text-gray-600">
                    {order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'completed')}
                          className="text-green-600 hover:text-green-800"
                          title="Mark as completed"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleStatusChange(order.id, 'cancelled')}
                        className="text-red-600 hover:text-red-800"
                        title="Cancel order"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Delete order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {paginatedOrders.length === 0 && (
          <div className="text-center py-12">
            <Truck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first purchase order</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Create Purchase Order
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredOrders.length)} of {filteredOrders.length} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Purchase Order Modal */}
      {showAddModal && (
        <AddPurchaseOrderModal
          onClose={() => setShowAddModal(false)}
          onSave={(orderData) => {
            const newOrder = {
              id: `PO-${Date.now()}`,
              ...orderData,
              status: 'pending',
              date: new Date().toISOString(),
              createdAt: new Date().toISOString(), // Ensure createdAt is set
              // Ensure items have proper structure for backend
              items: orderData.items.map(item => ({
                productId: item.productId || null,
                productName: item.productName || '',
                quantity: parseInt(item.quantity) || 0,
                price: parseFloat(item.price) || 0,
                unit: item.unit || 'pcs',
                subtotal: parseFloat(item.subtotal) || (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0),
                isCustomProduct: item.isCustomProduct || false
              }))
            };
            dispatch({ type: 'ADD_PURCHASE_ORDER', payload: newOrder });
            dispatch({ type: 'ADD_ACTIVITY', payload: {
              id: Date.now().toString(),
              message: `New purchase order ${newOrder.id} created`,
              timestamp: new Date().toISOString(),
              type: 'po_created'
            }});
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

// Add Purchase Order Modal Component
const AddPurchaseOrderModal = ({ onClose, onSave }) => {
  const { state } = useApp();
  const [formData, setFormData] = useState({
    supplierName: '',
    items: [],
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { 
        productId: '', 
        productName: '', 
        quantity: '', 
        price: '', 
        unit: 'pcs',
        isCustomProduct: false 
      }]
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const addProductToOrder = (product) => {
    const existingItemIndex = formData.items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      updateItem(existingItemIndex, 'quantity', (parseInt(formData.items[existingItemIndex].quantity) || 0) + 1);
    } else {
      // Add new item - use costPrice or unitPrice for purchase orders
      const purchasePrice = product.costPrice || product.unitPrice || product.price || '';
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { 
          productId: product.id, 
          productName: product.name,
          quantity: '1', 
          price: purchasePrice, // Use cost price for purchase orders
          unit: product.unit || product.quantityUnit || 'pcs',
          isCustomProduct: false
        }]
      }));
    }
    setShowProductSearch(false);
    setSearchTerm('');
  };

  const toggleCustomProduct = (index) => {
    const item = formData.items[index];
    if (item.isCustomProduct) {
      // Switch to existing product
      updateItem(index, 'isCustomProduct', false);
      updateItem(index, 'productName', '');
    } else {
      // Switch to custom product
      updateItem(index, 'isCustomProduct', true);
      updateItem(index, 'productId', '');
    }
  };

  const filteredProducts = state.products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation according to backend VendorOrder model requirements
    const errors = [];
    
    // Backend requires supplierName
    if (!formData.supplierName || !formData.supplierName.trim()) {
      errors.push('Supplier name is required');
    }

    // Backend requires at least one item
    if (!formData.items || formData.items.length === 0) {
      errors.push('Purchase order must have at least one item');
    } else {
      // Validate each item according to backend requirements
      formData.items.forEach((item, index) => {
        // Backend requires productName
        if (!item.productName || !item.productName.trim()) {
          errors.push(`Item ${index + 1}: Product name is required`);
        }
        
        // Backend requires quantity (min: 1)
        const quantity = parseInt(item.quantity) || 0;
        if (!quantity || quantity < 1) {
          errors.push(`Item ${index + 1}: Quantity must be at least 1`);
        }
        
        // Backend requires price (min: 0)
        const price = parseFloat(item.price) || 0;
        if (price < 0) {
          errors.push(`Item ${index + 1}: Price must be 0 or greater`);
        }
        
        // Backend requires unit
        if (!item.unit || !item.unit.trim()) {
          errors.push(`Item ${index + 1}: Unit is required`);
        }
        
        // Validate unit enum (backend: pcs, kg, g, mg, l, ml, box, packet, bottle, dozen)
        const validUnits = ['pcs', 'kg', 'g', 'mg', 'l', 'ml', 'box', 'packet', 'bottle', 'dozen'];
        if (item.unit && !validUnits.includes(item.unit)) {
          errors.push(`Item ${index + 1}: Unit must be one of: ${validUnits.join(', ')}`);
        }
      });
    }

    if (errors.length > 0) {
      const errorMessage = errors.join('\n');
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
      return;
    }

    // Calculate total and subtotals according to backend requirements
    const itemsWithSubtotals = formData.items.map(item => ({
      ...item,
      quantity: parseInt(item.quantity) || 0,
      price: parseFloat(item.price) || 0,
      subtotal: (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)
    }));
    
    const total = itemsWithSubtotals.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Backend requires total (min: 0)
    if (total < 0) {
      if (window.showToast) {
        window.showToast('Total must be 0 or greater', 'error');
      } else {
        alert('Total must be 0 or greater');
      }
      return;
    }
    
    onSave({
      ...formData,
      items: itemsWithSubtotals,
      total
    });
  };

  return (
    <div className="professional-modal">
      <div className="professional-modal-content">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">New Purchase Order</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier Name * <span className="text-red-500">(Required)</span>
            </label>
            <input
              type="text"
              name="supplierName"
              value={formData.supplierName}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter supplier name"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Items ({formData.items.length})
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProductSearch(true)}
                  className="btn-secondary text-sm"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Search Products
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn-secondary text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Manually
                </button>
              </div>
            </div>

            {/* Product Search Modal */}
            {showProductSearch && (
              <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Search Products</h3>
                    <button
                      onClick={() => {
                        setShowProductSearch(false);
                        setSearchTerm('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search products by name or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                      autoFocus
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => addProductToOrder(product)}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-600">
                            {product.category} • Quantity: {product.quantity || product.stock || 0} {product.quantityUnit || product.unit || 'pcs'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">₹{(product.price || 0).toFixed(2)}</p>
                          <button
                            type="button"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Add to Order
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {filteredProducts.length === 0 && searchTerm && (
                      <div className="text-center py-8 text-gray-500">
                        No products found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const product = state.products.find(p => p.id === item.productId);
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                      <div className="md:col-span-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <label className="block text-xs font-medium text-gray-600">Product</label>
                          <button
                            type="button"
                            onClick={() => toggleCustomProduct(index)}
                            className={`text-xs px-2 py-1 rounded ${
                              item.isCustomProduct 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.isCustomProduct ? 'Custom' : 'Existing'}
                          </button>
                        </div>
                        
                        {item.isCustomProduct ? (
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => updateItem(index, 'productName', e.target.value)}
                            className="input-field"
                            placeholder="Enter product name"
                            required
                          />
                        ) : (
                          <select
                            value={item.productId}
                            onChange={(e) => {
                              const selectedProduct = state.products.find(p => p.id === e.target.value);
                              updateItem(index, 'productId', e.target.value);
                              if (selectedProduct) {
                                // Use costPrice or unitPrice for purchase orders
                                const purchasePrice = selectedProduct.costPrice || selectedProduct.unitPrice || selectedProduct.price || '';
                                updateItem(index, 'price', purchasePrice);
                                updateItem(index, 'unit', selectedProduct.unit || selectedProduct.quantityUnit || 'pcs');
                                updateItem(index, 'productName', selectedProduct.name);
                              }
                            }}
                            className="input-field"
                            required
                          >
                            <option value="">Select Product</option>
                            {state.products.map(product => {
                              const purchasePrice = product.costPrice || product.unitPrice || product.price || 0;
                              return (
                                <option key={product.id} value={product.id}>
                                  {product.name} (₹{purchasePrice.toFixed(2)}/{product.unit || product.quantityUnit || 'pcs'})
                                </option>
                              );
                            })}
                          </select>
                        )}
                        
                        {product && !item.isCustomProduct && (
                          <p className="text-xs text-gray-500 mt-1">
                            Current Quantity: {product.quantity || product.stock || 0} {product.quantityUnit || product.unit || 'pcs'}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantity * <span className="text-red-500">(Min: 1)</span>
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="input-field"
                          placeholder="Enter quantity"
                          min="1"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="input-field"
                          required
                        >
                          <option value="">Select Unit</option>
                          <option value="pcs">Pieces</option>
                          <option value="kg">Kilogram</option>
                          <option value="g">Gram</option>
                          <option value="mg">Milligram</option>
                          <option value="l">Liter</option>
                          <option value="ml">Milliliter</option>
                          <option value="box">Box</option>
                          <option value="packet">Packet</option>
                          <option value="bottle">Bottle</option>
                          <option value="dozen">Dozen</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Unit Price (₹) * <span className="text-red-500">(Min: 0)</span>
                        </label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', e.target.value)}
                          className="input-field"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right flex-1">
                          <p className="text-xs text-gray-600">Total</p>
                          <p className="font-semibold text-green-600">
                            ₹{((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)).toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 p-2"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {formData.items.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-2">No items added yet</p>
                  <p className="text-sm text-gray-500">Click "Search Products" or "Add Manually" to get started</p>
                </div>
              )}
            </div>

            {/* Order Summary */}
            {formData.items.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Order Total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₹{formData.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {formData.items.length} item{formData.items.length !== 1 ? 's' : ''} • 
                  Total Quantity: {formData.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)} units
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input-field"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
              Create Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Purchase;