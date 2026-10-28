/**
 * Commit 10 — barrières d’annulation entre préparation, Storage et base.
 * L’encode vidéo n’est pas appelé ici (Commit 11).
 *
 * Point de non-retour : la base a répondu OK. `discard` refuse un chemin
 * déjà référencé par `media_assets`, donc on ne fait pas semblant d’annuler
 * un souvenir déjà écrit.
 */

export const UPLOAD_CHAIN_CANCELLED = "upload_chain_cancelled";

/** Le POST base a échoué sans qu’on sache si la ligne existe. Pas un texte écran. */
export const UPLOAD_COMMIT_UNCERTAIN = "upload_commit_uncertain";

export type UploadChainStep = "prepare" | "storage" | "poster" | "database";

export class UploadChainCancelledError extends Error {
  readonly step: UploadChainStep;

  constructor(step: UploadChainStep) {
    super(UPLOAD_CHAIN_CANCELLED);
    this.name = "UploadChainCancelledError";
    this.step = step;
  }
}

export function isUploadChainCancelled(error: unknown): boolean {
  return (
    error instanceof UploadChainCancelledError ||
    (error instanceof Error && error.message === UPLOAD_CHAIN_CANCELLED)
  );
}

export class UploadCommitUncertainError extends Error {
  constructor() {
    super(UPLOAD_COMMIT_UNCERTAIN);
    this.name = "UploadCommitUncertainError";
  }
}

export function isUploadCommitUncertain(error: unknown): boolean {
  return (
    error instanceof UploadCommitUncertainError ||
    (error instanceof Error && error.message === UPLOAD_COMMIT_UNCERTAIN)
  );
}

/**
 * Certain : le serveur a répondu un échec applicatif (quota, register, upsert).
 * Incertain : réseau, 5xx, abort du fetch. La ligne peut exister quand même.
 */
export function classifyDatabaseCommitFailure(
  error: unknown,
): "certain" | "uncertain" {
  if (isUploadCommitUncertain(error)) return "uncertain";
  if (!(error instanceof Error)) return "uncertain";
  if (error.name === "AbortError" || error instanceof TypeError) {
    return "uncertain";
  }
  const msg = error.message.toLowerCase();
  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("econnreset") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("http_5")
  ) {
    return "uncertain";
  }
  return "certain";
}

/** Empêche l’étape suivante de démarrer si la file est déjà annulée. */
export function assertUploadChainOpen(
  signal: AbortSignal | undefined,
  step: UploadChainStep,
): void {
  if (signal?.aborted) throw new UploadChainCancelledError(step);
}

/**
 * L’objet Storage existe (réponse OK). On n’ouvre pas la base si annulé :
 * le chemin n’est pas référencé, il part au discard.
 */
export function storageGateDecision(
  signal: AbortSignal | undefined,
): "continue" | "discard" {
  return signal?.aborted ? "discard" : "continue";
}

export type DatabaseGateDecision = {
  status: "uploaded";
  discardStorage: false;
  reason: "committed" | "committed_during_abort";
};

/**
 * La base a répondu OK, y compris si l’annulation est arrivée pendant l’attente.
 * Pas de rollback : un discard après coup laisserait la ligne et mentirait.
 */
export function databaseGateDecision(
  signal: AbortSignal | undefined,
): DatabaseGateDecision {
  if (signal?.aborted) {
    return {
      status: "uploaded",
      discardStorage: false,
      reason: "committed_during_abort",
    };
  }
  return {
    status: "uploaded",
    discardStorage: false,
    reason: "committed",
  };
}

/**
 * Étape préparation. Sans `prepare`, le fichier de la file part tel quel
 * (`item.file`, déjà préparé ou photo). Avec `prepare` (tests, puis Commit 11),
 * la source est `originalFile`. Un abort pendant ou juste après n’autorise
 * pas Storage.
 */
export async function runPrepareStep(params: {
  file: File;
  originalFile?: File;
  signal?: AbortSignal;
  prepare?: (
    source: File,
    signal: AbortSignal | undefined,
  ) => Promise<File>;
}): Promise<File> {
  assertUploadChainOpen(params.signal, "prepare");
  if (!params.prepare) return params.file;

  const source = params.originalFile ?? params.file;
  const prepared = await params.prepare(source, params.signal);
  assertUploadChainOpen(params.signal, "prepare");
  return prepared;
}
