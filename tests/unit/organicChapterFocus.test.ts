import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ORGANIC_FOCUS_DIM_OPACITY,
  ORGANIC_FOCUS_DWELL_MS,
  ORGANIC_FOCUS_SCROLL_EXIT_PX,
  accumulateScrollExit,
  createOrganicFocusDwellScheduler,
  focusChapterIdForMagicGate,
  resolveChapterFocusPresentation,
  shouldIgnoreScrollExitDuringDnd,
} from "@/src/surfaces/livre/storyboard/organicChapterFocus";

describe("S5-K focus organique", () => {
  it("fige dwell 500 ms, scroll exit 48 px, dim ~40 %", () => {
    expect(ORGANIC_FOCUS_DWELL_MS).toBe(500);
    expect(ORGANIC_FOCUS_SCROLL_EXIT_PX).toBe(48);
    expect(ORGANIC_FOCUS_DIM_OPACITY).toBe(0.6);
  });

  it("entrée : présentation focused / dimmed / idle", () => {
    expect(resolveChapterFocusPresentation(null, "c1")).toBe("idle");
    expect(resolveChapterFocusPresentation("c1", "c1")).toBe("focused");
    expect(resolveChapterFocusPresentation("c1", "c2")).toBe("dimmed");
  });

  it("sortie scroll : cumul 48 px puis reset", () => {
    const step1 = accumulateScrollExit(0, 20);
    expect(step1.shouldExit).toBe(false);
    expect(step1.cumulativePx).toBe(20);

    const step2 = accumulateScrollExit(step1.cumulativePx, 27);
    expect(step2.shouldExit).toBe(false);
    expect(step2.cumulativePx).toBe(47);

    const step3 = accumulateScrollExit(step2.cumulativePx, 1);
    expect(step3.shouldExit).toBe(true);
    expect(step3.cumulativePx).toBe(0);

    const again = accumulateScrollExit(0, 10);
    expect(again.shouldExit).toBe(false);
    expect(again.cumulativePx).toBe(10);
  });

  it("verrouillage Magic : focus forcé à null", () => {
    expect(focusChapterIdForMagicGate(true, "c1")).toBeNull();
    expect(focusChapterIdForMagicGate(false, "c1")).toBe("c1");
    expect(focusChapterIdForMagicGate(false, null)).toBeNull();
  });

  it("DnD actif : ignore la sortie scroll (autoScroll)", () => {
    expect(shouldIgnoreScrollExitDuringDnd(true)).toBe(true);
    expect(shouldIgnoreScrollExitDuringDnd(false)).toBe(false);
  });
});

describe("S5-K dwell scheduler (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("active après 500 ms si Magic est off", () => {
    const onActivate = vi.fn();
    let magic = false;
    const dwell = createOrganicFocusDwellScheduler({
      getIsMagicRunning: () => magic,
      onActivate,
    });

    dwell.start("c1");
    expect(onActivate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(499);
    expect(onActivate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith("c1");
  });

  it("annule le timer au re-start (changement de chapitre)", () => {
    const onActivate = vi.fn();
    const dwell = createOrganicFocusDwellScheduler({
      getIsMagicRunning: () => false,
      onActivate,
    });

    dwell.start("c1");
    vi.advanceTimersByTime(300);
    dwell.start("c2");
    vi.advanceTimersByTime(500);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith("c2");
  });

  it("cancel avant le fire ne déclenche pas", () => {
    const onActivate = vi.fn();
    const dwell = createOrganicFocusDwellScheduler({
      getIsMagicRunning: () => false,
      onActivate,
    });

    dwell.start("c1");
    dwell.cancel();
    vi.advanceTimersByTime(600);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("garde Magic dans le callback : pas d’activation si Magic devient true", () => {
    const onActivate = vi.fn();
    let magic = false;
    const dwell = createOrganicFocusDwellScheduler({
      getIsMagicRunning: () => magic,
      onActivate,
    });

    dwell.start("c1");
    vi.advanceTimersByTime(400);
    magic = true;
    vi.advanceTimersByTime(200);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("refuse de démarrer un dwell si Magic est déjà true", () => {
    const onActivate = vi.fn();
    const dwell = createOrganicFocusDwellScheduler({
      getIsMagicRunning: () => true,
      onActivate,
    });

    dwell.start("c1");
    vi.advanceTimersByTime(600);
    expect(onActivate).not.toHaveBeenCalled();
  });
});
