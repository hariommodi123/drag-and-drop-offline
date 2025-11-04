import React from 'react';
import { useApp } from '../../context/AppContext';
import { Crown, Check, Star, Zap, Shield, Users, Lock, Unlock } from 'lucide-react';

const Upgrade = () => {
  const { state, dispatch } = useApp();

  const plans = [
    {
      id: 'basic',
      name: 'Plan A - Basic',
      price: '₹299',
      period: 'per month',
      maxCustomers: 149,
      maxProducts: 499,
      unlockedModules: [
        'Dashboard',
        'Customers',
        'Products', 
        'Inventory',
        'Billing'
      ],
      lockedModules: [
        'Purchase Orders',
        'Financial',
        'AI Assistant',
        'Reports',
        'Settings (only basic)'
      ],
      description: 'Best for small grocery shops needing simple billing & stock tracking.',
      current: state.currentPlan === 'basic',
      color: 'green',
      icon: '🥉'
    },
    {
      id: 'standard',
      name: 'Plan B - Standard',
      price: '₹999',
      period: 'per month',
      maxCustomers: 299,
      maxProducts: 899,
      unlockedModules: [
        'Dashboard',
        'Customers',
        'Products',
        'Inventory', 
        'Billing',
        'Purchase Orders',
        'Reports (basic analytics)'
      ],
      lockedModules: [
        'Financial',
        'AI Assistant (only text access)',
        'Settings (no user management)'
      ],
      description: 'Ideal for medium-sized stores managing suppliers & reports.',
      popular: true,
      current: state.currentPlan === 'standard',
      color: 'blue',
      icon: '🥈'
    },
    {
      id: 'premium',
      name: 'Plan C - Premium',
      price: '₹1299',
      period: 'per month',
      maxCustomers: 'Unlimited',
      maxProducts: 'Unlimited',
      unlockedModules: [
        'Dashboard',
        'Customers',
        'Products',
        'Inventory',
        'Billing',
        'Purchase Orders',
        'Financial',
        'AI Assistant (voice + smart billing)',
        'Reports (advanced insights)',
        'Settings (full admin control)'
      ],
      lockedModules: [],
      description: 'Complete solution for growing grocery businesses.',
      current: state.currentPlan === 'premium',
      color: 'purple',
      icon: '🥇'
    }
  ];

  const getPlanColor = (color) => {
    const colors = {
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500'
    };
    return colors[color] || 'bg-gray-500';
  };

  const getPlanBorderColor = (color) => {
    const colors = {
      green: 'border-green-200',
      blue: 'border-blue-200',
      purple: 'border-purple-200'
    };
    return colors[color] || 'border-gray-200';
  };

  const handlePlanSelect = (planId) => {
    dispatch({ type: 'SET_CURRENT_PLAN', payload: planId });
    window.showToast(`Plan updated to ${plans.find(p => p.id === planId)?.name}!`, 'success');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-full">
            <Crown className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Unlock the full potential of your grocery business with our advanced features and tools.
        </p>
        
        {/* Upgrade Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
          <div className="flex items-center justify-center text-blue-800">
            <Crown className="h-5 w-5 mr-2" />
            <span className="font-medium">How to Upgrade:</span>
          </div>
          <p className="text-blue-700 text-sm mt-2">
            Simply click on any plan card below to instantly upgrade your account. 
            All features will be unlocked immediately!
          </p>
        </div>
      </div>

      {/* Current Subscription Status */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Current Plan: {plans.find(p => p.current)?.name || 'Basic'}</h2>
            <p className="text-green-100">{plans.find(p => p.current)?.description}</p>
            <p className="text-green-100 text-sm mt-2">
              💡 Click any plan below to upgrade instantly!
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{plans.find(p => p.current)?.price || '₹299'}</p>
            <p className="text-green-100">{plans.find(p => p.current)?.period || 'per month'}</p>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl shadow-lg border-2 ${getPlanBorderColor(plan.color)} ${
              plan.popular ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
            } ${plan.current ? 'opacity-75' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  Most Popular
                </div>
              </div>
            )}

            {plan.current && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Current Plan
                </div>
              </div>
            )}

            <div className="p-8">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">{plan.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
              </div>

              {/* Limits */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Limits</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Customers:</span>
                    <span className="font-medium">{plan.maxCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Products:</span>
                    <span className="font-medium">{plan.maxProducts}</span>
                  </div>
                </div>
              </div>

              {/* Unlocked Modules */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Unlock className="h-4 w-4 mr-2 text-green-500" />
                  Unlocked Modules
                </h4>
                <ul className="space-y-2">
                  {plan.unlockedModules.map((module, moduleIndex) => (
                    <li key={moduleIndex} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{module}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Locked Modules */}
              {plan.lockedModules.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Lock className="h-4 w-4 mr-2 text-red-500" />
                    Locked Modules
                  </h4>
                  <ul className="space-y-2">
                    {plan.lockedModules.map((module, moduleIndex) => (
                      <li key={moduleIndex} className="flex items-start">
                        <Lock className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-500">{module}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => handlePlanSelect(plan.id)}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  plan.current
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                    : plan.color === 'green'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
                disabled={plan.current}
              >
                {plan.current ? 'Current Plan' : plan.popular ? 'Upgrade Now' : 'Choose Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Features Comparison */}
      <div className="bg-gray-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Feature Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600">Optimized performance for quick operations</p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
            <p className="text-gray-600">Your data is safe with enterprise-grade security</p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Collaboration</h3>
            <p className="text-gray-600">Work together with your team seamlessly</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I change my plan anytime?</h3>
            <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
            <p className="text-gray-600">Yes, all paid plans come with a 14-day free trial. No credit card required.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
            <p className="text-gray-600">We accept all major credit cards, UPI, and bank transfers.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;



