import { useMemo, useState } from "react";
import { ArrowRight, HandHeart } from "lucide-react";
import { Link } from "react-router-dom";

import type { DonationAllocationGroup, PublicImpactPageData } from "@/services/publicImpactPageData";

function formatPhp(value: number) {
  return `PHP ${Math.round(value).toLocaleString()}`;
}

function clampAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

type DonationImpactCalculatorProps = {
  donateLink: string;
  calculator: PublicImpactPageData["calculator"];
  groupedAllocation: DonationAllocationGroup[];
};

export function DonationImpactCalculator({
  donateLink,
  calculator,
  groupedAllocation,
}: DonationImpactCalculatorProps) {
  const [amount, setAmount] = useState(calculator.defaultAmount);

  const safeAmount = clampAmount(amount);
  const impactEstimates = useMemo(() => calculator.estimatesForAmount(safeAmount || calculator.defaultAmount), [calculator, safeAmount]);
  const allocationRows = useMemo(
    () =>
      groupedAllocation.map((item) => ({
        ...item,
        estimatedAmount: safeAmount * (item.percent / 100),
      })),
    [groupedAllocation, safeAmount],
  );

  return (
    <section
      id="impact-calculator"
      className="rounded-[2rem] border border-[hsl(37_28%_85%)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(245,240,232,0.92)_100%)] p-6 shadow-[0_30px_80px_-50px_rgba(28,43,53,0.65)] md:p-8"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(195_28%_49%_/_0.1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(195_28%_36%)]">
            <HandHeart className="h-4 w-4" />
            Donation impact calculator
          </div>
          <h2 className="mt-4 font-heading text-3xl text-[hsl(200_24%_18%)] md:text-4xl">
            Turn a gift into visible change
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[hsl(200_12%_40%)]">
            Choose a giving amount to see how recent allocation patterns translate donor support into education, healing,
            housing, and outreach.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              {calculator.presets.map((preset) => {
                const isActive = safeAmount === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "border-[hsl(266_34%_63%)] bg-[hsl(266_34%_63%)] text-white shadow-[0_14px_28px_-18px_rgba(155,127,192,0.95)]"
                        : "border-[hsl(37_24%_82%)] bg-white/85 text-[hsl(200_24%_18%)] hover:border-[hsl(266_34%_70%)] hover:bg-[hsl(266_34%_96%)]"
                    }`}
                  >
                    {formatPhp(preset)}
                  </button>
                );
              })}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[hsl(200_24%_18%)]">Custom amount</span>
              <input
                type="number"
                min={100}
                step={100}
                value={safeAmount || ""}
                onChange={(event) => setAmount(clampAmount(Number(event.target.value)))}
                placeholder="Enter amount"
                className="h-12 w-full rounded-2xl border border-[hsl(37_24%_82%)] bg-white/85 px-4 text-base text-[hsl(200_24%_18%)] outline-none transition focus:border-[hsl(266_34%_63%)] focus:ring-4 focus:ring-[hsl(266_34%_63%_/_0.12)]"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_-30px_rgba(28,43,53,0.42)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(200_20%_42%)]">Estimated impact</p>
                <p className="mt-2 font-heading text-3xl text-[hsl(200_24%_18%)]">{formatPhp(safeAmount || calculator.defaultAmount)}</p>
              </div>
              <Link
                to={donateLink}
                className="inline-flex items-center gap-2 rounded-full bg-[hsl(266_34%_63%)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[hsl(266_34%_58%)]"
              >
                Donate {formatPhp(safeAmount || calculator.defaultAmount)}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {impactEstimates.map((item) => (
                <div key={item.label} className="rounded-2xl bg-[hsl(37_55%_97%)] p-4">
                  <p className="text-sm font-semibold text-[hsl(200_24%_18%)]">{item.label}</p>
                  <p className="mt-2 font-heading text-2xl text-[hsl(200_24%_18%)]">
                    {item.value.toLocaleString()} <span className="text-base">{item.suffix}</span>
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(200_12%_40%)]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/88 p-5 shadow-[0_18px_50px_-30px_rgba(28,43,53,0.42)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(200_20%_42%)]">Allocation breakdown</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(200_12%_40%)]">
                  Based on the latest allocation mix already used by the reports pipeline.
                </p>
              </div>
            </div>

            <div className="mt-5 h-4 overflow-hidden rounded-full bg-[hsl(37_30%_90%)]">
              <div className="flex h-full">
                {allocationRows.map((item) => (
                  <div key={item.label} className="h-full" style={{ width: `${item.percent}%`, backgroundColor: item.tone }} />
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {allocationRows.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[hsl(37_24%_88%)] bg-[hsl(40_42%_99%)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.tone }} />
                    <p className="text-sm font-semibold text-[hsl(200_24%_18%)]">{item.label}</p>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-[hsl(200_24%_18%)]">{item.percent.toFixed(0)}%</p>
                  <p className="mt-1 text-sm text-[hsl(200_12%_40%)]">{formatPhp(item.estimatedAmount)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
