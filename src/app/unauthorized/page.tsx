'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-900/20 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">Access Denied</h1>
                <p className="text-zinc-400 mb-6">
                    You don't have permission to access this page. 
                    Please contact an administrator if you believe this is an error.
                </p>
                <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                    <Link href="/citizen">
                        <Button className="bg-blue-600 hover:bg-blue-500">
                            Go to Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}