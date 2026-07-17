# 🚀 Deployment, Hosting & SaaS Provisioning Guide

This document provides a detailed, step-by-step guide to hosting, deploying, and configuring the **Digital Order Management for Restaurants** multi-tenant SaaS application.

---

## 🏗️ Technical Stack Overview
- **Frontend**: React (TypeScript) + Vite + Tailwind CSS
- **Database & Sync**: Supabase (PostgreSQL with Row Level Security and Real-time replication)
- **PDF Exporter**: jsPDF
- **Hosting**: Vercel (recommended) or Netlify, Cloudflare Pages, Nginx VPS.

---

## 🛠️ Step 1: Database Setup (Supabase SaaS Schema)

The application uses Supabase to handle real-time sync across customer tables, the kitchen display (KDS), waiter consoles, and the cashier POS terminal, backed by strict Row Level Security (RLS) policies.

### 1. Create a Supabase Project
1. Go to [Supabase](https://supabase.com) and sign in.
2. Click **New Project** and select/create an organization.
3. Choose a project name, database password, and region.
4. Wait for the database to finish provisioning (approx. 2 minutes).

### 2. Configure Database Tables, RLS Policies & Procedures
1. In your Supabase dashboard, navigate to the **SQL Editor** tab on the left menu.
2. Click **New query**.
3. Paste the contents of the `schema.sql` file located in the root of this project.
4. Run the query. This sets up all SaaS tables: `restaurants`, `subscriptions`, `users`, `branches`, `tables`, `categories`, `food_items`, `orders`, `payments`, `notifications`, along with RLS helper functions, security policies, and the onboarding transaction procedure.

---

## 🔐 Step 2: Onboarding & Authentication Flow

The system synchronizes staff user profiles with Supabase Auth and workspace states.

### 1. Automated Workspace Onboarding (Super Admin)
To provision a brand new restaurant workspace:
1. Register the restaurant owner as a new user inside your **Supabase Auth** dashboard and copy their User ID (UUID).
2. Go to the SQL Editor or call via RPC the `onboard_new_restaurant` function:
   ```sql
   select public.onboard_new_restaurant(
     'restaurant-slug-id',     -- Unique slug/ID
     'The Grand Bistro',       -- Restaurant Name
     'pro',                    -- Plan ('free', 'starter', 'pro', 'enterprise')
     'owner-supabase-uuid',    -- Auth UUID of the owner
     'Owner Name',             -- Owner's name
     'owner@email.com'         -- Owner's email
   );
   ```
   *This automatically provisions the restaurant, subscriptions metadata, primary branch, owner staff profile, seeds 10 default tables with printable QR configurations, and sets up a default menu category in a single transaction.*

### 2. Staff Profile Synchronization
1. When a new staff user registers or is invited via auth, the database trigger `on_auth_user_created` automatically inserts them into `public.users` mapping to the default restaurant workspace.
2. Managers can manage roles (`owner`, `manager`, `cashier`, `kitchen`, `waiter`) directly in the **Users** setting tab in their workspace.

---

## 🌐 Step 3: Frontend Deployment (Vercel)

### Option A: Deploy via Vercel Dashboard (Recommended)
1. Push your code repository to GitHub, GitLab, or Bitbucket.
2. Log in to [Vercel](https://vercel.com).
3. Click **Add New** -> **Project** and import your repository.
4. Configure the following **Environment Variables**:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (found in Project Settings -> API).
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public API Key (found in Project Settings -> API).
5. Click **Deploy**. Vercel will automatically build (`npm run build`) and provision a production URL.

### Option B: Deploy via Vercel CLI
If you have Vercel CLI installed locally, run:
```bash
npm run build
npx vercel --prod --yes
```

---

## 🌐 Step 4: Self-Hosting on a Linux VPS (Nginx)

If you wish to host this application on your own virtual private server (e.g., AWS EC2, DigitalOcean Droplet, Linode, Hostinger VPS) using Nginx, follow these steps:

### 1. Build the Production Files Locally or on the VPS
Ensure you have the production environment variables configured. Run:
```bash
npm install
npm run build
```
This will compile the TypeScript code and generate a static production folder called `/dist` in your project root.

### 2. Install Nginx on your VPS
Log into your server via SSH and run:
```bash
sudo apt update
sudo apt install nginx -y
```

### 3. Upload Production Files
Copy the contents of the local `/dist` folder to your server's web root directory (usually `/var/www/html` or a custom directory like `/var/www/restaurant-pos`):
```bash
# Uploading via SCP from your local machine
scp -r ./dist/* username@your-server-ip:/var/www/html/
```

### 4. Configure Nginx Server Block (Handling Client-Side Routing)
Create or edit your site's Nginx configuration file (e.g., `/etc/nginx/sites-available/default`):
```bash
sudo nano /etc/nginx/sites-available/default
```

Update the configuration to configure the static file directory and ensure that **React Router client-side routing** falls back to `index.html`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/html;
    index index.html;

    # Support React Client-side Router redirection
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets for better performance
    location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc)$ {
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

### 5. Setup SSL (HTTPS) with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
Follow the prompts to enable automatic HTTPS redirection.

---

## 📁 Step 5: Hosting on Shared Hosting (cPanel / Hostinger)

If you are uploading to a traditional cPanel or shared hosting service:

1. Run `npm run build` on your local machine.
2. Compress the contents of the `/dist` folder into a `.zip` file.
3. Log into your hosting provider's File Manager and upload the zip to your target folder (e.g., `public_html` for your primary domain).
4. Extract the zip file in that folder.
5. Create or append to a `.htaccess` file in that folder to ensure React Router client-side routes work when refreshed:
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

## 🖥️ Step 6: Local Setup & Verification

To run and verify the codebase locally:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Configuration**:
   Create a `.env` file in the root directory (using `.env.example` as a template):
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Verify Production Bundle**:
   Ensure compilation succeeds before deployment:
   ```bash
   npm run build
   ```
