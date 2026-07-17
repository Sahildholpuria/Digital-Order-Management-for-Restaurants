import React, { useState, useEffect } from 'react';
import { Building2, Users, CreditCard, Activity, PlusCircle, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

export const SuperAdminDashboard: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    monthlyRevenue: 0,
    systemAlerts: 0
  });
  const [showOnboard, setShowOnboard] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for onboarding
  const [form, setForm] = useState({
    restaurantId: '',
    restaurantName: '',
    plan: 'pro',
    ownerUuid: '',
    ownerName: '',
    ownerEmail: ''
  });

  const loadTenants = async () => {
    try {
      const { data: restaurantsData } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('*');

      if (restaurantsData) {
        const mapped = restaurantsData.map((r: any) => {
          const sub = subsData?.find(s => s.restaurant_id === r.id);
          return {
            id: r.id,
            name: r.name,
            status: r.status,
            plan: sub?.plan || 'free',
            expiry: sub?.expiry_date ? new Date(sub.expiry_date).toLocaleDateString() : 'N/A'
          };
        });
        setTenants(mapped);
        
        // Calculate stats
        const active = mapped.filter(m => m.status === 'active').length;
        // Mock revenue: free=0, starter=3999, pro=11999 (normalized per month)
        const revenue = mapped.reduce((acc, m) => {
          if (m.status !== 'active') return acc;
          if (m.plan === 'starter') return acc + 3999;
          if (m.plan === 'pro') return acc + 2000; // 11999 for 6m ~= 2000/mo
          return acc;
        }, 0);

        setStats({
          totalTenants: mapped.length,
          activeTenants: active,
          monthlyRevenue: revenue,
          systemAlerts: 0
        });
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Validate inputs
      if (!form.restaurantId || !form.restaurantName || !form.ownerUuid || !form.ownerName || !form.ownerEmail) {
        throw new Error('All fields are required.');
      }

      // Call postgres RPC procedure
      const { data, error } = await supabase.rpc('onboard_new_restaurant', {
        p_restaurant_id: form.restaurantId,
        p_restaurant_name: form.restaurantName,
        p_plan: form.plan,
        p_owner_uuid: form.ownerUuid,
        p_owner_name: form.ownerName,
        p_owner_email: form.ownerEmail
      });

      if (error) throw error;

      if (data && data.status === 'error') {
        throw new Error(data.message || 'Onboarding RPC returned error.');
      }

      setSuccessMsg(`Workspace "${form.restaurantName}" provisioned successfully!`);
      setForm({
        restaurantId: '',
        restaurantName: '',
        plan: 'pro',
        ownerUuid: '',
        ownerName: '',
        ownerEmail: ''
      });
      loadTenants();
      setTimeout(() => setShowOnboard(false), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during onboarding.');
    } finally {
      setOnboardLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">Super Admin Portal</h1>
          <p className="text-sm text-slate-400">Centrally monitor workspaces, billing status, and platform metrics.</p>
        </div>
        <button 
          onClick={() => setShowOnboard(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer text-sm shadow-md shadow-brand-500/20"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Onboard New Restaurant</span>
        </button>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Total Tenants</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.totalTenants}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl flex items-center justify-center"><Building2 className="w-6 h-6" /></div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Active Restaurants</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.activeTenants}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-2xl flex items-center justify-center"><Users className="w-6 h-6" /></div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Monthly Revenue (MRR)</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">₹{stats.monthlyRevenue.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl flex items-center justify-center"><CreditCard className="w-6 h-6" /></div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Platform Health</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">99.9%</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-2xl flex items-center justify-center"><Activity className="w-6 h-6" /></div>
        </div>
      </div>

      {/* Tenant Management Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Monitored Tenant Workspaces</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Restaurant Name</th>
                <th className="p-4">Workspace ID</th>
                <th className="p-4">Billing Plan</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 font-semibold">No workspaces loaded yet.</td>
                </tr>
              ) : (
                tenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20">
                    <td className="p-4 pl-6 font-bold text-slate-800 dark:text-slate-200">{t.name}</td>
                    <td className="p-4 font-mono font-bold text-slate-400">{t.id}</td>
                    <td className="p-4"><span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase text-[10px]">{t.plan}</span></td>
                    <td className="p-4 text-slate-500">{t.expiry}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                        t.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Modal Overlay */}
      {showOnboard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl animate-scale-up space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-855 dark:text-slate-100">Onboard New Restaurant</h3>
              <p className="text-xs text-slate-455">Create the database workspace, owner auth linkage, and defaults.</p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-655 text-xs p-3.5 rounded-2xl border border-red-100 dark:border-red-900/30">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 dark:bg-green-950/20 text-green-655 text-xs p-3.5 rounded-2xl border border-green-100 dark:border-green-900/30 flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Workspace Slug (ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. aroma-cafe"
                    value={form.restaurantId}
                    onChange={e => setForm({ ...form, restaurantId: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs focus:outline-none text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Aroma Cafe"
                    value={form.restaurantName}
                    onChange={e => setForm({ ...form, restaurantName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs focus:outline-none text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={form.ownerName}
                    onChange={e => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs focus:outline-none text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Owner Email</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@aroma.com"
                    value={form.ownerEmail}
                    onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs focus:outline-none text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Owner Supabase Auth UUID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. a7f5209e-711e-4cb8-..."
                  value={form.ownerUuid}
                  onChange={e => setForm({ ...form, ownerUuid: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs focus:outline-none text-slate-800 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Subscription Plan</label>
                <select
                  value={form.plan}
                  onChange={e => setForm({ ...form, plan: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs focus:outline-none text-slate-800 dark:text-white"
                >
                  <option value="free">Free Plan (Max 5 Tables)</option>
                  <option value="starter">Starter Plan (Max 15 Tables)</option>
                  <option value="pro">Pro Plan (Max 100 Tables)</option>
                  <option value="enterprise">Enterprise (Unlimited)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOnboard(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  {onboardLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{onboardLoading ? 'Provisioning...' : 'Provision Workspace'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
