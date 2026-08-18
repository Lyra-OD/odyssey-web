import "server-only";

import { NextResponse } from "next/server";

import { resolveWizardCraftAccess } from "@/src/lib/api/projectAccess";
import {
  loadInvitationGrantedPackage,
  resolveB2b2cIntendedPackage,
} from "@/src/lib/wizard/b2b2cPackageAuthority";
import {
  normalizeBasePackageId,
  type MusicCatalogTier,
  type WizardBasePackage,
} from "@/src/lib/wizard/pricingConfig";
import { normalizeExtensionsState } from "@/src/lib/wizard/wizardPricing";
import { coerceWizardState } from "@/src/lib/wizard/wizardState";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

import { resolveServerMusicCatalogTier } from "@/src/lib/music/resolveServerMusicCatalogTier";

export type MusicRouteAccess =
  | {
      ok: true;
      projectId: string;
      catalogTier: MusicCatalogTier;
      role: "owner" | "editor";
      grantedPackage: WizardBasePackage;
      intendedPackage: WizardBasePackage;
    }
  | { ok: false; response: NextResponse };

/**
 * Garde-fou P0-05 : auth Wizard (owner ou Co-Créateur) + tier catalogue serveur.
 */
export async function resolveMusicRouteAccess(
  projectId: string,
): Promise<MusicRouteAccess> {
  const access = await resolveWizardCraftAccess(projectId);
  if (!access.ok) return access;

  const { data: project, error } = await access.supabase
    .from("projects")
    .select("wizard_state, invitation_id")
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

  if (!project) {
    return {
      ok: false,
      response: NextResponse.json({ error: "not_found" }, { status: 404 }),
    };
  }

  const wizardState = coerceWizardState(project.wizard_state);
  const extensions = normalizeExtensionsState(wizardState.extensions ?? {});
  const invitationId = project.invitation_id as string | null;

  let grantedPackage: WizardBasePackage;
  let intendedPackage: WizardBasePackage;

  if (invitationId) {
    let admin;
    try {
      admin = getSupabaseAdminClient();
    } catch {
      return {
        ok: false,
        response: NextResponse.json({ error: "internal" }, { status: 500 }),
      };
    }

    const invitationGrant = await loadInvitationGrantedPackage(
      admin,
      invitationId,
    );
    if (!invitationGrant.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "invitation_lookup_failed", reason: invitationGrant.reason },
          { status: 400 },
        ),
      };
    }

    grantedPackage = invitationGrant.grantedPackage;
    intendedPackage = resolveB2b2cIntendedPackage({
      grantedPackage,
      persistedIntended:
        wizardState.intendedPackage ??
        wizardState.basePackage ??
        wizardState.pricing?.basePackage,
    });
  } else {
    intendedPackage = normalizeBasePackageId(
      wizardState.intendedPackage ??
        wizardState.basePackage ??
        wizardState.pricing?.basePackage ??
        "essential",
    );
    grantedPackage = intendedPackage;
  }

  const catalogTier = resolveServerMusicCatalogTier({
    grantedPackage,
    intendedPackage,
    extensions,
    role: access.role,
  });

  return {
    ok: true,
    projectId,
    catalogTier,
    role: access.role,
    grantedPackage,
    intendedPackage,
  };
}
