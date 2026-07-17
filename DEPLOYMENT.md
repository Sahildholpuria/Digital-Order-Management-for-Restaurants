# 🚀 SaaS Platform Deployment & Configuration Guide

This document details the configuration and deployment setup for the **Digital Order Management for Restaurants** Multi-Tenant SaaS application.

---

## 🏗️ Technical Architecture
- **Frontend SPA**: React (TypeScript) + Vite + Tailwind CSS
- **Database & Sync**: Supabase (PostgreSQL with RLS & Real-time replication)
- **Hosting Platforms**: Vercel (preferred for SPA), Nginx VPS, or cPanel.

---

## 🛠️ Step 1: Multi-Tenant Database Setup (Supabase)

Supabase handles tenant workspaces, user authentication, subscription rules, and real-time syncing across POS terminals, kitchen display boards, and customer menus.

### 1. Create a Supabase Project
1. Log in to the [Supabase Console](https://supabase.com).
2. Click **New Project** and select your organization.
3. Choose a name, set your database master password, select your region, and click **Create**.

### 2. Execute database Schema Migrations
1. Navigate to the **SQL Editor** tab on the left sidebar menu of your Supabase dashboard.
2. Click **New query**.
3. Open the file [schema.sql](file:///Users/sahildholpuria/Documents/Digital%20Order%20Management%20for%2520Restaurants/schema.sql) in this repository, copy the entire SQL script, and paste it into the editor.
4. Click **Run**. This establishes:
   - All tenant-specific tables: `restaurants`, `restaurant_settings`, `restaurant_users`, `tables`, `menu_categories`, `menu_items`, `orders`, `order_items`, `payments`, `notifications`, `inventory`, `activity_logs`, and `super_admins`.
   - Security helper functions: `public.is_super_admin()`, `public.belongs_to_restaurant()`, and `public.get_user_restaurant()`.
   - **Row Level Security (RLS)** policy flags restricting staff to their matching `restaurant_id`.
   - An automatic auth trigger `on_auth_user_created` that maps signup logins to staff profiles.
   - The onboarding function `public.onboard_new_restaurant()` which populates defaults upon restaurant deployment.

### 3. Assign a Super Admin User
To gain access to the master control panel `/super-admin`, you must register your user ID in the `super_admins` table:
1. Navigate to the **SQL Editor** in Supabase and run:
   ```sql
   insert into public.super_admins (id, email)
   values ('your-authenticated-user-uuid', 'admin@saasbistro.com');
   ```
   *(Retrieve the UUID from the Supabase Auth -> Users tab after your first login).*

---

## 🌐 Step 2: Frontend Deployment (Vercel)

### Option A: Deploy via Vercel Dashboard (Recommended)
1. Push your code repository to GitHub, GitLab, or Bitbucket.
2. Log in to the [Vercel Dashboard](https://vercel.com).
3. Click **Add New** -> **Project** and import your repository.
4. Configure the following **Environment Variables**:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (found in Project Settings -> API).
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public API Key (found in Project Settings -> API).
5. Click **Deploy**. Vercel will automatically build (`npm run build`) and provision a production URL.

---

## 🌐 Step 3: Self-Hosting on Nginx VPS (Ubuntu/Debian)

If you are hosting this application on your own Linux virtual private server (e.g., AWS EC2, DigitalOcean, Linode):

### 1. Build Production Files
Install dependencies and build the static assets locally or on your server:
```bash
npm install
npm run build
```
This generates the compiled web directory in `/dist`.

### 2. Install Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

### 3. Upload Production Directory
Copy the contents of the `/dist` directory to your Nginx root:
```bash
scp -r ./dist/* username@your-server-ip:/var/www/html/
```

### 4. Configure Nginx Server Block (SPA Redirects)
Open your Nginx site configuration file (e.g., `/etc/nginx/sites-available/default`):
```bash
sudo nano /etc/nginx/sites-available/default
```

Update it to ensure React Router client-side routing redirects properly back to `index.html`:
```nginx
server {
    listen 80;
    server_name your-saas-domain.com;

    root /var/www/html;
    index index.html;

    # Support SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset caching
    location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|svg|mp4|ogg|webm)$ {
        expires 1M;
        access_log off;
        add_header Cache-Control "public";
    }

    error_page 404 /index.html;
}
```

Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Install Let's Encrypt SSL
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-saas-domain.com
```

---

## 🌐 Step 4: Shared Web Hosting (cPanel)

If uploading to standard cPanel shared hosting:
1. Build the production package locally: `npm run build`.
2. Zip all files *inside* the `/dist` folder (do not zip the folder itself).
3. Upload the zip to your file manager (`public_html` or a subdomain folder) and extract it.
4. Add the following rule inside a `.htaccess` file in that folder to support SPA routing:
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
   ```
