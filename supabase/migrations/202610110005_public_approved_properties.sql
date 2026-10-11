-- Public guests may discover only approved, non-suspended properties.
-- The policy is intentionally narrower than authenticated partner/admin access.
alter table public.properties
  add column if not exists is_suspended boolean not null default false;

drop policy if exists properties_public_select_approved on public.properties;
create policy properties_public_select_approved on public.properties
for select to anon, authenticated
using (
  listing_status = 'approved'
  and is_suspended = false
  and city = 'Lagos'
  and length(trim(photos_url)) > 0
);

-- Grant anonymous visitors only the columns needed to display a public listing.
-- RLS still decides which rows they can see.
grant select (
  id, title, city, area, property_type, bedrooms, bathrooms, max_guests,
  nightly_rate, photos_url, amenities, availability, available_from, updated_at
) on public.properties to anon;

create function public.admin_set_property_suspension(
  p_property_id uuid,
  p_is_suspended boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin role required';
  end if;

  update public.properties
  set is_suspended = p_is_suspended,
      updated_at = now()
  where id = p_property_id;
  if not found then
    raise exception 'Property not found';
  end if;
end;
$$;

revoke all on function public.admin_set_property_suspension(uuid, boolean) from public;
grant execute on function public.admin_set_property_suspension(uuid, boolean) to authenticated;
