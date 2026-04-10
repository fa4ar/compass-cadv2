// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SocketProvider } from "../context/SocketContext";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { UISettingsProvider } from "../context/UISettingsContext";
import Header from "@/components/Header";
import FooterBar from "@/components/Footer";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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
            className="h-full antialiased ui-hard"
            suppressHydrationWarning
        >
            <body className="min-h-full flex flex-col bg-background text-foreground">
                <SocketProvider>
                    <AuthProvider>
                        <ThemeProvider>
                            <UISettingsProvider>
                                <TooltipProvider>
                                    <Header />
                                    <main className="flex-1 pb-10">
                                        {children}
                                    </main>
                                    <Toaster />
                                    <FooterBar />
                                </TooltipProvider>
                            </UISettingsProvider>
                        </ThemeProvider>
                    </AuthProvider>
                </SocketProvider>
            </body>
        </html>
    );
}
