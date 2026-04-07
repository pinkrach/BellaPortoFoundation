import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Bell, Building2, Lock, Save, ShieldCheck } from "lucide-react";

const SettingsPage = () => {
  const [orgName, setOrgName] = useState("Bella Bay Foundation");
  const [supportEmail, setSupportEmail] = useState("support@bellabay.org");
  const [timezone, setTimezone] = useState("Asia/Manila");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [incidentAlerts, setIncidentAlerts] = useState(true);

  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [enforce2fa, setEnforce2fa] = useState(false);

  return (
    <AdminLayout
      title="Settings"
      subtitle="Example configuration page for organization, notifications, and security controls"
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Organization profile", value: "Configured", icon: Building2 },
            { label: "Notifications", value: emailAlerts ? "Active" : "Paused", icon: Bell },
            { label: "Security mode", value: enforce2fa ? "Strict" : "Standard", icon: ShieldCheck },
            { label: "Session timeout", value: `${sessionTimeout} min`, icon: Lock },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm">
              <card.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-card p-6 shadow-warm">
            <h2 className="font-heading text-2xl font-bold text-foreground">Organization</h2>
            <p className="mt-1 text-sm text-muted-foreground">Basic profile and regional defaults.</p>
            <div className="mt-5 space-y-4">
              <Field label="Organization name">
                <input
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </Field>
              <Field label="Support email">
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(event) => setSupportEmail(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </Field>
              <Field label="Default timezone">
                <select
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                >
                  <option value="Asia/Manila">Asia/Manila</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-6 shadow-warm">
            <h2 className="font-heading text-2xl font-bold text-foreground">Notifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">Control admin alerts and digest behavior.</p>
            <div className="mt-5 space-y-3">
              <Toggle
                label="Email alerts"
                description="Send immediate email alerts for important updates."
                checked={emailAlerts}
                onChange={setEmailAlerts}
              />
              <Toggle
                label="Weekly digest"
                description="Send a weekly KPI and operations summary."
                checked={weeklyDigest}
                onChange={setWeeklyDigest}
              />
              <Toggle
                label="Safety incident alerts"
                description="Notify admins for high-priority case events."
                checked={incidentAlerts}
                onChange={setIncidentAlerts}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-card p-6 shadow-warm">
          <h2 className="font-heading text-2xl font-bold text-foreground">Security</h2>
          <p className="mt-1 text-sm text-muted-foreground">Example account and session controls.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Session timeout (minutes)">
              <input
                type="number"
                min={5}
                max={240}
                value={sessionTimeout}
                onChange={(event) => setSessionTimeout(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>
            <Toggle
              label="Require 2FA for admins"
              description="When enabled, admin accounts must use two-factor authentication."
              checked={enforce2fa}
              onChange={setEnforce2fa}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              Save settings
            </button>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
    {children}
  </label>
);

const Toggle = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-3">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1"
    />
    <span>
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <span className="block text-xs text-muted-foreground">{description}</span>
    </span>
  </label>
);

export default SettingsPage;
