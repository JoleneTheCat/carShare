-- ============================================================
-- Login verification RPC
-- Run this in the Supabase SQL Editor (after schema.sql)
-- ============================================================

-- Checks a name + passcode pair against the hashed passcode and returns
-- the safe profile fields if it matches (empty result if it doesn't).
-- SECURITY DEFINER lets it read users.passcode_hash even though the
-- users table itself has no RLS policies for anon/authenticated.
create or replace function public.verify_login(p_name text, p_passcode text)
returns table (id uuid, name text, role text, color text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.name, u.role, u.color
  from public.users u
  where u.name = p_name
    and u.passcode_hash = crypt(p_passcode, u.passcode_hash);
$$;

-- Only the server (using the service role key) is allowed to call this.
revoke all on function public.verify_login(text, text) from public;
grant execute on function public.verify_login(text, text) to service_role;
