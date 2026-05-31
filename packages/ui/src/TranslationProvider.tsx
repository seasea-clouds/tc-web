'use client';

import { createContext, useContext } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Nested translation messages (can be flat strings or nested objects).
 *  Using `any` since these are JSON-parsed runtime values whose shape varies. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Messages = Record<string, any>;

interface TradeTranslationContext {
  messages: Messages;
  locale: string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TradeTranslationCtx = createContext<TradeTranslationContext>({
  messages: {},
  locale: 'en',
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TradeTranslationProvider({
  children,
  messages,
  locale,
}: {
  children: React.ReactNode;
  messages: Messages;
  locale: string;
}) {
  return (
    <TradeTranslationCtx.Provider value={{ messages, locale }}>
      {children}
    </TradeTranslationCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Return a translation function scoped to a namespace.
 *
 * Supports dot-separated keys for nested lookups:
 * ```ts
 * const t = useT('Navbar');
 * t('logo')                          // flat
 * t('servicesDropdown.gacc')         // nested
 * t('industriesDropdown.foodbeverage')
 * ```
 */
export function useT(namespace: string) {
  const { messages } = useContext(TradeTranslationCtx);
  return (key: string, fallback?: string): string => {
    const ns = messages[namespace];
    if (!ns) return fallback ?? key;

    // Support dot-separated paths: 'servicesDropdown.gacc'
    const parts = key.split('.');
    let value: unknown = ns;
    for (const part of parts) {
      if (typeof value !== 'object' || value === null) {
        return fallback ?? key;
      }
      value = (value as Record<string, unknown>)[part];
    }
    return (typeof value === 'string' ? value : fallback) ?? key;
  };
}

/**
 * Return the current locale string.
 */
export function useTradeLocale(): string {
  return useContext(TradeTranslationCtx).locale;
}
