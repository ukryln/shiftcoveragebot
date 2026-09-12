-- Shift Coverage Bot — Initial Database Schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New Query > paste > Run)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

create extension if not exists pgcrypto;

-- 1. shops: the tenant. Everything else belongs to a shop (or several, for staff).
create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 2. users: people who log into the dashboard (managers + super-admin).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. shop_managers: link table, which users manage which shops (many-to-many).
create table if not exists shop_managers (
  user_id uuid not null references users(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

-- 4. staff: the workers pinged via Telegram. Not the same as `users`.
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  telegram_id bigint unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'archived')),
  created_at timestamptz not null default now()
);

-- 5. staff_shops: link table, which staff work at which shops (many-to-many).
create table if not exists staff_shops (
  staff_id uuid not null references staff(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (staff_id, shop_id)
);

-- 6. shifts: the schedule — who's rostered on, when, and what role it needs.
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  role_required text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now()
);

-- 7. staff_availability: opt-outs — times a staff member is never available.
create table if not exists staff_availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  date date,
  note text,
  created_at timestamptz not null default now(),
  constraint staff_availability_has_target check (day_of_week is not null or date is not null)
);

-- 8. coverage_requests: created when a staff member needs their shift covered.
create table if not exists coverage_requests (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  requested_by uuid not null references staff(id),
  reason text,
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'broadcasting', 'filled', 'cancelled', 'rejected')),
  approved_by uuid references users(id),
  covered_by uuid references staff(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- 9. coverage_responses: who was pinged for a request and what they said.
create table if not exists coverage_responses (
  id uuid primary key default gen_random_uuid(),
  coverage_request_id uuid not null references coverage_requests(id) on delete cascade,
  staff_id uuid not null references staff(id),
  response text not null default 'no_response' check (response in ('yes', 'no', 'no_response')),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

-- 10. shop_invites: self-serve invite flow for adding managers to a shop.
create table if not exists shop_invites (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  email text not null,
  invited_by uuid not null references users(id),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- Indexes for the lookups the app will do most often.
create index if not exists idx_shop_managers_shop on shop_managers(shop_id);
create index if not exists idx_staff_shops_shop on staff_shops(shop_id);
create index if not exists idx_shifts_shop on shifts(shop_id);
create index if not exists idx_shifts_staff on shifts(staff_id);
create index if not exists idx_coverage_requests_shift on coverage_requests(shift_id);
create index if not exists idx_coverage_responses_request on coverage_responses(coverage_request_id);
create index if not exists idx_shop_invites_shop on shop_invites(shop_id);
create index if not exists idx_staff_availability_staff on staff_availability(staff_id);
