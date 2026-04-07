import { AdminLayout } from "@/components/AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  FileHeart,
  Filter,
  HeartPulse,
  Home,
  Search,
  ShieldAlert,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { getResidentProfileBundle, getResidents } from "@/services/databaseService";

type ResidentRecord = {
  resident_id: number;
  case_control_no: string | null;
  internal_code: string | null;
  safehouse_id: number | null;
  safehouse_name?: string | null;
  case_status: string | null;
  sex: string | null;
  date_of_birth: string | null;
  birth_status: string | null;
  place_of_birth: string | null;
  religion: string | null;
  case_category: string | null;
  sub_cat_orphaned: boolean | null;
  sub_cat_trafficked: boolean | null;
  sub_cat_child_labor: boolean | null;
  sub_cat_physical_abuse: boolean | null;
  sub_cat_sexual_abuse: boolean | null;
  sub_cat_osaec: boolean | null;
  sub_cat_cicl: boolean | null;
  sub_cat_at_risk: boolean | null;
  sub_cat_street_child: boolean | null;
  sub_cat_child_with_hiv: boolean | null;
  is_pwd: boolean | null;
  pwd_type: string | null;
  has_special_needs: boolean | null;
  special_needs_diagnosis: string | null;
  family_is_4ps: boolean | null;
  family_solo_parent: boolean | null;
  family_indigenous: boolean | null;
  family_parent_pwd: boolean | null;
  family_informal_settler: boolean | null;
  date_of_admission: string | null;
  age_upon_admission: string | null;
  present_age: string | null;
  length_of_stay: string | null;
  referral_source: string | null;
  referring_agency_person: string | null;
  date_colb_registered: string | null;
  date_colb_obtained: string | null;
  assigned_social_worker: string | null;
  initial_case_assessment: string | null;
  date_case_study_prepared: string | null;
  reintegration_type: string | null;
  reintegration_status: string | null;
  initial_risk_level: string | null;
  current_risk_level: string | null;
  date_enrolled: string | null;
  date_closed: string | null;
  created_at: string | null;
  notes_restricted: string | null;
};

type ResidentProfileBundle = {
  resident: ResidentRecord;
  educationRecords: Array<Record<string, unknown>>;
  healthRecords: Array<Record<string, unknown>>;
  homeVisitations: Array<Record<string, unknown>>;
  incidentReports: Array<Record<string, unknown>>;
  interventionPlans: Array<Record<string, unknown>>;
  processRecordings: Array<Record<string, unknown>>;
};

const fallback = "Not recorded";

const statusColors: Record<string, string> = {
  Active: "bg-primary/10 text-primary",
  Open: "bg-primary/10 text-primary",
  Transferred: "bg-secondary/15 text-secondary",
  Closed: "bg-muted text-muted-foreground",
};

const riskColors: Record<string, string> = {
  Low: "bg-sage/20 text-sage",
  Medium: "bg-secondary/15 text-secondary",
  High: "bg-destructive/10 text-destructive",
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.04, duration: 0.28 },
  }),
};

function formatDate(value: string | null | undefined) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function normalizeRisk(risk: string | null | undefined) {
  if (!risk) return "Unknown";
  const normalized = risk.trim().toLowerCase();
  if (normalized.startsWith("high")) return "High";
  if (normalized.startsWith("med")) return "Medium";
  if (normalized.startsWith("low")) return "Low";
  return risk;
}

function parseAgeText(resident: ResidentRecord) {
  if (resident.present_age && resident.present_age.trim()) return resident.present_age;
  if (!resident.date_of_birth) return fallback;
  const dob = new Date(resident.date_of_birth);
  if (Number.isNaN(dob.getTime())) return fallback;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return String(age);
}

