// components/ConnectBadge.tsx
"use client";

import { useSocket } from "@/context/SocketContext";
import { Badge } from "@/components/ui/badge";

export default function ConnectBadge() {
    const { isConnected } = useSocket();

    return (
        <div className="fixed top-4 right-4 z-50">
            <Badge
                variant={isConnected ? "default" : "destructive"}
                className="flex items-center gap-2 px-3 py-1"
            >
                <span
                    className={`w-2 h-2 rounded-full ${
                        isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                    }`}
                />
                {isConnected ? "Подключено" : "Отключено"}
            </Badge>
        </div>
    );
}
