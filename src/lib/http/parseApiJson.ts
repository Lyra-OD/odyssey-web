/**
 * Safe JSON parse for fetch responses — empty object on invalid/empty body.
 */
export async function parseApiJson<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}
