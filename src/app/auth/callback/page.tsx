'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AuthCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const newUser = searchParams.get('newUser');

        if (accessToken && refreshToken) {
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            
            const expires = new Date();
            expires.setDate(expires.getDate() + 7);
            const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
            
            let domain = '';
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                const parts = hostname.split('.');
                if (parts.length >= 2) {
                    domain = `; domain=.${parts.slice(-2).join('.')}`;
                }
            }
            
            const cookieOptions = `; path=/; expires=${expires.toUTCString()}${domain}${isSecure ? '; Secure; SameSite=Lax' : ''}`;
            
            document.cookie = `accessToken=${accessToken}${cookieOptions}`;
            document.cookie = `refreshToken=${refreshToken}${cookieOptions}`;
            
            window.location.href = newUser === 'true' ? '/?newUser=true' : '/';
        } else {
            router.replace('/auth/login');
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="text-zinc-400">Loading...</div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="text-zinc-400">Loading...</div></div>}>
            <AuthCallbackContent />
        </Suspense>
    );
}