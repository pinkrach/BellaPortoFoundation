import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

const UpdatePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReset, setCanReset] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const hasMinLength = useMemo(() => newPassword.length >= 8, [newPassword]);
  const hasUppercase = useMemo(() => /[A-Z]/.test(newPassword), [newPassword]);
  const hasSpecial = useMemo(() => /[!@#$%^&*]/.test(newPassword), [newPassword]);
  const passwordMeetsRequirements = useMemo(
    () => hasMinLength && hasUppercase && hasSpecial,
    [hasMinLength, hasUppercase, hasSpecial],
  );
  const passwordsMatch = useMemo(
    () => newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword],
  );

  useEffect(() => {
    let mounted = true;

    const checkRecovery = async () => {
      if (!supabase) {
        if (!mounted) return;
        setError("Password update is unavailable: Supabase is not configured.");
        return;
      }

      // If the user arrived via a recovery link, Supabase will typically establish a session.
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setCanReset(true);
        return;
      }
    };

    checkRecovery();

    const sub = supabase?.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") setCanReset(true);
    });

    return () => {
      mounted = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword.trim()) return setError("New password is required.");
    if (!passwordMeetsRequirements) {
      return setError(
        "Password must be at least 8 characters and include 1 uppercase letter and 1 special character (!@#$%^&*).",
      );
    }
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    if (!supabase) {
      setError("Password update is unavailable: Supabase is not configured.");
      return;
    }
    if (!canReset) {
      setError("This reset link is invalid or expired. Please request a new one.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message || "Unable to update password. Please try again.");
        return;
      }

      toast({
        title: "Password updated",
        description: "You can now log in with your new password.",
      });

      navigate("/login");
    } catch {
      setError("Unable to update password right now. Please try again.");
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
          <h1 className="font-heading text-2xl font-bold text-foreground">Set a new password</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
          )}

          {!canReset && (
            <div className="bg-muted text-muted-foreground text-sm p-3 rounded-lg">
              This page only works from a password recovery link.
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <div className="text-sm font-medium text-foreground mb-2">Password requirements</div>
            <ul className="space-y-1 text-sm">
              <li className={hasMinLength ? "text-emerald-600" : "text-muted-foreground"}>
                At least 8 characters
              </li>
              <li className={hasUppercase ? "text-emerald-600" : "text-muted-foreground"}>
                Contains an uppercase letter (A–Z)
              </li>
              <li className={hasSpecial ? "text-emerald-600" : "text-muted-foreground"}>
                Contains a special character (!@#$%^&*)
              </li>
              <li className={passwordsMatch ? "text-emerald-600" : "text-muted-foreground"}>
                Passwords match
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !canReset || !passwordMeetsRequirements || !passwordsMatch}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full hover:scale-[1.02] transition-transform shadow-warm disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>

          <div className="pt-1 text-center text-sm text-muted-foreground">
            <Link to="/forgot-password" className="text-secondary hover:underline">
              Request a new reset link
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default UpdatePassword;

