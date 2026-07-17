# Digital Order Management for Restaurants

A modern, production-ready, and highly aesthetic QR-based self-ordering and POS dashboard system designed for both single-location diners and multi-branch restaurant chains.

Built using **React (latest)**, **Vite**, **TypeScript**, **Tailwind CSS v4**, and **Supabase** (with an intelligent real-time fallback mock engine).

---

## 🌟 Core Features

### 1. Customer Self-Ordering (QR Flow)
- **Zero Friction**: Customers scan a table-specific QR Code (e.g. `/menu/table-3`) and browse menus instantly without login.
- **Dietary & Taste Selectors**: Veg/Non-veg indicators, custom spicy level rankings, and special cooking instruction drawers.
- **Multi-Language Selector**: High-fidelity translation switcher (English & Hindi) covering the entire customer interface.
- **Portion Selection (Half/Full)**: Support for custom portion variants (e.g. `Half` or `Full` sizes with independent pricing) encoded directly into dish descriptions (using format: `||variants:Half=150;Full=280`).
- **Cart Manager**: Slick slide-up mobile cart drawer with real-time tax/discount parameters and quantity controls.
- **Real-Time Tracker**: Progress timeline tracking preparation states (Pending &rarr; Accepted &rarr; Preparing &rarr; Ready &rarr; Served).
- **Auto-Removal Timeout**: Settled completed orders are automatically hidden from the active customer view exactly **2 minutes** after payment completion, keeping the screen clean for next guests.

### 2. Live Order POS Console
- **Loud & Smooth Audio Notifications**: High-volume, smooth oscillator 4-note bell chime sequence synthesized on-device (via Web Audio API) paired with browser **Speech Synthesis (Web Speech API)** to speak incoming tickets ("*New order received from Table 4*").
- **Kanban Board**: Drag/stage boards separating orders into New Pending, In-Kitchen cooking, and Ready/Serving.
- **Order Editor**: Modifies quantities, items, and comments on orders before final settlements.

### 3. Smart Tables & QR Flyers
- **Capacity Controls**: Edit seating capacity, table name tags, and occupancy status.
- **Instant Export**: Generates table standees and download options for high-quality **PNG** and **PDF print-ready flyers** dynamically using `html2canvas-pro` and `jspdf`.

### 4. Menu & Category Organizer
- **Interactive Sidebar**: Add, delete, and re-order category lists (Shift Up/Down).
- **Dish Configurator**: Toggle stock availability, duplicate items, set discount percentages, and flag bestseller/recommended dishes.

### 5. Settlement Terminal (Billing)
- **Taxes & Receipts**: Automatically calculates subtotals, custom discounts, and GST.
- **Thermal Invoice Generator**: Renders beautiful 3-inch POS thermal receipts. Supports printing via browser and downloading as PDF.
- **Settle Methods**: Clear tickets using Cash, Card, UPI, or Mobile Wallets.

### 6. Kitchen Display Screen (KDS)
- **Chef Board**: High-contrast, large typography panel displaying items grouped by table.
- **Individual Plating**: Chefs can cross off individual items as they cook before marking the entire ticket ready.
- **Timer Alerts**: Tickers highlight delayed tables (turning red/flashing if cooking exceeds 15 minutes).

### 7. Staff Roles & Reports
- **Role Permissions**: Visual controls and interface filtering for Admin, Store Manager, Cashier, Kitchen Staff, and Waiter.
- **Analytics Dashboard**: Deep charts displaying peak dining hour heat maps, bestselling item distributions, category revenue shares, and weekly revenue trends.
- **Historical Reports**: Downloadable list of 30-day order history logs in CSV or PDF formats before auto-deletion scheduler runs.
- **Data Export**: Exposes transactional reports downloadable as CSV.

---

