import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { WIZARD_EDITOR_COOKIE_NAME } from "@/src/lib/wizard/collabCapabilities";
import {
  decodeWizardEditorCookie,
  encodeWizardEditorCookie,
  wizardEditorCookieOptions,
  type WizardEditorCookiePayload,
} from "@/src/lib/wizard/collabSessionCrypto";

export type { WizardEditorCookiePayload };
export {
  buildWizardEditorCookiePayload,
  decodeWizardEditorCookie,
  encodeWizardEditorCookie,
} from "@/src/lib/wizard/collabSessionCrypto";

/** Lit + vérifie le cookie session Co-Créateur (null si absent/invalide/expiré). */
export async function readWizardEditorSession(): Promise<WizardEditorCookiePayload | null> {
  const jar = await cookies();
  const raw = jar.get(WIZARD_EDITOR_COOKIE_NAME)?.value;
  if (!raw) return null;
  return decodeWizardEditorCookie(raw);
}

/** Pose le cookie sur une `NextResponse` (redeem). */
export function attachWizardEditorCookie(
  response: NextResponse,
  payload: WizardEditorCookiePayload,
): void {
  const maxAge = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  response.cookies.set(
    WIZARD_EDITOR_COOKIE_NAME,
    encodeWizardEditorCookie(payload),
    wizardEditorCookieOptions(maxAge),
  );
}

/** Efface le cookie session éditeur. */
export function clearWizardEditorCookie(response: NextResponse): void {
  response.cookies.set(WIZARD_EDITOR_COOKIE_NAME, "", {
    ...wizardEditorCookieOptions(0),
    maxAge: 0,
  });
}
