import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";
import type { StoryboardFilmMapWatchSession } from "@/src/surfaces/livre/storyboard/StoryboardFilmMap";
import type { LivreCopyBlob } from "./copy";

export type { LivreCopyBlob } from "./copy";

export type LivreHostProps = {
  projectId: string | null;
  packageId: PackageId;
  storyboard: WizardStoryboardState;
  /** Incrémenté par le host quand le tiroir Coffre a modifié la banque → refetch. */
  coffreMediaRevision?: number;
  onStoryboardChange: (next: WizardStoryboardState) => void;
  onMagicPerformingChange?: (performing: boolean) => void;
  onMagicSequenceComplete?: () => void;
  /** Lien discret « déléguer » de la porte d’onboarding → panneau Co-Créateur existant. */
  onOpenCollab?: () => void;
  onWatchSession?: (mediaItems: MontageMediaItem[]) => void;
  watchSessionCopy?: StoryboardFilmMapWatchSession;
  copy: LivreCopyBlob;
};
