-- Public property intake for HAMLET's founding inventory drive.
-- Public users can submit an intake record but cannot read, edit, or approve submissions.
create table if not exists public.property_intake_submissions (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null check (length(trim(contact_name)) between 2 and 120),
  contact_phone text not null check (length(regexp_replace(contact_phone, '[^0-9+]', '', 'g')) >= 7),
  contact_email text not null default '',
  submitter_role text not null check (submitter_role in ('Owner', 'Property manager', 'Agent')),
  property_title text not null check (length(trim(property_title)) between 3 and 180),
  city text not null check (city in ('Lagos', 'Abuja', 'Ibadan', 'Other')),
  area text not null check (length(trim(area)) between 2 and 120),
  property_type text not null check (property_type in ('Apartment', 'Duplex', 'Villa', 'Townhouse', 'Studio', 'Other')),
  bedrooms smallint not null check (bedrooms between 1 and 30),
  bathrooms smallint not null check (bathrooms between 1 and 30),
  max_guests smallint not null check (max_guests between 1 and 100),
  nightly_rate bigint not null check (nightly_rate between 0 and 1000000000),
  listing_url text not null default '',
  photos_url text not null default '',
  availability text not null default 'Confirm with me' check (availability in ('Available now', 'Available from a date', 'Confirm with me')),
  available_from date,
  amenities text[] not null default '{}',
  has_approved_building_plan boolean not null default false,
  has_cofo boolean not null default false,
  has_governors_consent boolean not null default false,
  has_other_documents boolean not null default false,
  confirms_authority_to_submit boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'accepted', 'rejected')),
  review_notes text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.property_intake_submissions enable row level security;

drop policy if exists "Public can submit property intake" on public.property_intake_submissions;
create policy "Public can submit property intake"
  on public.property_intake_submissions
  for insert to anon, authenticated
  with check (
    length(trim(contact_name)) >= 2
    and length(regexp_replace(contact_phone, '[^0-9+]', '', 'g')) >= 7
    and confirms_authority_to_submit = true
    and status = 'pending'
    and review_notes = ''
    and reviewed_at is null
  );

drop policy if exists "Admins can read property intake" on public.property_intake_submissions;
create policy "Admins can read property intake"
  on public.property_intake_submissions
  for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update property intake" on public.property_intake_submissions;
create policy "Admins can update property intake"
  on public.property_intake_submissions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.property_intake_submissions from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (
  contact_name, contact_phone, contact_email, submitter_role, property_title,
  city, area, property_type, bedrooms, bathrooms, max_guests, nightly_rate,
  listing_url, photos_url, availability, available_from, amenities,
  has_approved_building_plan, has_cofo, has_governors_consent,
  has_other_documents, confirms_authority_to_submit
) on public.property_intake_submissions to anon, authenticated;
grant select, update (status, review_notes, reviewed_at) on public.property_intake_submissions to authenticated;

-- No client can execute as an elevated role; the RLS policies above remain authoritative.
