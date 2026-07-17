-- ====================================================
-- RESTAURANT ORDER MANAGEMENT SYSTEM - SUPABASE SCHEMA
-- Copy and run this script in your Supabase SQL Editor
-- ====================================================

-- 1. CREATE TABLES

-- Restaurants (Tenants Settings)
create table public.restaurants (
  id text primary key,
  name text not null,
  address text,
  phone text,
  email text,
  logo_url text,
  gst_number text,
  tax_percentage numeric default 18,
  currency text default '₹',
  opening_hours text,
  closing_hours text,
  theme_color text default '#6366F1',
  status text check (status in ('active', 'suspended', 'trial')) default 'trial' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subscriptions
create table public.subscriptions (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  plan text check (plan in ('free', 'starter', 'pro', 'enterprise')) default 'free' not null,
  status text check (status in ('active', 'past_due', 'unpaid', 'cancelled')) default 'active' not null,
  expiry_date timestamp with time zone not null,
  max_tables integer default 5 not null,
  max_staff integer default 2 not null,
  max_orders integer default 500 not null,
  storage_limit_mb integer default 100 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Staff Profiles (Linked to Supabase Auth UUID)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  accessible_restaurants text[] default '{}'::text[] not null, -- Array of tenant IDs this user can access
  active_restaurant_id text references public.restaurants(id) on delete set null, -- Active workspace
  name text not null,
  email text not null,
  role text check (role in ('super_admin', 'owner', 'manager', 'cashier', 'kitchen', 'waiter')) not null,
  status text check (status in ('active', 'inactive')) default 'active' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Restaurant Branches
create table public.branches (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  name text not null,
  address text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dining Tables
create table public.tables (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  branch_id text references public.branches(id) on delete cascade,
  number text not null,
  capacity integer default 4,
  status text check (status in ('available', 'occupied', 'reserved')) default 'available' not null,
  qr_code_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Menu Categories
create table public.categories (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  branch_id text references public.branches(id) on delete cascade,
  name text not null,
  "order" integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Food Items
create table public.food_items (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  branch_id text references public.branches(id) on delete cascade,
  category_id text references public.categories(id) on delete cascade not null,
  name text not null,
  image text,
  description text,
  price numeric not null,
  is_veg boolean default true not null,
  preparation_time integer default 10 not null,
  is_available boolean default true not null,
  is_popular boolean default false not null,
  is_recommended boolean default false not null,
  spicy_level integer default 0 not null,
  discount_percentage numeric default 0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Orders
create table public.orders (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  branch_id text references public.branches(id) on delete cascade,
  order_number text not null,
  table_id text,
  table_name text not null,
  items jsonb not null, -- Array of OrderItem
  subtotal numeric not null,
  tax numeric not null,
  discount numeric default 0 not null,
  grand_total numeric not null,
  status text check (status in ('pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  elapsed_time_start timestamp with time zone default timezone('utc'::text, now()) not null,
  waiter_id uuid,
  feedback jsonb
);

-- Payments Log
create table public.payments (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  branch_id text references public.branches(id) on delete cascade,
  order_id text references public.orders(id) on delete set null,
  order_number text not null,
  table_name text not null,
  subtotal numeric not null,
  tax numeric not null,
  discount numeric default 0 not null,
  grand_total numeric not null,
  payment_method text check (payment_method in ('cash', 'upi', 'card', 'wallet')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications
create table public.notifications (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  branch_id text references public.branches(id) on delete cascade,
  type text check (type in ('new_order', 'call_waiter', 'request_bill')) not null,
  table_id text,
  table_name text not null,
  order_id text,
  message text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. ENABLE REALTIME SYNC FOR APP TABLES
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.food_items;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.notifications;

-- 3. INSERT DEMO TENANT CONFIG
insert into public.restaurants (id, name, theme_color, status)
values ('demo-restaurant', 'The Grand Bistro', '#6366F1', 'active')
on conflict (id) do nothing;

insert into public.subscriptions (id, restaurant_id, plan, expiry_date, max_tables, max_staff, max_orders)
values ('sub-demo', 'demo-restaurant', 'pro', now() + interval '12 months', 100, 20, 100000)
on conflict (id) do nothing;

-- 4. PROFILE SYNC TRIGGER (Auth signups)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, restaurant_id, accessible_restaurants, active_restaurant_id, name, email, role, status)
  values (
    new.id,
    'demo-restaurant',
    array['demo-restaurant'],
    'demo-restaurant',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'owner', -- default first user role
    'active'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.restaurants enable row level security;
alter table public.subscriptions enable row level security;
alter table public.users enable row level security;
alter table public.branches enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.food_items enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

-- Helper: Check if user is Super Admin
create or replace function public.is_super_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = user_id and role = 'super_admin'
  );
end;
$$ language plpgsql security definer;

-- Helper: Get active tenant id for a staff user
create or replace function public.get_active_tenant(user_id uuid)
returns text as $$
begin
  return (select active_restaurant_id from public.users where id = user_id);
end;
$$ language plpgsql security definer;

-- Helper: Check if user belongs to a specific restaurant tenant
create or replace function public.belongs_to_tenant(user_id uuid, tenant_id text)
returns boolean as $$
begin
  return tenant_id = any(
    select accessible_restaurants from public.users where id = user_id
  );
end;
$$ language plpgsql security definer;

-- Policies for public menus & table layouts
create policy "Allow public read for settings" on public.restaurants for select using (true);
create policy "Allow admin write for settings" on public.restaurants for all using (
  public.is_super_admin(auth.uid()) or (public.get_active_tenant(auth.uid()) = id)
);

create policy "Allow tenant subscription access" on public.subscriptions for all using (
  public.is_super_admin(auth.uid()) or (public.get_active_tenant(auth.uid()) = restaurant_id)
);

create policy "Allow public read for tables" on public.tables for select using (true);
create policy "Allow staff write for tables" on public.tables for all using (
  public.is_super_admin(auth.uid()) or (public.get_active_tenant(auth.uid()) = restaurant_id)
);

create policy "Allow public read for categories" on public.categories for select using (true);
create policy "Allow manager write for categories" on public.categories for all using (
  public.is_super_admin(auth.uid()) or 
  (public.get_active_tenant(auth.uid()) = restaurant_id and exists (
    select 1 from public.users where id = auth.uid() and role in ('owner', 'manager')
  ))
);

create policy "Allow public read for items" on public.food_items for select using (true);
create policy "Allow manager write for items" on public.food_items for all using (
  public.is_super_admin(auth.uid()) or 
  (public.get_active_tenant(auth.uid()) = restaurant_id and exists (
    select 1 from public.users where id = auth.uid() and role in ('owner', 'manager')
  ))
);

-- Policies for orders (public creates, staff updates)
create policy "Allow public order creation" on public.orders for insert with check (true);
create policy "Allow public order reading" on public.orders for select using (true);
create policy "Allow staff updates for orders" on public.orders for update using (
  public.is_super_admin(auth.uid()) or (public.get_active_tenant(auth.uid()) = restaurant_id)
);
create policy "Allow admin deletions for orders" on public.orders for delete using (
  public.is_super_admin(auth.uid()) or 
  (public.get_active_tenant(auth.uid()) = restaurant_id and exists (
    select 1 from public.users where id = auth.uid() and role in ('owner', 'manager')
  ))
);

-- Policies for payments
create policy "Allow staff billing settlements" on public.payments for all using (
  public.is_super_admin(auth.uid()) or 
  (public.get_active_tenant(auth.uid()) = restaurant_id and exists (
    select 1 from public.users where id = auth.uid() and role in ('owner', 'manager', 'cashier')
  ))
);

-- Policies for notifications (public inserts, staff resolves)
create policy "Allow public service call insertions" on public.notifications for insert with check (true);
create policy "Allow staff service call lookups" on public.notifications for all using (
  public.is_super_admin(auth.uid()) or (public.get_active_tenant(auth.uid()) = restaurant_id)
);

-- Policies for user profiles
create policy "Allow coworkers to read profiles" on public.users for select using (
  public.is_super_admin(auth.uid()) or (public.get_active_tenant(auth.uid()) = restaurant_id)
);
create policy "Allow owner write for profiles" on public.users for all using (
  public.is_super_admin(auth.uid()) or 
  (public.get_active_tenant(auth.uid()) = restaurant_id and exists (
    select 1 from public.users where id = auth.uid() and role = 'owner'
  ))
);

-- ====================================================
-- ONBOARDING RPC PROCEDURE
-- ====================================================
create or replace function public.onboard_new_restaurant(
  p_restaurant_id text,
  p_restaurant_name text,
  p_plan text,
  p_owner_uuid uuid,
  p_owner_name text,
  p_owner_email text
)
returns json as $$
declare
  v_branch_id text;
begin
  v_branch_id := 'branch-' || p_restaurant_id;

  -- 1. Create Restaurant Workspace Entry
  insert into public.restaurants (id, name, status)
  values (p_restaurant_id, p_restaurant_name, 'active');

  -- 2. Create Subscription Plan
  insert into public.subscriptions (id, restaurant_id, plan, expiry_date, max_tables, max_staff, max_orders)
  values (
    'sub-' || p_restaurant_id,
    p_restaurant_id, 
    p_plan, 
    now() + interval '6 months',
    case when p_plan = 'free' then 5 when p_plan = 'starter' then 15 else 100 end,
    case when p_plan = 'free' then 2 when p_plan = 'starter' then 5 else 20 end,
    case when p_plan = 'free' then 500 when p_plan = 'starter' then 2000 else 100000 end
  );

  -- 3. Create Main Branch
  insert into public.branches (id, restaurant_id, name)
  values (v_branch_id, p_restaurant_id, 'Main Branch');

  -- 4. Create User Profile & Set active workspace (upsert using ON CONFLICT to prevent auth trigger duplicate key race condition)
  insert into public.users (id, restaurant_id, accessible_restaurants, active_restaurant_id, name, email, role, status)
  values (p_owner_uuid, p_restaurant_id, array[p_restaurant_id], p_restaurant_id, p_owner_name, p_owner_email, 'owner', 'active')
  on conflict (id) do update set
    restaurant_id = EXCLUDED.restaurant_id,
    accessible_restaurants = EXCLUDED.accessible_restaurants,
    active_restaurant_id = EXCLUDED.active_restaurant_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

  -- 5. Seed 10 Default Tables with unique QR tracking endpoints
  for i in 1..10 loop
    insert into public.tables (id, restaurant_id, branch_id, number, capacity, status, qr_code_url)
    values (
      'table-' || p_restaurant_id || '-' || i,
      p_restaurant_id, 
      v_branch_id, 
      i::text, 
      4, 
      'available',
      'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://digital-order-management-restaurant.vercel.app/menu/' || p_restaurant_id || '/main-branch/table-' || i
    );
  end loop;

  -- 6. Seed starter category
  insert into public.categories (id, restaurant_id, branch_id, name, "order")
  values ('cat-' || p_restaurant_id, p_restaurant_id, v_branch_id, 'Starter Foods', 1);

  return json_build_object('status', 'success', 'branch_id', v_branch_id);
exception when others then
  return json_build_object('status', 'error', 'message', SQLERRM);
end;
$$ language plpgsql security definer;
