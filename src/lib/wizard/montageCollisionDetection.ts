import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";

import {
  UNASSIGNED_CONTAINER_ID,
  isUnassignedContainerId,
  parseDroppableActId,
} from "@/src/lib/wizard/montageHelpers";

function isColumnContainerId(id: string): boolean {
  return parseDroppableActId(id) !== null || isUnassignedContainerId(id);
}

/** Priorise la colonne sous le curseur, puis l'item le plus proche à l'intérieur. */
export const montageCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  const containerHits = pointerCollisions.filter((collision) =>
    isColumnContainerId(String(collision.id)),
  );

  if (containerHits.length > 0) {
    const itemHits = pointerCollisions.filter(
      (collision) => !isColumnContainerId(String(collision.id)),
    );
    if (itemHits.length > 0) {
      return [...itemHits, ...containerHits];
    }
    return containerHits;
  }

  const centerHits = closestCenter(args);
  const containerFromCenter = centerHits.find((collision) =>
    isColumnContainerId(String(collision.id)),
  );

  if (containerFromCenter) {
    return [containerFromCenter, ...centerHits.filter((c) => c !== containerFromCenter)];
  }

  return centerHits;
};
