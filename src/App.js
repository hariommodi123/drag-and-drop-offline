import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login/Login';
import Layout from './components/Layout/Layout';
import Routes from './components/Routes/Routes';
import SellerRegistrationForm from './components/Onboarding/SellerRegistrationForm';

const AppContent = () => {
  const { state } = useApp();

  if (!state.isAuthenticated) {
    return <Login />;
  }

  if (!state.currentUser?.profileCompleted) {
    return <SellerRegistrationForm />;
  }

  return (
    <div className="App">
      <Layout>
        <Routes />
      </Layout>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
