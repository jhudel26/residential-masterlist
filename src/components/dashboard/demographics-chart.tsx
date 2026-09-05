"use client";

import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Homeowner } from "@/types/database";
import { Tabs } from "@/components/ui/tabs";
import { PieChart as PieIcon, BarChart3, Users } from "lucide-react";

interface DemographicsChartProps {
  homeowners: Homeowner[];
}

export function DemographicsCharts({ homeowners }: DemographicsChartProps) {
  const [activeTab, setActiveTab] = useState<string>("tenure");

  // Compute ownership counts
  const ownersCount = homeowners.filter((h) => h.ownership_type === "Owner").length;
  const rentersCount = homeowners.filter((h) => h.ownership_type === "Renter").length;
  const totalOccupied = ownersCount + rentersCount;

  const ownershipData = [
    { name: "Owner-Occupied", value: ownersCount, color: "#0d9488" }, // Teal 600
    { name: "Renter-Occupied", value: rentersCount, color: "#07162c" }, // Deep Navy
  ];

  // Compute gender distribution
  const maleCount = homeowners.filter((h) => h.gender === "Male").length;
  const femaleCount = homeowners.filter((h) => h.gender === "Female").length;
  const otherCount = homeowners.filter((h) => h.gender === "Other").length;

  const genderData = [
    { name: "Male", count: maleCount, fill: "#07162c" },
    { name: "Female", count: femaleCount, fill: "#0d9488" },
    ...(otherCount > 0 ? [{ name: "Other", count: otherCount, fill: "#64748b" }] : []),
  ];

  // Compute age brackets (Census demographics)
  const youngAdults = homeowners.filter((h) => (h.age ?? 0) >= 18 && (h.age ?? 0) <= 35).length;
  const adults = homeowners.filter((h) => (h.age ?? 0) >= 36 && (h.age ?? 0) <= 50).length;
  const mature = homeowners.filter((h) => (h.age ?? 0) >= 51 && (h.age ?? 0) <= 59).length;
  const seniors = homeowners.filter((h) => (h.age ?? 0) >= 60).length;

  const ageData = [
    { name: "18-35 yrs (Young)", count: youngAdults, fill: "#14b8a6" },
    { name: "36-50 yrs (Adult)", count: adults, fill: "#0d9488" },
    { name: "51-59 yrs (Middle)", count: mature, fill: "#1e3a8a" },
    { name: "60+ yrs (Senior)", count: seniors, fill: "#07162c" },
  ];

  const chartTabs = [
    { id: "tenure", label: "Tenure Breakdown", icon: <PieIcon className="h-3.5 w-3.5" /> },
    { id: "gender", label: "Gender Ratio", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "age", label: "Age Demographics", icon: <Users className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d]/80 bg-white dark:bg-[#0e192d] p-6 sm:p-7 shadow-subtle space-y-6">
      {/* Header with Tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
            Community Demographic Analytics
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time visual breakdown of registered St. Joseph Village 6 Phase 4 residents
          </p>
        </div>

        <Tabs
          tabs={chartTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          size="sm"
        />
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        {totalOccupied === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No homeowner demographic records available to visualize
          </div>
        ) : activeTab === "tenure" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ownershipData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={4}
                dataKey="value"
              >
                {ownershipData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#ffffff" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a1120",
                  borderColor: "#1e293b",
                  borderRadius: "12px",
                  color: "#ffffff",
                  fontSize: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                }}
                itemStyle={{ color: "#ffffff" }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : activeTab === "gender" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={genderData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  backgroundColor: "#0a1120",
                  borderColor: "#1e293b",
                  borderRadius: "12px",
                  color: "#ffffff",
                  fontSize: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                }}
                itemStyle={{ color: "#ffffff" }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={48}>
                {genderData.map((entry, index) => (
                  <Cell key={`gender-cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  backgroundColor: "#0a1120",
                  borderColor: "#1e293b",
                  borderRadius: "12px",
                  color: "#ffffff",
                  fontSize: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                }}
                itemStyle={{ color: "#ffffff" }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={44}>
                {ageData.map((entry, index) => (
                  <Cell key={`age-cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Mini Legend Callout Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#091424] border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Owners</span>
          <p className="text-sm font-bold text-teal-700 dark:text-teal-400">{ownersCount} properties</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#091424] border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Renters</span>
          <p className="text-sm font-bold text-[#07162c] dark:text-sky-300">{rentersCount} properties</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#091424] border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Senior Citizens</span>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{seniors} registered</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#091424] border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Occupancy</span>
          <p className="text-sm font-bold text-teal-700 dark:text-teal-400">{totalOccupied} units active</p>
        </div>
      </div>
    </div>
  );
}
