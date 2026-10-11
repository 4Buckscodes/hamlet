-- Expand public property intake to support the wider HAMLET Partner Network.
alter table public.property_intake_submissions
  drop constraint if exists property_intake_submissions_submitter_role_check;

alter table public.property_intake_submissions
  add constraint property_intake_submissions_submitter_role_check
  check (submitter_role in (
    'Owner',
    'Property manager',
    'Agent',
    'Shortlet operator',
    'Co-host / hospitality operator',
    'Referral partner',
    'Other authorised partner'
  ));
