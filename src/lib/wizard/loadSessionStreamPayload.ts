import "server-only";

import { formatTributeDisplayName, resolveTributeNames } from "@/src/lib/contribute/tributeName";
import { hydrateMediaRowsWithSignedUrls } from "@/src/lib/media/hydrateMediaSignedUrls.server";
import { SIGNED_URL_TTL_SEC } from "@/src/lib/media/storageEgressPolicy";
import { hasCinemaMasterExportEntitlement } from "@/src/lib/wizard/exportGate";
import { mediaApiToMontageItems } from "@/src/lib/wizard/montageHelpers";
import { getProjectPaidEntitlements } from "@/src/lib/wizard/paidEntitlements";
import {
  buildTeaserFromStoryboard,
  type CinemaChapterTitlesCopy,
  type TeaserSlide,
  type TeaserTracks,
} from "@/src/lib/wizard/teaserHelpers";
import { manifestPackageFromWizardBasePackage } from "@/src/lib/wizard/wizardDeliverables";
import { coerceWizardState, emptyStoryboardState } from "@/src/lib/wizard/wizardState";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

const MUSIC_BUCKET = "user-assets";

function yearFromIso(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const y = Number.parseInt(iso.slice(0, 4), 10);
  return Number.isFinite(y) ? String(y) : "";
}

export type SessionStreamPayload = {
  memoryCard: { displayName: string; yearsLine: string };
  openingPortraitUrl: string | null;
  slides: TeaserSlide[];
  tracks: TeaserTracks;
  chapterMeta: Record<
    string,
    {
      title: string;
      musicCredit: string | null;
      chapterIndex: number;
      holdDurationSec?: number;
    }
  >;
  chapterOrder: string[];
  /** C13 — Master déjà ouvert → Social Cut / copie invité. */
  masterUnlocked: boolean;
};

/**
 * Charge la séance lecture seule pour `/stream/[token]` (médias + MP3 signés).
 */
export async function loadSessionStreamPayload(params: {
  projectId: string;
  locale: "fr" | "en";
  chapterTitles: CinemaChapterTitlesCopy;
}): Promise<SessionStreamPayload | null> {
  const admin = getSupabaseAdminClient();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, first_name, last_name, wizard_state")
    .eq("id", params.projectId)
    .maybeSingle();

  if (projectError || !project) return null;

  const wizard = coerceWizardState(project.wizard_state);
  const tribute = resolveTributeNames({
    first_name: (project.first_name as string | null) ?? null,
    last_name: (project.last_name as string | null) ?? null,
    wizard_state: project.wizard_state,
  });
  const displayName = formatTributeDisplayName(tribute, params.locale);
  const yearsLine = [
    yearFromIso(wizard.essentials?.birthDate),
    yearFromIso(wizard.essentials?.deathDate),
  ]
    .filter(Boolean)
    .join(" · ");

  const { data: rows } = await admin
    .from("media_assets")
    .select(
      "id, project_id, storage_path, mime_type, size_bytes, order_index, upload_status, source, owner_user_id, tenant_id, contributor_name",
    )
    .eq("project_id", params.projectId)
    .eq("upload_status", "uploaded")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  const items = await hydrateMediaRowsWithSignedUrls(admin, rows ?? []);
  const mediaItems = mediaApiToMontageItems(items);
  const mediaById = new Map(mediaItems.map((item) => [item.assetId, item]));
  const packageId = manifestPackageFromWizardBasePackage(
    wizard.intendedPackage ?? wizard.basePackage ?? "essential",
  );
  const built = buildTeaserFromStoryboard(
    wizard.storyboard ?? emptyStoryboardState(),
    mediaById,
    params.chapterTitles,
    packageId,
  );

  const uploadPaths = [
    ...new Set(
      Object.values(built.tracks)
        .map((t) => t.storagePath)
        .filter((p): p is string => Boolean(p)),
    ),
  ];

  if (uploadPaths.length > 0) {
    const { data: signed } = await admin.storage
      .from(MUSIC_BUCKET)
      .createSignedUrls(uploadPaths, SIGNED_URL_TTL_SEC);
    const byPath = new Map(
      (signed ?? []).map((row) => [row.path, row.signedUrl ?? null]),
    );
    for (const track of Object.values(built.tracks)) {
      if (!track.storagePath) continue;
      const url = byPath.get(track.storagePath);
      if (url) track.audioUrl = url;
    }
  }

  let openingPortraitUrl: string | null = null;
  const avatarPath = wizard.essentials?.avatarPath?.trim() || null;
  if (avatarPath) {
    const { data } = await admin.storage
      .from(MUSIC_BUCKET)
      .createSignedUrl(avatarPath, SIGNED_URL_TTL_SEC);
    openingPortraitUrl = data?.signedUrl ?? null;
  }

  const entitlements = await getProjectPaidEntitlements(admin, params.projectId);
  const masterUnlocked = Boolean(
    entitlements && hasCinemaMasterExportEntitlement(entitlements),
  );

  return {
    memoryCard: { displayName, yearsLine },
    openingPortraitUrl,
    slides: built.slides,
    tracks: built.tracks,
    chapterMeta: built.chapterMeta,
    chapterOrder: built.chapterOrder,
    masterUnlocked,
  };
}
