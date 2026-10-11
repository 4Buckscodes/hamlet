-- Admin workflow for reviewing public property intake and converting accepted submissions
-- into the existing listing review queue.
alter table public.property_intake_submissions
  add column if not exists converted_property_id uuid references public.properties(id) on delete set null;

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
    submitted_by, title, city, area, property_type, bedrooms,
    address, listing_url, nightly_rate, listing_status
  ) values (
    auth.uid(),
    intake.property_title,
    intake.city,
    intake.area,
    intake.property_type,
    intake.bedrooms,
    '',
    coalesce(nullif(intake.listing_url, ''), nullif(intake.photos_url, ''), ''),
    intake.nightly_rate,
    'submitted'
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
