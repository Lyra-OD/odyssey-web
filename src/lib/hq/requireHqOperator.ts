import { NextResponse } from "next/server";

import { isListedOnHqAllowlist } from "@/src/lib/hq/isOdysseyOperator";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type HqOperatorOk = {
  ok: true;
  userId: string;
  admin: ReturnType<typeof getSupabaseAdminClient>;
};

type HqOperatorFail = {
  ok: false;
  response: NextResponse;
};

/**
 * Gate HQ API : session + `hq_allowlist` + client admin (service_role).
 * Fail-closed — jamais de lecture/écriture ledger sans les deux.
 */
export async function requireHqOperator(): Promise<HqOperatorOk | HqOperatorFail> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }

  if (!(await isListedOnHqAllowlist(supabase, user.id))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  try {
    const admin = getSupabaseAdminClient();
    return { ok: true, userId: user.id, admin };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "internal" }, { status: 500 }),
    };
  }
}
