// src/app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
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
    display: "optional",
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
            className={`${dmSans.variable} h-full antialiased dark`}
            suppressHydrationWarning
        >
            <body className="min-h-full flex flex-col bg-background text-foreground">
                <SocketProvider>
                    <AuthProvider>
                        <TooltipProvider>
                            <Header />
                            <main className="flex-1 pb-10">
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
