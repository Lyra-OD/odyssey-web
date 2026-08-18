import { describe, expect, it } from "vitest";

import {
  filterApiTracksByCatalogTier,
  isTrackAllowedForCatalogTier,
} from "@/src/lib/music/musicCatalogTierFilter";
import { resolveServerMusicCatalogTier } from "@/src/lib/music/resolveServerMusicCatalogTier";
import type { StingrayTrackApiPayload } from "@/src/lib/wizard/stingrayCatalog";

describe("resolveServerMusicCatalogTier", () => {
  it("retourne premium pour Héritage sans add-on", () => {
    expect(
      resolveServerMusicCatalogTier({
        grantedPackage: "essential",
        intendedPackage: "signature",
        extensions: {},
      }),
    ).toBe("premium");
  });

  it("retourne premium pour Souvenir avec Soft Cap musique", () => {
    expect(
      resolveServerMusicCatalogTier({
        grantedPackage: "essential",
        intendedPackage: "essential",
        extensions: {},
      }),
    ).toBe("premium");
  });

  it("retourne premium si licence musique active sur Souvenir", () => {
    expect(
      resolveServerMusicCatalogTier({
        grantedPackage: "essential",
        intendedPackage: "essential",
        extensions: { musicLicense: true },
      }),
    ).toBe("premium");
  });

  it("retourne premium pour Co-Créateur (editor)", () => {
    expect(
      resolveServerMusicCatalogTier({
        grantedPackage: "essential",
        intendedPackage: "essential",
        extensions: {},
        role: "editor",
      }),
    ).toBe("premium");
  });

  it("retourne standard si intended >= Héritage sans licence (pas soft cap)", () => {
    expect(
      resolveServerMusicCatalogTier({
        grantedPackage: "essential",
        intendedPackage: "signature",
        extensions: {},
        role: "owner",
      }),
    ).toBe("premium");
  });
});

describe("filterApiTracksByCatalogTier", () => {
  const tracks: StingrayTrackApiPayload[] = [
    {
      id: "std-1",
      title: "Standard",
      artist: "A",
      duration: "3:00",
      coverUrl: "",
      previewUrl: "/api/music/preview?trackId=std-1",
      streamUrl: "/api/music/preview?trackId=std-1",
      playbackUrl: "/api/music/preview?trackId=std-1",
      musicTier: "standard",
    },
    {
      id: "prem-1",
      title: "Premium",
      artist: "B",
      duration: "3:00",
      coverUrl: "",
      previewUrl: "/api/music/preview?trackId=prem-1",
      streamUrl: "/api/music/preview?trackId=prem-1",
      playbackUrl: "/api/music/preview?trackId=prem-1",
      musicTier: "premium",
    },
    {
      id: "sr:pl:unk",
      title: "Live unknown",
      artist: "C",
      duration: "",
      coverUrl: "",
      previewUrl: "/api/music/preview?trackId=sr%3Apl%3Aunk",
      streamUrl: "/api/music/preview?trackId=sr%3Apl%3Aunk",
      playbackUrl: "/api/music/preview?trackId=sr%3Apl%3Aunk",
    },
  ];

  it("conserve tout en tier premium", () => {
    expect(filterApiTracksByCatalogTier(tracks, "premium")).toHaveLength(3);
  });

  it("filtre premium et inconnu en tier standard", () => {
    const filtered = filterApiTracksByCatalogTier(tracks, "standard");
    expect(filtered.map((t) => t.id)).toEqual(["std-1"]);
  });
});

describe("isTrackAllowedForCatalogTier", () => {
  it("refuse une piste premium pour tier standard", () => {
    expect(isTrackAllowedForCatalogTier("prem-track", "standard", "premium")).toBe(
      false,
    );
  });

  it("autorise toute piste en tier premium", () => {
    expect(isTrackAllowedForCatalogTier("anything", "premium")).toBe(true);
  });
});
