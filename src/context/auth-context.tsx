"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Profile, UserRole, UserPermissions } from "@/types/database";
import { MOCK_PROFILES } from "@/lib/mock-data";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/error-utils";
import { logger } from "@/lib/logger";
import { analytics } from "@/lib/monitoring/analytics";

interface AuthContextType {
  currentUser: Profile | null;
  setCurrentUser: (user: Profile | null) => void;
  allProfiles: Profile[];
  setAllProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingStage: string;
  setLoadingStage: (stage: string) => void;
  isSupabaseActive: boolean;
  setIsSupabaseActive: (active: boolean) => void;
  switchDemoRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => Promise<{ success: boolean; error?: string }>;
  updateUserStatus: (userId: string, status: "Active" | "Inactive") => Promise<{ success: boolean; error?: string }>;
  createUser: (userData: {
    full_name: string;
    email: string;
    password?: string;
    role: UserRole;
    permissions?: UserPermissions;
  }) => Promise<{ success: boolean; error?: string; user?: Profile }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>(MOCK_PROFILES);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Checking database connectivity...");
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);

  // Initialize Auth & Profiles
  useEffect(() => {
    let authListener: { unsubscribe: () => void } | null = null;

    async function initAuth() {
      const configured = isSupabaseConfigured();
      setIsSupabaseActive(configured);

      if (configured) {
        try {
          setLoadingStage("Verifying Supabase secure connection...");
          const supabase = createClient();

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange(async (event, session) => {
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
          });
          authListener = subscription;

          setLoadingStage("Resolving executive credentials...");
          const [userRes, profRes] = await Promise.allSettled([
            supabase.auth.getUser(),
            supabase.from("profiles").select("*").order("created_at", { ascending: true }),
          ]);

          let fetchedProfiles: Profile[] = [];
          if (profRes.status === "fulfilled" && !profRes.value.error && profRes.value.data) {
            fetchedProfiles = profRes.value.data as Profile[];
            setAllProfiles(fetchedProfiles);
            if (typeof window !== "undefined") {
              localStorage.removeItem("sjv6p4_profiles");
            }
          }

          if (userRes.status === "fulfilled" && userRes.value.data?.user) {
            const user = userRes.value.data.user;
            const matchedProfile = fetchedProfiles.find((p) => p.id === user.id);
            if (matchedProfile) {
              setCurrentUser(matchedProfile);
            } else {
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
        } catch (err) {
          logger.warn("Supabase auth init failed, fallback to demo mode", {}, err);
          loadLocalAuth();
        }
      } else {
        loadLocalAuth();
      }
    }

    function loadLocalAuth() {
      if (typeof window !== "undefined") {
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
        } else {
          setCurrentUser(MOCK_PROFILES[0]);
        }
      }
    }

    initAuth();

    return () => {
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []);

  const switchDemoRole = useCallback(
    (role: UserRole) => {
      const found = allProfiles.find((p) => p.role === role);
      if (found) {
        setCurrentUser(found);
        if (typeof window !== "undefined") {
          localStorage.setItem("sjv6p4_current_user", JSON.stringify(found));
        }
      }
    },
    [allProfiles]
  );

  const logout = useCallback(async () => {
    if (isSupabaseActive) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        logger.error("Error signing out from Supabase", {}, err);
      }
    }
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sjv6p4_current_user");
      window.location.href = "/login";
    }
  }, [isSupabaseActive]);

  // Update analytics permission when user changes
  useEffect(() => {
    if (currentUser) {
      analytics.setPermission(currentUser.permissions?.can_view_analytics || false);
    } else {
      analytics.setPermission(false);
    }
  }, [currentUser]);

  const updateUserPermissions = useCallback(
    async (userId: string, permissions: UserPermissions) => {
      if (isSupabaseActive) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        if (!isUuid) {
          setAllProfiles((prev) => prev.filter((p) => p.id !== userId));
          return {
            success: false,
            error: "This test account has an invalid ID and was removed. Please create a new account.",
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
        } catch (err: unknown) {
          return { success: false, error: getErrorMessage(err) };
        }
      } else {
        const updated = allProfiles.map((p) => (p.id === userId ? { ...p, permissions } : p));
        setAllProfiles(updated);
        if (currentUser?.id === userId) {
          setCurrentUser((prev) => (prev ? { ...prev, permissions } : null));
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("sjv6p4_profiles", JSON.stringify(updated));
        }
        return { success: true };
      }
    },
    [isSupabaseActive, currentUser, allProfiles]
  );

  const updateUserStatus = useCallback(
    async (userId: string, status: "Active" | "Inactive") => {
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
        } catch (err: unknown) {
          return { success: false, error: getErrorMessage(err) };
        }
      } else {
        const updated = allProfiles.map((p) => (p.id === userId ? { ...p, status } : p));
        setAllProfiles(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("sjv6p4_profiles", JSON.stringify(updated));
        }
        return { success: true };
      }
    },
    [isSupabaseActive, allProfiles]
  );

  const createUser = useCallback(
    async (userData: {
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
        } catch (err: unknown) {
          return { success: false, error: getErrorMessage(err) || "Failed to create user" };
        }
      } else {
        const defaultPerms: UserPermissions = DEFAULT_PERMISSIONS_BY_ROLE[userData.role || "user"];

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
        if (typeof window !== "undefined") {
          localStorage.setItem("sjv6p4_profiles", JSON.stringify(updated));
        }

        return { success: true, user: newProfile };
      }
    },
    [isSupabaseActive, allProfiles]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        allProfiles,
        setAllProfiles,
        isLoading,
        setIsLoading,
        loadingStage,
        setLoadingStage,
        isSupabaseActive,
        setIsSupabaseActive,
        switchDemoRole,
        logout,
        updateUserPermissions,
        updateUserStatus,
        createUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
