import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const radioUrl = process.env.NEXT_PUBLIC_RADIO_SOCKET_URL || 'http://194.87.141.114:7777';
        
        console.log('[API] dispatch/user/alert request:', body);
        
        const sessionId = req.headers.get('X-Session-Id');
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer changeme'
        };
        
        if (sessionId) {
            headers['X-Session-Id'] = sessionId;
        }
        
        const response = await fetch(`${radioUrl}/dispatch/user/alert`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`Radio server returned ${response.status}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API] Failed to send user alert:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send user alert' },
            { status: 500 }
        );
    }
}
