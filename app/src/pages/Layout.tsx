// ============================================
// PAGE - Layout M-THREE COMPUTER (Redesigned)
// ============================================

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  History,
  FileText,
  Wrench,
  Users,
  Menu,
  LogOut,
  ChevronDown,
  ChevronRight,
  Package,
  AlertTriangle,
  TrendingDown,
  Monitor,
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
  children?: { id: string; label: string; icon: React.ElementType }[];
}

interface LayoutNavContentProps {
  visibleNavItems: NavItem[];
  currentPage: string;
  onNavigate: (pageId: string) => void;
  onLogout: () => Promise<void>;
  userName?: string;
  userRole?: string;
  isAdmin: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'inventaris',
    label: 'Inventaris',
    icon: Boxes,
    children: [
      { id: 'barang', label: 'Semua Barang', icon: Package },
      { id: 'transaksi', label: 'Barang Masuk/Keluar', icon: ArrowLeftRight },
      { id: 'riwayat', label: 'Riwayat Stok', icon: History },
    ],
  },
  { id: 'servis', label: 'Jasa Servis', icon: Wrench },
  { id: 'laporan', label: 'Laporan', icon: FileText, adminOnly: true },
  { id: 'users', label: 'User', icon: Users, adminOnly: true },
];

const inventarisChildIds = ['barang', 'transaksi', 'riwayat'];

function LayoutNavContent({
  visibleNavItems,
  currentPage,
  onNavigate,
  onLogout,
  userName,
  userRole,
  isAdmin,
}: LayoutNavContentProps) {
  const isInventarisActive = inventarisChildIds.includes(currentPage);
  const [inventarisOpen, setInventarisOpen] = useState(isInventarisActive);

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      setInventarisOpen((prev) => !prev);
    } else {
      onNavigate(item.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1E3A8A] text-white">
      {/* Logo / Brand */}
      <div className="px-5 py-5 border-b border-blue-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0077CC] rounded-lg flex items-center justify-center shadow-md">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-white">M-THREE COMPUTER</p>
            <p className="text-[10px] text-blue-300 font-medium tracking-wide uppercase">Service & Accessories</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-blue-700/50 bg-blue-900/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0077CC] rounded-full flex items-center justify-center shrink-0 shadow">
            <span className="font-bold text-sm text-white">
              {userName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white truncate">{userName}</p>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              isAdmin
                ? 'bg-orange-500/20 text-orange-300'
                : 'bg-blue-400/20 text-blue-300'
            }`}>
              {userRole === 'admin' ? '⚙ Administrator' : '👤 Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 px-3 mb-3">Menu Utama</p>

        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const hasChildren = !!item.children;
          const isParentActive = hasChildren && inventarisChildIds.includes(currentPage);
          const isOpen = hasChildren && inventarisOpen;

          return (
            <div key={item.id}>
              <button
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                  isActive || isParentActive
                    ? 'bg-[#0077CC] text-white shadow-md'
                    : 'text-blue-200 hover:bg-blue-800/50 hover:text-white'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
                <span className="font-medium text-sm flex-1">{item.label}</span>
                {hasChildren && (
                  isOpen
                    ? <ChevronDown className="w-4 h-4 text-blue-300 ml-auto" />
                    : <ChevronRight className="w-4 h-4 text-blue-300 ml-auto" />
                )}
                {isActive && !hasChildren && <span className="w-1.5 h-1.5 bg-orange-400 rounded-full ml-auto shrink-0" />}
              </button>

              {/* Sub-menu */}
              {hasChildren && isOpen && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-blue-700/50 pl-3">
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = currentPage === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 text-sm ${
                          isChildActive
                            ? 'bg-[#0077CC]/80 text-white font-medium'
                            : 'text-blue-300 hover:bg-blue-800/50 hover:text-white'
                        }`}
                      >
                        <ChildIcon className="w-3.5 h-3.5 shrink-0" style={{ width: '14px', height: '14px' }} />
                        {child.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-blue-700/50">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-300 hover:text-red-200 hover:bg-red-900/30 gap-3 font-medium text-sm"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

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

  const visibleNavItems = navItems.filter(item =>
    !item.adminOnly || isAdmin
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Mobile Header */}
      <header className="lg:hidden bg-[#1E3A8A] border-b border-blue-800 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#0077CC] rounded-md flex items-center justify-center">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">M-THREE</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-800 text-blue-200 px-2 py-1 rounded font-medium">
              {userData?.role === 'admin' ? 'Admin' : 'Staff'}
            </span>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-blue-800">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 border-0">
                <LayoutNavContent
                  visibleNavItems={visibleNavItems}
                  currentPage={currentPage}
                  onNavigate={handleNavClick}
                  onLogout={handleLogout}
                  userName={userData?.name}
                  userRole={userData?.role}
                  isAdmin={isAdmin}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 shadow-xl">
          <LayoutNavContent
            visibleNavItems={visibleNavItems}
            currentPage={currentPage}
            onNavigate={handleNavClick}
            onLogout={handleLogout}
            userName={userData?.name}
            userRole={userData?.role}
            isAdmin={isAdmin}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:min-h-0 overflow-x-hidden">
          {/* Top bar */}
          <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 shadow-xs sticky top-0 z-10">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                M-THREE COMPUTER — Admin Panel
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#1E3A8A] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{userData?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">{userData?.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isAdmin ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {userData?.role === 'admin' ? 'Administrator' : 'Staff'}
                </span>
              </div>
              <div className="w-px h-5 bg-gray-200" />
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <TrendingDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
