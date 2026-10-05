import React, { useState, useEffect } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Receipt, 
  Percent, 
  Clock, 
  Check,
  Bell,
  ToggleLeft,
  ToggleRight,
  Volume2,
  Printer,
  Globe,
  RefreshCw,
  ExternalLink,
  Cpu,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  Lock,
  Zap,
  Radio
} from "lucide-react";

export const SettingsManager: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    showToast, 
    qzStatus,
    qzPrinters,
    qzConfig,
    connectQZTray,
    disconnectQZTray,
    refreshQZPrinters,
    saveQZConfig,
    testQZPrint
  } = useRestaurant();

  // Settings states
  const [name, setName] = useState(settings?.name || "");
  const [address, setAddress] = useState(settings?.address || "");
  const [phone, setPhone] = useState(settings?.phone || "");
  const [email, setEmail] = useState(settings?.email || "");
  const [gstNumber, setGstNumber] = useState(settings?.gstNumber || "");
  const [websiteUrl, setWebsiteUrl] = useState(settings?.websiteUrl || "");
  const [taxPercentage, setTaxPercentage] = useState(settings?.taxPercentage ?? 0);
  const [currency, setCurrency] = useState(settings?.currency || "₹");
  const [openingHours, setOpeningHours] = useState(settings?.openingHours || "09:00");
  const [closingHours, setClosingHours] = useState(settings?.closingHours || "22:00");
  const [themeColor, setThemeColor] = useState(settings?.themeColor || "#6366F1");
  const [enableWaiterCall, setEnableWaiterCall] = useState(settings?.enableWaiterCall ?? true);
  const [enableBillRequest, setEnableBillRequest] = useState(settings?.enableBillRequest ?? true);
  const [enableSoundNotification, setEnableSoundNotification] = useState(settings?.enableSoundNotification ?? true);
  const [enableBillPrinting, setEnableBillPrinting] = useState(settings?.enableBillPrinting ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);


  // Sync settings when loaded asynchronously from context
  useEffect(() => {
    if (settings) {
      setName(settings.name || "");
      setAddress(settings.address || "");
      setPhone(settings.phone || "");
      setEmail(settings.email || "");
      setGstNumber(settings.gstNumber || "");
      setWebsiteUrl(settings.websiteUrl || "");
      setTaxPercentage(settings.taxPercentage ?? 0);
      setCurrency(settings.currency || "₹");
      setOpeningHours(settings.openingHours || "09:00");
      setClosingHours(settings.closingHours || "22:00");
      setThemeColor(settings.themeColor || "#6366F1");
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

  const currencies = [
    { label: "Rupee (₹)", symbol: "₹" },
    { label: "Dollar ($)", symbol: "$" },
    { label: "Euro (€)", symbol: "€" },
    { label: "Pound (£)", symbol: "£" },
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
          year: "numeric", 
          month: "short", 
          day: "numeric", 
          hour: "2-digit", 
          minute: "2-digit" 
        });
        localStorage.setItem(`settings_updated_at_${settings.id}`, now);
        setLastUpdated(now);
      }
      showToast("Restaurant settings updated successfully!", "success");
    } catch (err) {
      showToast("Failed to save settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12 animate-fade-in">
      
      {/* Page Title & Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Store Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Customize branding, configure invoicing guidelines, and set thermal printing stations.
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
          className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/15 transition-all cursor-pointer shrink-0"
        >
          <Check className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save Settings"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ================= LEFT MAIN COLUMN (Brand + Invoicing + QZ Tray Station) ================= */}
        <div className="lg:col-span-2 space-y-6">

          {/* BRAND INFORMATION & INVOICING CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-850 p-5 sm:p-7 rounded-2xl sm:rounded-3xl shadow-xs space-y-6">
            
            {/* Section 1: Brand Information Header */}
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">
                    Brand Information
                  </h3>
                  <p className="text-[11px] text-slate-400">Core identity and customer contact details displayed on customer menus and receipts.</p>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                {/* Restaurant Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Restaurant Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Demo Restaurant"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Physical Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 123 Food Street, Downtown"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Telephone and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Telephone / Mobile
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. info@restaurant.com"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-brand-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Store Operating Hours
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-xs shrink-0"
                      />
                    </div>

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
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-xs shrink-0"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Section 2: Invoicing Details (Moved inside Brand Details Section) */}
            <div className="pt-6 border-t-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">
                    Invoicing & Tax Details
                  </h3>
                  <p className="text-[11px] text-slate-400">Tax numbers, official website, and billing calculations applied on customer receipts.</p>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GST / Tax Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                      <span>GST / Tax Number</span>
                      <span className="text-[10px] font-normal text-slate-400 lowercase">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Receipt className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. 22AAAAA1111A1Z1"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Website URL */}
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
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tax Ratio */}
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
                        onChange={(e) => setTaxPercentage(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Currency Symbol */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Currency Symbol
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {currencies.map(c => (
                        <option key={c.symbol} value={c.symbol}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ================= PROMINENT QZ TRAY SILENT THERMAL PRINTING STATION ================= */}
          <div className="bg-gradient-to-br from-white to-emerald-500/5 dark:from-slate-900 dark:to-emerald-950/20 border-2 border-emerald-500/35 dark:border-emerald-500/25 p-5 sm:p-7 rounded-2xl sm:rounded-3xl shadow-sm space-y-6">
            
            {/* Header with Live Status & Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm sm:text-base uppercase tracking-wider">
                      QZ Tray Silent Thermal Station
                    </h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Zero Popups • Trusted</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Direct silent hardware printing for Kitchen KOTs and POS Bills without browser print dialogs.
                  </p>
                </div>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${
                    qzStatus === "connected"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs"
                      : qzStatus === "connecting"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      qzStatus === "connected" ? "bg-emerald-500 animate-pulse" : qzStatus === "connecting" ? "bg-amber-500" : "bg-rose-500"
                    }`}
                  />
                  <span>
                    {qzStatus === "connected"
                      ? "QZ Connected"
                      : qzStatus === "connecting"
                      ? "Connecting..."
                      : "QZ Offline"}
                  </span>
                </span>

                {qzStatus === "connected" ? (
                  <button
                    type="button"
                    onClick={() => refreshQZPrinters()}
                    className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-xs"
                    title="Refresh Detected Printers"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => connectQZTray()}
                    className="px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>

            {/* Printer Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Kitchen KOT Printer Selector */}
              <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-750 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Kitchen KOT Printer</span>
                  </label>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md font-bold">
                    KOT Routing
                  </span>
                </div>
                <select
                  value={qzConfig.kotPrinter || ""}
                  onChange={(e) => saveQZConfig({ kotPrinter: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Auto-detect Default Thermal Printer --</option>
                  {qzPrinters.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Sends orders directly to kitchen thermal printer when accepted or punched.
                </p>
              </div>

              {/* POS Bill Receipt Printer Selector */}
              <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-750 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>POS Bill Receipt Printer</span>
                  </label>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md font-bold">
                    Cashier POS
                  </span>
                </div>
                <select
                  value={qzConfig.billPrinter || ""}
                  onChange={(e) => saveQZConfig({ billPrinter: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Auto-detect Default Thermal Printer --</option>
                  {qzPrinters.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Prints customer tax invoice receipt directly at the billing cash counter.
                </p>
              </div>

            </div>

            {/* Hardware Parameters & Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              
              {/* Thermal Paper Width Selection */}
              <div className="p-3.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-750 flex flex-col justify-between gap-2 shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Paper Roll Width
                  </span>
                  <span className="text-[10px] text-slate-400 block">Thermal roll size</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => saveQZConfig({ paperWidth: "80mm" })}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      qzConfig.paperWidth === "80mm"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    80mm (3-inch)
                  </button>
                  <button
                    type="button"
                    onClick={() => saveQZConfig({ paperWidth: "58mm" })}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      qzConfig.paperWidth === "58mm"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    58mm (2-inch)
                  </button>
                </div>
              </div>

              {/* Auto-print KOT Toggle */}
              <div className="p-3.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-750 flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Auto-Print KOT
                  </span>
                  <span className="text-[10px] text-slate-400 block">Silent print on new order</span>
                </div>
                <button
                  type="button"
                  onClick={() => saveQZConfig({ autoPrintKOT: !qzConfig.autoPrintKOT })}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    qzConfig.autoPrintKOT
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                  }`}
                >
                  {qzConfig.autoPrintKOT ? "ON" : "OFF"}
                </button>
              </div>

              {/* Auto-print Bill Toggle */}
              <div className="p-3.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-750 flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Auto-Print Bill
                  </span>
                  <span className="text-[10px] text-slate-400 block">Silent print on settlement</span>
                </div>
                <button
                  type="button"
                  onClick={() => saveQZConfig({ autoPrintBill: !qzConfig.autoPrintBill })}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    qzConfig.autoPrintBill
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                  }`}
                >
                  {qzConfig.autoPrintBill ? "ON" : "OFF"}
                </button>
              </div>

            </div>

            {/* Test Hardware Buttons & Quick Info */}
            <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-2xl border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                  Direct Printer Test:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => testQZPrint("kot")}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer active:scale-95 shadow-xs flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>⚡ Test KOT Ticket</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => testQZPrint("bill")}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer active:scale-95 shadow-xs flex items-center gap-1.5"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>⚡ Test POS Receipt</span>
                  </button>
                </div>
              </div>

              <a
                href="https://qz.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Download QZ Tray (v2.2+)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>

        {/* ================= RIGHT COLUMN (Subscription, Customer Controls, Audio) ================= */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Subscription Plan & Renewal Card */}
          {/* Customer Menu Feature Toggles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-850 p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Bell className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">
                Customer Menu Controls
              </h3>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Control which action buttons are visible to customers on the self-ordering QR menu.
            </p>

            <div className="space-y-3">
              {/* Waiter Call Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Call Waiter Button</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customers can ring for a waiter from their phone</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableWaiterCall(v => !v)}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    enableWaiterCall
                      ? "bg-brand-600 border-brand-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
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
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Request Bill Button</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customers can request their bill from their phone</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableBillRequest(v => !v)}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    enableBillRequest
                      ? "bg-brand-600 border-brand-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
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
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-brand-500" />
                    <span>POS Thermal Printing</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Enable receipt printing feature for POS billing</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableBillPrinting(v => !v)}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    enableBillPrinting
                      ? "bg-brand-600 border-brand-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-850 p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Volume2 className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">
                Audio Alert Controls
              </h3>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Configure order chime alert sound and automatic voice announcement for incoming requests.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Order Alert Sound</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Play sound chime + speech text on new orders and guest calls</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableSoundNotification(v => !v)}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    enableSoundNotification
                      ? "bg-brand-600 border-brand-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
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
