"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const { t } = useI18n();

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Password reset link sent!");
  };

  return (
    <Card className="px-4 py-8 sm:px-10">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Reset your password</h3>
        <p className="text-sm text-gray-500">
          Enter your email address and we will send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.email")}
          </label>
          <Input type="email" required placeholder="you@example.com" />
        </div>

        <Button type="submit" className="w-full">
          Send Reset Link
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Back to{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </Card>
  );
}
