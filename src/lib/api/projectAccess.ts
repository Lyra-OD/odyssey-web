import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/server";

type ProjectAccessResult =
  | { ok: true; user: User; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: NextResponse };

export async function requireProjectOwner(
  projectId: string,
): Promise<ProjectAccessResult> {
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

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "project_lookup_failed", message: projectError.message },
        { status: 400 },
      ),
    };
  }

  if (!project) {
    return {
      ok: false,
      response: NextResponse.json({ error: "not_found" }, { status: 404 }),
    };
  }

  if (project.user_id !== user.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, user, supabase };
}
