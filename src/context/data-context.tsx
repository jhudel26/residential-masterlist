"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Homeowner, ActivityLog, HouseholdMember, Profile } from "@/types/database";
import { MOCK_HOMEOWNERS, MOCK_ACTIVITY_LOGS } from "@/lib/mock-data";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { calculateAge } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-utils";
import { withRetry } from "@/lib/retry";
import { logger } from "@/lib/logger";
import { useAuth } from "./auth-context";

interface DataContextType {
  homeowners: Homeowner[];
  setHomeowners: React.Dispatch<React.SetStateAction<Homeowner[]>>;
  activityLogs: ActivityLog[];
  setActivityLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;

  addHomeowner: (
    homeowner: Omit<Homeowner, "id" | "created_at" | "updated_at">,
    members?: Omit<HouseholdMember, "id" | "homeowner_id">[]
  ) => Promise<{ success: boolean; error?: string; data?: Homeowner }>;

  updateHomeowner: (
    id: string,
    updates: Partial<Homeowner>,
    members?: Omit<HouseholdMember, "id" | "homeowner_id">[]
  ) => Promise<{ success: boolean; error?: string }>;

  deleteHomeowner: (id: string) => Promise<{ success: boolean; error?: string }>;

  bulkImportHomeowners: (
    records: Array<{
      homeowner: Omit<Homeowner, "id" | "created_at" | "updated_at">;
      members?: Omit<HouseholdMember, "id" | "homeowner_id">[];
    }>
  ) => Promise<{ success: boolean; count: number; error?: string }>;

