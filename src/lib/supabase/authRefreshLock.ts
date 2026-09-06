/**
 * Verrou anti-course sur le rafraîchissement de session Supabase.
 *
 * Le refresh token Supabase est à usage unique (rotation) : dès que
 * l'access token expire, la moindre requête authentifiée en déclenche un
 * nouveau. Cette app appelle `supabase.auth.getUser()` à de nombreux
 * endroits indépendants (middleware, chaque route API, chaque Server
 * Component) — sur une même page, plusieurs de ces appels partent en
 * parallèle (ex. le poll média toutes les 5-20 s + une navigation).
 *
 * Si deux requêtes concurrentes présentent exactement le même refresh
 * token au même instant, GoTrue n'en honore qu'une : l'autre reçoit un
 * jeton déjà consommé et la session meurt pour de bon (401 permanents,
 * malgré un compte parfaitement valide, jusqu'à reconnexion manuelle).
 * C'est la cause du bug « le lien ne se crée pas alors que je suis
 * connecté » constaté le 6 septembre 2026 (voir docs/PROJECT_STATUS.md).
 *
 * `withAuthRefreshLock` fait fusionner les appels concurrents qui portent
 * la même signature de cookies de session en une seule promesse partagée,
 * au sein d'un même process. Ça ne couvre pas plusieurs instances
 * serverless distinctes, mais élimine la course dans le cas courant
 * (dev server, instance chaude) sans changer le comportement si les
 * cookies diffèrent (clé différente = pas de fusion).
 */

const inflightBySignature = new Map<string, Promise<unknown>>();

export function withAuthRefreshLock<T>(
  signature: string | null,
  run: () => Promise<T>,
): Promise<T> {
  if (!signature) return run();

  const existing = inflightBySignature.get(signature);
  if (existing) return existing as Promise<T>;

  const promise = run().finally(() => {
    if (inflightBySignature.get(signature) === promise) {
      inflightBySignature.delete(signature);
    }
  });
  inflightBySignature.set(signature, promise);
  return promise;
}

/**
 * Signature stable des cookies Supabase (`sb-*`) présents sur la requête.
 * Deux requêtes avec exactement les mêmes cookies partagent le même
 * refresh token — donc le même risque de course — et peuvent fusionner
 * leur appel `getUser()`.
 */
export function supabaseAuthCookieSignature(
  cookies: { name: string; value: string }[],
): string | null {
  const relevant = cookies
    .filter((cookie) => cookie.name.startsWith("sb-"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`);

  return relevant.length > 0 ? relevant.join("&") : null;
}
