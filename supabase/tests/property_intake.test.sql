begin;
select plan(13);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'f0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'intake-admin-test@example.test', '',
  now(), '{"provider":"email","providers":["email"]}',
  '{"display_name":"Intake Admin","phone":"+234000000010","city":"Lagos","experience":"admin test"}',
  now(), now()
) on conflict (id) do nothing;

update public.profiles set role = 'admin'
where id = 'f0000000-0000-4000-8000-000000000001';

set local role anon;
select lives_ok(
  $$insert into public.property_intake_submissions (
    contact_name, contact_phone, submitter_role, property_title, city, area,
    property_type, bedrooms, bathrooms, max_guests, nightly_rate, photos_url,
    confirms_authority_to_submit
  ) values (
    'Intake Test Owner', '+234800000010', 'Owner', 'Test shortlet intake',
    'Lagos', 'Lekki Phase 1', 'Apartment', 2, 2, 4, 85000,
    'https://example.test/property-walkthrough', true
  )$$,
  'anonymous visitor can submit an intake record'
);

select throws_ok(
  $$select count(*) from public.property_intake_submissions$$,
  '42501',
  'permission denied for table property_intake_submissions',
  'anonymous visitor cannot read intake records'
);

select throws_ok(
  $$update public.property_intake_submissions set status = 'accepted'$$,
  '42501',
  'permission denied for table property_intake_submissions',
  'anonymous visitor cannot update intake records'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.property_intake_submissions),
  1,
  'admin can read submitted intake'
);

select lives_ok(
  $select public.convert_property_intake_to_listing((select id from public.property_intake_submissions limit 1))$,
  'admin can convert intake into a listing review record'
);

select is(
  (select status from public.property_intake_submissions limit 1),
  'accepted',
  'converted intake is marked accepted'
);

select ok(
  (select converted_property_id is not null from public.property_intake_submissions limit 1),
  'intake stores the created property reference'
);

select is(
  (select listing_status::text from public.properties where id = (select converted_property_id from public.property_intake_submissions limit 1)),
  'submitted',
  'converted property enters the existing review queue, not public publication'
);

reset role;
set local role anon;
select is(
  (select count(id)::integer from public.properties),
  0,
  'public visitor cannot discover a submitted but unapproved listing'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.review_agent_listing(
    (select converted_property_id from public.property_intake_submissions limit 1),
    'approved'
  )$$,
  'admin can approve a property through the review workflow'
);

reset role;
set local role anon;
select is(
  (select count(id)::integer from public.properties),
  1,
  'public visitor can discover an approved listing'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.admin_set_property_suspension(
    (select converted_property_id from public.property_intake_submissions limit 1),
    true
  )$$,
  'admin can suspend an approved property'
);

reset role;
set local role anon;
select is(
  (select count(id)::integer from public.properties),
  0,
  'public visitor cannot discover a suspended listing'
);

select * from finish();
rollback;
