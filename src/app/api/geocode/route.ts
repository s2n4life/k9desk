import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    
    if (!q) {
        return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    try {
        const query = encodeURIComponent(q);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`, {
            headers: {
                'User-Agent': 'K9Desk-CRM/1.0', // Safe to set server-side
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`Nominatim returned ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Geocoding Proxy Error:', error);
        return NextResponse.json({ error: 'Failed to fetch coordinates' }, { status: 500 });
    }
}
