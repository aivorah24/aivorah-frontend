// Swaps look-alike characters (e.g. the AI's non-breaking hyphen U+2011) for ones jsPDF's Helvetica can draw,
// so an English line stays real PDF text. Anything else (Hindi etc.) is drawn by pdfUnicodeText.
export function pdfSafeText(text: string): string {
  return text
    .replace(/[\u2010-\u2012\u2212]/g, '-')
    .replace(/[\t\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\r\u200B\uFEFF]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function pdfSafeDeep<T>(value: T): T {
  if (typeof value === 'string') return pdfSafeText(value) as T;
  if (Array.isArray(value)) return value.map(pdfSafeDeep) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, pdfSafeDeep(v)])) as T;
  }
  return value;
}
