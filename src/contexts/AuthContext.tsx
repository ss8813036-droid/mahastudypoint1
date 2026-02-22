import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole, getUserProfile } from "@/lib/auth";
import { registerDeviceSession } from "@/lib/device-session";
import { toast } from "sonner";

type AppRole = "student" | "teacher" | "admin";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  semester: number | null;
  branch: string | null;
  is_approved: boolean;
  theme_preference: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  loading: true,
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (currentUser: User) => {
    const [userRoles, userProfile] = await Promise.all([
      getUserRole(currentUser.id),
      getUserProfile(currentUser.id),
    ]);
    
    // If no profile exists (e.g. new Google OAuth user), create one
    if (!userProfile) {
      const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '';
      await supabase.from("profiles").upsert({ 
        user_id: currentUser.id, 
        full_name: fullName 
      }, { onConflict: "user_id" });
      const refreshed = await getUserProfile(currentUser.id);
      setProfile(refreshed as Profile | null);
    } else {
      setProfile(userProfile as Profile | null);
    }
    
    setRoles(userRoles as AppRole[]);
  };

  const refreshProfile = async () => {
    if (user) await loadUserData(user);
  };

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            try {
              await loadUserData(session.user);
              
              // Run device check in background - don't block login
              if (event === "SIGNED_IN") {
                const deviceCheck = await registerDeviceSession(session.user.id);
                if (!deviceCheck.allowed) {
                  toast.error(deviceCheck.message || "Device not allowed");
                  await supabase.auth.signOut();
                  setSession(null);
                  setUser(null);
                  setProfile(null);
                  setRoles([]);
                }
              }
            } catch (err) {
              console.error("Error loading user data:", err);
            }
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        isAdmin: roles.includes("admin"),
        isTeacher: roles.includes("teacher"),
        isStudent: roles.includes("student"),
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
