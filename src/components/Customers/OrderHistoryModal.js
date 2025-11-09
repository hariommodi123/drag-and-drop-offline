import React, { useMemo } from 'react';
import { X, Receipt, ShoppingCart } from 'lucide-react';

const formatCurrency = (value) => {
  const amount = Number(value || 0) || 0;
  return `₹${amount.toFixed(2)}`;
};

const formatDateTime = (value) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return new Intl.DateTimeFormat('en-IN', options).format(date);
  } catch (error) {
    return value;
  }
};

const sanitizeMobile = (mobile) => (mobile || '').toString().replace(/\D/g, '');

const OrderHistoryModal = ({ customer, orders, onClose }) => {
  const customerOrders = useMemo(() => {
    if (!customer || !orders?.length) return [];

    const customerName = (customer.name || '').trim().toLowerCase();
    const customerId = customer.id;
    const customerMobile = sanitizeMobile(customer.mobileNumber || customer.phone || '');

    return orders
      .filter((order) => {
        if (!order || order.isDeleted) return false;
        const orderCustomerId = order.customerId;
        const orderCustomerName = (order.customerName || '').trim().toLowerCase();
        const orderCustomerMobile = sanitizeMobile(order.customerMobile || '');

        if (orderCustomerId && customerId && orderCustomerId === customerId) {
          return true;
        }

        if (orderCustomerName && customerName && orderCustomerName === customerName) {
          return true;
        }

        if (orderCustomerMobile && customerMobile && orderCustomerMobile === customerMobile) {
          return true;
        }

        return false;
      })
      .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
  }, [customer, orders]);

  const toNumeric = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const deriveSubtotalFromItems = (order) => {
    if (!order || !Array.isArray(order.items)) return 0;
    return order.items.reduce((sum, item) => {
      const price = toNumeric(item.sellingPrice) ?? toNumeric(item.price) ?? 0;
      const qty = toNumeric(item.quantity) ?? 0;
      return sum + price * qty;
    }, 0);
  };

  const roundAmount = (value) => {
    const numeric = Number(value) || 0;
    return Math.round((numeric + Number.EPSILON) * 100) / 100;
  };

  const computeFinancialBreakdown = (order) => {
    const storedSubtotal = toNumeric(order.subtotal) ?? 0;
    const itemsSubtotal = deriveSubtotalFromItems(order);
    const fallbackTotal = toNumeric(order.totalAmount) ?? toNumeric(order.total) ?? 0;
    const rawSubtotal = storedSubtotal > 0 ? storedSubtotal : (itemsSubtotal > 0 ? itemsSubtotal : fallbackTotal);

    const storedDiscountPercentValue = toNumeric(order.discountPercent);
    const storedDiscountAmount = toNumeric(order.discountAmount) ?? toNumeric(order.discount) ?? 0;

    let discountPercent = storedDiscountPercentValue;
    if (discountPercent === null) {
      discountPercent = rawSubtotal > 0 ? (storedDiscountAmount / rawSubtotal) * 100 : 0;
    }
    if (!Number.isFinite(discountPercent)) {
      discountPercent = 0;
    }

    const resolvedDiscountAmount = storedDiscountAmount > 0
      ? storedDiscountAmount
      : (rawSubtotal * discountPercent) / 100;
    const discountAmount = roundAmount(resolvedDiscountAmount);

    const taxableBase = Math.max(0, rawSubtotal - discountAmount);

    const storedTaxPercentValue = toNumeric(order.taxPercent);
    const storedTaxAmount = toNumeric(order.taxAmount) ?? toNumeric(order.tax) ?? 0;

    let taxPercent = storedTaxPercentValue;
    if (taxPercent === null) {
      taxPercent = taxableBase > 0 ? (storedTaxAmount / taxableBase) * 100 : 0;
    }
    if (!Number.isFinite(taxPercent)) {
      taxPercent = 0;
    }

    const resolvedTaxAmount = storedTaxAmount > 0
      ? storedTaxAmount
      : (taxableBase * taxPercent) / 100;
    const taxAmount = roundAmount(resolvedTaxAmount);

    const rawTotal = toNumeric(order.totalAmount) ?? toNumeric(order.total) ?? 0;
    const netTotal = rawTotal > 0 ? rawTotal : roundAmount(Math.max(0, taxableBase + taxAmount));

    return {
      subtotal: roundAmount(rawSubtotal),
      discountPercent: roundAmount(discountPercent),
      discountAmount,
      taxPercent: roundAmount(taxPercent),
      taxAmount,
      netTotal
    };
  };

  const totals = customerOrders.reduce((acc, order) => {
    const breakdown = computeFinancialBreakdown(order);
    acc.totalSpend += breakdown.netTotal;
    acc.totalSubtotal += breakdown.subtotal;
    acc.totalDiscount += breakdown.discountAmount;
    acc.totalTax += breakdown.taxAmount;
    return acc;
  }, { totalSpend: 0, totalSubtotal: 0, totalDiscount: 0, totalTax: 0 });

  const { totalSpend, totalSubtotal, totalDiscount, totalTax } = totals;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[1050] px-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary-600" />
              Order History
            </h2>
            <p className="text-sm text-gray-500">
              {customer?.name || 'Customer'} • {customerOrders.length} orders • Net paid {formatCurrency(totalSpend)}
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Subtotal {formatCurrency(totalSubtotal)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Discount {formatCurrency(roundAmount(totalDiscount))}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                Tax {formatCurrency(roundAmount(totalTax))}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Total {formatCurrency(roundAmount(totalSpend))}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            aria-label="Close order history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] px-6 py-4 space-y-4">
          {customerOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <ShoppingCart className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium">No orders found for this customer yet.</p>
            </div>
          ) : (
            customerOrders.map((order) => {
              const orderItems = order.items || [];
              const breakdown = computeFinancialBreakdown(order);

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/40 hover:border-primary-200 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Invoice ID: {order.id?.slice(-8) || '—'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(order.createdAt || order.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-primary-600">{formatCurrency(breakdown.netTotal)}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{order.paymentMethod || 'cash'}</p>
                    </div>
                  </div>
                  {orderItems.length > 0 && (
                    <div className="px-5 pb-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-lg bg-white border border-gray-200 px-3 py-2.5">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Subtotal</p>
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(breakdown.subtotal)}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 px-3 py-2.5">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Discount ({(breakdown.discountPercent || 0).toFixed(2)}%)</p>
                          <p className="text-sm font-semibold text-emerald-600">
                            - {formatCurrency(breakdown.discountAmount)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 px-3 py-2.5">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Tax ({(breakdown.taxPercent || 0).toFixed(2)}%)</p>
                          <p className="text-sm font-semibold text-purple-600">
                            + {formatCurrency(breakdown.taxAmount)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 px-3 py-2.5">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Net Total</p>
                          <p className="text-sm font-semibold text-primary-600">{formatCurrency(breakdown.netTotal)}</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Item</th>
                              <th className="px-4 py-2 text-center font-medium text-gray-600">Qty</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-600">Rate</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-600">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {orderItems.map((item, idx) => {
                              const rate = Number(item.sellingPrice ?? item.price ?? 0) || 0;
                              const qty = Number(item.quantity ?? 0) || 0;
                              const lineTotal = rate * qty;
                              return (
                                <tr key={idx}>
                                  <td className="px-4 py-2 text-gray-800">{item.name}</td>
                                  <td className="px-4 py-2 text-center text-gray-600">{qty} {item.unit || item.quantityUnit || ''}</td>
                                  <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(rate)}</td>
                                  <td className="px-4 py-2 text-right font-medium text-gray-700">{formatCurrency(lineTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryModal;

