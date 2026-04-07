import { AdminLayout } from "@/components/AdminLayout";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  Home,
  Search,
  Shield,
  Users,
} from "lucide-react";
import {
  getHomeVisitations,
  getInterventionPlans,
  getResidents,
  insertRecord,
} from "@/services/databaseService";
import { toast } from "@/hooks/use-toast";

type ResidentRecord = {
  resident_id: number;
  case_control_no: string | null;
  internal_code: string | null;
  safehouse_name?: string | null;
  current_risk_level: string | null;
  case_status: string | null;
  assigned_social_worker: string | null;
};

type HomeVisitation = {
  visitation_id: number;
  resident_id: number | null;
  visit_date: string | null;
  social_worker: string | null;
  visit_type: string | null;
  location_visited: string | null;
  family_members_present: string | null;
  purpose: string | null;
  observations: string | null;
  family_cooperation_level: string | null;
  safety_concerns_noted: boolean | null;
  follow_up_needed: boolean | null;
  follow_up_notes: string | null;
  visit_outcome: string | null;
};

type InterventionPlan = {
  plan_id: number;
  resident_id: number | null;
  plan_category: string | null;
  plan_description: string | null;
  services_provided: string | null;
  target_value: number | null;
  target_date: string | null;
  status: string | null;
  case_conference_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const visitTypeOptions = [
  "Initial assessment",
  "Routine follow-up",
  "Reintegration assessment",
  "Post-placement monitoring",
  "Emergency",
];

const cooperationOptions = ["High", "Moderate", "Low", "Resistant", "Unknown"];

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.04, duration: 0.25 },
  }),
};

const fallback = "Not recorded";

