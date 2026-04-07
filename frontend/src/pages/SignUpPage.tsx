import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

const SignUpPage = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setAuthFromProfile } = useAuth();
  const navigate = useNavigate();

  const emailIsValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!firstName.trim()) return setError("First name is required.");
    if (!lastName.trim()) return setError("Last name is required.");
    if (!emailIsValid) return setError("Please enter a valid email address.");
    if (!password) return setError("Password is required.");

    setIsSubmitting(true);
    try {
      if (!supabase) {
        setError("Sign up is unavailable: Supabase is not configured.");
        return;
      }

      // Step 1: Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (signUpError) {
        setError(signUpError.message || "Unable to sign up. Please try again.");
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        setError("Account created, but no user id was returned.");
        return;
      }

      // Step 2: Create profile row
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: trimmedEmail,
        role: "donor",
      });

      if (profileError) {
        const message =
          profileError.message ||
          "Profile insert failed. Check RLS policies on the profiles table.";
        alert(`Profile insert failed: ${message}`);
        setError(message);
        return;
      }

      // Manual set: prevent race/blank screen before role is fetched by AuthContext.
      setAuthFromProfile({
        userId,
        email: trimmedEmail,
        role: "donor",
      });

      // Redirect: email confirmation is off, so we should land instantly.
      navigate("/dashboard");
    } catch {
      setError("Unable to create your account right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
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
          <h1 className="font-heading text-2xl font-bold text-foreground">Create account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                required
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                required
                autoComplete="family-name"
              />
            </div>
          </div>

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
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full hover:scale-[1.02] transition-transform shadow-warm disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </button>

          <div className="pt-1 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-secondary hover:underline">
              Log In
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SignUpPage;

