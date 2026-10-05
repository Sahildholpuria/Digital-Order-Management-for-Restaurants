import React, { useState } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import { APP_VERSION } from "../../config/appVersion";
import supportConfigService, { SupportChannelsConfig } from "../../services/supportConfigService";
import {
  MessageSquare,
  Mail,
  Phone,
  FileQuestion,
  ExternalLink,
  Check,
  Copy,
  ChevronRight,
  Headphones
} from "lucide-react";

export const HelpSupportManager: React.FC = () => {
  const { settings, showToast } = useRestaurant();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [supportConfig, setSupportConfig] = useState<SupportChannelsConfig>(() => supportConfigService.getSupportConfig());

  React.useEffect(() => {
    const unsub = supportConfigService.subscribeSupportConfig((cfg) => {
      setSupportConfig(cfg);
    });
    return unsub;
  }, []);

  const supportEmail = supportConfig.email;
  const supportPhone = supportConfig.phone;
  const whatsappNumber = supportConfig.whatsapp;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopiedEmail(true);
    showToast?.("Support email copied to clipboard", "success");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(supportPhone);
    setCopiedPhone(true);
    showToast?.("Phone number copied to clipboard", "success");
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const faqs = [
    {
      q: "How do I configure QZ Tray for Silent Thermal Printing?",
      a: "Install QZ Tray on your billing/kitchen PC, accept the certificate, and select your thermal printer in Store Settings > Thermal Station. All KOTs and Bills print instantly in the background without browser print dialogs."
    },
    {
      q: "How can customers self-order from the QR menu?",
      a: "Guests scan the table QR code with their mobile cameras. They can browse live dietary-filtered menus, add special cooking instructions, and choose between Table Dine-In or Takeaway Parcel pickup."
    },
    {
      q: "How do I add or edit food items and categories?",
      a: "Navigate to Menu List in the top navigation. You can create categories, set prices, mark veg/non-veg, attach item photos, and toggle real-time 86 availability."
    },
    {
      q: "How do I settle bills and apply discount margins?",
      a: "Open POS Billing, pick an active table or takeaway order from the queue, enter optional discount percentage (e.g. 10%), pick payment method (Cash, UPI, Card), and click Settle & Mark Paid. An instant 80mm or 58mm thermal receipt is generated."
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12 max-w-[1200px] mx-auto font-sans">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <span>Help & Support</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Get direct merchant assistance for POS billing, QZ thermal printing, takeaway orders, and QR menus.
        </p>
      </div>

      {/* 3 Direct Support Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        
        {/* 1. WhatsApp Support */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Chat
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                WhatsApp Live Support
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                One-tap direct chat preloaded with your store details for quick troubleshooting.
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi%20RestaurantsOS%20Support,%20I%20need%20help%20with%20my%20restaurant%20(${encodeURIComponent(settings?.name || "My Store")})`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
          </a>
        </div>

        {/* 2. Email Support */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/50 text-sky-600 flex items-center justify-center shadow-xs">
                <Mail className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60">
                Email Desk
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Email Support Desk
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Click-to-copy support@restaurantsos.in for setup requests or custom integrations.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={`mailto:${supportEmail}?subject=Support%20Request%20-%20${encodeURIComponent(settings?.name || "Restaurant")}`}
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-black py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Email</span>
            </a>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all cursor-pointer"
              title="Copy Email Address"
            >
              {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 3. Phone Helpline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/50 text-violet-600 flex items-center justify-center shadow-xs">
                <Phone className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60">
                Phone Hotline
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Helpline Call
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Direct merchant phone assistance for emergency billing or printing questions.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={`tel:${supportPhone}`}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-black py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-violet-600/20 active:scale-95 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Helpline</span>
            </a>
            <button
              type="button"
              onClick={handleCopyPhone}
              className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all cursor-pointer"
              title="Copy Phone Number"
            >
              {copiedPhone ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>

            {/* FAQs Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <FileQuestion className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* App Version Info & Live Status Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-200/80 dark:border-slate-800 pt-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-600 dark:text-slate-300">RestaurantsOS Live Cloud</span>
          <span>•</span>
          <span>Version <span className="font-mono font-bold text-slate-800 dark:text-slate-100">v{APP_VERSION}</span></span>
        </div>
        <span className="text-[11px] text-slate-400">All systems operational & up to date</span>
      </div>

    </div>
  );
};
export default HelpSupportManager;
