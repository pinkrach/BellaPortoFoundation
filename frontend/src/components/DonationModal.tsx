import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { findOrCreateSupporter } from "@/lib/supporterRecord";
import { getNextDonationId } from "@/lib/donationIds";
import { isMissingDonationWorkflowColumnMessage, stripDonationWorkflowFields } from "@/lib/donationInsertCompat";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, Landmark, Smartphone } from "lucide-react";

type PaymentMethod = "card" | "apple_pay" | "bank_transfer";

const QUICK_AMOUNTS = [10, 25, 50, 100] as const;

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatAmountTwoDecimals(value: number) {
  return value.toFixed(2);
}

function parseAmountString(raw: string): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : NaN;
}

export function DonationModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
}) {
  const { userId, userEmail, firstName, lastName } = useAuth();

  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isRecurring, setIsRecurring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);

  const amountNumber = useMemo(() => {
    const n = parseAmountString(amount.trim());
    return Number.isFinite(n) ? n : NaN;
  }, [amount]);

  const selectedQuick = useMemo(() => {
    if (!Number.isFinite(amountNumber)) return null;
    for (const q of QUICK_AMOUNTS) {
      if (Math.abs(amountNumber - q) < 0.005) return q;
    }
    return null;
  }, [amountNumber]);

  useEffect(() => {
    if (!didSucceed) return;
    const t = window.setTimeout(() => {
      onOpenChange(false);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [didSucceed, onOpenChange]);

  const reset = () => {
    setAmount("");
    setPaymentMethod("card");
    setIsRecurring(false);
    setErrorMessage(null);
    setIsProcessing(false);
    setDidSucceed(false);
  };

  const handleDonate = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!supabase || !userEmail) {
      setErrorMessage("Donations are unavailable right now. Please refresh and try again.");
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber < 5) {
      setErrorMessage("Donation minimum is $5");
      return;
    }

    const amountValue = Number(amountNumber);

    setIsProcessing(true);

    try {
      const supporter_id = await findOrCreateSupporter({
        userId,
        email: userEmail,
        firstName,
        lastName,
      });

      const donation_date = new Date().toISOString().slice(0, 10);
      const donation_id = await getNextDonationId();

      const payload: Record<string, string | number | boolean> = {
        donation_id,
        supporter_id,
        donation_type: "Monetary",
        donation_date,
        channel_source: paymentMethod,
        is_recurring: isRecurring,
        currency_code: "USD",
        amount: amountValue,
        estimated_value: amountValue,
        submission_status: "confirmed",
      };

      let insertResult = await supabase.from("donations").insert(payload);
      if (insertResult.error && isMissingDonationWorkflowColumnMessage(insertResult.error.message)) {
        insertResult = await supabase.from("donations").insert(stripDonationWorkflowFields(payload));
      }

      if (insertResult.error) {
        throw new Error(insertResult.error.message || "Unable to submit donation.");
      }

      await supabase
        .from("supporters")
        .update({ first_donation_date: donation_date })
        .eq("supporter_id", supporter_id)
        .is("first_donation_date", null);

      await onSuccess();
      setDidSucceed(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to submit donation.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-lg rounded-2xl border-border p-0">
        <div className="p-6 sm:p-7">
          <DialogHeader className="pr-8">
            <DialogTitle className="font-heading text-2xl text-foreground">Make a Donation</DialogTitle>
            <DialogDescription>Enter a gift amount and we’ll record it to your supporter profile.</DialogDescription>
          </DialogHeader>

          {didSucceed ? (
            <div className="mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center">
              <p className="text-lg font-semibold text-foreground">Thank you for your gift!</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your donation of <span className="font-semibold text-foreground">{formatUsd(amountNumber)}</span> has been recorded.
              </p>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleDonate}>
              <div>
                <span className="mb-2 block text-sm font-medium text-foreground">Quick amount</span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((q) => {
                    const selected = selectedQuick === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setAmount(formatAmountTwoDecimals(q))}
                        className={`min-w-[4.5rem] rounded-full border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-primary/40 bg-background text-primary hover:bg-primary/10"
                        }`}
                      >
                        ${q}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  Amount ($) <span className="ml-1 text-destructive">*</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={5}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => {
                    const n = parseAmountString(amount.trim());
                    if (Number.isFinite(n) && n >= 0) {
                      setAmount(formatAmountTwoDecimals(n));
                    }
                  }}
                  placeholder="0.00"
                  required
                  disabled={isProcessing}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm tabular-nums text-foreground disabled:opacity-60"
                />
              </label>

              <div>
                <div className="mb-2 block text-sm font-medium text-foreground">
                  Choose Payment Method <span className="ml-1 text-destructive">*</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      key: "card" as const,
                      label: "Credit/Debit Card",
                      icon: CreditCard,
                    },
                    {
                      key: "apple_pay" as const,
                      label: "Apple Pay",
                      icon: Smartphone,
                    },
                    {
                      key: "bank_transfer" as const,
                      label: "Bank Transfer",
                      icon: Landmark,
                    },
                  ].map((method) => {
                    const active = paymentMethod === method.key;
                    const Icon = method.icon;
                    return (
                      <label
                        key={method.key}
                        className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:bg-muted/30"
                        } ${isProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={method.key}
                          checked={active}
                          onChange={() => setPaymentMethod(method.key)}
                          disabled={isProcessing}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 rounded-lg bg-muted/40 p-2">
                            <Icon className="h-4 w-4 text-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground leading-tight">{method.label}</div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {errorMessage ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : null}

              {isProcessing ? (
                <div className="rounded-2xl bg-primary/5 p-4 text-sm text-primary">Processing Payment...</div>
              ) : null}

              <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-4">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  disabled={isProcessing}
                  className="mt-1 h-5 w-5 accent-[hsl(var(--primary))] disabled:opacity-60"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Make this a monthly recurring donation</div>
                  {isRecurring ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Your card will be charged this amount on the same day each month.
                    </div>
                  ) : null}
                </div>
              </label>

              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {isProcessing ? "Processing..." : "Donate"}
                </button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

