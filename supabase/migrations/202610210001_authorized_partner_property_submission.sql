-- Keep property submission inside the authenticated partner workspace.
-- Owners may submit their own properties. Agents (including property managers
-- onboarded as agents) must be explicitly approved and active. No public role
-- or unauthenticated user can create a property record.

drop policy if exists properties_agent_insert on public.properties;
create policy properties_authorized_partner_insert on public.properties
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and owner_id is null
  and listing_status = 'draft'
  and confirms_authority_to_submit = true
  and length(trim(photos_url)) > 0
  and (
    public.is_active_agent()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'owner'
    )
  )
);

-- The submitter can move their own draft into the review queue. Active agents
-- retain the existing correction workflow. Owners cannot edit already-submitted
-- listings through this policy.
drop policy if exists properties_agent_update_corrections on public.properties;
create policy properties_active_agent_update_corrections on public.properties
for update to authenticated
using (
  submitted_by = auth.uid()
  and listing_status in ('draft', 'correction_requested')
  and public.is_active_agent()
)
with check (
  submitted_by = auth.uid()
  and owner_id is null
  and listing_status in ('draft', 'submitted')
  and public.is_active_agent()
);

drop policy if exists properties_owner_submit_draft on public.properties;
create policy properties_owner_submit_draft on public.properties
for update to authenticated
using (
  submitted_by = auth.uid()
  and listing_status = 'draft'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'owner'
  )
)
with check (
  submitted_by = auth.uid()
  and owner_id is null
  and listing_status = 'submitted'
  and confirms_authority_to_submit = true
  and length(trim(photos_url)) > 0
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'owner'
  )
);

-- Keep the insert policy explicit: only an authenticated owner or active agent
-- can submit. Anonymous visitors have no insert policy for public.properties.
