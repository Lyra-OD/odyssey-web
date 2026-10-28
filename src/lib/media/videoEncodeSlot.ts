/**
 * Au plus deux encodes vidéo à la fois. Les photos ne prennent pas ce créneau.
 */

import { UploadChainCancelledError } from "@/src/lib/uploads/uploadChainGate";

const MAX_VIDEO_ENCODES = 2;

let active = 0;
const waiters: Array<() => void> = [];

export function resetVideoEncodeSlotForTests(): void {
  active = 0;
  waiters.length = 0;
}

export function videoEncodeSlotsInUse(): number {
  return active;
}

function grantNextOrFree(): void {
  const next = waiters.shift();
  if (next) next();
  else active = Math.max(0, active - 1);
}

export function acquireVideoEncodeSlot(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new UploadChainCancelledError("prepare"));
  }
  if (active < MAX_VIDEO_ENCODES) {
    active += 1;
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const grant = () => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        grantNextOrFree();
        reject(new UploadChainCancelledError("prepare"));
        return;
      }
      resolve();
    };
    const onAbort = () => {
      const index = waiters.indexOf(grant);
      if (index >= 0) waiters.splice(index, 1);
      reject(new UploadChainCancelledError("prepare"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    waiters.push(grant);
  });
}

export function releaseVideoEncodeSlot(): void {
  grantNextOrFree();
}

export async function withVideoEncodeSlot<T>(
  signal: AbortSignal | undefined,
  run: () => Promise<T>,
): Promise<T> {
  await acquireVideoEncodeSlot(signal);
  try {
    return await run();
  } finally {
    releaseVideoEncodeSlot();
  }
}
