"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Locale } from "@/i18n.config";

type UiLocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

const UiLocaleContext = createContext<UiLocaleContextValue | null>(null);

/**
 * Langue UI active — sync chip aide / surfaces qui switchent sans remount layout
 * (`LocaleSwitcher` + `onSwitch` + replaceState).
 */
export function UiLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);
  const value = useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale],
  );
  return (
    <UiLocaleContext.Provider value={value}>{children}</UiLocaleContext.Provider>
  );
}

export function useUiLocale(): UiLocaleContextValue {
  const ctx = useContext(UiLocaleContext);
  if (!ctx) {
    throw new Error("useUiLocale must be used within UiLocaleProvider");
  }
  return ctx;
}

/** Optionnel : null hors provider (tests / pages isolées). */
export function useUiLocaleOptional(): UiLocaleContextValue | null {
  return useContext(UiLocaleContext);
}
