import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const radioUrl = process.env.NEXT_PUBLIC_RADIO_SOCKET_URL || 'http://194.87.141.114:7777';
        
        console.log('[API] play-tone request:', body);
        
        const sessionId = req.headers.get('X-Session-Id');
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer changeme'
        };
        
        if (sessionId) {
            headers['X-Session-Id'] = sessionId;
        }
        
        const response = await fetch(`${radioUrl}/radio/dispatch/alert/trigger`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                frequency: body.frequency,
                alertType: 'SIGNAL 100',
                alertConfig: {
                    name: 'CODE 100',
                    color: '#ff0000',
                    isPersistent: false,
                    tone: body.tone
                }
            })
        });
        
        const data = await response.json();
        console.log('[API] play-tone response:', data);
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API] play-tone error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to connect to radio server' },
            { status: 500 }
        );
    }
}
