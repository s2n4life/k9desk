-- Check if the lead was created and what business_id it has
SELECT 
    l.id,
    l.business_id,
    l.owner_name,
    l.owner_phone,
    l.status,
    l.created_at,
    b.name as business_name,
    b.slug as business_slug
FROM leads l
LEFT JOIN businesses b ON l.business_id = b.id
ORDER BY l.created_at DESC
LIMIT 10;

-- Also check the businesses table to see Fred's Grooming details
SELECT id, name, slug, owner_id
FROM businesses
WHERE slug = 'fredsgrooming' OR name ILIKE '%fred%';
