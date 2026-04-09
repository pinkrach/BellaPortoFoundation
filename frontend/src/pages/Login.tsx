import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { buildApiUrl } from "@/lib/api";
import { Loader2, Sailboat } from "lucide-react";
import { motion } from "framer-motion";
import houseLogo from "@/assets/icons/houseIcon.svg";
import { PublicLayout } from "@/components/PublicLayout";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingMfa, setAwaitingMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [pendingRole, setPendingRole] = useState<"admin" | "donor" | null>(null);

  const { login, logout, refreshProfileAfterMfa } = useAuth();
  const navigate = useNavigate();

  const emailIsValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const resolveRoleForRedirect = async (): Promise<"admin" | "donor" | null> => {
    if (pendingRole === "admin" || pendingRole === "donor") return pendingRole;
    if (!supabase) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return null;
    try {
      const response = await fetch(buildApiUrl("/api/profiles/me"), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = response.ok ? ((await response.json()) as { role?: string | null }) : null;
      if (profile?.role === "admin" || profile?.role === "donor") return profile.role;
    } catch {
      // fall through
    }
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser(accessToken);
      const uid = userData.user?.id;
      if (uid) {
        const { data: row } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
        if (row?.role === "admin" || row?.role === "donor") return row.role;
      }
    }
    return null;
  };

  const redirectAfterAuth = async () => {
    let role = pendingRole;
    if (role !== "admin" && role !== "donor") {
      role = await resolveRoleForRedirect();
    }
    if (role === "admin") {
      navigate("/admin");
      return;
    }
    if (role === "donor") {
      navigate("/dashboard");
      return;
    }
    setAwaitingMfa(false);
    setPendingRole(null);
    setMfaCode("");
    if (supabase) await supabase.auth.signOut();
    setError("Your account signed in, but the website could not confirm your access role. Please contact an admin.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!emailIsValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(trimmedEmail, password);
      if (!result.ok) {
        setError(result.message || "Incorrect email or password.");
        return;
      }

      if (result.needsMfa) {
        setPendingRole(result.role === "admin" || result.role === "donor" ? result.role : null);
        setAwaitingMfa(true);
        setMfaCode("");
        return;
      }

      let role = result.role;
      if (!role && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) {
          try {
            const response = await fetch(buildApiUrl("/api/profiles/me"), {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profile = response.ok ? ((await response.json()) as { role?: string | null }) : null;
            if (profile?.role === "admin" || profile?.role === "donor") role = profile.role;
          } catch {
            // ignore
          }
        }
      }

      if (role === "admin") {
        navigate("/admin");
        return;
      }
      if (role === "donor") {
        navigate("/dashboard");
        return;
      }

      setError("Your account signed in, but the website could not confirm your access role. Please contact an admin.");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!supabase) {
      setError("Sign-in is not configured.");
      return;
    }
    const code = mfaCode.replace(/\s/g, "");
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setMfaVerifying(true);
    try {
      const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr) {
        throw new Error(listErr.message || "Could not load MFA factors.");
      }
      const totpFactors = factors?.totp ?? [];
      const verifiedFactor = totpFactors.find((f) => f.status === "verified");
      if (!verifiedFactor?.id) {
        throw new Error("No verified authenticator is linked to this account.");
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });
      if (challengeError || !challengeData?.id) {
        throw new Error(challengeError?.message || "Could not start MFA verification.");
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) {
        throw new Error(verifyError.message || "Invalid code. Try again.");
      }

      await refreshProfileAfterMfa();
      setAwaitingMfa(false);
      setMfaCode("");
      await redirectAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setMfaVerifying(false);
    }
  };

  /** Clears the partial session via Supabase, syncs AuthContext, then turns off the MFA gate (awaitingMfa) so the password form returns. */
  const handleBackToSignIn = async () => {
    setMfaVerifying(false);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // continue — still reset UI and context
    }
    try {
      await logout();
    } catch {
      // ignore
    }
    setAwaitingMfa(false);
    setMfaCode("");
    setPendingRole(null);
    setIsSubmitting(false);
    setError("");
  };

  return (
    <PublicLayout hideFooter hideNavbar>
      <Link
        to="/"
        className="fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-sm bg-background/70 px-2.5 py-1.5 text-[#1E2933] backdrop-blur-sm transition-colors hover:bg-background/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Return to home page"
      >
        <img src={houseLogo} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
        <span className="font-heading text-lg font-semibold tracking-tight md:text-xl">
          Bella Bay Foundation
        </span>
      </Link>
      <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-background p-4">
        <div className="absolute top-10 right-10 hidden text-accent/20 md:block">
          <Sailboat className="h-32 w-32 rotate-12" />
        </div>
        <div className="absolute bottom-10 left-10 hidden text-lavender/20 md:block">
          <Sailboat className="h-24 w-24 -rotate-6" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card rounded-2xl shadow-warm-lg p-8"
        >
          <div className="flex flex-col items-center mt-2 mb-8">
            <img src={houseLogo} alt="" aria-hidden="true" className="mb-4 h-24 w-24 object-contain" />
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {awaitingMfa ? "Security check" : "Welcome back"}
            </h1>
            {awaitingMfa ? (
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to finish signing in.
              </p>
            ) : null}
          </div>

          {awaitingMfa ? (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Enter your 6-digit security code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(digitsOnly(e.target.value).slice(0, 6))}
                  disabled={mfaVerifying}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow text-center text-lg tracking-widest font-mono"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={mfaVerifying || mfaCode.length !== 6}
                className="w-full bg-[#C06080] text-[#F5F0E8] font-semibold py-3 rounded-full hover:scale-[1.02] transition-transform shadow-warm disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
              >
                {mfaVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mfaVerifying ? "Verifying…" : "Verify"}
              </button>
              <button
                type="button"
                disabled={mfaVerifying}
                onClick={handleBackToSignIn}
                className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
              >
                ← Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#C06080] text-[#F5F0E8] font-semibold py-3 rounded-full hover:scale-[1.02] transition-transform shadow-warm disabled:opacity-60 disabled:pointer-events-none"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
              <div className="pt-1 space-y-2 text-center">
                <Link to="/forgot-password" className="text-sm text-secondary hover:underline">
                  Forgot password?
                </Link>
                <div className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link to="/signup" className="text-secondary hover:underline">
                    Sign Up
                  </Link>
                  <span className="text-muted-foreground"> in order to donate.</span>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </PublicLayout>
  );
};

export default Login;
