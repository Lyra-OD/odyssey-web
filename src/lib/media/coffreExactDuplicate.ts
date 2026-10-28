/**
 * Doublon exact du Coffre.
 * L’empreinte est celle du fichier original, avant toute préparation.
 * Elle prouve l’égalité du fichier. Elle ne refuse pas l’ajout à la place de la famille.
 */

import { isQueueVideoFile } from "@/src/lib/media/videoPrepareQueue";

export type ContentHashLookup = "present" | "absent" | "unknown";
export type DuplicateReason = "duplicate" | "unknown";
export type DuplicateChoice = "skip" | "keep";

const SHA256_HEX = /^[0-9a-f]{64}$/;

export function contentSha256ForRow(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const hex = value.trim().toLowerCase();
  return SHA256_HEX.test(hex) ? hex : null;
}

export async function hashFileSha256(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Une réponse illisible ou en erreur n’est jamais « absent ». */
export function parseContentHashLookup(
  ok: boolean,
  body: unknown,
): ContentHashLookup {
  if (!ok || !body || typeof body !== "object") return "unknown";
  const status = (body as { status?: unknown }).status;
  if (status === "present" || status === "absent") return status;
  return "unknown";
}

export async function lookupProjectContentSha256(
  projectId: string,
  sha256: string,
): Promise<ContentHashLookup> {
  try {
    const res = await fetch(
      `/api/projects/${projectId}/media/content-hash`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha256 }),
      },
    );
    const body = (await res.json().catch(() => null)) as unknown;
    return parseContentHashLookup(res.ok, body);
  } catch {
    return "unknown";
  }
}

export function decideExactDuplicate(input: {
  sha256: string | null;
  inQueue: boolean;
  server: ContentHashLookup;
}): { action: "enqueue" } | { action: "ask"; reason: DuplicateReason } {
  if (!input.sha256) return { action: "ask", reason: "unknown" };
  if (input.inQueue || input.server === "present") {
    return { action: "ask", reason: "duplicate" };
  }
  if (input.server === "unknown") return { action: "ask", reason: "unknown" };
  return { action: "enqueue" };
}

export type ReviewedCoffreFile = {
  file: File;
  contentSha256: string | null;
  kind: "video" | "photo";
};

/**
 * File locale d’abord, puis le serveur.
 * « Ne pas ajouter » n’apparaît pas dans le résultat : rien n’est préparé ni envoyé.
 * « Ajouter quand même » renvoie le fichier, y compris une deuxième copie.
 */
export async function reviewCoffreDrop(params: {
  files: File[];
  queueHashes: ReadonlySet<string>;
  lookup: (sha256: string) => Promise<ContentHashLookup>;
  choose: (input: {
    file: File;
    kind: "video" | "photo";
    reason: DuplicateReason;
  }) => Promise<DuplicateChoice>;
  hashFile?: (file: Blob) => Promise<string>;
  isVideo?: (file: File) => boolean;
}): Promise<ReviewedCoffreFile[]> {
  const hashFile = params.hashFile ?? hashFileSha256;
  const isVideo = params.isVideo ?? isQueueVideoFile;
  const seen = new Set(params.queueHashes);
  const accepted: ReviewedCoffreFile[] = [];

  for (const file of params.files) {
    const kind = isVideo(file) ? "video" : "photo";
    let sha256: string | null = null;
    try {
      sha256 = contentSha256ForRow(await hashFile(file));
    } catch {
      sha256 = null;
    }

    const inQueue = Boolean(sha256 && seen.has(sha256));
    const server: ContentHashLookup = inQueue
      ? "absent"
      : sha256
        ? await params.lookup(sha256)
        : "unknown";
    const decision = decideExactDuplicate({ sha256, inQueue, server });

    if (decision.action === "ask") {
      const choice = await params.choose({
        file,
        kind,
        reason: decision.reason,
      });
      if (choice === "skip") continue;
    }

    if (sha256) seen.add(sha256);
    accepted.push({ file, contentSha256: sha256, kind });
  }

  return accepted;
}
