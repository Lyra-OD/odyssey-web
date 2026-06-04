import type { ExtensionLineKey } from "@/src/lib/wizard/wizardPricing";

/** Vignettes produit — style coffret luxe (Unsplash, haute qualité). */
export const EXTENSION_VISUALS: Record<
  Exclude<ExtensionLineKey, "base">,
  { cardImage?: string; thumbnail: string; alt: string }
> = {
  aiRetouch: {
    thumbnail:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=160&h=160&fit=crop&q=80",
    alt: "Retouche IA Premium",
  },
  extendedLicense: {
    thumbnail:
      "https://images.unsplash.com/photo-1511379938549-c1f69419868d?w=160&h=160&fit=crop&q=80",
    alt: "Licence de diffusion étendue",
  },
  collectorUsb: {
    cardImage:
      "https://images.unsplash.com/photo-1597872200969-2b65d56550b8?w=640&h=480&fit=crop&q=85",
    thumbnail:
      "https://images.unsplash.com/photo-1597872200969-2b65d56550b8?w=160&h=160&fit=crop&q=80",
    alt: "Clef USB Collector dans son écrin",
  },
  digitalVault: {
    thumbnail:
      "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=160&h=160&fit=crop&q=80",
    alt: "Coffre-fort Digital",
  },
  heritagePack: {
    thumbnail:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=160&h=160&fit=crop&q=80",
    alt: "Pack Héritage",
  },
};
