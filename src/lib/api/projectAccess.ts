import { NextResponse } from "next/server";
import type { User, SupabaseClient } from "@supabase/supabase-js";

import type { WizardCapabilityKey } from "@/src/lib/wizard/collabCapabilities";
import { assertWizardCapability } from "@/src/lib/wizard/collabCapabilities";
import {
  readWizardEditorSession,
  type WizardEditorCookiePayload,
} from "@/src/lib/wizard/collabSessionCookie";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

type ProjectOwnerAccess =
  | { ok: true; user: User; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: NextResponse };

export async function requireProjectOwner(
  projectId: string,
): Promise<ProjectOwnerAccess> {
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

export type WizardCraftAccess =
  | {
      ok: true;
      role: "owner";
      user: User;
      supabase: Awaited<ReturnType<typeof createClient>>;
      projectOwnerUserId: string;
    }
  | {
      ok: true;
      role: "editor";
      session: WizardEditorCookiePayload;
      /** Toujours admin — l'éditeur n'a pas de RLS owner. */
      supabase: SupabaseClient;
      projectOwnerUserId: string;
    }
  | { ok: false; response: NextResponse };

/**
 * Accès craft Wizard : Titulaire (session Odyssey) **ou** Co-Créateur (cookie).
 * Si les deux sont présents pour le même projet → **owner** gagne.
 */
export async function resolveWizardCraftAccess(
  projectId: string,
): Promise<WizardCraftAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "project_lookup_failed", message: error.message },
          { status: 400 },
        ),
      };
    }

    if (project) {
      return {
        ok: true,
        role: "owner",
        user,
        supabase,
        projectOwnerUserId: user.id,
      };
    }
  }

  const session = await readWizardEditorSession();
  if (session && session.projectId === projectId) {
    const admin = getSupabaseAdminClient();
    const { data: project, error } = await admin
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "project_lookup_failed", message: error.message },
          { status: 400 },
        ),
      };
    }
    if (!project?.user_id) {
      return {
        ok: false,
        response: NextResponse.json({ error: "not_found" }, { status: 404 }),
      };
    }

    return {
      ok: true,
      role: "editor",
      session,
      supabase: admin,
      projectOwnerUserId: project.user_id,
    };
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "not_found" }, { status: 404 }),
  };
}

/**
 * Session cookie Co-Créateur uniquement (pas owner).
 */
export async function requireProjectEditor(
  projectId: string,
): Promise<
  | Extract<WizardCraftAccess, { ok: true; role: "editor" }>
  | { ok: false; response: NextResponse }
> {
  const access = await resolveWizardCraftAccess(projectId);
  if (!access.ok) return access;
  if (access.role !== "editor") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "forbidden",
          message: "Editor session required.",
        },
        { status: 403 },
      ),
    };
  }
  return access;
}

/**
 * Mur owner-only : si cookie editor pour ce projet (sans être owner) → 403.
 * À appeler en tête de checkout / fund-balance / mint liens, etc.
 */
export async function rejectEditorForOwnerOnlyRoute(
  projectId: string,
  capability: WizardCapabilityKey,
): Promise<NextResponse | null> {
  const session = await readWizardEditorSession();
  if (!session || session.projectId !== projectId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (project) return null;
  }

  const gate = assertWizardCapability("editor", capability);
  if (gate.ok) return null;

  return NextResponse.json(
    {
      error: "forbidden",
      capability: gate.capability,
      role: "editor",
      message: gate.message,
    },
    { status: 403 },
  );
}
