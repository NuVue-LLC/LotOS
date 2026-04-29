-- LotOS Database Schema
-- Run this in the Supabase SQL Editor after creating your project

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enum types
create type inventory_status as enum ('available', 'recon', 'listed', 'under_contract', 'sold');
create type lead_source as enum ('website', 'facebook', 'craigslist', 'referral', 'walk_in', 'phone', 'other');
create type lead_status as enum ('new', 'contacted', 'qualified', 'appointment_set', 'closed_won', 'closed_lost');
create type lead_temperature as enum ('hot', 'warm', 'cold', 'dead');
create type message_sender as enum ('ai', 'dealer', 'buyer');
create type message_channel as enum ('sms', 'email', 'voice');
create type appointment_status as enum ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled');

-- Dealers table
create table dealers (
  id uuid primary key default auth.uid(),
  name text not null,
  email text not null,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  logo_url text,
  website_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index dealers_website_url_unique
  on dealers (website_url)
  where website_url is not null;

alter table dealers enable row level security;

create policy "Dealers can view own record" on dealers for select using (id = auth.uid());
create policy "Dealers can insert own record" on dealers for insert with check (id = auth.uid());
create policy "Dealers can update own record" on dealers for update using (id = auth.uid());
create policy "Dealers can delete own record" on dealers for delete using (id = auth.uid());

-- Inventory table
create table inventory (
  id uuid primary key default uuid_generate_v4(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  vin text,
  year integer,
  make text,
  model text,
  trim text,
  mileage integer,
  price numeric(10, 2),
  status inventory_status default 'available',
  photos text[] default '{}',
  color text,
  description text,
  recon_cost numeric(10, 2) default 0,
  purchase_price numeric(10, 2) default 0,
  purchase_payment_method text,
  on_lot boolean not null default true,
  notes text,
  listed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table inventory enable row level security;

create policy "Dealers can view own inventory" on inventory for select using (dealer_id = auth.uid());
create policy "Dealers can insert own inventory" on inventory for insert with check (dealer_id = auth.uid());
create policy "Dealers can update own inventory" on inventory for update using (dealer_id = auth.uid());
create policy "Dealers can delete own inventory" on inventory for delete using (dealer_id = auth.uid());

-- Leads table
create table leads (
  id uuid primary key default uuid_generate_v4(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  vehicle_interest text,
  source lead_source default 'other',
  status lead_status default 'new',
  temperature lead_temperature default 'warm',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table leads enable row level security;

create policy "Dealers can view own leads" on leads for select using (dealer_id = auth.uid());
create policy "Dealers can insert own leads" on leads for insert with check (dealer_id = auth.uid());
create policy "Dealers can update own leads" on leads for update using (dealer_id = auth.uid());
create policy "Dealers can delete own leads" on leads for delete using (dealer_id = auth.uid());

-- Conversations table
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id) on delete cascade,
  dealer_id uuid not null references dealers(id) on delete cascade,
  message text not null,
  sender message_sender not null,
  channel message_channel not null,
  created_at timestamptz default now()
);

alter table conversations enable row level security;

create policy "Dealers can view own conversations" on conversations for select using (dealer_id = auth.uid());
create policy "Dealers can insert own conversations" on conversations for insert with check (dealer_id = auth.uid());
create policy "Dealers can update own conversations" on conversations for update using (dealer_id = auth.uid());
create policy "Dealers can delete own conversations" on conversations for delete using (dealer_id = auth.uid());

-- Appointments table
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id) on delete cascade,
  dealer_id uuid not null references dealers(id) on delete cascade,
  scheduled_time timestamptz not null,
  status appointment_status default 'scheduled',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table appointments enable row level security;

create policy "Dealers can view own appointments" on appointments for select using (dealer_id = auth.uid());
create policy "Dealers can insert own appointments" on appointments for insert with check (dealer_id = auth.uid());
create policy "Dealers can update own appointments" on appointments for update using (dealer_id = auth.uid());
create policy "Dealers can delete own appointments" on appointments for delete using (dealer_id = auth.uid());

-- Auto-create dealer row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.dealers (id, name, email, website_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    new.raw_user_meta_data->>'website_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger dealers_updated_at before update on dealers for each row execute procedure update_updated_at();
create trigger inventory_updated_at before update on inventory for each row execute procedure update_updated_at();
create trigger leads_updated_at before update on leads for each row execute procedure update_updated_at();
create trigger appointments_updated_at before update on appointments for each row execute procedure update_updated_at();
