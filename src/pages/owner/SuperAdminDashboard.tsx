import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/database';
import { RestaurantSettings, UserProfile, SaaSAnnouncement } from '../../types';
import { useRestaurant } from '../../context/RestaurantContext';
import { PageLoader } from '../../components/PageLoader';
import { 
  getSubscriptionPlans,
  getPlanById,
  getCustomPlanPricing,
  formatINR,
  getRazorpayKeyId,
  setRazorpayKeyId,
  getRazorpayKeySecret,
  setRazorpayKeySecret
} from '../../config/subscriptionPlans';
import subscriptionService, { SubscriptionPaymentRecord } from '../../services/subscriptionService';
import { 
  Building, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Search, 
  X, 
  Award, 
  ShieldCheck, 
  TrendingUp,
  RefreshCw,
  Users,
  Trash2,
  ExternalLink,
  CreditCard,
  Clock,
  Zap,
  Ban,
  UserPlus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Filter,
  Key,
  ShieldAlert,
  Megaphone,
  Bell,
  Send,
  MessageSquare,
  Mail,
  Share2,
  AlertTriangle
} from 'lucide-react';

const getPlanLabel = (type?: string): string => {
  const p = getPlanById(type === "starter" ? "starter" : "pro");
  return `${p.name} (${formatINR(p.price)} / ${p.durationText})`;
};

