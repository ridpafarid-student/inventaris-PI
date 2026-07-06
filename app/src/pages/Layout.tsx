// ============================================
// PAGE - Layout M-THREE COMPUTER (Redesigned)
// ============================================

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  Database,
  Shield,
  UserCircle,
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
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'inventaris',
    label: 'Inventaris',
    icon: Boxes,
    children: [
      { id: 'barang', label: 'Data Barang', icon: Package },
      { id: 'transaksi', label: 'Mutasi Stok', icon: ArrowLeftRight },
      { id: 'riwayat', label: 'Riwayat Transaksi', icon: History },
    ],
  },
  { id: 'servis', label: 'Jasa Servis', icon: Wrench },
  { id: 'laporan', label: 'Laporan', icon: FileText, adminOnly: true },
  { id: 'users', label: 'Pengguna', icon: Users, adminOnly: true },
  { id: 'seed', label: 'Developer Tools', icon: Database, adminOnly: true },
];

const inventarisChildIds = ['barang', 'transaksi', 'riwayat'];

function LayoutNavContent({
  visibleNavItems,
  currentPage,
    onNavigate,
  userName,
  userRole,
  onLogout,
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
    <div className="flex flex-col h-full bg-surface-base text-text-primary">
            {/* Logo / Brand */}
            <div className="px-4 pt-6 pb-5 border-b border-border-default">
              <div className="flex items-center justify-start">
                <Logo width={180} height={45} />
              </div>
            </div>

                        {/* User Info */}
            <div className="px-4 py-4 border-b border-border-default">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm text-text-primary truncate">{userName}</p>
                                <span className={`text-xs px-2 py-0.5 rounded border shrink-0 font-medium inline-flex items-center gap-1 ${
                  userRole === 'admin'
                    ? 'bg-status-info/10 border-status-info/40 text-status-info'
                    : 'bg-surface-muted border-border-default text-text-secondary'
                }`}>
                  {userRole === 'admin' ? (
                    <Shield style={{ width: '12px', height: '12px' }} />
                  ) : (
                    <UserCircle style={{ width: '12px', height: '12px' }} />
                  )}
                  {userRole === 'admin' ? 'Admin' : 'Teknisi'}
                </span>
              </div>
            </div>

            {/* Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest px-0 mb-3 text-text-secondary/50">
          Menu Utama
        </p>

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
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm text-left transition-all duration-200 focus-visible:outline-none focus-visible:shadow-focus relative ${
                  isActive || isParentActive
                      ? 'bg-black/15 dark:bg-white/15 text-text-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-text-primary before:rounded-r-full'
                      : 'bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary hover:translate-x-0.5'
                }`}
              >
                                                                <Icon style={{ width: '20px', height: '20px' }} className={`shrink-0 transition-transform duration-200 ${(isActive || isParentActive) ? 'text-text-primary' : ''}`} />
                <span className={`font-medium text-sm flex-1 transition-colors duration-200 ${(isActive || isParentActive) ? 'text-text-primary' : ''}`}>{item.label}</span>
                                {hasChildren && (
                                    isOpen
                    ? <ChevronDown style={{ width: '20px', height: '20px' }} className="ml-auto text-text-secondary/50" />
                    : <ChevronRight style={{ width: '20px', height: '20px' }} className="ml-auto text-text-secondary/50" />
                )}
              </button>

              {/* Sub-menu */}
              {hasChildren && isOpen && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-border-default/10 pl-3">
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = currentPage === child.id;
                    return (
                                            <button
                        key={child.id}
                        onClick={() => onNavigate(child.id)}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-left transition-all duration-200 text-sm focus-visible:outline-none focus-visible:shadow-focus relative ${
                          isChildActive
                              ? 'bg-black/15 dark:bg-white/15 font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-text-primary before:rounded-r-full'
                              : 'bg-transparent text-text-secondary font-normal hover:bg-surface-muted hover:text-text-primary hover:translate-x-0.5'
                        }`}
                      >
                                                                                                <ChildIcon style={{ width: '16px', height: '16px' }} className={`shrink-0 transition-transform duration-200 ${isChildActive ? 'text-text-primary' : ''}`} />
                        <span className={`transition-colors duration-200 ${isChildActive ? 'text-text-primary' : ''}`}>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

            {/* Logout Button */}
            <div className="px-3 py-4 border-t border-border-default">
                            <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-left transition-all duration-200 text-red-500 hover:bg-red-500/10 hover:translate-x-0.5 focus-visible:outline-none focus-visible:shadow-focus"
              >
                <LogOut style={{ width: '20px', height: '20px' }} className="shrink-0" />
                <span className="font-medium text-sm flex-1">Logout</span>
              </button>
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
    <div className="min-h-screen bg-surface-muted">
            {/* Mobile Header */}
      <header className="lg:hidden border-b border-border-default sticky top-0 z-50 bg-surface-base">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-text-primary hover:bg-surface-muted focus-visible:shadow-focus">
                  <Menu style={{ width: '20px', height: '20px' }} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 border-0">
                <LayoutNavContent
                  visibleNavItems={visibleNavItems}
                  currentPage={currentPage}
                  onNavigate={handleNavClick}
                  userName={userData?.name}
                                    userRole={userData?.role}
                  onLogout={handleLogout}
                />
              </SheetContent>
            </Sheet>
          </div>

                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                                            <span className={`text-xs px-2 py-0.5 rounded border font-medium inline-flex items-center gap-1 ${
                        userData?.role === 'admin'
                          ? 'bg-status-info/10 border-status-info/40 text-status-info'
                          : 'bg-surface-muted border-border-default text-text-secondary'
                                            }`}>
                        {userData?.role === 'admin' ? (
                          <Shield style={{ width: '12px', height: '12px' }} />
                        ) : (
                          <UserCircle style={{ width: '12px', height: '12px' }} />
                        )}
                        {userData?.role === 'admin' ? 'Admin' : 'Teknisi'}
                      </span>
                    </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 shadow-elevated">
          <LayoutNavContent
            visibleNavItems={visibleNavItems}
            currentPage={currentPage}
            onNavigate={handleNavClick}
            userName={userData?.name}
            userRole={userData?.role}
            onLogout={handleLogout}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:min-h-0 overflow-x-hidden">
                    {/* Top bar */}
                    <div className="hidden lg:flex items-center justify-between px-8 py-6 bg-surface-base border-b border-border-default shadow-card sticky top-0 z-10">
            <div>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">
                MTHREE COMPUTER — {isAdmin ? 'Admin Panel' : 'Teknisi Panel'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
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
