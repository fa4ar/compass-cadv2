// app/signup/page.tsx
import { SignupForm } from "../../../components/signup-form";

export const metadata = {
    title: "Sign Up",
    description: "Create a new account",
};

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <SignupForm className="w-full max-w-md" />
        </div>
    );
}