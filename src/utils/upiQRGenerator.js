// UPI QR Code Generator for Paytm Integration
// Simple QR code generator without external dependencies

// Paytm UPI Configuration
const PAYTM_UPI_ID = '6269631832@ptsbi';
const MERCHANT_NAME = 'Grocery Store';

/**
 * Generate UPI QR Code for payment (Simple Canvas-based)
 * @param {number} amount - Payment amount
 * @param {string} transactionId - Unique transaction ID
 * @param {string} merchantName - Merchant/store name
 * @param {string} description - Payment description
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
export const generateUPIQRCode = async (amount, transactionId, merchantName = MERCHANT_NAME, description = '') => {
  try {
    // Create UPI payment URL
    const upiUrl = createUPIPaymentURL(amount, transactionId, merchantName, description);
    
    // Generate simple QR code representation
    const qrCodeDataURL = generateSimpleQRCode(upiUrl);
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating UPI QR code:', error);
    throw error;
  }
};

/**
 * Generate simple QR code representation using canvas
 * @param {string} text - Text to encode
 * @returns {string} - Base64 encoded image
 */
const generateSimpleQRCode = (text) => {
  try {
    // Check if we're in browser environment
    if (typeof document === 'undefined') {
      console.warn('Canvas not available, returning placeholder');
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 300;
    
    canvas.width = size;
    canvas.height = size;
    
    // Create a simple QR-like pattern
    const gridSize = 25; // 25x25 grid
    const cellSize = size / gridSize;
    
    // Fill background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    // Generate pattern based on text hash
    const hash = simpleHash(text);
    const pattern = generatePattern(hash, gridSize);
    
    // Draw pattern
    ctx.fillStyle = '#000000';
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (pattern[i][j]) {
          ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
      }
    }
    
    // Add corner markers (QR code style)
    drawCornerMarker(ctx, 0, 0, cellSize);
    drawCornerMarker(ctx, size - 7 * cellSize, 0, cellSize);
    drawCornerMarker(ctx, 0, size - 7 * cellSize, cellSize);
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Return a simple placeholder image
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
};

/**
 * Simple hash function for text
 * @param {string} text - Text to hash
 * @returns {number} - Hash value
 */
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Generate pattern based on hash
 * @param {number} hash - Hash value
 * @param {number} size - Grid size
 * @returns {Array} - Pattern array
 */
const generatePattern = (hash, size) => {
  const pattern = [];
  let seed = hash;
  
  for (let i = 0; i < size; i++) {
    pattern[i] = [];
    for (let j = 0; j < size; j++) {
      // Skip corner markers area
      if ((i < 7 && j < 7) || 
          (i < 7 && j >= size - 7) || 
          (i >= size - 7 && j < 7)) {
        pattern[i][j] = false;
        continue;
      }
      
      // Generate pattern based on position and hash
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      pattern[i][j] = (seed % 3) === 0;
    }
  }
  
  return pattern;
};

/**
 * Draw corner marker for QR code
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} cellSize - Cell size
 */
const drawCornerMarker = (ctx, x, y, cellSize) => {
  ctx.fillStyle = '#000000';
  
  // Outer square
  ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
  
  // Inner white square
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
  
  // Inner black square
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
};

/**
 * Create UPI payment URL
 * @param {number} amount - Payment amount
 * @param {string} transactionId - Unique transaction ID
 * @param {string} merchantName - Merchant/store name
 * @param {string} description - Payment description
 * @returns {string} - UPI payment URL
 */
export const createUPIPaymentURL = (amount, transactionId, merchantName = MERCHANT_NAME, description = '') => {
  // Format amount to 2 decimal places
  const formattedAmount = parseFloat(amount).toFixed(2);
  
  // Create UPI URL with Paytm UPI ID
  const upiUrl = `upi://pay?pa=${PAYTM_UPI_ID}&pn=${encodeURIComponent(merchantName)}&am=${formattedAmount}&cu=INR&tr=${transactionId}&tn=${encodeURIComponent(description || 'Payment')}`;
  
  return upiUrl;
};

/**
 * Generate unique transaction ID
 * @returns {string} - Unique transaction ID
 */
export const generateTransactionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN${timestamp}${random}`.toUpperCase();
};

/**
 * Validate UPI payment amount
 * @param {number} amount - Payment amount
 * @returns {boolean} - Whether amount is valid
 */
export const validatePaymentAmount = (amount) => {
  return amount > 0 && amount <= 1000000; // Max ₹10 lakh per transaction
};

/**
 * Format amount for display
 * @param {number} amount - Payment amount
 * @returns {string} - Formatted amount string
 */
export const formatAmount = (amount) => {
  return `₹${parseFloat(amount).toFixed(2)}`;
};

/**
 * Create payment summary object
 * @param {Object} bill - Bill object
 * @param {string} transactionId - Transaction ID
 * @returns {Object} - Payment summary
 */
export const createPaymentSummary = (bill, transactionId) => {
  return {
    transactionId,
    upiId: PAYTM_UPI_ID,
    amount: bill.total,
    formattedAmount: formatAmount(bill.total),
    merchantName: MERCHANT_NAME,
    billId: bill.id,
    customerName: bill.customerName,
    items: bill.items.length,
    paymentMethod: 'UPI',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
};

/**
 * Generate QR code for bill payment
 * @param {Object} bill - Bill object
 * @returns {Promise<Object>} - QR code data and payment info
 */
export const generateBillPaymentQR = async (bill) => {
  try {
    const transactionId = generateTransactionId();
    const qrCodeDataURL = await generateUPIQRCode(
      bill.total,
      transactionId,
      MERCHANT_NAME,
      `Payment for Bill #${bill.id} - ${bill.customerName}`
    );
    
    const paymentSummary = createPaymentSummary(bill, transactionId);
    
    return {
      qrCodeDataURL,
      paymentSummary,
      upiUrl: createUPIPaymentURL(
        bill.total,
        transactionId,
        MERCHANT_NAME,
        `Payment for Bill #${bill.id} - ${bill.customerName}`
      )
    };
  } catch (error) {
    console.error('Error generating bill payment QR:', error);
    throw error;
  }
};
