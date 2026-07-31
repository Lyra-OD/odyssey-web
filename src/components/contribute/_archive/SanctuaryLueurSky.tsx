"use client";

import { SanctuaryLueurOrb } from "@/src/components/contribute/SanctuaryLueurOrb";

export type SanctuaryLueurSkyProps = {
  locale: "fr" | "en";
  className?: string;
};

// Positions asymétriques + noms fictifs (maquette — plus tard : vrais contributeurs)
const ORB_POSITIONS = [
  { id: 1, top: "15%", left: "10%", scale: 0.8, name: "Claire" },
  { id: 2, top: "8%", left: "45%", scale: 1.1, name: "Thomas" },
  { id: 3, top: "25%", left: "80%", scale: 0.7, name: "Amélie" },
  { id: 4, top: "50%", left: "20%", scale: 1.0, name: "Julien" },
  { id: 5, top: "45%", left: "60%", scale: 0.85, name: "Sophie" },
  { id: 6, top: "75%", left: "85%", scale: 1.15, name: "Marc" },
  { id: 7, top: "85%", left: "35%", scale: 0.9, name: "Léa" },
  { id: 8, top: "65%", left: "5%", scale: 0.65, name: "Éric" },
];

const copy = {
  fr: {
    aria: "Ciel de lueurs du Sanctuaire",
    orb: (name: string) => `Lueur de ${name}`,
    whisper: "Le ciel se remplit",
  },
  en: {
    aria: "Sanctuary sky of glows",
    orb: (name: string) => `Glow from ${name}`,
    whisper: "The sky is gathering",
  },
} as const;

/**
 * Maquette Ciel Famille : constellation asymétrique avec profondeur.
 */
export function SanctuaryLueurSky({
  locale,
  className = "",
}: SanctuaryLueurSkyProps) {
  const t = copy[locale];

  return (
    <section
      className={`relative h-[80vh] min-h-[600px] w-full overflow-hidden ${className}`.trim()}
      aria-label={t.aria}
    >
      <div className="absolute inset-0 mx-auto max-w-6xl">
        {ORB_POSITIONS.map((pos) => (
          <div
            key={pos.id}
            className="group absolute flex flex-col items-center transition-transform duration-[2000ms] ease-out hover:scale-110"
            style={{
              top: pos.top,
              left: pos.left,
              transform: `translate(-50%, -50%) scale(${pos.scale})`,
            }}
          >
            <div className="relative cursor-pointer pointer-events-auto">
              <SanctuaryLueurOrb
                variant="sky"
                size="sky"
                aria-label={t.orb(pos.name)}
              />

              {/* Nom du contributeur — discret au hover */}
              <div className="pointer-events-none absolute left-1/2 top-full mt-2 w-max -translate-x-1/2 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                <span className="text-xs font-light tracking-[0.18em] text-teal-100/50">
                  {pos.name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm font-light uppercase tracking-widest text-teal-50/30">
          {t.whisper}
        </p>
      </div>
    </section>
  );
}
