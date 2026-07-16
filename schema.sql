-- ====================================================
-- RESTAURANT ORDER MANAGEMENT SYSTEM - SUPABASE SCHEMA
-- Copy and run this script in your Supabase SQL Editor
-- ====================================================

-- 1. CLEANUP (Optional - only run if resetting)
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();
-- drop table if exists notifications;
-- drop table if exists payments;
-- drop table if exists orders;
-- drop table if exists food_items;
-- drop table if exists categories;
-- drop table if exists tables;
-- drop table if exists users;
-- drop table if exists restaurants;

-- 2. CREATE TABLES

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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Staff Profiles
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  name text not null,
  email text not null,
  role text check (role in ('admin', 'manager', 'cashier', 'kitchen', 'waiter')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dining Tables
create table public.tables (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
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
  name text not null,
  "order" integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Food Items
create table public.food_items (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
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
  type text check (type in ('new_order', 'call_waiter', 'request_bill')) not null,
  table_id text,
  table_name text not null,
  order_id text,
  message text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ENABLE REALTIME SYNC FOR APP TABLES
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.food_items;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.notifications;

-- 4. INSERT DEMO TENANT CONFIG (Required for foreign keys)
insert into public.restaurants (id, name, theme_color)
values ('demo-restaurant', 'The Grand Bistro', '#6366F1')
on conflict (id) do nothing;

-- 5. PROFILE SYNC TRIGGER (Creates user profile row automatically on Supabase Auth Sign Up)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, restaurant_id, name, email, role)
  values (
    new.id,
    'demo-restaurant',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'admin' -- default first user role
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.restaurants enable row level security;
alter table public.users enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.food_items enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

-- Helper function to check admin status without RLS recursion
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = user_id and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Policies for public menus & table layouts
create policy "Allow public read for settings" on public.restaurants for select using (true);
create policy "Allow admin write for settings" on public.restaurants for all using (public.is_admin(auth.uid()));

create policy "Allow public read for tables" on public.tables for select using (true);
create policy "Allow staff write for tables" on public.tables for all using (exists (select 1 from public.users where id = auth.uid()));

create policy "Allow public read for categories" on public.categories for select using (true);
create policy "Allow manager write for categories" on public.categories for all using (exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'manager')));

create policy "Allow public read for items" on public.food_items for select using (true);
create policy "Allow manager write for items" on public.food_items for all using (exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'manager')));

-- Policies for orders (public creates, staff updates)
create policy "Allow public order creation" on public.orders for insert with check (true);
create policy "Allow public order reading" on public.orders for select using (true);
create policy "Allow staff updates for orders" on public.orders for update using (exists (select 1 from public.users where id = auth.uid()));
create policy "Allow admin deletions for orders" on public.orders for delete using (public.is_admin(auth.uid()));

-- Policies for payments
create policy "Allow staff billing settlements" on public.payments for all using (exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'manager', 'cashier')));

-- Policies for notifications (public inserts, staff resolves)
create policy "Allow public service call insertions" on public.notifications for insert with check (true);
create policy "Allow staff service call lookups" on public.notifications for all using (exists (select 1 from public.users where id = auth.uid()));

-- Policies for user profiles (remedied recursion)
create policy "Allow users to read profiles" on public.users for select using (true);
create policy "Allow admin write for profiles" on public.users for all using (public.is_admin(auth.uid()));
