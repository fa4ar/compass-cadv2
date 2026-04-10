// src/app/layout.tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../context/SocketContext";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { UISettingsProvider } from "../context/UISettingsContext";
import Header from "@/components/Header";
import FooterBar from "@/components/Footer";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "cyrillic"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-ibm-plex-sans",
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
            className={`${ibmPlexSans.variable} h-full antialiased ui-hard`}
            suppressHydrationWarning
        >
            <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
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
