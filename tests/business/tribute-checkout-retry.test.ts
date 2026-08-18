import { describe, expect, it } from "vitest";

import { isUniqueViolation } from "@/src/lib/checkout/resolveTributeCheckout";

describe("tribute_checkouts idempotency retry", () => {
  it("détecte la contrainte unique Postgres 23505", () => {
    expect(
      isUniqueViolation({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "idx_tribute_checkouts_idempotency_key"',
      }),
    ).toBe(true);
  });

  it("détecte le message même sans code", () => {
    expect(
      isUniqueViolation({
        message:
          'duplicate key value violates unique constraint "idx_tribute_checkouts_idempotency_key"',
      }),
    ).toBe(true);
  });
});
