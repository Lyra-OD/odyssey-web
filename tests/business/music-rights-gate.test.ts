import { describe, it, expect } from "vitest";

import {
  assertCheckoutMusicRights,
  assertExportAllowed,
  MUSIC_RIGHTS_TOS_VERSION,
  storyboardHasUploadSongs,
  type ProjectPaidEntitlementsRow,
} from "@/src/lib/wizard/exportGate";
import {
  emptyStoryboard,
  storyboardWith,
  stingraySong,
  uploadSong,
} from "./fixtures";

/**
 * Scénario 3 — Soupape MP3 / ToS.
 *
 * Un MP3 personnel (chapitre `source=upload`) ne peut PAS être facturé ni
 * exporté tant que l'attestation de droits (`musicRightsAttestation`) n'a
 * pas été acceptée. Le checkout renvoie 422 `music_attestation_required`.
 *
 * On teste les DEUX gardes de production réelles : checkout + export.
 */

const validAttestation = {
  acceptedAt: "2026-07-21T12:00:00.000Z",
  tosVersion: MUSIC_RIGHTS_TOS_VERSION,
};

describe("Soupape MP3 / ToS — attestation obligatoire", () => {
  it("détecte correctement la présence d'une piste uploadée", () => {
    expect(storyboardHasUploadSongs(storyboardWith(uploadSong()))).toBe(true);
    expect(storyboardHasUploadSongs(storyboardWith(stingraySong()))).toBe(false);
    expect(storyboardHasUploadSongs(emptyStoryboard())).toBe(false);
  });

  it("CHECKOUT bloque (422) un MP3 personnel SANS attestation", () => {
    const gate = assertCheckoutMusicRights({
      storyboard: storyboardWith(uploadSong()),
      musicRightsAttestation: null,
      locale: "fr",
    });

    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.code).toBe("music_attestation_required");
      expect(gate.message).toBeTruthy();
    }
  });

  it("CHECKOUT passe si l'attestation est présente et versionnée", () => {
    const gate = assertCheckoutMusicRights({
      storyboard: storyboardWith(uploadSong()),
      musicRightsAttestation: validAttestation,
      locale: "fr",
    });
    expect(gate.ok).toBe(true);
  });

  it("CHECKOUT ne demande rien si aucune piste uploadée (catalogue officiel only)", () => {
    const gate = assertCheckoutMusicRights({
      storyboard: storyboardWith(stingraySong()),
      musicRightsAttestation: null,
      locale: "fr",
    });
    expect(gate.ok).toBe(true);
  });

  it("attestation incomplète (sans tosVersion) = refus", () => {
    const gate = assertCheckoutMusicRights({
      storyboard: storyboardWith(uploadSong()),
      musicRightsAttestation: { acceptedAt: "2026-07-21T12:00:00.000Z" },
      locale: "fr",
    });
    expect(gate.ok).toBe(false);
  });

  it("EXPORT refuse un MP3 personnel sans attestation même si le forfait est payé", () => {
    const entitlements: ProjectPaidEntitlementsRow = {
      project_id: "p1",
      paid_package: "heritage",
      music_license: true,
      export_resolution: "4K",
      extensions: null,
      paid_at: "2026-07-21T12:00:00.000Z",
    };

    const denied = assertExportAllowed({
      entitlements,
      storyboard: storyboardWith(uploadSong()),
      musicRightsAttestation: null,
      locale: "fr",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("upload_attestation_missing");

    const allowed = assertExportAllowed({
      entitlements,
      storyboard: storyboardWith(uploadSong()),
      musicRightsAttestation: validAttestation,
      locale: "fr",
    });
    expect(allowed.ok).toBe(true);
  });

  it("EXPORT : never-trust — sans entitlements payés, refus systématique", () => {
    const denied = assertExportAllowed({
      entitlements: null,
      storyboard: storyboardWith(stingraySong()),
      musicRightsAttestation: null,
      locale: "fr",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("entitlements_missing");
  });
});
