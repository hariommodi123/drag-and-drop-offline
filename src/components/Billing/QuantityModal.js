import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTranslation } from '../../utils/translations';
import { getAvailableUnits } from '../../utils/unitConversion';

const QuantityModal = ({ product, onClose, onAdd }) => {
  const { state } = useApp();
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(product.quantityUnit || 'pcs');

  const handleSubmit = (e) => {
    e.preventDefault();
    const quantityValue = parseFloat(quantity);
    if (quantityValue > 0) {
      onAdd(product, quantityValue, unit);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{getTranslation('addQuantity', state.currentLanguage)}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getTranslation('product', state.currentLanguage)}: {product.name}
            </label>
            <p className="text-sm text-gray-600">
              {getTranslation('price', state.currentLanguage)}: ₹{(product.sellingPrice || product.costPrice || 0).toFixed(2)} per {product.quantityUnit || 'pcs'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getTranslation('quantity', state.currentLanguage)}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-field"
              step="0.01"
              min="0"
              placeholder="Enter quantity"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getTranslation('unit', state.currentLanguage)}
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="input-field"
            >
              {getAvailableUnits().weight.map(weightUnit => (
                <option key={weightUnit} value={weightUnit}>
                  {weightUnit === 'g' ? getTranslation('grams', state.currentLanguage) :
                   weightUnit === 'kg' ? getTranslation('kilograms', state.currentLanguage) :
                   weightUnit === 'mg' ? getTranslation('milligrams', state.currentLanguage) : weightUnit}
                </option>
              ))}
              {getAvailableUnits().volume.map(volumeUnit => (
                <option key={volumeUnit} value={volumeUnit}>
                  {volumeUnit === 'ml' ? getTranslation('milliliters', state.currentLanguage) :
                   volumeUnit === 'l' ? getTranslation('liters', state.currentLanguage) : volumeUnit}
                </option>
              ))}
              {getAvailableUnits().count.map(countUnit => (
                <option key={countUnit} value={countUnit}>
                  {countUnit === 'pcs' ? getTranslation('pieces', state.currentLanguage) :
                   countUnit === 'box' ? getTranslation('boxes', state.currentLanguage) :
                   countUnit === 'packet' ? getTranslation('packets', state.currentLanguage) :
                   countUnit === 'bottle' ? getTranslation('bottles', state.currentLanguage) : countUnit}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-2.5 px-4 rounded-md hover:bg-emerald-700 transition-colors"
          >
            {getTranslation('addToBill', state.currentLanguage)}
          </button>
        </form>
      </div>
    </div>
  );
};

export default QuantityModal;



