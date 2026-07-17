import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import dbService from '../../services/database';
import { 
  Building, 
  Users, 
  CreditCard, 
  Database, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Power, 
  Trash2, 
  Key, 
  BarChart3, 
  Activity, 
  ShieldAlert,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  LayoutGrid,
  X,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../../services/supabase';

export const SuperAdminDashboard: React.FC = () => {
  const { logoutUser, isFirebase } = useRestaurant();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Stats
  const [totalWorkspaces, setTotalWorkspaces] = useState(0);
  const [activeWorkspaces, setActiveWorkspaces] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [platformOrdersCount, setPlatformOrdersCount] = useState(0);

  // New restaurant modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('professional');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Dropdown menu state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const list = await dbService.superGetRestaurants();
      setRestaurants(list);
      setTotalWorkspaces(list.length);
      setActiveWorkspaces(list.filter((r: any) => r.status === 'active').length);
      
      // Calculate mock revenue: ₹11,999 * count of professional plans, Custom for enterprise
      const proCount = list.filter((r: any) => r.plan === 'professional').length;
      const starterCount = list.filter((r: any) => r.plan === 'starter').length;
      setTotalRevenue(proCount * 11999 + starterCount * 3999);
      
      // Seed mock platform order count
      setPlatformOrdersCount(list.length * 142 + 25);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerEmail || !ownerName) return;
    setSaving(true);
    setError('');

    try {
      await dbService.superCreateRestaurant(name, plan, ownerEmail, ownerName);
      setIsModalOpen(false);
      setName('');
      setOwnerEmail('');
      setOwnerName('');
      await fetchRestaurants();
    } catch (err: any) {
      setError(err.message || 'Onboarding failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await dbService.superUpdateRestaurantStatus(id, nextStatus);
      await fetchRestaurants();
      setActiveDropdown(null);
    } catch (err) {
      alert('Failed to update workspace status.');
    }
  };

  const changePlan = async (id: string, newPlan: string) => {
    try {
      await dbService.superUpdateRestaurantPlan(id, newPlan);
      await fetchRestaurants();
      setActiveDropdown(null);
    } catch (err) {
      alert('Failed to change subscription plan.');
    }
  };

  const deleteRestaurant = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this restaurant workspace? This action is irreversible.')) return;
    try {
      await dbService.superDeleteRestaurant(id);
      await fetchRestaurants();
      setActiveDropdown(null);
    } catch (err) {
      alert('Failed to delete workspace.');
    }
  };

  const resetOwnerPassword = async (email: string) => {
    try {
      if (isFirebase) {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        alert(`A password reset link has been dispatched to ${email}`);
      } else {
        alert(`Mock Mode Password reset triggers successfully for ${email}`);
      }
      setActiveDropdown(null);
    } catch (err) {
      alert('Password reset trigger failed.');
    }
  };

  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (r.email && r.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Super Admin Top Header */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wider uppercase">RestaurantsOS SaaS</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">SaaS Master Controller</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-500/20 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            System Health: Excellent
          </span>
          <button 
            onClick={async () => {
              await logoutUser();
              window.location.pathname = '/';
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-extrabold px-4 py-2.5 rounded-2xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Exit
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto">
        {/* Analytics Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 shadow-glass flex justify-between items-center relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total Workspaces</span>
              <p className="text-3xl font-black text-white">{totalWorkspaces}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-500/15 text-indigo-400 rounded-2xl flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 shadow-glass flex justify-between items-center relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Active Tiers</span>
              <p className="text-3xl font-black text-emerald-400">{activeWorkspaces}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/15 text-emerald-400 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 shadow-glass flex justify-between items-center relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Est. Revenue</span>
              <p className="text-3xl font-black text-amber-400">₹{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-amber-500/15 text-amber-400 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 shadow-glass flex justify-between items-center relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Platform Orders</span>
              <p className="text-3xl font-black text-indigo-400">{platformOrdersCount}</p>
            </div>
            <div className="w-12 h-12 bg-brand-500/15 text-brand-400 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className="bg-slate-950 rounded-3xl border border-slate-850 shadow-glass p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <h3 className="text-lg font-black text-white">Registered Restaurants</h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-lg shadow-indigo-500/10 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Onboard Restaurant
            </button>
          </div>

          {/* Search and Filters row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search restaurant or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-slate-100 placeholder-slate-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-sm py-3 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-850">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 text-xs font-black uppercase tracking-wider">
                  <th className="p-4.5">Restaurant</th>
                  <th className="p-4.5">Plan</th>
                  <th className="p-4.5">Status</th>
                  <th className="p-4.5">Joined Date</th>
                  <th className="p-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">
                      Loading workspaces...
                    </td>
                  </tr>
                ) : filteredRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">
                      No workspaces found.
                    </td>
                  </tr>
                ) : (
                  filteredRestaurants.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow"
                            style={{ backgroundColor: r.theme_color || '#6366F1' }}
                          >
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-white">{r.name}</p>
                            <p className="text-xs text-slate-450 truncate max-w-[180px]">{r.email || 'No email registered'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4.5">
                        <span className="bg-slate-900 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                          {r.plan || 'free'}
                        </span>
                      </td>
                      <td className="p-4.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          r.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4.5 text-xs text-slate-400 font-medium">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4.5 text-right relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === r.id ? null : r.id)}
                          className="p-2 hover:bg-slate-800 text-slate-400 rounded-xl transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4.5 h-4.5" />
                        </button>

                        {activeDropdown === r.id && (
                          <div className="absolute right-4 mt-1 w-52 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl z-30 py-2 divide-y divide-slate-850 animate-scale-in text-left">
                            <div className="py-1.5 px-3.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              Plan Management
                            </div>
                            <div className="py-1">
                              <button onClick={() => changePlan(r.id, 'starter')} className="w-full text-left px-4 py-2 hover:bg-slate-900 text-xs font-bold text-slate-300">Upgrade to Starter</button>
                              <button onClick={() => changePlan(r.id, 'professional')} className="w-full text-left px-4 py-2 hover:bg-slate-900 text-xs font-bold text-indigo-400">Upgrade to Pro</button>
                              <button onClick={() => changePlan(r.id, 'enterprise')} className="w-full text-left px-4 py-2 hover:bg-slate-900 text-xs font-bold text-amber-400">Upgrade to Enterprise</button>
                            </div>
                            <div className="py-1">
                              <button 
                                onClick={() => toggleStatus(r.id, r.status)} 
                                className={`w-full text-left px-4 py-2 hover:bg-slate-900 text-xs font-bold flex items-center gap-2 ${
                                  r.status === 'active' ? 'text-red-400' : 'text-emerald-400'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                                {r.status === 'active' ? 'Suspend Restaurant' : 'Activate Restaurant'}
                              </button>
                              {r.email && (
                                <button 
                                  onClick={() => resetOwnerPassword(r.email)} 
                                  className="w-full text-left px-4 py-2 hover:bg-slate-900 text-xs font-bold text-slate-300 flex items-center gap-2"
                                >
                                  <Key className="w-3.5 h-3.5 text-slate-400" /> Reset Password
                                </button>
                              )}
                            </div>
                            <div className="py-1">
                              <button 
                                onClick={() => deleteRestaurant(r.id)} 
                                className="w-full text-left px-4 py-2 hover:bg-slate-900 text-xs font-bold text-red-500 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Restaurant
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Onboarding Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-scale-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white">Onboard New Restaurant</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="bg-red-950/20 text-red-400 border border-red-900/30 p-4 rounded-2xl text-xs flex gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleOnboard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Restaurant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spice Lab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 font-medium placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Owner Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahil Dholpuria"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 font-medium placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Owner Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@restaurant.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 font-medium placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Default Subscription Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-350 font-medium cursor-pointer"
                >
                  <option value="starter">Starter Plan (₹3,999/mo)</option>
                  <option value="professional">Professional Plan (₹11,999/6 mo)</option>
                  <option value="enterprise">Enterprise Plan (Custom)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-extrabold py-3.5 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 mt-6 text-xs cursor-pointer"
              >
                <span>{saving ? 'Creating Workspace...' : 'Deploy Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SuperAdminDashboard;
