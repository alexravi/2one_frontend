"use client";

import React from "react";

import { LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useAuth } from "@/lib/AuthContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Navbar() {
  const { t } = useI18n();
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-6 sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        
        <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700" />


        
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t("nav.logout")}
        </button>
      </div>
    </header>
  );
}

