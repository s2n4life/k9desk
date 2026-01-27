-- Check all leads in the database
SELECT 
    id,
    business_id,
    owner_name,
    owner_phone,
    status,
    created_at
FROM leads
ORDER BY created_at DESC;
