/**
 * Ultra-Simple Public Health Check
 * NO imports, NO dependencies, NO authentication
 */

export async function GET() {
    return new Response(
        JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString()
        }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        }
    );
}

export async function HEAD() {
    return new Response(null, { status: 200 });
}
