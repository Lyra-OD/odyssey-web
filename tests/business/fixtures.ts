import type {
  WizardStoryboardState,
  WizardStoryboardSong,
} from "@/src/lib/wizard/wizardState";

/**
 * Fixtures partagées Phase 6 — reflètent la forme réelle de `wizard_state`
 * consommée par le checkout / l'export gate (jamais de secret / infra).
 */

export function emptyStoryboard(): WizardStoryboardState {
  return {
    chapters: [],
    unassignedIds: [],
    excludedIds: [],
    focalPoints: {},
    videoTrims: {},
  };
}

export function stingraySong(
  trackId = "stingray-track-001",
): WizardStoryboardSong {
  return {
    source: "stingray",
    trackId,
    title: "Adagio for Strings",
    artist: "Stingray Official",
    durationSec: 210,
  };
}

export function uploadSong(
  storagePath = "projects/p1/music/upload-abc.mp3",
): WizardStoryboardSong {
  return {
    source: "upload",
    storagePath,
    title: "Notre chanson",
    fileName: "notre-chanson.mp3",
    mimeType: "audio/mpeg",
    durationSec: 195,
  };
}

export function storyboardWith(song: WizardStoryboardSong): WizardStoryboardState {
  return {
    ...emptyStoryboard(),
    chapters: [{ id: "chapter-1", mediaIds: [], song }],
  };
}
