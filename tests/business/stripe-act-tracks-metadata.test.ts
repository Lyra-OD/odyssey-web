import { describe, expect, it } from "vitest";

import {
  assertStripeMetadataWithinLimit,
  serializeActTracksForStripeMetadata,
  STRIPE_METADATA_VALUE_MAX,
} from "@/src/lib/stripe/actTracksMetadata";

describe("serializeActTracksForStripeMetadata", () => {
  it("n'envoie que les trackId (limite Stripe 500 car.)", () => {
    const payload = serializeActTracksForStripeMetadata({
      acte1: {
        title: "Hier encore",
        artist: "Charles Aznavour",
        trackId: "stingray-aznavour-hier-encore",
        coverUrl: "https://picsum.photos/seed/aznavour-hier/120/120",
        previewUrl: "/api/music/preview?trackId=stingray-aznavour-hier-encore",
      },
      acte2: {
        title: "La Mamma",
        artist: "Charles Aznavour",
        trackId: "stingray-aznavour-la-mamma",
        coverUrl: "https://picsum.photos/seed/aznavour-la-mamma/120/120",
        previewUrl: "/api/music/preview?trackId=stingray-aznavour-la-mamma",
      },
      acte3: {
        title: "Hier encore",
        artist: "Charles Aznavour",
        trackId: "stingray-aznavour-hier-encore",
        coverUrl: "https://picsum.photos/seed/aznavour-hier/120/120",
        previewUrl: "/api/music/preview?trackId=stingray-aznavour-hier-encore",
      },
    });

    expect(payload.length).toBeLessThan(200);
    expect(JSON.parse(payload)).toEqual({
      acte1: "stingray-aznavour-hier-encore",
      acte2: "stingray-aznavour-la-mamma",
      acte3: "stingray-aznavour-hier-encore",
    });
    expect(payload.length).toBeLessThanOrEqual(STRIPE_METADATA_VALUE_MAX);
  });

  it("assertStripeMetadataWithinLimit rejette une valeur trop longue", () => {
    expect(() =>
      assertStripeMetadataWithinLimit({
        ok: "x".repeat(STRIPE_METADATA_VALUE_MAX + 1),
      }),
    ).toThrow(/stripe_metadata_too_long/);
  });
});
