import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type UserRole = "admin" | "donor" | null;

type AuthOkResult = { ok: true; role: Exclude<UserRole, null> | null };
type AuthErrResult = { ok: false; message: string };

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userEmail: string | null;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  initials: string;
  role: UserRole;
  login: (email: string, password: string) => Promise<AuthOkResult | AuthErrResult>;
  setAuthFromProfile: (input: {
    userId: string;
    email: string | null;
    role: Exclude<UserRole, null>;
    firstName?: string | null;
    lastName?: string | null;
  }) => void;
  signUp: (input: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }) => Promise<AuthOkResult | AuthErrResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);

  const loadProfile = async (profileUserId: string) => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", profileUserId)
      .maybeSingle();
    if (error) return null;
    return {
      role: data?.role === "admin" || data?.role === "donor" ? data.role : null,
      firstName: data?.first_name ?? null,
      lastName: data?.last_name ?? null,
    };
  };

  const setAuthFromProfile: AuthContextType["setAuthFromProfile"] = (input) => {
    setIsAuthenticated(true);
    setUserId(input.userId);
    setUserEmail(input.email);
    setRole(input.role);
    setFirstName(input.firstName ?? null);
    setLastName(input.lastName ?? null);
    setIsLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      try {
        // Ensure loading stays true until session + role fetch completes.
        if (mounted) setIsLoading(true);

        if (!isSupabaseConfigured || !supabase) {
          if (!mounted) return;
          setIsAuthenticated(false);
          setUserEmail(null);
          setUserId(null);
          setFirstName(null);
          setLastName(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          // Keep app usable; user can still try to login even if env/auth is misconfigured.
          setIsAuthenticated(false);
          setUserEmail(null);
          setUserId(null);
          setFirstName(null);
          setLastName(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        const session = data.session ?? null;
        const email = session?.user?.email ?? null;
        const id = session?.user?.id ?? null;
        setIsAuthenticated(Boolean(session));
        setUserEmail(email);
        setUserId(id);
        if (id) {
          const profile = await loadProfile(id);
          if (!mounted) return;
          setRole(profile?.role ?? null);
          setFirstName(profile?.firstName ?? null);
          setLastName(profile?.lastName ?? null);
        } else {
          setRole(null);
          setFirstName(null);
          setLastName(null);
        }
        setIsLoading(false);
      } catch {
        if (!mounted) return;
        setIsAuthenticated(false);
        setUserEmail(null);
        setUserId(null);
        setFirstName(null);
        setLastName(null);
        setRole(null);
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
      setIsLoading(true);
      setIsAuthenticated(Boolean(session));
      setUserEmail(session?.user?.email ?? null);
      const id = session?.user?.id ?? null;
      setUserId(id);
      if (!id) {
        setRole(null);
        setFirstName(null);
        setLastName(null);
        setIsLoading(false);
        return;
      }
      loadProfile(id)
        .then((profile) => {
          if (!mounted) return;
          setRole(profile?.role ?? null);
          setFirstName(profile?.firstName ?? null);
          setLastName(profile?.lastName ?? null);
          setIsLoading(false);
        })
        .catch(() => {
          if (!mounted) return;
          setRole(null);
          setFirstName(null);
          setLastName(null);
          setIsLoading(false);
        });
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, message: error.message || "Unable to sign in. Please try again." };
    }

    const id = data.user?.id ?? null;
    if (id) {
      setIsLoading(true);
      const profile = await loadProfile(id);
      setRole(profile?.role ?? null);
      setFirstName(profile?.firstName ?? null);
      setLastName(profile?.lastName ?? null);
      setIsLoading(false);
      return { ok: true, role: profile?.role ?? null };
    }

    return { ok: true, role: null };
  };

  const signUp: AuthContextType["signUp"] = async (input) => {
    if (!isSupabaseConfigured || !supabase) {
      return { ok: false, message: "Sign up is unavailable: Supabase is not configured." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return { ok: false, message: error.message || "Unable to sign up. Please try again." };
    }

    const id = data.user?.id;
    if (!id) {
      return { ok: false, message: "Account created, but no user id was returned." };
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      role: "donor",
    });

    if (profileError) {
      return {
        ok: false,
        message: profileError.message || "Account created, but profile setup failed.",
      };
    }

    setRole("donor");
    setFirstName(input.first_name);
    setLastName(input.last_name);
    return { ok: true, role: "donor" };
  };

  const logout = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.auth.signOut();
    setRole(null);
    setUserId(null);
    setUserEmail(null);
    setFirstName(null);
    setLastName(null);
  };

  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || userEmail || null;
  const initialsSource = [firstName, lastName].filter(Boolean).join(" ").trim() || userEmail || "U";
  const initials = initialsSource
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      userEmail,
      userId,
      firstName,
      lastName,
      displayName,
      initials,
      role,
      login,
      setAuthFromProfile,
      signUp,
      logout,
    }),
    [isAuthenticated, isLoading, userEmail, userId, firstName, lastName, displayName, initials, role],
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
