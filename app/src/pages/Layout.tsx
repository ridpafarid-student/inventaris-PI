// ============================================
// PAGE - Layout dengan Sidebar & Navigation
// ============================================

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Package,
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  History,
  FileText,
  Users,
  Menu,
  LogOut,
  ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'barang', label: 'Data Barang', icon: Boxes },
  { id: 'transaksi', label: 'Stok Masuk/Keluar', icon: ArrowLeftRight },
  { id: 'riwayat', label: 'Riwayat', icon: History },
  { id: 'laporan', label: 'Laporan', icon: FileText, adminOnly: true },
  { id: 'users', label: 'Pengguna', icon: Users, adminOnly: true },
];

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const { userData, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleNavClick = (pageId: string) => {
    onPageChange(pageId);
    setMobileMenuOpen(false);
  };

  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item => 
    !item.adminOnly || isAdmin
  );

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900">Inventaris</h1>
            <p className="text-xs text-gray-500">Manajemen Stok</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="font-semibold text-gray-600">
              {userData?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">
              {userData?.name}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isAdmin 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {userData?.role === 'admin' ? 'Administrator' : 'Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Keluar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Inventaris</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {userData?.role === 'admin' ? 'Admin' : 'Staff'}
            </span>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <NavContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 bg-white border-r h-screen sticky top-0">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:min-h-0">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
