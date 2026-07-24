import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/database';
import { RestaurantSettings, UserProfile } from '../../types';
import { useRestaurant } from '../../context/RestaurantContext';
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
  Key
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { setRestaurantId, showToast, askConfirmation } = useRestaurant();
  const [restaurants, setRestaurants] = useState<RestaurantSettings[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'users'>('restaurants');
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
  const [planType, setPlanType] = useState<'starter' | 'pro_6m' | 'pro_1y'>('starter');
  const [status, setStatus] = useState<'trial' | 'active' | 'expired'>('trial');
  const [expiresAt, setExpiresAt] = useState('');

  // Edit subscription/details states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPlan, setEditPlan] = useState<'starter' | 'pro_6m' | 'pro_1y'>('starter');
  const [editStatus, setEditStatus] = useState<'trial' | 'active' | 'expired' | 'suspended'>('trial');
  const [editExpiresAt, setEditExpiresAt] = useState('');

  // Dedicated subscription management modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subRest, setSubRest] = useState<RestaurantSettings | null>(null);
  const [subPlan, setSubPlan] = useState<'starter' | 'pro_6m' | 'pro_1y'>('starter');
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

  // Status Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'expired' | 'suspended'>('all');

  // Share Credentials Modal
  const [credsModal, setCredsModal] = useState<{ restName: string; email: string; pass: string; role: string; slug: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const restData = await dbService.getAllRestaurants();
      setRestaurants(restData);
      
      const userData = await dbService.getAllUsers();
      setUsers(userData);
    } catch (err) {
      console.error('Failed fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

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
    if (!restId || !name) return;

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

      // If 2-in-1 onboarding is enabled, create Admin Staff user immediately
      let createdUser = false;
      const targetAdminEmail = adminEmail.trim() || email.trim();
      const targetAdminName  = adminFullName.trim() || `${name.trim()} Owner`;

      if (createAdminAccount && targetAdminEmail && adminPassword) {
        try {
          await dbService.createStaffUser(
            targetAdminEmail,
            targetAdminName,
            'admin',
            cleanSlug,
            adminPassword.trim()
          );
          createdUser = true;
        } catch (uErr: any) {
          showToast('Restaurant created, but staff account failed: ' + (uErr.message || uErr), 'error');
        }
      }

      setIsModalOpen(false);

      // If staff user was created, show credentials summary pop-up
      if (createdUser && targetAdminEmail) {
        setCredsModal({
          restName: name.trim(),
          email: targetAdminEmail,
          pass: adminPassword.trim(),
          role: 'Administrator',
          slug: cleanSlug,
        });
      } else {
        showToast('Restaurant created successfully!', 'success');
      }

      // Reset form
      setRestId('');
      setName('');
      setEmail('');
      setPhone('');
      setPlanType('starter');
      setStatus('trial');
      setExpiresAt('');
      setAdminFullName('');
      setAdminEmail('');
      setAdminPassword('');

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
    setRestaurantId(restaurantId);
    localStorage.setItem('last_active_staff_restaurant_id', restaurantId);
    window.location.hash = '#dashboard';
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

  // Filtered lists with Status Pills
  const filtered = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (r.email && r.email.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return r.subscriptionStatus === 'active';
    if (statusFilter === 'trial') return r.subscriptionStatus === 'trial' || !r.subscriptionStatus;
    if (statusFilter === 'expired') return r.subscriptionStatus === 'expired';
    if (statusFilter === 'suspended') return r.subscriptionStatus === 'suspended';
    return true;
  });

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.restaurantId && u.restaurantId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Statistics
  const totalCount = restaurants.length;
  const activeCount = restaurants.filter(r => r.subscriptionStatus === 'active').length;
  const trialCount = restaurants.filter(r => r.subscriptionStatus === 'trial').length;
  const expiredCount = restaurants.filter(r => r.subscriptionStatus === 'expired' || r.subscriptionStatus === 'suspended').length;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-brand-600 to-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-brand-500/10">
        <div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold w-fit mb-2 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin Central Control</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">SaaS Tenant Manager</h1>
          <p className="text-brand-100 text-sm mt-1 max-w-xl">Manage restaurant subscription billing lifecycle, plans, and onboard settings.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={fetchAllData}
              className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all cursor-pointer backdrop-blur-md flex items-center justify-center flex-1 sm:flex-none"
              title="Refresh database"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleOpenOnboard}
              className="flex items-center justify-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-bold px-5 py-3 rounded-2xl shadow-lg transition-all text-sm cursor-pointer flex-[3] sm:flex-none whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Restaurant</span>
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
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-5 py-3 rounded-2xl shadow-lg transition-all text-sm cursor-pointer backdrop-blur-md w-full sm:w-auto whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Staff User</span>
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Onboarded</p>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-100">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Active Pro</p>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-100">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Free Trials</p>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-100">{trialCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Expired / Suspended</p>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-100">{expiredCount}</p>
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
      </div>

      {/* Table Section */}
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
              ) : (
                <>
                  <Users className="w-5 h-5 text-indigo-500" />
                  <span>Registered Staff Accounts</span>
                </>
              )}
            </h2>
            <div className="relative w-full sm:w-72 shadow-sm rounded-2xl">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder={activeTab === 'restaurants' ? "Search by restaurant name or slug..." : "Search by staff name, email, or role..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 pl-11 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-medium text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Quick Filter Pills for Restaurants Tab */}
          {activeTab === 'restaurants' && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/50">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {[
                { id: 'all', label: `All (${restaurants.length})` },
                { id: 'active', label: `Active (${activeCount})` },
                { id: 'trial', label: `Free Trial (${trialCount})` },
                { id: 'expired', label: `Expired (${restaurants.filter(r => r.subscriptionStatus === 'expired').length})` },
                { id: 'suspended', label: `Suspended (${restaurants.filter(r => r.subscriptionStatus === 'suspended').length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500 font-bold">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading onboarding directories...</p>
          </div>
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

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{r.name}</span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {staffUsersCount}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-widest flex items-center gap-1">
                            <span>ID: {r.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          <div>{r.email || 'No email registered'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{r.phone || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                            <Award className="w-3.5 h-3.5 text-brand-500" />
                            {planLabels[r.planType || 'starter']}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${statusColors[r.subscriptionStatus || 'trial']}`}>
                            {r.subscriptionStatus || 'trial'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          {r.subscriptionExpiresAt ? (
                            new Date(r.subscriptionExpiresAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
                          ) : (
                            'Lifetime / Lifetime'
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAccessPortal(r.id)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Access POS Portal"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Portal</span>
                            </button>
                            <button
                              onClick={() => handleOpenSubModal(r)}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:hover:bg-purple-950/30 dark:text-purple-400 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Manage Subscription"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Billing</span>
                            </button>
                            <button
                              onClick={() => handleOpenAddStaffForRest(r.id)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Add Staff User to this Restaurant"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>+ Staff</span>
                            </button>
                            <button
                              onClick={() => handleEditClick(r)}
                              className="bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/20 dark:hover:bg-brand-950/30 dark:text-brand-400 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                              title="Edit Restaurant Info"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRestaurant(r.id, r.name)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-950/30 dark:text-red-400 p-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
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
        ) : (
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
        )}
      </div>

      {/* Onboard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Restaurant Name</label>
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Unique Slug / Tenant ID</label>
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
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Owner Email</label>
                    <input
                      type="email"
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
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Owner Phone</label>
                    <input
                      type="text"
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
                      <option value="starter">1 Month Plan (Starter)</option>
                      <option value="pro_6m">6 Months Plan (Pro)</option>
                      <option value="pro_1y">12 Months Plan (Enterprise)</option>
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

              {/* Step 2: 2-in-1 Admin Staff Account Setup */}
              <div className="pt-3 border-t border-slate-150 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" /> Step 2: Create Admin User Account
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createAdminAccount}
                      onChange={e => setCreateAdminAccount(e.target.checked)}
                      className="w-3.5 h-3.5 accent-brand-600 rounded cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Enable</span>
                  </label>
                </div>

                {createAdminAccount && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-3.5 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Admin Full Name</label>
                      <input
                        type="text"
                        placeholder={name ? `${name} Admin` : "e.g. Rahul Sharma"}
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Admin Login Email</label>
                      <input
                        type="email"
                        placeholder={email || "admin@restaurant.com"}
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                        <button
                          type="button"
                          onClick={() => setAdminPassword(generateRandomPassword())}
                          className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                          <Zap className="w-3 h-3" /> Auto-Generate
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showAdminPassword ? 'text' : 'password'}
                          required={createAdminAccount}
                          minLength={6}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-3 pr-9 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <Sparkles className="w-4 h-4" />
                <span>Onboard Tenant & Create Accounts</span>
              </button>
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
            id: 'starter' as const,
            label: '1 Month',
            duration: '30 days',
            months: 1,
            icon: '🗓️',
            color: 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
            ring: 'ring-amber-400',
            badge: 'Starter Plan',
          },
          {
            id: 'pro_6m' as const,
            label: '6 Months',
            duration: '180 days',
            months: 6,
            icon: '⚡',
            color: 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400',
            ring: 'ring-brand-500',
            badge: 'Pro Plan',
          },
          {
            id: 'pro_1y' as const,
            label: '12 Months',
            duration: '365 days',
            months: 12,
            icon: '🏆',
            color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400',
            ring: 'ring-emerald-500',
            badge: 'Enterprise Plan',
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Restaurant Name</label>
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Owner Email</label>
                  <input
                    type="email"
                    placeholder="name@restaurant.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-855 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Owner Phone</label>
                  <input
                    type="text"
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
                    <option value="starter">1 Month Plan (Starter)</option>
                    <option value="pro_6m">6 Months Plan (Pro)</option>
                    <option value="pro_1y">12 Months Plan (Enterprise)</option>
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

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md mt-6 text-xs cursor-pointer"
              >
                Apply Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md mt-4 text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Staff Account</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== CREATED CREDENTIALS SUMMARY MODAL ===== */}
      {credsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-in text-center">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">Account Ready!</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Account created for <strong className="text-slate-700 dark:text-slate-200">{credsModal.restName}</strong>
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 my-5 text-left space-y-2.5 font-mono text-xs">
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
                <span className="font-bold text-slate-800 dark:text-slate-200">{credsModal.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans text-[10px] font-extrabold uppercase">Password</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 bg-amber-400/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                  {credsModal.pass}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const text = `Restaurant: ${credsModal.restName}\nTenant Slug: ${credsModal.slug}\nRole: ${credsModal.role}\nEmail: ${credsModal.email}\nPassword: ${credsModal.pass}`;
                  navigator.clipboard.writeText(text);
                  setCopiedText(true);
                  showToast('Login credentials copied to clipboard!', 'success');
                  setTimeout(() => setCopiedText(false), 3000);
                }}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? 'Copied!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCredsModal(null)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-5 rounded-2xl text-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md mt-4 text-xs cursor-pointer"
              >
                Apply Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
