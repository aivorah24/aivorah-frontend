export function splitWords(text: string): string[] {
  return (text || '').split(/[-—–\s]+/).filter(Boolean);
}

export function normalize(w: string): string {
  return (w || '').toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');
}

export function getStem(w: string): string {
  if (!w) return '';
  let s = w.replace(/our($|s|ed|ing)/, 'or$1')
    .replace(/ise($|s|d|ing)/, 'ize$1')
    .replace(/tre($|s)/, 'ter$1')
    .replace(/isation($|s)/, 'ization$1')
    .replace(/aeroplane/, 'airplane')
    .replace(/grey/, 'gray');
  s = s.replace(/ied$/, 'y')
    .replace(/ies$/, 'y')
    .replace(/(.)\1(ed|ing)$/, '$1');
  if (w.length > 4 && !/(?:thing|ning|ling|ring|king|wing|spring|bring)$/.test(w)) {
    s = s.replace(/(?:es|s|ed|ing)$/, '');
  } else if (w.length > 3) {
    s = s.replace(/(?:es|s)$/, '');
  }
  return s;
}

const EQUIV_MAP: Record<string, string[]> = {
  mr: ['mister'], mrs: ['missus', 'missis'], dr: ['doctor'], st: ['street', 'saint'],
  vs: ['versus'], etc: ['etcetera'], and: ['&'],
  hear: ['here'], here: ['hear'],
  there: ['their', 'theyre'], their: ['there', 'theyre'], theyre: ['there', 'their'],
  to: ['too', 'two'], too: ['to', 'two'], two: ['to', 'too'],
  for: ['four'], four: ['for'],
  no: ['know'], know: ['no'],
  right: ['write'], write: ['right'],
  by: ['buy'], buy: ['by'],
  one: ['won'], won: ['one'],
  cant: ['cannot'], cannot: ['cant'],
  dont: ['do not'], wont: ['will not'],
  '10': ['ten'], '100': ['hundred', 'one hundred'], '1000': ['thousand', 'one thousand'],
  '1st': ['first'], '2nd': ['second'], '3rd': ['third'], '4th': ['fourth'], '5th': ['fifth'],
};

export function isEquivalent(spoken: string, expected: string): boolean {
  if (!spoken || !expected) return false;
  if (spoken === expected) return true;
  return !!(EQUIV_MAP[expected]?.includes(spoken) || EQUIV_MAP[spoken]?.includes(expected));
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}

export function fuzzyMatch(spoken: string, expected: string): boolean {
  if (!spoken || !expected) return false;
  if (spoken === expected) return true;
  if (isEquivalent(spoken, expected)) return true;

  // Live reading must not accept a wrong tense/plural ("work" for "worked").
  const stripSuffix = (w: string) => (w.length > 3 ? w.replace(/(?:es|s|ed|ing)$/, '') : w);
  if (stripSuffix(spoken) === stripSuffix(expected)) return false;

  const sStem = getStem(spoken);
  const eStem = getStem(expected);
  if (sStem.length >= 3 && sStem === eStem) return true;
  if (expected.length <= 5) return false;
  if (Math.abs(spoken.length - expected.length) > 2) return false;
  if (spoken.slice(0, 3) !== expected.slice(0, 3) && sStem.slice(0, 3) !== eStem.slice(0, 3)) return false;

  const maxDist = expected.length >= 10 ? 2 : 1;
  return levenshtein(spoken, expected) <= maxDist || (sStem.length >= 5 && levenshtein(sStem, eStem) <= maxDist);
}

export const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'is', 'was', 'he', 'she', 'it', 'we',
  'and', 'but', 'or', 'not', 'no', 'do', 'so', 'be', 'by', 'up', 'as', 'if', 'my', 'me',
  'us', 'his', 'her', 'its', 'our', 'had', 'has', 'for', 'are', 'were', 'did', 'can',
  'may', 'all', 'one', 'two', 'any', 'out', 'with', 'than', 'that', 'this', 'from',
]);

// Lower-cased, letters-only words from a recognizer transcript.
export function spokenWordsOf(transcript: string): string[] {
  return transcript.toLowerCase().replace(/[^a-z'\s]/g, '').trim().split(/\s+/).filter(Boolean);
}
