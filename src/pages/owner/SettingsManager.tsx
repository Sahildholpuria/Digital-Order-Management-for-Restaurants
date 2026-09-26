import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { SubscriptionModal } from '../../components/subscription/SubscriptionModal';
import subscriptionService, { SubscriptionPaymentRecord } from '../../services/subscriptionService';
import { Zap, CreditCard, ShieldCheck, Lock } from 'lucide-react';
import { getRenewalEligibility } from '../../config/subscriptionPlans';
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Image as ImageIcon, 
  Receipt, 
  Percent, 
  DollarSign, 
  Clock, 
  Check,
  Palette,
  Sparkles,
  Bell,
  ToggleLeft,
  ToggleRight,
  Volume2,
  VolumeX,
  FileText,
  Printer,
  Globe
} from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const { settings, updateSettings, showToast } = useRestaurant();

  // Settings states
  const [name, setName] = useState(settings?.name || '');
  const [address, setAddress] = useState(settings?.address || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  const [gstNumber, setGstNumber] = useState(settings?.gstNumber || '');
  const [websiteUrl, setWebsiteUrl] = useState(settings?.websiteUrl || '');
  const [taxPercentage, setTaxPercentage] = useState(settings?.taxPercentage ?? 0);
  const [currency, setCurrency] = useState(settings?.currency || '₹');
  const [openingHours, setOpeningHours] = useState(settings?.openingHours || '09:00');
  const [closingHours, setClosingHours] = useState(settings?.closingHours || '22:00');
  const [themeColor, setThemeColor] = useState(settings?.themeColor || '#6366F1');
  const [enableWaiterCall, setEnableWaiterCall] = useState(settings?.enableWaiterCall ?? true);
  const [enableBillRequest, setEnableBillRequest] = useState(settings?.enableBillRequest ?? true);
  const [enableSoundNotification, setEnableSoundNotification] = useState(settings?.enableSoundNotification ?? true);
  const [enableBillPrinting, setEnableBillPrinting] = useState(settings?.enableBillPrinting ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<SubscriptionPaymentRecord[]>([]);
  const eligibility = getRenewalEligibility(settings?.subscriptionStatus, settings?.subscriptionExpiresAt);

  useEffect(() => {
    if (settings?.id) {
      subscriptionService.getPayments(settings.id).then(setPaymentHistory);
    }
  }, [settings?.id]);

  // Sync settings when loaded asynchronously from context
  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setGstNumber(settings.gstNumber || '');
      setWebsiteUrl(settings.websiteUrl || '');
      setTaxPercentage(settings.taxPercentage ?? 0);
      setCurrency(settings.currency || '₹');
      setOpeningHours(settings.openingHours || '09:00');
      setClosingHours(settings.closingHours || '22:00');
      setThemeColor(settings.themeColor || '#6366F1');
      setEnableWaiterCall(settings.enableWaiterCall ?? true);
      setEnableBillRequest(settings.enableBillRequest ?? true);
      setEnableSoundNotification(settings.enableSoundNotification ?? true);
      setEnableBillPrinting(settings.enableBillPrinting ?? true);
      
      const savedDate = localStorage.getItem(`settings_updated_at_${settings.id}`);
      if (savedDate) {
        setLastUpdated(savedDate);
      }
    }
  }, [settings]);

  // Preset theme brand colors
  const themePresets = [
    { label: 'Indigo Fusion', hex: '#6366F1', color: 'bg-indigo-500' },
    { label: 'Forest Mint', hex: '#10B981', color: 'bg-emerald-500' },
    { label: 'Spice Amber', hex: '#F59E0B', color: 'bg-amber-500' },
    { label: 'Rose Wine', hex: '#EF4444', color: 'bg-rose-500' },
    { label: 'Royal Orchid', hex: '#8B5CF6', color: 'bg-violet-500' },
    { label: 'Gourmet Gold', hex: '#B45309', color: 'bg-amber-850' },
  ];

  const currencies = [
    { label: 'Rupee (₹)', symbol: '₹' },
    { label: 'Dollar ($)', symbol: '$' },
    { label: 'Euro (€)', symbol: '€' },
    { label: 'Pound (£)', symbol: '£' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateSettings({
        name,
        address,
        phone,
        email,
        gstNumber,
        websiteUrl,
        taxPercentage: Number(taxPercentage),
        currency,
        openingHours,
        closingHours,
        themeColor,
        enableWaiterCall,
        enableBillRequest,
        enableSoundNotification,
        enableBillPrinting,
      });
      if (settings?.id) {
        const now = new Date().toLocaleString([], { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        localStorage.setItem(`settings_updated_at_${settings.id}`, now);
        setLastUpdated(now);
      }
      showToast('Restaurant settings updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-10 animate-fade-in">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Store Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Customize branding, configure invoicing guidelines, and set terminal parameters.
          </p>
          {lastUpdated && (
            <p className="text-[10px] text-brand-600 dark:text-brand-400 font-extrabold uppercase tracking-wider mt-1.5 flex items-center gap-1.5 animate-fade-in bg-brand-500/10 px-2.5 py-1 rounded-full w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
              <span>Last updated: {lastUpdated}</span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-brand-500/10 transition-all"
        >
          <Check className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Brand Details Block */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm space-y-4 lg:col-span-2 overflow-hidden">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
            <Building className="w-5 h-5 text-brand-500" />
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Brand Information</h3>
          </div>

          <div className="space-y-4">
            {/* Logo and Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Restaurant Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Physical Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Contact numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Telephone / Mobile</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Store Operating Hours Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-brand-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Store Operating Hours
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opening Time Row */}
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Opening Time</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Start Service</p>
                    </div>
                  </div>
                  <input
                    type="time"
                    required
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-sm shrink-0"
                  />
                </div>

                {/* Closing Time Row */}
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Closing Time</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Kitchen Close</p>
                    </div>
                  </div>
                  <input
                    type="time"
                    required
                    value={closingHours}
                    onChange={(e) => setClosingHours(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-sm shrink-0"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Financial & Styling details */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* SaaS Subscription & Razorpay Renewal Card */}
          <div className="bg-gradient-to-br from-white to-emerald-500/5 dark:from-slate-900 dark:to-emerald-950/20 border-2 border-emerald-500/30 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/10">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">
                  SaaS Subscription Plan
                </h3>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                settings?.subscriptionStatus === "active"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : settings?.subscriptionStatus === "trial"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-red-500/10 border-red-500/30 text-red-500"
              }`}>
                {settings?.subscriptionStatus || "trial"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{settings?.planType === "pro" ? "Pro Restaurant Plan" : "Starter Plan"}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-2 py-0.5 rounded-md">
                      6 Months
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {settings?.planType === "pro" ? "₹6,999 / 6 Months (₹1,166/mo)" : "₹2,999 / 6 Months (₹500/mo)"}
                  </p>
                </div>
                
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Renews / Expires</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    {settings?.subscriptionExpiresAt ? new Date(settings.subscriptionExpiresAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : "30-Day Trial"}
                  </span>
                </div>
              </div>

              {/* Action Button to Open Razorpay Modal - 15 Day Window Enforced */}
              <button
                type="button"
                onClick={() => {
                  if (eligibility.canRenew) {
                    setIsSubModalOpen(true);
                  }
                }}
                disabled={!eligibility.canRenew}
                className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  eligibility.canRenew
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75"
                }`}
                title={!eligibility.canRenew ? `Renewal locked: opens 15 days before expiry (${eligibility.daysUntilRenewalOpens} days left)` : "Click to renew with Razorpay"}
              >
                {eligibility.canRenew ? (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>
                      {settings?.subscriptionStatus === "expired"
                        ? "⚡ Renew Expired Subscription with Razorpay"
                        : settings?.subscriptionStatus === "trial"
                        ? "⚡ Activate 6-Month Plan with Razorpay"
                        : `⚡ Renew Subscription (${eligibility.daysLeft} Days Left)`}
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>
                      Renewal Opens in ${eligibility.daysUntilRenewalOpens} Days (${eligibility.daysLeft} Days Left)
                    </span>
                  </>
                )}
              </button>

              {!eligibility.canRenew && (
                <p className="text-[10px] text-slate-400 font-medium text-center leading-tight">
                  🔒 Subscription is active. Renewal button automatically enables 15 days before expiry (on ${eligibility.renewalOpenDate?.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}).
                </p>
              )}

              {/* Recent Payment Receipts / History preview */}
              {paymentHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Recent Renewal Invoices
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {paymentHistory.slice(0, 3).map(pay => (
                      <div key={pay.id} className="flex justify-between items-center bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl text-[11px] border border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{pay.planName}</span>
                          <span className="text-[9px] text-slate-400 ml-1.5">{new Date(pay.paidAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{pay.amount.toLocaleString()}</span>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">Paid</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Financial Invoicing */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm space-y-4 overflow-hidden">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
              <Receipt className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-slate-805 dark:text-slate-100 text-sm uppercase tracking-wider">Invoicing Details</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>GST / Tax Number</span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 22AAAAA1111A1Z1 (optional)"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Website URL</span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. www.yourrestaurant.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Tax Ratio (%)</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Percent className="w-4 h-4" />
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Currency Symbol</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-3.5 text-xs font-semibold focus:outline-none"
                  >
                    {currencies.map(c => (
                      <option key={c.symbol} value={c.symbol}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>



          {/* Customer Menu Feature Toggles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
              <Bell className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-slate-805 dark:text-slate-100 text-sm uppercase tracking-wider">Customer Menu Controls</h3>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Control which action buttons are visible to customers on the self-ordering QR menu.
            </p>

            <div className="space-y-3">
              {/* Waiter Call Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Call Waiter Button</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Customers can ring for a waiter from their phone</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableWaiterCall(v => !v)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    enableWaiterCall
                      ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {enableWaiterCall ? (
                    <><ToggleRight className="w-4 h-4" /><span>Enabled</span></>
                  ) : (
                    <><ToggleLeft className="w-4 h-4" /><span>Disabled</span></>
                  )}
                </button>
              </div>

              {/* Bill Request Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Request Bill Button</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Customers can request their bill from their phone</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableBillRequest(v => !v)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    enableBillRequest
                      ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {enableBillRequest ? (
                    <><ToggleRight className="w-4 h-4" /><span>Enabled</span></>
                  ) : (
                    <><ToggleLeft className="w-4 h-4" /><span>Disabled</span></>
                  )}
                </button>
              </div>

              {/* Thermal Bill Printing Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-brand-500" />
                    <span>POS Thermal Bill Printing</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Enable receipt printing feature for POS thermal billing machines</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableBillPrinting(v => !v)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    enableBillPrinting
                      ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {enableBillPrinting ? (
                    <><ToggleRight className="w-4 h-4" /><span>Enabled</span></>
                  ) : (
                    <><ToggleLeft className="w-4 h-4" /><span>Disabled</span></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Audio Alerts Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
              <Volume2 className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-slate-805 dark:text-slate-100 text-sm uppercase tracking-wider">Audio Alert Controls</h3>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Configure order chime alert sound and automatic voice announcement for incoming requests.
            </p>

            <div className="space-y-3">
              {/* Notification Chime Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Order Alert Sound</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Play sound chime + speech text on new orders and guest calls</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableSoundNotification(v => !v)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    enableSoundNotification
                      ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {enableSoundNotification ? (
                    <><ToggleRight className="w-4 h-4" /><span>Enabled</span></>
                  ) : (
                    <><ToggleLeft className="w-4 h-4" /><span>Disabled</span></>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        restaurantId={settings?.id || ""}
        restaurantName={settings?.name || ""}
        restaurantEmail={settings?.email}
        restaurantPhone={settings?.phone}
        currentExpiresAt={settings?.subscriptionExpiresAt}
        currentStatus={settings?.subscriptionStatus}
        currentPlan={settings?.planType}
        onSuccess={() => {
          setIsSubModalOpen(false);
          if (settings?.id) {
            subscriptionService.getPayments(settings.id).then(setPaymentHistory);
          }
        }}
      />
    </form>
  );
};
export default SettingsManager;
