import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../../utils/firebase';
import { getSellerId } from '../../utils/api';

const Login = () => {
  const { dispatch } = useApp();
  const logoSrc = `${process.env.PUBLIC_URL || ''}/assets/drag-and-drop-logo.jpg`;
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isSigningInRef = useRef(false);
  const [showTerms, setShowTerms] = useState(false);

  // Check for redirect result on mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          
          // Create/verify seller in backend - creates new seller if doesn't exist
          try {
            const result = await getSellerId(
              user.email,
              user.uid,
              user.displayName,
              user.photoURL
            );

            if (result.success && result.sellerId) {
              console.log('✅ Seller created/verified in backend:', result.seller);
              dispatch({ 
                type: 'LOGIN', 
                payload: {
                  username: user.displayName || user.email || 'User',
                  email: user.email,
                  photoURL: user.photoURL,
                  uid: user.uid,
                  sellerId: result.sellerId,
                  upiId: result.seller?.upiId || ''
                }
              });
            } else if (result.status === 403) {
              // Account inactive - deny access
              console.warn('Access denied: Seller account is inactive');
              auth.signOut().catch(console.error);
            } else {
              // Other errors - deny access for security
              console.error('Backend verification failed:', result.error);
              auth.signOut().catch(console.error);
            }
          } catch (authError) {
            // Backend unavailable - deny access for security
            console.error('Backend auth error:', authError);
            auth.signOut().catch(console.error);
          }
        }
      } catch (error) {
        console.error('Error checking redirect result:', error);
      }
    };
    
    checkRedirectResult();
  }, [dispatch]);

  const handleGoogleSignIn = async () => {
    // Prevent multiple simultaneous sign-in attempts
    if (isLoading || isSigningInRef.current) {
      return;
    }

    try {
      isSigningInRef.current = true;
      setIsLoading(true);
      setError('');
      
      // Ensure auth instance is ready
      if (!auth || !googleProvider) {
        throw new Error('Firebase authentication is not properly initialized');
      }
      
      // Wait for auth to be ready before attempting sign-in
      try {
        await auth.authStateReady();
      } catch (readyError) {
        console.warn('Auth state ready warning:', readyError);
        // Continue anyway, auth might still work
      }
      
      // Use a timeout to prevent hanging promises
      const signInPromise = signInWithPopup(auth, googleProvider);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign-in timeout')), 30000)
      );
      
      const result = await Promise.race([signInPromise, timeoutPromise]);
      const user = result.user;
      
      // Create/verify seller in backend database - creates new seller if doesn't exist
      try {
        const result = await getSellerId(
          user.email,
          user.uid,
          user.displayName,
          user.photoURL
        );

        if (result.success && result.sellerId) {
          console.log('✅ Seller created/verified in backend:', result.seller);
          // Store sellerId in the login payload and allow access
          dispatch({ 
            type: 'LOGIN', 
            payload: {
              username: user.displayName || user.email || 'User',
              email: user.email,
              photoURL: user.photoURL,
              uid: user.uid,
              sellerId: result.sellerId,
              upiId: result.seller?.upiId || ''
            }
          });
        } else {
          // Handle different error status codes
          if (result.status === 403) {
            // Account inactive
            setError(result.error || 'Your account has been deactivated. Please contact administrator.');
            auth.signOut().catch(console.error);
            return;
          } else {
            // Other backend errors
            setError(result.error || 'Unable to verify your account. Please try again or contact support.');
            auth.signOut().catch(console.error);
            return;
          }
        }
      } catch (authError) {
        // If backend is not available, deny access for security
        console.error('Backend auth error:', authError);
        setError('Unable to connect to server. Please check your connection and try again.');
        auth.signOut().catch(console.error);
        return;
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Failed to sign in with Google';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in popup was closed. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Using redirect method instead...';
        // Fallback to redirect if popup is blocked
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // Redirect will happen, component will unmount
        } catch (redirectError) {
          errorMessage = 'Failed to sign in. Please allow popups or try again.';
        }
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Only one popup request is allowed at a time. Please wait and try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.message === 'Sign-in timeout') {
        errorMessage = 'Sign-in took too long. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      // Only reset ref after a delay to prevent immediate retry
      setTimeout(() => {
        isSigningInRef.current = false;
      }, 1000);
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;
    
    // Wait for auth to be ready, then set up listener
    const setupAuthListener = async () => {
      try {
        // Wait for auth to initialize
        await auth.authStateReady();
        
        if (!isMounted) return;
        
        // Helper function to create/verify seller and dispatch login
        const handleUserLogin = async (user) => {
          if (!user) return;
          
          try {
            const result = await getSellerId(
              user.email,
              user.uid,
              user.displayName,
              user.photoURL
            );

            if (result.success && result.sellerId) {
              // Seller created/verified - allow access
              console.log('✅ Seller created/verified in backend:', result.seller);
              dispatch({ 
                type: 'LOGIN', 
                payload: {
                  username: user.displayName || user.email || 'User',
                  email: user.email,
                  photoURL: user.photoURL,
                  uid: user.uid,
                  sellerId: result.sellerId
                }
              });
            } else if (result.status === 403) {
              // Account inactive - deny access
              console.warn('Access denied: Seller account is inactive');
              auth.signOut().catch(console.error);
            } else {
              // Other backend errors - deny access for security
              console.error('Backend verification failed:', result.error);
              auth.signOut().catch(console.error);
            }
          } catch (authError) {
            // Backend unavailable - deny access for security
            console.error('Backend auth error:', authError);
            auth.signOut().catch(console.error);
          }
        };
        
        // Check current user first
        if (auth.currentUser) {
          await handleUserLogin(auth.currentUser);
        }
        
        // Set up listener for auth state changes
        unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (!isMounted) return;
          
          if (user) {
            await handleUserLogin(user);
          }
        });
      } catch (error) {
        console.error('Error setting up auth state listener:', error);
      }
    };
    
    setupAuthListener();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-[#06080f] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl border border-white/40 shadow-2xl shadow-black/30 backdrop-blur-xl p-10 space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-xl ring-2 ring-blue-200/60 bg-black">
            <img
              src={logoSrc}
              alt="Drag & Drop"
              className="w-full h-full object-cover object-center scale-[1.35]"
              loading="lazy"
              onError={(e) => { e.currentTarget.src = `${process.env.PUBLIC_URL || ''}/assets/drag-drop-logo.png`; }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Sign in to Drag & Drop</h2>
          <p className="text-sm text-slate-500">
            Use Google Single Sign-On to access your unified retail workspace.
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-white text-slate-800 font-medium py-3.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400"></div>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google logo"
                className="w-6 h-6"
              />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {error && (
          <p className="text-sm text-red-600 text-center bg-red-50 border border-red-100 p-3 rounded-lg">{error}</p>
        )}

        <div className="text-xs text-slate-400 space-y-1">
          <p>By signing in, you agree to Drag & Drop’s usage policies. We never store your Google password.</p>
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            View Terms & Conditions
          </button>
        </div>
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white max-w-3xl w-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Drag & Drop Terms & Conditions</h2>
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-4 text-sm text-slate-700 max-h-[70vh]">
              <p>
                These Terms & Conditions govern your use of the Drag & Drop inventory management platform. By
                authenticating, you agree to comply with the following policies designed for retailers managing
                inventory, billing, and customer data.
              </p>
              <ol className="list-decimal list-inside space-y-3">
                <li>
                  <strong>Account Responsibility.</strong> Each seller account is for a single business entity.
                  You are responsible for safeguarding login credentials and restricting access to authorized
                  team members only.
                </li>
                <li>
                  <strong>Data Accuracy.</strong> You agree to maintain accurate product, customer, and order
                  information. Inventory adjustments, returns, and write-offs should be recorded promptly to keep
                  analytics reliable.
                </li>
                <li>
                  <strong>Usage Limits & Plans.</strong> Plan quotas for customers, products, and orders are
                  enforced automatically. When limits are reached, Drag & Drop may pause record creation, prompt
                  you to upgrade, or stack an additional plan order, according to your configuration.
                </li>
                <li>
                  <strong>Billing & Payments.</strong> Paid plan charges are due in advance. Failed payments may
                  result in a downgrade or suspension until the balance is cleared. All fees are non-refundable
                  unless required by law.
                </li>
                <li>
                  <strong>Integrations & Automation.</strong> When enabling automations, webhooks, or third-party
                  integrations, you are responsible for configuration and any resulting actions (for example,
                  automated stock adjustments or notifications).
                </li>
                <li>
                  <strong>Compliance & Security.</strong> You must comply with applicable laws regarding taxes,
                  invoicing, and data privacy. Drag & Drop encrypts data in transit and at rest; however, you are
                  responsible for securing devices that access the platform.
                </li>
                <li>
                  <strong>Prohibited Conduct.</strong> You may not misuse the platform to store unlawful content,
                  interfere with system operations, or share access with competitors with the intent to reverse
                  engineer or benchmark proprietary features.
                </li>
                <li>
                  <strong>Data Retention.</strong> Inventory, billing, and activity data are retained for the
                  duration of your subscription. Upon cancellation, you may export records before the account is
                  closed. Drag & Drop may retain anonymized usage metrics for product improvement.
                </li>
                <li>
                  <strong>Service Modifications.</strong> We may add, change, or sunset features with reasonable
                  notice. Critical changes affecting plan limits or pricing will be communicated to account owners
                  via email or in-app announcements.
                </li>
                <li>
                  <strong>Termination.</strong> Drag & Drop reserves the right to suspend or terminate accounts
                  that violate these terms or present security risks. You may terminate at any time by contacting
                  support; outstanding invoices remain payable.
                </li>
              </ol>
              <p className="text-xs text-slate-500">
                By continuing to use Drag & Drop, you acknowledge that these Terms & Conditions may be updated from
                time to time. We will notify account owners of material changes. For questions, contact
                support@draganddrop.com.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
