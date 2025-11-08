import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';

const BarcodeScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const isRunningRef = useRef(false);
  const scanProcessedRef = useRef(false);

  // Keep refs updated
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  useEffect(() => {
    // Clear any existing scanner content and reset state
    const element = document.getElementById("qr-reader");
    if (element) {
      element.innerHTML = '';
    }
    
    setError(''); // Reset error state
    isRunningRef.current = false;
    scanProcessedRef.current = false; // Reset scan flag
    
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        // Better settings for product barcode scanning
        // Simple, robust configuration that works on all devices
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 }, // Simple fixed size
          aspectRatio: 1.0,
          supportedScanTypes: [Html5Qrcode.SCAN_TYPE_CAMERA],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
          disableFlip: false,
          // Essential settings
          showTorchButtonIfSupported: false,
          showZoomSliderIfSupported: false,
          tryHarder: true
        };

        // Try with simple camera constraints first
        await html5QrCode.start(
          { facingMode: "environment" }, // Simple camera request
          config,
          (decodedText, decodedResult) => {
            console.log("🔍 Scanner callback triggered with:", decodedText);
            
            if (scanProcessedRef.current) {
              console.log("⚠️ Scan already processed, ignoring");
              return; // Prevent multiple callbacks
            }
            
            console.log("✅ Successfully scanned barcode:", decodedText);
            console.log("Decoded result:", decodedResult);
            
            // Process scan if we have valid barcode text
            if (decodedText && decodedText.trim()) {
              scanProcessedRef.current = true;
              isRunningRef.current = false;
              
              const barcodeToSend = decodedText.trim();
              console.log("📦 Processed barcode:", barcodeToSend);
              
              // Immediately call onScan callback
              console.log("📞 Calling onScan with:", barcodeToSend);
              onScanRef.current(barcodeToSend);
              
              // Stop scanner properly without clearing DOM
              const state = html5QrCode.getState();
              console.log("🔍 Scanner state before stop:", state);
              
              if (state === 2) { // STATE_RUNNING
                html5QrCode.stop().catch((stopErr) => {
                  console.log("Scanner stop error:", stopErr);
                });
              }
              
              // Close modal after delay to allow video to stop naturally
              setTimeout(() => {
                console.log("📞 Calling onClose");
                onCloseRef.current();
              }, 500);
            } else {
              console.log("❌ Invalid scan data - no text decoded");
            }
          },
          (errorMessage) => {
            // Don't log every scanning error, only log important ones
            if (errorMessage.includes('NotFound') || 
                errorMessage.includes('parse error') ||
                errorMessage.includes('No MultiFormat Readers') ||
                errorMessage.includes('continuous scanning')) {
              // These are normal during scanning
            } else {
              console.log("⚠️ Scanning error:", errorMessage);
            }
          }
        );
        isRunningRef.current = true;
        console.log("✅ Scanner started successfully");
      } catch (err) {
        console.error("❌ Scanner startup error:", err);
        
        // Try with ultra-simple fallback settings
        try {
          console.log("🔄 Trying fallback camera settings...");
          
          // Clear old instance
          if (html5QrCode) {
            try { html5QrCode.clear(); } catch (e) {}
          }
          
          // Create new scanner instance
          const fallbackScanner = new Html5Qrcode("qr-reader");
          scannerRef.current = fallbackScanner;
          
          await fallbackScanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText, decodedResult) => {
              console.log("🔍 Fallback scan:", decodedText);
              if (!scanProcessedRef.current && decodedText && decodedText.trim()) {
                scanProcessedRef.current = true;
                isRunningRef.current = false;
                const barcodeToSend = decodedText.trim();
                
                // Immediately call onScan
                onScanRef.current(barcodeToSend);
                
                // Stop scanner without clearing DOM
                fallbackScanner.stop().catch(() => {});
                
                // Close modal after delay
                setTimeout(() => onCloseRef.current(), 500);
              }
            },
            (errorMessage) => {
              // Ignore scanning errors
            }
          );
          
          isRunningRef.current = true;
          console.log("✅ Fallback scanner started successfully");
        } catch (fallbackErr) {
          console.error("❌ Fallback scanner also failed:", fallbackErr);
          
          // Provide specific error messages
          let errorMsg = "Camera not available. ";
          if (fallbackErr.message && fallbackErr.message.includes('Permission')) {
            errorMsg += "Please allow camera access in your browser settings.";
          } else if (fallbackErr.message && fallbackErr.message.includes('NotFound')) {
            errorMsg += "No camera found. Check if camera is connected and not in use by another app.";
          } else if (fallbackErr.message && fallbackErr.message.includes('NotAllowed')) {
            errorMsg += "Camera access denied. Please grant permission and refresh the page.";
          } else {
            errorMsg += fallbackErr.message || 'Unknown error';
          }
          
          setError(errorMsg);
          isRunningRef.current = false;
        }
      }
    };

    startScanner();

    return () => {
      console.log("🧹 Cleaning up scanner");
      isRunningRef.current = false;
      
      // Wait for any pending operations before cleaning up
      setTimeout(() => {
        try {
          const state = html5QrCode.getState();
          console.log("🔍 Cleanup - Scanner state:", state);
          
          if (state === 2) { // STATE_RUNNING
            // Stop and wait with a longer delay
            html5QrCode.stop().then(() => {
              console.log("✅ Scanner stopped during cleanup");
              // Give time for video to fully stop
              setTimeout(() => {
                try {
                  const element = document.getElementById("qr-reader");
                  if (element) {
                    element.innerHTML = '';
                  }
                  console.log("✅ Scanner cleared during cleanup");
                } catch (clearErr) {
                  console.log("Clear error during cleanup:", clearErr);
                }
              }, 300);
            }).catch((stopErr) => {
              console.log("Error stopping during cleanup:", stopErr);
            });
          } else {
            // Scanner not running, just clear
            try {
              const element = document.getElementById("qr-reader");
              if (element) {
                element.innerHTML = '';
              }
              console.log("✅ Scanner cleared during cleanup");
            } catch (clearErr) {
              console.log("Clear error during cleanup:", clearErr);
            }
          }
        } catch (error) {
          console.log("Error during cleanup:", error);
        }
      }, 100);
    };
  }, []); // Empty dependency array - only run once

  const handleClose = () => {
    console.log("🔒 Closing scanner");
    
    isRunningRef.current = false;
    
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        console.log("🔍 Scanner state:", state);
        
        if (state === 2) { // STATE_RUNNING
          // Stop the scanner and wait for it to complete
          scannerRef.current.stop().catch((err) => {
            console.log("Error stopping scanner:", err);
          }).finally(() => {
            // Clear after successful stop with delay
            setTimeout(() => {
              try {
                const element = document.getElementById("qr-reader");
                if (element) {
                  element.innerHTML = '';
                }
              } catch (clearErr) {
                console.log("Clear error:", clearErr);
              }
              scannerRef.current = null;
              onClose();
            }, 200);
          });
        } else {
          // Scanner not running, just clear and close
          try {
            const element = document.getElementById("qr-reader");
            if (element) {
              element.innerHTML = '';
            }
          } catch (clearErr) {
            console.log("Clear error:", clearErr);
          }
          scannerRef.current = null;
          onClose();
        }
      } catch (error) {
        console.log("Error closing scanner:", error);
        scannerRef.current = null;
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Barcode Scanner</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 p-4 sm:p-6">
          {error ? (
            <div className="text-red-600 text-center p-4">
              <p className="text-sm sm:text-base font-medium">{error}</p>
              <div className="text-xs sm:text-sm mt-3 space-y-2 text-left bg-red-50 p-3 rounded-lg">
                <p className="font-medium mb-2">Troubleshooting steps:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Check if camera permission is granted in browser settings</li>
                  <li>Close other apps that might be using the camera</li>
                  <li>Try refreshing the page</li>
                  <li>Check if your browser supports camera API (Chrome, Firefox, Edge recommended)</li>
                  <li>Make sure you're using HTTPS or localhost</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 text-center">
                Point camera at barcode to scan
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-xs text-left">
                <p className="font-medium text-blue-900 mb-2">💡 Tips for scanning product barcodes:</p>
                <ul className="text-blue-800 space-y-1">
                  <li>• Hold camera steady 8-12cm from the barcode</li>
                  <li>• Ensure bright, even lighting (avoid shadows)</li>
                  <li>• Flat barcodes work best - avoid curved surfaces</li>
                  <li>• Move slowly to align barcode in the frame</li>
                  <li>• Camera needs a moment to focus - be patient</li>
                </ul>
              </div>
              <div
                id="qr-reader"
                className="w-full mx-auto bg-gray-100 rounded-lg overflow-hidden"
                style={{ maxWidth: '100%', minHeight: '250px' }}
              ></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
