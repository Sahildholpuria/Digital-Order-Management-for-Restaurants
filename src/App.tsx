import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useRestaurant } from './context/RestaurantContext';
import { useTheme } from './context/ThemeContext';
import { CustomerMenu } from './pages/customer/CustomerMenu';
import { OrderTracker } from './pages/customer/OrderTracker';

const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page_has_been_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenRefreshed) {
        window.sessionStorage.setItem('page_has_been_refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

const Login = lazyWithRetry(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const AdminDashboard = lazyWithRetry(() => import('./pages/owner/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const OrdersManager = lazyWithRetry(() => import('./pages/owner/OrdersManager').then(m => ({ default: m.OrdersManager })));
const TablesManager = lazyWithRetry(() => import('./pages/owner/TablesManager').then(m => ({ default: m.TablesManager })));
const MenuManager = lazyWithRetry(() => import('./pages/owner/MenuManager').then(m => ({ default: m.MenuManager })));
const BillingManager = lazyWithRetry(() => import('./pages/owner/BillingManager').then(m => ({ default: m.BillingManager })));
const ReportsManager = lazyWithRetry(() => import('./pages/owner/ReportsManager').then(m => ({ default: m.ReportsManager })));
const SettingsManager = lazyWithRetry(() => import('./pages/owner/SettingsManager').then(m => ({ default: m.SettingsManager })));
const KitchenDisplay = lazyWithRetry(() => import('./pages/kitchen/KitchenDisplay').then(m => ({ default: m.KitchenDisplay })));
const WaiterDashboard = lazyWithRetry(() => import('./pages/waiter/WaiterDashboard').then(m => ({ default: m.WaiterDashboard })));
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/owner/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));

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
  ArrowLeft,
  Globe,
  Shield,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { translations, Language } from './translations';
import { UserProfile } from './types';
import { PageLoader } from './components/PageLoader';

const LazyLoader = () => (
  <PageLoader message="LOADING DASHBOARD..." subtext="Fetching live restaurant menus and orders" />
);

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useRestaurant();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 space-y-2.5 max-w-md sm:max-w-sm w-auto sm:w-full pointer-events-none">
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
            className={`pointer-events-auto flex items-start sm:items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-300 animate-slide-up ${typeStyles[toast.type]}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {icons[toast.type]}
              <span className="text-xs font-bold font-sans tracking-wide leading-snug break-words">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer flex-shrink-0"
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
        
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 mt-6">
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
  const { currentUser, logoutUser, loading, settings, restaurantId, setRestaurantId, lang, setLang, t } = useRestaurant();
  const { theme, toggleTheme } = useTheme();

  // Navigation Routing States
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [currentSearch, setCurrentSearch] = useState(window.location.search);
  const [impersonatedTenantId, setImpersonatedTenantId] = useState<string | null>(() => {
    return localStorage.getItem('superadmin_impersonated_tenant_id');
  });
  const isImpersonating = !!(currentUser?.isSuperAdmin && impersonatedTenantId);

  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['superadmin', 'dashboard', 'orders', 'tables', 'menu', 'billing', 'reports', 'settings'];
    if (validTabs.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('pos_portal_active_tab');
    if (saved && validTabs.includes(saved)) {
      return saved;
    }
    return 'dashboard';
  });

  const handleImpersonate = (targetRestaurantId: string) => {
    setImpersonatedTenantId(targetRestaurantId);
    localStorage.setItem('superadmin_impersonated_tenant_id', targetRestaurantId);
    localStorage.setItem('last_active_staff_restaurant_id', targetRestaurantId);
    setRestaurantId(targetRestaurantId);
    setActiveTab('dashboard');
    window.location.hash = '#dashboard';
  };

  const handleExitImpersonation = () => {
    setImpersonatedTenantId(null);
    localStorage.removeItem('superadmin_impersonated_tenant_id');
    localStorage.removeItem('last_active_staff_restaurant_id');
    setRestaurantId('');
    setActiveTab('superadmin');
    window.location.hash = '#superadmin';
  };
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Trigger brief page transition loader on path or tab change
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [activeTab, currentPath, currentHash, currentSearch]);

  // Sync route on browser navigation (back/forward)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
      setCurrentSearch(window.location.search);
      
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

  // Direct Console Navigation Guard: preserves redirect URL if unauthenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      if (currentPath === '/kitchen' || currentHash === '#kitchen') {
        navigateTo('/login?redirect=/kitchen');
      } else if (currentPath === '/waiter' || currentHash === '#waiter') {
        navigateTo('/login?redirect=/waiter');
      }
    }
  }, [loading, currentUser, currentPath, currentHash]);

  // Automatically switch to superadmin tab on login if Super Admin and not impersonating
  useEffect(() => {
    if (currentUser?.isSuperAdmin && !impersonatedTenantId) {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['superadmin', 'dashboard', 'orders', 'tables', 'menu', 'billing', 'reports', 'settings'];
      if (!validTabs.includes(hash)) {
        setActiveTab('superadmin');
      }
    }
  }, [currentUser, impersonatedTenantId]);

  // Persist tab change to URL hash and localStorage
  useEffect(() => {
    if (currentPath === '/admin' || currentPath === '/dashboard') {
      localStorage.setItem('pos_portal_active_tab', activeTab);
      window.history.replaceState(null, '', `${currentPath}#${activeTab}`);
    }
  }, [activeTab, currentPath]);

  const navigateTo = (pathOrUrl: string, hash: string = '') => {
    try {
      const parsed = new URL(pathOrUrl, window.location.origin);
      const targetHash = hash || parsed.hash;
      window.history.pushState(null, '', parsed.pathname + parsed.search + targetHash);
      setCurrentPath(parsed.pathname);
      setCurrentHash(targetHash);
      setCurrentSearch(parsed.search);
    } catch {
      window.history.pushState(null, '', pathOrUrl + hash);
      setCurrentPath(pathOrUrl);
      setCurrentHash(hash);
      setCurrentSearch(window.location.search);
    }
  };

  const renderAppContent = () => {
    if (loading || isNavigating) {
      return (
        <PageLoader
          fullScreen={true}
          message="SYNCHRONIZING RESTAURANT OS..."
          subtext="Bootstrapping live gourmet ecosystem & active orders"
        />
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
            className="absolute top-5 left-6 bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-2xl text-xs font-black hover:bg-emerald-600 hover:border-emerald-500 z-50 transition-all shadow-xl cursor-pointer flex items-center gap-1.5"
          >
            <span>&larr; Exit KDS</span>
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

    // Staff Login Rerouting & Direct Console Navigation Return
    if (currentPath === '/login' || currentHash === '#login') {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get('redirect') || searchParams.get('returnUrl');

      const resolvePostLoginUrl = (user?: any) => {
        if (redirectParam && redirectParam.startsWith('/')) {
          return redirectParam;
        }
        if (user?.role === 'kitchen') return '/kitchen';
        if (user?.role === 'waiter') return '/waiter';
        return '/admin';
      };

      if (currentUser) {
        navigateTo(resolvePostLoginUrl(currentUser));
      } else {
        return (
          <Suspense fallback={<LazyLoader />}>
            <Login onSuccess={(user?: UserProfile | null) => navigateTo(resolvePostLoginUrl(user || currentUser))} />
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
            <Login onSuccess={(user?: UserProfile | null) => {
              if (user?.role === 'kitchen') navigateTo('/kitchen');
              else if (user?.role === 'waiter') navigateTo('/waiter');
              else navigateTo('/admin');
            }} />
          </Suspense>
        );
      }

      const isSubscriptionExpired = () => {
        if (currentUser?.isSuperAdmin) return false;
        if (!settings) return false;
        const status = settings.subscriptionStatus || 'trial';
        const expiry = settings.subscriptionExpiresAt;
        if (status === 'expired' || status === 'suspended') return true;
        if (expiry && new Date(expiry) < new Date()) return true;
        return false;
      };

      if (isSubscriptionExpired()) {
        const formattedExpiry = settings?.subscriptionExpiresAt 
          ? new Date(settings.subscriptionExpiresAt).toLocaleDateString([], { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) 
          : 'N/A';

        return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-955 bg-mesh flex items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
            {/* Glowing red backdrop aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-8 shadow-2xl max-w-md w-full relative z-10 space-y-6">
              <div className="w-16 h-16 bg-red-500/10 text-red-550 rounded-3xl flex items-center justify-center mx-auto mb-2 animate-bounce duration-3000">
                <Shield className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight font-sans">
                  Subscription Expired
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Your restaurant subscription to <span className="font-extrabold text-brand-655">RestaurantsOS</span> has expired or been suspended on <strong className="text-red-500 font-bold">{formattedExpiry}</strong>. 
                  Please renew the subscription if you want to continue using the system.
                </p>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800/50 p-4 rounded-2xl text-[11px] text-slate-400 text-left space-y-1.5 font-sans">
                <p><strong>Restaurant ID:</strong> <span className="font-mono text-slate-600 dark:text-slate-350 font-bold">{settings?.id}</span></p>
                <p><strong>Restaurant Name:</strong> <span className="text-slate-600 dark:text-slate-350 font-bold">{settings?.name}</span></p>
                <p><strong>Billing Status:</strong> <span className="text-red-500 font-bold uppercase">{settings?.subscriptionStatus}</span></p>
              </div>

              <div className="space-y-3 pt-2">
                <a 
                  href="mailto:billing@restaurantsos.app"
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md text-xs cursor-pointer block"
                >
                  Contact Support for Renewal
                </a>
                <button
                  onClick={async () => {
                    await logoutUser();
                    navigateTo('/');
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 px-6 rounded-2xl transition-all text-xs cursor-pointer"
                >
                  Sign Out of Portal &rarr;
                </button>
              </div>
            </div>
          </div>
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

      // Sidebar items based on role
      let sidebarItems: Array<{ id: string; label: string; icon: any; roles: string[] }> = [];

      if (currentUser?.isSuperAdmin) {
        if (isImpersonating) {
          sidebarItems = [
            { id: 'superadmin', label: '← Super Admin', icon: ArrowLeft, roles: ['admin'] },
            { id: 'dashboard', label: t.dashboard, icon: TrendingUp, roles: ['admin'] },
            { id: 'orders', label: t.liveOrders, icon: ShoppingBag, roles: ['admin'] },
            { id: 'tables', label: t.tableQR, icon: QrCode, roles: ['admin'] },
            { id: 'menu', label: t.menuList, icon: Utensils, roles: ['admin'] },
            { id: 'billing', label: t.posBilling, icon: Receipt, roles: ['admin'] },
            { id: 'reports', label: t.analytics, icon: FileText, roles: ['admin'] },
            { id: 'settings', label: t.settings, icon: SettingsIcon, roles: ['admin'] },
          ];
        } else {
          // Pure Super Admin SaaS Mode: ALWAYS show ONLY Super Admin Panel
          sidebarItems = [
            { id: 'superadmin', label: t.superadmin, icon: Shield, roles: ['admin'] }
          ];
        }
      } else {
        // Regular restaurant staff account
        sidebarItems = [
          { id: 'dashboard', label: t.dashboard, icon: TrendingUp, roles: ['admin', 'manager'] },
          { id: 'orders', label: t.liveOrders, icon: ShoppingBag, roles: ['admin', 'manager', 'cashier'] },
          { id: 'tables', label: t.tableQR, icon: QrCode, roles: ['admin', 'manager'] },
          { id: 'menu', label: t.menuList, icon: Utensils, roles: ['admin', 'manager'] },
          { id: 'billing', label: t.posBilling, icon: Receipt, roles: ['admin', 'manager', 'cashier'] },
          { id: 'reports', label: t.analytics, icon: FileText, roles: ['admin'] },
          { id: 'settings', label: t.settings, icon: SettingsIcon, roles: ['admin'] },
        ].filter(item => item.roles.includes(currentUser.role));
      }

      // Render active tab body
      const renderActiveTabContent = () => {
        if (currentUser?.isSuperAdmin && (!isImpersonating || activeTab === 'superadmin')) {
          return <SuperAdminDashboard onImpersonate={handleImpersonate} />;
        }
        switch (activeTab) {
          case 'dashboard': return <AdminDashboard />;
          case 'orders': return <OrdersManager />;
          case 'tables': return <TablesManager />;
          case 'menu': return <MenuManager />;
          case 'billing': return <BillingManager />;
          case 'reports': return <ReportsManager />;
          case 'settings': return <SettingsManager />;
          default: return isImpersonating ? <AdminDashboard /> : (currentUser?.isSuperAdmin ? <SuperAdminDashboard onImpersonate={handleImpersonate} /> : <AdminDashboard />);
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
              <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {currentUser?.isSuperAdmin ? (isImpersonating ? `Portal: ${settings?.name || impersonatedTenantId}` : 'Super Admin') : 'POS Portal'}
              </span>
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
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none block">
                    {currentUser?.isSuperAdmin ? (isImpersonating ? 'Impersonating Tenant' : 'Super Admin SaaS') : 'Restaurant OS'}
                  </span>
                  <span className="font-black text-sm text-slate-850 dark:text-slate-100 uppercase tracking-tight block mt-0.5 truncate max-w-[140px]" title={currentUser?.isSuperAdmin ? (isImpersonating ? (settings?.name || impersonatedTenantId || 'Tenant') : 'Tenant Central') : (settings?.name || 'Bistro System')}>
                    {currentUser?.isSuperAdmin ? (isImpersonating ? (settings?.name || impersonatedTenantId || 'Tenant') : 'Tenant Central') : (settings?.name || 'Bistro System')}
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
                        if (item.id === 'superadmin' && isImpersonating) {
                          handleExitImpersonation();
                        } else {
                          setActiveTab(item.id);
                        }
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
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                <Globe className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'en' ? 'हिन्दी (Hindi)' : 'English (EN)'}</span>
              </button>

              {/* User Logged Details */}
              <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 p-3 rounded-2xl text-xs space-y-1 shadow-sm">
                <p className="font-black text-slate-900 dark:text-slate-100 truncate">{currentUser.name}</p>
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate">{currentUser.email}</p>
              </div>

              <button
                onClick={async () => {
                  await logoutUser();
                  navigateTo('/');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-955/20 transition-all cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>{t.logOut}</span>
              </button>
              <div className="text-center pt-2 mt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[9px] text-slate-600 dark:text-slate-400 font-bold tracking-wider uppercase block">
                  BUILT BY RESTAURANTSOS PVT. LTD
                </span>
              </div>
            </div>
          </aside>

          {/* Content Container */}
          <main className="flex-1 overflow-y-auto h-full p-6 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden animate-fade-in">
            {isImpersonating && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 px-6 py-3 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 mb-6 animate-fade-in text-xs font-bold shadow-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>Active Portal View: Impersonating restaurant "{settings?.name || impersonatedTenantId}"</span>
                </span>
                <button 
                  onClick={handleExitImpersonation}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all shadow-md cursor-pointer"
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
