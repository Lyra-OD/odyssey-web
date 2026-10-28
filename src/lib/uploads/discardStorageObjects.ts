import type { SupabaseClient } from "@supabase/supabase-js";

import { thumbStoragePathFor } from "@/src/lib/media/thumbnailPath";

/**
 * Nettoyage serveur des objets Storage orphelins (upload réussi, enregistrement
 * `media_assets` échoué). Le bucket `user-assets` n'a pas de policy DELETE pour
 * `authenticated` : seul le client admin peut supprimer.
 *
 * Garde-fous :
 * - uniquement sous `projects/{projectId}/` ;
 * - jamais un chemin référencé par une ligne `media_assets` (le trigger quota
 *   est BEFORE INSERT et se déclenche aussi sur un upsert en conflit) ;
 * - les miniatures sont dérivées côté serveur, jamais acceptées en entrée ;
 * - lecture des références en erreur → rien n'est supprimé.
 *
 * Limite acceptée : un fichier envoyé mais pas encore enregistré n'est pas
 * protégé par le contrôle de référence (chemin à UUID non devinable).
 */

export const DISCARD_MAX_PATHS = 2;

const THUMB_SUFFIX = "-thumb.webp";

export function isProjectMediaPath(
  projectId: string,
  storagePath: string,
): boolean {
  const prefix = `projects/${projectId}/`;
  return (
    storagePath.startsWith(prefix) &&
    !storagePath.includes("..") &&
    storagePath.length > prefix.length
  );
}

export function isDiscardableOriginalPath(
  projectId: string,
  storagePath: string,
): boolean {
  return (
    isProjectMediaPath(projectId, storagePath) &&
    !storagePath.endsWith(THUMB_SUFFIX)
  );
}

export function normalizeStoragePaths(
  paths: ReadonlyArray<string | null | undefined>,
): string[] {
  const out: string[] = [];
  for (const raw of paths) {
    const path = typeof raw === "string" ? raw.trim() : "";
    if (path && !out.includes(path)) out.push(path);
  }
  return out;
}

export type DiscardResult = {
  removed: string[];
  skippedReferenced: string[];
  rejected: string[];
  failed: boolean;
};

type AssetRef = { storage_path: string; id: string | null };

type AssetRefRead =
  | { ok: true; rows: AssetRef[] }
  | { ok: false; message: string };

async function readAssetRefs(
  admin: Pick<SupabaseClient, "from">,
  projectId: string,
  storagePaths: readonly string[],
): Promise<AssetRefRead> {
  const { data, error } = await admin
    .from("media_assets")
    .select("id, storage_path")
    .eq("project_id", projectId)
    .in("storage_path", [...storagePaths]);

  if (error) return { ok: false, message: error.message };
  const rows = ((data ?? []) as Array<{
    id?: string | null;
    storage_path?: string | null;
  }>)
    .filter(
      (row): row is { id?: string | null; storage_path: string } =>
        typeof row.storage_path === "string" && row.storage_path.length > 0,
    )
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : null,
      storage_path: row.storage_path,
    }));
  return { ok: true, rows };
}

/** Lecture seule. `unknown` si la base ne répond pas : ne rien supprimer. */
export async function lookupMediaAssetReference(params: {
  admin: Pick<SupabaseClient, "from">;
  projectId: string;
  storagePath: string;
}): Promise<
  | { status: "present"; assetId: string | null }
  | { status: "absent" }
  | { status: "unknown" }
> {
  const read = await readAssetRefs(params.admin, params.projectId, [
    params.storagePath,
  ]);
  if (!read.ok) return { status: "unknown" };
  const row = read.rows.find((item) => item.storage_path === params.storagePath);
  if (!row) return { status: "absent" };
  return { status: "present", assetId: row.id };
}

export async function discardUnreferencedStorageObjects(params: {
  admin: Pick<SupabaseClient, "from" | "storage">;
  bucket: string;
  projectId: string;
  storagePaths: ReadonlyArray<string | null | undefined>;
}): Promise<DiscardResult> {
  const result: DiscardResult = {
    removed: [],
    skippedReferenced: [],
    rejected: [],
    failed: false,
  };

  const candidates: string[] = [];
  for (const path of normalizeStoragePaths(params.storagePaths)) {
    if (isDiscardableOriginalPath(params.projectId, path)) {
      candidates.push(path);
    } else {
      result.rejected.push(path);
    }
  }
  if (candidates.length === 0) return result;

  try {
    const first = await readAssetRefs(params.admin, params.projectId, candidates);
    if (!first.ok) {
      console.warn("[discardStorage] reference lookup failed:", first.message);
      result.failed = true;
      return result;
    }

    const referenced = new Set(first.rows.map((row) => row.storage_path));
    const orphans: string[] = [];
    for (const path of candidates) {
      if (referenced.has(path)) result.skippedReferenced.push(path);
      else orphans.push(path);
    }
    if (orphans.length === 0) return result;

    // Deuxième lecture : une ligne validée entre-temps ne part pas au remove.
    const second = await readAssetRefs(params.admin, params.projectId, orphans);
    if (!second.ok) {
      console.warn("[discardStorage] reference recheck failed:", second.message);
      result.failed = true;
      return result;
    }
    const nowReferenced = new Set(second.rows.map((row) => row.storage_path));
    const stillOrphan: string[] = [];
    for (const path of orphans) {
      if (nowReferenced.has(path)) result.skippedReferenced.push(path);
      else stillOrphan.push(path);
    }
    if (stillOrphan.length === 0) return result;

    const toRemove = stillOrphan.flatMap((path) => [
      path,
      thumbStoragePathFor(path),
    ]);

    const { error: removeError } = await params.admin.storage
      .from(params.bucket)
      .remove(toRemove);
    if (removeError) {
      console.warn("[discardStorage] remove failed:", removeError.message);
      result.failed = true;
      return result;
    }
    result.removed = toRemove;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[discardStorage] unexpected error:", message);
    result.failed = true;
    return result;
  }
}
