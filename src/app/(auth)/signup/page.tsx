"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useAuth } from "@/lib/AuthContext";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { TermsDialog } from "@/components/auth/TermsDialog";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { app as firebaseApp } from "@/lib/firebase";

export default function SignupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { googleLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'email'} | {type: 'google', token: string} | null>(null);

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setPendingAction({ type: 'email' });
    setIsTermsOpen(true);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError("");
      const auth = getAuth(firebaseApp);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.idToken) {
        setPendingAction({ type: 'google', token: credential.idToken });
        setIsTermsOpen(true);
      } else {
        setError("Could not retrieve Google signup token.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Google sign-up failed. Please try again.");
      } else {
        setError("Google sign-up failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTermsAccept = async () => {
    setIsTermsOpen(false);

    if (pendingAction?.type === 'email') {
      sessionStorage.setItem("signup_email", email);
      sessionStorage.setItem("signup_password", password);
      router.push("/onboarding");
    } else if (pendingAction?.type === 'google') {
      try {
        setIsLoading(true);
        await googleLogin(pendingAction.token);
        router.push("/");
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Google registration failed. Please try again.");
        }
        setIsLoading(false);
      }
    }
  };

  return (
    <Card className="px-4 py-8 sm:px-10">
      <form onSubmit={handleSignupSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.email")}
          </label>
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.password")}
          </label>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.confirm_password")}
          </label>
          <Input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Loading..." : t("auth.signup")}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <GoogleButton 
            onClick={handleGoogleSignIn} 
            disabled={isLoading} 
            text="Sign up with Google" 
          />
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            {t("auth.login")}
          </Link>
        </p>
      </div>

      <TermsDialog 
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAccept={handleTermsAccept}
      />
    </Card>
  );
}
