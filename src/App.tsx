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
const HelpSupportManager = lazyWithRetry(() => import('./pages/owner/HelpSupportManager').then(m => ({ default: m.HelpSupportManager })));
const KitchenDisplay = lazyWithRetry(() => import('./pages/kitchen/KitchenDisplay').then(m => ({ default: m.KitchenDisplay })));
const WaiterDashboard = lazyWithRetry(() => import('./pages/waiter/WaiterDashboard').then(m => ({ default: m.WaiterDashboard })));
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/owner/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const SubscriptionModal = lazyWithRetry(() => import('./components/subscription/SubscriptionModal').then(m => ({ default: m.SubscriptionModal })));
import { SAAS_SUBSCRIPTION_PLANS, formatINR } from './config/subscriptionPlans';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { APP_VERSION } from './config/appVersion';
import { HelpSupportModal } from './components/common/HelpSupportModal';

import { 
  ChevronDown,
  CreditCard,
  Zap,
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
  Info,
  Megaphone,
  AlertTriangle,
  CheckCircle2,
  Bell,
  LifeBuoy
} from 'lucide-react';
import { translations, Language } from './translations';
import { getRoleProfile, isTabAllowedForRole } from './config/rolePermissions';
import { UserProfile } from './types';
import { PageLoader } from './components/PageLoader';
import { RestaurantsOSLogo } from './components/RestaurantsOSLogo';
import dbService from './services/database';
import { SaaSAnnouncement } from './types';

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

export const VALID_ADMIN_TABS = [
  "superadmin",
  "dashboard",
  "orders",
  "tables",
  "menu",
  "billing",
  "reports",
  "settings",
  "waiter",
  "kitchen",
  "help",
] as const;

export type AdminTab = (typeof VALID_ADMIN_TABS)[number];

