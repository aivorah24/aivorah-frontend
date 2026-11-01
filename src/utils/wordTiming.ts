// Split text into words, preserving trailing spaces so joined text is identical
export function splitWords(text: string): string[] {
  return text.match(/\S+\s*/g) || [text];
}

// Group flat tokens into paragraphs while keeping each word's GLOBAL index (gi),
// so word-by-word highlighting (which uses the flat wordIndex) is unaffected.
export function buildParagraphs(text: string): { token: string; gi: number }[][] {
  const groups: { token: string; gi: number }[][] = [];
  let cur: { token: string; gi: number }[] = [];
  splitWords(text).forEach((tok, i) => {
    cur.push({ token: tok, gi: i });
    if (/\n[ \t]*\n/.test(tok)) { groups.push(cur); cur = []; }
  });
  if (cur.length) groups.push(cur);
  return groups;
}

// Common short function words that TTS speaks faster than syllable count suggests
const FUNCTION_WORDS = new Set([
  'a','an','the','of','in','on','at','to','is','was','he','she','it','we',
  'and','but','or','not','no','do','so','be','by','up','as','if','my','me',
  'us','his','her','its','our','had','has','for','are','were','did','can',
  'may','all','one','two','any','out','with','than','that','this','from',
  'into','onto','upon','over','just','even','much','very','also','then',
  'when','what','who','how','why','where','which','they','them','their',
  'would','could','should','have','been','will','more','most','some','such',
  'each','many','only','other','these','those','both','after','about',
  'there','here','now','still','too','yet','ever','once','back','well',
  'got','get','let','put','came','come','went','go','him','did','its',
]);

// Hindi syllables are spoken faster than English ones (calibrated on Chrome's "Google हिन्दी" voice).
const HINDI_SYLLABLE = 0.8;

// Devanagari: each vowel/consonant letter not silenced by a virama is ~one syllable; a bare final consonant is not voiced.
function hindiSyllables(word: string): number {
  const n = (word.match(/[\u0904-\u0939\u0958-\u0961]\u093C?(?!\u094D)/g) || []).length;
  return n > 1 && /[\u0915-\u0939\u0958-\u095F]\u093C?$/.test(word) ? n - 1 : n;
}

// Estimate spoken duration weight for a token (word + trailing spaces/punctuation).
// Returns a float: 1.0 ≈ average content word, lower = shorter, higher = longer + pause.
export function wordWeight(token: string): number {
  const hindi = token.replace(/[^\u0900-\u0963]/g, '');
  let syllables: number;
  if (/^[\u0964\u0965\s]+$/.test(token)) {
    syllables = 0; // a danda on its own is a pause, not a word
  } else if (hindi) {
    syllables = hindiSyllables(hindi) * HINDI_SYLLABLE || 1;
  } else {
    const clean = token.toLowerCase().replace(/[^a-z]/g, '');
    // Count vowel groups as syllable estimate, with silent-e correction
    const vowelGroups = clean.match(/[aeiou]+/g);
    const raw = vowelGroups ? vowelGroups.length : 1;
    const silentE = clean.length > 2 && clean.endsWith('e') && !/[aeiou]/.test(clean[clean.length - 2]) ? 1 : 0;
    syllables = Math.max(1, raw - silentE);
    // Function words are spoken ~30% faster (but never below 0.4 units)
    if (FUNCTION_WORDS.has(clean)) syllables = Math.max(0.4, syllables * 0.7);
  }
  // Punctuation pauses: sentence-end (incl. Hindi ।/॥, Urdu ۔) adds ~1.5 units, comma/dash adds ~0.5
  if (/[.!?\u0964\u0965\u06D4]/.test(token)) syllables += 1.5;
  else if (/[,;:—–]/.test(token)) syllables += 0.5;
  return syllables;
}

// Build time-proportion boundaries using the spoken-duration weight model.
// Much more accurate than raw character count for TTS highlight sync.
export function buildBoundaries(tokens: string[]): number[] {
  const weights = tokens.map(t => wordWeight(t));
  const total   = weights.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  return weights.map(w => { cum += w; return cum / total; });
}
