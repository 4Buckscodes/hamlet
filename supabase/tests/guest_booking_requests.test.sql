begin;
select plan(13);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'b0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'booking-admin@example.test', '',
  now(), '{"provider":"email","providers":["email"]}',
  '{"display_name":"Booking Admin","phone":"+234800000031","city":"Lagos","experience":"admin test"}',
  now(), now()
) on conflict (id) do nothing;

update public.profiles set role = 'admin'
where id = 'b0000000-0000-4000-8000-000000000001';

insert into public.properties (
  id, submitted_by, owner_id, title, city, area, property_type, bedrooms,
  bathrooms, max_guests, nightly_rate, photos_url, listing_status, is_suspended
) values
  ('b1000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001',
   'TEST approved Lagos shortlet', 'Lagos', 'Lekki Phase 1', 'Apartment',
   2, 2, 4, 100000, 'https://example.test/shortlet.jpg', 'approved', false),
  ('b1000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001',
   'TEST unapproved Lagos shortlet', 'Lagos', 'Yaba', 'Apartment',
   1, 1, 2, 50000, 'https://example.test/unapproved.jpg', 'submitted', false);

set local role anon;
select lives_ok(
  $$select * from public.submit_guest_booking_request(
    'b1000000-0000-4000-8000-000000000001',
    'TEST Guest One', 'guest-one@example.test', '+234800000032',
    '2026-11-01', '2026-11-03', 2::smallint, 'Arrival after 4pm'
  )$$,
  'guest can request an approved Lagos property'
);

select throws_ok(
  $$select * from public.submit_guest_booking_request(
    'b1000000-0000-4000-8000-000000000002',
    'TEST Guest Two', 'guest-two@example.test', '+234800000033',
    '2026-11-01', '2026-11-03', 1::smallint, ''
  )$$,
  'P0001', 'This property is not available for booking requests',
  'guest cannot request an unapproved property'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select accommodation_subtotal from public.guest_booking_requests where guest_phone = '+234800000032'),
  200000::bigint,
  'booking snapshots the accommodation subtotal for two nights'
);
select is(
  (select hamlet_service_fee from public.guest_booking_requests where guest_phone = '+234800000032'),
  6000::bigint,
  'booking calculates the guest-only 3% HAMLET fee'
);
select is(
  (select guest_total from public.guest_booking_requests where guest_phone = '+234800000032'),
  206000::bigint,
  'guest total includes the 3% fee with no extra owner fee'
);
select is(
  (select status::text from public.guest_booking_requests where guest_phone = '+234800000032'),
  'requested',
  'new booking request is not prematurely confirmed'
);

select lives_ok(
  $$select public.set_guest_booking_status(
    (select id from public.guest_booking_requests where guest_phone = '+234800000032'),
    'awaiting_payment',
    now() + interval '30 minutes'
  )$$,
  'admin can move a request to the payment step'
);

select lives_ok(
  $$select public.admin_mark_booking_payment_verified(
    (select id from public.guest_booking_requests where guest_phone = '+234800000032'),
    'TEST_PROVIDER', 'TEST-PAYMENT-0001', 206000
  )$$,
  'admin can record a payment verified against the provider dashboard'
);

select is(
  (select status::text from public.guest_booking_requests where guest_phone = '+234800000032'),
  'confirmed',
  'booking confirms only after a matching verified payment'
);
select is(
  (select payment_status::text from public.guest_booking_requests where guest_phone = '+234800000032'),
  'paid',
  'verified payment status is persisted'
);

reset role;
set local role anon;
select lives_ok(
  $$select * from public.submit_guest_booking_request(
    'b1000000-0000-4000-8000-000000000001',
    'TEST Guest Three', 'guest-three@example.test', '+234800000034',
    '2026-11-02', '2026-11-04', 2::smallint, 'Overlapping request'
  )$$,
  'another guest may request dates while availability is being checked'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.set_guest_booking_status(
    (select id from public.guest_booking_requests where guest_phone = '+234800000034'),
    'awaiting_payment',
    now() + interval '30 minutes'
  )$$,
  'admin can prepare the second request for payment'
);

select throws_ok(
  $$select public.admin_mark_booking_payment_verified(
    (select id from public.guest_booking_requests where guest_phone = '+234800000034'),
    'TEST_PROVIDER', 'TEST-PAYMENT-0002', 206000
  )$$,
  '23P01', 'conflicting key value violates exclusion constraint "guest_booking_no_overlapping_confirmed_stays"',
  'overlapping confirmed stays are rejected'
);

select * from finish();
rollback;
