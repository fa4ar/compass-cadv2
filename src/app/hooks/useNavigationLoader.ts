// src/hooks/useNavigationLoader.ts
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function useNavigationLoader() {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // При изменении пути показываем загрузку
        setIsLoading(true);

        // Минимальное время показа загрузки для плавности
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [pathname, searchParams]);

    return isLoading;
}