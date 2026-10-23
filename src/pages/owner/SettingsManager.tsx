import React, { useState, useEffect } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { QRCodeCanvas } from "qrcode.react";
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
  Radio,
  QrCode,
  Upload,
  Trash2,
  Bluetooth
} from "lucide-react";
import { bluetoothPrinterService, BluetoothPrinterDevice } from "../../services/bluetoothPrinterService";

export const SettingsManager: React.FC = () => {
  const [btDevice, setBtDevice] = useState<BluetoothPrinterDevice | null>(bluetoothPrinterService.getConnectedDevice());
  const [isBtConnecting, setIsBtConnecting] = useState(false);

  useEffect(() => {
    return bluetoothPrinterService.subscribe(setBtDevice);
  }, []);

  const handleConnectBluetooth = async () => {
    setIsBtConnecting(true);
    try {
      const res = await bluetoothPrinterService.connect();
      if (res.success) {
        showToast(res.message, "success");
      } else {
        showToast(res.message, "error");
      }
    } finally {
      setIsBtConnecting(false);
    }
  };

  const handleDisconnectBluetooth = async () => {
    await bluetoothPrinterService.disconnect();
    showToast("Bluetooth printer disconnected", "info");
  };

  const handleTestBluetoothPrint = async () => {
    const ok = await bluetoothPrinterService.testPrint();
    if (ok) {
      showToast("Test ticket sent via Bluetooth!", "success");
    } else {
      showToast("Failed to print via Bluetooth. Please reconnect printer.", "error");
    }
  };

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
  const [upiId, setUpiId] = useState(settings?.upiId || "");
  const [paymentQrImage, setPaymentQrImage] = useState(settings?.paymentQrImage || "");
  const [paymentQrType, setPaymentQrType] = useState<"dynamic" | "custom">(settings?.paymentQrType || "dynamic");
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
      setUpiId(settings.upiId || "");
      setPaymentQrImage(settings.paymentQrImage || "");
      setPaymentQrType(settings.paymentQrType || "dynamic");
      
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

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast("Please upload an image smaller than 3MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setPaymentQrImage(result);
        setPaymentQrType("custom");
        showToast("Payment QR image loaded! Click Save Changes to apply.", "success");
      }
    };
    reader.readAsDataURL(file);
  };

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
        upiId,
        paymentQrImage,
        paymentQrType,
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
    } catch (err: any) {
      console.error("[SettingsManager] Save error:", err);
      const msg = err?.message || err?.error_description || "Failed to save settings.";
      if (msg.includes("permission denied") || msg.includes("JWT") || msg.includes("expired") || msg.includes("401")) {
        showToast("Your session has expired. Please sign out and sign in again.", "error");
      } else {
        showToast(msg, "error");
      }
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* ================= LEFT MAIN COLUMN (Brand + Invoicing + QZ Tray Station) ================= */}
        <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">

          {/* BRAND INFORMATION & INVOICING CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-850 p-3.5 sm:p-5 rounded-2xl shadow-xs space-y-6">
            
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
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
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

                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
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
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-2xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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

          {/* ================= UPI & AT-TABLE PAYMENT QR CODE SETTINGS ================= */}
          <div className="bg-gradient-to-br from-white to-purple-500/5 dark:from-slate-900 dark:to-purple-950/20 border-2 border-purple-500/30 dark:border-purple-500/20 p-3.5 sm:p-5 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-500/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm sm:text-base uppercase tracking-wider">
                      UPI & At-Table Payment QR Code
                    </h3>
                    <span className="text-[10px] bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Instant At-Table POS</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Set your merchant UPI ID (VPA) or upload your physical standee QR so waiters can accept customer payments directly at the dining table.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Controls */}
              <div className="lg:col-span-7 space-y-4">
                {/* UPI ID */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span>Merchant UPI ID / VPA</span>
                    <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400 font-bold">For Dynamic QR</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-500">
                      <QrCode className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. yourrestaurant@okhdfcbank or 9876543210@paytm"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    When set, waiter smartphones automatically generate a QR code with the exact order bill amount (e.g. ₹999).
                  </p>
                </div>

                {/* Mode Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Default Payment QR Style
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentQrType("dynamic")}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        paymentQrType === "dynamic"
                          ? "bg-purple-500/15 border-purple-500 text-purple-950 dark:text-purple-200 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-extrabold text-xs flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Dynamic Amount QR</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                        Auto-embeds bill amount. Customer scans & clicks pay without typing amount.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentQrType("custom")}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        paymentQrType === "custom"
                          ? "bg-purple-500/15 border-purple-500 text-purple-950 dark:text-purple-200 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-extrabold text-xs flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Uploaded Standee QR</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                        Displays your uploaded PhonePe / BharatPe / Paytm standee QR image.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Upload Merchant Standee Image */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Upload Merchant Standee QR Image
                  </label>
                  <div className="flex items-center gap-2.5">
                    <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-purple-300 dark:border-purple-800/60 hover:border-purple-500 dark:hover:border-purple-400 rounded-2xl p-3 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-all bg-purple-50/40 dark:bg-purple-950/20">
                      <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>{paymentQrImage ? "Replace Standee Image" : "Upload QR Image (PNG/JPG)"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrImageUpload}
                        className="hidden"
                      />
                    </label>
                    {paymentQrImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentQrImage("");
                          setPaymentQrType("dynamic");
                          showToast("Custom QR image removed", "info");
                        }}
                        className="p-3 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                        title="Remove uploaded QR image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview Panel */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-purple-200/80 dark:border-purple-900/40 flex flex-col items-center text-center space-y-3 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/15 px-3 py-1 rounded-full border border-purple-500/30">
                  Waiter At-Table Preview
                </span>

                <div className="w-40 h-40 bg-white rounded-xl p-2.5 shadow-md border border-slate-200 flex items-center justify-center overflow-hidden">
                  {paymentQrType === "custom" && paymentQrImage ? (
                    <img
                      src={paymentQrImage}
                      alt="Uploaded Payment QR"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <QRCodeCanvas
                      value={`upi://pay?pa=${upiId || "merchant@upi"}&pn=${encodeURIComponent(name || "RestaurantsOS")}&am=999.00&cu=INR&tn=Table_1_Bill`}
                      size={130}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>

                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {paymentQrType === "custom" && paymentQrImage ? "Uploaded Merchant Standee QR" : (upiId ? `Dynamic UPI: ${upiId}` : "Dynamic UPI (Default)")}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Scannable by Google Pay, PhonePe, Paytm, BHIM & all banking apps
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ================= PROMINENT QZ TRAY SILENT THERMAL PRINTING STATION ================= */}
          <div className="bg-gradient-to-br from-white to-emerald-500/5 dark:from-slate-900 dark:to-emerald-950/20 border-2 border-emerald-500/35 dark:border-emerald-500/25 p-3.5 sm:p-5 rounded-2xl shadow-sm space-y-6">
            
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
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => saveQZConfig({ paperWidth: "80mm" })}
                    className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                      qzConfig.paperWidth === "80mm"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                    title="Standard POS thermal roll (Epson, Star, TVS, Rongta, NGX)"
                  >
                    80mm (3")
                  </button>
                  <button
                    type="button"
                    onClick={() => saveQZConfig({ paperWidth: "58mm" })}
                    className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                      qzConfig.paperWidth === "58mm"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                    title="Mini handheld POS and portable Bluetooth thermal printer"
                  >
                    58mm (2")
                  </button>
                  <button
                    type="button"
                    onClick={() => saveQZConfig({ paperWidth: "A4" })}
                    className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                      qzConfig.paperWidth === "A4"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                    title="Standard A4 / Letter office desktop printer (LaserJet, InkJet)"
                  >
                    A4 (Full Page)
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

          {/* ================= WIRELESS BLUETOOTH THERMAL PRINTER CARD ================= */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-850 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Bluetooth className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">
                    Wireless Bluetooth Thermal Printers
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Direct ESC/POS printing to mobile & handheld printers without drivers or cables
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border">
                <span
                  className={`w-2 h-2 rounded-full ${
                    btDevice ? "bg-blue-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <span className={btDevice ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}>
                  {btDevice ? btDevice.name : "Disconnected"}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {btDevice ? (
                  <p>Paired with <strong>{btDevice.name}</strong>. Ready for wireless mobile KOT and bill dispatch.</p>
                ) : (
                  <p>Compatible with battery-powered portable thermal printers (Sunmi, MPT-II, PT-210, POS-5802, Rongta, etc.) on Chrome.</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {btDevice ? (
                  <>
                    <button
                      type="button"
                      onClick={handleTestBluetoothPrint}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all active:scale-95 shadow-xs flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Test Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectBluetooth}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectBluetooth}
                    disabled={isBtConnecting}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all active:scale-95 shadow-xs flex items-center gap-1.5"
                  >
                    <Bluetooth className="w-4 h-4" />
                    <span>{isBtConnecting ? "Searching..." : "Pair Bluetooth Printer"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ================= UNIVERSAL PRINTER COMPATIBILITY OVERVIEW ================= */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Supported Printer Types & Connection Methods</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">1. Thermal POS (80mm / 3-inch)</strong>
                Epson TM-T82, Star TSP100, TVS, NGX, Posiflex, Rongta, Xprinter via USB, Ethernet/LAN, Wi-Fi, or QZ Tray.
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">2. Mini Portable (58mm / 2-inch)</strong>
                Handheld billing machines, Sunmi, MPT-II, mobile Bluetooth thermal printers & pocket devices.
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">3. Standard Office (A4 / Letter)</strong>
                HP LaserJet, Canon, Brother, Epson InkJet & network office printers for full-page official GST Tax Invoices.
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">4. Mobile AirPrint & System Print</strong>
                Instant driverless printing on iPhone, iPad (AirPrint), Android Print Service, Windows & macOS print dialogs.
              </div>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN (Subscription, Customer Controls, Audio) ================= */}
        <div className="lg:col-span-1 space-y-3.5 sm:space-y-4">
          
          {/* Subscription Plan & Renewal Card */}
          {/* Customer Menu Feature Toggles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-850 p-3.5 sm:p-4 rounded-2xl shadow-xs space-y-4">
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
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
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
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
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
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-850 p-3.5 sm:p-4 rounded-2xl shadow-xs space-y-4">
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
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
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
