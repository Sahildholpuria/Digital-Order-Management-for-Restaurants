import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import { Lock, Mail, Users, ArrowRight, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { isFirebase, loginMockUser, setCurrentUser } = useRestaurant();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('login_remember_email');
    const remember = localStorage.getItem('login_remember_me') === 'true';
    if (remember && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Mock roles for easy testing
  const mockRoles = [
    { role: 'superadmin', label: 'Super Admin (SaaS Owner)', desc: 'Central subscription & tenant manager', color: 'bg-brand-600' },
    { role: 'admin', label: 'Administrator', desc: 'Full system control & reports', color: 'bg-indigo-500' },
    { role: 'manager', label: 'Store Manager', desc: 'Menu and order overrides', color: 'bg-emerald-500' },
    { role: 'kitchen', label: 'Kitchen Chef', desc: 'KDS display screen access', color: 'bg-orange-500' },
    { role: 'waiter', label: 'Waiter Staff', desc: 'Table requests & ordering', color: 'bg-pink-500' },
  ];

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Save credentials if Remember Me is checked
      if (rememberMe) {
        localStorage.setItem('login_remember_email', email);
        localStorage.setItem('login_remember_me', 'true');
      } else {
        localStorage.removeItem('login_remember_email');
        localStorage.removeItem('login_remember_me');
      }

      onSuccess();
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
      const mockEmail = role === 'superadmin' ? 'superadmin@restaurant.com' : `${role}@restaurant.com`;
      const actualRole = role === 'superadmin' ? 'admin' : role;
      await loginMockUser(mockEmail, actualRole as any);
      onSuccess();
    } catch (err) {
      setError('Mock login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      {/* Background blobs for aesthetics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white/70 dark:bg-slate-900/60 rounded-3xl p-8 border border-white/20 shadow-glass backdrop-blur-xl relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
            Staff Portal Login
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access restaurant POS, Kitchen, and settings panel.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 text-xs flex gap-2.5 mb-6">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isFirebase ? (
          /* Firebase Auth UI Form */
          <form onSubmit={handleSupabaseLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-805 dark:text-slate-100 dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-805 dark:text-slate-100 dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 text-brand-600 focus:ring-brand-500 bg-transparent cursor-pointer accent-brand-500"
              />
              <label 
                htmlFor="rememberMe" 
                className="text-xs font-bold text-slate-500 dark:text-slate-400 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Remember Me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 mt-6 text-sm"
            >
              <span>{loading ? 'Logging in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>
        ) : (
          /* Demo Mock User Selection */
          <div>
            <div className="bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 p-4 rounded-2xl border border-brand-100 dark:border-brand-900/30 text-xs flex gap-2.5 mb-6">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-bold">Running in real-time Local Mock Mode.</p>
                <p className="mt-0.5 opacity-90">Select a role to preview and test their interface.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {mockRoles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => handleMockRoleLogin(r.role)}
                  className="w-full text-left bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl transition-all duration-200 flex items-center gap-4 group"
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${r.color} group-hover:scale-110 transition-transform`} />
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">{r.label}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{r.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="text-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase">
            Build by RestaurantsOS Pvt. Ltd
          </span>
        </div>
      </div>
    </div>
  );
};
export default Login;
