import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Creates a `public.projects` draft row for the authenticated user.
 *
 * Tenant resolution (Odyssey multi-tenant model):
 *   1) `auth.getUser()` → identifies the caller.
 *   2) SELECT FROM `public.tenant_members` WHERE user_id = auth.uid()
 *      → returns the tenant(s) the user belongs to.
 *      RLS on tenant_members already filters to `auth.uid() = user_id`,
 *      so this query is always safe.
 *   3) If a user belongs to multiple tenants (B2B2C / white label), we
 *      pick the first one for now. The wizard will later let the user
 *      choose explicitly.
 *
 * Wizard payload (optional body):
 *   { firstName?, lastName?, birthDate?, deathDate? }
 *
 * Resilience: if a column declared in the rich payload does not exist
 * in the live schema (e.g. partial migration across environments), the
 * insert iteratively drops the offending column and retries — both for
 * raw Postgres errors (42703) and PostgREST schema-cache errors
 * (PGRST204).
 */

type DraftBody = {
  firstName?: string;
  lastName?: string;
  birthDate?: string | null;
  deathDate?: string | null;
};

const isMissingColumnError = (
  message: string | undefined,
  code: string | undefined,
): boolean => {
  if (code === "42703" || code === "PGRST204") return true;
  if (!message) return false;
  if (/column ".+" of relation ".+" does not exist/i.test(message)) return true;
  if (/Could not find the '.+' column of '.+' in the schema cache/i.test(message))
    return true;
  return false;
};

const extractMissingColumn = (message: string | undefined): string | null => {
  if (!message) return null;
  const pgrst = message.match(
    /Could not find the '([^']+)' column of '[^']+' in the schema cache/i,
  );
  if (pgrst?.[1]) return pgrst[1];
  const pg = message.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
  if (pg?.[1]) return pg[1];
  return null;
};

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      {
        error: "tenant_lookup_failed",
        message: membershipError.message,
      },
      { status: 400 },
    );
  }

  if (!membership?.tenant_id) {
    return NextResponse.json(
      {
        error: "no_tenant_membership",
        message:
          "Aucun tenant rattaché à cet utilisateur. Le trigger d'inscription est peut-être inactif ou le seed n'a pas tourné.",
      },
      { status: 400 },
    );
  }

  const tenantId = membership.tenant_id;

  let body: DraftBody = {};
  try {
    const parsed = (await req.json()) as unknown;
    if (parsed && typeof parsed === "object") body = parsed as DraftBody;
  } catch {
    // body optional
  }

  const basePayload: Record<string, unknown> = {
    user_id: user.id,
    tenant_id: tenantId,
  };

  const richPayload: Record<string, unknown> = { ...basePayload };
  if (body.firstName?.trim()) richPayload.first_name = body.firstName.trim();
  if (body.lastName?.trim()) richPayload.last_name = body.lastName.trim();
  if (body.birthDate) richPayload.birth_date = body.birthDate;
  if (body.deathDate) richPayload.death_date = body.deathDate;

  const tryInsert = async (payload: Record<string, unknown>) =>
    supabase
      .from("projects")
      .insert(payload)
      .select("id, user_id, tenant_id")
      .single();

  const MAX_ATTEMPTS = 8;
  let currentPayload: Record<string, unknown> = { ...richPayload };
  let lastError: { message?: string; code?: string } | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const result = await tryInsert(currentPayload);
    if (!result.error && result.data?.id) {
      return NextResponse.json({
        id: result.data.id,
        user_id: result.data.user_id ?? user.id,
        tenant_id: result.data.tenant_id ?? tenantId,
      });
    }

    lastError = result.error
      ? { message: result.error.message, code: result.error.code }
      : null;

    if (!result.error) break;
    if (!isMissingColumnError(result.error.message, result.error.code)) break;

    const missing = extractMissingColumn(result.error.message);
    const optionalKeys = Object.keys(currentPayload).filter(
      (k) => !(k in basePayload),
    );

    if (missing && missing in currentPayload && !(missing in basePayload)) {
      delete currentPayload[missing];
      continue;
    }

    if (optionalKeys.length === 0) break;

    // Couldn't pinpoint the offender; collapse to base payload and retry once.
    currentPayload = { ...basePayload };
  }

  return NextResponse.json(
    {
      error: "project_insert_failed",
      message: lastError?.message ?? "Unknown error",
    },
    { status: 400 },
  );
}
