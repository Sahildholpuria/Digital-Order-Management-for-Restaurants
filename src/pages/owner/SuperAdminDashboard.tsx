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
  ExternalLink
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

  const handleOpenOnboard = () => {
    setRestId('');
    setName('');
    setEmail('');
    setPhone('');
    setPlanType('starter');
    setStatus('trial');
    
    // Auto-calculate default initial expiry: +30 Days
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
    setExpiresAt(defaultExpiry.toISOString().split('T')[0]);
    
    setIsModalOpen(true);
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

    try {
      const newRest: Partial<RestaurantSettings> = {
        id: restId.trim().toLowerCase().replace(/\s+/g, '-'),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        planType,
        subscriptionStatus: status,
        subscriptionExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await dbService.createRestaurant(newRest);
      setIsModalOpen(false);
      // Reset form
      setRestId('');
      setName('');
      setEmail('');
      setPhone('');
      setPlanType('starter');
      setStatus('trial');
      setExpiresAt('');
      
      showToast('Restaurant created successfully!', 'success');
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

  const handleAccessPortal = (restaurantId: string) => {
    setRestaurantId(restaurantId);
    localStorage.setItem('last_active_staff_restaurant_id', restaurantId);
    window.location.hash = '#dashboard';
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFullName || !userEmail || !userRestaurantId) {
      showToast('Please fill out all fields.', 'error');
      return;
    }
    try {
      await dbService.createStaffUser(userEmail.trim(), userFullName.trim(), userRole, userRestaurantId);
      setIsUserModalOpen(false);
      setUserFullName('');
      setUserEmail('');
      setUserRole('admin');
      await fetchAllData();
      showToast(`Staff user created successfully! Default login password is "ChangeMe@123".`, 'success');
    } catch (err: any) {
      showToast('Error creating user: ' + (err.message || err), 'error');
    }
  };

  // Filtered lists
  const filtered = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.email && r.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        {/* Search Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-base font-black text-slate-850 dark:text-slate-100 flex items-center gap-2">
            {activeTab === 'restaurants' ? (
              <>
                <Building className="w-5 h-5 text-brand-500" />
                <span>Onboarded Restaurants list</span>
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
                      starter: 'Starter Plan',
                      pro_6m: 'Pro 6-Month',
                      pro_1y: 'Pro 1-Year'
                    };

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-800 dark:text-slate-200">{r.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-widest">{r.id}</div>
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAccessPortal(r.id)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Access POS Portal"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Portal</span>
                            </button>
                            <button
                              onClick={() => handleEditClick(r)}
                              className="bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/20 dark:hover:bg-brand-950/30 dark:text-brand-400 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-slate-850 dark:text-slate-100">Onboard New Restaurant</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Unique Slug (ID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bistro-delhi"
                  value={restId}
                  onChange={(e) => setRestId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-850 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Restaurant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Grand Bistro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Owner Email</label>
                  <input
                    type="email"
                    placeholder="name@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-850 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Owner Phone</label>
                  <input
                    type="text"
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-850 text-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Initial Plan</label>
                  <select
                    value={planType}
                    onChange={(e) => {
                      const val = e.target.value as 'starter' | 'pro_6m' | 'pro_1y';
                      setPlanType(val);
                      const now = new Date();
                      if (val === 'starter') {
                        now.setDate(now.getDate() + 30);
                      } else if (val === 'pro_6m') {
                        now.setMonth(now.getMonth() + 6);
                      } else if (val === 'pro_1y') {
                        now.setFullYear(now.getFullYear() + 1);
                      }
                      setExpiresAt(now.toISOString().split('T')[0]);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-850 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="starter">Starter Plan</option>
                    <option value="pro_6m">Pro 6-Month</option>
                    <option value="pro_1y">Pro 1-Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Subscription Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="trial">Free Trial</option>
                    <option value="active">Active Plan</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Plan Expiry Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md mt-6 text-xs cursor-pointer"
              >
                Onboard Tenant
              </button>
            </form>
          </div>
        </div>
      )}

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
                        now.setDate(now.getDate() + 30);
                      } else if (val === 'pro_6m') {
                        now.setMonth(now.getMonth() + 6);
                      } else if (val === 'pro_1y') {
                        now.setFullYear(now.getFullYear() + 1);
                      }
                      setEditExpiresAt(now.toISOString().split('T')[0]);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-855 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="starter">Starter Plan</option>
                    <option value="pro_6m">Pro 6-Month</option>
                    <option value="pro_1y">Pro 1-Year</option>
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

              <div className="bg-slate-50 dark:bg-slate-850/50 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800/80">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">🔒 Security Info</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  The user will be created with starting login password: <span className="font-mono font-bold text-brand-600 bg-brand-500/10 px-1.5 py-0.5 rounded">ChangeMe@123</span>. They can change it in settings once logged in.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md mt-4 text-xs cursor-pointer"
              >
                Create Staff Account
              </button>
            </form>
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
