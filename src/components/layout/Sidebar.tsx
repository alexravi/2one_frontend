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
  UploadCloud,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/recordings", label: t("nav.recordings"), icon: Mic2 },
    { href: "/palm-project", label: t("nav.palm_collection"), icon: UploadCloud },
    { href: "/wallet", label: t("nav.wallet"), icon: Wallet },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={cn("h-16 flex items-center border-b border-gray-100 dark:border-gray-700 mb-4 relative", isCollapsed ? "justify-center px-0" : "px-6")}>
        <Link href="/" className={cn("flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100", isCollapsed && "justify-center")}>
          <Image src="/logo.png" alt="2une Logo" width={32} height={32} className="w-8 h-8 object-contain" />
          {!isCollapsed && <span>2une</span>}
        </Link>
        <button 
          onClick={onToggle} 
          className="absolute -right-3 top-5 p-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hidden md:flex items-center justify-center z-50 transition-colors shadow-sm"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", isCollapsed && "rotate-180")} />
        </button>
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
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
                isCollapsed && "justify-center px-0"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400")} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors",
            isCollapsed && "justify-center px-0"
          )}
          title={isCollapsed && user ? user.name : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex flex-shrink-0 items-center justify-center font-bold text-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-gray-900 dark:text-gray-100 truncate">{user?.name || "User"}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email || ""}</span>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
