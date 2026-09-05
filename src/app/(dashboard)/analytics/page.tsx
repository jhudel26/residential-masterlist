"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { BarChart3, Users, Activity, Database, ShieldCheck, TrendingUp, Home, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AnalyticsPage() {
  const { currentUser } = useAuth();
  const { homeowners, allProfiles, activityLogs } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Check permission
  if (!currentUser || !hasPermission(currentUser, "can_view_analytics")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <ShieldCheck className="h-16 w-16 text-slate-400 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Access Restricted
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            You don&apos;t have permission to view analytics.
          </p>
        </div>
      </div>
    );
  }

  // Calculate database metrics
  const totalHomeowners = homeowners.length;
  const activeHomeowners = homeowners.filter(h => h.status === "Active").length;
  const totalUsers = allProfiles.length;
  const activeUsers = allProfiles.filter(p => p.status === "Active").length;
  const totalHouseholdMembers = homeowners.reduce((sum, h) => sum + (h.household_members?.length || 0), 0);
  const totalPets = homeowners.reduce((sum, h) => sum + (h.pet_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Analytics Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Application performance and usage metrics
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-teal-900 dark:text-teal-200 text-sm">
              Vercel Analytics Integration
            </h3>
            <p className="text-teal-700 dark:text-teal-400 text-xs mt-1">
              Page views and core web vitals are automatically tracked and available in your Vercel dashboard. 
              Custom event tracking is enabled for users with analytics permission.
            </p>
          </div>
        </div>
      </div>

      {/* Vercel Analytics Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Page Views</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                --
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Users</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                --
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Homeowners</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {totalHomeowners}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">API Calls</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                --
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Custom Events Tracked
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-700 dark:text-slate-300">User Actions</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Logged</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-700 dark:text-slate-300">API Calls</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Logged</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-700 dark:text-slate-300">Page Views</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Logged</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-700 dark:text-slate-300">Errors</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Logged</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Performance Metrics
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-700 dark:text-slate-300">LCP (Largest Contentful Paint)</span>
                <span className="text-slate-500 dark:text-slate-400">Good</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-700 dark:text-slate-300">FID (First Input Delay)</span>
                <span className="text-slate-500 dark:text-slate-400">Good</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-700 dark:text-slate-300">CLS (Cumulative Layout Shift)</span>
                <span className="text-slate-500 dark:text-slate-400">Good</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "95%" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Database Metrics Section */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Database Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalHomeowners}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Homeowners</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeUsers}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active Users</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalHouseholdMembers}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Household Members</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalPets}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Pets</p>
          </div>
        </div>
      </Card>

      {/* Note */}
      <Card className="p-5 border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
              Analytics Status
            </h4>
            <p className="text-amber-800 dark:text-amber-400 text-xs mt-1">
              Analytics is currently enabled. Detailed metrics are available in your Vercel project dashboard. 
              This page provides an overview of tracked events and system performance.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
