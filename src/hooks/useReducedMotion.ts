'use client';

import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/**
 * Thin convenience wrapper around Framer Motion's `useReducedMotion`.
 *
 * Returns `true` when the user has `prefers-reduced-motion: reduce` set.
 * Use this to short-circuit or replace expressive animations with instant
 * state changes so the UI remains accessible.
 *
 * Example:
 *   const reduced = useReducedMotion();
 *   if (reduced) return <>{children}</>;
 */
export function useReducedMotion(): boolean {
  // framer-motion's hook returns `boolean | null`; normalize to boolean.
  return useFramerReducedMotion() ?? false;
}
