"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  capChaptersToPackageMax,
  countSongsLostIfCappedTo,
  detectDuplicateStoryboardSongs,
  ensureMinimumChapters,
  getRequiredSongCountForMediaCount,
  validateStoryboardPackageStructure,
  type DuplicateSongInfo,
  type StoryboardStructureValidation,
} from "@/src/lib/wizard/storyboardHelpers";
import { estimateStoryboardTotalDurationSec } from "@/src/lib/wizard/storyboardPacing";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

export type UseWizardStoryboardOptions = {
  /** Snapshot initial (hydraté depuis l'autosave) — lu une seule fois au montage. */
  initialStoryboard: WizardStoryboardState;
  packageId: PackageId;
  maxSongs: number;
  /** Volume total de médias déjà uploadés (Étape 3) — pilote le nombre minimum de chapitres. */
  projectMediaCount: number;
  /**
   * Notifié à chaque changement de storyboard, qu'il soit manuel (choix
   * d'une chanson) ou déclenché par la resynchronisation automatique avec le
   * forfait courant. Le hook reste volontairement ignorant de l'autosave —
   * c'est à l'appelant (`TributeWizard`) de persister via ce callback.
   */
  onChange?: (next: WizardStoryboardState) => void;
};

export type UseWizardStoryboardResult = {
  storyboard: WizardStoryboardState;
  /** Remplace le storyboard (ex. affectation d'une chanson, ajout/retrait de chapitre, futur drag & drop). */
  setStoryboard: (next: WizardStoryboardState) => void;
  structureValidation: StoryboardStructureValidation;
  duplicateSongInfo: DuplicateSongInfo;
  duplicateSongsAcknowledged: boolean;
  setDuplicateSongsAcknowledged: (value: boolean) => void;
  /** Estimation optimiste (minutes) — résumé narratif de l'en-tête uniquement, jamais un calcul de capacité. */
  estimatedTotalMinutes: number;
  /** Combien de chansons déjà choisies seraient perdues si le storyboard était plafonné à `maxCount` chapitres. */
  songsLostIfCappedTo: (maxCount: number) => number;
};

/**
 * Isole l'état et la logique du domaine `WizardStoryboardState` (chapitres
 * musicaux de l'Étape 4, fondation de la future Étape 5 avec dnd-kit) :
 * resynchronisation avec le forfait courant, détection de doublons musicaux
 * et validation structurelle (`minSongsRequired` / `maxSongs`).
 *
 * Extrait de `TributeWizard.tsx` (Opération Clean Slate, phase 3b) pour que
 * l'orchestrateur redevienne un simple assembleur d'étapes.
 */
export function useWizardStoryboard({
  initialStoryboard,
  packageId,
  maxSongs,
  projectMediaCount,
  onChange,
}: UseWizardStoryboardOptions): UseWizardStoryboardResult {
  const [storyboard, setStoryboardState] = useState<WizardStoryboardState>(
    () => initialStoryboard,
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setStoryboard = useCallback((next: WizardStoryboardState) => {
    setStoryboardState(next);
    onChangeRef.current?.(next);
  }, []);

  // Resynchronise les bacs avec le forfait courant, quelle que soit l'étape
  // active — le sélecteur de forfait vit dans l'en-tête global (accessible
  // depuis n'importe quelle étape), donc ce recalcul ne doit plus dépendre
  // du montage de l'Étape 4. Ne raccourcit jamais une liste existante (seul
  // le plafond dur `maxSongs` peut retirer des chapitres, ex. rétrogradation),
  // et priorise la conservation des bacs déjà pourvus d'une chanson (voir
  // `capChaptersToPackageMax`).
  useEffect(() => {
    const minRequired = getRequiredSongCountForMediaCount(packageId, projectMediaCount);
    const grown = ensureMinimumChapters(storyboard, minRequired, maxSongs);
    const capped = capChaptersToPackageMax(grown, maxSongs);
    if (capped !== storyboard) {
      setStoryboard(capped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne réagit qu'aux signaux structurels (forfait / volume médias), pas à chaque frappe utilisateur
  }, [packageId, projectMediaCount, maxSongs]);

  const structureValidation = useMemo(
    () => validateStoryboardPackageStructure(storyboard, packageId, projectMediaCount),
    [storyboard, packageId, projectMediaCount],
  );

  // Détection pure, jamais persistée — seul l'acquittement ci-dessous vit en
  // state local pour ne pas polluer `WizardStoryboardState`.
  const duplicateSongInfo = useMemo(
    () => detectDuplicateStoryboardSongs(storyboard),
    [storyboard],
  );

  const [duplicateSongsAcknowledged, setDuplicateSongsAcknowledgedState] =
    useState(false);
  const acknowledgedSignatureRef = useRef<string>("");

  useEffect(() => {
    if (duplicateSongInfo.signature !== acknowledgedSignatureRef.current) {
      acknowledgedSignatureRef.current = "";
      setDuplicateSongsAcknowledgedState(false);
    }
  }, [duplicateSongInfo.signature]);

  const setDuplicateSongsAcknowledged = useCallback(
    (value: boolean) => {
      acknowledgedSignatureRef.current = value ? duplicateSongInfo.signature : "";
      setDuplicateSongsAcknowledgedState(value);
    },
    [duplicateSongInfo.signature],
  );

  // Estimation optimiste (chanson réelle si choisie, sinon moyenne 3-4 min) —
  // uniquement pour le résumé narratif de l'en-tête, jamais pour un calcul
  // de capacité.
  const estimatedTotalMinutes = useMemo(
    () => Math.round(estimateStoryboardTotalDurationSec(storyboard.chapters) / 60),
    [storyboard.chapters],
  );

  const songsLostIfCappedTo = useCallback(
    (maxCount: number) => countSongsLostIfCappedTo(storyboard, maxCount),
    [storyboard],
  );

  return {
    storyboard,
    setStoryboard,
    structureValidation,
    duplicateSongInfo,
    duplicateSongsAcknowledged,
    setDuplicateSongsAcknowledged,
    estimatedTotalMinutes,
    songsLostIfCappedTo,
  };
}
