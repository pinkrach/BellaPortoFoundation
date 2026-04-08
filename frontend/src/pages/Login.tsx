import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { buildApiUrl } from "@/lib/api";
import { Anchor, Leaf } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const emailIsValid = useMemo(() => {
    // Simple but reliable enough for client-side validation.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

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
      if (result.ok) {
        // If role isn't available yet, re-check once through the backend profile endpoint.
        let role = result.role;
        if (!role && supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (accessToken) {
            try {
              const response = await fetch(buildApiUrl("/api/profiles/me"), {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              const profile = response.ok ? ((await response.json()) as { role?: string | null }) : null;
              if (profile?.role === "admin" || profile?.role === "donor") role = profile.role;
            } catch {
              // Let the redirect logic fall through to the safe fallback below.
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
        return;
      }
      setError(result.message || "Incorrect email or password.");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-10 right-10 text-accent/20">
        <Leaf className="h-32 w-32 rotate-45" />
      </div>
      <div className="absolute bottom-10 left-10 text-lavender/20">
        <Leaf className="h-24 w-24 -rotate-12" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-2xl shadow-warm-lg p-8"
      >
        <div className="flex flex-col items-center mt-2 mb-10">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6">
            <Anchor className="h-7 w-7 text-accent" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Welcome back</h1>
        </div>

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
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full hover:scale-[1.02] transition-transform shadow-warm disabled:opacity-60 disabled:pointer-events-none"
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
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
