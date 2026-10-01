"use client";

export type StoryboardCapacityBadgeCopy = {
  /** Doit contenir `{count}` — ex. « ≈ {count} médias recommandés ». */
  recommended: string;
  pending: string;
};

type Props = {
  /** `null` tant que la durée de la chanson est inconnue. */
  capacity: number | null;
  assignedCount?: number;
  /** Affiche `{assigned}/{capacity}` plutôt que la seule capacité recommandée. */
  showAssigned?: boolean;
  copy: StoryboardCapacityBadgeCopy;
  /** Couleur du chapitre (`theme.text`) — jamais le teal générique. */
  toneClassName?: string;
  className?: string;
};

/**
 * Badge de capacité recommandée d'un chapitre (`durationSec / targetSecondsPerMedia`).
 * Réutilisé Étape 4 (aperçu dès le choix de la chanson) et Étape 5 (bac médias).
 */
export function StoryboardCapacityBadge({
  capacity,
  assignedCount,
  showAssigned = false,
  copy,
  toneClassName,
  className = "",
}: Props) {
  const countTone = toneClassName ?? "text-teal-300/90";

  if (capacity === null) {
    return (
      <span className={`text-xs font-light text-zinc-500 ${className}`}>
        {copy.pending}
      </span>
    );
  }

  if (showAssigned && typeof assignedCount === "number") {
    return (
      <span
        className={`text-xs font-medium tabular-nums ${countTone} ${className}`}
      >
        {assignedCount}/{capacity}
      </span>
    );
  }

  return (
    <span className={`text-xs font-medium ${countTone} ${className}`}>
      {copy.recommended.replace("{count}", String(capacity))}
    </span>
  );
}
