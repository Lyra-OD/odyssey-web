import { vi } from "vitest";

/** next/font/google n’existe pas sous Vitest Node — stub pour imports client. */
vi.mock("next/font/google", () => {
  const stub = (variable: string, className: string) => () => ({
    className,
    variable,
    style: { fontFamily: className },
  });
  return {
    Playfair_Display: stub("--font-editorial", "font-editorial"),
    Inter: stub("--font-label", "font-label"),
    Montserrat: stub("--font-brand", "font-brand"),
  };
});
