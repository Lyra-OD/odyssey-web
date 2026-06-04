import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";

const STORAGE_UUID_SUFFIX =
  /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nom logique du fichier (sans préfixe d'ordre ni suffixe UUID Storage). */
export function extractMediaContentKey(displayName: string): string {
  const withoutExt = displayName.replace(/\.[^.]+$/, "");
  const withoutUuid = withoutExt.replace(STORAGE_UUID_SUFFIX, "");
  const withoutOrder = withoutUuid.replace(/^\d+-/, "");
  return (withoutOrder || withoutExt).toLowerCase();
}

export function mediaFingerprint(item: MontageMediaItem): string {
  const contentKey = extractMediaContentKey(item.displayName);
  const mime = (item.mimeType ?? "unknown").toLowerCase();
  return `${item.sizeBytes}:${mime}:${contentKey}`;
}

export type MediaDuplicateAnalysis = {
  duplicateIds: Set<string>;
  /** fingerprint → assetIds triés par orderIndex (le premier est conservé). */
  groups: Map<string, string[]>;
};

export function analyzeMediaDuplicates(
  items: MontageMediaItem[],
): MediaDuplicateAnalysis {
  const byFingerprint = new Map<string, MontageMediaItem[]>();

  for (const item of items) {
    const key = mediaFingerprint(item);
    const group = byFingerprint.get(key) ?? [];
    group.push(item);
    byFingerprint.set(key, group);
  }

  const duplicateIds = new Set<string>();
  const groups = new Map<string, string[]>();

  for (const [key, group] of byFingerprint) {
    if (group.length <= 1) continue;

    const sorted = [...group].sort((a, b) => a.orderIndex - b.orderIndex);
    const ids = sorted.map((item) => item.assetId);
    groups.set(key, ids);

    for (let i = 1; i < sorted.length; i++) {
      duplicateIds.add(sorted[i].assetId);
    }
  }

  return { duplicateIds, groups };
}

export async function deleteProjectMediaAsset(
  projectId: string,
  assetId: string,
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/media/${assetId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
  }
}
