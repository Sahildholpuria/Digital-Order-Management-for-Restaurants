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
  subscription_status text check (subscription_status in ('trial', 'active', 'expired', 'suspended')) default 'trial' not null,
  subscription_expires_at timestamp with time zone default timezone('utc'::text, now() + interval '30 days') not null,
  plan_type text check (plan_type in ('starter', 'pro', 'pro_6m', 'pro_1y')) default 'starter' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Staff Profiles
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  restaurant_id text references public.restaurants(id) on delete set null,
  name text not null,
  email text not null,
  role text check (role in ('admin', 'manager', 'cashier', 'kitchen', 'waiter')) not null,
  is_super_admin boolean default false not null,
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


-- SaaS Tenant Subscription Payments (Razorpay Renewals)
create table public.subscription_payments (
  id text primary key,
  restaurant_id text references public.restaurants(id) on delete cascade not null,
  restaurant_name text not null,
  plan_id text check (plan_id in ('starter', 'pro', 'pro_6m', 'pro_1y')) not null,
  plan_name text not null,
  amount numeric not null,
  currency text default 'INR' not null,
  duration_months integer default 6 not null,
  razorpay_payment_id text not null,
  razorpay_order_id text,
  status text default 'successful' not null,
  paid_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);

-- 3. ENABLE REALTIME SYNC FOR APP TABLES
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.food_items;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.subscription_payments;

-- 4. INSERT DEMO TENANT CONFIG (Required for foreign keys)
insert into public.restaurants (id, name, theme_color)
values ('demo-restaurant', 'The Grand Bistro', '#6366F1')
on conflict (id) do nothing;

-- 5. PROFILE SYNC TRIGGER (Creates user profile row automatically on Supabase Auth Sign Up)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  target_restaurant_id text;
  is_super boolean;
begin
  is_super := coalesce(
    (new.raw_user_meta_data->>'is_super_admin')::boolean,
    new.email = 'superadmin@restaurant.com',
    new.email like '%superadmin%',
    false
  );

  if is_super then
    target_restaurant_id := null;
  else
    target_restaurant_id := coalesce(new.raw_user_meta_data->>'restaurant_id', 'demo-restaurant');
    
    -- Ensure the restaurant exists to satisfy the foreign key constraint
    insert into public.restaurants (id, name, theme_color)
    values (target_restaurant_id, 'My Restaurant', '#6366F1')
    on conflict (id) do nothing;
  end if;

  -- Now insert the user safely
  insert into public.users (id, restaurant_id, name, email, role, is_super_admin)
  values (
    new.id,
    target_restaurant_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'admin'),
    is_super
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

-- Helper function to check if user belongs to a restaurant
create or replace function public.belongs_to_restaurant(user_id uuid, rest_id text)
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = user_id and restaurant_id = rest_id
  );
end;
$$ language plpgsql security definer;

-- Helper function to get a user's restaurant_id
create or replace function public.get_user_restaurant(user_id uuid)
returns text as $$
begin
  return (select restaurant_id from public.users where id = user_id);
end;
$$ language plpgsql security definer;

-- Helper function to check if user is a Super Admin
create or replace function public.is_super_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = user_id and is_super_admin = true
  );
end;
$$ language plpgsql security definer;

-- Policies for settings (tenant configuration)
create policy "Allow public read for settings" on public.restaurants for select using (true);
create policy "Allow admin write for settings" on public.restaurants for all using (
  (public.is_admin(auth.uid()) and id = public.get_user_restaurant(auth.uid()))
  or public.is_super_admin(auth.uid())
);

-- Policies for tables (staff write restricted)
create policy "Allow public read for tables" on public.tables for select using (true);
create policy "Allow staff write for tables" on public.tables for all using (public.belongs_to_restaurant(auth.uid(), restaurant_id));

-- Policies for menu categories (manager/admin restricted)
create policy "Allow public read for categories" on public.categories for select using (true);
create policy "Allow manager write for categories" on public.categories for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id) and 
  exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'manager'))
);

-- Policies for food items (manager/admin restricted)
create policy "Allow public read for items" on public.food_items for select using (true);
create policy "Allow manager write for items" on public.food_items for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id) and 
  exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'manager'))
);

-- Policies for orders (public creates, matching staff updates)
create policy "Allow public order creation" on public.orders for insert with check (true);
create policy "Allow public order reading" on public.orders for select using (true);
create policy "Allow staff updates for orders" on public.orders for update using (public.belongs_to_restaurant(auth.uid(), restaurant_id));
create policy "Allow admin deletions for orders" on public.orders for delete using (
  public.is_admin(auth.uid()) and 
  restaurant_id = public.get_user_restaurant(auth.uid())
);

