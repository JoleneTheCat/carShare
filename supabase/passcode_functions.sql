-- ============================================================
-- Passcode management RPCs
-- Run this in the Supabase SQL Editor (after schema.sql + auth_function.sql)
-- ============================================================

-- Verifies a user's current passcode and, if it matches, replaces it with
-- a new hashed passcode. Returns true on success, false if the current
-- passcode didn't match.
create or replace function public.change_passcode(p_user_id uuid, p_current_passcode text, p_new_passcode text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  matches boolean;
begin
  select (passcode_hash = crypt(p_current_passcode, passcode_hash)) into matches
  from public.users
  where id = p_user_id;

  if not found or not matches then
    return false;
  end if;

  update public.users
  set passcode_hash = crypt(p_new_passcode, gen_salt('bf'))
  where id = p_user_id;

  return true;
end;
$$;

revoke all on function public.change_passcode(uuid, text, text) from public;
grant execute on function public.change_passcode(uuid, text, text) to service_role;

-- Admin-only: force-resets a user's passcode without checking the old one.
-- Role checking is done in the Next.js server action before this is called.
create or replace function public.admin_set_passcode(p_user_id uuid, p_new_passcode text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.users
  set passcode_hash = crypt(p_new_passcode, gen_salt('bf'))
  where id = p_user_id;
$$;

revoke all on function public.admin_set_passcode(uuid, text) from public;
grant execute on function public.admin_set_passcode(uuid, text) to service_role;
