# 🚀 Complete Deployment & Production Hosting Guide

This document provides a complete, step-by-step production deployment guide for **Digital Order Management for Restaurants (RestaurantsOS)** across all major hosting platforms (**Vercel**, **Netlify**, **Linux VPS / Nginx**, **Cloudflare Pages**, and **cPanel Shared Hosting**), along with full database and storage setup steps.

---

## 📋 Table of Contents
1. [Pre-Deployment Requirements & Environment Variables](#1-pre-deployment-requirements--environment-variables)
2. [Step-by-Step Supabase Database & Storage Setup](#2-step-by-step-supabase-database--storage-setup)
3. [Deploying to Vercel (Recommended)](#3-deploying-to-vercel-recommended)
4. [Deploying to Netlify](#4-deploying-to-netlify)
5. [Deploying to Linux VPS (Nginx + SSL Certbot)](#5-deploying-to-linux-vps-nginx--ssl-certbot)
6. [Deploying to Cloudflare Pages](#6-deploying-to-cloudflare-pages)
7. [Deploying to cPanel / Shared Hosting](#7-deploying-to-cpanel--shared-hosting)
8. [Post-Deployment Verification & Maintenance](#8-post-deployment-verification--maintenance)

---

## 1. Pre-Deployment Requirements & Environment Variables

### System Requirements
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm v9+
- **Git**: Installed locally for version control

### Required Environment Variables
Create a `.env` file (or set these inside your hosting platform's Environment Variables panel):

```env
# Supabase Project URL (found in Supabase -> Project Settings -> API)
VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co

# Supabase Anonymous Public API Key
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Step-by-Step Supabase Database & Storage Setup

### Step 2.1: Create a Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/).
2. Click **New Project**, choose an organization name, project name, database password, and region.
3. Wait approximately 2 minutes for database provisioning to complete.

### Step 2.2: Execute Database Schema
1. In your Supabase project dashboard, navigate to the **SQL Editor** tab on the left sidebar.
2. Click **New Query**.
3. Open [schema.sql](file:///Users/sahildholpuria/Documents/Digital%20Order%20Management%20for%2520Restaurants/schema.sql) from the repository root, copy the entire SQL content, and paste it into the editor.
4. Click **Run**. This creates all essential tables:
   - `restaurants`
   - `users`
   - `tables`
   - `categories`
   - `food_items`
   - `orders`
   - `payments`
   - `notifications`

### Step 2.3: Drop Foreign Key Constraints (Required for Dynamic Tables)
Run the following SQL snippet in the SQL Editor to ensure orders and notifications can be created smoothly when table IDs change:

```sql
alter table public.orders drop constraint if exists orders_table_id_fkey;
alter table public.notifications drop constraint if exists notifications_table_id_fkey;
```

### Step 2.4: Storage Bucket Setup (For Food Images)
1. Navigate to **Storage** in your Supabase dashboard menu.
2. Click **New Bucket**.
3. Set Bucket Name: `food-images`.
4. Toggle **Public Bucket** to **ON** (so food item images can be viewed publicly by customers).
5. Click **Save**.

### Step 2.5: Initial Super Admin Profile Creation
To grant a specific account Super Admin privileges, run this query in SQL Editor (replace with your email):

```sql
update public.users 
set is_super_admin = true, role = 'admin' 
where email = 'your-email@restaurant.com';
```

---

## 3. Deploying to Vercel (Recommended)

### Option A: Vercel Dashboard (Zero-Config GUI)
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Log in to [Vercel](https://vercel.com).
3. Click **Add New** &rarr; **Project** and import your repository.
4. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
6. Click **Deploy**.

### Option B: Vercel CLI (Command Line)
```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Build local bundle
npm run build

# 3. Deploy to production
vercel --prod
```

> [!NOTE]
> The project includes `vercel.json` which automatically configures SPA routing and `no-cache` edge headers so users always receive fresh code and live data.

---

## 4. Deploying to Netlify

### Step-by-Step Netlify Deployment
1. Log in to [Netlify](https://netlify.com).
2. Click **Add new site** &rarr; **Import an existing project**.
3. Select your Git provider and select the repository.
4. Build Settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Environment Variables:
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. Add `public/_redirects` file for React SPA routing:
   ```text
   /*    /index.html   200
   ```
7. Click **Deploy site**.

---

## 5. Deploying to Linux VPS (Nginx + SSL Certbot)

### Step 5.1: Prepare Server & Node.js
Connect to your Linux server (Ubuntu 22.04 LTS / Debian) via SSH:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl git nginx -y

# Install Node.js v18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 5.2: Clone & Build Project
```bash
cd /var/www
sudo git clone https://github.com/your-username/your-repo.git restaurant-pos
cd restaurant-pos

# Create production .env file
sudo nano .env
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Install & compile
sudo npm install
sudo npm run build
```

### Step 5.3: Configure Nginx Server Block
Edit the Nginx site configuration file:

```bash
sudo nano /etc/nginx/sites-available/restaurant-pos
```

Paste the following Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/restaurant-pos/dist;
    index index.html;

    # Bypass browser caching for live data HTML
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
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

Enable the configuration and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/restaurant-pos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5.4: Install Free SSL Certificate (Let's Encrypt Certbot)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 6. Deploying to Cloudflare Pages

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
2. Click **Create Application** &rarr; **Pages** &rarr; **Connect to Git**.
3. Select your repository.
4. Build Settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Save and Deploy**.

---

## 7. Deploying to cPanel / Shared Hosting

1. **Build Production Files Locally**:
   ```bash
   npm run build
   ```
2. **Compress Output**:
   Go into the `dist/` folder, select all files inside, and compress them into a `build.zip` file.
3. **Upload to Hosting**:
   - Log into cPanel File Manager.
   - Navigate to `public_html/` (or your subdomain folder).
   - Upload `build.zip` and extract its contents directly in `public_html/`.
4. **Create `.htaccess` File for React SPA Routing**:
   Create a `.htaccess` file inside `public_html/` with the following content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(html|htm)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
```

---

## 8. Post-Deployment Verification & Maintenance

### Post-Deployment Checklist
- [ ] **Customer QR Menu**: Open `https://your-domain.com/menu/table-1` and verify live menu items load cleanly.
- [ ] **Instant Real-Time Sync**: Open POS in Tab 1 and Customer Menu in Tab 2. Add/edit/delete a food item in POS to confirm Tab 2 updates instantly.
- [ ] **Order Placement**: Place a test order from customer view and confirm POS receives audio chime & voice notification.
- [ ] **Super Admin Panel**: Login to `https://your-domain.com/#superadmin` to verify SaaS tenant controls.
- [ ] **PWA & Cache Control**: Verify browser inspect network tab shows `Cache-Control: no-cache, no-store, must-revalidate` for `index.html`.

### Maintenance Commands
```bash
# Verify build clean status
npm run build

# Clear local cache & node_modules if needed
rm -rf node_modules dist
npm install
```
