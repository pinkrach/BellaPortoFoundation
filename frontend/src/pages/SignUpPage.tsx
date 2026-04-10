import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sailboat } from "lucide-react";
import { motion } from "framer-motion";
import ReCAPTCHA from "react-google-recaptcha";
import { supabase } from "@/lib/supabaseClient";
import { insertSupporterForNewUser } from "@/lib/supporterRecord";
import { useAuth } from "@/contexts/AuthContext";
import houseLogo from "@/assets/icons/houseIcon.svg";
import { PublicLayout } from "@/components/PublicLayout";
import { buildApiUrl } from "@/lib/api";
import { PASSWORD_LENGTH_ERROR_TEXT, passwordMeetsPolicy } from "@/lib/passwordPolicy";

/** Set `VITE_RECAPTCHA_SITE_KEY` in `frontend/.env` (see `.env.example`); never commit real keys. */
const recaptchaSiteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? "").trim();
const recaptchaConfigured = recaptchaSiteKey.length > 0;

const autoCapitalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());

const SignUpPage = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [captchaVal, setCaptchaVal] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const { setAuthFromProfile } = useAuth();
  const navigate = useNavigate();

  const emailIsValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const passwordMeetsRequirements = useMemo(() => passwordMeetsPolicy(password), [password]);
  const confirmHasText = useMemo(() => confirmPassword.trim().length > 0, [confirmPassword]);
  const passwordsMatch = useMemo(() => password === confirmPassword, [password, confirmPassword]);

  const showPasswordError = (passwordTouched || submitAttempted) && password.length > 0 && !passwordMeetsRequirements;
  const showConfirmMismatch = (confirmTouched || submitAttempted) && confirmHasText && !passwordsMatch;
  const passwordErrorText = PASSWORD_LENGTH_ERROR_TEXT;
  const confirmErrorText = "Passwords do not match";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError("");

    const trimmedEmail = email.trim();
    if (!firstName.trim()) return setError("First name is required.");
    if (!lastName.trim()) return setError("Last name is required.");
    if (!emailIsValid) return setError("Please enter a valid email address.");
    if (!password) return setError("Password is required.");
    if (!passwordMeetsRequirements) {
      return setError(passwordErrorText);
    }
    if (confirmHasText && password !== confirmPassword) return setError(confirmErrorText);
    if (!recaptchaConfigured) {
      return setError(
        "Sign up is unavailable: set VITE_RECAPTCHA_SITE_KEY in frontend/.env (see .env.example).",
      );
    }
    if (!captchaVal) return setError("Please complete the CAPTCHA.");

    setIsSubmitting(true);
    try {
      if (!supabase) {
        setError("Sign up is unavailable: Supabase is not configured.");
        return;
      }

      const registerRes = await fetch(buildApiUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captchaToken: captchaVal,
          email: trimmedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      });

      if (!registerRes.ok) {
        let message = "CAPTCHA verification failed.";
        try {
          const body = (await registerRes.json()) as { message?: string };
          if (body?.message) message = body.message;
        } catch {
          // keep default message
        }
        setError(message);
        recaptchaRef.current?.reset();
        setCaptchaVal(null);
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

      const supporterResult = await insertSupporterForNewUser({
        profile_id: userId,
        email: trimmedEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      if (supporterResult.error) {
        setError(supporterResult.error.message || "Supporter profile could not be created.");
        return;
      }

      await supabase
        .from("profiles")
        .update({
          supporter_onboarding_completed: false,
          supporter_onboarding_existing: supporterResult.wasExisting,
        })
        .eq("id", userId);

      // Manual set: prevent race/blank screen before role is fetched by AuthContext.
      setAuthFromProfile({
        userId,
        email: trimmedEmail,
        role: "donor",
        firstName: supporterResult.supporter?.firstName ?? firstName.trim(),
        lastName: supporterResult.supporter?.lastName ?? lastName.trim(),
        displayName: supporterResult.supporter?.displayName ?? null,
        organizationName: supporterResult.supporter?.organizationName ?? null,
      });

      window.localStorage.setItem(`donor-onboarding-pending:${userId}`, "true");
      window.localStorage.setItem(
        `donor-onboarding-seed:${userId}`,
        JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: trimmedEmail,
        }),
      );

      // Redirect: email confirmation is off, so we should land instantly.
      navigate("/dashboard");
    } catch {
      setError("Unable to create your account right now. Please try again.");
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
            <img
              src={houseLogo}
              alt=""
              aria-hidden="true"
              className="mb-4 h-24 w-24 object-contain"
            />
            <h1 className="font-heading text-2xl font-bold text-foreground">Create account</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="signup-first-name" className="mb-1 block text-sm font-medium text-foreground">
                First name
              </label>
              <input
                id="signup-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(autoCapitalizeName(e.target.value))}
                placeholder="First name"
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="signup-last-name" className="mb-1 block text-sm font-medium text-foreground">
                Last name
              </label>
              <input
                id="signup-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(autoCapitalizeName(e.target.value))}
                placeholder="Last name"
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <div>
              <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                placeholder="Password"
                className={[
                  "w-full rounded-xl border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30",
                  showPasswordError ? "border-destructive" : "border-border",
                ].join(" ")}
                required
                autoComplete="new-password"
              />
              {showPasswordError ? (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {passwordErrorText}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="signup-confirm-password" className="mb-1 block text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
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

          {recaptchaConfigured ? (
            <div className="flex justify-center overflow-x-auto py-1">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={recaptchaSiteKey}
                onChange={(token: string | null) => setCaptchaVal(token)}
              />
            </div>
          ) : (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
              reCAPTCHA is not configured. Add{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_RECAPTCHA_SITE_KEY</code> to{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">frontend/.env</code> (see{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.example</code>).
            </p>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !passwordMeetsRequirements ||
              !recaptchaConfigured ||
              !captchaVal
            }
            className="w-full rounded-full bg-[#ad4f6e] py-3 font-semibold text-white shadow-warm transition-transform hover:scale-[1.02] hover:bg-[#9c4562] disabled:pointer-events-none disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </button>

          <div className="pt-1 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-[hsl(195_30%_32%)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(195_30%_32%)]/35 focus-visible:ring-offset-2"
            >
              Log In
            </Link>
          </div>
        </form>
      </motion.div>
      </div>
    </PublicLayout>
  );
};

export default SignUpPage;
