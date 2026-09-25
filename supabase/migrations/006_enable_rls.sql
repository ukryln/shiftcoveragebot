-- Defense in depth: with row level security on and no policies, the public
-- (anon) key can't read or write anything directly. The app only ever talks
-- to the database through the server-side service key, which bypasses RLS,
-- so nothing changes for the app itself. Safe to re-run.
alter table shops enable row level security;
alter table users enable row level security;
alter table shop_managers enable row level security;
alter table staff enable row level security;
alter table staff_shops enable row level security;
alter table shifts enable row level security;
alter table staff_availability enable row level security;
alter table coverage_requests enable row level security;
alter table coverage_responses enable row level security;
alter table shop_invites enable row level security;
