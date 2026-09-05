"use client";

import React, { useState } from "react";
import { Homeowner } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { OwnershipBadge, StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";
import {
  User,
  Home,
  Users,
  Calendar,
  Phone,
  Mail,
  PawPrint,
  Shield,
  HeartHandshake,
  Printer,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomeownerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeowner: Homeowner | null;
  onEdit?: () => void;
}

export function HomeownerDetailsModal({
  isOpen,
  onClose,
  homeowner,
  onEdit,
}: HomeownerDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!homeowner) return null;

  const handlePrint = () => {
    window.print();
  };

  const modalTabs = [
    { id: "overview", label: "Overview & Property", icon: <Home className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> },
    {
      id: "household",
      label: "Household Members",
      icon: <Users className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />,
      badge: homeowner.household_members?.length || 0,
    },
    { id: "proxy", label: "GA Proxy & Contact", icon: <Shield className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Homeowner Resident Dossier"
      description="Official St. Joseph Village 6 Phase 4 residential record"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#040d1c] to-[#07162c] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md border border-white/10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#0c2340] border border-teal-500/30 text-teal-300 flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              {homeowner.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-white tracking-tight">{homeowner.full_name}</h4>
                {homeowner.age && homeowner.age >= 60 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/40">
                    Senior (60+)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{homeowner.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <OwnershipBadge type={homeowner.ownership_type} />
            <StatusBadge status={homeowner.status} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs
          tabs={modalTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          size="sm"
          className="w-full justify-start"
        />

        {/* Tab 1: Overview & Property */}
        {activeTab === "overview" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                  <span>Date of Birth</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatDate(homeowner.birthdate)}</p>
                <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                  {homeowner.age ? `${homeowner.age} years old` : "—"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <User className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Gender</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{homeowner.gender || "—"}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Registered Identity</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Users className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                  <span>Total Occupants</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {homeowner.household_count} {homeowner.household_count === 1 ? "Person" : "Persons"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Living on property</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <PawPrint className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                  <span>Domestic Pets</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {homeowner.pet_count} {homeowner.pet_count === 1 ? "Pet" : "Pets"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Census recorded</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526] col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Home className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                  <span>Subdivision Lot</span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{homeowner.address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Household Members */}
        {activeTab === "household" && (
          <div className="space-y-4 animate-fade-in">
            {!homeowner.household_members || homeowner.household_members.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#0a1526] rounded-2xl border border-dashed border-slate-200 dark:border-[#1e2f4d]">
                <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">No additional household members recorded</p>
                <p className="mt-0.5">The homeowner is the sole registered occupant of this house.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {homeowner.household_members.map((member, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {member.member_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{member.member_name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{member.relationship}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Family
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Proxy & Contact */}
        {activeTab === "proxy" && (
          <div className="space-y-4 animate-fade-in">
            {/* General Assembly Proxy Card */}
            <div className="p-4 rounded-2xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-950/30">
              <div className="flex items-center gap-2 text-teal-900 dark:text-teal-300 font-bold text-xs uppercase tracking-wider mb-2">
                <Shield className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                <span>General Assembly (GA) Designated Proxy</span>
              </div>
              {homeowner.ga_proxy_name ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{homeowner.ga_proxy_name}</span>
                  <span className="text-xs text-teal-800 dark:text-teal-300 font-medium px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#0e192d] border border-teal-200 dark:border-teal-800/60">
                    Relationship: {homeowner.ga_proxy_relationship || "Designated Proxy"}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  No designated proxy assigned. The homeowner attends General Assembly meetings in person.
                </p>
              )}
            </div>

            {/* Contact Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Mobile Phone</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {homeowner.contact_mobile || "Not provided"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Mail className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Email Address</span>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {homeowner.contact_email || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#1e2f4d]">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-slate-600 dark:text-slate-300 gap-1.5 text-xs"
          >
            <Printer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Print Dossier</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="text-xs gap-1.5 shadow-sm"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Record</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
