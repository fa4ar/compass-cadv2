"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation"; // ✅ Правильный импорт для навигации

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        router.push("/auth/login");
    }, [router]);

    return (
        <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">

        </div>
    );
}