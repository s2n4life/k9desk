-- Add Scheduling and Service Area fields to BUSINESSES table
alter table businesses 
add column if not exists schedule_start_hour int default 9, -- 9 AM
add column if not exists schedule_end_hour int default 17, -- 5 PM
add column if not exists schedule_work_days int[] default '{1,2,3,4,5}', -- Mon-Fri
add column if not exists appointment_duration_minutes int default 60,
add column if not exists drive_buffer_minutes int default 30,
add column if not exists service_area_mode text default 'radius', -- 'radius' or 'zips'
add column if not exists service_area_zips text[] default '{}';
-- Note: 'service_radius' and 'center_zip' might be needed later if we switch mode
