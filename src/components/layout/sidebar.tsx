"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ShieldCheck,
  LogOut,
  Home,
  ChevronRight,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { RoleBadge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const canViewDashboard = hasPermission(currentUser, "can_view_dashboard_stats");
  const canViewHomeowners = hasPermission(currentUser, "can_view_homeowner");
  const canCreateHomeowner = hasPermission(currentUser, "can_create_homeowner");
  const canManageUsers = hasPermission(currentUser, "can_manage_users");

  const navItems = [
    {
      name: "Executive Dashboard",
      href: "/",
      icon: LayoutDashboard,
      show: canViewDashboard,
    },
    {
      name: "Homeowners Registry",
      href: "/homeowners",
      icon: Users,
      show: canViewHomeowners,
    },
    {
      name: "Register Homeowner",
      href: "/homeowners/new",
      icon: UserPlus,
      show: canCreateHomeowner,
    },
    {
      name: "Board & Permissions",
      href: "/users",
      icon: ShieldCheck,
      show: canManageUsers,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#07162c] text-slate-200 border-r border-slate-800">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3.5 px-6 py-6 border-b border-slate-800/80 bg-[#040d1c]">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 via-teal-800 to-navy-950 text-white shadow-md border border-teal-500/30 shrink-0">
            <Home className="h-5 w-5 text-teal-300" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-teal-400" />
              HOA Masterlist
            </span>
            <span className="text-sm font-extrabold text-white leading-tight font-sans truncate">
              St. Joseph Village 6
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Phase 4 Board Portal</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3.5 py-3 space-y-1.5">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            System Modules
          </p>
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setMobileOpen(false);
                    if (pathname !== item.href && onNavigate) {
                      onNavigate();
                    }
                  }}
                  className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-teal-700 to-teal-800 text-white shadow-sm border border-teal-500/40 translate-x-0.5"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? "text-teal-300" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-teal-300" />}
                </Link>
              );
            })}
        </nav>
      </div>

      {/* Footer Sign Out */}
      <div className="p-4 border-t border-slate-800/80">
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4 text-slate-500 group-hover:text-red-300" />
          <span>Sign Out of Portal</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between bg-[#07162c] px-4 py-3.5 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-800 text-teal-300 shadow-sm">
            <Home className="h-4 w-4" />
          </div>
          <div>
            <span className="font-extrabold text-xs text-white uppercase tracking-wider block">
              St. Joseph Village 6
            </span>
            <span className="text-[10px] text-teal-400 font-medium">Phase 4 Masterlist</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white shadow-xs"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav aria-label="Mobile navigation" className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slide-up">
            {sidebarContent}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 border-r border-slate-800 flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>
    </>
  );
}
