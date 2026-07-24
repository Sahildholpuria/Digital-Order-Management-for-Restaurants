import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
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
  Printer
} from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const { settings, updateSettings, showToast } = useRestaurant();

  // Settings states
  const [name, setName] = useState(settings?.name || '');
  const [address, setAddress] = useState(settings?.address || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [gstNumber, setGstNumber] = useState(settings?.gstNumber || '');
  const [taxPercentage, setTaxPercentage] = useState(settings?.taxPercentage || 18);
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

  // Sync settings when loaded asynchronously from context
  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setLogoUrl(settings.logoUrl || '');
      setGstNumber(settings.gstNumber || '');
      setTaxPercentage(settings.taxPercentage || 18);
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
        logoUrl,
        gstNumber,
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
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4 lg:col-span-2">
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Brand Logo URL</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ImageIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
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

            {/* Operating Times */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Opening Time</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4" />
                  </span>
                  <input
                    type="time"
                    required
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Closing Time</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4" />
                  </span>
                  <input
                    type="time"
                    required
                    value={closingHours}
                    onChange={(e) => setClosingHours(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Financial & Styling details */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Financial Invoicing */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                      value={taxPercentage === 0 ? '' : taxPercentage}
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

          {/* Theme custom presets */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
              <Palette className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-slate-805 dark:text-slate-100 text-sm uppercase tracking-wider">Brand Personalization</h3>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-slate-400 leading-normal">
                Select a primary color. This changes both the <strong>Dashboard UI</strong> and <strong>Customer QR Menus</strong> to match your brand style.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {themePresets.map(preset => {
                  const isActive = themeColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setThemeColor(preset.hex)}
                      className={`p-3 rounded-2xl text-left border text-xs font-bold flex items-center gap-2.5 transition-all ${
                        isActive
                          ? 'border-brand-500 bg-brand-50/20 text-brand-650 dark:text-brand-400'
                          : 'bg-white border-slate-200 text-slate-505 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${preset.color}`} />
                      <span>{preset.label.split(' ')[0]}</span>
                      {isActive && <Check className="w-3.5 h-3.5 ml-auto text-brand-500" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom hex selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Custom Brand Hex</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-10 h-10 border-0 rounded-xl bg-transparent cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    placeholder="#FFFFFF"
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl px-4 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Customer Menu Feature Toggles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
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

    </form>
  );
};
export default SettingsManager;
