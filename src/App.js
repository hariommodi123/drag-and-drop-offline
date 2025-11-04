import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login/Login';
import Layout from './components/Layout/Layout';
import Routes from './components/Routes/Routes';

const AppContent = () => {
  const { state } = useApp();

  if (!state.isAuthenticated) {
    return <Login />;
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
