/**
 * Ops — vide un bucket Storage (fichiers seulement).
 * Ne supprime PAS le bucket ni les policies RLS.
 *
 * Usage :
 *   npx tsx scripts/empty-storage.ts
 *   npx tsx scripts/empty-storage.ts user-assets
 *
 * Défaut : bucket `projects`. Dans Odyssey le bucket médias canon est `user-assets`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "projects";
const LIST_PAGE = 1000;
const REMOVE_BATCH = 100;

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    /* .env.local absent */
  }
}

function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function joinPath(prefix: string, name: string): string {
  return prefix ? `${prefix}/${name}` : name;
}

function isFolder(item: { id: string | null; metadata?: unknown }): boolean {
  return item.id === null || item.metadata == null;
}

async function listPage(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string,
  offset: number,
) {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: LIST_PAGE,
    offset,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) {
    throw new Error(
      `list failed at "${prefix || "/"}" offset=${offset}: ${error.message}`,
    );
  }
  return data ?? [];
}

/** Liste récursive de tous les fichiers (pas les dossiers vides). */
async function listAllFiles(
  supabase: SupabaseClient,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  for (;;) {
    const page = await listPage(supabase, bucket, prefix, offset);
    if (page.length === 0) break;

    for (const item of page) {
      if (!item.name || item.name === ".emptyFolderPlaceholder") continue;
      const path = joinPath(prefix, item.name);
      if (isFolder(item)) {
        const nested = await listAllFiles(supabase, bucket, path);
        files.push(...nested);
      } else {
        files.push(path);
      }
    }

    if (page.length < LIST_PAGE) break;
    offset += LIST_PAGE;
  }

  return files;
}

async function removeInBatches(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<number> {
  let removed = 0;
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) {
      throw new Error(
        `remove failed at batch ${i / REMOVE_BATCH + 1}: ${error.message}`,
      );
    }
    removed += batch.length;
    console.log(
      `[empty-storage] Batch ${Math.floor(i / REMOVE_BATCH) + 1} — ${removed}/${paths.length}`,
    );
  }
  return removed;
}

async function main() {
  loadEnvLocal();
  const bucket = process.argv[2]?.trim() || DEFAULT_BUCKET;
  const supabase = createServiceRoleClient();

  console.log("[empty-storage] Bucket:", bucket);
  console.log("[empty-storage] Listage récursif…");

  const paths = await listAllFiles(supabase, bucket);
  console.log(`[empty-storage] ${paths.length} fichier(s) trouvé(s).`);

  if (paths.length === 0) {
    console.log("[empty-storage] Rien à supprimer. Bucket conservé.");
    return;
  }

  const removed = await removeInBatches(supabase, bucket, paths);
  console.log(`[empty-storage] Terminé. Supprimés: ${removed}. Bucket inchangé.`);
}

main().catch((error) => {
  console.error("[empty-storage] Échec:", error);
  process.exit(1);
});
