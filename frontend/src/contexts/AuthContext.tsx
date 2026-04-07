import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      try {
        if (!isSupabaseConfigured || !supabase) {
          if (!mounted) return;
          setIsAuthenticated(false);
          setUserEmail(null);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          // Keep app usable; user can still try to login even if env/auth is misconfigured.
          setIsAuthenticated(false);
          setUserEmail(null);
          setIsLoading(false);
          return;
        }

        const email = data.session?.user?.email ?? null;
        setIsAuthenticated(Boolean(data.session));
        setUserEmail(email);
        setIsLoading(false);
      } catch {
        if (!mounted) return;
        setIsAuthenticated(false);
        setUserEmail(null);
        setIsLoading(false);
      }
    };

    syncSession();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(session));
      setUserEmail(session?.user?.email ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login: AuthContextType["login"] = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      return { ok: false, message: "Login is unavailable: Supabase is not configured." };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, message: error.message || "Unable to sign in. Please try again." };
    }

    return { ok: true };
  };

  const logout = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.auth.signOut();
  };

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, userEmail, login, logout }),
    [isAuthenticated, isLoading, userEmail],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
