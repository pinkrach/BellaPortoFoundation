import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardPen,
  HeartHandshake,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { getProcessRecordings, getResidents, insertRecord } from "@/services/databaseService";
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

type ProcessRecording = {
  recording_id: number;
  resident_id: number | null;
  session_date: string | null;
  social_worker: string | null;
  session_type: string | null;
  session_duration_minutes: number | null;
  emotional_state_observed: string | null;
  emotional_state_end: string | null;
  session_narrative: string | null;
  interventions_applied: string | null;
  follow_up_actions: string | null;
  progress_noted: boolean | null;
  concerns_flagged: boolean | null;
  referral_made: boolean | null;
  notes_restricted: string | null;
};

const sessionTypeOptions = ["Individual", "Group"];
const emotionalOptions = ["Calm", "Hopeful", "Emotional", "Withdrawn", "Anxious", "Angry", "Mixed"];

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.04, duration: 0.25 },
  }),
};

const fallback = "Not recorded";
const residentsPerPage = 8;
const historyPerPage = 5;

function residentLabel(resident: ResidentRecord) {
  return resident.case_control_no || resident.internal_code || `Resident #${resident.resident_id}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function nextId(rows: Array<{ recording_id?: number | null }>) {
  return rows.reduce((max, row) => Math.max(max, row.recording_id ?? 0), 0) + 1;
}

const ProcessRecordingsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);
  const [residentPage, setResidentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    resident_id: "",
    session_date: "",
    social_worker: "",
    session_type: "Individual",
    session_duration_minutes: "60",
    emotional_state_observed: "",
    emotional_state_end: "",
    session_narrative: "",
    interventions_applied: "",
    follow_up_actions: "",
    progress_noted: true,
    concerns_flagged: false,
    referral_made: false,
    notes_restricted: "",
  });

  const residentsQuery = useQuery({
    queryKey: ["residents"],
    queryFn: async () => (await getResidents()) as ResidentRecord[],
  });

  const recordingsQuery = useQuery({
    queryKey: ["process-recordings"],
    queryFn: async () => (await getProcessRecordings()) as ProcessRecording[],
  });

  const residents = residentsQuery.data ?? [];
  const recordings = recordingsQuery.data ?? [];

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

  useEffect(() => {
    setResidentPage(1);
  }, [search]);

  const residentPageCount = Math.max(1, Math.ceil(filteredResidents.length / residentsPerPage));
  const paginatedResidents = useMemo(() => {
    const start = (residentPage - 1) * residentsPerPage;
    return filteredResidents.slice(start, start + residentsPerPage);
  }, [filteredResidents, residentPage]);

  useEffect(() => {
    if (residentPage > residentPageCount) {
      setResidentPage(residentPageCount);
    }
  }, [residentPage, residentPageCount]);

  const selectedResident =
    filteredResidents.find((resident) => resident.resident_id === selectedResidentId) ??
    residents.find((resident) => resident.resident_id === selectedResidentId) ??
    filteredResidents[0] ??
    residents[0] ??
    null;

  const residentIdForHistory = selectedResident?.resident_id ?? null;

  const residentHistory = useMemo(() => {
    return recordings
      .filter((recording) => recording.resident_id === residentIdForHistory)
      .sort((a, b) => {
        const aDate = new Date(a.session_date || "").getTime();
        const bDate = new Date(b.session_date || "").getTime();
        return bDate - aDate;
      });
  }, [recordings, residentIdForHistory]);

  useEffect(() => {
    setHistoryPage(1);
  }, [residentIdForHistory]);

  const historyPageCount = Math.max(1, Math.ceil(residentHistory.length / historyPerPage));
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPerPage;
    return residentHistory.slice(start, start + historyPerPage);
  }, [historyPage, residentHistory]);

  useEffect(() => {
    if (historyPage > historyPageCount) {
      setHistoryPage(historyPageCount);
    }
  }, [historyPage, historyPageCount]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const newRecording = {
        recording_id: nextId(recordings),
        resident_id: Number(form.resident_id),
        session_date: form.session_date,
        social_worker: form.social_worker.trim() || null,
        session_type: form.session_type,
        session_duration_minutes: Number(form.session_duration_minutes) || null,
        emotional_state_observed: form.emotional_state_observed || null,
        emotional_state_end: form.emotional_state_end || null,
        session_narrative: form.session_narrative.trim() || null,
        interventions_applied: form.interventions_applied.trim() || null,
        follow_up_actions: form.follow_up_actions.trim() || null,
        progress_noted: form.progress_noted,
        concerns_flagged: form.concerns_flagged,
        referral_made: form.referral_made,
        notes_restricted: form.notes_restricted.trim() || null,
      };

      return insertRecord("process_recordings", newRecording);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["process-recordings"] });
      toast({
        title: "Process recording saved",
        description: "The counseling session note was added to the resident history.",
      });
      setForm((current) => ({
        ...current,
        session_date: "",
        session_duration_minutes: "60",
        emotional_state_observed: "",
        emotional_state_end: "",
        session_narrative: "",
        interventions_applied: "",
        follow_up_actions: "",
        progress_noted: true,
        concerns_flagged: false,
        referral_made: false,
        notes_restricted: "",
      }));
    },
    onError: (error) => {
      toast({
        title: "Unable to save process recording",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const handleResidentOpen = (resident: ResidentRecord) => {
    setSelectedResidentId(resident.resident_id);
    setIsFormOpen(false);
    setForm((current) => ({
      ...current,
      resident_id: String(resident.resident_id),
      social_worker: current.social_worker || resident.assigned_social_worker || "",
    }));
  };

  return (
    <AdminLayout
      title="Process Recordings"
      subtitle="Live counseling notes, session history, and healing journey documentation for each resident"
    >
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Residents", value: residents.length, detail: "Residents available for documentation", icon: Users },
            { label: "Recorded sessions", value: recordings.length, detail: "Total counseling sessions logged", icon: ClipboardPen },
            { label: "Resident history", value: residentHistory.length, detail: "Sessions for the selected resident", icon: CalendarDays },
            {
              label: "Flagged concerns",
              value: recordings.filter((recording) => recording.concerns_flagged).length,
              detail: "Session notes that flagged concerns",
              icon: HeartHandshake,
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
                <p className="text-sm text-muted-foreground">Select a resident to view the full session history.</p>
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
              {paginatedResidents.map((resident, index) => (
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
                      <UserRound className="h-5 w-5 text-muted-foreground" />
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

              {!residentsQuery.isLoading && filteredResidents.length > 0 ? (
                <PaginationControls
                  page={residentPage}
                  pageCount={residentPageCount}
                  onPageChange={setResidentPage}
                  label="Resident pages"
                />
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-5 shadow-warm">
              <button
                type="button"
                onClick={() => setIsFormOpen((current) => !current)}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">Add process recording</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Keep the form tucked away until you need to log a new session for the selected resident.
                  </p>
                  {selectedResident ? (
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                      Ready for {residentLabel(selectedResident)}
                    </p>
                  ) : null}
                </div>
                <span className="mt-1 rounded-full bg-muted p-2 text-muted-foreground">
                  {isFormOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
              </button>

              {isFormOpen ? (
                <form
                  className="mt-5 space-y-4 border-t border-border/60 pt-5"
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

                  <FormField label="Session date">
                    <input
                      type="date"
                      value={form.session_date}
                      onChange={(event) => setForm((current) => ({ ...current, session_date: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      required
                    />
                  </FormField>

                  <FormField label="Social worker">
                    <input
                      value={form.social_worker}
                      onChange={(event) => setForm((current) => ({ ...current, social_worker: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      placeholder="Enter social worker"
                      required
                    />
                  </FormField>

                  <FormField label="Session type">
                    <select
                      value={form.session_type}
                      onChange={(event) => setForm((current) => ({ ...current, session_type: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      {sessionTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Duration (minutes)">
                    <input
                      type="number"
                      min="0"
                      value={form.session_duration_minutes}
                      onChange={(event) => setForm((current) => ({ ...current, session_duration_minutes: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </FormField>

                  <FormField label="Emotional state observed">
                    <select
                      value={form.emotional_state_observed}
                      onChange={(event) => setForm((current) => ({ ...current, emotional_state_observed: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      <option value="">Select emotional state</option>
                      {emotionalOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Emotional state at end">
                    <select
                      value={form.emotional_state_end}
                      onChange={(event) => setForm((current) => ({ ...current, emotional_state_end: event.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      <option value="">Select emotional state</option>
                      {emotionalOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  </div>

                  <FormField label="Narrative summary">
                  <textarea
                    value={form.session_narrative}
                    onChange={(event) => setForm((current) => ({ ...current, session_narrative: event.target.value }))}
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="Describe the session, themes discussed, and key observations."
                    required
                  />
                  </FormField>

                  <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Interventions applied">
                    <textarea
                      value={form.interventions_applied}
                      onChange={(event) => setForm((current) => ({ ...current, interventions_applied: event.target.value }))}
                      rows={4}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      placeholder="Document counseling tools, exercises, or interventions used."
                    />
                  </FormField>

                  <FormField label="Follow-up actions">
                    <textarea
                      value={form.follow_up_actions}
                      onChange={(event) => setForm((current) => ({ ...current, follow_up_actions: event.target.value }))}
                      rows={4}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                      placeholder="Outline next steps, assignments, referrals, or future sessions."
                    />
                  </FormField>
                  </div>

                  <FormField label="Restricted notes">
                  <textarea
                    value={form.notes_restricted}
                    onChange={(event) => setForm((current) => ({ ...current, notes_restricted: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="Add confidential notes if needed."
                  />
                  </FormField>

                  <div className="grid gap-3 sm:grid-cols-3">
                  <CheckboxRow
                    label="Progress noted"
                    checked={form.progress_noted}
                    onChange={(checked) => setForm((current) => ({ ...current, progress_noted: checked }))}
                  />
                  <CheckboxRow
                    label="Concerns flagged"
                    checked={form.concerns_flagged}
                    onChange={(checked) => setForm((current) => ({ ...current, concerns_flagged: checked }))}
                  />
                  <CheckboxRow
                    label="Referral made"
                    checked={form.referral_made}
                    onChange={(checked) => setForm((current) => ({ ...current, referral_made: checked }))}
                  />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitMutation.isPending || !form.resident_id}
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitMutation.isPending ? "Saving..." : "Save process recording"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>

            <div className="rounded-2xl bg-card p-5 shadow-warm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-foreground">Resident history</h2>
                  <p className="text-sm text-muted-foreground">
                    Full counseling history for {selectedResident ? residentLabel(selectedResident) : "the selected resident"}, with the most recent sessions first.
                  </p>
                </div>
                {selectedResident ? (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {residentHistory.length} sessions
                  </span>
                ) : null}
              </div>

              <div className="mt-5 space-y-4">
                {residentHistory.length === 0 ? (
                  <div className="rounded-2xl bg-muted/25 p-5 text-sm text-muted-foreground">
                    No process recordings have been logged for this resident yet.
                  </div>
                ) : (
                  paginatedHistory.map((recording, index) => (
                    <motion.div
                      key={recording.recording_id}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      variants={fadeUp}
                      className="rounded-2xl border border-border/70 bg-background p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{formatDate(recording.session_date)}</p>
                          <p className="text-sm text-muted-foreground">
                            {recording.social_worker || fallback} · {recording.session_type || fallback}
                            {recording.session_duration_minutes ? ` · ${recording.session_duration_minutes} min` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recording.progress_noted ? (
                            <span className="rounded-full bg-sage/20 px-2.5 py-1 text-xs font-semibold text-sage">Progress noted</span>
                          ) : null}
                          {recording.concerns_flagged ? (
                            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">Concerns flagged</span>
                          ) : null}
                          {recording.referral_made ? (
                            <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">Referral made</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <ContentBlock title="Emotional state">
                          <p>Observed: {recording.emotional_state_observed || fallback}</p>
                          <p>End of session: {recording.emotional_state_end || fallback}</p>
                        </ContentBlock>
                        <ContentBlock title="Narrative summary">
                          <p>{recording.session_narrative || fallback}</p>
                        </ContentBlock>
                        <ContentBlock title="Interventions applied">
                          <p>{recording.interventions_applied || fallback}</p>
                        </ContentBlock>
                        <ContentBlock title="Follow-up actions">
                          <p>{recording.follow_up_actions || fallback}</p>
                        </ContentBlock>
                      </div>

                      {recording.notes_restricted ? (
                        <div className="mt-4 rounded-xl bg-muted/20 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-primary">Restricted notes</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                            {recording.notes_restricted}
                          </p>
                        </div>
                      ) : null}
                    </motion.div>
                  ))
                )}
              </div>

              {residentHistory.length > 0 ? (
                <div className="mt-5">
                  <PaginationControls
                    page={historyPage}
                    pageCount={historyPageCount}
                    onPageChange={setHistoryPage}
                    label="History pages"
                  />
                </div>
              ) : null}
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

const ContentBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl bg-muted/25 p-4">
    <p className="text-xs uppercase tracking-[0.16em] text-primary">{title}</p>
    <div className="mt-2 space-y-2 text-sm leading-6 text-foreground/90">{children}</div>
  </div>
);

const PaginationControls = ({
  page,
  pageCount,
  onPageChange,
  label,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
}) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground">
      {label}: page {page} of {pageCount}
    </p>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
);

export default ProcessRecordingsPage;
