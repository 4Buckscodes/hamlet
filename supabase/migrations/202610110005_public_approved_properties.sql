-- Public guests may discover only approved, non-suspended properties.
-- The policy is intentionally narrower than authenticated partner/admin access.
alter table public.properties
  add column if not exists is_suspended boolean not null default false;

drop policy if exists properties_public_select_approved on public.properties;
create policy properties_public_select_approved on public.properties
for select to anon, authenticated
using (listing_status = 'approved' and is_suspended = false);

-- Grant anonymous visitors only the columns needed to display a public listing.
-- RLS still decides which rows they can see.
grant select (
  id, title, city, area, property_type, bedrooms, bathrooms, max_guests,
  nightly_rate, photos_url, amenities, availability, available_from, updated_at
) on public.properties to anon;