interface SuperAdminDashboardProps {
  onImpersonate?: (restaurantId: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onImpersonate }) => {
  const { currentUser, setRestaurantId, showToast, askConfirmation } = useRestaurant();

  const [restaurants, setRestaurants] = useState<RestaurantSettings[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [announcements, setAnnouncements] = useState<SaaSAnnouncement[]>([]);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'users' | 'announcements' | 'subscriptions'>('restaurants');
  const [subPayments, setSubPayments] = useState<SubscriptionPaymentRecord[]>([]);
  const [isSubFeatureEnabled, setIsSubFeatureEnabled] = useState<boolean>(() => {
    const val = localStorage.getItem('saas_subscription_feature_enabled');
    return val === null ? true : val === 'true';
  });
  const [isTogglingSubFeature, setIsTogglingSubFeature] = useState(false);
  const [pricingPlans, setPricingPlans] = useState(() => getSubscriptionPlans());
  const [starterPriceInput, setStarterPriceInput] = useState<number | string>(() => getCustomPlanPricing().starterPrice);
  const [proPriceInput, setProPriceInput] = useState<number | string>(() => getCustomPlanPricing().proPrice);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [rzpKeyInput, setRzpKeyInput] = useState(() => getRazorpayKeyId());
  const [rzpSecretInput, setRzpSecretInput] = useState(() => getRazorpayKeySecret());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRest, setSelectedRest] = useState<RestaurantSettings | null>(null);

  // New restaurant form states
  const [restId, setRestId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [planType, setPlanType] = useState<'starter' | 'pro' | 'pro_6m' | 'pro_1y'>('starter');
  const [status, setStatus] = useState<'trial' | 'active' | 'expired'>('trial');
  const [expiresAt, setExpiresAt] = useState('');

  // Edit subscription/details states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPlan, setEditPlan] = useState<'starter' | 'pro' | 'pro_6m' | 'pro_1y'>('starter');
  const [editStatus, setEditStatus] = useState<'trial' | 'active' | 'expired' | 'suspended'>('trial');
  const [editExpiresAt, setEditExpiresAt] = useState('');

  // Dedicated subscription management modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subRest, setSubRest] = useState<RestaurantSettings | null>(null);
  const [subPlan, setSubPlan] = useState<'starter' | 'pro' | 'pro_6m' | 'pro_1y'>('starter');
  const [subStatus, setSubStatus] = useState<'trial' | 'active' | 'expired' | 'suspended'>('trial');
  const [subExpiresAt, setSubExpiresAt] = useState('');
  const [subSaving, setSubSaving] = useState(false);

  // Edit staff user states
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter'>('admin');
  const [editUserRestaurantId, setEditUserRestaurantId] = useState('');

  // New staff user form states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter'>('admin');
  const [userRestaurantId, setUserRestaurantId] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2-in-1 Onboarding: Option to create Admin Staff at same time
  const [createAdminAccount, setCreateAdminAccount] = useState(true);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Status Filter & Sorting state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'renewals_due' | 'expired' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'date' | 'status'>('name');
  const [copiedSlugId, setCopiedSlugId] = useState<string | null>(null);

  // Share Credentials Modal
  const [credsModal, setCredsModal] = useState<{ restName: string; email: string; pass: string; role: string; slug: string; phone?: string; restaurantId?: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Renewal Alert Dispatcher Modal
  const [renewModal, setRenewModal] = useState<{ restaurant: RestaurantSettings; daysLeft: number } | null>(null);
  const [copiedRenewText, setCopiedRenewText] = useState(false);

  // Broadcast Announcement Form States
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'info' | 'warning' | 'success' | 'urgent'>('info');
  const [annDismissible, setAnnDismissible] = useState(true);
  const [annExpiresAt, setAnnExpiresAt] = useState('');
  const [annSaving, setAnnSaving] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const restData = await dbService.getAllRestaurants();
      setRestaurants(restData);
      
      const userData = await dbService.getAllUsers();
      setUsers(userData);

      const annData = await dbService.getAnnouncements();
      setAnnouncements(annData);
    } catch (err) {
      console.error('Failed fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.isSuperAdmin) {
      fetchAllData();
    }
  }, [currentUser?.isSuperAdmin]);

  useEffect(() => {
    const unsubToggle = subscriptionService.subscribeFeatureToggle((enabled) => {
      setIsSubFeatureEnabled(enabled);
    });
    const unsubPricing = subscriptionService.subscribeCustomPricing((pricing) => {
      setStarterPriceInput(pricing.starterPrice);
      setProPriceInput(pricing.proPrice);
      setPricingPlans(getSubscriptionPlans());
    });
    return () => {
      unsubToggle();
      unsubPricing();
    };
  }, []);

  const handleSaveCustomPricing = async () => {
    const starter = Math.round(Number(starterPriceInput));
    const pro = Math.round(Number(proPriceInput));
    if (isNaN(starter) || starter <= 0 || isNaN(pro) || pro <= 0) {
      showToast("Please enter valid positive pricing amounts.", "error");
      return;
    }
    setIsSavingPricing(true);
    try {
      await subscriptionService.setCustomPricing({ starterPrice: starter, proPrice: pro });
      setPricingPlans(getSubscriptionPlans());
      showToast("✓ Subscription plan prices updated successfully across the platform!", "success");
    } catch (err: any) {
      showToast("Failed to update prices: " + (err.message || err), "error");
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleResetCustomPricing = async () => {
    setIsSavingPricing(true);
    try {
      await subscriptionService.setCustomPricing({ starterPrice: 2999, proPrice: 6999 });
      setStarterPriceInput(2999);
      setProPriceInput(6999);
      setPricingPlans(getSubscriptionPlans());
      showToast("✓ Plan prices reset to system default (₹2,999 / ₹6,999).", "success");
    } catch (err: any) {
      showToast("Failed to reset prices: " + (err.message || err), "error");
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleToggleSubscriptionFeature = async () => {
    setIsTogglingSubFeature(true);
    const nextState = !isSubFeatureEnabled;
    setIsSubFeatureEnabled(nextState);
    await subscriptionService.setFeatureEnabled(nextState);
    setIsTogglingSubFeature(false);
    showToast(
      nextState
        ? "✓ Global Subscription Plan section is now VISIBLE in restaurant settings."
        : "✕ Global Subscription Plan section is now HIDDEN from restaurant settings.",
      "success"
    );
  };

  const handleToggleRestSubscription = async (r: RestaurantSettings) => {
    const newHidden = !r.hideSubscriptionPlan;
    try {
      await dbService.updateSettings(r.id, { hideSubscriptionPlan: newHidden });
      await fetchAllData();
      showToast(
        newHidden
          ? `Subscription section is now HIDDEN for ${r.name}.`
          : `Subscription section is now VISIBLE for ${r.name}.`,
        'success'
      );
    } catch (err: any) {
      showToast('Failed to update: ' + (err.message || err), 'error');
    }
  };

  // Close any active modal overlay on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditModalOpen) setIsEditModalOpen(false);
        else if (isModalOpen) setIsModalOpen(false);
        else if (isSubModalOpen) setIsSubModalOpen(false);
        else if (isEditUserModalOpen) setIsEditUserModalOpen(false);
        else if (isUserModalOpen) setIsUserModalOpen(false);
        else if (isAnnModalOpen) setIsAnnModalOpen(false);
        else if (credsModal) setCredsModal(null);
        else if (renewModal) setRenewModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isEditModalOpen,
    isModalOpen,
    isSubModalOpen,
    isEditUserModalOpen,
    isUserModalOpen,
    isAnnModalOpen,
    credsModal,
    renewModal
  ]);

  const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const generateRandomPassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Pass#';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleOpenOnboard = () => {
    setRestId('');
    setName('');
    setEmail('');
    setPhone('');
    setPlanType('starter');
    setStatus('trial');
    setCreateAdminAccount(true);
    setAdminFullName('');
    setAdminEmail('');
    setAdminPassword(generateRandomPassword());
    
    // Auto-calculate default initial expiry: +1 Month
    const defaultExpiry = new Date();
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 1);
    setExpiresAt(formatLocalDate(defaultExpiry));
    
    setIsModalOpen(true);
  };

  const handleOpenAddStaffForRest = (targetRestId: string) => {
    setUserRestaurantId(targetRestId);
    setUserFullName('');
    setUserEmail('');
    setUserRole('admin');
    setUserPassword(generateRandomPassword());
    setIsUserModalOpen(true);
  };

  const handleDeleteRestaurant = async (restaurantId: string, restaurantName: string) => {
    askConfirmation(
      'Delete Restaurant?',
      `Are you absolutely sure you want to delete "${restaurantName}"? This will permanently delete the restaurant settings, tables, categories, and food items. This action CANNOT be undone.`,
      async () => {
        try {
          await dbService.deleteRestaurant(restaurantId);
          showToast('Restaurant deleted successfully.', 'success');
          await fetchAllData();
        } catch (err) {
          showToast('Error deleting restaurant: ' + err, 'error');
        }
      }
    );
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    askConfirmation(
      'Delete Staff Account?',
      `Are you sure you want to delete staff account for "${userName}"?`,
      async () => {
        try {
          await dbService.deleteUserByAdmin(userId);
          showToast('Staff user deleted successfully.', 'success');
          await fetchAllData();
        } catch (err) {
          showToast('Error deleting user: ' + err, 'error');
        }
      }
    );
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restId.trim() || !name.trim()) {
      showToast('Restaurant Name and Unique Slug are required.', 'error');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      showToast('A valid Owner Email is required for credentials dispatch and billing notices.', 'error');
      return;
    }

    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (!phone.trim() || cleanPhone.length < 7) {
      showToast('A valid Owner Phone Number (at least 7 digits) is required for WhatsApp alerts.', 'error');
      return;
    }

    const cleanSlug = restId.trim().toLowerCase().replace(/\s+/g, '-');

    try {
      const newRest: Partial<RestaurantSettings> = {
        id: cleanSlug,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        planType,
        subscriptionStatus: status,
        subscriptionExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await dbService.createRestaurant(newRest);
      setIsModalOpen(false);
      showToast('Restaurant onboarded successfully!', 'success');

      // Reset form
      setRestId('');
      setName('');
      setEmail('');
      setPhone('');
      setPlanType('starter');
      setStatus('trial');
      setExpiresAt('');

      await fetchAllData();
    } catch (err) {
      showToast('Error creating restaurant: ' + err, 'error');
    }
  };

  const handleEditClick = (rest: RestaurantSettings) => {
    setSelectedRest(rest);
    setEditName(rest.name || '');
    setEditEmail(rest.email || '');
    setEditPhone(rest.phone || '');
    setEditPlan(rest.planType || 'starter');
    setEditStatus(rest.subscriptionStatus || 'trial');
    if (rest.subscriptionExpiresAt) {
      const date = new Date(rest.subscriptionExpiresAt);
      setEditExpiresAt(date.toISOString().split('T')[0]);
    } else {
      setEditExpiresAt('');
    }
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest) return;

    if (!editName.trim()) {
      showToast('Restaurant Name cannot be empty.', 'error');
      return;
    }

    if (!editEmail.trim() || !editEmail.includes('@')) {
      showToast('A valid Owner Email is required for credentials and dispatch notices.', 'error');
      return;
    }

    const cleanPhone = editPhone.trim().replace(/[^0-9]/g, '');
    if (!editPhone.trim() || cleanPhone.length < 7) {
      showToast('A valid Owner Phone Number (at least 7 digits) is required for WhatsApp notices.', 'error');
      return;
    }

    try {
      const updates: Partial<RestaurantSettings> = {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        planType: editPlan,
        subscriptionStatus: editStatus,
        subscriptionExpiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : undefined
      };

      await dbService.updateRestaurantSubscription(selectedRest.id, updates);
      setIsEditModalOpen(false);
      await fetchAllData();
      showToast('Restaurant details updated successfully.', 'success');
    } catch (err) {
      showToast('Error updating restaurant: ' + err, 'error');
    }
  };

  const handleEditUserClick = (u: UserProfile) => {
    setSelectedUser(u);
    setEditUserFullName(u.name || '');
    setEditUserRole(u.role || 'admin');
    setEditUserRestaurantId(u.restaurantId || '');
    setIsEditUserModalOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await dbService.updateUserByAdmin(selectedUser.id, editUserFullName.trim(), editUserRole, editUserRestaurantId);
      setIsEditUserModalOpen(false);
      await fetchAllData();
      showToast('Staff user profile updated successfully.', 'success');
    } catch (err: any) {
      showToast('Error updating user profile: ' + (err.message || err), 'error');
    }
  };

  const handleOpenSubModal = (rest: RestaurantSettings) => {
    setSubRest(rest);
    setSubPlan(rest.planType || 'starter');
    setSubStatus(rest.subscriptionStatus || 'trial');
    if (rest.subscriptionExpiresAt) {
      const d = new Date(rest.subscriptionExpiresAt);
      setSubExpiresAt(d.toISOString().split('T')[0]);
    } else {
      setSubExpiresAt('');
    }
    setIsSubModalOpen(true);
  };

  const handleSubSave = async () => {
    if (!subRest) return;
    setSubSaving(true);
    try {
      await dbService.updateRestaurantSubscription(subRest.id, {
        planType: subPlan,
        subscriptionStatus: subStatus,
        subscriptionExpiresAt: subExpiresAt ? new Date(subExpiresAt).toISOString() : undefined,
      });
      setIsSubModalOpen(false);
      await fetchAllData();
      showToast(`Subscription updated for ${subRest.name}.`, 'success');
    } catch (err) {
      showToast('Failed to update subscription: ' + err, 'error');
    } finally {
      setSubSaving(false);
    }
  };

  // Derives days left (positive = future, negative = overdue)
  const getDaysLeft = (expiresAt: any): number | null => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleAccessPortal = (restaurantId: string) => {
    if (onImpersonate) {
      onImpersonate(restaurantId);
    } else {
      setRestaurantId(restaurantId);
      localStorage.setItem('superadmin_impersonated_tenant_id', restaurantId);
      localStorage.setItem('last_active_staff_restaurant_id', restaurantId);
      window.history.pushState(null, "", "/admin/dashboard");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleOpenWelcomePackage = (r: RestaurantSettings) => {
    const adminUser = users.find(u => u.restaurantId === r.id && u.role === 'admin') || users.find(u => u.restaurantId === r.id);
    const resolvedEmail = (r.email || adminUser?.email || '').trim();
    const resolvedPhone = (r.phone || '').trim();
    setCredsModal({
      restName: r.name,
      email: resolvedEmail,
      pass: '[Configured Password]',
      role: (adminUser?.role || 'admin').toUpperCase(),
      slug: r.id,
      phone: resolvedPhone,
      restaurantId: r.id,
    });
  };

  const handleOpenRenewalModal = (r: RestaurantSettings) => {
    const adminUser = users.find(u => u.restaurantId === r.id && u.role === 'admin') || users.find(u => u.restaurantId === r.id);
    const days = getDaysLeft(r.subscriptionExpiresAt) ?? 0;
    const effectiveRest: RestaurantSettings = {
      ...r,
      email: (r.email || adminUser?.email || '').trim(),
      phone: (r.phone || '').trim(),
    };
    setRenewModal({
      restaurant: effectiveRest,
      daysLeft: days,
    });
  };

  const handleCreateAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) {
      showToast('Please enter both title and message.', 'error');
      return;
    }
    setAnnSaving(true);
    try {
      const newAnn: SaaSAnnouncement = {
        id: `ann-${Date.now()}`,
        title: annTitle.trim(),
        message: annMessage.trim(),
        type: annType,
        isActive: true,
        isDismissible: annDismissible,
        startsAt: new Date().toISOString(),
        expiresAt: annExpiresAt ? new Date(annExpiresAt).toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };
      await dbService.createAnnouncement(newAnn);
      setIsAnnModalOpen(false);
      setAnnTitle('');
      setAnnMessage('');
      setAnnType('info');
      setAnnDismissible(true);
      setAnnExpiresAt('');
      await fetchAllData();
      showToast('Broadcast announcement published live!', 'success');
    } catch (err: any) {
      showToast('Failed to create announcement: ' + (err.message || err), 'error');
    } finally {
      setAnnSaving(false);
    }
  };

  const handleToggleAnnouncementActive = async (ann: SaaSAnnouncement) => {
    try {
      await dbService.updateAnnouncement(ann.id, { isActive: !ann.isActive });
      await fetchAllData();
      showToast(`Announcement ${!ann.isActive ? 'activated' : 'deactivated'}.`, 'success');
    } catch (err: any) {
      showToast('Failed to update announcement: ' + (err.message || err), 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: string, title: string) => {
    askConfirmation(
      'Delete Announcement?',
      `Are you sure you want to permanently delete "${title}"?`,
      async () => {
        try {
          await dbService.deleteAnnouncement(id);
          await fetchAllData();
          showToast('Announcement deleted.', 'info');
        } catch (err: any) {
          showToast('Failed to delete announcement: ' + (err.message || err), 'error');
        }
      }
    );
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFullName || !userEmail || !userRestaurantId || !userPassword) {
      showToast('Please fill out all fields.', 'error');
      return;
    }
    try {
      await dbService.createStaffUser(
        userEmail.trim(), 
        userFullName.trim(), 
        userRole, 
        userRestaurantId,
        userPassword.trim()
      );

      const targetRest = restaurants.find(r => r.id === userRestaurantId);

      setIsUserModalOpen(false);

      setCredsModal({
        restName: targetRest?.name || userRestaurantId,
        email: userEmail.trim(),
        pass: userPassword.trim(),
        role: userRole.toUpperCase(),
        slug: userRestaurantId,
        phone: (targetRest?.phone || '').trim(),
        restaurantId: userRestaurantId,
      });

      setUserFullName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole('admin');
      await fetchAllData();
    } catch (err: any) {
      showToast('Error creating user: ' + (err.message || err), 'error');
    }
  };

  // Filtered & sorted lists with Status Pills
  const filtered = restaurants
    .filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (r.email && r.email.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return r.subscriptionStatus === 'active';
      if (statusFilter === 'trial') return r.subscriptionStatus === 'trial' || !r.subscriptionStatus;
      if (statusFilter === 'renewals_due') {
        const days = getDaysLeft(r.subscriptionExpiresAt);
        return r.subscriptionStatus === 'expired' || r.subscriptionStatus === 'suspended' || (days !== null && days <= 7);
      }
      if (statusFilter === 'expired') return r.subscriptionStatus === 'expired';
      if (statusFilter === 'suspended') return r.subscriptionStatus === 'suspended';
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return (a.subscriptionStatus || 'trial').localeCompare(b.subscriptionStatus || 'trial');
      if (sortBy === 'expiry') {
        const da = a.subscriptionExpiresAt ? new Date(a.subscriptionExpiresAt).getTime() : 0;
        const db = b.subscriptionExpiresAt ? new Date(b.subscriptionExpiresAt).getTime() : 0;
        return da - db;
      }
      if (sortBy === 'date') {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      }
      return 0;
    });

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.restaurantId && u.restaurantId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Strict Super Admin Access Guard
  if (!currentUser || !currentUser.isSuperAdmin) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto animate-fade-in">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-850 dark:text-slate-100">Super Admin Access Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          You do not have administrative authorization to view SaaS tenant controls. Only verified SaaS Super Administrators can access this portal.
        </p>
      </div>
    );
  }

  // Statistics
  const totalCount = restaurants.length;
  const activeCount = restaurants.filter(r => r.subscriptionStatus === 'active').length;
  const trialCount = restaurants.filter(r => r.subscriptionStatus === 'trial').length;
  const expiredCount = restaurants.filter(r => r.subscriptionStatus === 'expired' || r.subscriptionStatus === 'suspended').length;
  const renewalsDueCount = restaurants.filter(r => {
    const days = getDaysLeft(r.subscriptionExpiresAt);
    return r.subscriptionStatus === 'expired' || r.subscriptionStatus === 'suspended' || (days !== null && days <= 7);
  }).length;
  const activeAnnouncementsCount = announcements.filter(a => a.isActive).length;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-emerald-900/15 border border-emerald-500/30">
        <div>
          <div className="flex items-center gap-2 bg-white/20 px-3.5 py-1 rounded-full text-xs font-black w-fit mb-2 backdrop-blur-md border border-white/20">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Super Admin Central Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-sans">SaaS Tenant Manager</h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl font-medium">Onboard restaurant client accounts, manage subscription billing lifecycles, and monitor system metrics.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={fetchAllData}
              className="bg-white/20 hover:bg-white/30 p-3 rounded-2xl transition-all cursor-pointer backdrop-blur-md flex items-center justify-center flex-1 sm:flex-none text-white border border-white/30 active:scale-95"
              title="Refresh database"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleOpenOnboard}
              className="flex items-center justify-center gap-2 bg-white text-emerald-950 hover:bg-emerald-50 font-black px-5 py-3 rounded-2xl shadow-lg transition-all text-xs sm:text-sm cursor-pointer flex-[3] sm:flex-none whitespace-nowrap active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>+ Onboard Restaurant</span>
            </button>
          </div>
          <button
            onClick={() => {
              if (restaurants.length === 0) {
                showToast('Please onboard at least one restaurant first!', 'error');
                return;
              }
              setUserRestaurantId(restaurants[0].id);
              setIsUserModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 font-black px-5 py-3 rounded-2xl shadow-lg transition-all text-xs sm:text-sm cursor-pointer backdrop-blur-md w-full sm:w-auto whitespace-nowrap active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>+ Create Staff User</span>
          </button>

          {/* Quick 1-Click Subscription Feature Visibility Button */}
          <button
            type="button"
            onClick={handleToggleSubscriptionFeature}
            disabled={isTogglingSubFeature}
            className={`flex items-center justify-center gap-2 font-black px-4 py-3 rounded-2xl shadow-lg transition-all text-xs sm:text-sm cursor-pointer whitespace-nowrap active:scale-95 border backdrop-blur-md ${
              isSubFeatureEnabled
                ? "bg-emerald-500/30 hover:bg-emerald-500/40 text-white border-emerald-300/40"
                : "bg-rose-500/30 hover:bg-rose-500/40 text-rose-100 border-rose-300/40"
            }`}
            title="Single-click button to toggle Subscription Plan section visibility in restaurant settings"
          >
            {isSubFeatureEnabled ? (
              <>
                <Eye className="w-4 h-4 text-emerald-300" />
                <span>Subscriptions: Visible</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-rose-300" />
                <span>Subscriptions: Hidden</span>
                <span className="w-2 h-2 rounded-full bg-rose-400 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Onboarded</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center border border-green-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Active Paid Pro</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Free Trials</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{trialCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Expired / Suspended</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{expiredCount}</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-3 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => { setActiveTab('restaurants'); setSearchQuery(''); }}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-extrabold transition-all cursor-pointer relative ${
            activeTab === 'restaurants'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Restaurants Directory ({restaurants.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-extrabold transition-all cursor-pointer relative ${
            activeTab === 'users'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accounts ({users.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('announcements'); setSearchQuery(''); }}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-extrabold transition-all cursor-pointer relative ${
            activeTab === 'announcements'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Broadcasts ({announcements.length})</span>
          {activeAnnouncementsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("subscriptions"); setSearchQuery(""); }}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-extrabold transition-all cursor-pointer relative ${
            activeTab === "subscriptions"
              ? "text-brand-600 dark:text-brand-400 border-b-2 border-brand-500"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>SaaS Subscriptions & Razorpay ({subPayments.length})</span>
        </button>
      </div>

            {/* ===== SAAS SUBSCRIPTIONS & RAZORPAY TAB VIEW ===== */}
      {activeTab === "subscriptions" && (
        <div className="space-y-6 animate-fade-in">
          {/* Subscription Feature Visibility Master Toggle */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 p-5 sm:p-6 rounded-3xl shadow-sm text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isSubFeatureEnabled
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-400 border-rose-500/30"
              }`}>
                {isSubFeatureEnabled ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Subscription Feature Visibility
                  </h3>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isSubFeatureEnabled
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                  }`}>
                    {isSubFeatureEnabled ? "Visible in Settings" : "Hidden from Settings"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isSubFeatureEnabled
                    ? "The Subscription Plan & Renewal section is currently visible in all restaurant settings."
                    : "The Subscription Plan & Renewal section is completely hidden from all restaurant settings. Restaurant owners cannot see or access it."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSubscriptionFeature}
              disabled={isTogglingSubFeature}
              className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 shrink-0 ${
                isSubFeatureEnabled
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
              }`}
            >
              {isSubFeatureEnabled ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Hide Subscription Section</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Show Subscription Section</span>
                </>
              )}
            </button>
          </div>

          {/* Revenue Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total SaaS Revenue</span>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatINR(subPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0))}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">From {subPayments.length} automated renewals</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Active Paid Tenants</span>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                {restaurants.filter(r => r.subscriptionStatus === "active").length}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Out of {restaurants.length} total restaurants</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Payment Gateway Status</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${rzpKeyInput && !rzpKeyInput.includes("RestaurantsOS") ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`} />
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {rzpKeyInput && !rzpKeyInput.includes("RestaurantsOS") ? "Live / Connected" : "Sandbox / Demo Mode"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">{rzpKeyInput || "No key set"}</p>
            </div>
          </div>

          {/* Razorpay Gateway API Credentials Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Razorpay Gateway Credentials
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tenants will pay their Starter (₹2,999) and Pro (₹6,999) subscriptions directly into your Razorpay account.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Instant Auto-Renew
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Razorpay Key ID (Key_Id)
                </label>
                <input
                  type="text"
                  placeholder="e.g. rzp_live_xxxxxxxx or rzp_test_xxxxxxxx"
                  value={rzpKeyInput}
                  onChange={(e) => setRzpKeyInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Razorpay Key Secret (Optional / Webhooks)
                </label>
                <input
                  type="password"
                  placeholder="e.g. •••••••••••••••••"
                  value={rzpSecretInput}
                  onChange={(e) => setRzpSecretInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400">
                Obtain your Key ID from <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-bold">Razorpay Dashboard &rarr; Settings &rarr; API Keys</a>.
              </span>
              <button
                type="button"
                onClick={() => {
                  setRazorpayKeyId(rzpKeyInput);
                  setRazorpayKeySecret(rzpSecretInput);
                  showToast("Razorpay credentials saved successfully!", "success");
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Save Credentials
              </button>
            </div>
          </div>

          {/* Subscription Plan Pricing Management Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Subscription Plan Pricing Management
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set or change the 6-Month subscription prices for all tenant restaurants. Updated prices apply instantly to Razorpay checkout.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                Live Pricing Control
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Starter Plan Price Input */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">⚡</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">Starter Plan (6 Months)</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ~{formatINR(Math.round((Number(starterPriceInput) || 0) / 6))} / mo
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Starter Plan Total Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="2999"
                      value={starterPriceInput}
                      onChange={(e) => setStarterPriceInput(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Default: ₹2,999 for 6 Months (~₹500/month)</p>
                </div>
              </div>

              {/* Pro Restaurant Plan Price Input */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">👑</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">Pro Restaurant Plan (6 Months)</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ~{formatINR(Math.round((Number(proPriceInput) || 0) / 6))} / mo
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Pro Plan Total Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="6999"
                      value={proPriceInput}
                      onChange={(e) => setProPriceInput(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Default: ₹6,999 for 6 Months (~₹1,166/month)</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetCustomPricing}
                disabled={isSavingPricing}
                className="w-full sm:w-auto text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                Reset to Default (₹2,999 / ₹6,999)
              </button>

              <button
                type="button"
                onClick={handleSaveCustomPricing}
                disabled={isSavingPricing}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingPricing ? "Updating Prices..." : "Save Plan Prices"}</span>
              </button>
            </div>
          </div>

          {/* Pricing Plans Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pricingPlans.map(plan => (
              <div key={plan.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xl">{plan.icon}</span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">{plan.name}</h4>
                  <p className="text-xs text-slate-400">{plan.durationText} validity</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatINR(plan.price)}</span>
                  <span className="text-[10px] text-slate-400 block font-bold">~{formatINR(plan.pricePerMonth)} / mo</span>
                </div>
              </div>
            ))}
          </div>

          {/* Payments Invoices Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Automated Razorpay Payments Log
                </h3>
                <p className="text-xs text-slate-400">Real-time payment transactions recorded from tenant renewals.</p>
              </div>
              <button
                onClick={fetchAllData}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                title="Refresh payments"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {subPayments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-bold">No online subscription payments recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">When tenant restaurant owners pay or renew via Razorpay, transaction receipts appear here automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-4">Restaurant</th>
                      <th className="p-4">Plan</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Razorpay Payment ID</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Valid Until</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{p.restaurantName}</td>
                        <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{p.planName}</td>
                        <td className="p-4 font-extrabold text-slate-900 dark:text-white">{formatINR(p.amount)}</td>
                        <td className="p-4 font-mono text-[11px] text-slate-500 truncate max-w-[150px]">{p.razorpayPaymentId}</td>
                        <td className="p-4 text-slate-500">{new Date(p.paidAt).toLocaleDateString()}</td>
                        <td className="p-4 text-slate-500 font-bold">{new Date(p.expiresAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
                            Successful
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Table Section */}
      {activeTab !== "subscriptions" && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-base font-black text-slate-850 dark:text-slate-100 flex items-center gap-2">
              {activeTab === 'restaurants' ? (
                <>
                  <Building className="w-5 h-5 text-brand-500" />
                  <span>Onboarded Restaurants directory</span>
                </>
              ) : activeTab === 'users' ? (
                <>
                  <Users className="w-5 h-5 text-indigo-500" />
                  <span>Registered Staff Accounts</span>
                </>
              ) : (
                <>
                  <Megaphone className="w-5 h-5 text-brand-500" />
                  <span>Platform Broadcast Announcements</span>
                </>
              )}
            </h2>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-72 shadow-sm rounded-2xl">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder={
                    activeTab === 'restaurants' 
                      ? "Search by restaurant name or slug..." 
                      : activeTab === 'users' 
                        ? "Search by staff name, email, or role..." 
                        : "Search announcements..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 pl-11 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-medium text-slate-800 dark:text-slate-100"
                />
              </div>
              {activeTab === 'announcements' && (
                <button
                  type="button"
                  onClick={() => setIsAnnModalOpen(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-black px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Broadcast</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Pills & Sort Selector */}
          {activeTab === 'restaurants' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status Filter:
                </span>
                {[
                  { id: 'all', label: `All (${restaurants.length})` },
                  { id: 'active', label: `Active (${activeCount})` },
                  { id: 'trial', label: `Free Trial (${trialCount})` },
                  { id: 'renewals_due', label: `⚠️ Renewals Due (${renewalsDueCount})` },
                  { id: 'expired', label: `Expired (${restaurants.filter(r => r.subscriptionStatus === 'expired').length})` },
                  { id: 'suspended', label: `Suspended (${restaurants.filter(r => r.subscriptionStatus === 'suspended').length})` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id as any)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-95 ${
                      statusFilter === f.id
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="expiry">Expiry Date</option>
                  <option value="date">Newest Onboarded</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table Body */}
        {loading ? (
          <PageLoader 
            compact={true} 
            size="md"
            message="LOADING TENANT DIRECTORIES..." 
            subtext="Syncing restaurant tenants and staff accounts" 
          />
        ) : activeTab === 'restaurants' ? (
          filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Building className="w-14 h-14 text-slate-200 dark:text-slate-800 mx-auto mb-4 stroke-[1.2]" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">No Restaurants Found</h3>
              <p className="text-xs text-slate-400 mt-1">Try refining your search terms or onboard a new client.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">Name & Slug</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Plan Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Expiry Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {filtered.map(r => {
                    const statusColors: Record<string, string> = {
                      trial: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
                      active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
                      expired: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
                      suspended: 'bg-slate-50 text-slate-505 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    };

                    const planLabels: Record<string, string> = {
                      starter: '1 Month Plan',
                      pro_6m: '6 Months Plan',
                      pro_1y: '12 Months Plan'
                    };

                    const staffUsersCount = users.filter(u => u.restaurantId === r.id).length;
                    const adminUser = users.find(u => u.restaurantId === r.id && u.role === 'admin') || users.find(u => u.restaurantId === r.id);
                    const resolvedEmail = (r.email || adminUser?.email || '').trim();
                    const cleanPhone = (r.phone || '').trim().replace(/[^0-9]/g, '');
                    const hasEmail = resolvedEmail.includes('@');
                    const hasPhone = cleanPhone.length >= 7;
                    const hasAnyContact = hasEmail || hasPhone;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{r.name}</span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {staffUsersCount}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1.5">
                            <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded">ID: {r.id}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(r.id);
                                setCopiedSlugId(r.id);
                                showToast(`Tenant ID "${r.id}" copied!`, 'info');
                                setTimeout(() => setCopiedSlugId(null), 2000);
                              }}
                              className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                              title="Copy Tenant Slug ID"
                            >
                              {copiedSlugId === r.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          <div>{r.email || 'No email registered'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{r.phone || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                            <Award className="w-3.5 h-3.5 text-brand-500" />
                            {getPlanLabel(r.planType || 'starter')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${statusColors[r.subscriptionStatus || 'trial']}`}>
                            {r.subscriptionStatus || 'trial'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          {r.subscriptionExpiresAt ? (
                            <div>
                              <div>{new Date(r.subscriptionExpiresAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                              {(() => {
                                const days = getDaysLeft(r.subscriptionExpiresAt);
                                if (days === null) return null;
                                if (days <= 0 || r.subscriptionStatus === 'expired') {
                                  return <span className="inline-block mt-0.5 text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/40">Expired</span>;
                                }
                                if (days <= 1) {
                                  return <span className="inline-block mt-0.5 text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/40 animate-pulse">Expires Today / 1d!</span>;
                                }
                                if (days <= 5) {
                                  return <span className="inline-block mt-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-900/40">{days}d left</span>;
                                }
                                return <span className="text-[10px] text-slate-400 block">{days} days left</span>;
                              })()}
                            </div>
                          ) : (
                            'Lifetime / Lifetime'
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAccessPortal(r.id)}
                              className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-600 dark:hover:text-white dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer inline-flex items-center gap-1 shadow-sm"
                              title="Access Live POS Portal"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Portal</span>
                            </button>
                            <button
                              type="button"
                              disabled={!hasAnyContact}
                              onClick={() => handleOpenRenewalModal(r)}
                              className={`border text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all duration-200 inline-flex items-center gap-1 shadow-sm ${
                                hasAnyContact
                                  ? 'bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-500 dark:hover:text-white dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:-translate-y-0.5 active:scale-95 cursor-pointer'
                                  : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
                              }`}
                              title={hasAnyContact ? "Send WhatsApp / Email Renewal Notice" : "No phone or email registered. Click Edit to add contact details."}
                            >
                              <Bell className={`w-3 h-3 ${hasAnyContact ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-600'}`} />
                              <span>Remind</span>
                            </button>
                            <button
                              type="button"
                              disabled={!hasAnyContact}
                              onClick={() => handleOpenWelcomePackage(r)}
                              className={`border text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all duration-200 inline-flex items-center gap-1 shadow-sm ${
                                hasAnyContact
                                  ? 'bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-900 dark:bg-slate-800 dark:hover:bg-white dark:hover:text-black dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:-translate-y-0.5 active:scale-95 cursor-pointer'
                                  : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
                              }`}
                              title={hasAnyContact ? "Share Credentials & Welcome Package (WhatsApp / Email)" : "No phone or email registered. Click Edit to add contact details."}
                            >
                              <Share2 className={`w-3 h-3 ${hasAnyContact ? 'text-slate-500' : 'text-slate-400 dark:text-slate-600'}`} />
                              <span>Share</span>
                            </button>
                            {/* 1-Click Toggle for Restaurant Subscription Section */}
                            <button
                              type="button"
                              onClick={() => handleToggleRestSubscription(r)}
                              className={`border text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all duration-200 inline-flex items-center gap-1 shadow-sm cursor-pointer hover:-translate-y-0.5 active:scale-95 ${
                                r.hideSubscriptionPlan
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                              }`}
                              title={r.hideSubscriptionPlan ? "Subscription section is HIDDEN in settings. Click to show." : "Subscription section is VISIBLE in settings. Click to hide."}
                            >
                              {r.hideSubscriptionPlan ? (
                                <>
                                  <EyeOff className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  <span>Sub: Hidden</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Sub: Visible</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenSubModal(r)}
                              className="bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-900 dark:bg-slate-800 dark:hover:bg-white dark:hover:text-black dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer inline-flex items-center gap-1 shadow-sm"
                              title="Manage Subscription"
                            >
                              <CreditCard className="w-3 h-3 text-slate-500" />
                              <span>Billing</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAddStaffForRest(r.id)}
                              className="bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-900 dark:bg-slate-800 dark:hover:bg-white dark:hover:text-black dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer inline-flex items-center gap-1 shadow-sm"
                              title="Add Staff User to this Restaurant"
                            >
                              <UserPlus className="w-3 h-3 text-slate-500" />
                              <span>+ Staff</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditClick(r)}
                              className="bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-900 dark:bg-slate-800 dark:hover:bg-white dark:hover:text-black dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
                              title="Edit Restaurant Info"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRestaurant(r.id, r.name)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-950/30 dark:text-red-400 p-1.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer inline-flex items-center justify-center"
                              title="Delete Restaurant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'users' ? (
          filteredUsers.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="w-14 h-14 text-slate-200 dark:text-slate-800 mx-auto mb-4 stroke-[1.2]" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">No Staff Found</h3>
              <p className="text-xs text-slate-400 mt-1">Try refining your search terms or create a new user profile.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">Staff Member</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Assigned Restaurant</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Joined Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {filteredUsers.map(u => {
                    const roleLabels: Record<string, string> = {
                      admin: 'Administrator',
                      manager: 'Store Manager',
                      cashier: 'Cashier Staff',
                      kitchen: 'Kitchen Chef',
                      waiter: 'Waiter Staff'
                    };

                    const roleColors: Record<string, string> = {
                      admin: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
                      manager: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30',
                      cashier: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
                      kitchen: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
                      waiter: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    };

                    const matchedRestaurant = restaurants.find(r => r.id === u.restaurantId);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-800 dark:text-slate-200">{u.name}</div>
                          {u.isSuperAdmin && (
                            <span className="inline-flex text-[9px] font-extrabold uppercase bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30 mt-0.5">SaaS Owner</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          {u.email}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700 dark:text-slate-300">
                            {matchedRestaurant ? matchedRestaurant.name : 'Unknown Restaurant'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-widest">{u.restaurantId || 'No Tenant'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${roleColors[u.role] || 'bg-slate-100 text-slate-800'}`}>
                            {roleLabels[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          {u.createdAt ? (
                            new Date(u.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {u.isSuperAdmin ? (
                            <span className="text-[10px] text-slate-400 italic">Protected</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditUserClick(u)}
                                className="bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/20 dark:hover:bg-brand-950/30 dark:text-brand-400 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-950/30 dark:text-red-400 p-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                                title="Delete Staff"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredAnnouncements.length === 0 ? (
            <div className="py-20 text-center">
              <Megaphone className="w-14 h-14 text-slate-200 dark:text-slate-800 mx-auto mb-4 stroke-[1.2]" />
              <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">No Announcements Broadcasted</h3>
              <p className="text-xs text-slate-400 mt-1">Create an announcement to broadcast alerts or updates to all restaurant staff.</p>
              <button
                type="button"
                onClick={() => setIsAnnModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black px-4 py-2.5 rounded-2xl transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Broadcast</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">Title & Content</th>
                    <th className="px-6 py-4">Style</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Dismissible</th>
                    <th className="px-6 py-4">Expiry Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {filteredAnnouncements.map(ann => {
                    const typeBadgeColors: Record<string, string> = {
                      info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300',
                      warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300',
                      success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300',
                      urgent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300',
                    };

                    return (
                      <tr key={ann.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-colors">
                        <td className="px-6 py-4 max-w-sm">
                          <div className="font-extrabold text-slate-850 dark:text-slate-100">{ann.title}</div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate mt-0.5">{ann.message}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${typeBadgeColors[ann.type] || 'bg-slate-100 text-slate-700'}`}>
                            {ann.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleAnnouncementActive(ann)}
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                              ann.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                            title="Click to toggle active status"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${ann.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            <span>{ann.isActive ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          {ann.isDismissible ? (
                            <span className="text-slate-700 dark:text-slate-300 font-bold">Dismissible</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">Persistent</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          {ann.expiresAt ? new Date(ann.expiresAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never (Permanent)'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-950/30 dark:text-red-400 p-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Delete Announcement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
      )}

      {/* Onboard Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-base font-black text-slate-850 dark:text-slate-100">Onboard New Restaurant</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Set up tenant details & optional admin staff account</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              {/* Step 1: Restaurant Info */}
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" /> Step 1: Restaurant Details
                </p>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Restaurant Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Grand Bistro"
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      if (!restId) {
                        setRestId(val.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-850 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Unique Slug / Tenant ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bistro-delhi"
                    value={restId}
                    onChange={(e) => setRestId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-850 dark:text-slate-100 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Owner Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@bistro.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (!adminEmail) setAdminEmail(e.target.value);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Owner Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 XXXXX XXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Subscription Plan</label>
                    <select
                      value={planType}
                      onChange={(e) => {
                        const val = e.target.value as 'starter' | 'pro_6m' | 'pro_1y';
                        setPlanType(val);
                        const now = new Date();
                        if (val === 'starter') now.setMonth(now.getMonth() + 1);
                        else if (val === 'pro_6m') now.setMonth(now.getMonth() + 6);
                        else if (val === 'pro_1y') now.setFullYear(now.getFullYear() + 1);
                        setExpiresAt(formatLocalDate(now));
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-850 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="starter">{getPlanLabel("starter")}</option>
                      <option value="pro_6m">{getPlanLabel("pro")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Initial Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="trial">Free Trial</option>
                      <option value="active">Active Plan</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-5 rounded-2xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Onboard Tenant</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== SUBSCRIPTION MANAGEMENT MODAL ===== */}
      {isSubModalOpen && subRest && (() => {
        const daysLeft = getDaysLeft(subExpiresAt);
        const isExpired = daysLeft !== null && daysLeft <= 0;
        const isWarning = daysLeft !== null && daysLeft > 0 && daysLeft <= 14;

        const plans = [
          {
            id: "starter" as const,
            label: "Starter Plan",
            duration: "6 Months (180 days)",
            months: 6,
            price: 2999,
            icon: "⚡",
            color: "border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400",
            ring: "ring-amber-400",
            badge: "₹2,999 / 6 Mo",
          },
          {
            id: "pro_6m" as const,
            label: "Pro Restaurant Plan",
            duration: "6 Months (180 days)",
            months: 6,
            price: 6999,
            icon: "👑",
            color: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400",
            ring: "ring-emerald-500",
            badge: "₹6,999 / 6 Mo",
          },
        ];

        const applyPlan = (plan: typeof plans[0]) => {
          setSubPlan(plan.id);
          const newDate = new Date();
          newDate.setMonth(newDate.getMonth() + plan.months);
          setSubExpiresAt(newDate.toISOString().split('T')[0]);
          setSubStatus('active');
        };

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsSubModalOpen(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in overflow-hidden">

              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-purple-200 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <CreditCard className="w-3 h-3" />
                      <span>Subscription Management</span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight">{subRest.name}</h3>
                    <p className="text-purple-200 text-[10px] font-mono uppercase tracking-widest mt-0.5">{subRest.id}</p>
                  </div>
                  <button onClick={() => setIsSubModalOpen(false)} className="text-purple-200 hover:text-white mt-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Current status banner */}
                <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-purple-200">Current Status</p>
                    <p className="font-black text-sm capitalize mt-0.5">
                      {subStatus === 'active' ? '✅ Active' :
                       subStatus === 'trial' ? '🟡 Free Trial' :
                       subStatus === 'suspended' ? '🚫 Suspended' : '❌ Expired'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-purple-200">Expires</p>
                    <p className="font-black text-sm mt-0.5">
                      {subExpiresAt
                        ? new Date(subExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                  {daysLeft !== null && (
                    <div className={`text-right px-3 py-1.5 rounded-xl text-center font-black text-sm min-w-[70px] ${
                      isExpired ? 'bg-red-500/30 text-red-200' :
                      isWarning ? 'bg-amber-400/30 text-amber-200' :
                      'bg-emerald-400/30 text-emerald-200'
                    }`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">Days Left</p>
                      <p className="text-lg font-black leading-none mt-0.5">
                        {isExpired ? `+${Math.abs(daysLeft)}` : daysLeft}
                      </p>
                      {isExpired && <p className="text-[8px] opacity-70">overdue</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">

                {/* Plan Cards */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Select Subscription Plan</p>
                  <div className="grid grid-cols-3 gap-3">
                    {plans.map(plan => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => applyPlan(plan)}
                        className={`relative border-2 rounded-2xl p-3.5 text-center transition-all cursor-pointer ${
                          subPlan === plan.id
                            ? `${plan.color} ${plan.ring} ring-2 scale-[1.03] shadow-md`
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {subPlan === plan.id && (
                          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-current text-white text-[8px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: plan.id === 'starter' ? '#f59e0b' : plan.id === 'pro_6m' ? '#6366f1' : '#10b981', color: '#fff' }}>
                            Selected
                          </span>
                        )}
                        <div className="text-2xl mb-1">{plan.icon}</div>
                        <p className="font-black text-sm text-slate-800 dark:text-slate-100">{plan.label}</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{plan.duration}</p>
                        <p className="text-[9px] font-bold mt-1.5 uppercase tracking-wide" style={{ color: plan.id === 'starter' ? '#d97706' : plan.id === 'pro_6m' ? '#6366f1' : '#10b981' }}>
                          {plan.badge}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Controls */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Subscription Status</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 'active', label: 'Activate', icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/50' },
                      { val: 'trial', label: 'Trial', icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/50' },
                      { val: 'expired', label: 'Expired', icon: <AlertCircle className="w-3.5 h-3.5" />, cls: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800/50' },
                      { val: 'suspended', label: 'Suspend', icon: <Ban className="w-3.5 h-3.5" />, cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700' },
                    ].map(s => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setSubStatus(s.val as any)}
                        className={`flex flex-col items-center gap-1 border-2 rounded-xl py-2.5 px-1 text-[9px] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                          subStatus === s.val
                            ? `${s.cls} ring-2 ring-current scale-[1.04]`
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {s.icon}
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Expiry Override */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Custom Expiry Date Override</p>
                  <input
                    type="date"
                    value={subExpiresAt}
                    onChange={e => setSubExpiresAt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-100 cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-400 mt-1.5">Overrides auto-calculated date from plan selection above.</p>
                </div>

                {/* Days Progress Bar */}
                {subExpiresAt && (() => {
                  const totalDays = subPlan === 'starter' ? 30 : subPlan === 'pro_6m' ? 180 : 365;
                  const dl = getDaysLeft(subExpiresAt);
                  const pct = dl !== null ? Math.max(0, Math.min(100, (dl / totalDays) * 100)) : 0;
                  return (
                    <div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1.5">
                        <span>Subscription Timeline</span>
                        <span>{dl !== null ? (dl > 0 ? `${dl} days remaining` : `${Math.abs(dl)} days overdue`) : ''}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Footer */}
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-2xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubSave}
                  disabled={subSaving}
                  className="flex-[2] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-2xl text-xs transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  {subSaving ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5" /> Apply Subscription Changes</>
                  )}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Edit Modal */}
      {isEditModalOpen && selectedRest && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-black text-slate-850 dark:text-slate-100">Edit Restaurant Details</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">ID: {selectedRest.id}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Grand Bistro"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-855 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Owner Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@restaurant.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-855 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Owner Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 XXXXX XXXXX"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-855 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Selected Plan</label>
                  <select
                    value={editPlan}
                    onChange={(e) => {
                      const val = e.target.value as 'starter' | 'pro_6m' | 'pro_1y';
                      setEditPlan(val);
                      const now = new Date();
                      if (val === 'starter') {
                        now.setMonth(now.getMonth() + 1);
                      } else if (val === 'pro_6m') {
                        now.setMonth(now.getMonth() + 6);
                      } else if (val === 'pro_1y') {
                        now.setFullYear(now.getFullYear() + 1);
                      }
                      setEditExpiresAt(formatLocalDate(now));
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="starter">{getPlanLabel("starter")}</option>
                    <option value="pro_6m">{getPlanLabel("pro")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Billing Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="trial">Free Trial</option>
                    <option value="active">Active Plan</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Billing Expiry Date</label>
                <input
                  type="date"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                />
              </div>

              {/* Quick Renewal Actions */}
              <div className="bg-brand-500/5 border border-brand-500/10 p-4 rounded-2xl space-y-2 mt-4">
                <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-wider block">⚡ Quick Subscription Renewal</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setDate(newDate.getDate() + 30);
                      setEditExpiresAt(newDate.toISOString().split('T')[0]);
                      setEditStatus('active');
                      showToast('Set to Active and extended +30 Days.', 'info');
                    }}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 py-2 rounded-xl text-[10px] font-bold transition-all"
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setMonth(newDate.getMonth() + 6);
                      setEditExpiresAt(newDate.toISOString().split('T')[0]);
                      setEditStatus('active');
                      showToast('Set to Active and extended +6 Months.', 'info');
                    }}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 py-2 rounded-xl text-[10px] font-bold transition-all"
                  >
                    +6 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setFullYear(newDate.getFullYear() + 1);
                      setEditExpiresAt(newDate.toISOString().split('T')[0]);
                      setEditStatus('active');
                      showToast('Set to Active and extended +1 Year.', 'info');
                    }}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 py-2 rounded-xl text-[10px] font-bold transition-all"
                  >
                    +1 Year
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-5 rounded-2xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md text-xs cursor-pointer"
                >
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isUserModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUserModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-855 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-slate-850 dark:text-slate-100">Create Staff User</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Staff Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-850 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="rahul@restaurant.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-855 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Assign Restaurant</label>
                  <select
                    value={userRestaurantId}
                    onChange={(e) => setUserRestaurantId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Staff Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Store Manager</option>
                    <option value="cashier">Cashier Staff</option>
                    <option value="kitchen">Kitchen Chef</option>
                    <option value="waiter">Waiter Staff</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Password</label>
                  <button
                    type="button"
                    onClick={() => setUserPassword(generateRandomPassword())}
                    className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <Zap className="w-3 h-3" /> Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-4 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-855 dark:text-slate-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-5 rounded-2xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Staff Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== CREATED CREDENTIALS / WELCOME PACKAGE SUMMARY MODAL ===== */}
      {credsModal && (() => {
        const portalUrl = `${window.location.origin}/admin`;
        const customerMenuUrl = `${window.location.origin}/menu/${credsModal.slug}`;
        const welcomeMessage = `👋 *Welcome to RestaurantsOS!*\n\nHere are your access details for *${credsModal.restName}*:\n\n🏢 *Restaurant:* ${credsModal.restName}\n👤 *Role:* ${credsModal.role}\n📧 *Login Email:* ${credsModal.email || 'Not configured'}\n🔑 *Password:* ${credsModal.pass}\n\n💻 *Staff POS Portal:* ${portalUrl}\n📱 *Customer QR Menu:* ${customerMenuUrl}\n\nPlease save these credentials securely. Reach out anytime if you need assistance!`;

        const cleanPhone = (credsModal.phone || '').trim().replace(/[^0-9]/g, '');
        const hasPhone = cleanPhone.length >= 7;
        const hasEmail = Boolean(credsModal.email && credsModal.email.includes('@'));
        const targetRest = restaurants.find(item => item.id === (credsModal.restaurantId || credsModal.slug));

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCredsModal(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-in text-center max-h-[90vh] overflow-y-auto">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">Welcome & Access Package</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Share account credentials with <strong className="text-slate-700 dark:text-slate-200">{credsModal.restName}</strong>
              </p>

              {(!hasPhone || !hasEmail) && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2 text-left mt-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-[11px] font-medium leading-tight">
                      Missing {!hasPhone && !hasEmail ? 'phone & email' : !hasPhone ? 'phone number' : 'email'}. Direct dispatch disabled.
                    </span>
                  </div>
                  {targetRest && (
                    <button
                      type="button"
                      onClick={() => {
                        setCredsModal(null);
                        handleEditClick(targetRest);
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0 cursor-pointer"
                    >
                      Edit &rarr;
                    </button>
                  )}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 my-4 text-left space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans text-[10px] font-extrabold uppercase">Restaurant Slug</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{credsModal.slug}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans text-[10px] font-extrabold uppercase">Role</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{credsModal.role}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 dark:border-slate-700/50 pt-2">
                  <span className="text-slate-400 font-sans text-[10px] font-extrabold uppercase">Email</span>
                  <span className={`font-bold ${hasEmail ? 'text-slate-800 dark:text-slate-200' : 'text-rose-500 italic'}`}>
                    {credsModal.email || 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans text-[10px] font-extrabold uppercase">Phone</span>
                  <span className={`font-bold ${hasPhone ? 'text-slate-800 dark:text-slate-200' : 'text-rose-500 italic'}`}>
                    {credsModal.phone || 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 dark:border-slate-700/50 pt-2">
                  <span className="text-slate-400 font-sans text-[10px] font-extrabold uppercase">Password</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 bg-amber-400/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                    {credsModal.pass}
                  </span>
                </div>
              </div>

              {/* Instant WhatsApp & Email Dispatch Actions */}
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  {hasPhone ? (
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(welcomeMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-3 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Send WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                      title="No phone number configured for WhatsApp dispatch"
                    >
                      <MessageSquare className="w-4 h-4 opacity-40" />
                      <span>No Phone</span>
                    </button>
                  )}

                  {hasEmail ? (
                    <a
                      href={`mailto:${credsModal.email}?subject=${encodeURIComponent(`Welcome to RestaurantsOS - Credentials for ${credsModal.restName}`)}&body=${encodeURIComponent(welcomeMessage)}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-3 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Send Email</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                      title="No email configured for Email dispatch"
                    >
                      <Mail className="w-4 h-4 opacity-40" />
                      <span>No Email</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(welcomeMessage);
                      setCopiedText(true);
                      showToast('Complete welcome package copied to clipboard!', 'success');
                      setTimeout(() => setCopiedText(false), 3000);
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-3 rounded-2xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedText ? 'Copied Full Package!' : 'Copy Full Details'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCredsModal(null)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-5 rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== RENEWAL ALERT DISPATCHER MODAL ===== */}
      {renewModal && (() => {
        const r = renewModal.restaurant;
        const days = renewModal.daysLeft;
        const urgency = days <= 0 
          ? 'has expired' 
          : days === 1 
            ? 'expires tomorrow' 
            : `expires in ${days} days`;
        const renewNoticeText = `⚠️ *RestaurantsOS Subscription Notice*\n\nDear *${r.name}* Team,\nYour ${getPlanLabel(r.planType || 'starter')} subscription ${urgency}.\n\nTo ensure zero interruption to your live POS billing and QR guest ordering, please renew your subscription today.\n\n📱 *Support & Renewal Desk:* ${currentUser?.email || 'admin@restaurantsos.com'}\n\nThank you for choosing RestaurantsOS!`;
        const plainRenewNoticeText = `⚠️ RestaurantsOS Subscription Notice\n\nDear ${r.name} Team,\nYour ${getPlanLabel(r.planType || 'starter')} subscription ${urgency}.\n\nTo ensure zero interruption to your live POS billing and QR guest ordering, please renew your subscription today.\n\nSupport & Renewal Desk: ${currentUser?.email || 'admin@restaurantsos.com'}\n\nThank you for choosing RestaurantsOS!`;

        const cleanPhone = (r.phone || '').trim().replace(/[^0-9]/g, '');
        const hasPhone = cleanPhone.length >= 7;
        const hasEmail = Boolean(r.email && r.email.includes('@'));
        const targetRest = restaurants.find(item => item.id === r.id);

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setRenewModal(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-in text-center max-h-[90vh] overflow-y-auto">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <Bell className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">Send Renewal Reminder</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Notify <strong className="text-slate-700 dark:text-slate-200">{r.name}</strong> regarding plan renewal
              </p>

              {(!hasPhone || !hasEmail) && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2 text-left mt-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-[11px] font-medium leading-tight">
                      Missing {!hasPhone && !hasEmail ? 'phone & email' : !hasPhone ? 'phone number' : 'email'}. Direct dispatch disabled.
                    </span>
                  </div>
                  {targetRest && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenewModal(null);
                        handleEditClick(targetRest);
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0 cursor-pointer"
                    >
                      Edit &rarr;
                    </button>
                  )}
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 my-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-amber-800 dark:text-amber-300 font-bold uppercase text-[10px]">Status:</span>
                  <span className="font-extrabold text-amber-900 dark:text-amber-200 uppercase">
                    {days <= 0 ? 'Expired' : `${days} Day${days === 1 ? '' : 's'} Remaining`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Plan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{getPlanLabel(r.planType || 'starter')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Expiry Date:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {r.subscriptionExpiresAt ? new Date(r.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-amber-200/60 dark:border-amber-900/40 pt-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Recipient Email:</span>
                  <span className={`font-mono text-[11px] ${hasEmail ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-rose-500 italic'}`}>
                    {r.email || 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Recipient Phone:</span>
                  <span className={`font-mono text-[11px] ${hasPhone ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-rose-500 italic'}`}>
                    {r.phone || 'Not configured'}
                  </span>
                </div>
              </div>

              {/* Personalized Message Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-800 rounded-2xl p-3.5 mb-4 text-left text-xs font-mono text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                {renewNoticeText}
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex gap-2">
                  {hasPhone ? (
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(renewNoticeText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-3 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                      title="No phone number configured for WhatsApp dispatch"
                    >
                      <MessageSquare className="w-4 h-4 opacity-40" />
                      <span>No Phone</span>
                    </button>
                  )}

                  {hasEmail ? (
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent(`Subscription Renewal Notice - ${r.name}`)}&body=${encodeURIComponent(plainRenewNoticeText)}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-3 rounded-2xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                      title="No email configured for Email dispatch"
                    >
                      <Mail className="w-4 h-4 opacity-40" />
                      <span>No Email</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(plainRenewNoticeText);
                      setCopiedRenewText(true);
                      showToast('Renewal message copied!', 'success');
                      setTimeout(() => setCopiedRenewText(false), 3000);
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-3 rounded-2xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedRenewText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedRenewText ? 'Copied Message!' : 'Copy Message'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRenewModal(null)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== CREATE BROADCAST ANNOUNCEMENT MODAL ===== */}
      {isAnnModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAnnModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-850 dark:text-slate-100">Broadcast Announcement</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Publish real-time banner alert to all logged-in restaurant staff</p>
                </div>
              </div>
              <button onClick={() => setIsAnnModalOpen(false)} className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncementSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Database Maintenance or New Feature Live!"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-850 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Message Content</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. We will be performing server maintenance tonight from 2:00 AM to 3:00 AM IST. All operations will resume normally."
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-850 dark:text-slate-100 font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Style / Urgency Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'info', label: 'Info', color: 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
                    { id: 'warning', label: 'Warning', color: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
                    { id: 'success', label: 'Success', color: 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
                    { id: 'urgent', label: 'Urgent', color: 'border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/30' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAnnType(t.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        annType === t.id ? `${t.color} ring-2 ring-brand-500/20 font-black shadow-sm` : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Auto-Expire Date (Optional)</label>
                  <input
                    type="date"
                    value={annExpiresAt}
                    onChange={(e) => setAnnExpiresAt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-850 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annDismissible}
                      onChange={(e) => setAnnDismissible(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Allow users to close</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAnnModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-2xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={annSaving}
                  className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {annSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  <span>{annSaving ? 'Publishing...' : 'Publish Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && selectedUser && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditUserModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-855 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-slate-850 dark:text-slate-100">Edit Staff Account</h3>
              <button onClick={() => setIsEditUserModalOpen(false)} className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Staff Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={editUserFullName}
                  onChange={(e) => setEditUserFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-850 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address (Read-Only)</label>
                <input
                  type="email"
                  disabled
                  value={selectedUser.email}
                  className="w-full bg-slate-150 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs text-slate-400 dark:text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Assign Restaurant</label>
                  <select
                    value={editUserRestaurantId}
                    onChange={(e) => setEditUserRestaurantId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Staff Role</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Store Manager</option>
                    <option value="cashier">Cashier Staff</option>
                    <option value="kitchen">Kitchen Chef</option>
                    <option value="waiter">Waiter Staff</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-5 rounded-2xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md text-xs cursor-pointer"
                >
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
