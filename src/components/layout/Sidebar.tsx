"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { 
  LayoutDashboard, 
  Mic2, 
  Wallet, 
  Settings,
  UploadCloud
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/recordings", label: t("nav.recordings"), icon: Mic2 },
    { href: "/wallet", label: t("nav.wallet"), icon: Wallet },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
      <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700 mb-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          <Image src="/logo.png" alt="2une Logo" width={32} height={32} className="w-8 h-8 object-contain" />
          <span>2une</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
            JD
          </div>
          <div className="flex flex-col">
            <span className="text-gray-900 dark:text-gray-100">John Doe</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">john@example.com</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
