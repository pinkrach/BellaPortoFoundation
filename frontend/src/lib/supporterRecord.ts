import { supabase } from "@/lib/supabaseClient";

type DbLikeError = { code?: string; message?: string } | null | undefined;

function isUniqueViolation(error: DbLikeError): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("duplicate key") || msg.includes("unique");
}

/**
 * Inserts a supporter without sending supporter_id so Postgres assigns nextval().
 * If a stale sequence value collides, retry so sequence advances in order.
 */
async function insertSupporterUsingSequence(input: {
  email: string;
  first_name: string | null;
  last_name: string | null;
}): Promise<number> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await supabase
      .from("supporters")
      .insert({
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        status: "Active",
      })
      .select("supporter_id")
      .single();

    if (!error) {
      const id = Number(data?.supporter_id);
      if (Number.isFinite(id)) return id;
      throw new Error("Supporter was created but no supporter_id was returned.");
    }

    if (isUniqueViolation(error)) {
      // Retry: next sequence value should be higher and eventually free.
      continue;
    }

    throw new Error(error.message || "Could not create your supporter profile.");
  }

  throw new Error("Could not create supporter profile after multiple sequence retries.");
}

export type FindOrCreateSupporterInput = {
  userId?: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

async function getProfileLink(userId: string | null | undefined): Promise<{ supporterId: number | null; email: string | null }> {
  if (!supabase || !userId) return { supporterId: null, email: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("supporter_id,email")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { supporterId: null, email: null };
  return {
    supporterId: data?.supporter_id != null ? Number(data.supporter_id) : null,
    email: typeof data?.email === "string" ? data.email : null,
  };
}

async function linkProfileToSupporter(userId: string | null | undefined, supporterId: number): Promise<void> {
  if (!supabase || !userId || !Number.isFinite(supporterId)) return;
  await supabase
    .from("profiles")
    .update({ supporter_id: supporterId })
    .eq("id", userId);
}

type SupporterIdentity = {
  supporter_id: number;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  organization_name: string | null;
};

async function findSupporterByEmail(email: string): Promise<SupporterIdentity | null> {
  if (!supabase) return null;
  const normalized = email.trim();
  if (!normalized) return null;

  const select = "supporter_id,first_name,last_name,display_name,organization_name";

  const { data: exact, error: exactError } = await supabase
    .from("supporters")
    .select(select)
    .eq("email", normalized)
    .limit(1)
    .maybeSingle();

  if (!exactError && exact?.supporter_id != null) {
    return {
      supporter_id: Number(exact.supporter_id),
      first_name: exact.first_name ?? null,
      last_name: exact.last_name ?? null,
      display_name: exact.display_name ?? null,
      organization_name: exact.organization_name ?? null,
    };
  }

  const { data: insensitive, error: insensitiveError } = await supabase
    .from("supporters")
    .select(select)
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle();

  if (!insensitiveError && insensitive?.supporter_id != null) {
    return {
      supporter_id: Number(insensitive.supporter_id),
      first_name: insensitive.first_name ?? null,
      last_name: insensitive.last_name ?? null,
      display_name: insensitive.display_name ?? null,
      organization_name: insensitive.organization_name ?? null,
    };
  }

  return null;
}

/**
 * Resolves supporter_id: existing row by session email, or creates a row with email + names only.
 */
export async function findOrCreateSupporter(input: FindOrCreateSupporterInput): Promise<number> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const profileLink = await getProfileLink(input.userId);
  if (profileLink.supporterId != null && Number.isFinite(profileLink.supporterId)) {
    return profileLink.supporterId;
  }

  const email = (input.email.trim() || profileLink.email?.trim() || "").trim();
  if (!email) {
    throw new Error("Your account email is missing. Please sign in again.");
  }

  const existing = await findSupporterByEmail(email);
  if (existing?.supporter_id != null && Number.isFinite(existing.supporter_id)) {
    await linkProfileToSupporter(input.userId, existing.supporter_id);
    return existing.supporter_id;
  }

  const first = input.firstName?.trim() ?? "";
  const last = input.lastName?.trim() ?? "";
  const supporterId = await insertSupporterUsingSequence({
    email,
    first_name: first || null,
    last_name: last || null,
  });
  await linkProfileToSupporter(input.userId, supporterId);
  return supporterId;
}

export type InsertSupporterForNewUserInput = {
  profile_id?: string;
  email: string;
  first_name: string;
  last_name: string;
};

/**
 * After sign-up (profiles row), creates a supporters row if none exists for this email.
 * Lookup and idempotency are by email only.
 */
export async function insertSupporterForNewUser(
  input: InsertSupporterForNewUserInput,
): Promise<{
  error: Error | null;
  wasExisting: boolean;
  supporter: {
    supporterId: number;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    organizationName: string | null;
  } | null;
}> {
  if (!supabase) {
    return { error: new Error("Supabase is not configured."), wasExisting: false, supporter: null };
  }

  const email = input.email.trim();
  if (!email) {
    return { error: new Error("Missing email for supporter record."), wasExisting: false, supporter: null };
  }

  const existing = await findSupporterByEmail(email);
  if (existing?.supporter_id != null && Number.isFinite(existing.supporter_id)) {
    await linkProfileToSupporter(input.profile_id, existing.supporter_id);
    await supabase.from("supporters").update({ status: "Active" }).eq("supporter_id", existing.supporter_id);
    await supabase
      .from("supporters")
      .update({ created_at: new Date().toISOString() })
      .eq("supporter_id", existing.supporter_id)
      .is("created_at", null);
    return {
      error: null,
      wasExisting: true,
      supporter: {
        supporterId: existing.supporter_id,
        firstName: existing.first_name ?? null,
        lastName: existing.last_name ?? null,
        displayName: existing.display_name ?? null,
        organizationName: existing.organization_name ?? null,
      },
    };
  }

  try {
    const supporterId = await insertSupporterUsingSequence({
      email,
      first_name: input.first_name.trim() || null,
      last_name: input.last_name.trim() || null,
    });
    await supabase
      .from("supporters")
      .update({ created_at: new Date().toISOString() })
      .eq("supporter_id", supporterId)
      .is("created_at", null);
    await linkProfileToSupporter(input.profile_id, supporterId);
    return {
      error: null,
      wasExisting: false,
      supporter: {
        supporterId,
        firstName: input.first_name.trim() || null,
        lastName: input.last_name.trim() || null,
        displayName: null,
        organizationName: null,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Could not create supporter record."),
      wasExisting: false,
      supporter: null,
    };
  }
}
