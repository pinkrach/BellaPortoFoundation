import { supabase } from "@/lib/supabaseClient";

/** Random 5-digit primary key when supporter_id is required and not auto-generated. */
function randomFiveDigitSupporterId(): number {
  return 10000 + Math.floor(Math.random() * 90000);
}

export async function getNextSupporterId(): Promise<number> {
  return randomFiveDigitSupporterId();
}

export type FindOrCreateSupporterInput = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

/**
 * Resolves supporter_id: existing row by session email, or creates a row with email + names only.
 */
export async function findOrCreateSupporter(input: FindOrCreateSupporterInput): Promise<number> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const email = input.email.trim();
  if (!email) {
    throw new Error("Your account email is missing. Please sign in again.");
  }

  const { data: existing, error: lookupError } = await supabase
    .from("supporters")
    .select("supporter_id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message || "Could not look up your supporter profile.");
  }

  if (existing?.supporter_id != null) {
    const id = Number(existing.supporter_id);
    if (Number.isFinite(id)) return id;
  }

  const supporter_id = await getNextSupporterId();
  const first = input.firstName?.trim() ?? "";
  const last = input.lastName?.trim() ?? "";

  const { error: insertError } = await supabase.from("supporters").insert({
    supporter_id,
    email,
    first_name: first || null,
    last_name: last || null,
  });

  if (insertError) {
    throw new Error(insertError.message || "Could not create your supporter profile.");
  }

  return supporter_id;
}

export type InsertSupporterForNewUserInput = {
  email: string;
  first_name: string;
  last_name: string;
};

/**
 * After sign-up (profiles row), creates a supporters row if none exists for this email.
 * Lookup and idempotency are by email only.
 */
export async function insertSupporterForNewUser(input: InsertSupporterForNewUserInput): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const email = input.email.trim();
  if (!email) {
    return { error: new Error("Missing email for supporter record.") };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("supporters")
    .select("supporter_id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return { error: new Error(lookupError.message || "Could not check supporter by email.") };
  }

  if (existing?.supporter_id != null) {
    return { error: null };
  }

  const supporter_id = await getNextSupporterId();

  const { error: insertError } = await supabase.from("supporters").insert({
    supporter_id,
    email,
    first_name: input.first_name.trim() || null,
    last_name: input.last_name.trim() || null,
  });

  if (insertError) {
    return { error: new Error(insertError.message || "Could not create supporter record.") };
  }

  return { error: null };
}
