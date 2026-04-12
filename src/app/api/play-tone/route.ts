import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const radioUrl = process.env.NEXT_PUBLIC_RADIO_SOCKET_URL || 'http://194.87.141.114:7777';
        
        console.log('[API] play-tone request:', body);
        
        const sessionId = req.headers.get('X-Session-Id');
        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'No session ID provided' },
                { status: 401 }
            );
        }
        
        const response = await fetch(`${radioUrl}/radio/dispatch/tone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId,
                'Authorization': 'Bearer changeme'
            },
            body: JSON.stringify({
                frequency: body.frequency,
                tone: body.tone
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
