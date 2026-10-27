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
    const { data, error } = await params.admin
      .from("media_assets")
      .select("storage_path")
      .eq("project_id", params.projectId)
      .in("storage_path", candidates);

    if (error) {
      console.warn("[discardStorage] reference lookup failed:", error.message);
      result.failed = true;
      return result;
    }

    const referenced = new Set(
      ((data ?? []) as Array<{ storage_path: string | null }>)
        .map((row) => row.storage_path)
        .filter((p): p is string => typeof p === "string"),
    );

    const toRemove: string[] = [];
    for (const path of candidates) {
      if (referenced.has(path)) {
        result.skippedReferenced.push(path);
        continue;
      }
      toRemove.push(path, thumbStoragePathFor(path));
    }
    if (toRemove.length === 0) return result;

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