function residentLabel(resident: ResidentRecord) {
  return resident.case_control_no || resident.internal_code || `Resident #${resident.resident_id}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function nextVisitId(rows: Array<{ visitation_id?: number | null }>) {
  return rows.reduce((max, row) => Math.max(max, row.visitation_id ?? 0), 0) + 1;
}

const HomeVisitationsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);
  const [form, setForm] = useState({
    resident_id: "",
    visit_date: "",
    social_worker: "",
    visit_type: "Routine follow-up",
    location_visited: "",
    family_members_present: "",
    purpose: "",
    observations: "",
    family_cooperation_level: "Moderate",
    safety_concerns_noted: false,
    follow_up_needed: true,
    follow_up_notes: "",
    visit_outcome: "",
  });

  const residentsQuery = useQuery({
    queryKey: ["residents"],
    queryFn: async () => (await getResidents()) as ResidentRecord[],
  });

  const visitationsQuery = useQuery({
    queryKey: ["home-visitations"],
    queryFn: async () => (await getHomeVisitations()) as HomeVisitation[],
  });

  const interventionPlansQuery = useQuery({
    queryKey: ["intervention-plans"],
    queryFn: async () => (await getInterventionPlans()) as InterventionPlan[],
  });

  const residents = residentsQuery.data ?? [];
  const visitations = visitationsQuery.data ?? [];
  const interventionPlans = interventionPlansQuery.data ?? [];

  const filteredResidents = useMemo(() => {
    return residents.filter((resident) => {
      const text = [
        residentLabel(resident),
        resident.resident_id,
        resident.safehouse_name,
        resident.assigned_social_worker,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(search.trim().toLowerCase());
    });
  }, [residents, search]);

  const selectedResident =
    filteredResidents.find((resident) => resident.resident_id === selectedResidentId) ??
    residents.find((resident) => resident.resident_id === selectedResidentId) ??
    filteredResidents[0] ??
    residents[0] ??
    null;

  const residentId = selectedResident?.resident_id ?? null;

  const residentVisitations = useMemo(() => {
    return visitations
      .filter((visitation) => visitation.resident_id === residentId)
      .sort((a, b) => new Date(b.visit_date || "").getTime() - new Date(a.visit_date || "").getTime());
  }, [residentId, visitations]);

  const residentConferences = useMemo(() => {
    return interventionPlans
      .filter((plan) => plan.resident_id === residentId && plan.case_conference_date)
      .sort((a, b) => new Date(a.case_conference_date || "").getTime() - new Date(b.case_conference_date || "").getTime());
  }, [interventionPlans, residentId]);

  const now = Date.now();
  const upcomingConferences = residentConferences.filter(
    (plan) => new Date(plan.case_conference_date || "").getTime() >= now,
  );
  const conferenceHistory = residentConferences.filter(
    (plan) => new Date(plan.case_conference_date || "").getTime() < now,
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      return insertRecord("home_visitations", {
        visitation_id: nextVisitId(visitations),
        resident_id: Number(form.resident_id),
        visit_date: form.visit_date,
        social_worker: form.social_worker.trim() || null,
        visit_type: form.visit_type,
        location_visited: form.location_visited.trim() || null,
        family_members_present: form.family_members_present.trim() || null,
        purpose: form.purpose.trim() || null,
        observations: form.observations.trim() || null,
        family_cooperation_level: form.family_cooperation_level || null,
        safety_concerns_noted: form.safety_concerns_noted,
        follow_up_needed: form.follow_up_needed,
        follow_up_notes: form.follow_up_notes.trim() || null,
        visit_outcome: form.visit_outcome.trim() || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["home-visitations"] });
      toast({
        title: "Home visitation saved",
        description: "The visit has been added to the resident record.",
      });
      setForm((current) => ({
        ...current,
        visit_date: "",
        location_visited: "",
        family_members_present: "",
        purpose: "",
        observations: "",
        follow_up_notes: "",
        visit_outcome: "",
        safety_concerns_noted: false,
        follow_up_needed: true,
      }));
    },
    onError: (error) => {
      toast({
        title: "Unable to save home visitation",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const handleResidentOpen = (resident: ResidentRecord) => {
    setSelectedResidentId(resident.resident_id);
    setForm((current) => ({
      ...current,
      resident_id: String(resident.resident_id),
      social_worker: current.social_worker || resident.assigned_social_worker || "",
    }));
  };

  return (
    <AdminLayout
      title="Home Visitations & Case Conferences"
      subtitle="Live field visit logging, home assessments, and case conference timelines for each resident"
    >
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Residents", value: residents.length, detail: "Residents available for field documentation", icon: Users },
            { label: "Visitations", value: visitations.length, detail: "Total home and field visits logged", icon: Home },
            { label: "Upcoming conferences", value: upcomingConferences.length, detail: "Upcoming case conferences for selected resident", icon: CalendarClock },
            {
              label: "Safety concerns",
              value: visitations.filter((visit) => visit.safety_concerns_noted).length,
              detail: "Visit records with safety concerns",
              icon: AlertTriangle,
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-warm"
            >
              <item.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{item.value.toLocaleString()}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            </motion.div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl bg-card p-5 shadow-warm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">Residents</h2>
                <p className="text-sm text-muted-foreground">Select a resident to view visits and conference history.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search resident, safehouse, social worker..."
                  className="w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {filteredResidents.map((resident, index) => (
                <motion.button
                  key={resident.resident_id}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  onClick={() => handleResidentOpen(resident)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-warm ${
                    selectedResident?.resident_id === resident.resident_id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/70 bg-background"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{residentLabel(resident)}</h3>
                        <span className="text-xs text-muted-foreground">ID {resident.resident_id}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {resident.safehouse_name || fallback} · {resident.assigned_social_worker || fallback}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80">
                          {resident.case_status || fallback}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80">
                          {resident.current_risk_level || fallback}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-5 shadow-warm">
              <h2 className="font-heading text-2xl font-bold text-foreground">Log home or field visit</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Record home conditions, cooperation level, safety concerns, and follow-up actions for the selected resident.
              </p>

              <form
                className="mt-5 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitMutation.mutate();
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Resident">
                    <select
                      value={form.resident_id}
                      onChange={(event) => setForm((current) => ({ ...current, resident_id: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      required
                    >
                      <option value="">Select resident</option>
                      {residents.map((resident) => (
                        <option key={resident.resident_id} value={resident.resident_id}>
                          {residentLabel(resident)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Visit date">
                    <input
                      type="date"
                      value={form.visit_date}
                      onChange={(event) => setForm((current) => ({ ...current, visit_date: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      required
                    />
                  </FormField>

                  <FormField label="Social worker">
                    <input
                      value={form.social_worker}
                      onChange={(event) => setForm((current) => ({ ...current, social_worker: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      required
                    />
                  </FormField>

                  <FormField label="Visit type">
                    <select
                      value={form.visit_type}
                      onChange={(event) => setForm((current) => ({ ...current, visit_type: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      {visitTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Location visited">
                    <input
                      value={form.location_visited}
                      onChange={(event) => setForm((current) => ({ ...current, location_visited: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      placeholder="Household, placement site, school, barangay office..."
                    />
                  </FormField>

                  <FormField label="Family cooperation level">
                    <select
                      value={form.family_cooperation_level}
                      onChange={(event) => setForm((current) => ({ ...current, family_cooperation_level: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      {cooperationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Family members present">
                    <textarea
                      rows={3}
                      value={form.family_members_present}
                      onChange={(event) => setForm((current) => ({ ...current, family_members_present: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      placeholder="List family members or supports present during the visit."
                    />
                  </FormField>

                  <FormField label="Purpose">
                    <textarea
                      rows={3}
                      value={form.purpose}
                      onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      placeholder="Why was the visit conducted?"
                    />
                  </FormField>
                </div>

                <FormField label="Observations about the home environment">
                  <textarea
                    rows={4}
                    value={form.observations}
                    onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="Describe home conditions, risks, support systems, and any notable field observations."
                    required
                  />
                </FormField>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Follow-up actions">
                    <textarea
                      rows={4}
                      value={form.follow_up_notes}
                      onChange={(event) => setForm((current) => ({ ...current, follow_up_notes: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      placeholder="Document follow-up actions, referrals, or assigned tasks."
                    />
                  </FormField>

                  <FormField label="Visit outcome">
                    <textarea
                      rows={4}
                      value={form.visit_outcome}
                      onChange={(event) => setForm((current) => ({ ...current, visit_outcome: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      placeholder="Summarize the overall visit outcome."
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckboxRow
                    label="Safety concerns noted"
                    checked={form.safety_concerns_noted}
                    onChange={(checked) => setForm((current) => ({ ...current, safety_concerns_noted: checked }))}
                  />
                  <CheckboxRow
                    label="Follow-up needed"
                    checked={form.follow_up_needed}
                    onChange={(checked) => setForm((current) => ({ ...current, follow_up_needed: checked }))}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitMutation.isPending || !form.resident_id}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitMutation.isPending ? "Saving..." : "Save visitation"}
                  </button>
                </div>
              </form>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl bg-card p-5 shadow-warm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">Visit history</h2>
                    <p className="text-sm text-muted-foreground">
                      Home and field visits for {selectedResident ? residentLabel(selectedResident) : "the selected resident"}.
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {residentVisitations.length} visits
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {residentVisitations.length === 0 ? (
                    <div className="rounded-2xl bg-muted/25 p-5 text-sm text-muted-foreground">
                      No visitations have been logged for this resident yet.
                    </div>
                  ) : (
                    residentVisitations.map((visit, index) => (
                      <motion.div
                        key={visit.visitation_id}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        className="rounded-2xl border border-border/70 bg-background p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{formatDate(visit.visit_date)}</p>
                            <p className="text-sm text-muted-foreground">
                              {visit.social_worker || fallback} · {visit.visit_type || fallback}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {visit.safety_concerns_noted ? (
                              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">Safety concern</span>
                            ) : null}
                            {visit.follow_up_needed ? (
                              <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">Follow-up needed</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <InfoCard title="Visit details">
                            <p>Location: {visit.location_visited || fallback}</p>
                            <p>Family cooperation: {visit.family_cooperation_level || fallback}</p>
                            <p>Family members present: {visit.family_members_present || fallback}</p>
                          </InfoCard>
                          <InfoCard title="Purpose and outcome">
                            <p>Purpose: {visit.purpose || fallback}</p>
                            <p>Outcome: {visit.visit_outcome || fallback}</p>
                          </InfoCard>
                          <InfoCard title="Observations">
                            <p>{visit.observations || fallback}</p>
                          </InfoCard>
                          <InfoCard title="Follow-up actions">
                            <p>{visit.follow_up_notes || fallback}</p>
                          </InfoCard>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl bg-card p-5 shadow-warm">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-2xl font-bold text-foreground">Upcoming case conferences</h2>
                  </div>
                  <div className="mt-5 space-y-3">
                    {upcomingConferences.length === 0 ? (
                      <div className="rounded-2xl bg-muted/25 p-4 text-sm text-muted-foreground">
                        No upcoming case conferences are recorded for this resident.
                      </div>
                    ) : (
                      upcomingConferences.map((plan, index) => (
                        <ConferenceCard key={plan.plan_id} plan={plan} index={index} />
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-card p-5 shadow-warm">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-2xl font-bold text-foreground">Conference history</h2>
                  </div>
                  <div className="mt-5 space-y-3">
                    {conferenceHistory.length === 0 ? (
                      <div className="rounded-2xl bg-muted/25 p-4 text-sm text-muted-foreground">
                        No past case conferences are recorded for this resident.
                      </div>
                    ) : (
                      conferenceHistory.map((plan, index) => (
                        <ConferenceCard key={plan.plan_id} plan={plan} index={index} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
    {children}
  </label>
);

const CheckboxRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm text-foreground">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span>{label}</span>
  </label>
);

const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl bg-muted/25 p-4">
    <p className="text-xs uppercase tracking-[0.16em] text-primary">{title}</p>
    <div className="mt-2 space-y-2 text-sm leading-6 text-foreground/90">{children}</div>
  </div>
);

const ConferenceCard = ({ plan, index }: { plan: InterventionPlan; index: number }) => (
  <motion.div
    custom={index}
    initial="hidden"
    animate="visible"
    variants={fadeUp}
    className="rounded-2xl border border-border/70 bg-background p-4"
  >
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-foreground">{formatDate(plan.case_conference_date)}</p>
        <p className="text-sm text-muted-foreground">
          {plan.plan_category || fallback} · {plan.status || fallback}
        </p>
      </div>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground/80">
        {plan.target_date ? `Target ${formatDate(plan.target_date)}` : "No target date"}
      </span>
    </div>

    <div className="mt-3 space-y-2 text-sm leading-6 text-foreground/90">
      <p>{plan.plan_description || fallback}</p>
      {plan.services_provided ? <p className="text-muted-foreground">Services: {plan.services_provided}</p> : null}
    </div>
  </motion.div>
);

export default HomeVisitationsPage;
