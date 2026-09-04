"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Profile, Homeowner, ActivityLog, UserPermissions, UserRole, HouseholdMember } from "@/types/database";
import { MOCK_PROFILES, MOCK_HOMEOWNERS, MOCK_ACTIVITY_LOGS } from "@/lib/mock-data";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { calculateAge } from "@/lib/utils";

interface AppContextType {
  currentUser: Profile | null;
  setCurrentUser: (user: Profile | null) => void;
  allProfiles: Profile[];
  homeowners: Homeowner[];
  activityLogs: ActivityLog[];
  isLoading: boolean;
  loadingStage: string;
  isSupabaseActive: boolean;
  
  // Homeowner CRUD
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
  
  // User & Permission Management
  updateUserPermissions: (
    userId: string,
    permissions: UserPermissions
  ) => Promise<{ success: boolean; error?: string }>;
  
  updateUserStatus: (
    userId: string,
    status: "Active" | "Inactive"
  ) => Promise<{ success: boolean; error?: string }>;
  
  createUser: (
    userData: {
      full_name: string;
      email: string;
      password?: string;
      role: UserRole;
      permissions?: UserPermissions;
    }
  ) => Promise<{ success: boolean; error?: string; user?: Profile }>;

  switchDemoRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  
  // Theme Management (Light & Dark mode)
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>(MOCK_PROFILES);
  const [homeowners, setHomeowners] = useState<Homeowner[]>(MOCK_HOMEOWNERS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(MOCK_ACTIVITY_LOGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Checking database connectivity...");
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  // Load and apply theme from localStorage or system preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("alpalist_theme") as "light" | "dark" | null;
      if (saved === "dark" || saved === "light") {
        setThemeState(saved);
        if (saved === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initial = prefersDark ? "dark" : "light";
        setThemeState(initial);
        if (initial === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    } catch {
      // fallback safe
    }
  }, []);

  const setTheme = useCallback((newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("alpalist_theme", newTheme);
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // fallback safe
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Initialize data (try Supabase first, fallback to mock data)
  useEffect(() => {
    let authListener: { unsubscribe: () => void } | null = null;

    async function init() {
      const configured = isSupabaseConfigured();
      setIsSupabaseActive(configured);

      if (configured) {
        try {
          setLoadingStage("Verifying Supabase secure connection...");
          const supabase = createClient();
          
          // Subscribe to Supabase Auth state changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (session?.user) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", session.user.id)
                  .single();
                if (profile) {
                  setCurrentUser(profile as Profile);
                }
              } else if (event === "SIGNED_OUT") {
                setCurrentUser(null);
              }
            }
          );
          authListener = subscription;

          setLoadingStage("Validating board session & syncing registry data...");

          // Execute auth check and all table fetches in parallel
          const [userRes, hoRes, profRes, actRes] = await Promise.allSettled([
            supabase.auth.getUser(),
            supabase
              .from("homeowners")
              .select(`*, household_members (*)`)
              .order("created_at", { ascending: false }),
            supabase
              .from("profiles")
              .select("*")
              .order("created_at", { ascending: true }),
            supabase
              .from("activity_logs")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(20),
          ]);

          // Handle profiles first so we can resolve currentUser quickly
          let fetchedProfiles: Profile[] = [];
          if (profRes.status === "fulfilled" && !profRes.value.error && profRes.value.data) {
            fetchedProfiles = profRes.value.data as Profile[];
            setAllProfiles(fetchedProfiles);
            if (typeof window !== "undefined") {
              localStorage.removeItem("sjv6p4_profiles");
            }
          }

          // Handle auth user
          if (userRes.status === "fulfilled" && userRes.value.data?.user) {
            setLoadingStage("Resolving executive permissions & credentials...");
            const user = userRes.value.data.user;
            const matchedProfile = fetchedProfiles.find((p) => p.id === user.id);
            if (matchedProfile) {
              setCurrentUser(matchedProfile);
            } else {
              // Direct lookup fallback if profiles query was restricted by RLS
              const { data: directProfile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();
              if (directProfile) {
                setCurrentUser(directProfile as Profile);
              }
            }
          } else {
            setCurrentUser(null);
          }

          // Handle homeowners
          if (hoRes.status === "fulfilled" && !hoRes.value.error && hoRes.value.data) {
            setHomeowners(hoRes.value.data as Homeowner[]);
          }

          // Handle activity logs
          if (actRes.status === "fulfilled" && !actRes.value.error && actRes.value.data) {
            setActivityLogs(actRes.value.data as ActivityLog[]);
          }
          
          setLoadingStage("Ready");
        } catch (err) {
          console.warn("Supabase connection failed, using local demo data", err);
          loadLocalStorageData();
        }
      } else {
        setLoadingStage("Loading local demo registry...");
        loadLocalStorageData();
      }

      setIsLoading(false);
    }

    function loadLocalStorageData() {
      if (typeof window !== "undefined") {
        const savedHo = localStorage.getItem("sjv6p4_homeowners");
        if (savedHo) {
          try {
            setHomeowners(JSON.parse(savedHo));
          } catch {
            setHomeowners(MOCK_HOMEOWNERS);
          }
        }
        const savedProf = localStorage.getItem("sjv6p4_profiles");
        if (savedProf) {
          try {
            setAllProfiles(JSON.parse(savedProf));
          } catch {
            setAllProfiles(MOCK_PROFILES);
          }
        }
        const savedUser = localStorage.getItem("sjv6p4_current_user");
        if (savedUser) {
          try {
            setCurrentUser(JSON.parse(savedUser));
          } catch {
            setCurrentUser(MOCK_PROFILES[0]);
          }
        }
      }
    }

    init();

    return () => {
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []);

  // Save to local storage on changes in demo mode
  const syncLocalStorage = useCallback(
    (newHo: Homeowner[], newProf: Profile[], newAct: ActivityLog[]) => {
      if (!isSupabaseActive && typeof window !== "undefined") {
        localStorage.setItem("sjv6p4_homeowners", JSON.stringify(newHo));
        localStorage.setItem("sjv6p4_profiles", JSON.stringify(newProf));
        localStorage.setItem("sjv6p4_activity", JSON.stringify(newAct));
      }
    },
    [isSupabaseActive]
  );

  const addHomeowner = async (
    data: Omit<Homeowner, "id" | "created_at" | "updated_at">,
    members: Omit<HouseholdMember, "id" | "homeowner_id">[] = []
  ) => {
    const age = calculateAge(data.birthdate);

    if (isSupabaseActive) {
      try {
        const supabase = createClient();
        const { data: newHo, error: hoError } = await supabase
          .from("homeowners")
          .insert([
            {
              ...data,
              age,
              created_by: currentUser?.id,
            },
          ])
          .select()
          .single();

        if (hoError) throw hoError;

        let insertedMembers: HouseholdMember[] = [];
        if (members.length > 0 && newHo) {
          const membersToInsert = members.map((m) => ({
            homeowner_id: newHo.id,
            member_name: m.member_name,
            relationship: m.relationship,
          }));

          const { data: mData, error: mError } = await supabase
            .from("household_members")
            .insert(membersToInsert)
            .select();

          if (!mError && mData) {
            insertedMembers = mData as HouseholdMember[];
          }
        }

        const completeHo: Homeowner = {
          ...newHo,
          household_members: insertedMembers,
        };

        setHomeowners((prev) => [completeHo, ...prev]);

        // Log activity
        await supabase.from("activity_logs").insert([
          {
            user_id: currentUser?.id,
            user_name: currentUser?.full_name || "HOA Officer",
            action: "CREATED_HOMEOWNER",
            details: { name: completeHo.full_name, address: completeHo.address },
          },
        ]);

        return { success: true, data: completeHo };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to create homeowner" };
      }
    } else {
      // Demo Mode
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
      syncLocalStorage(updatedHo, allProfiles, updatedLogs);

      return { success: true, data: newRecord };
    }
  };

  const updateHomeowner = async (
    id: string,
    updates: Partial<Homeowner>,
    members?: Omit<HouseholdMember, "id" | "homeowner_id">[]
  ) => {
    const age = updates.birthdate ? calculateAge(updates.birthdate) : undefined;

    if (isSupabaseActive) {
      try {
        const supabase = createClient();
        const payload: any = { ...updates, updated_at: new Date().toISOString() };
        if (age !== undefined) payload.age = age;
        delete payload.household_members;

        const { error: hoError } = await supabase
          .from("homeowners")
          .update(payload)
          .eq("id", id);

        if (hoError) throw hoError;

        if (members !== undefined) {
          // Replace members
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

        // Re-fetch record
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
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to update homeowner" };
      }
    } else {
      // Demo Mode
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
      syncLocalStorage(updatedHo, allProfiles, updatedLogs);

      return { success: true };
    }
  };

  const deleteHomeowner = async (id: string) => {
    const target = homeowners.find((h) => h.id === id);

    if (isSupabaseActive) {
      try {
        const supabase = createClient();
        // Soft delete / archive
        const { error } = await supabase
          .from("homeowners")
          .update({ status: "Inactive", updated_at: new Date().toISOString() })
          .eq("id", id);

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
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to delete homeowner" };
      }
    } else {
      // Demo Mode: soft delete / mark inactive
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
      syncLocalStorage(updatedHo, allProfiles, updatedLogs);

      return { success: true };
    }
  };

  const updateUserPermissions = async (userId: string, permissions: UserPermissions) => {
    if (isSupabaseActive) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (!isUuid) {
        setAllProfiles((prev) => prev.filter((p) => p.id !== userId));
        return {
          success: false,
          error: "This was a temporary local test account with an invalid ID. It has been removed. Please create a real account using 'Create New Account'.",
        };
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("profiles")
          .update({ permissions, updated_at: new Date().toISOString() })
          .eq("id", userId);

        if (error) throw error;

        setAllProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, permissions } : p))
        );
        if (currentUser?.id === userId) {
          setCurrentUser((prev) => (prev ? { ...prev, permissions } : null));
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      const updated = allProfiles.map((p) =>
        p.id === userId ? { ...p, permissions } : p
      );
      setAllProfiles(updated);
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, permissions });
      }
      syncLocalStorage(homeowners, updated, activityLogs);
      return { success: true };
    }
  };

  const updateUserStatus = async (userId: string, status: "Active" | "Inactive") => {
    if (isSupabaseActive) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (!isUuid) {
        setAllProfiles((prev) => prev.filter((p) => p.id !== userId));
        return {
          success: false,
          error: "Temporary test account removed.",
        };
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("profiles")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", userId);

        if (error) throw error;

        setAllProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, status } : p))
        );
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      const updated = allProfiles.map((p) =>
        p.id === userId ? { ...p, status } : p
      );
      setAllProfiles(updated);
      syncLocalStorage(homeowners, updated, activityLogs);
      return { success: true };
    }
  };

  const createUser = async (userData: {
    full_name: string;
    email: string;
    password?: string;
    role: UserRole;
    permissions?: UserPermissions;
  }) => {
    if (isSupabaseActive) {
      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });

        const result = await response.json();
        if (!response.ok) {
          return { success: false, error: result.error || "Failed to create user in Supabase" };
        }

        const newProfile = result.profile as Profile;
        setAllProfiles((prev) => [newProfile, ...prev.filter((p) => p.id !== newProfile.id)]);
        return { success: true, user: newProfile };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to create user" };
      }
    } else {
      const defaultPerms: UserPermissions = {
        can_create_homeowner: userData.role !== "user",
        can_edit_homeowner: userData.role !== "user",
        can_delete_homeowner: false,
        can_view_homeowner: true,
        can_export_excel: userData.role !== "user",
        can_manage_users: false,
        can_grant_permissions: false,
        can_view_dashboard_stats: true,
      };

      const newProfile: Profile = {
        id: "user-" + Math.random().toString(36).substring(2, 9),
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        status: "Active",
        created_at: new Date().toISOString(),
        permissions: userData.permissions || defaultPerms,
      };

      const updated = [newProfile, ...allProfiles];
      setAllProfiles(updated);
      syncLocalStorage(homeowners, updated, activityLogs);

      return { success: true, user: newProfile };
    }
  };

  const switchDemoRole = (role: UserRole) => {
    const found = allProfiles.find((p) => p.role === role);
    if (found) {
      setCurrentUser(found);
      if (typeof window !== "undefined") {
        localStorage.setItem("sjv6p4_current_user", JSON.stringify(found));
      }
    }
  };

  const logout = async () => {
    if (isSupabaseActive) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sjv6p4_current_user");
      window.location.href = "/login";
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        allProfiles,
        homeowners,
        activityLogs,
        isLoading,
        loadingStage,
        isSupabaseActive,
        addHomeowner,
        updateHomeowner,
        deleteHomeowner,
        updateUserPermissions,
        updateUserStatus,
        createUser,
        switchDemoRole,
        logout,
        theme,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
