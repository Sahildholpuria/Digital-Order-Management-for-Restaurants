import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useRestaurant } from './context/RestaurantContext';
import { useTheme } from './context/ThemeContext';
import { CustomerMenu } from './pages/customer/CustomerMenu';
import { OrderTracker } from './pages/customer/OrderTracker';

const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const AdminDashboard = lazy(() => import('./pages/owner/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const OrdersManager = lazy(() => import('./pages/owner/OrdersManager').then(m => ({ default: m.OrdersManager })));
const TablesManager = lazy(() => import('./pages/owner/TablesManager').then(m => ({ default: m.TablesManager })));
const MenuManager = lazy(() => import('./pages/owner/MenuManager').then(m => ({ default: m.MenuManager })));
const BillingManager = lazy(() => import('./pages/owner/BillingManager').then(m => ({ default: m.BillingManager })));
const ReportsManager = lazy(() => import('./pages/owner/ReportsManager').then(m => ({ default: m.ReportsManager })));
const SettingsManager = lazy(() => import('./pages/owner/SettingsManager').then(m => ({ default: m.SettingsManager })));
const KitchenDisplay = lazy(() => import('./pages/kitchen/KitchenDisplay').then(m => ({ default: m.KitchenDisplay })));
const WaiterDashboard = lazy(() => import('./pages/waiter/WaiterDashboard').then(m => ({ default: m.WaiterDashboard })));
const SuperAdminDashboard = lazy(() => import('./pages/owner/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));

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
  Globe,
  Shield,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { translations, Language } from './translations';

const LazyLoader = () => (
  <div className="min-h-[50vh] bg-transparent flex flex-col items-center justify-center p-6 text-center animate-fade-in">
    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin shadow-md mb-2"></div>
    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center block">Loading Panel...</span>
  </div>
);

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useRestaurant();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const typeStyles = {
          success: 'bg-emerald-500/90 text-white border-emerald-500/20 shadow-emerald-500/10',
          error: 'bg-rose-500/90 text-white border-rose-500/20 shadow-rose-500/10',
          info: 'bg-indigo-500/90 text-white border-indigo-500/20 shadow-indigo-500/10',
        };

        const icons = {
          success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
          error: <AlertCircle className="w-5 h-5 flex-shrink-0" />,
          info: <Info className="w-5 h-5 flex-shrink-0" />,
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-300 animate-slide-up ${typeStyles[toast.type]}`}
          >
            <div className="flex items-center gap-2.5">
              {icons[toast.type]}
              <span className="text-xs font-bold font-sans tracking-wide leading-snug">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const CustomConfirmModal: React.FC = () => {
  const { confirmModal, closeConfirmation } = useRestaurant();
  if (!confirmModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Scrim */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto"
        onClick={closeConfirmation}
      />
      
      {/* Modal Box */}
      <div className="relative bg-white dark:bg-slate-900 border border-slate-205/50 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-scale-in z-10 text-center pointer-events-auto">
        <div className="w-12 h-12 bg-red-500/10 dark:bg-red-955/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        
        <h3 className="text-base font-black text-slate-850 dark:text-slate-100 font-sans tracking-tight leading-tight">
          {confirmModal.title}
        </h3>
        
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
          {confirmModal.message}
        </p>
        
        <div className="flex gap-2.5 mt-6">
          <button
            onClick={closeConfirmation}
            className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmModal.onConfirm}
            className="flex-1 bg-red-650 hover:bg-red-750 text-white font-bold py-3 px-4 rounded-xl text-xs cursor-pointer shadow-md shadow-red-600/10 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { currentUser, logoutUser, loading, settings, restaurantId, setRestaurantId } = useRestaurant();
  const { theme, toggleTheme } = useTheme();

  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('admin_lang') as Language) || 'en');
  const t = translations[lang];

  // Navigation Routing States
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'orders', 'tables', 'menu', 'billing', 'reports', 'settings'];
    if (validTabs.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('pos_portal_active_tab');
    if (saved && validTabs.includes(saved)) {
      return saved;
    }
    return 'dashboard';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Trigger brief page transition loader on path or tab change
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [activeTab, currentPath, currentHash]);

  // Sync route on browser navigation (back/forward)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
      
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['superadmin', 'dashboard', 'orders', 'tables', 'menu', 'billing', 'reports', 'settings'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Automatically switch to superadmin tab on login if Super Admin
  useEffect(() => {
    if (currentUser?.isSuperAdmin) {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['superadmin', 'dashboard', 'orders', 'tables', 'menu', 'billing', 'reports', 'settings'];
      if (!validTabs.includes(hash)) {
        setActiveTab('superadmin');
      }
    }
  }, [currentUser]);

  // Persist tab change to URL hash and localStorage
  useEffect(() => {
    if (currentPath === '/admin' || currentPath === '/dashboard') {
      localStorage.setItem('pos_portal_active_tab', activeTab);
      window.history.replaceState(null, '', `${currentPath}#${activeTab}`);
    }
  }, [activeTab, currentPath]);

  const navigateTo = (path: string, hash: string = '') => {
    window.history.pushState(null, '', path + hash);
    setCurrentPath(path);
    setCurrentHash(hash);
  };

  const renderAppContent = () => {
    if (loading || isNavigating) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-955 bg-mesh flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
          {/* Glowing background aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
          
          <div className="space-y-6 max-w-sm w-full z-10">
            {/* Animated Branded Logo Container */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              {/* Pulsating glowing outline rings */}
              <div className="absolute inset-0 rounded-3xl border-2 border-brand-500/30 animate-ping duration-1000"></div>
              <div className="absolute inset-0.5 rounded-3xl border border-brand-500/20 animate-pulse"></div>
              
              {/* Core Logo Panel */}
              <div className="w-16 h-16 bg-brand-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-brand-500/30 relative">
                <ChefHat className="w-8 h-8 animate-bounce duration-2000" />
              </div>
            </div>

            {/* Text Title */}
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-805 dark:text-slate-100 tracking-tight leading-tight uppercase font-sans">
                RestaurantsOS
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest animate-pulse">
                Bootstrapping digital ecosystem...
              </p>
            </div>

            {/* Premium Progress Bar */}
            <div className="h-1 w-32 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto overflow-hidden relative shadow-inner">
              <div className="h-full bg-gradient-to-r from-brand-500 to-pink-500 w-1/2 rounded-full absolute top-0 left-0 animate-loading-bar"></div>
            </div>
          </div>
        </div>
      );
    }

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
      if (!currentUser) {
        return (
          <Suspense fallback={<LazyLoader />}>
            <Login onSuccess={() => navigateTo('/kitchen')} />
          </Suspense>
        );
      }
      if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.role !== 'kitchen') {
        return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-955 bg-mesh flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl font-black text-red-500 mb-2 font-sans tracking-tight">Access Denied</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">You do not have the required permissions to view the Kitchen Display Console.</p>
              <button onClick={() => navigateTo('/')} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors">
                Go Home
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="relative">
          <button 
            onClick={() => navigateTo('/')}
            className="absolute top-4 left-4 bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-700 z-50 transition-colors shadow-lg"
          >
            &larr; Exit KDS
          </button>
          <Suspense fallback={<LazyLoader />}>
            <KitchenDisplay />
          </Suspense>
        </div>
      );
    }

    // Waiter direct display access
    if (currentPath === '/waiter' || currentHash === '#waiter') {
      if (!currentUser) {
        return (
          <Suspense fallback={<LazyLoader />}>
            <Login onSuccess={() => navigateTo('/waiter')} />
          </Suspense>
        );
      }
      if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.role !== 'waiter') {
        return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl font-black text-red-500 mb-2 font-sans tracking-tight">Access Denied</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">You do not have the required permissions to view the Waiter Console.</p>
              <button onClick={() => navigateTo('/')} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors">
                Go Home
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-955 bg-mesh p-6 relative">
          <button 
            onClick={() => navigateTo('/')}
            className="absolute top-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 z-50 transition-all shadow-sm"
          >
            &larr; Exit Console
          </button>
          <Suspense fallback={<LazyLoader />}>
            <WaiterDashboard />
          </Suspense>
        </div>
      );
    }

    // Staff Login Rerouting
    if (currentPath === '/login' || currentHash === '#login') {
      if (currentUser) {
        navigateTo('/admin');
      } else {
        return (
          <Suspense fallback={<LazyLoader />}>
            <Login onSuccess={() => navigateTo('/admin')} />
          </Suspense>
        );
      }
    }

    // ==========================================
    // MANAGEMENT SIDEBAR PORTAL RENDER
    // ==========================================
    if (currentPath === '/admin' || currentPath === '/dashboard') {
      if (!currentUser) {
        return (
          <Suspense fallback={<LazyLoader />}>
            <Login onSuccess={() => navigateTo('/admin')} />
          </Suspense>
        );
      }

      // Role-based rendering filters (Super Admin has unrestricted bypass)
      const isRole = (roles: string[]) => currentUser?.isSuperAdmin || roles.includes(currentUser.role);

      // KDS redirect for kitchen staff
      if (currentUser.role === 'kitchen') {
        return (
          <div className="relative">
            <button 
              onClick={async () => { await logoutUser(); navigateTo('/'); }}
              className="absolute top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 z-50 flex items-center gap-1.5 transition-colors shadow-lg"
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
          <div className="min-h-screen bg-slate-50 dark:bg-slate-955 bg-mesh p-6 relative">
            <button 
              onClick={async () => { await logoutUser(); navigateTo('/'); }}
              className="absolute top-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 z-50 flex items-center gap-1.5 shadow-sm"
            >
              <LogOut className="w-4.5 h-4.5" /> Sign Out
            </button>
            <WaiterDashboard />
          </div>
        );
      }

      // Sidebar items based on role permissions
      const sidebarItems = [
        ...(currentUser?.isSuperAdmin ? [{ id: 'superadmin', label: 'Super Admin', icon: Shield, roles: ['admin'] }] : []),
        { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, roles: ['admin', 'manager'] },
        { id: 'orders', label: 'Live Orders', icon: ShoppingBag, roles: ['admin', 'manager', 'cashier'] },
        { id: 'tables', label: 'Table & QR', icon: QrCode, roles: ['admin', 'manager'] },
        { id: 'menu', label: 'Menu List', icon: Utensils, roles: ['admin', 'manager'] },
        { id: 'billing', label: 'POS Billing', icon: Receipt, roles: ['admin', 'manager', 'cashier'] },
        { id: 'reports', label: 'Analytics', icon: FileText, roles: ['admin'] },
        { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['admin'] },
      ].filter(item => isRole(item.roles));

      const isSubscriptionExpired = () => {
        if (currentUser?.isSuperAdmin) return false;
        if (!settings) return false;
        const status = settings.subscriptionStatus || 'trial';
        const expiry = settings.subscriptionExpiresAt;
        if (status === 'expired' || status === 'suspended') return true;
        if (expiry && new Date(expiry) < new Date()) return true;
        return false;
      };

      // Render active tab body
      const renderActiveTabContent = () => {
        if (isSubscriptionExpired()) {
          return (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto h-full">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-805 dark:text-slate-100">Subscription Inactive</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Your subscription to <span className="font-extrabold text-brand-655">RestaurantsOS</span> has expired, been suspended, or the trial period has ended.
              </p>
              <div className="mt-6 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl w-full text-[11px] text-slate-400 space-y-1.5 text-left">
                <p><strong>Restaurant ID:</strong> {settings?.id}</p>
                <p><strong>Status:</strong> <span className="text-red-500 font-bold uppercase">{settings?.subscriptionStatus}</span></p>
                <p><strong>Expiry Date:</strong> {settings?.subscriptionExpiresAt ? new Date(settings.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <p className="text-[11px] text-slate-400 mt-6">
                Please contact the system administrator at <a href="mailto:hello@restaurantsos.app" className="text-brand-655 font-bold hover:underline">hello@restaurantsos.app</a> to renew your plan.
              </p>
            </div>
          );
        }

        switch (activeTab) {
          case 'superadmin': return <SuperAdminDashboard />;
          case 'dashboard': return <AdminDashboard />;
          case 'orders': return <OrdersManager />;
          case 'tables': return <TablesManager />;
          case 'menu': return <MenuManager />;
          case 'billing': return <BillingManager />;
          case 'reports': return <ReportsManager />;
          case 'settings': return <SettingsManager />;
          default: return currentUser?.isSuperAdmin ? <SuperAdminDashboard /> : <AdminDashboard />;
        }
      };

      return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 bg-mesh flex flex-col xl:flex-row animate-fade-in">
          
          {/* Mobile/Tablet Header Bar */}
          <header className="xl:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-brand-500/10">
                <ChefHat className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">POS Portal</span>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>
              <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Menu className="w-4.5 h-4.5" />
              </button>
            </div>
          </header>

          {/* Sidebar Frame */}
          <aside className={`fixed xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto top-0 bottom-0 left-0 z-50 w-64 bg-white/85 dark:bg-slate-900/85 border-r border-slate-200/60 dark:border-slate-800 p-6 flex flex-col justify-between transition-transform duration-300 xl:translate-x-0 backdrop-blur-xl ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="space-y-6">
              {/* Header Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/35">
                  <ChefHat className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none block">Restaurant OS</span>
                  <span className="font-black text-sm text-slate-850 dark:text-slate-100 uppercase tracking-tight block mt-0.5 truncate max-w-[140px]" title={settings?.name || 'RestaurantsOS'}>
                    {settings?.name || 'Bistro System'}
                  </span>
                </div>
              </div>

              {/* Sidebar Tabs Links */}
              <nav className="space-y-1.5">
                {sidebarItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isActive 
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/15'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Bottom Profile Options */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Interface Theme</span>
                <button
                  onClick={toggleTheme}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 p-2 rounded-xl hover:bg-slate-150 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>

              {/* Language Selector */}
              <button
                onClick={() => {
                  const nextLang = lang === 'en' ? 'hi' : 'en';
                  setLang(nextLang);
                  localStorage.setItem('admin_lang', nextLang);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-200/40 dark:border-slate-800/50 hover:bg-slate-105 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                <Globe className="w-4.5 h-4.5 text-brand-500" />
                <span>{lang === 'en' ? 'हिन्दी (Hindi)' : 'English (EN)'}</span>
              </button>

              {/* User Logged Details */}
              <div className="bg-slate-50/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800/50 p-3 rounded-2xl text-xs space-y-1">
                <p className="font-extrabold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
              </div>

              <button
                onClick={async () => {
                  await logoutUser();
                  navigateTo('/');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 transition-all cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>{t.logOut}</span>
              </button>
              <div className="text-center pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/50">
                <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase block">
                  Build by RestaurantsOS Pvt. Ltd
                </span>
              </div>
            </div>
          </aside>

          {/* Content Container */}
          <main className="flex-1 overflow-y-auto h-full p-6 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden animate-fade-in">
            {currentUser?.isSuperAdmin && restaurantId !== 'demo-restaurant' && (
              <div className="bg-amber-550/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 px-6 py-3 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 mb-6 animate-fade-in text-xs font-bold shadow-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>Active Portal View: Impersonating restaurant "{settings?.name || restaurantId}"</span>
                </span>
                <button 
                  onClick={() => {
                    setRestaurantId('demo-restaurant');
                    localStorage.removeItem('last_active_staff_restaurant_id');
                    setActiveTab('superadmin');
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all shadow-md"
                >
                  Return to Super Admin Panel
                </button>
              </div>
            )}
            <Suspense fallback={<LazyLoader />}>
              {renderActiveTabContent()}
            </Suspense>
          </main>

        </div>
      );
    }

    // ==========================================
    // LANDING PAGE SELECTION CHANNELS (Default /)
    // ==========================================
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-955 bg-mesh flex flex-col justify-between py-12 px-4 relative overflow-hidden animate-fade-in">
        
        {/* Background visual graphics */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header info */}
        <header className="max-w-4xl mx-auto w-full text-center space-y-4 z-10">
          <div className="bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>QR SaaS Platform Suite</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
            Digital Order Management for Restaurants
          </h1>
          <p className="text-slate-550 dark:text-slate-400 max-w-md mx-auto text-sm sm:text-base font-medium font-sans">
            A production-ready POS terminal, KDS displays, and table QR-code menus.
          </p>
        </header>

        {/* Flow Selectors Grid */}
        <main className="max-w-xl mx-auto w-full flex flex-col gap-6 my-10 z-10">
          
          {/* Owner POS terminal Card */}
          <div 
            onClick={() => navigateTo(currentUser ? '/admin' : '/login')}
            className="bg-white/75 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/60 p-8 rounded-3xl shadow-glass hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between backdrop-blur-md h-80 hover:-translate-y-1 duration-300"
          >
            <div>
              <div className="w-14 h-14 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mb-6 border border-brand-500/20 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Staff & Settings Portal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                Access the administrator overview cards, live cooking tickets, billing invoices, table capacities, menu organizer, and analytical reports.
              </p>
            </div>
            
            <span className="text-xs font-extrabold text-brand-600 dark:text-brand-450 flex items-center gap-1 mt-4">
              <span>Enter Staff Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          {/* Quick Direct links row */}
          <div className="bg-white/40 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 flex flex-wrap gap-4 items-center justify-center text-xs font-bold text-slate-500">
            <span>Direct Access Consoles:</span>
            <button onClick={() => navigateTo('/kitchen')} className="text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors">
              <ChefHat className="w-3.5 h-3.5" /> Kitchen KDS
            </button>
            <span className="text-slate-300">|</span>
            <button onClick={() => navigateTo('/waiter')} className="text-pink-500 hover:text-pink-600 flex items-center gap-1 transition-colors">
              <User className="w-3.5 h-3.5" /> Waiter Console
            </button>
          </div>

        </main>

        {/* Footer copyright */}
        <footer className="max-w-4xl mx-auto w-full text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          <p>&copy; {new Date().getFullYear()} {settings?.name || 'The Grand Bistro'} SaaS Terminal. Apple inspired minimal design.</p>
        </footer>

      </div>
    );
  };

  return (
    <>
      {renderAppContent()}
      <ToastContainer />
      <CustomConfirmModal />
    </>
  );
};

export default App;
