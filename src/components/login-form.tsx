// components/LoginForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ ...props }: React.ComponentProps<typeof Card>) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const error = searchParams.get("error");
        const newUser = searchParams.get("newUser");

        if (accessToken && refreshToken) {
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);
            
            const cookieExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `accessToken=${accessToken}; path=/; expires=${cookieExpiry}`;
            document.cookie = `refreshToken=${refreshToken}; path=/; expires=${cookieExpiry}`;
            
            const targetUrl = newUser === "true" ? "/citizen?newUser=true" : "/citizen";
            window.location.href = targetUrl;
            return;
        }

        if (error) {
            setError("Failed to login with Discord. Please try again.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Ошибка входа");
            }

            if (data.tokens) {
                localStorage.setItem("accessToken", data.tokens.accessToken);
                localStorage.setItem("refreshToken", data.tokens.refreshToken);
            }

            window.location.href = "/citizen";
            return;
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscordLogin = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const response = await fetch(`${apiUrl}/api/auth/discord`);
            const data = await response.json();
            
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            setError("Failed to initiate Discord login");
        }
    };

    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>С возвращением</CardTitle>
                <CardDescription>
                    Войдите в аккаунт, чтобы продолжить
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="email">Эл. почта</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="password">Пароль</FieldLabel>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </Field>
                        {error && (
                            <div className="text-sm text-red-500 text-center">{error}</div>
                        )}
                        <FieldGroup>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Вход..." : "Войти"}
                            </Button>
                        </FieldGroup>
                    </FieldGroup>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">или</span>
                    </div>
                </div>

                <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border-[#5865F2]"
                    onClick={handleDiscordLogin}
                >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Войти через Discord
                </Button>

                <FieldDescription className="text-center mt-4">
                    Нет аккаунта?{" "}
                    <a href="/signup" className="text-blue-600 hover:underline">
                        Зарегистрироваться
                    </a>
                </FieldDescription>
            </CardContent>
        </Card>
    );
}
