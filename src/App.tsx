import React, { useState, useEffect } from 'react';
import { useRestaurant } from './context/RestaurantContext';
import { useTheme } from './context/ThemeContext';
import { CustomerMenu } from './pages/customer/CustomerMenu';
import { OrderTracker } from './pages/customer/OrderTracker';
import { Login } from './pages/auth/Login';
import { AdminDashboard } from './pages/owner/AdminDashboard';
import { OrdersManager } from './pages/owner/OrdersManager';
import { TablesManager } from './pages/owner/TablesManager';
import { MenuManager } from './pages/owner/MenuManager';
import { BillingManager } from './pages/owner/BillingManager';
import { ReportsManager } from './pages/owner/ReportsManager';
import { SettingsManager } from './pages/owner/SettingsManager';
import { KitchenDisplay } from './pages/kitchen/KitchenDisplay';
import { WaiterDashboard } from './pages/waiter/WaiterDashboard';

import { 
  TrendingUp, 
  ShoppingBag, 
  QrCode, 
  Utensils, 
  Receipt, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut, 
  ChefHat, 
  User, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const App: React.FC = () => {
  const { currentUser, logoutUser, loading, settings } = useRestaurant();
  const { theme, toggleTheme } = useTheme();

  // Navigation Routing States
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync route on browser navigation (back/forward)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Update hash if tab changes (so POS link redirects work)
  useEffect(() => {
    if (currentPath === '/admin' || currentPath === '/dashboard' || currentPath === '/') {
      if (currentHash === '#billing') {
        setActiveTab('billing');
      } else if (currentHash === '#menu') {
        setActiveTab('menu');
      }
    }
  }, [currentHash, currentPath]);

  const navigateTo = (path: string, hash: string = '') => {
    window.history.pushState(null, '', path + hash);
    setCurrentPath(path);
    setCurrentHash(hash);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Bootstrapping Bistro System...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ROUTING PARSING
  // ==========================================

  // Check if Customer Menu route: /menu/:tableId
  const menuMatch = currentPath.match(/^\/menu\/([^/]+)$/);
  // Check if Order Tracker route: /menu/:tableId/track/:orderId
  const trackerMatch = currentPath.match(/^\/menu\/([^/]+)\/track\/([^/]+)$/);

  if (trackerMatch) {
    const [, tableId, orderId] = trackerMatch;
    return <OrderTracker tableId={tableId} orderId={orderId} />;
  }

  if (menuMatch) {
    const [, tableId] = menuMatch;
    return <CustomerMenu tableId={tableId} />;
  }

  // Kitchen direct display access
  if (currentPath === '/kitchen' || currentHash === '#kitchen') {
    return (
      <div className="relative">
        <button 
          onClick={() => navigateTo('/')}
          className="absolute top-4 left-4 bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-700 z-50 transition-colors"
        >
          &larr; Exit KDS
        </button>
        <KitchenDisplay />
      </div>
    );
  }

  // Waiter direct display access
  if (currentPath === '/waiter' || currentHash === '#waiter') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative">
        <button 
          onClick={() => navigateTo('/')}
          className="absolute top-4 right-4 bg-slate-205 dark:bg-slate-900 border dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-200 z-50 transition-all"
        >
          &larr; Exit Console
        </button>
        <WaiterDashboard />
      </div>
    );
  }

  // Staff Login Rerouting
  if (currentPath === '/login' || currentHash === '#login') {
    if (currentUser) {
      navigateTo('/admin');
    } else {
      return <Login onSuccess={() => navigateTo('/admin')} />;
    }
  }

  // ==========================================
  // MANAGEMENT SIDEBAR PORTAL RENDER
  // ==========================================
  if (currentPath === '/admin' || currentPath === '/dashboard') {
    if (!currentUser) {
      return <Login onSuccess={() => navigateTo('/admin')} />;
    }

    // Role-based rendering filters
    const isRole = (roles: string[]) => roles.includes(currentUser.role);

    // KDS redirect for kitchen staff
    if (currentUser.role === 'kitchen') {
      return (
        <div className="relative">
          <button 
            onClick={async () => { await logoutUser(); navigateTo('/'); }}
            className="absolute top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 z-50 flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
          <KitchenDisplay />
        </div>
      );
    }

    // Waiter Console redirect for waiters
    if (currentUser.role === 'waiter') {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 relative">
          <button 
            onClick={async () => { await logoutUser(); navigateTo('/'); }}
            className="absolute top-4 right-4 bg-slate-205 dark:bg-slate-900 border dark:border-slate-800 text-slate-700 dark:text-slate-350 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 z-50 flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
          <WaiterDashboard />
        </div>
      );
    }

    // Sidebar items based on role permissions
    const sidebarItems = [
      { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, roles: ['admin', 'manager'] },
      { id: 'orders', label: 'Live Orders', icon: ShoppingBag, roles: ['admin', 'manager', 'cashier'] },
      { id: 'tables', label: 'Table & QR', icon: QrCode, roles: ['admin', 'manager'] },
      { id: 'menu', label: 'Menu List', icon: Utensils, roles: ['admin', 'manager'] },
      { id: 'billing', label: 'POS Billing', icon: Receipt, roles: ['admin', 'manager', 'cashier'] },
      { id: 'reports', label: 'Analytics', icon: FileText, roles: ['admin'] },
      { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['admin'] },
    ].filter(item => isRole(item.roles));

    // Render active tab body
    const renderActiveTabContent = () => {
      switch (activeTab) {
        case 'dashboard': return <AdminDashboard />;
        case 'orders': return <OrdersManager />;
        case 'tables': return <TablesManager />;
        case 'menu': return <MenuManager />;
        case 'billing': return <BillingManager />;
        case 'reports': return <ReportsManager />;
        case 'settings': return <SettingsManager />;
        default: return <AdminDashboard />;
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">POS Portal</span>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="p-2 rounded-xl text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Sidebar Frame */}
        <aside className={`fixed md:sticky top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-150/60 dark:border-slate-850 p-6 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="space-y-8">
            {/* Sidebar Top / Brand logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-brand-500/20">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-800 dark:text-slate-150 uppercase tracking-wider">POS Portal</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{currentUser.role}</p>
                </div>
              </div>

              <button 
                onClick={() => setMobileSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Menus */}
            <nav className="space-y-1">
              {sidebarItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileSidebarOpen(false);
                      navigateTo('/admin');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-850'
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Theme selector */}
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850 transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4.5 h-4.5 text-amber-500" />
                  <span>Switch Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4.5 h-4.5 text-indigo-500" />
                  <span>Switch Dark</span>
                </>
              )}
            </button>

            {/* User Logged Details */}
            <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl text-xs space-y-1">
              <p className="font-extrabold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
            </div>

            <button
              onClick={async () => {
                await logoutUser();
                navigateTo('/');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Content Container */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
          {renderActiveTabContent()}
        </main>

      </div>
    );
  }

  // ==========================================
  // LANDING PAGE SELECTION CHANNELS (Default /)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between py-12 px-4 relative overflow-hidden">
      
      {/* Background visual graphics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header info */}
      <header className="max-w-4xl mx-auto w-full text-center space-y-3 z-10">
        <div className="bg-brand-500/15 border border-brand-500/20 text-brand-655 dark:text-brand-400 px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>QR SaaS Platform Suite</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-sans leading-none">
          Restaurant Order Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm sm:text-base">
          A production-ready POS terminal, KDS displays, and table QR-code menus.
        </p>
      </header>

      {/* Flow Selectors Grid */}
      <main className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 my-10 z-10">
        
        {/* Customer Menu QR Bypass Card */}
        <div 
          onClick={() => navigateTo('/menu/table-3')}
          className="bg-white/70 dark:bg-slate-900/60 border border-white/20 p-8 rounded-3xl shadow-glass hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between backdrop-blur-md h-80 hover:-translate-y-1 duration-300"
        >
          <div>
            <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <QrCode className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Customer Flow</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Scan QR code standees, browse categories, filter food specs, customized kitchen instructions, and place real-time orders directly.
            </p>
          </div>
          
          <span className="text-xs font-bold text-amber-500 flex items-center gap-1 mt-4">
            <span>Scan QR Demo (Table 3)</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>

        {/* Owner POS terminal Card */}
        <div 
          onClick={() => navigateTo(currentUser ? '/admin' : '/login')}
          className="bg-white/70 dark:bg-slate-900/60 border border-white/20 p-8 rounded-3xl shadow-glass hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between backdrop-blur-md h-80 hover:-translate-y-1 duration-300"
        >
          <div>
            <div className="w-14 h-14 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mb-6 border border-brand-500/20 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Staff & Settings Portal</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Access the administrator overview cards, live cooking tickets, billing invoices, table capacities, menu organizer, and analytical reports.
            </p>
          </div>
          
          <span className="text-xs font-bold text-brand-500 flex items-center gap-1 mt-4">
            <span>Enter Staff Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>

        {/* Quick Direct links row */}
        <div className="col-span-full bg-white/40 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-150/40 dark:border-slate-850/60 flex flex-wrap gap-4 items-center justify-center text-xs font-semibold text-slate-500">
          <span>Direct Access Consoles:</span>
          <button onClick={() => navigateTo('/kitchen')} className="text-amber-500 hover:underline flex items-center gap-1">
            <ChefHat className="w-3.5 h-3.5" /> Kitchen KDS
          </button>
          <span className="text-slate-300">|</span>
          <button onClick={() => navigateTo('/waiter')} className="text-pink-500 hover:underline flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Waiter Console
          </button>
        </div>

      </main>

      {/* Footer copyright */}
      <footer className="max-w-4xl mx-auto w-full text-center text-[10px] text-slate-400 font-medium">
        <p>&copy; {new Date().getFullYear()} {settings?.name || 'The Grand Bistro'} SaaS Terminal. Apple inspired minimal design.</p>
      </footer>

    </div>
  );
};
export default App;
