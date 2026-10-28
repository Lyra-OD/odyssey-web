import { describe, expect, it, afterEach } from "vitest";

import {
  acquireVideoEncodeSlot,
  releaseVideoEncodeSlot,
  resetVideoEncodeSlotForTests,
  videoEncodeSlotsInUse,
  withVideoEncodeSlot,
} from "@/src/lib/media/videoEncodeSlot";

afterEach(() => {
  resetVideoEncodeSlotForTests();
});

describe("videoEncodeSlot", () => {
  it("laisse deux prepares avancer, la troisième attend une place", async () => {
    await acquireVideoEncodeSlot();
    await acquireVideoEncodeSlot();
    expect(videoEncodeSlotsInUse()).toBe(2);

    let third = false;
    const pending = acquireVideoEncodeSlot().then(() => {
      third = true;
    });
    await Promise.resolve();
    expect(third).toBe(false);

    releaseVideoEncodeSlot();
    await pending;
    expect(third).toBe(true);
    expect(videoEncodeSlotsInUse()).toBe(2);
    releaseVideoEncodeSlot();
    releaseVideoEncodeSlot();
    expect(videoEncodeSlotsInUse()).toBe(0);
  });

  it("une préparation annulée garde son créneau tant que le travail n’est pas terminé", async () => {
    await acquireVideoEncodeSlot();
    const controller = new AbortController();
    let settle: (() => void) | undefined;
    const held = withVideoEncodeSlot(
      controller.signal,
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        }),
    );
    await Promise.resolve();
    expect(videoEncodeSlotsInUse()).toBe(2);

    let third = false;
    const waiting = acquireVideoEncodeSlot().then(() => {
      third = true;
    });
    controller.abort();
    await Promise.resolve();
    expect(third).toBe(false);
    expect(videoEncodeSlotsInUse()).toBe(2);

    settle?.();
    await held;
    await waiting;
    expect(third).toBe(true);
    releaseVideoEncodeSlot();
    releaseVideoEncodeSlot();
    expect(videoEncodeSlotsInUse()).toBe(0);
  });
});
