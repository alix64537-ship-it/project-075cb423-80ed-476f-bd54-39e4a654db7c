import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = { display_name: string; phone: string | null };

type AuthState = {
  user: User | null;
  profile: Profile | null;
  ready: boolean;
  displayName: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: ["favorites"] });
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, phone")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const signOut = async () => {
    await queryClient.cancelQueries({ queryKey: ["favorites"] });
    queryClient.removeQueries({ queryKey: ["favorites"] });
    queryClient.removeQueries({ queryKey: ["profile"] });
    await supabase.auth.signOut();
  };

  const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
  const displayName =
    profile?.display_name || meta?.["display_name"] || meta?.["full_name"] || meta?.["name"] || user?.email?.split("@")[0] || "";

  return (
    <AuthContext.Provider value={{ user, profile: profile ?? null, ready, displayName, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
