-- Admin workflow for reviewing public property intake and converting accepted submissions
-- into the existing listing review queue.
alter table public.property_intake_submissions
  add column if not exists converted_property_id uuid references public.properties(id) on delete set null;

-- Preserve useful onboarding data when an admin converts a submission.
alter table public.properties
  add column if not exists bathrooms smallint not null default 1 check (bathrooms between 1 and 30),
  add column if not exists max_guests smallint not null default 2 check (max_guests between 1 and 100),
  add column if not exists photos_url text not null default '',
  add column if not exists availability text not null default 'Confirm with me'
    check (availability in ('Available now', 'Available from a date', 'Confirm with me')),
  add column if not exists available_from date,
  add column if not exists amenities text[] not null default '{}',
  add column if not exists has_approved_building_plan boolean not null default false,
  add column if not exists has_cofo boolean not null default false,
  add column if not exists has_governors_consent boolean not null default false,
  add column if not exists has_other_documents boolean not null default false;

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

  insert into public.properties (
    submitted_by, title, city, area, property_type, bedrooms, bathrooms,
    max_guests, address, listing_url, photos_url, nightly_rate, listing_status,
    availability, available_from, amenities, has_approved_building_plan,
    has_cofo, has_governors_consent, has_other_documents
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
    intake.has_other_documents
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

grant execute on function public.convert_property_intake_to_listing(uuid) to authenticated;
revoke all on function public.convert_property_intake_to_listing(uuid) from public, anon;