  exportBackupData: () => string;
  restoreBackupData: (jsonData: string) => { success: boolean; error?: string; count?: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isSupabaseActive, setIsLoading, setLoadingStage } = useAuth();
  const [homeowners, setHomeowners] = useState<Homeowner[]>(MOCK_HOMEOWNERS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(MOCK_ACTIVITY_LOGS);

  // Initialize Homeowners & Activity Logs
  useEffect(() => {
    async function initData() {
      const configured = isSupabaseConfigured();

      if (configured) {
        try {
          setLoadingStage("Syncing masterlist database records...");
          const supabase = createClient();

          const [hoRes, actRes] = await Promise.allSettled([
            withRetry(() =>
              supabase
                .from("homeowners")
                .select(`*, household_members (*)`)
                .order("created_at", { ascending: false })
            ),
            withRetry(() =>
              supabase
                .from("activity_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(20)
            ),
          ]);

          if (hoRes.status === "fulfilled" && !hoRes.value.error && hoRes.value.data) {
            setHomeowners(hoRes.value.data as Homeowner[]);
          }

          if (actRes.status === "fulfilled" && !actRes.value.error && actRes.value.data) {
            setActivityLogs(actRes.value.data as ActivityLog[]);
          }

          setLoadingStage("Ready");
        } catch (err) {
          logger.warn("Failed to sync Supabase data, falling back to local storage", {}, err);
          loadLocalData();
        }
      } else {
        loadLocalData();
      }

      setIsLoading(false);
    }

    function loadLocalData() {
      if (typeof window !== "undefined") {
        const savedHo = localStorage.getItem("sjv6p4_homeowners");
        if (savedHo) {
          try {
            setHomeowners(JSON.parse(savedHo));
          } catch {
            setHomeowners(MOCK_HOMEOWNERS);
          }
        }
        const savedAct = localStorage.getItem("sjv6p4_activity");
        if (savedAct) {
          try {
            setActivityLogs(JSON.parse(savedAct));
          } catch {
            setActivityLogs(MOCK_ACTIVITY_LOGS);
          }
        }
      }
    }

    initData();
  }, [setIsLoading, setLoadingStage]);

  const syncLocal = useCallback(
    (newHo: Homeowner[], newAct: ActivityLog[]) => {
      if (!isSupabaseActive && typeof window !== "undefined") {
        localStorage.setItem("sjv6p4_homeowners", JSON.stringify(newHo));
        localStorage.setItem("sjv6p4_activity", JSON.stringify(newAct));
      }
    },
    [isSupabaseActive]
  );

  const addHomeowner = useCallback(
    async (
      data: Omit<Homeowner, "id" | "created_at" | "updated_at">,
      members: Omit<HouseholdMember, "id" | "homeowner_id">[] = []
    ) => {
      const age = calculateAge(data.birthdate);

      if (isSupabaseActive) {
        try {
          const supabase = createClient();
          const { data: newHo, error: hoError } = await withRetry(() =>
            supabase
              .from("homeowners")
              .insert([
                {
                  ...data,
                  age,
                  created_by: currentUser?.id,
                },
              ])
              .select()
              .single()
          );

          if (hoError) throw hoError;

          let insertedMembers: HouseholdMember[] = [];
          if (members.length > 0 && newHo) {
            const membersToInsert = members.map((m) => ({
              homeowner_id: newHo.id,
              member_name: m.member_name,
              relationship: m.relationship,
            }));

            const { data: mData, error: mError } = await withRetry(() =>
              supabase.from("household_members").insert(membersToInsert).select()
            );

            if (!mError && mData) {
              insertedMembers = mData as HouseholdMember[];
            }
          }

          const completeHo: Homeowner = {
            ...newHo,
            household_members: insertedMembers,
          };

          setHomeowners((prev) => [completeHo, ...prev]);

          await supabase.from("activity_logs").insert([
            {
              user_id: currentUser?.id,
              user_name: currentUser?.full_name || "HOA Officer",
              action: "CREATED_HOMEOWNER",
              details: { name: completeHo.full_name, address: completeHo.address },
            },
          ]);

          return { success: true, data: completeHo };
        } catch (err: unknown) {
          const error = getErrorMessage(err);
          logger.error("Failed to add homeowner to Supabase", {}, err);
          return { success: false, error };
        }
      } else {
        const newId = "ho-" + Math.random().toString(36).substring(2, 9);
        const newMembers: HouseholdMember[] = members.map((m, idx) => ({
          id: `hm-${newId}-${idx}`,
          homeowner_id: newId,
          member_name: m.member_name,
          relationship: m.relationship,
        }));

        const newRecord: Homeowner = {
          ...data,
          id: newId,
          age,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          household_members: newMembers,
        };

        const updatedHo = [newRecord, ...homeowners];
        const newLog: ActivityLog = {
          id: "act-" + Math.random().toString(36).substring(2, 9),
          user_name: currentUser?.full_name || "HOA Officer",
          action: "CREATED_HOMEOWNER",
          details: { name: newRecord.full_name, address: newRecord.address },
          created_at: new Date().toISOString(),
        };
        const updatedLogs = [newLog, ...activityLogs];

        setHomeowners(updatedHo);
        setActivityLogs(updatedLogs);
        syncLocal(updatedHo, updatedLogs);

        return { success: true, data: newRecord };
      }
    },
    [isSupabaseActive, currentUser, homeowners, activityLogs, syncLocal]
  );

  const updateHomeowner = useCallback(
    async (
      id: string,
      updates: Partial<Homeowner>,
      members?: Omit<HouseholdMember, "id" | "homeowner_id">[]
    ) => {
      const age = updates.birthdate ? calculateAge(updates.birthdate) : undefined;

      if (isSupabaseActive) {
        try {
          const supabase = createClient();
          const payload: Record<string, unknown> = {
            ...updates,
            updated_at: new Date().toISOString(),
          };
          if (age !== undefined) payload.age = age;
          delete payload.household_members;

          const { error: hoError } = await withRetry(() =>
            supabase.from("homeowners").update(payload).eq("id", id)
          );

          if (hoError) throw hoError;

          if (members !== undefined) {
            await supabase.from("household_members").delete().eq("homeowner_id", id);

            if (members.length > 0) {
              const membersToInsert = members.map((m) => ({
                homeowner_id: id,
                member_name: m.member_name,
                relationship: m.relationship,
              }));
              await supabase.from("household_members").insert(membersToInsert);
            }
          }

          const { data: updatedRecord } = await supabase
            .from("homeowners")
            .select(`*, household_members (*)`)
            .eq("id", id)
            .single();

          if (updatedRecord) {
            setHomeowners((prev) =>
              prev.map((h) => (h.id === id ? (updatedRecord as Homeowner) : h))
            );
          }

          await supabase.from("activity_logs").insert([
            {
              user_id: currentUser?.id,
              user_name: currentUser?.full_name || "HOA Officer",
              action: "UPDATED_HOMEOWNER",
              details: { homeowner_id: id, name: updates.full_name },
            },
          ]);

          return { success: true };
        } catch (err: unknown) {
          const error = getErrorMessage(err);
          logger.error("Failed to update homeowner in Supabase", { id }, err);
          return { success: false, error };
        }
      } else {
        const updatedHo = homeowners.map((h) => {
          if (h.id !== id) return h;
          const newMembers =
            members !== undefined
              ? members.map((m, idx) => ({
                  id: `hm-${id}-${idx}`,
                  homeowner_id: id,
                  member_name: m.member_name,
                  relationship: m.relationship,
                }))
              : h.household_members;

          return {
            ...h,
            ...updates,
            age: age ?? h.age,
            updated_at: new Date().toISOString(),
            household_members: newMembers,
          };
        });

        const newLog: ActivityLog = {
          id: "act-" + Math.random().toString(36).substring(2, 9),
          user_name: currentUser?.full_name || "HOA Officer",
          action: "UPDATED_HOMEOWNER",
          details: { homeowner_id: id, name: updates.full_name },
          created_at: new Date().toISOString(),
        };
        const updatedLogs = [newLog, ...activityLogs];

        setHomeowners(updatedHo);
        setActivityLogs(updatedLogs);
        syncLocal(updatedHo, updatedLogs);

        return { success: true };
      }
    },
    [isSupabaseActive, currentUser, homeowners, activityLogs, syncLocal]
  );

  const deleteHomeowner = useCallback(
    async (id: string) => {
      const target = homeowners.find((h) => h.id === id);

      if (isSupabaseActive) {
        try {
          const supabase = createClient();
          const { error } = await withRetry(() =>
            supabase
              .from("homeowners")
              .update({ status: "Inactive", updated_at: new Date().toISOString() })
              .eq("id", id)
          );

          if (error) throw error;

          setHomeowners((prev) =>
            prev.map((h) => (h.id === id ? { ...h, status: "Inactive" } : h))
          );

          await supabase.from("activity_logs").insert([
            {
              user_id: currentUser?.id,
              user_name: currentUser?.full_name || "HOA Officer",
              action: "DELETED_HOMEOWNER",
              details: { homeowner_id: id, name: target?.full_name },
            },
          ]);

          return { success: true };
        } catch (err: unknown) {
          const error = getErrorMessage(err);
          logger.error("Failed to delete homeowner in Supabase", { id }, err);
          return { success: false, error };
        }
      } else {
        const updatedHo = homeowners.map((h) =>
          h.id === id ? { ...h, status: "Inactive" as const } : h
        );

        const newLog: ActivityLog = {
          id: "act-" + Math.random().toString(36).substring(2, 9),
          user_name: currentUser?.full_name || "HOA Officer",
          action: "DELETED_HOMEOWNER",
          details: { homeowner_id: id, name: target?.full_name },
          created_at: new Date().toISOString(),
        };
        const updatedLogs = [newLog, ...activityLogs];

        setHomeowners(updatedHo);
        setActivityLogs(updatedLogs);
        syncLocal(updatedHo, updatedLogs);

        return { success: true };
      }
    },
    [isSupabaseActive, currentUser, homeowners, activityLogs, syncLocal]
  );

  // Bulk Import
  const bulkImportHomeowners = useCallback(
    async (
      records: Array<{
        homeowner: Omit<Homeowner, "id" | "created_at" | "updated_at">;
        members?: Omit<HouseholdMember, "id" | "homeowner_id">[];
      }>
    ) => {
      try {
        let importedCount = 0;
        for (const item of records) {
          const res = await addHomeowner(item.homeowner, item.members);
          if (res.success) {
            importedCount++;
          }
        }
        return { success: true, count: importedCount };
      } catch (err: unknown) {
        return { success: false, count: 0, error: getErrorMessage(err) };
      }
    },
    [addHomeowner]
  );

  // Backup & Restore
  const exportBackupData = useCallback(() => {
    const backupObj = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      homeowners,
      activityLogs,
    };
    return JSON.stringify(backupObj, null, 2);
  }, [homeowners, activityLogs]);

  const restoreBackupData = useCallback(
    (jsonData: string) => {
      try {
        const parsed = JSON.parse(jsonData);
        if (!parsed || !Array.isArray(parsed.homeowners)) {
          return { success: false, error: "Invalid backup format. Expected homeowners list." };
        }
        setHomeowners(parsed.homeowners);
        if (Array.isArray(parsed.activityLogs)) {
          setActivityLogs(parsed.activityLogs);
        }
        syncLocal(parsed.homeowners, parsed.activityLogs || activityLogs);
        return { success: true, count: parsed.homeowners.length };
      } catch (err: unknown) {
        return { success: false, error: getErrorMessage(err) };
      }
    },
    [activityLogs, syncLocal]
  );

  return (
    <DataContext.Provider
      value={{
        homeowners,
        setHomeowners,
        activityLogs,
        setActivityLogs,
        addHomeowner,
        updateHomeowner,
        deleteHomeowner,
        bulkImportHomeowners,
        exportBackupData,
        restoreBackupData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
