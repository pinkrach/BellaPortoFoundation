import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sailboat } from "lucide-react";
import houseLogo from "@/assets/icons/houseIcon.svg";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const emailIsValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!emailIsValid) return setError("Please enter a valid email address.");

    if (!supabase) {
      setError("Password reset is unavailable: Supabase is not configured.");
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectUrl =
        window.location.hostname === "localhost"
          ? "http://localhost:8080/reset-password"
          : "https://bella-porto-foundation.vercel.app/reset-password";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message || "Unable to send reset email. Please try again.");
        return;
      }

      toast({
        title: "Check your email",
        description: "We sent you a password reset link.",
      });
    } catch {
      setError("Unable to send reset email right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute top-10 right-10 hidden text-accent/20 md:block" aria-hidden="true">
        <Sailboat className="h-32 w-32 rotate-12" />
      </div>
      <div className="pointer-events-none absolute bottom-10 left-10 hidden text-lavender/20 md:block" aria-hidden="true">
        <Sailboat className="h-24 w-24 -rotate-6" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-2xl shadow-warm-lg p-8"
      >
        <div className="flex flex-col items-center mt-2 mb-8">
          <img src={houseLogo} alt="" aria-hidden="true" className="mb-4 h-24 w-24 object-contain" />
          <h1 className="font-heading text-2xl font-bold text-foreground">Reset password</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="forgot-password-email" className="mb-1 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="forgot-password-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full hover:scale-[1.02] transition-transform shadow-warm disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>

          <div className="pt-1 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link
              to="/login"
              className="font-medium text-[hsl(195_30%_32%)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(195_30%_32%)]/35 focus-visible:ring-offset-2"
            >
              Back to Log In
            </Link>
          </div>
        </form>
      </motion.div>
    </main>
  );
};

export default ForgotPassword;

