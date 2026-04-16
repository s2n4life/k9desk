export async function geocodeAddress(address: string): Promise<[number, number] | null> {
    if (!address) return null;
    
    // Check localStorage cache
    const cacheKey = `geo_${address.toLowerCase().trim()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length === 2) return parsed as [number, number];
        } catch (e) {
            // Error parsing cache, will refetch
        }
    }

    try {
        const query = encodeURIComponent(address);
        // Query our own secure Next.js backend to bypass browser CORS constraints
        const res = await fetch(`/api/geocode?q=${query}`);
        const data = await res.json();
        
        if (data && data.length > 0) {
            const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            localStorage.setItem(cacheKey, JSON.stringify(coords));
            return coords;
        }
        
        // Cache failed requests to prevent spamming
        localStorage.setItem(cacheKey, JSON.stringify(null));
        return null;
    } catch (err) {
        console.error('Geocoding failed:', err);
        return null;
    }
}
