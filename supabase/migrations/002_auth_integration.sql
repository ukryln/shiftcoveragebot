-- Wires the `users` table up to Supabase's built-in auth system, instead of
-- storing our own password_hash. Run this in the Supabase SQL Editor.

alter table users drop column if exists password_hash;

-- The users table's id must exactly match the id Supabase Auth assigns,
-- so it can no longer generate its own random default.
alter table users alter column id drop default;

alter table users
  add constraint users_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- Whenever someone signs up (via Supabase Auth), automatically create a
-- matching row in our own `users` table so shop_managers etc. can reference it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
