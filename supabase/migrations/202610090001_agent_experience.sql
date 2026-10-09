create extension if not exists pgcrypto;

create type public.hamlet_role as enum ('agent', 'owner', 'admin');
create type public.agent_review_status as enum ('pending', 'active', 'rejected');
create type public.listing_status as enum ('draft', 'submitted', 'correction_requested', 'approved', 'rejected');
create type public.offer_kind as enum ('agent_payout', 'owner_net_rate');
create type public.offer_status as enum ('open', 'accepted', 'withdrawn', 'expired');
create type public.booking_status as enum ('requested', 'confirmed', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.hamlet_role not null default 'agent',
  agent_status public.agent_review_status not null default 'pending',
  display_name text not null default '',
  phone text not null default '',
  city text not null default '',
  experience text not null default '',
  service_areas text[] not null default '{}',
  created_at timestamptz not null default now()
);

create function public.create_agent_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if length(trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''))) < 2
    or length(trim(coalesce(new.raw_user_meta_data ->> 'phone', ''))) < 7
    or length(trim(coalesce(new.raw_user_meta_data ->> 'city', ''))) < 2
    or length(trim(coalesce(new.raw_user_meta_data ->> 'experience', ''))) < 1 then
    raise exception 'Agent onboarding requires a name, valid phone, city, and experience';
  end if;
  insert into public.profiles (id, role, display_name, phone, city, experience, service_areas)
  values (
    new.id,
    'agent',
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'city', ''),
    coalesce(new.raw_user_meta_data ->> 'experience', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'service_areas', '[]'::jsonb))), '{}')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger hamlet_create_agent_profile
after insert on auth.users
for each row execute function public.create_agent_profile();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create function public.is_active_agent()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'agent' and agent_status = 'active'
  );
$$;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id),
  owner_id uuid references public.profiles(id),
  title text not null check (length(trim(title)) >= 3),
  city text not null check (length(trim(city)) >= 2),
  area text not null check (length(trim(area)) >= 2),
  property_type text not null check (length(trim(property_type)) >= 2),
  bedrooms smallint not null check (bedrooms > 0),
  address text not null default '',
  listing_url text not null default '',
  nightly_rate bigint not null check (nightly_rate >= 0),
  listing_status public.listing_status not null default 'draft',
  correction_request text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_assignments (
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (property_id, agent_id)
);

create table public.agent_offers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  target_agent_id uuid not null references public.profiles(id) on delete cascade,
  offer_kind public.offer_kind not null,
  status public.offer_status not null default 'open',
  current_version_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table public.agent_offer_versions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.agent_offers(id) on delete cascade,
  version integer not null check (version > 0),
  amount bigint not null check (amount >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (offer_id, version),
  unique (offer_id, id)
);

create function public.prevent_offer_version_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Commercial offer versions are immutable';
end;
$$;

create trigger hamlet_offer_versions_immutable
before update or delete on public.agent_offer_versions
for each row execute function public.prevent_offer_version_mutation();

alter table public.agent_offers
  add constraint agent_offers_current_version_fk
  foreign key (id, current_version_id)
  references public.agent_offer_versions (offer_id, id)
  deferrable initially deferred;

create table public.agent_bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  agent_id uuid not null references public.profiles(id),
  offer_version_id uuid references public.agent_offer_versions(id),
  guest_reference text not null,
  check_in date not null,
  check_out date not null check (check_out > check_in),
  accommodation_total bigint not null check (accommodation_total >= 0),
  status public.booking_status not null default 'requested',
  settlement_status text not null default 'not_integrated'
    check (settlement_status in ('not_integrated', 'pending_integration')),
  created_at timestamptz not null default now(),
  foreign key (offer_version_id) references public.agent_offer_versions(id)
);

create function public.validate_booking_commercial_terms()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  accepted_offer public.agent_offers%rowtype;
begin
  if new.offer_version_id is null then return new; end if;
  select o.* into accepted_offer
  from public.agent_offers o
  join public.agent_offer_versions v on v.offer_id = o.id
  where v.id = new.offer_version_id;
  if not found
    or accepted_offer.status <> 'accepted'
    or accepted_offer.target_agent_id <> new.agent_id
    or accepted_offer.property_id <> new.property_id
    or accepted_offer.current_version_id <> new.offer_version_id then
    raise exception 'Booking commercial terms must reference the accepted current offer for this agent and property';
  end if;
  return new;
end;
$$;

