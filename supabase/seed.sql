-- LOCAL DEVELOPMENT ONLY. Never run this seed against production.
-- Sign-in credentials are intentionally public test credentials:
-- hamlet-agent-dev@example.test / Hamlet-Dev-Only-2026
-- hamlet-owner-dev@example.test / Hamlet-Dev-Only-2026
-- hamlet-admin-dev@example.test / Hamlet-Dev-Only-2026
set search_path = public, extensions;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('d0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'hamlet-agent-dev@example.test', crypt('Hamlet-Dev-Only-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"DEV Agent Ada","phone":"+234000000001","city":"Lagos","experience":"2 development years","service_areas":["Lagos"]}', now(), now()),
  ('d0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'hamlet-owner-dev@example.test', crypt('Hamlet-Dev-Only-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"DEV Owner Tunde","phone":"+234000000002","city":"Lagos","experience":"Development owner"}', now(), now()),
  ('d0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'hamlet-admin-dev@example.test', crypt('Hamlet-Dev-Only-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"DEV Admin","phone":"+234000000003","city":"Lagos","experience":"Development administrator"}', now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'agent', agent_status = 'active' where id = 'd0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'owner' where id = 'd0000000-0000-4000-8000-000000000002';
update public.profiles set role = 'admin' where id = 'd0000000-0000-4000-8000-000000000003';

insert into public.properties (
  id, submitted_by, owner_id, title, city, area, property_type, bedrooms,
  address, listing_url, nightly_rate, listing_status, correction_request
) values (
  'd1000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002',
  'DEV Sample Lekki Apartment', 'Lagos', 'Lekki Phase 1', 'Apartment', 2,
  'DEVELOPMENT ADDRESS ONLY', 'https://example.test/dev-listing', 125000,
  'correction_requested', 'DEV REQUEST: attach a current walkthrough video.'
)
on conflict (id) do nothing;

insert into public.property_assignments (property_id, agent_id, assigned_by)
values ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002')
on conflict do nothing;

insert into public.agent_offers (id, property_id, target_agent_id, offer_kind, status, created_by)
values
  ('d2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'agent_payout', 'open', 'd0000000-0000-4000-8000-000000000002'),
  ('d2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner_net_rate', 'open', 'd0000000-0000-4000-8000-000000000002'),
  ('d2000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'agent_payout', 'accepted', 'd0000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into public.agent_offer_versions (id, offer_id, version, amount, created_by)
values
  ('d3000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 1, 40000, 'd0000000-0000-4000-8000-000000000002'),
  ('d3000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 2, 45000, 'd0000000-0000-4000-8000-000000000002'),
  ('d3000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000002', 1, 250000, 'd0000000-0000-4000-8000-000000000002'),
  ('d3000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000003', 1, 45000, 'd0000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

update public.agent_offers set current_version_id = 'd3000000-0000-4000-8000-000000000002' where id = 'd2000000-0000-4000-8000-000000000001';
update public.agent_offers set current_version_id = 'd3000000-0000-4000-8000-000000000003' where id = 'd2000000-0000-4000-8000-000000000002';
update public.agent_offers set current_version_id = 'd3000000-0000-4000-8000-000000000004', accepted_at = now() where id = 'd2000000-0000-4000-8000-000000000003';

insert into public.agent_bookings (
  id, property_id, agent_id, offer_version_id, guest_reference, check_in,
  check_out, accommodation_total, status, settlement_status
) values (
  'd4000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000004',
  'DEV-BK-003', current_date + 14, current_date + 17, 375000,
  'requested', 'not_integrated'
)
on conflict (id) do nothing;

insert into public.agent_notifications (id, agent_id, event_type, message)
values
  ('d5000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'development_fixture', 'DEV SAMPLE: Owner requested an updated property walkthrough.'),
  ('d5000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'development_fixture', 'DEV SAMPLE: Review fixed agent payout offer terms v2.')
on conflict (id) do nothing;