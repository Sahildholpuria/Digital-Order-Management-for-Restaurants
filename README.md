# Digital Order Management for Restaurants (Multi-Tenant SaaS)

A modern, production-ready, and highly aesthetic Multi-Tenant SaaS Operating System designed for restaurants. It provides completely isolated workspace environments for each restaurant tenant while preserving all rich POS dashboard, KDS display, and table QR-code menu functionalities.

Built using **React (latest)**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Supabase** (with an intelligent real-time fallback mock engine).

---

## 🌟 SaaS Platform Architecture

```
                                    +------------------------------+
                                    |     Super Admin Platform     |
                                    |   (Tiers, Stats, Owners)     |
                                    +--------------+---------------+
                                                   |
                                                   v
+------------------+                +--------------+---------------+                +------------------+
|  Pizza Hub (WS)  | <------------> |  SaaS Multi-Tenant Database  | <------------> | Burger Joint(WS) |
|  Orders, Billing |  Isolated via  | (Tables, Categories, Orders) |  Isolated via  |  Orders, Billing |
|  Staff, settings |  RLS Policy    |   Enforced by restaurant_id  |  RLS Policy    |  Staff, settings |
+------------------+                +------------------------------+                +------------------+
```

---

## 🚀 Core Features

### 1. Robust Tenant Workspace Isolation (RLS)
- **Zero Leakage**: Row Level Security (RLS) is enabled across all tables. All rows are bound to a `restaurant_id UUID`.
- **Isolation Enforcement**: The Supabase database automatically filters read, update, delete, and insert operations to ensure users can only interact with rows belonging to their active restaurant workspace.
- **Super Admin Bypass**: Platform administrators can access all workspaces for support purposes through custom bypass checks.

### 2. Multi-Workspace Switcher
- Owners and managers associated with multiple restaurant brands (e.g., Pizza Hub, Burger House, Coffee Lab) can switch portals instantly via a dropdown switcher in the sidebar without re-authenticating.
- Switching workspaces dynamically re-subscribes to all real-time order, notification, and table updates.

### 3. Master Super Admin Control Panel
- Accessible only to authorized system administrators.
- Monitor platform revenue (Starter plan at ₹3,999/mo, Pro plan at ₹11,999/6 mo), active subscriptions, storage use, and platform order traffic.
- Onboard new restaurants, configure owner accounts, suspend/activate workspaces, upgrade plan tiers, and trigger owner password resets.

### 4. Automated Restaurant Onboarding
- When the Super Admin registers a workspace, a database transaction is triggered to automatically provision:
  - Default restaurantsettings.
  - A Professional trial subscription.
  - Initial menu categories (Starters, Mains, Desserts).
  - Sample menu items and default tables (generating table-specific codes).

### 5. Plan Cap Restrictions
- **Starter Plan**: Caps table creations at 5 tables and staff members at 3 profiles.
- **Professional Plan**: Caps tables at 25 tables and staff members at 20 profiles.
- **Enterprise Plan**: Custom limits up to 100 tables and 100 staff profiles.
- Exceeding the limits prompts an upgrade subscription alert block.

### 6. Existing Features Preserved
- Customer self-ordering (QR Menu) with veg/non-veg flags, spice levels, and order tracker.
- KDS display with warning timers for chefs.
- POS billing console supporting Cash, Card, UPI, or Wallet payment settlement with thermal receipt print templates.
- Waiter call alarms and billing requests with voice announcers.

---

## 🛠️ Technology Stack
- **Frontend**: React (v19), Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Charts**: Recharts.
- **Documents**: jsPDF & html2canvas-pro.
- **Backend / Sync**: Supabase (Postgres, Realtime replication, Auth).

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Running Locally (Mock SaaS Mode)
```bash
npm run dev
```

> [!TIP]
> **SaaS Mock Mode**
> By default, if no Supabase environment variables are provided in `.env`, the app launches in **Mock SaaS Mode**.
> - Logging in as **Super Admin** (`admin@saasbistro.com`) enters the Master platform control panel.
> - Logging in as **Administrator** (`admin@restaurant.com`) triggers the workspace switcher, letting you manage the mock "The Grand SaaS Bistro" or "Burger & Co" workspaces.
> - Data automatically synchronizes across active tabs using `localStorage` triggers.

---

## 📂 Project Structure
```
/src
  /components    - WorkspaceSwitcher modal overlay
  /context       - Theme context, RestaurantContext (Workspace resolver, Subscription checker)
  /pages
    /customer    - Menu catalog, Cart drawer, Order status timeline
    /owner       - Admin POS, Tables, Menu, Settlements, Analytical Reports, Settings
    /kitchen     - KDS chef boards
    /waiter      - Service call logs
    /auth        - Multi-workspace login portal
    /super-admin - Super Admin platform control panel
  /services      - Supabase service, Database CRUD & SaaS mapping layers
  /types         - Type definitions
```
