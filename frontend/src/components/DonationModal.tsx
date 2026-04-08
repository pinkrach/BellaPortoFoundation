import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, CreditCard, Landmark, Smartphone } from "lucide-react";

type PaymentMethod = "card" | "apple_pay" | "bank_transfer";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
  const { userEmail } = useAuth();

  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [message, setMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);

  const amountNumber = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : NaN;
  }, [amount]);

  const reset = () => {
    setAmount("");
    setPaymentMethod("card");
    setMessage("");
    setErrorMessage(null);
    setIsProcessing(false);
    setDidSucceed(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!supabase || !userEmail) {
      setErrorMessage("Donations are unavailable right now. Please refresh and try again.");
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0.");
      return;
    }

    setIsProcessing(true);
    const startedAt = Date.now();

    try {
      const { data: supporter, error: supporterError } = await supabase
        .from("supporters")
        .select("supporter_id")
        .eq("email", userEmail)
        .maybeSingle();

      if (supporterError || !supporter?.supporter_id) {
        throw new Error("We couldn’t find your supporter record. Please contact an admin.");
      }

      const payload: Record<string, string | number | null> = {
        supporter_id: supporter.supporter_id,
        donation_type: "Monetary",
        donation_date: new Date().toISOString(),
        currency_code: "USD",
        amount: amountNumber,
        estimated_value: amountNumber,
        notes: message.trim() ? message.trim() : null,
      };

      const { error: insertError } = await supabase.from("donations").insert(payload);
      if (insertError) {
        throw new Error(insertError.message || "Unable to submit donation.");
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed < 2000) {
        await sleep(2000 - elapsed);
      }

      setDidSucceed(true);
      await onSuccess();
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
            <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-5">
              <p className="text-base font-semibold text-foreground">Thank you!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your donation of <span className="font-semibold text-foreground">{formatUsd(amountNumber)}</span> has been recorded.
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  Amount ($) <span className="ml-1 text-destructive">*</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={isProcessing}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground disabled:opacity-60"
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
                      hint: "Visa, Mastercard",
                    },
                    {
                      key: "apple_pay" as const,
                      label: "Apple Pay",
                      icon: Smartphone,
                      hint: "Demo placeholder",
                    },
                    {
                      key: "bank_transfer" as const,
                      label: "Bank Transfer",
                      icon: Landmark,
                      hint: "Demo placeholder",
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
                            <div className="mt-1 text-xs text-muted-foreground">{method.hint}</div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  Demo note: payment methods are visual placeholders only.
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Message</span>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isProcessing}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground disabled:opacity-60"
                />
              </label>

              {errorMessage ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : null}

              {isProcessing ? (
                <div className="rounded-2xl bg-primary/5 p-4 text-sm text-primary">Processing Payment...</div>
              ) : null}

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

