begin;
select plan(22);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('e0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'agent-test@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"TEST Agent","phone":"+234000000001","city":"Lagos","experience":"test agent"}', now(), now()),
  ('e0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'owner-test@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"TEST Owner","phone":"+234000000002","city":"Lagos","experience":"test owner"}', now(), now()),
  ('e0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'other-agent-test@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"TEST Other Agent","phone":"+234000000003","city":"Lagos","experience":"test agent"}', now(), now()),
  ('e0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'admin-test@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"TEST Admin","phone":"+234000000004","city":"Lagos","experience":"test admin"}', now(), now()),
  ('e0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'pending-agent-test@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"TEST Pending Agent","phone":"+234000000005","city":"Lagos","experience":"test agent"}', now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'agent', agent_status = 'active' where id in ('e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003');
update public.profiles set role = 'agent', agent_status = 'pending' where id = 'e0000000-0000-4000-8000-000000000005';
update public.profiles set role = 'owner' where id = 'e0000000-0000-4000-8000-000000000002';
update public.profiles set role = 'admin' where id = 'e0000000-0000-4000-8000-000000000004';

insert into public.properties (id, submitted_by, owner_id, title, city, area, property_type, bedrooms, nightly_rate, listing_status)
values
  ('e1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'TEST Agent listing', 'Lagos', 'Yaba', 'Apartment', 2, 80000, 'correction_requested'),
  ('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'TEST Offer listing', 'Lagos', 'Ikeja', 'Apartment', 1, 70000, 'approved');

insert into public.property_assignments (property_id, agent_id, assigned_by)
values ('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002');

insert into public.agent_offers (id, property_id, target_agent_id, offer_kind, status, created_by)
values ('e2000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'agent_payout', 'open', 'e0000000-0000-4000-8000-000000000002');

insert into public.agent_offer_versions (id, offer_id, version, amount, created_by)
values
  ('e3000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 1, 30000, 'e0000000-0000-4000-8000-000000000002'),
  ('e3000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000001', 2, 35000, 'e0000000-0000-4000-8000-000000000002');

update public.agent_offers set current_version_id = 'e3000000-0000-4000-8000-000000000002' where id = 'e2000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*)::integer from public.properties), 2, 'agent sees own submitted listing and assigned property');
select is((select count(*)::integer from public.agent_offers where target_agent_id = auth.uid()), 1, 'agent sees targeted deal-board offer');
select throws_ok(
  $$select public.accept_agent_offer('e2000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000001')$$,
  'P0001', 'Offer terms changed; refresh and review the current version', 'stale offer version cannot be accepted'
);
select lives_ok(
  $$select public.accept_agent_offer('e2000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000002')$$,
  'agent can accept the current offer version'
);
select is((select status::text from public.agent_offers where id = 'e2000000-0000-4000-8000-000000000001'), 'accepted', 'accepted offer status is persisted');
select lives_ok(
  $$select public.resubmit_corrected_listing('e1000000-0000-4000-8000-000000000001', 'TEST corrected listing', 'Lagos', 'Yaba', 'Apartment', 2, 81000, 'https://example.test/test-listing')$$,
  'submitting agent can resubmit requested corrections'
);
select is((select listing_status::text from public.properties where id = 'e1000000-0000-4000-8000-000000000001'), 'submitted', 'corrected listing returns to review');
select is((select count(*)::integer from public.agent_notifications where agent_id = auth.uid()), 2, 'offer acceptance and corrected listing create notifications');

select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select public.accept_agent_offer('e2000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000002')$$,
  'P0001', 'Offer is not assigned to this agent', 'another agent cannot accept the targeted offer'
);

select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.assign_property_agent('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000005')$$,
  'P0001', 'Agent is not active', 'owner cannot assign a pending agent'
);
select lives_ok(
  $$select public.request_listing_correction('e1000000-0000-4000-8000-000000000002', 'Please provide a current walkthrough link.')$$,
  'owner can request listing corrections'
);
select is((select listing_status::text from public.properties where id = 'e1000000-0000-4000-8000-000000000002'), 'correction_requested', 'owner correction request changes listing status');
select lives_ok(
  $$select public.publish_agent_offer('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'agent_payout', 42000)$$,
  'owner can publish a fixed agent payout for an assigned agent'
);
select is((select count(*)::integer from public.agent_offers where property_id = 'e1000000-0000-4000-8000-000000000002' and offer_kind = 'agent_payout' and status = 'open'), 1, 'fixed agent payout offer is visible as open');
select lives_ok(
  $$select public.publish_agent_offer('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'owner_net_rate', 260000)$$,
  'owner can publish an owner net-rate offer for an assigned agent'
);
select is((select count(*)::integer from public.agent_offers where property_id = 'e1000000-0000-4000-8000-000000000002' and offer_kind = 'owner_net_rate' and status = 'open'), 1, 'owner net-rate offer is visible as open');
select lives_ok(
  $$select public.revise_agent_offer((select id from public.agent_offers where property_id = 'e1000000-0000-4000-8000-000000000002' and offer_kind = 'agent_payout' and status = 'open' limit 1), 43000)$$,
  'owner can revise an open offer into a new terms version'
);
select is((select count(*)::integer from public.agent_offer_versions v join public.agent_offers o on o.id = v.offer_id where o.property_id = 'e1000000-0000-4000-8000-000000000002' and o.offer_kind = 'agent_payout' and o.status = 'open'), 2, 'revised fixed payout retains both immutable terms versions');

select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000004', true);
select lives_ok(
  $$select public.review_agent_application('e0000000-0000-4000-8000-000000000005', 'active')$$,
  'admin can approve a pending agent application'
);
select is((select agent_status::text from public.profiles where id = 'e0000000-0000-4000-8000-000000000005'), 'active', 'approved agent status is stored');
select lives_ok(
  $$select public.review_agent_listing('e1000000-0000-4000-8000-000000000001', 'approved')$$,
  'admin can approve a corrected listing after resubmission'
);
select is((select listing_status::text from public.properties where id = 'e1000000-0000-4000-8000-000000000001'), 'approved', 'reviewed listing status is stored');

select * from finish();
rollback;