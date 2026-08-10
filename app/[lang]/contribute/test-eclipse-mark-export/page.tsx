"use client";

import { OdysseyEclipseMark } from "@/src/components/contribute/OdysseyEclipseMark";

/**
 * Export DA — marque seule, fond noir, 512².
 * `/fr/contribute/test-eclipse-mark-export`
 */
export default function EclipseMarkExportPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <OdysseyEclipseMark size={512} animate aria-label="Odyssey Eclipse" />
    </main>
  );
}