function renderValue(value: unknown) {
  if (value == null || value === "") return fallback;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function extractCaseTags(resident: ResidentRecord) {
  const tags: string[] = [];
  if (resident.sub_cat_trafficked) tags.push("Trafficked");
  if (resident.sub_cat_orphaned) tags.push("Orphaned");
  if (resident.sub_cat_child_labor) tags.push("Child labor");
  if (resident.sub_cat_physical_abuse) tags.push("Physical abuse");
  if (resident.sub_cat_sexual_abuse) tags.push("Sexual abuse");
  if (resident.sub_cat_osaec) tags.push("OSAEC");
  if (resident.sub_cat_cicl) tags.push("CICL");
  if (resident.sub_cat_at_risk) tags.push("At risk");
  if (resident.sub_cat_street_child) tags.push("Street child");
  if (resident.sub_cat_child_with_hiv) tags.push("Child with HIV");
  return tags;
}

function latestRecord<T extends Record<string, unknown>>(records: T[]) {
  return records[0] ?? null;
}

const CaseloadInventory = () => {
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);

  const residentsQuery = useQuery({
    queryKey: ["residents"],
    queryFn: async () => (await getResidents()) as ResidentRecord[],
  });

  const residents = residentsQuery.data ?? [];

  const filteredResidents = useMemo(() => {
    return residents.filter((resident) => {
      const query = search.trim().toLowerCase();
      const searchText = [
        resident.case_control_no,
        resident.internal_code,
        resident.resident_id,
        resident.safehouse_name,
        resident.assigned_social_worker,
        resident.case_category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchText.includes(query)) return false;

      const location = (resident.safehouse_name || "Unassigned").trim();
      if (filterLocation && location !== filterLocation) return false;

      const risk = normalizeRisk(resident.current_risk_level);
      if (filterRisk && risk !== filterRisk) return false;

      return true;
    });
  }, [filterLocation, filterRisk, residents, search]);

  const selectedResident =
    filteredResidents.find((resident) => resident.resident_id === selectedResidentId) ??
    residents.find((resident) => resident.resident_id === selectedResidentId) ??
    null;

  const residentProfileQuery = useQuery({
    queryKey: ["resident-profile", selectedResidentId],
    queryFn: async () => (await getResidentProfileBundle(selectedResidentId!)) as ResidentProfileBundle,
    enabled: selectedResidentId != null,
  });

  const locations = useMemo(
    () =>
      [...new Set(residents.map((resident) => (resident.safehouse_name || "Unassigned").trim()))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [residents],
  );

  const riskOptions = ["Low", "Medium", "High"];
  const highRiskCount = residents.filter((resident) => normalizeRisk(resident.current_risk_level) === "High").length;
  const activeCount = residents.filter((resident) => (resident.case_status || "").toLowerCase() === "active").length;

  const profile = residentProfileQuery.data;
  const latestEducation = latestRecord(profile?.educationRecords ?? []);
  const latestHealth = latestRecord(profile?.healthRecords ?? []);
  const selectedTags = selectedResident ? extractCaseTags(selectedResident) : [];

  const identityFields = selectedResident
    ? [
        { label: "Resident ID", value: selectedResident.resident_id },
        { label: "Case control no.", value: selectedResident.case_control_no },
        { label: "Internal code", value: selectedResident.internal_code },
        { label: "Sex", value: selectedResident.sex },
        { label: "Present age", value: parseAgeText(selectedResident) },
        { label: "Date of birth", value: formatDate(selectedResident.date_of_birth) },
        { label: "Birth status", value: selectedResident.birth_status },
        { label: "Place of birth", value: selectedResident.place_of_birth },
        { label: "Religion", value: selectedResident.religion },
      ]
    : [];

  const placementFields = selectedResident
    ? [
        { label: "Safehouse", value: selectedResident.safehouse_name || "Unassigned" },
        { label: "Case status", value: selectedResident.case_status },
        { label: "Case category", value: selectedResident.case_category },
        { label: "Date of admission", value: formatDate(selectedResident.date_of_admission) },
        { label: "Age upon admission", value: selectedResident.age_upon_admission },
        { label: "Length of stay", value: selectedResident.length_of_stay },
        { label: "Date enrolled", value: formatDate(selectedResident.date_enrolled) },
        { label: "Date closed", value: formatDate(selectedResident.date_closed) },
      ]
    : [];

  const caseWorkflowFields = selectedResident
    ? [
        { label: "Assigned social worker", value: selectedResident.assigned_social_worker },
        { label: "Referral source", value: selectedResident.referral_source },
        { label: "Referring agency / person", value: selectedResident.referring_agency_person },
        { label: "Initial assessment", value: selectedResident.initial_case_assessment },
        { label: "Case study prepared", value: formatDate(selectedResident.date_case_study_prepared) },
        { label: "COLB registered", value: formatDate(selectedResident.date_colb_registered) },
        { label: "COLB obtained", value: formatDate(selectedResident.date_colb_obtained) },
        { label: "Created at", value: formatDate(selectedResident.created_at) },
      ]
    : [];

  const riskAndReintegrationFields = selectedResident
    ? [
        { label: "Initial risk level", value: selectedResident.initial_risk_level },
        { label: "Current risk level", value: selectedResident.current_risk_level },
        { label: "Reintegration type", value: selectedResident.reintegration_type },
        { label: "Reintegration status", value: selectedResident.reintegration_status },
      ]
    : [];

  const familyAndNeedsFields = selectedResident
    ? [
        { label: "PWD", value: selectedResident.is_pwd },
        { label: "PWD type", value: selectedResident.pwd_type },
        { label: "Has special needs", value: selectedResident.has_special_needs },
        { label: "Special needs diagnosis", value: selectedResident.special_needs_diagnosis },
        { label: "Family is 4Ps", value: selectedResident.family_is_4ps },
        { label: "Family solo parent", value: selectedResident.family_solo_parent },
        { label: "Family indigenous", value: selectedResident.family_indigenous },
        { label: "Family parent PWD", value: selectedResident.family_parent_pwd },
        { label: "Family informal settler", value: selectedResident.family_informal_settler },
      ]
    : [];

  return (
    <AdminLayout
      title="Caseload Inventory"
      subtitle="Live resident profiles from Supabase, with detailed case information and related records"
    >
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Residents", value: residents.length, detail: "Loaded from the live resident dataset", icon: Users },
            { label: "Active cases", value: activeCount, detail: "Residents currently marked active", icon: ClipboardList },
            { label: "High risk", value: highRiskCount, detail: "Residents currently marked high risk", icon: ShieldAlert },
            { label: "Safehouses", value: locations.length, detail: "Locations represented in the caseload", icon: Home },
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

        <section className="rounded-2xl bg-card p-5 shadow-warm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Residents</h2>
              <p className="text-sm text-muted-foreground">
                {residentsQuery.isLoading
                  ? "Loading the resident dataset..."
                  : `Showing ${filteredResidents.length} of ${residents.length} residents`}
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search case code, resident ID, safehouse, social worker..."
                className="w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl bg-muted/25 p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Location</p>
                  <div className="flex flex-wrap gap-2">
                    {locations.map((location) => (
                      <button
                        key={location}
                        onClick={() => setFilterLocation(filterLocation === location ? null : location)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          filterLocation === location
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-primary/10"
                        }`}
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Risk level</p>
                  <div className="flex flex-wrap gap-2">
                    {riskOptions.map((risk) => (
                      <button
                        key={risk}
                        onClick={() => setFilterRisk(filterRisk === risk ? null : risk)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          filterRisk === risk
                            ? risk === "High"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-secondary text-secondary-foreground"
                            : "bg-background text-muted-foreground hover:bg-primary/10"
                        }`}
                      >
                        {risk}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFilterLocation(null);
                    setFilterRisk(null);
                    setSearch("");
                  }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {residentsQuery.isError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
                  {(residentsQuery.error as Error).message}
                </div>
              ) : null}

              {filteredResidents.map((resident, index) => {
                const risk = normalizeRisk(resident.current_risk_level);
                const location = resident.safehouse_name || "Unassigned";
                const caseCode = resident.case_control_no || resident.internal_code || `Resident #${resident.resident_id}`;
                const tags = extractCaseTags(resident).slice(0, 3);

                return (
                  <motion.button
                    key={resident.resident_id}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    onClick={() => setSelectedResidentId(resident.resident_id)}
                    className="w-full rounded-2xl border border-border/70 bg-background p-4 text-left shadow-warm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-warm-hover"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{caseCode}</h3>
                          <span className="text-xs text-muted-foreground">ID {resident.resident_id}</span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              statusColors[resident.case_status || ""] || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {resident.case_status || "Unknown"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              riskColors[risk] || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {risk} risk
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          Age {parseAgeText(resident)} · {resident.case_category || fallback} · {location}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {tags.length > 0 ? (
                            tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                              No category tags recorded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}

              {!residentsQuery.isLoading && !residentsQuery.isError && filteredResidents.length === 0 ? (
                <div className="rounded-2xl bg-background p-5 text-sm text-muted-foreground">No residents matched the current filters.</div>
              ) : null}
            </div>
          </div>
        </section>

        <Dialog open={selectedResident != null} onOpenChange={(open) => !open && setSelectedResidentId(null)}>
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-2xl border-border p-0">
            <div className="p-6 sm:p-7">
              <DialogHeader className="pr-8">
                <DialogTitle className="font-heading text-2xl text-foreground">Resident Profile</DialogTitle>
                <DialogDescription>
                  Full resident information and related records from the live Supabase dataset.
                </DialogDescription>
              </DialogHeader>

              {!selectedResident ? (
                <p className="mt-6 text-sm text-muted-foreground">No resident selected.</p>
              ) : (
                <div className="mt-6 space-y-6">
                  <div className="rounded-2xl bg-muted/25 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-foreground">
                        {selectedResident.case_control_no || selectedResident.internal_code || `Resident #${selectedResident.resident_id}`}
                      </h4>
                      <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground">
                        ID {selectedResident.resident_id}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedResident.safehouse_name || "Unassigned"} · Social worker:{" "}
                      {selectedResident.assigned_social_worker || fallback}
                    </p>
                  </div>

                  {residentProfileQuery.isFetching ? (
                    <div className="rounded-2xl bg-primary/5 p-4 text-sm text-primary">Loading resident details...</div>
                  ) : null}

                  {residentProfileQuery.isError ? (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                      {(residentProfileQuery.error as Error).message}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Age", value: parseAgeText(selectedResident) },
                      { label: "Sex", value: selectedResident.sex },
                      { label: "Current risk", value: selectedResident.current_risk_level },
                      { label: "Case status", value: selectedResident.case_status },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-background p-3">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{renderValue(item.value)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <SectionCard icon={User} title="Identity">
                      <DetailGrid items={identityFields} />
                    </SectionCard>

                    <SectionCard icon={Home} title="Placement and status">
                      <DetailGrid items={placementFields} />
                    </SectionCard>

                    <SectionCard icon={ShieldAlert} title="Case workflow">
                      <DetailGrid items={caseWorkflowFields} />
                    </SectionCard>

                    <SectionCard icon={TrendingUp} title="Risk and reintegration">
                      <DetailGrid items={riskAndReintegrationFields} />
                      <div className="mt-4">
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-primary">Case tags</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTags.length > 0 ? (
                            selectedTags.map((tag) => (
                              <span key={tag} className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No case sub-category tags recorded.</span>
                          )}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard icon={HeartPulse} title="Family and support needs">
                      <DetailGrid items={familyAndNeedsFields} />
                      <div className="mt-4 border-t border-border/60 pt-4">
                        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-primary">Latest health snapshot</p>
                        <DetailGrid
                          items={[
                            { label: "Health score", value: latestHealth ? latestHealth.general_health_score : fallback },
                            { label: "Nutrition score", value: latestHealth ? latestHealth.nutrition_score : fallback },
                            { label: "Sleep quality", value: latestHealth ? latestHealth.sleep_quality_score : fallback },
                            { label: "Energy level", value: latestHealth ? latestHealth.energy_level_score : fallback },
                            { label: "Height (cm)", value: latestHealth ? latestHealth.height_cm : fallback },
                            { label: "Weight (kg)", value: latestHealth ? latestHealth.weight_kg : fallback },
                            { label: "BMI", value: latestHealth ? latestHealth.bmi : fallback },
                            { label: "Medical checkup", value: latestHealth ? latestHealth.medical_checkup_done : fallback },
                            { label: "Dental checkup", value: latestHealth ? latestHealth.dental_checkup_done : fallback },
                            { label: "Psychological checkup", value: latestHealth ? latestHealth.psychological_checkup_done : fallback },
                          ]}
                        />
                      </div>
                    </SectionCard>

                    <SectionCard icon={FileHeart} title="Latest progress records">
                      <DetailGrid
                        items={[
                          { label: "Latest education level", value: latestEducation ? latestEducation.education_level : fallback },
                          { label: "School name", value: latestEducation ? latestEducation.school_name : fallback },
                          { label: "Enrollment status", value: latestEducation ? latestEducation.enrollment_status : fallback },
                          { label: "Attendance rate", value: latestEducation ? latestEducation.attendance_rate : fallback },
                          { label: "Progress percent", value: latestEducation ? latestEducation.progress_percent : fallback },
                          { label: "Completion status", value: latestEducation ? latestEducation.completion_status : fallback },
                          { label: "Intervention plans", value: profile?.interventionPlans.length ?? 0 },
                          { label: "Process recordings", value: profile?.processRecordings.length ?? 0 },
                          { label: "Home visitations", value: profile?.homeVisitations.length ?? 0 },
                          { label: "Incident reports", value: profile?.incidentReports.length ?? 0 },
                        ]}
                      />
                    </SectionCard>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <MiniList
                      icon={CalendarDays}
                      title="Intervention plans"
                      emptyText="No intervention plans recorded."
                      items={(profile?.interventionPlans ?? []).slice(0, 3).map((plan) => ({
                        title: renderValue(plan.plan_category),
                        meta: `Status: ${renderValue(plan.status)} · Target: ${renderValue(plan.target_date)}`,
                        body: renderValue(plan.plan_description),
                      }))}
                    />
                    <MiniList
                      icon={ClipboardList}
                      title="Incident reports"
                      emptyText="No incident reports recorded."
                      items={(profile?.incidentReports ?? []).slice(0, 3).map((incident) => ({
                        title: renderValue(incident.incident_type),
                        meta: `Severity: ${renderValue(incident.severity)} · Date: ${renderValue(incident.incident_date)}`,
                        body: renderValue(incident.description),
                      }))}
                    />
                    <MiniList
                      icon={Home}
                      title="Home visitations"
                      emptyText="No home visitations recorded."
                      items={(profile?.homeVisitations ?? []).slice(0, 3).map((visit) => ({
                        title: renderValue(visit.visit_type),
                        meta: `Date: ${renderValue(visit.visit_date)} · Outcome: ${renderValue(visit.visit_outcome)}`,
                        body: renderValue(visit.observations),
                      }))}
                    />
                  </div>

                  <div className="rounded-2xl bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary">Restricted notes</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {selectedResident.notes_restricted || fallback}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const SectionCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldAlert;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-muted/25 p-4">
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

const DetailGrid = ({ items }: { items: Array<{ label: string; value: unknown }> }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {items.map((item) => (
      <div key={item.label} className="rounded-xl bg-background p-3">
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{renderValue(item.value)}</p>
      </div>
    ))}
  </div>
);

const MiniList = ({
  icon: Icon,
  title,
  items,
  emptyText,
}: {
  icon: typeof ClipboardList;
  title: string;
  items: Array<{ title: string; meta: string; body: string }>;
  emptyText: string;
}) => (
  <div className="rounded-2xl bg-muted/25 p-4">
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    </div>
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-xl bg-background p-3">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
            <p className="mt-2 text-sm leading-6 text-foreground/85">{item.body}</p>
          </div>
        ))
      )}
    </div>
  </div>
);

export default CaseloadInventory;
