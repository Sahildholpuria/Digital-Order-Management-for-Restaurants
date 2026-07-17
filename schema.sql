-- ====================================================
-- RESTAURANT SAAS PLATFORM - MULTI-TENANT SQL SCHEMA
-- ====================================================

-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- 1. CLEANUP (Optional)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.onboard_new_restaurant(uuid, text, text, text);

-- 2. CREATE TABLES

-- Super Admins (Master SaaS Platform Owners)
create table public.super_admins (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Restaurants (Tenant Configuration)
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  logo_url text,
  gst_number text,
  tax_percentage numeric default 18,
  currency text default '₹',
  opening_hours text default '09:00',
  closing_hours text default '23:00',
  theme_color text default '#6366F1',
  status text check (status in ('active', 'suspended')) default 'active' not null,
  plan text check (plan in ('free', 'starter', 'professional', 'enterprise')) default 'professional' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Restaurant Settings (Branding & Feature Toggles)
create table public.restaurant_settings (
  id uuid primary key references public.restaurants(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  enable_waiter_call boolean default true not null,
  enable_bill_request boolean default true not null,
  enable_sound_notification boolean default true not null,
  receipt_template text,
  qr_code_design jsonb default '{}'::jsonb,
  timezone text default 'Asia/Kolkata' not null,
  language text default 'en' not null,
  invoice_footer text default 'Thank you for dining with us!' not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subscription Metadata
create table public.restaurant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  plan text check (plan in ('free', 'starter', 'professional', 'enterprise')) default 'professional' not null,
  starts_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ends_at timestamp with time zone,
  status text check (status in ('active', 'expired', 'trialing')) default 'trialing' not null,
  max_tables integer default 10 not null,
  max_staff integer default 10 not null,
  max_branches integer default 1 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workspace Branches (Multi-Branch Capability)
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  name text not null,
  address text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Multi-Tenant Staff Accounts
create table public.restaurant_users (
  id uuid references auth.users on delete cascade primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  name text not null,
  email text not null,
  role text check (role in ('owner', 'admin', 'manager', 'cashier', 'kitchen', 'waiter', 'staff', 'store')) default 'admin' not null,
  status text check (status in ('active', 'suspended')) default 'active' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Custom Roles definitions
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Custom Permissions mappings
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  role_id uuid references public.roles(id) on delete cascade not null,
  permission text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tables Management
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  branch_id uuid references public.branches(id) on delete set null,
  number text not null,
  capacity integer default 4 not null,
  status text check (status in ('available', 'occupied', 'reserved')) default 'available' not null,
  qr_code_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Menu Categories
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  name text not null,
  "order" integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Menu Items catalog (formerly food_items)
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  category_id uuid references public.menu_categories(id) on delete cascade not null,
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

-- Live Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  branch_id uuid references public.branches(id) on delete set null,
  order_number text not null,
  table_id uuid references public.tables(id) on delete set null,
  table_name text not null,
  subtotal numeric not null,
  tax numeric not null,
  discount numeric default 0 not null,
  grand_total numeric not null,
  status text check (status in ('pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')) default 'pending' not null,
  waiter_id uuid,
  feedback jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  elapsed_time_start timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Order Items details list (normalized from JSONB representation)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  order_id uuid references public.orders(id) on delete cascade not null,
  menu_item_id uuid references public.menu_items(id) on delete cascade not null,
  name text not null,
  price numeric not null,
  quantity integer not null,
  special_instructions text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Payments Log
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  order_id uuid references public.orders(id) on delete set null,
  order_number text not null,
  table_name text not null,
  subtotal numeric not null,
  tax numeric not null,
  discount numeric default 0 not null,
  grand_total numeric not null,
  payment_method text check (payment_method in ('cash', 'upi', 'card', 'wallet')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Customers Database
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Inventory Management
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  item_name text not null,
  quantity numeric default 0 not null,
  unit text not null,
  min_stock_level numeric default 0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Service Calls and Alerts Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  type text check (type in ('new_order', 'call_waiter', 'request_bill')) not null,
  table_id uuid references public.tables(id) on delete set null,
  table_name text not null,
  order_id uuid references public.orders(id) on delete set null,
  message text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Security Action Log History
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  user_id uuid,
  action text not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ENABLE REALTIME SYNC
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.menu_categories;
alter publication supabase_realtime add table public.menu_items;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.notifications;

-- 4. ROW LEVEL SECURITY (RLS) ACCESS CONTROLS

alter table public.super_admins enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.restaurant_subscriptions enable row level security;
alter table public.branches enable row level security;
alter table public.restaurant_users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.customers enable row level security;
alter table public.inventory enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- Security helper function to check if the caller is a Super Admin
create or replace function public.is_super_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.super_admins
    where id = user_id
  );
end;
$$ language plpgsql security definer;

-- Security helper to get a user's primary restaurant_id
create or replace function public.get_user_restaurant(user_id uuid)
returns uuid as $$
begin
  return (select restaurant_id from public.restaurant_users where id = user_id limit 1);
end;
$$ language plpgsql security definer;

-- Security helper to verify tenant membership
create or replace function public.belongs_to_restaurant(user_id uuid, rest_id uuid)
returns boolean as $$
begin
  return (
    public.is_super_admin(user_id) or
    exists (
      select 1 from public.restaurant_users
      where id = user_id and restaurant_id = rest_id and status = 'active'
    )
  );
end;
$$ language plpgsql security definer;

-- Super Admin Bypass policies
create policy "Super Admin read all" on public.super_admins for select using (public.is_super_admin(auth.uid()));

-- Restaurants Policies
create policy "Allow public read for settings" on public.restaurants for select using (true);
create policy "Allow admins write for settings" on public.restaurants for all using (
  public.is_super_admin(auth.uid()) or
  (exists (select 1 from public.restaurant_users where id = auth.uid() and restaurant_id = id and role in ('owner', 'admin')))
);

-- Restaurant Settings Policies
create policy "Allow public read for configurations" on public.restaurant_settings for select using (true);
create policy "Allow staff write for configurations" on public.restaurant_settings for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Subscriptions Policies
create policy "Allow staff read for subscription status" on public.restaurant_subscriptions for select using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);
create policy "Allow super admin to manage subscriptions" on public.restaurant_subscriptions for all using (
  public.is_super_admin(auth.uid())
);

-- Branches Policies
create policy "Allow staff to access branches" on public.branches for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Users Profiles Policies
create policy "Allow staff to read active profiles" on public.restaurant_users for select using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);
create policy "Allow admins to manage staff" on public.restaurant_users for all using (
  public.is_super_admin(auth.uid()) or
  (exists (select 1 from public.restaurant_users where id = auth.uid() and restaurant_id = restaurant_id and role in ('owner', 'admin')))
);

-- Tables Policies
create policy "Allow public read for table status" on public.tables for select using (true);
create policy "Allow staff to manage tables" on public.tables for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Categories Policies
create policy "Allow public read for menu list categories" on public.menu_categories for select using (true);
create policy "Allow manager to edit categories" on public.menu_categories for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Menu Items Policies
create policy "Allow public read for catalogue dishes" on public.menu_items for select using (true);
create policy "Allow manager to edit dishes" on public.menu_items for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Orders Policies
create policy "Allow public to place orders" on public.orders for insert with check (true);
create policy "Allow public to track orders" on public.orders for select using (true);
create policy "Allow staff to manage orders" on public.orders for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Order Items Policies
create policy "Allow public to add order items" on public.order_items for insert with check (true);
create policy "Allow public to view order items" on public.order_items for select using (true);
create policy "Allow staff to manage order items" on public.order_items for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Payments Policies
create policy "Allow cashier to view/manage billing" on public.payments for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Customers Policies
create policy "Allow staff to lookup customer records" on public.customers for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Inventory Policies
create policy "Allow staff to check stock" on public.inventory for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- Notifications Policies
create policy "Allow public alerts trigger" on public.notifications for insert with check (true);
create policy "Allow staff alerts management" on public.notifications for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id)
);