create trigger hamlet_validate_booking_terms
before insert or update of property_id, agent_id, offer_version_id on public.agent_bookings
for each row execute function public.validate_booking_commercial_terms();

create table public.agent_notifications (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.is_assigned_agent(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.property_assignments
    where property_id = target_property_id and agent_id = auth.uid()
  );
$$;

create function public.is_property_owner(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.properties
    where id = target_property_id and owner_id = auth.uid()
  );
$$;

create function public.list_property_agents(p_property_id uuid)
returns table (agent_id uuid, display_name text, city text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.is_admin() or public.is_property_owner(p_property_id)) then
    raise exception 'Not authorized to list agents for this property';
  end if;
  return query
    select p.id, p.display_name, p.city
    from public.profiles p
    where p.role = 'agent' and p.agent_status = 'active'
    order by p.display_name;
end;
$$;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_assignments enable row level security;
alter table public.agent_offers enable row level security;
alter table public.agent_offer_versions enable row level security;
alter table public.agent_bookings enable row level security;
alter table public.agent_notifications enable row level security;

create policy profiles_select_self_or_admin on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());

create policy properties_select_authorized on public.properties
for select to authenticated using (
  submitted_by = auth.uid() or owner_id = auth.uid()
  or public.is_assigned_agent(id) or public.is_admin()
);

create policy properties_agent_insert on public.properties
for insert to authenticated with check (
  submitted_by = auth.uid() and owner_id is null
  and listing_status = 'draft' and public.is_active_agent()
);

create policy properties_agent_update_corrections on public.properties
for update to authenticated
using (submitted_by = auth.uid() and listing_status in ('draft', 'correction_requested') and public.is_active_agent())
with check (submitted_by = auth.uid() and owner_id is null and listing_status in ('draft', 'submitted') and public.is_active_agent());

create policy assignments_select_self_owner_or_admin on public.property_assignments
for select to authenticated using (
  agent_id = auth.uid() or public.is_property_owner(property_id) or public.is_admin()
);

create policy offers_select_target_or_owner_or_admin on public.agent_offers
for select to authenticated using (
  target_agent_id = auth.uid() or public.is_property_owner(property_id) or public.is_admin()
);

create policy offer_versions_select_authorized on public.agent_offer_versions
for select to authenticated using (
  exists (
    select 1 from public.agent_offers o
    where o.id = offer_id
      and (o.target_agent_id = auth.uid() or public.is_property_owner(o.property_id) or public.is_admin())
  )
);

create policy notifications_select_self on public.agent_notifications
for select to authenticated using (agent_id = auth.uid() or public.is_admin());

create function public.assign_property_agent(p_property_id uuid, p_agent_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.is_admin() or public.is_property_owner(p_property_id)) then
    raise exception 'Not authorized to assign this property';
  end if;
  if not exists (select 1 from public.profiles where id = p_agent_id and role = 'agent' and agent_status = 'active') then
    raise exception 'Agent is not active';
  end if;
  insert into public.property_assignments (property_id, agent_id, assigned_by)
  values (p_property_id, p_agent_id, auth.uid())
  on conflict do nothing;
  if found then
    insert into public.agent_notifications (agent_id, event_type, message)
    values (p_agent_id, 'property_assigned', 'A property has been assigned to your agent account.');
  end if;
end;
$$;

create function public.mark_agent_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.agent_notifications
  set read_at = now()
  where id = p_notification_id and agent_id = auth.uid();
  if not found then raise exception 'Notification not found for this agent'; end if;
end;
$$;

create function public.review_agent_application(p_agent_id uuid, p_status public.agent_review_status)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Admin role required'; end if;
  if p_status = 'pending' then raise exception 'Review must approve or reject the application'; end if;
  update public.profiles
  set agent_status = p_status
  where id = p_agent_id and role = 'agent';
  if not found then raise exception 'Agent application not found'; end if;
  insert into public.agent_notifications (agent_id, event_type, message)
  values (p_agent_id, 'application_review', 'Your agent application status is now ' || p_status::text || '.');
end;
$$;

create function public.review_agent_listing(p_property_id uuid, p_status public.listing_status)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Admin role required'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'Reviewer status must be approved or rejected'; end if;
  update public.properties
  set listing_status = p_status, correction_request = null, updated_at = now()
  where id = p_property_id and listing_status in ('submitted', 'correction_requested');
  if not found then raise exception 'Listing is not awaiting review'; end if;
  insert into public.agent_notifications (agent_id, event_type, message)
  select recipient_id, 'listing_review', 'Your property listing was ' || p_status::text || '.'
  from (
    select submitted_by as recipient_id from public.properties where id = p_property_id
    union
    select agent_id as recipient_id from public.property_assignments where property_id = p_property_id
  ) recipients;
