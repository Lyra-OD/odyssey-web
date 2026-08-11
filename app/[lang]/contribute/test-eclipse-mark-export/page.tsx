"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { OdysseyEclipseMark } from "@/src/components/contribute/OdysseyEclipseMark";

/**
 * Export DA — marque seule, fond noir, 512².
 * `/fr/contribute/test-eclipse-mark-export`
 * Query : `?variant=lockup` (défaut) | `?variant=disc` (sans nom)
 */
function ExportMark() {
  const params = useSearchParams();
  const variant = params.get("variant") === "disc" ? "disc" : "lockup";
  const showWordmark = variant === "lockup";

  return (
    <OdysseyEclipseMark
      size={512}
      animate
      showWordmark={showWordmark}
      aria-label={showWordmark ? "Odyssey Eclipse lockup" : "Odyssey Eclipse disc"}
    />
  );
}

export default function EclipseMarkExportPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <Suspense
        fallback={
          <div className="h-[512px] w-[512px] bg-black" aria-hidden />
        }
      >
        <ExportMark />
      </Suspense>
    </main>
  );
}
