-- Extend the authenticated agent listing path with an explicit authority declaration.
-- This flag is a submitter declaration only; it is not a verification result.
alter table public.properties
  add column if not exists confirms_authority_to_submit boolean not null default false;

drop policy if exists properties_agent_insert on public.properties;
create policy properties_agent_insert on public.properties
for insert to authenticated with check (
  submitted_by = auth.uid()
  and owner_id is null
  and listing_status = 'draft'
  and public.is_active_agent()
  and confirms_authority_to_submit = true
  and length(trim(photos_url)) > 0
);

-- Preserve the authority declaration already required by the public intake form
-- when an admin converts that submission into a listing awaiting review.
create or replace function public.convert_property_intake_to_listing(p_intake_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  intake public.property_intake_submissions%rowtype;
  created_property_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only HAMLET admins can convert property intake submissions';
  end if;

  select * into intake
  from public.property_intake_submissions
  where id = p_intake_id
  for update;

  if not found then
    raise exception 'Property intake submission not found';
  end if;
  if intake.status = 'accepted' and intake.converted_property_id is not null then
    return intake.converted_property_id;
  end if;
  if intake.status not in ('pending', 'contacted') then
    raise exception 'Only pending or contacted submissions can be converted';
  end if;
  if not intake.confirms_authority_to_submit then
    raise exception 'Submitter authority must be confirmed before conversion';
  end if;

  insert into public.properties (
    submitted_by, title, city, area, property_type, bedrooms, bathrooms,
    max_guests, address, listing_url, photos_url, nightly_rate, listing_status,
    availability, available_from, amenities, has_approved_building_plan,
    has_cofo, has_governors_consent, has_other_documents, confirms_authority_to_submit
  ) values (
    auth.uid(),
    intake.property_title,
    intake.city,
    intake.area,
    intake.property_type,
    intake.bedrooms,
    intake.bathrooms,
    intake.max_guests,
    '',
    intake.listing_url,
    intake.photos_url,
    intake.nightly_rate,
    'submitted',
    intake.availability,
    intake.available_from,
    intake.amenities,
    intake.has_approved_building_plan,
    intake.has_cofo,
    intake.has_governors_consent,
    intake.has_other_documents,
    intake.confirms_authority_to_submit
  )
  returning id into created_property_id;

  update public.property_intake_submissions
  set status = 'accepted',
      converted_property_id = created_property_id,
      reviewed_at = now()
  where id = p_intake_id;

  return created_property_id;
end;
$$;

-- No public signup flow can grant admin privileges; admin permissions remain
-- controlled by HAMLET's existing admin-only review and role-management process.
