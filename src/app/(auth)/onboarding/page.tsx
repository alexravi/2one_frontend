"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useAuth } from "@/lib/AuthContext";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export default function OnboardingPage() {
  const { t } = useI18n();
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [secondaryLanguage, setSecondaryLanguage] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if no signup credentials
  useEffect(() => {
    const email = sessionStorage.getItem("signup_email");
    if (!email) {
      router.push("/signup");
    }
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const email = sessionStorage.getItem("signup_email");
    const password = sessionStorage.getItem("signup_password");

    if (!email || !password) {
      setError("Registration session expired. Please sign up again.");
      setIsLoading(false);
      router.push("/signup");
      return;
    }

    try {
      await register({
        email,
        password,
        name,
        country: country || undefined,
        primary_language: primaryLanguage || undefined,
        secondary_language: secondaryLanguage || undefined,
      });

      // Clean up session storage
      sessionStorage.removeItem("signup_email");
      sessionStorage.removeItem("signup_password");

      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="px-4 py-8 sm:px-10">
      <div className="mb-6 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">
          {t("onboarding.title") || "Complete your profile"}
        </h3>
        <p className="text-sm text-gray-500">
          Tell us a bit about yourself before starting
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("onboarding.full_name") || "Full Name"}
          </label>
          <Input
            type="text"
            required
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("onboarding.country") || "Country"}
          </label>
          <Input
            type="text"
            required
            placeholder="United States"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("onboarding.primary_language") || "Primary Language"}
          </label>
          <Select
            required
            value={primaryLanguage}
            onChange={(e) => setPrimaryLanguage(e.target.value)}
            disabled={isLoading}
          >
            <option value="" disabled>Select language...</option>
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="Hindi">Hindi</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("onboarding.secondary_language") || "Secondary Language (optional)"}
          </label>
          <Select
            value={secondaryLanguage}
            onChange={(e) => setSecondaryLanguage(e.target.value)}
            disabled={isLoading}
          >
            <option value="" disabled>Select language...</option>
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="Hindi">Hindi</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("onboarding.age_range") || "Age Range"}
            </label>
            <Select
              required
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              disabled={isLoading}
            >
               <option value="" disabled>Select...</option>
               <option value="18-24">18-24</option>
               <option value="25-34">25-34</option>
               <option value="35-44">35-44</option>
               <option value="45+">45+</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("onboarding.gender") || "Gender (optional)"}
            </label>
            <Select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={isLoading}
            >
               <option value="" disabled>Select...</option>
               <option value="male">Male</option>
               <option value="female">Female</option>
               <option value="other">Other</option>
               <option value="prefer_not_to_say">Prefer not to say</option>
            </Select>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account…" : t("onboarding.save_continue") || "Save & Continue"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