export const extractTabFromLocation = (pathname: string, hash: string = ""): AdminTab | null => {
  // Backward compatibility: If legacy hash like #billing or #orders was supplied
  const cleanHash = hash.replace(/^#/, "").toLowerCase();
  if (VALID_ADMIN_TABS.includes(cleanHash as AdminTab)) {
    return cleanHash as AdminTab;
  }

  // Check /admin/:tab or /dashboard/:tab
  const match = pathname.match(/^\/(?:admin|dashboard)(?:\/([a-zA-Z0-9_-]+))?\/?$/);
  if (match) {
    if (match[1] && VALID_ADMIN_TABS.includes(match[1] as AdminTab)) {
      return match[1] as AdminTab;
    }
  }

  // Check direct alias: /:tab (e.g. /orders, /billing, /tables, /reports, /settings, /superadmin, /dashboard)
  const directMatch = pathname.match(/^\/([a-zA-Z0-9_-]+)\/?$/);
  if (directMatch && VALID_ADMIN_TABS.includes(directMatch[1] as AdminTab)) {
    return directMatch[1] as AdminTab;
  }

  return null;
};

export const isAdminPortalRoute = (pathname: string): boolean => {
  if (pathname === "/admin" || pathname === "/dashboard") return true;
  if (pathname.startsWith("/admin/") || pathname.startsWith("/dashboard/")) return true;
  const directMatch = pathname.match(/^\/([a-zA-Z0-9_-]+)\/?$/);
  if (directMatch && VALID_ADMIN_TABS.includes(directMatch[1] as AdminTab)) return true;
  return false;
};

export const App: React.FC = () => {
  const { currentUser, logoutUser, loading, settings, restaurantId, setRestaurantId, lang, setLang, t, orders, qzStatus, connectQZTray } = useRestaurant();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
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
    const tabFromUrl = extractTabFromLocation(window.location.pathname, window.location.hash);
    if (tabFromUrl) {
      return tabFromUrl;
    }
    const saved = localStorage.getItem("pos_portal_active_tab");
    if (saved && VALID_ADMIN_TABS.includes(saved as AdminTab)) {
      return saved;
    }
    return "dashboard";
  });

  const handleImpersonate = (targetRestaurantId: string) => {
    setImpersonatedTenantId(targetRestaurantId);
    localStorage.setItem("superadmin_impersonated_tenant_id", targetRestaurantId);
    localStorage.setItem("last_active_staff_restaurant_id", targetRestaurantId);
    setRestaurantId(targetRestaurantId);
    setActiveTab("dashboard");
    window.history.pushState(null, "", "/admin/dashboard");
    setCurrentPath("/admin/dashboard");
    setCurrentHash("");
  };

  const handleExitImpersonation = () => {
    setImpersonatedTenantId(null);
    localStorage.removeItem("superadmin_impersonated_tenant_id");
    localStorage.removeItem("last_active_staff_restaurant_id");
    setRestaurantId("");
    setActiveTab("superadmin");
    window.history.pushState(null, "", "/admin/superadmin");
    setCurrentPath("/admin/superadmin");
    setCurrentHash("");
  };

  const handleSelectTab = (tabId: string) => {
    if (tabId === "superadmin" && isImpersonating) {
      handleExitImpersonation();
      return;
    }
    setActiveTab(tabId);
    localStorage.setItem("pos_portal_active_tab", tabId);
    const newPath = `/admin/${tabId}`;
    if (window.location.pathname !== newPath || window.location.hash) {
      window.history.pushState(null, "", newPath);
      setCurrentPath(newPath);
      setCurrentHash("");
    }
    setMobileSidebarOpen(false);
  };
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Platform-Wide Broadcast Announcements State
  const [announcements, setAnnouncements] = useState<SaaSAnnouncement[]>([]);
  const [dismissedAnnIds, setDismissedAnnIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dismissed_announcements');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const unsub = dbService.subscribeAnnouncements((list) => {
      setAnnouncements(list);
    });
    return () => unsub();
  }, []);

  const handleDismissAnnouncement = (id: string) => {
    const next = [...dismissedAnnIds, id];
    setDismissedAnnIds(next);
    localStorage.setItem('dismissed_announcements', JSON.stringify(next));
  };

  const activeAnnouncements = announcements.filter(ann => {
    if (!ann.isActive) return false;
    if (dismissedAnnIds.includes(ann.id)) return false;
    const now = Date.now();
    if (ann.startsAt && new Date(ann.startsAt).getTime() > now) return false;
    if (ann.expiresAt && new Date(ann.expiresAt).getTime() < now) return false;
    return true;
  });

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
      const path = window.location.pathname;
      const hash = window.location.hash;
      setCurrentPath(path);
      setCurrentHash(hash);
      setCurrentSearch(window.location.search);
      
      const tabFromUrl = extractTabFromLocation(path, hash);
      if (tabFromUrl) {
        setActiveTab(tabFromUrl);
        // Normalize away any legacy hash (#billing) in address bar to /admin/:tab
        if (hash) {
          window.history.replaceState(null, "", `/admin/${tabFromUrl}`);
          setCurrentHash("");
        }
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
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
      const tabFromUrl = extractTabFromLocation(window.location.pathname, window.location.hash);
      if (!tabFromUrl || tabFromUrl === "dashboard") {
        setActiveTab("superadmin");
      }
    }
  }, [currentUser, impersonatedTenantId]);

  // Keep URL clean and synced with activeTab when inside admin portal (removes # entirely)
  useEffect(() => {
    if (isAdminPortalRoute(currentPath)) {
      localStorage.setItem("pos_portal_active_tab", activeTab);
      const targetPath = `/admin/${activeTab}`;
      // Clean up if currently on bare /admin or with hash or on alias like /orders
      if (window.location.pathname !== targetPath || window.location.hash) {
        window.history.replaceState(null, "", targetPath);
        setCurrentPath(targetPath);
        setCurrentHash("");
      }
    }
  }, [activeTab, currentPath]);

  const navigateTo = (pathOrUrl: string, hash: string = "") => {
    try {
      const parsed = new URL(pathOrUrl, window.location.origin);
      const targetHash = hash || parsed.hash;
      window.history.pushState(null, "", parsed.pathname + parsed.search + targetHash);
      setCurrentPath(parsed.pathname);
      setCurrentHash(targetHash);
      setCurrentSearch(parsed.search);
      const tab = extractTabFromLocation(parsed.pathname, targetHash);
      if (tab) {
        setActiveTab(tab);
      }
    } catch {
      window.history.pushState(null, "", pathOrUrl + hash);
      setCurrentPath(pathOrUrl);
      setCurrentHash(hash);
      setCurrentSearch(window.location.search);
      const tab = extractTabFromLocation(pathOrUrl, hash);
      if (tab) {
        setActiveTab(tab);
      }
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
            className="absolute top-4 left-4 sm:left-6 bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-2xl text-xs font-black hover:bg-emerald-600 hover:border-emerald-500 z-50 transition-all shadow-xl cursor-pointer flex items-center gap-1.5"
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
        if (user?.role === "kitchen") return "/kitchen";
        if (user?.role === "waiter") return "/waiter";
        if (user?.isSuperAdmin) return "/admin/superadmin";
        return "/admin/dashboard";
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
    if (isAdminPortalRoute(currentPath)) {
      if (!currentUser) {
        return (
          <Suspense fallback={<LazyLoader />}>
            <Login onSuccess={(user?: UserProfile | null) => {
              if (user?.role === "kitchen") navigateTo("/kitchen");
              else if (user?.role === "waiter") navigateTo("/waiter");
              else if (user?.isSuperAdmin) navigateTo("/admin/superadmin");
              else navigateTo("/admin/dashboard");
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
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh flex items-center justify-center p-4 sm:p-6 animate-fade-in relative overflow-hidden">
            {/* Glowing backdrop aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-2xl w-full relative z-10 space-y-6 text-center">
              
              <div className="space-y-2">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20 shadow-inner">
                  <Shield className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full inline-block">
                  Subscription Expired / Suspended
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Renew Your RestaurantsOS Plan
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
                  Your subscription for <strong className="text-slate-800 dark:text-slate-200">{settings?.name}</strong> expired on <strong className="text-red-500">{formattedExpiry}</strong>. Select a plan below to renew instantly with automated Razorpay checkout and resume full POS billing.
                </p>
              </div>

              {/* Plans Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {SAAS_SUBSCRIPTION_PLANS.map(plan => (
                  <div 
                    key={plan.id}
                    onClick={() => setIsRenewModalOpen(true)}
                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      plan.popular 
                        ? 'border-emerald-500 bg-emerald-500/5 shadow-md hover:border-emerald-600' 
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                        Best Value
                      </span>
                    )}
                    <div>
                      <span className="text-2xl">{plan.icon}</span>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white mt-1">{plan.name}</h3>
                      <p className="text-[10px] text-slate-400 font-semibold">{plan.durationText} full access</p>
                      
                      <div className="my-2.5">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{formatINR(plan.price)}</span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1">/ 6 Mo</span>
                      </div>

                      <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 mb-4">
                        {plan.features.slice(0, 3).map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5 truncate">
                            <span className="text-emerald-500 font-bold">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        plan.popular
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Pay {formatINR(plan.price)} with Razorpay</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <a 
                  href="mailto:billing@restaurantsos.in"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-[11px]"
                >
                  Need assistance? Contact Support &rarr;
                </a>
                <button
                  onClick={async () => {
                    await logoutUser();
                    navigateTo('/');
                  }}
                  className="text-red-500 hover:text-red-600 font-bold text-[11px] cursor-pointer"
                >
                  Sign Out of Portal &rarr;
                </button>
              </div>

              <Suspense fallback={null}>
                <SubscriptionModal
                  isOpen={isRenewModalOpen}
                  onClose={() => setIsRenewModalOpen(false)}
                  restaurantId={settings?.id || ''}
                  restaurantName={settings?.name || ''}
                  restaurantEmail={settings?.email}
                  restaurantPhone={settings?.phone}
                  currentExpiresAt={settings?.subscriptionExpiresAt}
                  currentStatus={settings?.subscriptionStatus}
                  currentPlan={settings?.planType}
                  onSuccess={() => {
                    setIsRenewModalOpen(false);
                    window.location.reload();
                  }}
                />
              </Suspense>

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

      // Dedicated Mobile, Tablet & Handheld POS Console for Waiter / Captain Staff
      if (currentUser.role === 'waiter') {
        return (
          <div className="relative">
            <Suspense fallback={<LazyLoader />}>
              <WaiterDashboard isStandalone={true} />
            </Suspense>
          </div>
        );
      }

      const roleProfile = getRoleProfile(currentUser.role);

      // Sidebar items based on role profile
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
          ];
        } else {
          // Pure Super Admin SaaS Mode: ALWAYS show ONLY Super Admin Panel
          sidebarItems = [
            { id: 'superadmin', label: t.superadmin, icon: Shield, roles: ['admin'] }
          ];
        }
      } else if (currentUser.role === 'cashier') {
        // Cashier Staff Navigation
        sidebarItems = [
          { id: 'billing', label: t.posBilling, icon: Receipt, roles: ['cashier'] },
          { id: 'orders', label: t.liveOrders, icon: ShoppingBag, roles: ['cashier'] },
          { id: 'tables', label: t.tableQR, icon: QrCode, roles: ['cashier'] },
        ];
      } else {
        // Administrator and Store Manager Navigation
        sidebarItems = [
          { id: 'dashboard', label: t.dashboard, icon: TrendingUp, roles: ['admin', 'manager'] },
          { id: 'orders', label: t.liveOrders, icon: ShoppingBag, roles: ['admin', 'manager'] },
          { id: 'tables', label: t.tableQR, icon: QrCode, roles: ['admin', 'manager'] },
          { id: 'menu', label: t.menuList, icon: Utensils, roles: ['admin', 'manager'] },
          { id: 'billing', label: t.posBilling, icon: Receipt, roles: ['admin', 'manager'] },
          { id: 'reports', label: t.analytics, icon: FileText, roles: ['admin', 'manager'] },
        ].filter(item => item.roles.includes(currentUser.role));
      }

      // Render active tab body with role permissions enforcement
      const renderActiveTabContent = () => {
        if (currentUser?.isSuperAdmin && (!isImpersonating || activeTab === 'superadmin' || activeTab === 'saas-subscriptions')) {
          return (
            <SuperAdminDashboard 
              onImpersonate={handleImpersonate} 
              initialTab={activeTab === 'saas-subscriptions' ? 'subscriptions' : 'restaurants'} 
            />
          );
        }

        // Role authorization check for current active tab
        if (!currentUser?.isSuperAdmin && !isTabAllowedForRole(currentUser.role, activeTab)) {
          // Fallback to default allowed tab
          const fallbackTab = roleProfile.defaultTab;
          if (fallbackTab === 'waiter') return <WaiterDashboard />;
          if (fallbackTab === 'billing') return <BillingManager />;
          return <AdminDashboard />;
        }

        switch (activeTab) {
          case 'superadmin': return <SuperAdminDashboard onImpersonate={handleImpersonate} initialTab="restaurants" />;
          case 'saas-subscriptions': return <SuperAdminDashboard onImpersonate={handleImpersonate} initialTab="subscriptions" />;
          case 'dashboard': return <AdminDashboard />;
          case 'orders': return <OrdersManager />;
          case 'tables': return <TablesManager />;
          case 'menu': return <MenuManager />;
          case 'billing': return <BillingManager />;
          case 'reports': return <ReportsManager />;
          case 'settings': return <SettingsManager />;
          case 'help': return <HelpSupportManager />;
          case 'waiter': return <WaiterDashboard />;
          case 'kitchen': return <KitchenDisplay />;
          default: return isImpersonating ? <AdminDashboard /> : (currentUser?.isSuperAdmin ? <SuperAdminDashboard onImpersonate={handleImpersonate} /> : (currentUser.role === 'waiter' ? <WaiterDashboard /> : <AdminDashboard />));
        }
      };

            const activeOrdersCount = orders ? orders.filter(o => o.status === "pending" || o.status === "preparing" || o.status === "ready").length : 0;

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh flex flex-col animate-fade-in text-slate-800 dark:text-slate-100">
          
          {/* ========================================================= */}
          {/* TOP NAVIGATION HEADER BAR (Clean, Sticky & Glassmorphic)   */}
          {/* ========================================================= */}
          <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/75 dark:border-slate-800 transition-colors shadow-2xs">
            <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[70px] flex items-center justify-between gap-3">
              
              {/* Left Brand Identity & Restaurant Badge */}
              <div className="flex items-center gap-3 shrink-0">
                <div 
                  onClick={() => handleSelectTab(currentUser?.isSuperAdmin && !isImpersonating ? "superadmin" : "dashboard")}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <RestaurantsOSLogo size="sm" showText={false} />
                  <div className="flex flex-col leading-none">
                    <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight font-sans flex items-center gap-1">
                      Restaurants <span className="text-emerald-500 dark:text-emerald-400">OS</span>
                    </span>
                    <span 
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider mt-0.5 truncate max-w-[150px] sm:max-w-[200px]" 
                      title={currentUser?.isSuperAdmin ? (isImpersonating ? `Tenant: ${settings?.name || impersonatedTenantId}` : "Super Admin") : (settings?.name || "POS Portal")}
                    >
                      {currentUser?.isSuperAdmin ? (isImpersonating ? `Tenant: ${settings?.name || impersonatedTenantId}` : "Super Admin") : (settings?.name || "POS Portal")}
                    </span>
                  </div>
                </div>


              </div>

              {/* Center Navigation Links (Desktop xl Screens) */}
              <nav className="hidden xl:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-750/70 shadow-2xs">
                {sidebarItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isOrders = item.id === "orders";
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-xs shadow-emerald-600/20 font-black"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                      
                      {/* Real-time Live Orders Count Badge */}
                      {isOrders && activeOrdersCount > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full leading-tight ${
                          isActive 
                            ? "bg-white text-emerald-700" 
                            : "bg-emerald-500 text-white animate-pulse"
                        }`}>
                          {activeOrdersCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Right Action Controls & User Profile */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                
                {/* QZ Tray Thermal Status Badge */}
                <div 
                  onClick={() => qzStatus !== "connected" && connectQZTray()}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    qzStatus === "connected"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      : qzStatus === "connecting"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 animate-pulse"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50"
                  }`}
                  title={qzStatus === "connected" ? "QZ Tray Thermal Station Online" : "Click to connect QZ Tray"}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      qzStatus === "connected" ? "bg-emerald-500 animate-pulse" : qzStatus === "connecting" ? "bg-amber-500" : "bg-slate-400"
                    }`}
                  />
                  <span>{qzStatus === "connected" ? "QZ Online" : qzStatus === "connecting" ? "Connecting..." : "QZ Offline"}</span>
                </div>



                {/* Theme Switcher */}
                <button
                  onClick={toggleTheme}
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                  title="Toggle Light / Dark Interface Theme"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* User Profile Dropdown Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="hidden md:flex flex-col text-left leading-none">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[100px]">
                        {currentUser.name}
                      </span>
                      <span className="text-[9px] font-extrabold uppercase text-slate-400 mt-0.5">
                        {currentUser?.isSuperAdmin ? "Super Admin" : roleProfile.badge}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  </button>

                  {/* Dropdown Popover */}
                  {userMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setUserMenuOpen(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-scale-in space-y-1.5">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="font-black text-xs text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                          <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[9px] font-black border ${roleProfile.badgeBg} ${roleProfile.badgeText} ${roleProfile.badgeBorder}`}>
                            {currentUser?.isSuperAdmin ? "👑 Super Admin" : roleProfile.badge}
                          </span>
                        </div>

                        {/* Store Settings & Help Options under Profile */}
                        <div className="space-y-1 pt-1">
                          {currentUser?.isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserMenuOpen(false);
                                handleSelectTab("saas-subscriptions");
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "saas-subscriptions"
                                  ? "bg-emerald-600 text-white shadow-xs font-black"
                                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <CreditCard className={`w-4 h-4 ${activeTab === "saas-subscriptions" ? "text-white" : "text-emerald-600 dark:text-emerald-400"}`} />
                                <span>SaaS Subscriptions & Razorpay</span>
                              </div>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                                activeTab === "saas-subscriptions"
                                  ? "bg-white/20 text-white border-white/30"
                                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              }`}>
                                Gateway
                              </span>
                            </button>
                          )}

                          {(currentUser.role === "admin" || currentUser.isSuperAdmin) && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserMenuOpen(false);
                                handleSelectTab("settings");
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "settings"
                                  ? "bg-emerald-600 text-white shadow-xs font-black"
                                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <SettingsIcon className={`w-4 h-4 ${activeTab === "settings" ? "text-white" : "text-emerald-600 dark:text-emerald-400"}`} />
                                <span>{t.settings || "Store Settings"}</span>
                              </div>
                              {activeTab === "settings" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              )}
                            </button>
                          )}

                          {/* Help and Support Navigation Item */}
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleSelectTab("help");
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              activeTab === "help"
                                ? "bg-emerald-600 text-white shadow-xs font-black"
                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <LifeBuoy className={`w-4 h-4 ${activeTab === "help" ? "text-white" : "text-sky-500"}`} />
                              <span>Help & Support</span>
                            </div>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                              activeTab === "help"
                                ? "bg-white/20 text-white border-white/30"
                                : "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-500/20"
                            }`}>
                              24/7
                            </span>
                          </button>

                          {/* Install App Option under Profile */}
                          <PWAInstallButton
                            variant="menu"
                            onInstalled={() => setUserMenuOpen(false)}
                          />
                        </div>

                        {/* Station Switchers */}
                        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => { setUserMenuOpen(false); navigateTo("/kitchen"); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <ChefHat className="w-4 h-4 text-rose-500" />
                            <span>Kitchen KDS Station</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setUserMenuOpen(false); navigateTo("/waiter"); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <User className="w-4 h-4 text-amber-500" />
                            <span>Waiter & Captain App</span>
                          </button>
                        </div>

                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={async () => {
                              setUserMenuOpen(false);
                              await logoutUser();
                              navigateTo("/");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>{t.logOut}</span>
                          </button>
                        </div>

                        {/* App Version Badge */}
                        <div className="pt-2 px-1 text-center flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>RestaurantsOS</span>
                          <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/60">
                            v{APP_VERSION}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile / Tablet Hamburger Button */}
                <button 
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} 
                  className="xl:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
                  aria-label="Toggle navigation menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

              </div>

            </div>

            {/* Sub-Header Horizontal Tabs for Tablets / Medium Screens (md to xl) */}
            <div className="hidden md:flex xl:hidden border-t border-slate-200/60 dark:border-slate-800 px-4 py-2 overflow-x-auto no-scrollbar gap-1.5 bg-slate-50/70 dark:bg-slate-900/50">
              {sidebarItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isOrders = item.id === "orders";
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs font-black"
                        : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {isOrders && activeOrdersCount > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-white text-emerald-700" : "bg-emerald-500 text-white"
                      }`}>
                        {activeOrdersCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </header>

          {/* ========================================================= */}
          {/* MOBILE SLIDE-OUT DRAWER                                    */}
          {/* ========================================================= */}
          {mobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 xl:hidden animate-fade-in"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          <aside className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between transition-transform duration-300 xl:hidden shadow-2xl ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}>
            <div className="space-y-5 overflow-y-auto">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <RestaurantsOSLogo size="sm" showText={false} />
                  <div>
                    <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight font-sans">
                      Restaurants <span className="text-emerald-500">OS</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">
                      {settings?.name || "POS Portal"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items List */}
              <nav className="space-y-1">
                {sidebarItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isOrders = item.id === "orders";
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-xs font-black"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </div>
                      {isOrders && activeOrdersCount > 0 && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isActive ? "bg-white text-emerald-700" : "bg-emerald-500 text-white"
                        }`}>
                          {activeOrdersCount} Active
                        </span>
                      )}
                    </button>
                  );
                })}
                {(currentUser.role === "admin" || currentUser.isSuperAdmin) && (
                  <button
                    key="settings"
                    onClick={() => handleSelectTab("settings")}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "settings"
                        ? "bg-emerald-600 text-white shadow-xs font-black"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SettingsIcon className={`w-4 h-4 ${activeTab === "settings" ? "text-white" : "text-emerald-500"}`} />
                      <span>{t.settings || "Store Settings"}</span>
                    </div>
                  </button>
                )}

                <button
                  key="help_support"
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    handleSelectTab("help");
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "help"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LifeBuoy className={`w-4 h-4 ${activeTab === "help" ? "text-white" : "text-sky-500"}`} />
                    <span>Help & Support</span>
                  </div>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                    activeTab === "help"
                      ? "bg-white/20 text-white border-white/30"
                      : "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-500/20"
                  }`}>
                    24/7
                  </span>
                </button>
              </nav>

              {/* Station Consoles */}
              {(currentUser.role === "admin" || currentUser.role === "manager" || currentUser.isSuperAdmin) && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Direct Console Stations
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setMobileSidebarOpen(false); navigateTo("/kitchen"); }}
                      className="py-2.5 px-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 flex items-center justify-center gap-1"
                    >
                      <span>👨‍🍳 KDS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMobileSidebarOpen(false); navigateTo("/waiter"); }}
                      className="py-2.5 px-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center gap-1"
                    >
                      <span>🛎️ Waiter</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${roleProfile.badgeBg} ${roleProfile.badgeText} ${roleProfile.badgeBorder}`}>
                    {currentUser?.isSuperAdmin ? "👑 Super Admin" : roleProfile.badge}
                  </span>
                  <button
                    onClick={toggleTheme}
                    className="p-1.5 bg-slate-200/60 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
                  >
                    {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate mt-1.5">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
              </div>

              <button
                onClick={async () => {
                  setMobileSidebarOpen(false);
                  await logoutUser();
                  navigateTo("/");
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logOut}</span>
              </button>

              <div className="pt-1 px-1 text-center flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>RestaurantsOS POS</span>
                <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/60">
                  v{APP_VERSION}
                </span>
              </div>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* BOTTOM MOBILE NAVIGATION DOCK (Phones < 768px)             */}
          {/* ========================================================= */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 py-1.5 px-3 flex justify-around items-center shadow-lg">
            <button
              onClick={() => handleSelectTab("dashboard")}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "dashboard" ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleSelectTab("orders")}
              className={`relative flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "orders" ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Orders</span>
              {activeOrdersCount > 0 && (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            <button
              onClick={() => handleSelectTab("tables")}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "tables" ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Tables</span>
            </button>

            <button
              onClick={() => handleSelectTab("billing")}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "billing" ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>POS Bill</span>
            </button>

            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
              <span>More</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* MAIN PAGE CONTENT CONTAINER (Full-Width Responsive Canvas) */}
          {/* ========================================================= */}
          <main className="flex-1 w-full max-w-[1680px] mx-auto p-3.5 sm:p-6 lg:p-8 pb-28 md:pb-16 overflow-x-hidden animate-fade-in">
            
            {/* Platform-Wide Broadcast Announcement Banners */}
            {activeAnnouncements.map(ann => {
              const styleConfig = {
                info: {
                  bg: "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200",
                  iconBg: "bg-blue-600 text-white",
                  icon: Info,
                },
                warning: {
                  bg: "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200",
                  iconBg: "bg-amber-600 text-white",
                  icon: AlertTriangle,
                },
                success: {
                  bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200",
                  iconBg: "bg-emerald-600 text-white",
                  icon: CheckCircle2,
                },
                urgent: {
                  bg: "bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20",
                  iconBg: "bg-rose-600 text-white animate-pulse",
                  icon: Megaphone,
                },
              }[ann.type] || {
                bg: "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200",
                iconBg: "bg-blue-600 text-white",
                icon: Info,
              };

              const Icon = styleConfig.icon;

              return (
                <div 
                  key={ann.id} 
                  className={`${styleConfig.bg} border px-5 py-3.5 rounded-2xl flex items-center justify-between gap-4 mb-6 shadow-sm animate-fade-in backdrop-blur-md`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${styleConfig.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase tracking-wider">{ann.title}</span>
                        {ann.type === "urgent" && (
                          <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium opacity-90 truncate mt-0.5">{ann.message}</p>
                    </div>
                  </div>
                  {ann.isDismissible && (
                    <button
                      onClick={() => handleDismissAnnouncement(ann.id)}
                      className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer shrink-0"
                      title="Dismiss announcement"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}

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
            onClick={() => navigateTo(currentUser ? (currentUser.isSuperAdmin ? "/admin/superadmin" : "/admin/dashboard") : "/login")}
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
