/** Barrel public Creatomate mapping (server). */

export {
  cinematicTheme,
  CREATOMATE_MEDIA_SIGNED_URL_TTL_SEC,
} from "@/src/lib/creatomate/cinematicTheme";
export {
  resolveCreatomateResolution,
  isMaster4kPackage,
} from "@/src/lib/creatomate/resolveResolution";
export {
  buildCreatomateSource,
  buildCreatomateRenderBody,
} from "@/src/lib/creatomate/payloadBuilder";
export {
  buildOdysseyRenderPlan,
  essentialsFromWizard,
} from "@/src/lib/creatomate/buildPlan";
export {
  buildTimelineClips,
  buildDuckedMusicSegments,
} from "@/src/lib/creatomate/timeline";
export {
  selectOneBedStem,
  enforceOneBedLaw,
  compileDuckEnvelopes,
} from "@/src/lib/creatomate/mixBus";
export type {
  AudioLayer,
  AudioProvenance,
  AudioPlacement,
  ResolvedAudioStem,
} from "@/src/lib/creatomate/types";
export { AUDIO_LAYER_DUCK_PRIORITY } from "@/src/lib/creatomate/types";
export { resolveAudioStems } from "@/src/lib/creatomate/resolveAudioStems";
export {
  resolveStingrayMasterUrl,
  isStingrayMasterConfigured,
} from "@/src/lib/creatomate/resolveStingrayMaster";
