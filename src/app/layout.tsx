// src/app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../context/SocketContext";
import { AuthProvider } from "../context/AuthContext";
import Header from "@/components/Header";
import FooterBar from "@/components/Footer";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const dmSans = DM_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800", "900"],
    variable: "--font-dm",
    display: "swap",
});

const jetbrains = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Compass CAD",
    description: "Compass CAD System",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="ru"
            className={`${dmSans.variable} ${jetbrains.variable} h-full antialiased dark`}
            suppressHydrationWarning
        >
            <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                <SocketProvider>
                    <AuthProvider>
                        <TooltipProvider>
                            <Header />
                            <main className="flex-1 pb-10"> {/* pb-10 to account for the footer height */}
                                {children}
                            </main>
                            <Toaster />
                            <FooterBar />
                        </TooltipProvider>
                    </AuthProvider>
                </SocketProvider>
            </body>
        </html>
    );
}
