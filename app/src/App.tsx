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

const ADMIN_ONLY_PAGES = ['laporan', 'users', 'seed'];

// Main App Component
function AppContent() {
  const { currentUser, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const effectivePage = !isAdmin && ADMIN_ONLY_PAGES.includes(currentPage) ? 'dashboard' : currentPage;

  const handlePageChange = (page: string) => {
    setCurrentPage(!isAdmin && ADMIN_ONLY_PAGES.includes(page) ? 'dashboard' : page);
  };

  // Render page content
  const renderPage = () => {
    switch (effectivePage) {
      case 'dashboard':
        return <Dashboard onPageChange={handlePageChange} />;
      case 'barang':
        return <DataBarang />;
      case 'transaksi':
        return <TransaksiStok />;
      case 'riwayat':
        return <Riwayat />;
      case 'laporan':
        return isAdmin ? <Laporan /> : <Dashboard onPageChange={handlePageChange} />;
      case 'users':
        return isAdmin ? <Users /> : <Dashboard onPageChange={handlePageChange} />;
      case 'servis':
        return <ServiceStatus />;
      case 'seed':
        return isAdmin ? <SeedData /> : <Dashboard onPageChange={handlePageChange} />;
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
    <Layout currentPage={effectivePage} onPageChange={handlePageChange}>
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
