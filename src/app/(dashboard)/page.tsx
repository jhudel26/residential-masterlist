"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartSkeleton } from "@/components/ui/card-skeleton";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";
import {
  Users,
  Home,
  Heart,
  PawPrint,
  UserPlus,
  ShieldCheck,
  Building,
  FileSpreadsheet,
  Sparkles,
  Database,
} from "lucide-react";
import { exportHomeownersToExcel } from "@/lib/excel-export";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/error-utils";
import { BackupRestoreModal } from "@/components/dashboard/backup-restore-modal";

const DemographicsCharts = dynamic(
  () => import("@/components/dashboard/demographics-chart").then((mod) => mod.DemographicsCharts),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export default function DashboardPage() {
  const { currentUser, homeowners, activityLogs } = useApp();
  const { success, error: toastError } = useToast();
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  const canViewStats = hasPermission(currentUser, "can_view_dashboard_stats");
  const canCreateHomeowner = hasPermission(currentUser, "can_create_homeowner");
  const canExport = hasPermission(currentUser, "can_export_excel");

  // Metrics calculations
  const totalHomeowners = homeowners.length;
  const activeHomeowners = homeowners.filter((h) => h.status === "Active").length;
  const inactiveHomeowners = homeowners.filter((h) => h.status === "Inactive").length;

  const totalHouseholdMembers = homeowners.reduce(
    (acc, curr) => acc + (curr.household_members?.length || 0),
    0
  );
  const totalResidents = totalHomeowners + totalHouseholdMembers;

  const ownersCount = homeowners.filter((h) => h.ownership_type === "Owner").length;
  const rentersCount = homeowners.filter((h) => h.ownership_type === "Renter").length;
  const ownerPercent = totalHomeowners > 0 ? Math.round((ownersCount / totalHomeowners) * 100) : 0;
  const activePercent = totalHomeowners > 0 ? Math.round((activeHomeowners / totalHomeowners) * 100) : 0;

  const totalPets = homeowners.reduce((acc, curr) => acc + (curr.pet_count || 0), 0);

  // Time-based greeting
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const handleExport = async () => {
    try {
      await exportHomeownersToExcel(homeowners);
      success("Export Complete", "Exported full homeowners registry to Excel.");
    } catch (err: unknown) {
      toastError("Export Failed", getErrorMessage(err));
    }
  };

  if (!canViewStats) {
    return (
      <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle max-w-lg mx-auto my-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 mx-auto mb-4">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Dashboard Restricted</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Your staff account does not currently have permissions to view community analytics.
          Contact the HOA Super Admin to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-0 min-w-0 -m-4 sm:-m-6 lg:-m-8">
      {/* Left: Main Dashboard Content */}
      <div className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Executive Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#040d1c] via-[#07162c] to-[#0c2340] text-white p-7 sm:p-9 shadow-glass border border-white/10">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -bottom-16 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-teal-300 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                <span>St. Joseph Village 6 Phase 4 &bull; Executive Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
                {timeGreeting}, {currentUser?.full_name?.split(" ")[0] || "Officer"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Phase 4 Homeowners Masterlist is currently tracking <span className="font-bold text-white">{totalHomeowners} residential properties</span> and <span className="font-bold text-white">{totalResidents} total occupants</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBackupOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold backdrop-blur-md h-10 px-3.5"
              >
                <Database className="h-4 w-4 mr-2 text-teal-300" />
                <span>Backup / Restore</span>
              </Button>

              {canExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold backdrop-blur-md h-10 px-4"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-teal-300" />
                  <span>Export Masterlist</span>
                </Button>
              )}

              {canCreateHomeowner && (
                <Link href="/homeowners/new">
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-500 text-white border border-teal-400/30 shadow-lg shadow-teal-950/40 font-bold h-10 px-4 gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Register Homeowner</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 5 Core Metric Cards in Modern Bento Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          <StatCard
            title="Total Homeowners"
            value={totalHomeowners}
            subtitle={`${activeHomeowners} Active • ${inactiveHomeowners} Archived`}
            icon={Building}
            variant="teal"
            badgeText={`${totalHomeowners} Units`}
          />

          <StatCard
            title="Total Residents"
            value={totalResidents}
            subtitle={`${totalHouseholdMembers} Household Members`}
            icon={Users}
            variant="emerald"
            progressPercent={activePercent}
          />

          <StatCard
            title="Occupancy Profile"
            value={`${ownerPercent}%`}
            subtitle={`${ownersCount} Owners • ${rentersCount} Renters`}
            icon={Home}
            variant="navy"
            progressPercent={ownerPercent}
          />

          <StatCard
            title="Active Registry"
            value={`${activePercent}%`}
            subtitle={`${activeHomeowners} in Good Standing`}
            icon={Heart}
            variant="gold"
            progressPercent={activePercent}
          />

          <StatCard
            title="Registered Pets"
            value={totalPets}
            subtitle="Phase 4 Canine & Feline Census"
            icon={PawPrint}
            variant="slate"
            badgeText="Verified"
          />
        </div>

        {/* Visual Demographics & Interactive Analytics */}
        <DemographicsCharts homeowners={homeowners} />
      </div>

      {/* Right: Activity Sidebar — visible only on xl+ screens */}
      <aside className="hidden xl:flex flex-col w-72 2xl:w-80 shrink-0 border-l border-slate-200/80 dark:border-[#1e2f4d]/80 bg-white dark:bg-[#0e192d] self-stretch">
        <div className="sticky top-0 h-screen overflow-y-auto p-4">
          <RecentActivity logs={activityLogs} />
        </div>
      </aside>

      {/* Backup & Disaster Recovery Modal */}
      <BackupRestoreModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </div>
  );
}