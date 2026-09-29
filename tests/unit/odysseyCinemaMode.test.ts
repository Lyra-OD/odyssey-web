/**
 * =====================================================================
 * Odyssey — ref-count data-odyssey-cinema (sas + projection)
 * =====================================================================
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  __odysseyCinemaOwnerCountForTests,
  __resetOdysseyCinemaModeForTests,
  acquireOdysseyCinemaMode,
  ODYSSEY_CINEMA_ATTR,
} from "@/src/lib/odysseyCinemaMode";

function installMockDocument() {
  const attrs = new Map<string, string>();
  const documentElement = {
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    removeAttribute(name: string) {
      attrs.delete(name);
    },
    getAttribute(name: string) {
      return attrs.has(name) ? attrs.get(name)! : null;
    },
  };
  // @ts-expect-error minimal mock
  globalThis.document = { documentElement };
  return documentElement;
}

describe("acquireOdysseyCinemaMode", () => {
  beforeEach(() => {
    installMockDocument();
    __resetOdysseyCinemaModeForTests();
  });

  afterEach(() => {
    __resetOdysseyCinemaModeForTests();
  });

  it("pose l’attribut au premier acquire et le retire au dernier release", () => {
    const release = acquireOdysseyCinemaMode();
    expect(document.documentElement.getAttribute(ODYSSEY_CINEMA_ATTR)).toBe(
      "1",
    );
    expect(__odysseyCinemaOwnerCountForTests()).toBe(1);
    release();
    expect(document.documentElement.getAttribute(ODYSSEY_CINEMA_ATTR)).toBeNull();
    expect(__odysseyCinemaOwnerCountForTests()).toBe(0);
  });

  it("garde l’attribut si le sas reste owner après release projection", () => {
    const releaseGate = acquireOdysseyCinemaMode();
    const releaseProjection = acquireOdysseyCinemaMode();
    expect(__odysseyCinemaOwnerCountForTests()).toBe(2);
    releaseProjection();
    expect(document.documentElement.getAttribute(ODYSSEY_CINEMA_ATTR)).toBe(
      "1",
    );
    expect(__odysseyCinemaOwnerCountForTests()).toBe(1);
    releaseGate();
    expect(document.documentElement.getAttribute(ODYSSEY_CINEMA_ATTR)).toBeNull();
  });

  it("release idempotent", () => {
    const release = acquireOdysseyCinemaMode();
    release();
    release();
    expect(__odysseyCinemaOwnerCountForTests()).toBe(0);
    expect(document.documentElement.getAttribute(ODYSSEY_CINEMA_ATTR)).toBeNull();
  });
});