-- Policies for payments (cashier/manager/admin restricted with tenant isolation)
create policy "Allow staff billing settlements" on public.payments for all using (
  public.belongs_to_restaurant(auth.uid(), restaurant_id) and 
  exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'manager', 'cashier'))
);

-- Policies for notifications (public inserts, matching staff reads/resolves)
create policy "Allow public service call insertions" on public.notifications for insert with check (true);
create policy "Allow staff service call lookups" on public.notifications for all using (public.belongs_to_restaurant(auth.uid(), restaurant_id));

-- Policies for user profiles (strict tenant privacy, remedied recursion)
create policy "Allow users to read profiles" on public.users for select using (
  (auth.uid() is not null and restaurant_id = public.get_user_restaurant(auth.uid()))
  or public.is_super_admin(auth.uid())
);
create policy "Allow admin write for profiles" on public.users for all using (
  (public.is_admin(auth.uid()) and restaurant_id = public.get_user_restaurant(auth.uid()))
  or public.is_super_admin(auth.uid())
);

-- Secure RPC function to update table status (bypassing RLS safely)
create or replace function public.update_table_status(p_table_id text, p_status text)
returns void as $$
begin
  if p_status not in ('available', 'occupied', 'reserved') then
    raise exception 'Invalid table status: %', p_status;
  end if;
  
  update public.tables
  set status = p_status, updated_at = now()
  where id = p_table_id 
     or number = p_table_id 
     or number = replace(p_table_id, 'table-', '')
     or id = ('table-' || p_table_id);
end;
$$ language plpgsql security definer;

-- Grant execution permissions
grant execute on function public.update_table_status(text, text) to anon, authenticated;

-- Indexes for performance and scalability (tenant isolation and queries speed)
create index if not exists idx_users_restaurant_id on public.users(restaurant_id);
create index if not exists idx_tables_restaurant_id on public.tables(restaurant_id);
create index if not exists idx_categories_restaurant_id on public.categories(restaurant_id);
create index if not exists idx_food_items_restaurant_id on public.food_items(restaurant_id);
create index if not exists idx_food_items_category_id on public.food_items(category_id);
create index if not exists idx_orders_restaurant_id on public.orders(restaurant_id);
create index if not exists idx_orders_table_id on public.orders(table_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_payments_restaurant_id on public.payments(restaurant_id);
create index if not exists idx_payments_created_at on public.payments(created_at desc);
create index if not exists idx_notifications_restaurant_id on public.notifications(restaurant_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);

-- 7. PLATFORM-WIDE SAAS ANNOUNCEMENTS (Super Admin Broadcast)
create table if not exists public.announcements (
  id text primary key,
  title text not null,
  message text not null,
  type text check (type in ('info', 'warning', 'success', 'urgent')) default 'info' not null,
  is_active boolean default true not null,
  is_dismissible boolean default true not null,
  starts_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.announcements enable row level security;
create policy "Allow public read active announcements" on public.announcements for select using (true);
create policy "Allow super admin manage announcements" on public.announcements for all using (public.is_super_admin(auth.uid()));
create index if not exists idx_announcements_is_active on public.announcements(is_active);


-- ====================================================
-- 8. SECURITY HARDENING & PRIVILEGE ESCALATION SHIELDS
-- ====================================================

-- Prevent privilege escalation (e.g. non-superadmin setting is_super_admin = true or changing roles)
create or replace function public.protect_user_roles()
returns trigger 
language plpgsql 
security definer 
set search_path = public
as $$
begin
  if (new.is_super_admin is distinct from old.is_super_admin) then
    if not exists (
      select 1 from public.users 
      where id = auth.uid() and is_super_admin = true
    ) then
      raise exception 'Unauthorized: Only Super Admins can modify super admin privileges.';
    end if;
  end if;

  if (new.role is distinct from old.role) then
    if not exists (
      select 1 from public.users 
      where id = auth.uid() and (
        is_super_admin = true or 
        (role = 'admin' and restaurant_id = old.restaurant_id)
      )
    ) then
      raise exception 'Unauthorized: Only Restaurant Admins or Super Admins can modify roles.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_user_roles on public.users;
create trigger trg_protect_user_roles
before update on public.users
for each row
execute function public.protect_user_roles();

-- Revoke dangerous execution permissions from anon and public
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_user_roles() from public, anon, authenticated;
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.is_super_admin(uuid) from public, anon;
revoke execute on function public.belongs_to_restaurant(uuid, text) from public, anon;
revoke execute on function public.get_user_restaurant(uuid) from public, anon;

grant execute on function public.is_admin(uuid) to authenticated, service_role;
grant execute on function public.is_super_admin(uuid) to authenticated, service_role;
grant execute on function public.belongs_to_restaurant(uuid, text) to authenticated, service_role;
grant execute on function public.get_user_restaurant(uuid) to authenticated, service_role;
grant execute on function public.update_table_status(text, text) to anon, authenticated, service_role;
