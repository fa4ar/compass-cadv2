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
            document.cookie = `accessToken=${accessToken}; path=/; expires=${expires.toUTCString()}`;
            document.cookie = `refreshToken=${refreshToken}; path=/; expires=${expires.toUTCString()}`;
            
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