"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { User, Globe, Bell, Lock, Trash2, CheckCircle2, Pencil, Camera, Loader2 } from "lucide-react";
import { getProfile, updateProfile, ApiError } from "@/lib/api";

// ── Helpers ────────────────────────────────────────────────
const COUNTRY_MAP: Record<string, string> = { us: "United States", in: "India", gb: "United Kingdom", de: "Germany", fr: "France", es: "Spain", br: "Brazil", mx: "Mexico" };
const LANG_MAP: Record<string, string> = { en: "English", es: "Spanish", fr: "French", hi: "Hindi", ta: "Tamil", de: "German", pt: "Portuguese", "": "None" };
const AGE_MAP: Record<string, string> = { "18-24": "18-24", "25-34": "25-34", "35-44": "35-44", "45-54": "45-54", "55+": "55+" };
const GENDER_MAP: Record<string, string> = { male: "Male", female: "Female", other: "Other", prefer_not_to_say: "Prefer not to say" };

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  ageRange: string;
  gender: string;
  primaryLanguage: string;
  secondaryLanguage: string;
}

// ── Component ──────────────────────────────────────────────
export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notifications
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyUpload, setNotifyUpload] = useState(true);
  const [notifyPayout, setNotifyPayout] = useState(true);

  // Profile state initialization with fallbacks
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    ageRange: "",
    gender: "",
    primaryLanguage: "en",
    secondaryLanguage: "",
  });
  const [editForm, setEditForm] = useState(profile);

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getProfile();
        const profileData = {
          fullName: data.name,
          email: data.email,
          phone: data.phone || "",
          country: data.country || "",
          ageRange: data.age_range || "",
          gender: data.gender || "",
          primaryLanguage: data.primary_language || "en",
          secondaryLanguage: data.secondary_language || "",
        };
        setProfile(profileData);
        setEditForm(profileData);
      } catch {
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleEdit = () => {
    setEditForm(profile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const originalProfile = { ...profile };

    try {
      // Optimistic update
      setProfile(editForm);
      setIsEditing(false);

      await updateProfile({
        name: editForm.fullName,
        phone: editForm.phone,
        country: editForm.country,
        age_range: editForm.ageRange,
        gender: editForm.gender,
        primary_language: editForm.primaryLanguage,
        secondary_language: editForm.secondaryLanguage,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // Revert on error
      setProfile(originalProfile);
      setEditForm(originalProfile);
      setIsEditing(true);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to update profile.");
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("File too large. Max 2 MB."); return; }
    if (!file.type.startsWith("image/")) { alert("Only image files are allowed."); return; }
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
  };

  // ── Read-only field helper ───────────────────────────────
  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value || "—"}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("settings.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your profile, preferences, security, and account.
          </p>
        </div>
        {!isEditing && (
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
        )}
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Settings saved successfully!
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
           {error}
        </div>
      )}

      {/* Hidden file input for avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {isEditing ? (
        /* ═══════════ EDIT MODE ═══════════ */
        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 py-4">
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <CardTitle className="text-base">{t("settings.profile")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="relative group"
                >
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" width={64} height={64} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl font-bold">
                      {editForm.fullName ? editForm.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <div>
                  <Button variant="outline" size="sm" type="button" onClick={handleAvatarClick}>Change Avatar</Button>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG. Max 2 MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("onboarding.full_name")}</label>
                  <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("auth.email")}</label>
                  <Input value={editForm.email} disabled />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Email cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <Input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+1 555-000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("onboarding.country")}</label>
                  <Select value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}>
                    <option value="">Select Country...</option>
                    {Object.entries(COUNTRY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("onboarding.age_range")}</label>
                  <Select value={editForm.ageRange} onChange={(e) => setEditForm({ ...editForm, ageRange: e.target.value })}>
                    <option value="">Select Range...</option>
                    {Object.entries(AGE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("onboarding.gender")}</label>
                  <Select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="">Select Gender...</option>
                    {Object.entries(GENDER_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 py-4">
              <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <CardTitle className="text-base">{t("settings.language_settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.ui_language")}</label>
                  <Select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "es" | "fr")}>
                    <option value="en">English (EN)</option>
                    <option value="es">Español (ES)</option>
                    <option value="fr">Français (FR)</option>
                  </Select>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Changes the interface language globally.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("onboarding.primary_language")}</label>
                  <Select value={editForm.primaryLanguage} onChange={(e) => setEditForm({ ...editForm, primaryLanguage: e.target.value })}>
                    {Object.entries(LANG_MAP).filter(([k]) => k).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("onboarding.secondary_language")}</label>
                  <Select value={editForm.secondaryLanguage} onChange={(e) => setEditForm({ ...editForm, secondaryLanguage: e.target.value })}>
                    {Object.entries(LANG_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 py-4">
              <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {[
                { label: "Email Notifications", desc: "Receive platform emails and updates", checked: notifyEmail, set: setNotifyEmail },
                { label: "Upload Status Alerts", desc: "Get notified when recordings are approved or rejected", checked: notifyUpload, set: setNotifyUpload },
                { label: "Payout Notifications", desc: "Get notified when payout is processed", checked: notifyPayout, set: setNotifyPayout },
              ].map((item, i) => (
                <React.Fragment key={item.label}>
                  {i > 0 && <div className="border-t border-gray-100 dark:border-gray-700" />}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.set(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </React.Fragment>
              ))}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 py-4">
              <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <CardTitle className="text-base">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Leave blank to keep your current password.</p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <Button type="submit">{t("settings.save")}</Button>
              <Button variant="outline" type="button" onClick={handleCancel}>{t("common.cancel")}</Button>
            </div>
            <Button variant="danger" type="button" size="sm" onClick={() => {
              if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) alert("Account deletion requested.");
            }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Account
            </Button>
          </div>
        </form>
      ) : (
        /* ═══════════ VIEW MODE ═══════════ */
        <div className="space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 py-4">
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <CardTitle className="text-base">{t("settings.profile")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-5 mb-6">
                <button onClick={handleAvatarClick} className="relative group">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" width={64} height={64} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl font-bold">
                       {profile.fullName ? profile.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{profile.fullName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-6">
                <Field label="Phone" value={profile.phone} />
                <Field label="Country" value={COUNTRY_MAP[profile.country] || profile.country} />
                <Field label="Age Range" value={AGE_MAP[profile.ageRange] || profile.ageRange} />
                <Field label="Gender" value={GENDER_MAP[profile.gender] || profile.gender} />
              </div>
            </CardContent>
          </Card>

          {/* Language */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 py-4">
              <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <CardTitle className="text-base">{t("settings.language_settings")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t("settings.ui_language")}</p>
                  <Select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "es" | "fr")} className="mt-1">
                    <option value="en">English (EN)</option>
                    <option value="es">Español (ES)</option>
                    <option value="fr">Français (FR)</option>
                  </Select>
                </div>
                <Field label="Primary Language" value={LANG_MAP[profile.primaryLanguage] || profile.primaryLanguage} />
                <Field label="Secondary Language" value={LANG_MAP[profile.secondaryLanguage] || "None"} />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 py-4">
              <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-5 gap-x-6">
                <Field label="Email Notifications" value={notifyEmail ? "Enabled" : "Disabled"} />
                <Field label="Upload Status Alerts" value={notifyUpload ? "Enabled" : "Disabled"} />
                <Field label="Payout Notifications" value={notifyPayout ? "Enabled" : "Disabled"} />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 py-4">
              <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <CardTitle className="text-base">Security</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Field label="Password" value="••••••••" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Click &quot;Edit Profile&quot; to change your password.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
