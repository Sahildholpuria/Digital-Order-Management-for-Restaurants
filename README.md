# Digital Order Management for Restaurants (RestaurantsOS)

A modern, production-ready, ultra-responsive, and highly aesthetic QR-based self-ordering POS and restaurant management system designed for single-location diners and multi-branch restaurant chains.

Built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4**, **Supabase** (with PostgreSQL, Realtime WebSockets, RLS Policies & LocalStorage fallback engine), and a high-contrast **Monochrome & Emerald Design System**.

---

## 🌟 Core Features & Modules

### 1. Customer Self-Ordering (QR Flow)
- **Zero Friction**: Customers scan a table-specific QR code (e.g. `/menu/table-1`) and browse live menus instantly without registration or login.
- **Instant Real-Time Sync**: Any menu addition, price edit, availability toggle, or item deletion made in POS reflects **instantly in 0 seconds** on customer screens via WebSockets without page refreshes.
- **Mobile-First Responsive UI**: Touch-optimized layout with sticky navigation header, live table badge (`Table #1`), staff action buttons (`Call Waiter`, `Request Bill`, `Live Orders`), search bar, and horizontal swipeable category pills.
- **iOS Safari Viewport Protection**: Inputs locked to `16px` font size with viewport constraint meta tags (`maximum-scale=1.0, shrink-to-fit=no`) to prevent input zoom distortion on iPhones.
- **Portion Selection (Half/Full)**: Supports portion variants with independent pricing encoded cleanly in descriptions (format: `||variants:Half=150;Full=280`).
- **Direct Touch Steppers**: Direct `+ ADD` and `-` `qty` `+` quantity steppers directly on food cards for 1-tap cart additions.
- **Floating Cart Capsule & Live Order Tracker**: Real-time slide-up cart drawer, GST/tax calculations, and progress timeline tracking preparation states (*Pending → Accepted → Preparing → Ready → Served*).

### 2. Multi-Tenant Workspace Isolation
- **100% Strict Workspace Data Isolation**: Every database query, mock storage operation, realtime subscription, and context listener filters strictly by `restaurant_id`.
- **Private WebSocket Channels**: Supabase Realtime channels register listeners with Postgres filters (`filter: 'restaurant_id=eq.' + restaurantId`) so no restaurant can view or intercept another tenant's live orders.
- **Role-Based Row Level Security (RLS)**: PostgreSQL policies on `restaurants`, `users`, `tables`, `categories`, `food_items`, `orders`, `payments`, and `notifications` enforce strict tenant boundaries.

### 3. Commercial Industrial KDS (Kitchen Display System)
- **Urgency Color Tiers**: Color-coded ticket headers based on elapsed time:
  - 🟢 **Emerald Tier** (0–7 mins): Fresh ticket.
  - 🟡 **Amber Tier** (7–15 mins): Cooking in progress.
  - 🔴 **Red Tier** (15+ mins): Delayed / Urgent priority.
- **Stage Filter Tabs**: Quick filtering for *All Tickets*, *In Kitchen*, *Ready*, and *Recall*.
- **Ticket Recall Drawer**: Reopen and reinstate recently bumped or completed kitchen tickets.
- **Individual Plating Checkboxes**: Chefs cross off individual dish items as they are plated.
- **Audio Chime Alerts**: Real-time audio alerts when new orders enter the kitchen.

### 4. Automatic KOT Printing & Live POS Manager
- **Auto-KOT Receipt Print**: Automatically triggers thermal KOT receipt printing (`printKOTReceipt()`) the instant an order is accepted by the manager.
- **Live Sound & Speech Synthesis**: Synthesizes 4-note bell sequence paired with Web Speech API voice alerts ("*New order received from Table 4*").
- **Live Table Filter Dropdown**: Order filters source exclusively from active, non-deleted tables to eliminate deleted ghost tables.
- **Kanban Order Board**: Drag/stage boards separating orders into New Pending, In-Kitchen cooking, and Ready/Serving.

### 5. Super Admin SaaS Dashboard & Tenant Manager
- **SaaS Tenant Control**: Manage onboarded restaurants, subscription billing lifecycles (`starter`, `pro_6m`, `pro_1y`), free trial periods, and account statuses (`active`, `trial`, `expired`, `suspended`).
- **Revenue Analytics & Metrics**: Tracks MRR, total active restaurants, active orders, and plan distributions.
- **1-Click Onboarding & Credentials**: Generates 1-click shareable login credentials for restaurant owners and staff users.

### 6. Table & QR Standee Generator
- **Capacity Controls**: Edit seating capacity, table name tags, and occupancy status.
- **Instant Export**: Generates table standees with high-quality **PNG** and **PDF print-ready flyers** dynamically using `html2canvas-pro` and `jspdf`.

### 7. Settlement Terminal & Analytics
- **Taxes & Receipts**: Automatically calculates subtotals, custom discounts, and GST.
- **Thermal Invoice Generator**: Renders 3-inch POS thermal receipts with browser print and PDF export options.
- **Payment Methods**: Settle tickets using Cash, Card, UPI, or Mobile Wallets.
- **Analytics & Graphs**: Heatmaps for peak dining hours, bestselling item distributions, category revenue shares, and weekly revenue trends using `recharts`.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Database & Realtime**: Supabase (PostgreSQL, Realtime WebSockets, Row Level Security).
- **Charts & Data Visualization**: Recharts.
- **Document Exporter**: jsPDF & html2canvas-pro.
- **QR Engine**: qrcode.react.

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install project dependencies:
```bash
npm install
```

### 2. Running Locally
Launch the development server:
```bash
npm run dev
```

### 3. Production Build
Verify TypeScript compilation and generate the production bundle:
```bash
npm run build
```

---

## ☁️ Supabase Backend Setup Guide

1. Log in to your [Supabase Dashboard](https://supabase.com/).
2. Execute the PostgreSQL schema script from `schema.sql` in the Supabase SQL Editor.
3. Configure `.env` with your project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

---

## 🌿 Branching & Release Strategy

This repository strictly follows industrial deployment environments:
- **`development`**: Daily features, fixes, and updates are committed here first.
- **`qa`**: Changes are verified with `npm run build` (0 errors) and merged to `qa` for verification.
- **`beta` / `main`**: Staging and production release branches.
