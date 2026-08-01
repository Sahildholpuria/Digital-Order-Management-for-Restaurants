# 🚀 Deployment & Hosting Guide

This document provides a step-by-step guide to hosting, deploying, and configuring the **Digital Order Management for Restaurants** SaaS application.

---

## 🏗️ Technical Stack Overview
- **Frontend**: React (v19) + Vite + TypeScript + Tailwind CSS v4
- **Database & Sync**: Supabase (PostgreSQL with Real-time WebSocket replication)
- **PDF & Invoice Exporter**: jsPDF & html2canvas-pro
- **CDN / Hosting**: Vercel (Recommended), Netlify, Cloudflare Pages, or Self-Hosted Nginx.

---

## 🛠️ Step 1: Database Setup (Supabase)

### 1. Create a Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com).
2. Click **New Project**, specify your project name, database password, and select your region.
3. Wait for the PostgreSQL instance to finish provisioning (approx. 2 minutes).

### 2. Initialize Database Schema
1. In your Supabase project dashboard, navigate to the **SQL Editor** tab.
2. Click **New Query**.
3. Open [schema.sql](file:///Users/sahildholpuria/Documents/Digital%20Order%20Management%20for%2520Restaurants/schema.sql), copy the entire SQL script, and paste it into the editor.
4. Click **Run** to execute the schema setup (`restaurants`, `users`, `tables`, `categories`, `food_items`, `orders`, `payments`, `notifications`).

### 3. Foreign Key Constraints Drop
Run the following SQL snippet in the SQL Editor to allow dynamic table management without order deletion blocks:
```sql
alter table public.orders drop constraint if exists orders_table_id_fkey;
alter table public.notifications drop constraint if exists notifications_table_id_fkey;
```

### 4. Multi-Tenant Isolation & Security Rules
- **Multi-Tenant RLS Policies**: Custom Postgres functions (`public.belongs_to_restaurant`, `public.get_user_restaurant`, `public.is_admin`) run with `security definer` privileges to enforce multi-tenant restaurant boundary checks.
- **Super Admin Protection**: `<SuperAdminDashboard />` enforces an explicit authorization guard (`!currentUser.isSuperAdmin`) to block unauthorized users from accessing tenant controls.

---

## ⚡ Step 2: Real-time Sync & Cache Control Setup

### 1. Instant Real-time WebSocket Subscriptions
- Both **POS Staff Consoles** and **Customer QR Menus** open real-time WebSocket subscriptions to `food_items` and `categories`.
- Menu item creations, price edits, stock availability toggles, and deletions propagate **instantly in 0 seconds** to all connected customer screens without requiring page reloads.

### 2. Bypass Stale Browser Caching (`vercel.json`)
To ensure clients always fetch the latest production bundle and live database state:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "Pragma",
          "value": "no-cache"
        },
        {
          "key": "Expires",
          "value": "0"
        }
      ]
    }
  ],
  "rewrites": [
    { "source": "/((?!assets/|favicon.svg|manifest.json|sw.js).*)", "destination": "/index.html" }
  ]
}
```

---

## 🌐 Step 3: Frontend Deployment (Vercel)

### Deploy via Vercel Dashboard (Recommended)
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Log in to [Vercel](https://vercel.com).
3. Click **Add New** -> **Project** and import your repository.
4. Set the following **Environment Variables**:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public API Key.
5. Click **Deploy**. Vercel will run `npm run build` and provision your production deployment.

### Deploy via Vercel CLI
```bash
npm run build
npx vercel --prod --yes
```

---

## 🌐 Step 4: Self-Hosting on Linux VPS (Nginx)

### 1. Compile Production Bundle
```bash
npm install
npm run build
```

### 2. Nginx Server Configuration
Edit your Nginx server block configuration (e.g. `/etc/nginx/sites-available/default`):
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/restaurant-pos/dist;
    index index.html;

    # Always enforce fresh HTML delivery for live data
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri $uri/ /index.html;
    }

    # Static assets with hash names
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    error_page 404 /index.html;
}
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. HTTPS Setup with Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 🧹 Step 5: Data Retention & Cleanup Policies
- **Order History Pruning**: Completed orders older than **30 days** are automatically deleted from the database upon dashboard entry.
- **Completed Customer Orders**: Settled orders clear from customer screens after **2 minutes**.
