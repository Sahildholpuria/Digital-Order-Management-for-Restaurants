# Digital Order Management for Restaurants

A modern, production-ready, and highly aesthetic QR-based self-ordering and POS dashboard system designed for both single-location diners and multi-branch restaurant chains.

Built using **React (latest)**, **Vite**, **TypeScript**, **Tailwind CSS v4**, **Supabase** (with real-time WebSocket subscriptions & fallback mock engine), and a high-contrast **Monochrome Black & White Design System**.

---

## 🌟 Core Features

### 1. Customer Self-Ordering (QR Flow)
- **Zero Friction**: Customers scan a table-specific QR Code (e.g. `/menu/table-3`) and browse live menus instantly without login.
- **Instant Real-time Menu Sync**: Any menu addition, price edit, availability toggle, or item deletion made in POS reflects **instantly in 0 seconds** on customer screens without requiring a page refresh.
- **Smart Table Display**: Automatically sanitizes raw database timestamps (e.g. `1785560211444`) into clean, human-readable table labels (`1`, `2`, `3`).
- **Dietary Selectors**: Veg/Non-veg indicators, custom spicy level rankings, and special cooking instruction drawers.
- **Portion Selection (Half/Full)**: Support for custom portion variants (e.g. `Half` or `Full` sizes with independent pricing) encoded directly into dish descriptions (format: `||variants:Half=150;Full=280`).
- **Cart Manager**: Mobile cart drawer with real-time tax/discount parameters and quantity controls.
- **Real-Time Tracker**: Progress timeline tracking preparation states (Pending &rarr; Accepted &rarr; Preparing &rarr; Ready &rarr; Served).
- **Auto-Removal Timeout**: Settled completed orders automatically clear from active customer view 2 minutes after payment completion.

### 2. Live Order POS Console
- **Loud & Smooth Audio Notifications**: High-volume, smooth oscillator 4-note bell chime sequence synthesized on-device (via Web Audio API) paired with browser **Speech Synthesis (Web Speech API)** to speak incoming tickets ("*New order received from Table 4*"). Sound triggers exclusively when customers place new orders.
- **Kanban Board**: Drag/stage boards separating orders into New Pending, In-Kitchen cooking, and Ready/Serving.
- **Order Editor**: Modifies quantities, items, and comments on orders before final settlements.

### 3. Super Admin SaaS Tenant Manager & Security
- **SaaS Tenant Control**: Manage onboarded restaurants, subscription billing lifecycles (`starter`, `pro_6m`, `pro_1y`), free trial periods, and account statuses (`active`, `trial`, `expired`, `suspended`).
- **1-Click POS Portal Switcher**: Super Admin can switch into any onboarded restaurant's POS dashboard with 1 click to inspect or assist with menu/table setup.
- **Strict Access Security**: Strict client-side and server-side authorization guards (`!currentUser.isSuperAdmin`) block unauthorized users from accessing SaaS controls.
- **Credential Share Modal**: Generates 1-click shareable login credentials for restaurant owners and staff.

### 4. Smart Tables & QR Flyers
- **Capacity Controls**: Edit seating capacity, table name tags, and occupancy status.
- **Instant Export**: Generates table standees and download options for high-quality **PNG** and **PDF print-ready flyers** dynamically using `html2canvas-pro` and `jspdf`.

### 5. Menu & Category Organizer
- **Interactive Sidebar**: Add, edit, delete, and re-order category lists (Shift Up/Down).
- **Dish Configurator**: Toggle stock availability, duplicate items, set discount percentages, and flag bestseller/recommended dishes.
- **Instant Real-Time DB Deletion**: Deleted items are removed from Supabase `food_items` database table and pushed to all open customer screens instantly via WebSockets.

### 6. Settlement Terminal (Billing)
- **Taxes & Receipts**: Automatically calculates subtotals, custom discounts, and GST.
- **Thermal Invoice Generator**: Renders 3-inch POS thermal receipts with browser print and PDF export options.
- **Settle Methods**: Clear tickets using Cash, Card, UPI, or Mobile Wallets.

### 7. Kitchen Display Screen (KDS)
- **Chef Board**: High-contrast, large typography panel displaying items grouped by table.
- **Individual Plating**: Chefs cross off individual items as they cook before marking the entire ticket ready.
- **Timer Alerts**: Highlights delayed tables if cooking exceeds 15 minutes.

### 8. Staff Roles & Reports
- **Role Permissions**: Interface filtering for SaaS Owner, Admin, Store Manager, Cashier, Kitchen Staff, and Waiter.
- **Analytics Dashboard**: Deep charts displaying peak dining hour heat maps, bestselling item distributions, category revenue shares, and weekly revenue trends.

---

## 🎨 Design Language & Animations

- **Monochrome Black & White Theme**: Sleek high-contrast black, white, and charcoal theme with native dark and light mode support across all screens.
- **Gourmet Cloche Loader Animation**: Universal vector SVG animation (`PageLoader.tsx`) depicting a gourmet cloche dome lifting smoothly with rising steam, applied consistently across initial bootstrapping, page routing, and tab transitions.
- **Bypass Browser Caches**: Edge CDN `Cache-Control: no-cache, no-store, must-revalidate` headers (`vercel.json`), HTML meta tags (`index.html`), and a **Network-First** Service Worker strategy (`public/sw.js`) ensure users always view the latest code and live database state.

---

## 🛠️ Technology Stack
- **Frontend**: React (v19), Vite, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Analytics & Graphs**: Recharts.
- **Document Exporter**: jsPDF & html2canvas-pro.
- **QR Engine**: qrcode.react.
- **Database / Backend**: Supabase (PostgreSQL, Realtime WebSockets, Auth).

---

## 🚀 Getting Started

### 1. Installation
Clone the project, navigate to the directory, and install dependencies:
```bash
npm install
```

### 2. Running Locally
Run the development server:
```bash
npm run dev
```

### 3. Production Build
Verify compilation and create the production bundle:
```bash
npm run build
```

---

## ☁️ Supabase Backend Setup Guide

1. Log in to your [Supabase Dashboard](https://supabase.com/).
2. Run the SQL schema from [schema.sql](file:///Users/sahildholpuria/Documents/Digital%20Order%20Management%20for%2520Restaurants/schema.sql) in the Supabase SQL Editor.
3. Configure `.env` with your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
