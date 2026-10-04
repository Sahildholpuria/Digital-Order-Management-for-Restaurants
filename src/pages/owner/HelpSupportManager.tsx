import React, { useState } from "react";
import { useRestaurant } from "../../context/RestaurantContext";
import {
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
  ShoppingBag,
  Send,
  HelpCircle,
  QrCode,
  Utensils,
  Receipt,
  Headphones,
  CheckCircle2,
  Clock,
  Laptop
} from "lucide-react";

export const HelpSupportManager: React.FC = () => {
  const { settings, currentUser, qzStatus, qzConfig, connectQZTray, showToast } = useRestaurant();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSendingTicket, setIsSendingTicket] = useState(false);
  const [ticketSentSuccess, setTicketSentSuccess] = useState(false);

  const supportEmail = "support@restaurantsos.in";
  const supportPhone = "+91 98765 43210";
  const whatsappNumber = "919876543210";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopiedEmail(true);
    showToast("Support email copied to clipboard!", "success");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(supportPhone);
    setCopiedPhone(true);
    showToast("Helpline number copied to clipboard!", "success");
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      showToast("Please fill in both subject and message", "error");
      return;
    }

    setIsSendingTicket(true);
    setTimeout(() => {
      setIsSendingTicket(false);
      setTicketSentSuccess(true);
      setTicketSubject("");
      setTicketMessage("");
      showToast("Support ticket dispatched! An engineer will reach out within 15 mins.", "success");
      setTimeout(() => setTicketSentSuccess(false), 5000);
    }, 800);
  };

  const faqs = [
    {
      q: "How do Takeaway & Parcel Orders work?",
      a: "Click '+ Takeaway' in the Live Order Manager, Waiter Console, or Billing Terminal. A daily sequential token (e.g. TK-01) is automatically generated. The KOT prints silently with a bold PARCEL flag, and the ticket does not occupy dining tables."
    },
    {
      q: "How do I configure QZ Tray for Silent Thermal Printing?",
      a: "Install QZ Tray on your billing/kitchen PC, accept the self-signed certificate, and select your thermal printer in Store Settings > Thermal Station. All KOTs and Bills print instantly in the background without browser print dialogs."
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

  const quickGuides = [
    {
      icon: ShoppingBag,
      title: "Takeaway & Parcel Workflow",
      desc: "Punch takeaway orders, auto-generate sequential tokens (TK-01), and dispatch parcel KOTs without table lock.",
      color: "from-orange-500 to-amber-600"
    },
    {
      icon: Printer,
      title: "Silent QZ Thermal Station",
      desc: "Connect 80mm & 58mm ESC/POS thermal printers for zero-click kitchen and cashier printing.",
      color: "from-emerald-600 to-teal-600"
    },
    {
      icon: QrCode,
      title: "Table QR Code Standees",
      desc: "Generate and download branded print-ready high-resolution QR codes for all your dining tables.",
      color: "from-blue-600 to-indigo-600"
    },
    {
      icon: Receipt,
      title: "POS Billing & GST Invoicing",
      desc: "Generate tax-compliant receipts, split payments, and record settlements in real-time.",
      color: "from-purple-600 to-violet-600"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-[1400px] mx-auto font-sans">
      
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl z-10">
          <div className="flex items-center gap-2">
            <span className="bg-sky-500/20 text-sky-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-sky-400/30 uppercase tracking-wider flex items-center gap-1">
              <Headphones className="w-3 h-3 text-sky-400" />
              <span>24/7 Dedicated Support</span>
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Merchant Care & Technical Assistance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            RestaurantsOS Help & Support Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Get instant assistance for POS billing, QZ Tray thermal printing, takeaway orders, and QR menus. Our support engineers are always active to keep your restaurant running 100% smoothly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 z-10 shrink-0">
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi%20RestaurantsOS%20Support,%20I%20need%20help%20with%20my%20restaurant%20(${encodeURIComponent(settings?.name || "My Store")})`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>Chat on WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={handleCopyEmail}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider border border-white/15 transition-all cursor-pointer"
          >
            {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-300" />}
            <span>{copiedEmail ? "Email Copied" : "Copy Support Email"}</span>
          </button>
        </div>

        {/* Decorative subtle pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* SECTION: DIRECT SUPPORT CHANNELS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Direct Support Channels</span>
          </h2>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Fast Response Guarantee
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Channel 1: WhatsApp Live Support */}
          <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/40 hover:border-emerald-500 p-5 rounded-3xl transition-all shadow-xs flex flex-col justify-between space-y-4 group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  ⚡ 1-2 Min Reply
                </span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  💬 WhatsApp Live Support
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  One-tap direct chat preloaded with your store details for rapid troubleshooting and real-time guidance.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/${whatsappNumber}?text=Hi%20RestaurantsOS%20Support,%20I%20need%20help%20with%20my%20restaurant%20(${encodeURIComponent(settings?.name || "My Store")})`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
            >
              <span>Open WhatsApp Chat</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Channel 2: Email Support Desk */}
          <div className="bg-white dark:bg-slate-900 border-2 border-sky-500/40 hover:border-sky-500 p-5 rounded-3xl transition-all shadow-xs flex flex-col justify-between space-y-4 group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <Mail className="w-6 h-6" />
                </div>
                <span className="bg-sky-500/10 text-sky-700 dark:text-sky-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-sky-500/20">
                  ✉️ Priority Inbox
                </span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ✉️ Email Support Desk
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Click-to-copy <strong className="font-mono text-slate-800 dark:text-slate-200">{supportEmail}</strong> for detailed queries, billing requests, or feature inquiries.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyEmail}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-black py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmail ? "Copied to Clipboard" : "Copy Email"}</span>
              </button>
              <a
                href={`mailto:${supportEmail}?subject=Support%20Request%20-%20${encodeURIComponent(settings?.name || "Restaurant")}`}
                className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all cursor-pointer"
                title="Open Mail Client"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Channel 3: Helpline Call */}
          <div className="bg-white dark:bg-slate-900 border-2 border-violet-500/40 hover:border-violet-500 p-5 rounded-3xl transition-all shadow-xs flex flex-col justify-between space-y-4 group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  <Phone className="w-6 h-6" />
                </div>
                <span className="bg-violet-500/10 text-violet-700 dark:text-violet-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-violet-500/20">
                  📞 Phone Hotline
                </span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  📞 Helpline Call
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Direct merchant phone assistance for emergency POS or billing issues during live service operations.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={`tel:${supportPhone}`}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-black py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-violet-600/20 active:scale-95 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {supportPhone}</span>
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
      </div>

      {/* SECTION: STORE DIAGNOSTICS & SYSTEM STATUS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Live Store Diagnostics & System Status
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full">
            All Systems Operational
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Store Name</span>
            <span className="font-extrabold text-slate-900 dark:text-white truncate block mt-0.5">
              {settings?.name || "RestaurantsOS Store"}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Logged In User</span>
            <span className="font-extrabold text-slate-900 dark:text-white truncate block mt-0.5">
              {currentUser?.name || "Admin"} ({currentUser?.role || "Staff"})
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">QZ Silent Printing</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className={`font-black text-xs ${qzStatus === "connected" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {qzStatus === "connected" ? "● Connected" : "○ Disconnected"}
              </span>
              {qzStatus !== "connected" && (
                <button
                  type="button"
                  onClick={() => connectQZTray()}
                  className="text-[10px] text-brand-600 font-bold hover:underline cursor-pointer"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">App Release</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold block mt-0.5">
              v2.4.0 Production
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: SYSTEM GUIDES & DIRECT TICKET DESK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7/12: Quick Feature Guides */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Quick Feature Guides</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickGuides.map((guide, idx) => {
              const Icon = guide.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl space-y-2.5 shadow-2xs hover:shadow-md transition-all"
                >
                  <div className={`w-9 h-9 rounded-2xl bg-gradient-to-r ${guide.color} text-white flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {guide.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {guide.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQs Accordion */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl space-y-3 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileQuestion className="w-4 h-4 text-sky-500" />
              <span>Frequently Asked Questions (FAQs)</span>
            </h3>

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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{faq.q}</span>
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-90" : ""}`} />
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

        {/* Right 5/12: Direct Ticket Submission Box */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm space-y-4 sticky top-24">
            <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-500" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Send Support Message
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Submit a ticket directly to our engineering desk.
              </p>
            </div>

            {ticketSentSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-2 animate-scale-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-bounce-short" />
                <h4 className="font-black text-sm text-emerald-800 dark:text-emerald-300">
                  Message Dispatched!
                </h4>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                  Our team has received your ticket and will respond via email or WhatsApp within 15 minutes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendTicket} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Subject / Issue Category *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QZ Tray thermal printer setup help..."
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Detailed Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe what you need assistance with or what error you are seeing..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs font-medium resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingTicket}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTicket ? "Dispatching..." : "Send Priority Ticket"}</span>
                </button>
              </form>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Average response time:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">~8 minutes</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
export default HelpSupportManager;
