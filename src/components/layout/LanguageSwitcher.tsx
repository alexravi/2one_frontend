"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/I18nContext";

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as "en" | "es" | "fr")}
      className="bg-transparent text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-0 cursor-pointer border-none"
    >
      <option value="en">English (EN)</option>
      <option value="es">Español (ES)</option>
      <option value="fr">Français (FR)</option>
    </select>
  );
}
