# Restaurant Order Management System (SaaS)

A modern, production-ready, and highly aesthetic Multi-Tenant QR-based self-ordering and POS dashboard system designed to securely isolate and scale to thousands of restaurant workspaces.

Built using **React (latest)**, **Vite**, **TypeScript**, **Tailwind CSS v4**, and **Supabase** (with PostgreSQL Row Level Security for bulletproof tenant isolation).

---

## 🌟 Core Features

### 1. Multi-Tenant SaaS Workspace Isolation
- **Secure Tenants**: Each restaurant is a separate tenant with its own workspace. Tables, categories, menu items, orders, payments, and users are isolated using Supabase RLS.
- **Workspace Switcher**: Users owning or managing multiple restaurants can hop between their workspaces instantly from the sidebar header.
- **Subscription Guards**: Real-time enforcement checks freeze order-taking capabilities when plans expire while preserving historic data and reports.
- **Automated Onboarding**: Provision a restaurant workspace, General settings, Main branch, initial categories, and 10 default tables with printable QR flyers in a single transaction using the SQL onboarding RPC trigger.

### 2. Customer Self-Ordering (QR Flow)
- **Zero Friction**: Customers scan a table-specific QR Code (e.g. `/menu/table-3`) and browse menus instantly without login.
- **Dietary & Taste Selectors**: Veg/Non-veg indicators, custom spicy level rankings, and special cooking instruction drawers.
- **Cart Manager**: Slick slide-up mobile cart drawer with real-time tax/discount parameters and quantity controls.
- **Real-Time Tracker**: Progress timeline tracking preparation states (Pending &rarr; Accepted &rarr; Preparing &rarr; Ready &rarr; Served) using real-time sync.

### 3. Live Order POS Console
- **Kitchen Notifications**: Plays chime audio and uses browser **Speech Synthesis (Web Speech API)** to speak incoming tickets ("*New order received from Table 4*").
- **Kanban Board**: Drag/stage boards separating orders into New Pending, In-Kitchen cooking, and Ready/Serving.
- **Order Editor**: Modifies quantities, items, and comments on orders before final settlements.

### 4. Smart Tables & QR Flyers
- **Capacity Controls**: Edit seating capacity, table name tags, and occupancy status.
- **Instant Export**: Generates table standees and download options for high-quality **PNG** and **PDF print-ready flyers** dynamically using `html2canvas-pro` and `jspdf`.

### 5. Settlement Terminal (Billing)
- **Taxes & Receipts**: Automatically calculates subtotals, custom discounts, and GST.
- **Thermal Invoice Generator**: Renders beautiful 3-inch POS thermal receipts. Supports printing via browser and downloading as PDF.
- **Settle Methods**: Clear tickets using Cash, Card, UPI, or Mobile Wallets.

### 6. Kitchen Display Screen (KDS)
- **Chef Board**: High-contrast, large typography panel displaying items grouped by table.
- **Individual Plating**: Chefs can cross off individual items as they cook before marking the entire ticket ready.
- **Timer Alerts**: Tickers highlight delayed tables (turning red/flashing if cooking exceeds 15 minutes).

### 7. Super Admin & Staff Roles
- **Super Admin Portal**: Manage SaaS subscriptions, monitor estimated MRR, platform health, and easily onboard new restaurant workspaces.
- **Role Permissions**: Visual controls and interface filtering for Admin, Store Manager, Cashier, Kitchen Staff, and Waiter.

---

## 🛠️ Technology Stack
- **Frontend**: React (v19), Vite, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Analytics & Graphs**: Recharts.
- **Document Exporter**: jsPDF & html2canvas-pro.
- **QR Engine**: qrcode.react.
- **Database / Backend**: Supabase (PostgreSQL, Realtime replication, Auth).

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

---

## ☁️ Supabase Backend Setup Guide

To connect the application to a live database:

### Step 1: Create a Supabase Project
1. Log in to the [Supabase Dashboard](https://supabase.com/).
2. Click **New Project**, choose a name, set a database password, select your region, and click **Create**.

### Step 2: Initialize the Database Schema
1. In your Supabase dashboard sidebar, navigate to the **SQL Editor**.
2. Click **New Query** to create a blank editor.
3. Open the file [schema.sql](file:///Users/sahildholpuria/Documents/Digital%20Order%20Management%20for%2520Restaurants/schema.sql) in this repository, copy the entire SQL script, and paste it into the editor.
4. Click **Run** to execute the script. This creates all tables: `restaurants`, `subscriptions`, `users`, `branches`, `tables`, `categories`, `food_items`, `orders`, `payments`, and `notifications`, along with RLS helper functions and row-level policies.

### Step 3: Add Environment Variables
1. Go to your Supabase project dashboard and click **Project Settings** (gear icon) -> **API**.
2. Copy the **Project URL** and the **anon (public) API key**.
3. Create a `.env` file in the root of your local project workspace:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-api-key
```
4. Restart your dev server (`npm run dev`) to enable the database integration.

---

## 📂 Project Structure
```
/src
  /assets        - Images, audio alerts
  /components    - Workspace switcher, subscription guards
  /context       - State Providers (Theme, Restaurant context, Workspace context)
  /pages
    /super-admin - SaaS workspace monitoring and onboarding dashboard
    /customer    - Menu, Cart, Order Tracker
    /owner       - POS Dashboard, Tables, Menu, Settlements, Reports, Settings
    /kitchen     - KDS Displays
    /waiter      - Service Requests
    /auth        - Login portal
  /services      - Supabase service, Mock service (fallback)
  /types         - TS type definitions
  /utils         - PDF exports, formatting helpers
```
