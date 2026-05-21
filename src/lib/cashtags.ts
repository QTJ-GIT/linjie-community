// Cashtag parser. Keep in sync with the Postgres regex in 0003_functions_triggers.sql.
// Matches $AAPL (1-5 letters) or $600519 (6 digits, A-share code).
const CASHTAG_RE = /\$([A-Za-z]{1,5}|[0-9]{6})\b/g;

export function extractCashtags(text: string): string[] {
  const found = new Set<string>();
  const matches = Array.from(text.matchAll(CASHTAG_RE));
  for (const m of matches) {
    found.add(m[1].toUpperCase());
  }
  return Array.from(found);
}

// Split a plaintext run into segments, marking cashtag matches for rendering.
export type CashtagSegment =
  | { kind: 'text'; value: string }
  | { kind: 'cashtag'; symbol: string; raw: string };

export function splitCashtags(text: string): CashtagSegment[] {
  const out: CashtagSegment[] = [];
  let last = 0;
  const matches = Array.from(text.matchAll(CASHTAG_RE));
  for (const m of matches) {
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: 'text', value: text.slice(last, start) });
    out.push({ kind: 'cashtag', symbol: m[1].toUpperCase(), raw: m[0] });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}
