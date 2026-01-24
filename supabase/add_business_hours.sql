-- Add business_hours JSONB column for per-day scheduling
-- Structure: { "monday": { "start": "09:00", "end": "17:00", "active": true }, ... }
alter table businesses 
add column if not exists business_hours jsonb default 
'{
  "monday": { "start": "09:00", "end": "17:00", "isOpen": true },
  "tuesday": { "start": "09:00", "end": "17:00", "isOpen": true },
  "wednesday": { "start": "09:00", "end": "17:00", "isOpen": true },
  "thursday": { "start": "09:00", "end": "17:00", "isOpen": true },
  "friday": { "start": "09:00", "end": "17:00", "isOpen": true },
  "saturday": { "start": "10:00", "end": "16:00", "isOpen": false },
  "sunday": { "start": "10:00", "end": "16:00", "isOpen": false }
}'::jsonb;
