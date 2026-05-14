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
  Database
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
  { id: 'seed', label: 'Developer Tools', icon: Database, adminOnly: true },
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
    <div className="flex flex-col h-full text-white" style={{
      backgroundColor: '#1a1a2e',
      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.1) 0%, transparent 50%)',
    }}>
      {/* Logo / Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md" style={{ backgroundColor: '#6366f1' }}>
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-white">M-THREE COMPUTER</p>
            <p className="text-[10px] font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Service & Accessories</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-white/10" style={{ backgroundColor: 'rgba(99,102,241,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow" style={{ backgroundColor: '#6366f1' }}>
            <span className="font-bold text-sm text-white">
              {userName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white truncate">{userName}</p>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              isAdmin
                ? 'bg-orange-500/20 text-orange-300'
                : 'bg-indigo-400/20 text-indigo-300'
            }`}>
              {userRole === 'admin' ? '⚙ Administrator' : '👤 Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Menu Utama</p>

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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
                style={{
                  backgroundColor: isActive || isParentActive ? '#6366f1' : 'transparent',
                  color: isActive || isParentActive ? 'white' : 'rgba(255,255,255,0.55)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isParentActive) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(99,102,241,0.15)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isParentActive) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
                  }
                }}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
                <span className="font-medium text-sm flex-1">{item.label}</span>
                {hasChildren && (
                  isOpen
                    ? <ChevronDown className="w-4 h-4 ml-auto" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    : <ChevronRight className="w-4 h-4 ml-auto" style={{ color: 'rgba(255,255,255,0.4)' }} />
                )}
                {isActive && !hasChildren && <span className="w-1.5 h-1.5 bg-orange-400 rounded-full ml-auto shrink-0" />}
              </button>

              {/* Sub-menu */}
              {hasChildren && isOpen && (
                <div className="ml-4 mt-1 space-y-0.5 border-l pl-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = currentPage === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 text-sm"
                        style={{
                          backgroundColor: isChildActive ? 'rgba(99,102,241,0.5)' : 'transparent',
                          color: isChildActive ? 'white' : 'rgba(255,255,255,0.45)',
                          fontWeight: isChildActive ? '500' : '400',
                        }}
                        onMouseEnter={(e) => {
                          if (!isChildActive) {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(99,102,241,0.15)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'white';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isChildActive) {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)';
                          }
                        }}
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
      <div className="px-3 py-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 font-medium text-sm"
          style={{ color: 'rgba(255,100,100,0.7)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgb(255,120,120)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,80,80,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,100,0.7)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
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
      <header className="lg:hidden border-b sticky top-0 z-50" style={{ backgroundColor: '#1a1a2e', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: '#6366f1' }}>
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">M-THREE</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: 'rgba(255,255,255,0.6)' }}>
              {userData?.role === 'admin' ? 'Admin' : 'Staff'}
            </span>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10">
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
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
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
