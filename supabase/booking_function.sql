-- ============================================================
-- save_booking: atomic create / update / admin-overwrite
-- Run this in the Supabase SQL Editor (after schema.sql + auth_function.sql)
-- ============================================================

create or replace function public.save_booking(
  p_booking_id uuid,           -- null when creating a new booking
  p_user_id uuid,              -- who the booking is for
  p_start timestamptz,
  p_end timestamptz,
  p_allow_overwrite boolean    -- admin only: delete conflicting bookings first
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.bookings;
begin
  if p_allow_overwrite then
    delete from public.bookings
    where tstzrange(start_time, end_time, '[)') && tstzrange(p_start, p_end, '[)')
      and (p_booking_id is null or id <> p_booking_id);
  end if;

  if p_booking_id is null then
    insert into public.bookings (user_id, start_time, end_time)
    values (p_user_id, p_start, p_end)
    returning * into result;
  else
    update public.bookings
    set user_id = p_user_id,
        start_time = p_start,
        end_time = p_end
    where id = p_booking_id
    returning * into result;

    if not found then
      raise exception 'Booking not found';
    end if;
  end if;

  return result;
end;
$$;

revoke all on function public.save_booking(uuid, uuid, timestamptz, timestamptz, boolean) from public;
grant execute on function public.save_booking(uuid, uuid, timestamptz, timestamptz, boolean) to service_role;