-- 5. ATOMIC ONBOARDING TRANSACTION FUNCTION
create or replace function public.onboard_new_restaurant(
  new_restaurant_id uuid,
  restaurant_name text,
  owner_email text,
  owner_name text
)
returns void as $$
declare
  starter_cat_id uuid;
  mains_cat_id uuid;
  dessert_cat_id uuid;
  table_index integer;
  temp_table_id uuid;
begin
  -- 1. Insert Restaurant Workspace
  insert into public.restaurants (id, name, status, plan)
  values (new_restaurant_id, restaurant_name, 'active', 'professional')
  on conflict (id) do nothing;

  -- 2. Insert Default Settings
  insert into public.restaurant_settings (id, restaurant_id, enable_waiter_call, enable_bill_request, enable_sound_notification)
  values (new_restaurant_id, new_restaurant_id, true, true, true)
  on conflict (id) do nothing;

  -- 3. Insert Trial Subscription (Professional Plan)
  insert into public.restaurant_subscriptions (restaurant_id, plan, starts_at, ends_at, status, max_tables, max_staff)
  values (new_restaurant_id, 'professional', now(), now() + interval '6 months', 'trialing', 25, 20);

  -- 4. Create Sample Menu Categories
  insert into public.menu_categories (restaurant_id, name, "order")
  values (new_restaurant_id, 'Starters', 1)
  returning id into starter_cat_id;

  insert into public.menu_categories (restaurant_id, name, "order")
  values (new_restaurant_id, 'Main Course', 2)
  returning id into mains_cat_id;

  insert into public.menu_categories (restaurant_id, name, "order")
  values (new_restaurant_id, 'Dessert & Drinks', 3)
  returning id into dessert_cat_id;

  -- 5. Insert Sample Menu Items
  insert into public.menu_items (restaurant_id, category_id, name, price, description, is_veg, preparation_time, is_popular, spicy_level)
  values 
    (new_restaurant_id, starter_cat_id, 'Paneer Tikka', 240, 'Charcoal-grilled cottage cheese cubes with spices', true, 10, true, 2),
    (new_restaurant_id, starter_cat_id, 'Crispy Chilli Corn', 190, 'Deep fried corn kernels tossed with fresh chillies', true, 8, false, 2),
    (new_restaurant_id, mains_cat_id, 'Butter Chicken', 350, 'Tender chicken cubes in smooth buttery tomato gravy', false, 15, true, 1),
    (new_restaurant_id, mains_cat_id, 'Dal Makhani', 220, 'Slow cooked black lentils with cream and spices', true, 12, true, 1),
    (new_restaurant_id, dessert_cat_id, 'Gulab Jamun', 90, 'Warm milk-solid dumplings soaked in cardamom sugar syrup', true, 5, false, 0);

  -- 6. Insert Default Tables (1 to 5) with capacity 4
  for table_index in 1..5 loop
    insert into public.tables (restaurant_id, number, capacity, status)
    values (new_restaurant_id, 'Table ' || table_index, 4, 'available');
  end loop;

end;
$$ language plpgsql security definer;

-- 6. PROFILE SYNC TRIGGER (Auth Signup hooks profile automatically)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_rest_id uuid;
begin
  -- Check if there are any restaurants. If not, generate a demo workspace
  select id into default_rest_id from public.restaurants limit 1;
  if default_rest_id is null then
    default_rest_id := 'c08eb195-236b-4b20-9118-18e388d7adfe'::uuid;
    perform public.onboard_new_restaurant(default_rest_id, 'The Grand SaaS Bistro', 'admin@saasbistro.com', 'SaaS Owner');
  end if;

  -- Assign user as Owner/Admin to the primary workspace
  insert into public.restaurant_users (id, restaurant_id, name, email, role, status)
  values (
    new.id,
    default_rest_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'admin',
    'active'
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
