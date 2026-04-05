// src/components/GlobalLoader.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import LoadingScreen from './LoadingScreen';

function NavigationEvents() {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        setIsLoading(true);

        // Имитация загрузки данных
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [pathname, searchParams]);

    return <LoadingScreen isLoading={isLoading} />;
}

export default function GlobalLoader() {
    return (
        <Suspense fallback={null}>
            <NavigationEvents />
        </Suspense>
    );
}