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
  className = "",
}: Props) {
  if (capacity === null) {
    return (
      <span className={`text-xs font-light text-zinc-500 ${className}`}>
        {copy.pending}
      </span>
    );
  }

  const isOverloaded =
    showAssigned && typeof assignedCount === "number" && assignedCount > capacity;

  if (showAssigned && typeof assignedCount === "number") {
    return (
      <span
        className={`text-xs font-medium tabular-nums ${
          isOverloaded ? "text-amber-300" : "text-teal-300/90"
        } ${className}`}
      >
        {assignedCount}/{capacity}
      </span>
    );
  }

  return (
    <span className={`text-xs font-medium text-teal-300/90 ${className}`}>
      {copy.recommended.replace("{count}", String(capacity))}
    </span>
  );
}
