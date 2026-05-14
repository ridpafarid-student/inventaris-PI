// ============================================
// MAIN APP - Inventaris Barang
// ============================================

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Layout from '@/pages/Layout';
import Dashboard from '@/pages/Dashboard';
import DataBarang from '@/pages/DataBarang';
import TransaksiStok from '@/pages/TransaksiStok';
import Riwayat from '@/pages/Riwayat';
import Laporan from '@/pages/Laporan';
import Users from '@/pages/Users';
import ServiceStatus from '@/pages/ServiceStatus';
import SeedData from '@/pages/SeedData';
import { Toaster } from '@/components/ui/sonner';

// Main App Component
function AppContent() {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Render page content
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'barang':
        return <DataBarang />;
      case 'transaksi':
        return <TransaksiStok />;
      case 'riwayat':
        return <Riwayat />;
      case 'laporan':
        return <Laporan />;
      case 'users':
        return <Users />;
      case 'servis':
        return <ServiceStatus />;
      case 'seed':
        return <SeedData />;
      default:
        return <Dashboard />;
    }
  };

  // Not logged in - show login
  if (!currentUser) {
    return <Login />;
  }

  // Logged in - show main app
  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

// App with Providers
function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
