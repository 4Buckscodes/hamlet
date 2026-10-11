-- Request-to-book foundation for HAMLET's Lagos MVP.
-- Guests can submit requests, but cannot read other guests' records or confirm bookings.
create extension if not exists btree_gist;

create type public.guest_booking_status as enum (
  'requested',
  'availability_confirmed',
  'awaiting_payment',
  'confirmed',
  'completed',
  'cancelled',
  'expired',
  'disputed',
  'refunded'
);

create type public.guest_payment_status as enum (
  'unpaid',
  'pending',
  'paid',
  'failed',
  'partially_refunded',
  'refunded'
);

create table public.guest_booking_requests (
  id uuid primary key default gen_random_uuid(),
  guest_reference text not null unique default (
    'HM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  property_id uuid not null references public.properties(id),
  guest_name text not null check (length(trim(guest_name)) between 2 and 120),
  guest_email text,
  guest_phone text not null check (length(regexp_replace(guest_phone, '[^0-9+]', '', 'g')) >= 7),
  check_in date not null,
  check_out date not null check (check_out > check_in),
  guest_count smallint not null check (guest_count between 1 and 100),
  guest_message text not null default '' check (length(guest_message) <= 2000),
  nightly_rate_snapshot bigint not null check (nightly_rate_snapshot >= 0),
  accommodation_subtotal bigint not null check (accommodation_subtotal >= 0),
  hamlet_service_fee bigint not null check (
    hamlet_service_fee = round(accommodation_subtotal * 0.03)::bigint
  ),
  mandatory_charges bigint not null default 0 check (mandatory_charges >= 0),
  guest_total bigint generated always as (
    accommodation_subtotal + hamlet_service_fee + mandatory_charges
  ) stored,
  status public.guest_booking_status not null default 'requested',
  payment_status public.guest_payment_status not null default 'unpaid',
  payment_deadline timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (accommodation_subtotal = nightly_rate_snapshot * (check_out - check_in))
);

-- A property cannot have overlapping confirmed stays. Requests may overlap while
-- availability is being checked, but the exclusion constraint prevents double-booking.
alter table public.guest_booking_requests
  add constraint guest_booking_no_overlapping_confirmed_stays
  exclude using gist (
    property_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status = 'confirmed');

create table public.guest_booking_payment_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.guest_booking_requests(id) on delete restrict,
  provider text not null check (length(trim(provider)) between 2 and 80),
  provider_reference text not null check (length(trim(provider_reference)) between 3 and 200),
  amount bigint not null check (amount >= 0),
  status text not null check (status in ('verified', 'failed', 'refunded', 'partially_refunded')),
  verification_method text not null check (verification_method in ('provider_dashboard', 'provider_webhook')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

alter table public.guest_booking_requests enable row level security;
alter table public.guest_booking_payment_events enable row level security;

create policy guest_booking_select_admin_or_authorised_partner
  on public.guest_booking_requests
  for select to authenticated
  using (
    public.is_admin()
    or public.is_property_owner(property_id)
    or (public.is_active_agent() and public.is_assigned_agent(property_id))
  );

create policy guest_booking_payment_events_select_admin
  on public.guest_booking_payment_events
  for select to authenticated
  using (public.is_admin());

grant select on public.guest_booking_requests, public.guest_booking_payment_events to authenticated;
revoke insert, update, delete on public.guest_booking_requests from anon, authenticated;
revoke insert, update, delete on public.guest_booking_payment_events from anon, authenticated;

create function public.submit_guest_booking_request(
  p_property_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_check_in date,
  p_check_out date,
  p_guest_count smallint,
  p_guest_message text default ''
)
returns table (
  booking_id uuid,
  guest_reference text,
  accommodation_subtotal bigint,
  hamlet_service_fee bigint,
  guest_total bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  listing public.properties%rowtype;
  stay_nights integer;
  stay_subtotal bigint;
  guest_fee bigint;
begin
  if length(trim(coalesce(p_guest_name, ''))) < 2 or length(trim(p_guest_name)) > 120 then
    raise exception 'Enter a valid guest name';
  end if;
  if length(regexp_replace(coalesce(p_guest_phone, ''), '[^0-9+]', '', 'g')) < 7 then
    raise exception 'Enter a valid guest phone number';
  end if;
  if p_guest_email is not null and length(trim(p_guest_email)) > 180 then
    raise exception 'Guest email is too long';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in or p_check_in < current_date then
    raise exception 'Choose a valid future check-in and check-out date';
  end if;
  if p_guest_count is null or p_guest_count < 1 then
    raise exception 'Guest count must be at least one';
  end if;
  if length(coalesce(p_guest_message, '')) > 2000 then
    raise exception 'Guest message is too long';
  end if;

  select * into listing
  from public.properties
  where id = p_property_id
    and listing_status = 'approved'
    and is_suspended = false
    and city = 'Lagos'
    and length(trim(photos_url)) > 0;

  if not found then
    raise exception 'This property is not available for booking requests';
  end if;
  if p_guest_count > listing.max_guests then
    raise exception 'Guest count exceeds this property's maximum capacity';
  end if;

  stay_nights := p_check_out - p_check_in;
  stay_subtotal := listing.nightly_rate * stay_nights;
  guest_fee := round(stay_subtotal * 0.03)::bigint;

  return query
  insert into public.guest_booking_requests (
    property_id, guest_name, guest_email, guest_phone, check_in, check_out,
    guest_count, guest_message, nightly_rate_snapshot, accommodation_subtotal,
    hamlet_service_fee
  ) values (
    listing.id, trim(p_guest_name), nullif(trim(coalesce(p_guest_email, '')), ''),
    trim(p_guest_phone), p_check_in, p_check_out, p_guest_count,
    trim(coalesce(p_guest_message, '')), listing.nightly_rate, stay_subtotal, guest_fee
  )
  returning id, guest_booking_requests.guest_reference,
    guest_booking_requests.accommodation_subtotal,
    guest_booking_requests.hamlet_service_fee,
    guest_booking_requests.guest_total;
end;
$$;

create function public.set_guest_booking_status(
  p_booking_id uuid,
  p_status public.guest_booking_status,
  p_payment_deadline timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking public.guest_booking_requests%rowtype;
  may_manage boolean;
begin
  select * into booking
  from public.guest_booking_requests
  where id = p_booking_id
  for update;
  if not found then raise exception 'Booking request not found'; end if;

  may_manage := public.is_admin()
    or public.is_property_owner(booking.property_id)
    or (public.is_active_agent() and public.is_assigned_agent(booking.property_id));
  if not may_manage then raise exception 'Not authorised to manage this booking request'; end if;

  if p_status = 'confirmed' or p_status = 'completed' or p_status = 'refunded' then
    raise exception 'This booking status requires a verified payment or a separate completion workflow';
  end if;

  if p_status = 'awaiting_payment' and not public.is_admin() then
    raise exception 'Only HAMLET admins can issue the payment step';
  end if;
  if p_status = 'awaiting_payment' and (p_payment_deadline is null or p_payment_deadline <= now()) then
    raise exception 'A future payment deadline is required';
  end if;

  if p_status not in ('availability_confirmed', 'awaiting_payment', 'cancelled', 'expired', 'disputed') then
    raise exception 'Unsupported booking status transition';
  end if;

  if booking.status in ('confirmed', 'completed', 'cancelled', 'expired', 'refunded') then
    raise exception 'This booking request is already in a terminal state';
  end if;

  update public.guest_booking_requests
  set status = p_status,
      payment_deadline = case when p_status = 'awaiting_payment' then p_payment_deadline else payment_deadline end,
      updated_at = now()
  where id = p_booking_id;
end;
$$;

create function public.admin_mark_booking_payment_verified(
  p_booking_id uuid,
  p_provider text,
  p_provider_reference text,
  p_amount bigint
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking public.guest_booking_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin role required'; end if;

  select * into booking
  from public.guest_booking_requests
  where id = p_booking_id
  for update;
  if not found then raise exception 'Booking request not found'; end if;
  if booking.status <> 'awaiting_payment' then
    raise exception 'Booking must be awaiting payment before payment can be verified';
  end if;
  if booking.payment_deadline is not null and booking.payment_deadline < now() then
    raise exception 'The booking payment deadline has expired';
  end if;
  if p_amount <> booking.guest_total then
    raise exception 'Verified payment amount must match the final guest total';
  end if;
  if length(trim(coalesce(p_provider, ''))) < 2 or length(trim(coalesce(p_provider_reference, ''))) < 3 then
    raise exception 'Provider and provider reference are required';
  end if;

  insert into public.guest_booking_payment_events (
    booking_id, provider, provider_reference, amount, status, verification_method, verified_by
  ) values (
    booking.id, trim(p_provider), trim(p_provider_reference), p_amount,
    'verified', 'provider_dashboard', auth.uid()
  );

  update public.guest_booking_requests
  set payment_status = 'paid',
      status = 'confirmed',
      confirmed_at = now(),
      updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke all on function public.submit_guest_booking_request(uuid, text, text, text, date, date, smallint, text) from public;
grant execute on function public.submit_guest_booking_request(uuid, text, text, text, date, date, smallint, text) to anon, authenticated;

revoke all on function public.set_guest_booking_status(uuid, public.guest_booking_status, timestamptz) from public;
grant execute on function public.set_guest_booking_status(uuid, public.guest_booking_status, timestamptz) to authenticated;

revoke all on function public.admin_mark_booking_payment_verified(uuid, text, text, bigint) from public;
grant execute on function public.admin_mark_booking_payment_verified(uuid, text, text, bigint) to authenticated;