end;
$$;

create function public.resubmit_corrected_listing(
  p_property_id uuid,
  p_title text,
  p_city text,
  p_area text,
  p_property_type text,
  p_bedrooms smallint,
  p_nightly_rate bigint,
  p_listing_url text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_active_agent() then raise exception 'Active agent account required'; end if;
  update public.properties
  set title = p_title,
      city = p_city,
      area = p_area,
      property_type = p_property_type,
      bedrooms = p_bedrooms,
      nightly_rate = p_nightly_rate,
      listing_url = p_listing_url,
      listing_status = 'submitted',
      correction_request = null,
      updated_at = now()
  where id = p_property_id and submitted_by = auth.uid() and listing_status = 'correction_requested';
  if not found then raise exception 'No correction request exists for this submitted listing'; end if;
  insert into public.agent_notifications (agent_id, event_type, message)
  values (auth.uid(), 'listing_resubmitted', 'Your corrected property listing was resubmitted for review.');
end;
$$;

create function public.request_listing_correction(p_property_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.is_admin() or public.is_property_owner(p_property_id)) then
    raise exception 'Not authorized to request corrections for this property';
  end if;
  if p_message is null or length(trim(p_message)) < 5 then
    raise exception 'Correction request must explain the required change';
  end if;
  update public.properties
  set listing_status = 'correction_requested', correction_request = trim(p_message), updated_at = now()
  where id = p_property_id and listing_status in ('submitted', 'approved');
  if not found then
    raise exception 'Listing is not available for correction';
  end if;
  insert into public.agent_notifications (agent_id, event_type, message)
  select recipient_id, 'listing_correction', 'A listing needs corrections: ' || trim(p_message)
  from (
    select submitted_by as recipient_id from public.properties where id = p_property_id
    union
    select agent_id as recipient_id from public.property_assignments where property_id = p_property_id
  ) recipients;
end;
$$;

create function public.publish_agent_offer(
  p_property_id uuid,
  p_agent_id uuid,
  p_offer_kind public.offer_kind,
  p_amount bigint
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  offer_id uuid;
  version_id uuid;
begin
  if not (public.is_admin() or public.is_property_owner(p_property_id)) then
    raise exception 'Not authorized to publish terms for this property';
  end if;
  if not public.is_admin() and p_offer_kind = 'agent_payout' and not public.is_property_owner(p_property_id) then
    raise exception 'Not authorized to offer an agent payout';
  end if;
  if not exists (
    select 1 from public.property_assignments
    where property_id = p_property_id and agent_id = p_agent_id
  ) then
    raise exception 'Agent is not assigned to this property';
  end if;
  if p_amount < 0 then raise exception 'Offer amount must not be negative'; end if;

  insert into public.agent_offers (property_id, target_agent_id, offer_kind, created_by)
  values (p_property_id, p_agent_id, p_offer_kind, auth.uid())
  returning id into offer_id;
  insert into public.agent_offer_versions (offer_id, version, amount, created_by)
  values (offer_id, 1, p_amount, auth.uid())
  returning id into version_id;
  update public.agent_offers set current_version_id = version_id where id = offer_id;
  insert into public.agent_notifications (agent_id, event_type, message)
  values (p_agent_id, 'commercial_offer', 'A new commercial offer is available on your Deal Board.');
  return offer_id;
end;
$$;

create function public.revise_agent_offer(p_offer_id uuid, p_amount bigint)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_offer public.agent_offers%rowtype;
  next_version integer;
  version_id uuid;
begin
  select * into target_offer from public.agent_offers where id = p_offer_id for update;
  if not found or not (public.is_admin() or public.is_property_owner(target_offer.property_id)) then
    raise exception 'Not authorized to revise this offer';
  end if;
  if target_offer.status <> 'open' then raise exception 'Only open offers can be revised'; end if;
  if p_amount < 0 then raise exception 'Offer amount must not be negative'; end if;
  select coalesce(max(version), 0) + 1 into next_version
  from public.agent_offer_versions where offer_id = p_offer_id;
  insert into public.agent_offer_versions (offer_id, version, amount, created_by)
  values (p_offer_id, next_version, p_amount, auth.uid())
  returning id into version_id;
  update public.agent_offers set current_version_id = version_id where id = p_offer_id;
  insert into public.agent_notifications (agent_id, event_type, message)
  values (target_offer.target_agent_id, 'offer_revised', 'Commercial terms were revised. Review the latest version on your Deal Board.');
  return version_id;
end;
$$;

create function public.accept_agent_offer(p_offer_id uuid, p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_offer public.agent_offers%rowtype;
begin
  if not public.is_active_agent() then raise exception 'Active agent account required'; end if;
  select * into target_offer from public.agent_offers where id = p_offer_id for update;
  if not found or target_offer.target_agent_id <> auth.uid() then raise exception 'Offer is not assigned to this agent'; end if;
  if target_offer.status <> 'open' then raise exception 'Offer is no longer open'; end if;
  if target_offer.current_version_id is distinct from p_version_id then
    raise exception 'Offer terms changed; refresh and review the current version';
  end if;
  update public.agent_offers set status = 'accepted', accepted_at = now() where id = p_offer_id;
  insert into public.agent_notifications (agent_id, event_type, message)
  values (auth.uid(), 'offer_accepted', 'You accepted the current version of a commercial offer.');
end;
$$;

create function public.agent_earnings()
returns table (
  booking_id uuid,
  property_id uuid,
  guest_reference text,
  check_in date,
  check_out date,
  accommodation_total bigint,
  booking_state public.booking_status,
  commercial_term_kind public.offer_kind,
  commercial_term_amount bigint,
  settlement_state text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select b.id, b.property_id, b.guest_reference, b.check_in, b.check_out,
    b.accommodation_total, b.status, o.offer_kind, v.amount, b.settlement_status
  from public.agent_bookings b
  left join public.agent_offer_versions v on v.id = b.offer_version_id
  left join public.agent_offers o on o.id = v.offer_id
  where b.agent_id = auth.uid()
  order by b.check_in desc;
$$;

grant usage on schema public to authenticated;
grant select on public.profiles, public.properties, public.property_assignments,
  public.agent_offers, public.agent_offer_versions, public.agent_bookings,
  public.agent_notifications to authenticated;
grant insert, update on public.properties to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_agent() to authenticated;
grant execute on function public.is_assigned_agent(uuid) to authenticated;
grant execute on function public.is_property_owner(uuid) to authenticated;
grant execute on function public.list_property_agents(uuid) to authenticated;
grant execute on function public.mark_agent_notification_read(uuid) to authenticated;
grant execute on function public.assign_property_agent(uuid, uuid) to authenticated;
grant execute on function public.review_agent_application(uuid, public.agent_review_status) to authenticated;
grant execute on function public.review_agent_listing(uuid, public.listing_status) to authenticated;
grant execute on function public.resubmit_corrected_listing(uuid, text, text, text, text, smallint, bigint, text) to authenticated;
grant execute on function public.request_listing_correction(uuid, text) to authenticated;
grant execute on function public.publish_agent_offer(uuid, uuid, public.offer_kind, bigint) to authenticated;
grant execute on function public.revise_agent_offer(uuid, bigint) to authenticated;
grant execute on function public.accept_agent_offer(uuid, uuid) to authenticated;
grant execute on function public.agent_earnings() to authenticated;

revoke all on function public.create_agent_profile() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_active_agent() from public, anon;
revoke all on function public.is_assigned_agent(uuid) from public, anon;
revoke all on function public.is_property_owner(uuid) from public, anon;
revoke all on function public.list_property_agents(uuid) from public, anon;
revoke all on function public.mark_agent_notification_read(uuid) from public, anon;
revoke all on function public.assign_property_agent(uuid, uuid) from public, anon;
revoke all on function public.review_agent_application(uuid, public.agent_review_status) from public, anon;
revoke all on function public.review_agent_listing(uuid, public.listing_status) from public, anon;
revoke all on function public.resubmit_corrected_listing(uuid, text, text, text, text, smallint, bigint, text) from public, anon;
revoke all on function public.request_listing_correction(uuid, text) from public, anon;
revoke all on function public.publish_agent_offer(uuid, uuid, public.offer_kind, bigint) from public, anon;
revoke all on function public.revise_agent_offer(uuid, bigint) from public, anon;
revoke all on function public.accept_agent_offer(uuid, uuid) from public, anon;
revoke all on function public.agent_earnings() from public, anon;

create view public.agent_earnings_view
with (security_invoker = true)
as select * from public.agent_earnings();
grant select on public.agent_earnings_view to authenticated;