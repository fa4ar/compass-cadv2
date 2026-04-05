// src/components/LoadingScreen.tsx
'use client';

interface LoadingScreenProps {
    isLoading: boolean;
}

export default function LoadingScreen({ isLoading }: LoadingScreenProps) {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
