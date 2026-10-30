-- Open partner registration: successful account creation activates a partner
-- immediately. Account moderation remains separate from property verification.
-- Public signup still receives only the agent role; owner/admin are never self-selected.

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'deactivated')),
  add column if not exists account_status_reason text,
  add column if not exists account_status_updated_at timestamptz not null default now(),
  add column if not exists account_status_updated_by uuid references public.profiles(id);

-- Existing pending/rejected agent profiles are migrated to active because account
-- approval is no longer a prerequisite. A deliberate suspension/deactivation is
-- never overwritten by this migration.
update public.profiles
set agent_status = 'active'
where role = 'agent'
  and agent_status in ('pending', 'rejected')
  and account_status = 'active';

-- Maintain legacy status fields during transition, but account availability is
-- now controlled by account_status. The helper is the single permission gate.
create or replace function public.is_active_agent()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'agent'
      and account_status = 'active'
  );
$$;

create or replace function public.is_active_partner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('agent', 'owner')
      and account_status = 'active'
  );
$$;

-- Use the account moderation state for every existing partner workflow,
-- including offers, bookings and owner-to-agent assignment.
create or replace function public.is_active_agent()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'agent'
      and account_status = 'active'
  );
$$;

-- All authenticated partners, including owners, can submit a property draft.
-- Submission still requires the explicit authority declaration and media link.
drop policy if exists properties_authorized_partner_insert on public.properties;
create policy properties_authorized_partner_insert on public.properties
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and owner_id is null
  and listing_status = 'draft'
  and confirms_authority_to_submit = true
  and length(trim(photos_url)) > 0
  and public.is_active_partner()
);

drop policy if exists properties_active_agent_update_corrections on public.properties;
create policy properties_active_partner_update_corrections on public.properties
for update to authenticated
using (
  submitted_by = auth.uid()
  and listing_status in ('draft', 'correction_requested')
  and public.is_active_partner()
)
with check (
  submitted_by = auth.uid()
  and owner_id is null
  and listing_status in ('draft', 'submitted')
  and public.is_active_partner()
);

-- Owner accounts are also allowed to re-submit drafts and correction workflows.
drop policy if exists properties_owner_submit_draft on public.properties;
create policy properties_owner_submit_draft on public.properties
for update to authenticated
using (
  submitted_by = auth.uid()
  and listing_status = 'draft'
  and public.is_active_partner()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
)
with check (
  submitted_by = auth.uid()
  and owner_id is null
  and listing_status = 'submitted'
  and confirms_authority_to_submit = true
  and length(trim(photos_url)) > 0
  and public.is_active_partner()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- Explicitly deny partner writes while an account is suspended or deactivated,
-- including writes made through the legacy admin/owner listing UI.
create policy profiles_admin_update_partner_accounts on public.profiles
for update to authenticated
using (public.is_admin() and role in ('agent', 'owner'))
with check (public.is_admin() and role in ('agent', 'owner'));

-- Only the record owner may suspend/reactivate/deactivate an account through
-- this RPC. Role changes are intentionally not part of this function.
create or replace function public.set_partner_account_status(
  p_partner_id uuid,
  p_status text,
  p_reason text default null
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
  if p_status not in ('active', 'suspended', 'deactivated') then
    raise exception 'Invalid partner account status';
  end if;
  if p_status in ('suspended', 'deactivated')
    and length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'A clear reason is required for suspension or deactivation';
  end if;

  update public.profiles
  set account_status = p_status,
      account_status_reason = nullif(trim(coalesce(p_reason, '')), ''),
      account_status_updated_at = now(),
      account_status_updated_by = auth.uid()
  where id = p_partner_id
    and role in ('agent', 'owner');
  if not found then
    raise exception 'Partner account not found';
  end if;

  insert into public.agent_notifications (agent_id, event_type, message)
  values (
    p_partner_id,
    'account_status',
    case p_status
      when 'active' then 'Your HAMLET partner account has been reactivated.'
      when 'suspended' then 'Your HAMLET partner account has been suspended. Contact support for assistance.'
      else 'Your HAMLET partner account has been deactivated.'
    end
  );
end;
$$;

grant execute on function public.is_active_partner() to authenticated;
grant execute on function public.set_partner_account_status(uuid, text, text) to authenticated;
revoke all on function public.is_active_partner() from public, anon;
revoke all on function public.set_partner_account_status(uuid, text, text) from public, anon;
