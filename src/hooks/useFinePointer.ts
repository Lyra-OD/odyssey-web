"use client";

import { useSyncExternalStore } from "react";

const FINE_POINTER_QUERY = "(pointer: fine)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(FINE_POINTER_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/** `true` quand l'appareil principal expose un pointeur précis (souris, trackpad). */
export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
