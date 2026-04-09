import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sailboat } from "lucide-react";
import houseLogo from "@/assets/icons/houseIcon.svg";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { PublicLayout } from "@/components/PublicLayout";
import {
  PASSWORD_LENGTH_ERROR_TEXT,
  PASSWORD_REQUIREMENT_TEXT,
  passwordMeetsPolicy,
} from "@/lib/passwordPolicy";

const UpdatePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const passwordMeetsRequirements = useMemo(() => passwordMeetsPolicy(newPassword), [newPassword]);
  const confirmHasText = useMemo(() => confirmPassword.trim().length > 0, [confirmPassword]);
  const passwordsMatch = useMemo(
    () => newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword],
  );
  const showPasswordError =
    (passwordTouched || submitAttempted) && newPassword.trim().length > 0 && !passwordMeetsRequirements;
  const showConfirmMismatch = (confirmTouched || submitAttempted) && confirmHasText && !passwordsMatch;
  const passwordErrorText = PASSWORD_LENGTH_ERROR_TEXT;
  const confirmErrorText = "Passwords do not match";

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
    setSubmitAttempted(true);
    setError("");

    if (!newPassword.trim()) return setError("New password is required.");
    if (!passwordMeetsRequirements) {
      return setError(passwordErrorText);
    }
    if (confirmHasText && newPassword !== confirmPassword) return setError(confirmErrorText);
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
    <PublicLayout hideFooter hideNavbar>
      <Link
        to="/"
        className="fixed left-4 top-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-sm bg-background/70 px-2.5 py-1.5 text-[#1E2933] backdrop-blur-sm transition-colors hover:bg-background/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(200_20%_40%)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <img src={houseLogo} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
        <span className="font-heading text-lg font-semibold tracking-tight md:text-xl">
          Bella Bay Foundation
        </span>
      </Link>

      <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-background p-4">
        <div className="pointer-events-none absolute top-10 right-10 hidden text-accent/20 md:block" aria-hidden="true">
          <Sailboat className="h-32 w-32 rotate-12" />
        </div>
        <div className="pointer-events-none absolute bottom-10 left-10 hidden text-lavender/20 md:block" aria-hidden="true">
          <Sailboat className="h-24 w-24 -rotate-6" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-card p-8 shadow-warm-lg"
        >
          <div className="mt-2 mb-8 flex flex-col items-center">
            <img src={houseLogo} alt="" aria-hidden="true" className="mb-4 h-24 w-24 object-contain" />
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

          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                placeholder="New password"
                className={[
                  "w-full px-4 py-3 rounded-xl bg-muted border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow",
                  showPasswordError ? "border-destructive" : "border-border",
                ].join(" ")}
                required
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-muted-foreground">{PASSWORD_REQUIREMENT_TEXT}</p>
              <div
                className={[
                  "overflow-hidden transition-[max-height,opacity] duration-200",
                  showPasswordError ? "max-h-10 opacity-100" : "max-h-0 opacity-0",
                ].join(" ")}
              >
                <div className="mt-1 text-xs text-destructive">{passwordErrorText}</div>
              </div>
            </div>

            <div>
              <label htmlFor="update-password-confirm" className="mb-1 block text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="update-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmTouched(true)}
                placeholder="Confirm password"
                className={[
                  "w-full rounded-xl border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30",
                  showConfirmMismatch ? "border-destructive" : "border-border",
                ].join(" ")}
                required
                autoComplete="new-password"
              />
              <div
                className={[
                  "overflow-hidden transition-[max-height,opacity] duration-200",
                  showConfirmMismatch ? "max-h-6 opacity-100" : "max-h-0 opacity-0",
                ].join(" ")}
              >
                <div className="mt-1 text-xs text-destructive">{confirmErrorText}</div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !canReset || !passwordMeetsRequirements || !passwordsMatch}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-full hover:scale-[1.02] transition-transform shadow-warm disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>

            <div className="pt-1 text-center text-sm text-muted-foreground">
              <Link
                to="/forgot-password"
                className="font-medium text-[hsl(195_30%_32%)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(195_30%_32%)]/35 focus-visible:ring-offset-2"
              >
                Request a new reset link
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </PublicLayout>
  );
};

export default UpdatePassword;

