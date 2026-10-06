import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { useRestaurant, clearTenantCache } from '../../context/RestaurantContext';
import { RestaurantsOSLogo } from '../../components/RestaurantsOSLogo';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles
} from 'lucide-react';

interface LoginProps {
  onSuccess: (mockUser?: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const { loginMockUser } = useRestaurant();

  const isFirebase = isSupabaseConfigured;

  // Restore saved email if Remember Me was selected previously
  useEffect(() => {
    const savedEmail = localStorage.getItem('login_remember_email');
    const savedRememberMe = localStorage.getItem('login_remember_me');
    if (savedRememberMe === 'true' && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Mock roles for easy testing & access profile preview
  const mockRoles = [
    { role: 'superadmin', label: 'Super Admin (SaaS Owner)', desc: 'Platform tenant onboarding & subscription management', color: 'bg-emerald-500' },
    { role: 'admin', label: 'Restaurant Administrator', desc: 'Full system authority, reports, billing, settings & POS', color: 'bg-teal-500' },
    { role: 'manager', label: 'Store Manager', desc: 'Operational floor supervisor, menu availability & reports', color: 'bg-indigo-500' },
    { role: 'waiter', label: 'Captain & Waiter Staff', desc: 'Direct table order punching, KOT tickets & service chimes', color: 'bg-amber-500' },
    { role: 'kitchen', label: 'Kitchen Head Chef', desc: 'Live KDS cooking display & preparation timer screen', color: 'bg-rose-500' },
    { role: 'cashier', label: 'Cashier Staff', desc: 'POS checkout, bill settlements & invoice receipts', color: 'bg-teal-600' },
  ];

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    try {
      // Purge cross-tenant cached data before signing in
      clearTenantCache();
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      // Save credentials if Remember Me is checked
      if (rememberMe) {
        localStorage.setItem('login_remember_email', email.trim());
        localStorage.setItem('login_remember_me', 'true');
      } else {
        localStorage.removeItem('login_remember_email');
        localStorage.removeItem('login_remember_me');
      }

      // Fast resolve user profile immediately without waiting for background subscription
      let profile: any = null;
      if (data?.user) {
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const isSuper = !!profileData?.is_super_admin || data.user.email === 'superadmin@restaurant.com';
        profile = {
          id: data.user.id,
          restaurantId: isSuper ? undefined : (profileData?.restaurant_id || undefined),
          name: profileData?.name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Staff',
          email: data.user.email || '',
          role: profileData?.role || 'admin',
          isSuperAdmin: isSuper,
          createdAt: profileData?.created_at || new Date().toISOString(),
        };

        try {
          localStorage.setItem('restaurant_current_user', JSON.stringify(profile));
          if (profile.restaurantId) {
            localStorage.setItem('last_active_staff_restaurant_id', profile.restaurantId);
          }
        } catch (_) {}
      }

      onSuccess(profile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockRoleLogin = async (role: string) => {
    setLoading(true);
    try {
      clearTenantCache();
      const mockEmail = role === 'superadmin' ? 'superadmin@restaurant.com' : `${role}@restaurant.com`;
      const actualRole = role === 'superadmin' ? 'admin' : role;
      const loggedUser = await loginMockUser(mockEmail, actualRole as any);
      onSuccess(loggedUser);
    } catch (err) {
      setError('Mock login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] relative overflow-hidden flex items-center justify-center p-4 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sleek Emerald / Mint Glow Orbs matching restaurantsos.in */}
      <div className="absolute top-1/4 -left-20 w-[450px] h-[450px] bg-gradient-to-br from-emerald-600/15 to-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[450px] h-[450px] bg-gradient-to-tl from-teal-500/15 to-emerald-800/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[160px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="max-w-md w-full bg-[#0B1120]/80 border border-emerald-500/25 rounded-3xl p-8 sm:p-9 shadow-[0_0_50px_-10px_rgba(16,185,129,0.18)] backdrop-blur-2xl relative z-10 animate-fade-in">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <RestaurantsOSLogo size="lg" showText={true} theme="dark" subtitle="Cloud POS & Restaurant Management" />
          </div>
          <h2 className="text-2xl font-black text-white font-sans tracking-tight mt-3">
            Staff Portal Login
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
            Sign in to access your live POS, Kitchen Display System (KDS), and Table Analytics.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 text-red-300 p-4 rounded-2xl border border-red-500/30 text-xs flex gap-2.5 mb-6 backdrop-blur-md animate-shake">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {isFirebase ? (
          /* Supabase / Live Database Auth Form */
          <form onSubmit={handleSupabaseLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4 text-emerald-400/80" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#070B14]/90 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-emerald-400/80" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#070B14]/90 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/50 transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex items-center mt-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                />
                <span className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors">
                  Remember Me
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-black py-3.5 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 mt-6 text-sm cursor-pointer active:scale-[0.99]"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Demo Mock User Selection */
          <div>
            <div className="bg-emerald-950/30 text-emerald-300 p-4 rounded-2xl border border-emerald-500/30 text-xs flex gap-2.5 mb-6">
              <Sparkles className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold">Running in real-time Local Mock Mode.</p>
                <p className="mt-0.5 opacity-90">Select a role to preview and test their interface.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {mockRoles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => handleMockRoleLogin(r.role)}
                  className="w-full text-left bg-[#070B14]/60 hover:bg-emerald-950/20 border border-white/5 hover:border-emerald-500/30 p-3.5 rounded-2xl transition-all duration-200 flex items-center gap-3.5 group cursor-pointer"
                >
                  <span className={`w-3 h-3 rounded-full ${r.color} group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(16,185,129,0.5)]`} />
                  <div className="flex-1">
                    <h4 className="font-extrabold text-white text-xs">{r.label}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{r.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer brand stamp */}
        <div className="text-center mt-7 pt-5 border-t border-white/10">
          <a 
            href="https://www.restaurantsos.in" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 hover:text-emerald-400 transition-colors uppercase tracking-wider"
          >
            <span>Powered by Restaurants OS</span>
            <span className="text-emerald-500">•</span>
            <span className="text-emerald-400/90 font-mono">restaurantsos.in</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
