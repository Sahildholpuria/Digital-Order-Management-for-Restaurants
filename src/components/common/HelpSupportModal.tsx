import React, { useState } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import {
  X,
  LifeBuoy,
  MessageSquare,
  Mail,
  Phone,
  Printer,
  FileQuestion,
  ExternalLink,
  Check,
  Copy,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  ShoppingBag
} from "lucide-react";

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  const { settings, currentUser, qzStatus, connectQZTray, showToast } = useRestaurant();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  if (!isOpen) return null;

  const supportEmail = "support@restaurantsos.in";
  const supportPhone = "+91 98765 43210";
  const whatsappNumber = "919876543210";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopiedEmail(true);
    showToast("Support email copied to clipboard", "success");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const faqs = [
    {
      q: "How do Takeaway & Parcel Orders work?",
      a: "Click '+ Takeaway' in the Live Order Manager, Waiter Console, or Billing Terminal. A daily sequential token (e.g. TK-01) is automatically generated. The KOT prints silently with a PARCEL flag, and the ticket does not occupy dining tables."
    },
    {
      q: "How do I configure QZ Tray for Silent Thermal Printing?",
      a: "Install QZ Tray on your billing/kitchen PC, accept the self-signed certificate, and select your thermal printer in Store Settings > Thermal Station. All KOTs and Bills print instantly without browser dialogs."
    },
    {
      q: "How can customers self-order from the QR menu?",
      a: "Guests scan the table QR code with their mobile cameras. They can browse live dietary-filtered menus, add special cooking instructions, and choose between Table Dine-In or Takeaway Parcel pickup."
    },
    {
      q: "How do I add or edit food items and categories?",
      a: "Navigate to Menu List in the top navigation. You can create categories, set prices, mark veg/non-veg, attach item photos, and toggle real-time 86 availability."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div 
        style={{ width: "min(96vw, 760px)", maxHeight: "min(92vh, 720px)" }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col"
      >
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-5 py-4 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight text-white">
                  Help & Priority Support
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                  24/7 Available
                </span>
              </div>
              <p className="text-xs text-slate-300">
                RestaurantsOS Dedicated Merchant Assistance & Setup Guides
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 dark:text-slate-100">
          
          {/* Quick Contact Channels */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
              Direct Support Channels
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* WhatsApp Support */}
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hi%20RestaurantsOS%20Support,%20I%20need%20help%20with%20my%20restaurant%20(${encodeURIComponent(settings?.name || "My Store")})`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60 p-3.5 rounded-2xl transition-all flex flex-col justify-between group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200">
                    WhatsApp Chat
                  </h4>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    Instant agent reply (1-2 mins)
                  </p>
                </div>
              </a>

              {/* Email Desk */}
              <div 
                onClick={handleCopyEmail}
                className="bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/30 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-800/60 p-3.5 rounded-2xl transition-all flex flex-col justify-between cursor-pointer group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold">
                    <Mail className="w-4 h-4" />
                  </div>
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-sky-600" /> : <Copy className="w-3.5 h-3.5 text-sky-500 group-hover:scale-110 transition-transform" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-sky-900 dark:text-sky-200">
                    Email Desk
                  </h4>
                  <p className="text-[10px] text-sky-700/80 dark:text-sky-400/80 mt-0.5 truncate font-mono">
                    {supportEmail}
                  </p>
                </div>
              </div>

              {/* Phone Helpline */}
              <a
                href={`tel:${supportPhone}`}
                className="bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800/60 p-3.5 rounded-2xl transition-all flex flex-col justify-between group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-500 text-white flex items-center justify-center font-bold">
                    <Phone className="w-4 h-4" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-violet-900 dark:text-violet-200">
                    Helpline Call
                  </h4>
                  <p className="text-[10px] text-violet-700/80 dark:text-violet-400/80 mt-0.5 font-mono">
                    {supportPhone}
                  </p>
                </div>
              </a>

            </div>
          </div>

          {/* Diagnostics Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Active Store Diagnostics
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Restaurant</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">{settings?.name || "Default"}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Logged In As</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">{currentUser?.name || "Admin"}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Silent Print (QZ)</span>
                <span className={`font-black text-[11px] ${qzStatus === "connected" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {qzStatus === "connected" ? "● Connected" : "○ Disconnected"}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Core Build</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">v2.4.0 Live</span>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions Accordion */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Frequently Asked Questions (FAQ)
            </span>
            <div className="space-y-2">
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
                      className="w-full p-3.5 text-left flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileQuestion className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{faq.q}</span>
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">
            RestaurantsOS Global Merchant Help Desk
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold cursor-pointer hover:opacity-90"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
export default HelpSupportModal;
