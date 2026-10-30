begin;
select plan(13);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('e9000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'open-agent@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Open Agent","phone":"+234000000001","city":"Lagos","experience":"New partner"}', now(), now()),
  ('e9000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'open-owner@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Open Owner","phone":"+234000000002","city":"Lagos","experience":"Owner"}', now(), now()),
  ('e9000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Admin User","phone":"+234000000003","city":"Lagos","experience":"Admin"}', now(), now());

update public.profiles set account_status = 'active' where id in (
  'e9000000-0000-4000-8000-000000000001',
  'e9000000-0000-4000-8000-000000000002'
);
update public.profiles set role = 'owner' where id = 'e9000000-0000-4000-8000-000000000002';
update public.profiles set role = 'admin' where id = 'e9000000-0000-4000-8000-000000000003';

select is((select role::text from public.profiles where id = 'e9000000-0000-4000-8000-000000000001'), 'agent', 'public signup creates a partner agent, not an owner or admin');
select is((select account_status from public.profiles where id = 'e9000000-0000-4000-8000-000000000001'), 'active', 'new partner account is active immediately');
select is((select agent_status::text from public.profiles where id = 'e9000000-0000-4000-8000-000000000001'), 'active', 'new partner workflow status is immediately active');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'e9000000-0000-4000-8000-000000000001', true);

select is(public.is_active_agent(), true, 'new partner can use active agent permissions');
select lives_ok(
  $$insert into public.properties (submitted_by, title, city, area, property_type, bedrooms, nightly_rate, photos_url, confirms_authority_to_submit, listing_status)
    values (auth.uid(), 'Open Partner Property', 'Lagos', 'Yaba', 'Apartment', 1, 50000, 'https://example.test/tour', true, 'draft')$$,
  'new partner can create a property draft immediately'
);
select lives_ok(
  $$update public.properties set listing_status = 'submitted' where submitted_by = auth.uid() and title = 'Open Partner Property'$$,
  'new partner can submit draft for independent listing review'
);
select is((select listing_status::text from public.properties where title = 'Open Partner Property'), 'submitted', 'submission is still in review, not published');

select set_config('request.jwt.claim.sub', 'e9000000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$select public.set_partner_account_status('e9000000-0000-4000-8000-000000000001', 'suspended', 'Policy violation review')$$,
  'admin can suspend a partner with a reason'
);
select set_config('request.jwt.claim.sub', 'e9000000-0000-4000-8000-000000000001', true);
select is(public.is_active_agent(), false, 'suspended partner loses active partner permissions');
select throws_ok(
  $$insert into public.properties (submitted_by, title, city, area, property_type, bedrooms, nightly_rate, photos_url, confirms_authority_to_submit, listing_status)
    values (auth.uid(), 'Suspended Property', 'Lagos', 'Yaba', 'Apartment', 1, 50000, 'https://example.test/tour', true, 'draft')$$,
  '42501', null, 'suspended partner cannot submit a property'
);
select set_config('request.jwt.claim.sub', 'e9000000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$select public.set_partner_account_status('e9000000-0000-4000-8000-000000000001', 'active', null)$$,
  'admin can restore a suspended partner'
);
select set_config('request.jwt.claim.sub', 'e9000000-0000-4000-8000-000000000001', true);
select is(public.is_active_agent(), true, 'restored partner regains active permissions');
select throws_ok(
  $$select public.set_partner_account_status('e9000000-0000-4000-8000-000000000001', 'deactivated', 'Try to escalate')$$,
  'P0001', 'Admin role required', 'partner cannot change own account status'
);

select * from finish();
rollback;
