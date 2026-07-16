# 🚀 Deployment & Hosting Guide

This document provides a detailed, step-by-step guide to hosting, deploying, and configuring the **Digital Order Management for Restaurants** SaaS application.

---

## 🏗️ Technical Stack Overview
- **Frontend**: React (TypeScript) + Vite + Tailwind CSS
- **Database & Sync**: Supabase (PostgreSQL with Real-time replication)
- **PDF Exporter**: jsPDF
- **Hosting**: Vercel (recommended) or Netlify, Cloudflare Pages, Nginx.

---

## 🛠️ Step 1: Database Setup (Supabase)

The application uses Supabase to handle real-time sync across customer tables, the kitchen display (KDS), waiter consoles, and the cashier POS terminal.

### 1. Create a Supabase Project
1. Go to [Supabase](https://supabase.com) and sign in.
2. Click **New Project** and select/create an organization.
3. Choose a project name, database password, and region.
4. Wait for the database to finish provisioning (approx. 2 minutes).

### 2. Configure Database Tables & Policies
1. In your Supabase dashboard, navigate to the **SQL Editor** tab on the left menu.
2. Click **New query**.
3. Paste the contents of the `schema.sql` file located in the root of this project.
4. Run the query. This sets up all tables, triggers, and Row Level Security (RLS) policies.

### ⚠️ 3. Crucial Step: Drop Foreign Key Constraints
If you allow dynamic tables, drop foreign key constraints on `table_id` fields to prevent order/notification insertions from failing when tables are deleted or restructured.
Run the following SQL in the SQL Editor:
```sql
alter table public.orders drop constraint if exists orders_table_id_fkey;
alter table public.notifications drop constraint if exists notifications_table_id_fkey;
```

---

## 🔐 Step 2: Authentication & Staff Sign Up

The system synchronizes staff user profiles with Supabase Auth.
1. When a user registers via Supabase Auth (Sign Up), the `on_auth_user_created` trigger in `schema.sql` automatically populates the `public.users` profile table.
2. By default, the first user created is assigned the `'admin'` role.
3. You can manage roles (`admin`, `manager`, `cashier`, `kitchen`, `waiter`) directly in the `public.users` table within the **Table Editor** on Supabase.

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

## 🖥️ Step 4: Local Setup & Verification

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

---

## 🧹 Step 5: Data Retention & Cleanup Policies
- **Order History Pruning**: The application contains a built-in background cleaner (`cleanupExpiredOrders` in `database.ts`). Upon dashboard login, any completed orders older than **30 days** are permanently deleted from the database.
- **Completed Orders Removal**: Completed orders automatically fade out of the customer's active menu page (`CustomerMenu.tsx`) after **2 minutes** via dynamic `localStorage` tracking.