## 🛠️ Technology Stack
- **Frontend**: React (v19), Vite, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Analytics & Graphs**: Recharts.
- **Document Exporter**: jsPDF & html2canvas-pro.
- **QR Engine**: qrcode.react.
- **Database / Backend**: Supabase (PostgreSQL, Realtime, Auth).

---

## 🚀 Getting Started

### 1. Installation
Clone the project, navigate to the directory, and install dependencies:
```bash
npm install
```

### 2. Running Locally (Demo Mode)
Run the development server:
```bash
npm run dev
```

> [!TIP]
> **Intelligent Multi-Tab Sync (No Supabase Required)**
> By default, if no Supabase environment keys are provided in `.env`, the app launches in **Real-time Mock Mode**. 
> - Open two browser tabs side-by-side:
>   1. **Tab A (Customer View)**: Go to `http://localhost:5173/menu/table-3` and add items to place an order.
>   2. **Tab B (POS Console)**: Go to `http://localhost:5173/` and click **Staff Dashboard**. Login as any role.
> - When you place an order in Tab A, Tab B will instantly play a notification chime, speak the warning message, and add the order to the Kanban board using HTML5 local storage synchronization!

---

## ☁️ Supabase Backend Setup Guide

To connect the application to a live database for restaurant operations:

### Step 1: Create a Supabase Project
1. Log in to the [Supabase Dashboard](https://supabase.com/).
2. Click **New Project**, choose a name, set a database password, select your region, and click **Create**.

### Step 2: Initialize the Database Schema
1. In your Supabase dashboard sidebar, navigate to the **SQL Editor**.
2. Click **New Query** to create a blank editor.
3. Open the file [schema.sql](file:///Users/sahildholpuria/Documents/Digital%20Order%20Management%20for%2520Restaurants/schema.sql) in this repository, copy the entire SQL script, and paste it into the editor.
4. Click **Run** to execute the script. This creates all tables: `tables`, `categories`, `food_items`, `orders`, `payments`, and `notifications`.

### Step 3: Run Database Rule Modifiers
Run the following commands in the SQL Editor to ensure customer menus can place orders without strict foreign key blocking:
```sql
alter table public.orders drop constraint if exists orders_table_id_fkey;
alter table public.notifications drop constraint if exists notifications_table_id_fkey;
```

### Step 4: Add Environment Variables
1. Go to your Supabase project dashboard and click **Project Settings** (gear icon) -> **API**.
2. Copy the **Project URL** and the **anon (public) API key**.
3. Create a `.env` file in the root of your local project workspace:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-api-key
```
4. Restart your dev server (`npm run dev`) to enable the database integration.

---

## 📦 Vercel Deployment Guide

Deploy the React SPA to Vercel in 3 simple steps:

### Step 1: Import Project to Vercel
1. Push your code repository to GitHub, GitLab, or Bitbucket.
2. Log in to the [Vercel Dashboard](https://vercel.com/) and click **Add New** -> **Project**.
3. Import your code repository.

### Step 2: Configure Environment Keys
Under the **Environment Variables** accordion section of the setup dashboard, add the two keys:
- `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `your-anon-public-api-key`

### Step 3: Deploy & Route Check
1. Click **Deploy**. Vercel will build the Vite assets automatically.
2. The included `vercel.json` file is pre-configured with a rewrite rule to redirect all routes to `index.html` for single-page routing (SPA):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
*This ensures pathnames like `/menu/table-3` resolve correctly when scanned by customer phones.*

---

## 📂 Project Structure
```
/src
  /assets        - Images, audio alerts
  /components    - Generic layouts
  /context       - State Providers (Theme, Restaurant context)
  /pages
    /customer    - Menu, Cart, Order Tracker
    /owner       - POS Dashboard, Tables, Menu, Settlements, Reports, Settings
    /kitchen     - KDS Displays
    /waiter      - Service Requests
    /auth        - Login portal
  /services      - Supabase service, Mock service (fallback)
  /types         - TS type definitions
  /utils         - PDF exports, formatting helpers
```
