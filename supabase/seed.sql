-- ==============================================================================
-- St. Joseph Village 6 Phase 4 — Seed Data
-- ==============================================================================

-- Sample Homeowners with real St. Joseph Village 6 Phase 4 address patterns
INSERT INTO public.homeowners (
  id, full_name, ownership_type, gender, birthdate, address,
  household_count, contact_mobile, contact_email, pet_count,
  ga_proxy_name, ga_proxy_relationship, status
) VALUES 
(
  'a0000000-0000-0000-0000-000000000001',
  'Eduardo M. Santos',
  'Owner',
  'Male',
  '1975-04-12',
  'Block 12 Lot 8, St. Joseph Village 6 Phase 4',
  4,
  '0917-123-4567',
  'eduardo.santos@example.com',
  2,
  'Maria Teresa Santos',
  'Spouse',
  'Active'
),
(
  'a0000000-0000-0000-0000-000000000002',
  'Corazon V. Reyes',
  'Owner',
  'Female',
  '1968-11-23',
  'Block 7 Lot 15, St. Joseph Village 6 Phase 4',
  3,
  '0920-987-6543',
  'cory.reyes@example.com',
  1,
  'Jonathan Reyes',
  'Son',
  'Active'
),
(
  'a0000000-0000-0000-0000-000000000003',
  'Rafael James D. De Guzman',
  'Renter',
  'Male',
  '1988-08-15',
  'Block 19 Lot 4, St. Joseph Village 6 Phase 4',
  2,
  '0918-555-1234',
  'rj.deguzman@example.com',
  0,
  NULL,
  NULL,
  'Active'
),
(
  'a0000000-0000-0000-0000-000000000004',
  'Dr. Elizabeth T. Ramos',
  'Owner',
  'Female',
  '1972-03-09',
  'Block 4 Lot 22, St. Joseph Village 6 Phase 4',
  5,
  '0922-333-8899',
  'dr.ramos@example.com',
  3,
  'Ricardo Ramos',
  'Brother',
  'Active'
),
(
  'a0000000-0000-0000-0000-000000000005',
  'Arnold P. Bautista',
  'Renter',
  'Male',
  '1992-06-30',
  'Block 15 Lot 11, St. Joseph Village 6 Phase 4',
  1,
  '0919-444-7722',
  'arnold.bautista@example.com',
  0,
  NULL,
  NULL,
  'Inactive'
);

-- Seed Household Members
INSERT INTO public.household_members (homeowner_id, member_name, relationship) VALUES
('a0000000-0000-0000-0000-000000000001', 'Maria Teresa Santos', 'Spouse'),
('a0000000-0000-0000-0000-000000000001', 'Kevin James Santos', 'Son'),
('a0000000-0000-0000-0000-000000000001', 'Alyssa Marie Santos', 'Daughter'),
('a0000000-0000-0000-0000-000000000002', 'Jonathan Reyes', 'Son'),
('a0000000-0000-0000-0000-000000000002', 'Lourdes Villanueva', 'Mother'),
('a0000000-0000-0000-0000-000000000003', 'Patricia Anne Lim', 'Partner'),
('a0000000-0000-0000-0000-000000000004', 'Ricardo Ramos', 'Brother'),
('a0000000-0000-0000-0000-000000000004', 'Chloe Ramos', 'Niece'),
('a0000000-0000-0000-0000-000000000004', 'Elena Bautista', 'Household Helper');

-- Seed Activity Logs
INSERT INTO public.activity_logs (user_name, action, details) VALUES
('HOA Super Admin', 'SYSTEM_INITIALIZED', '{"message": "Database schema and seed records loaded successfully"}'::jsonb),
('HOA Super Admin', 'CREATED_HOMEOWNER', '{"homeowner": "Eduardo M. Santos", "address": "Block 12 Lot 8"}'::jsonb),
('HOA Super Admin', 'CREATED_HOMEOWNER', '{"homeowner": "Corazon V. Reyes", "address": "Block 7 Lot 15"}'::jsonb);
