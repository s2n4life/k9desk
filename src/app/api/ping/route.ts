/**
 * Test endpoint to verify API routes work
 */

export async function GET() {
    return new Response(
        JSON.stringify({ test: 'ok' }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}
