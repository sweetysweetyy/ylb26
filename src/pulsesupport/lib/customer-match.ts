// Pure matching helpers for finding a customer from spoken details.

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Last 8 digits: ignores formatting, spaces and country prefixes (+262 / +33 / 0). */
export const phoneKey = (s: string) => s.replace(/\D/g, "").slice(-8);

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

/** Tolerant word match (speech recognition often misspells names). */
export function nameMatches(word: string, fullName: string) {
  const w = norm(word);
  if (!w) return false;
  return norm(fullName).split(" ").some((part) => part === w || (w.length >= 4 && lev(part, w) <= Math.floor(w.length / 4)));
}

export type Candidate = { id: number; name: string; phones: string[] };

export function scoreCandidate(c: Candidate, q: { first_name: string; last_name: string; phone: string }) {
  const key = phoneKey(q.phone);
  const phone = key.length >= 8 && c.phones.some((p) => phoneKey(p) === key);
  const last = nameMatches(q.last_name, c.name);
  const first = nameMatches(q.first_name, c.name);
  return { phone, last, first, score: (phone ? 2 : 0) + (last ? 1 : 0) + (first ? 1 : 0) };
}

/** Phone match + one name, or both names when the phone is unknown in Odoo. */
export function pickBest(cands: Candidate[], q: { first_name: string; last_name: string; phone: string }) {
  const ranked = cands.map((c) => ({ c, ...scoreCandidate(c, q) })).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top || top.score < 2) return { match: null, ranked };
  if (ranked[1] && ranked[1].score === top.score) return { match: null, ranked };
  if (top.phone && !top.last && !top.first) return { match: null, ranked };
  return { match: top.c, ranked };
}
