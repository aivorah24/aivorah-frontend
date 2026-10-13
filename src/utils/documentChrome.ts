// Web only. #root/body must never be scroll containers: any `overflow-x: hidden`
// (e.g. the landing reset) turns overflow-y into `auto`, so content poking past
// the viewport let #root scroll and exposed a solid band below the 100%-tall
// app. `clip` (hidden as fallback) also blocks focus/programmatic scrolling;
// screens scroll inside their own ScrollViews. Background follows the theme.
const STYLE_ID = 'aivorah-document-chrome';

export function documentChromeCss(bg: string): string {
  return [
    `html, body, #root { margin: 0 !important; padding: 0 !important; height: 100% !important; overflow-x: hidden !important; overflow-y: hidden !important; overflow: clip !important; overscroll-behavior: none; background-color: ${bg} !important; }`,
    '#root { display: flex; }',
  ].join('\n');
}

export function applyDocumentChrome(bg: string, doc: Document | undefined = typeof document !== 'undefined' ? document : undefined): void {
  if (!doc?.head) return;
  let el = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = STYLE_ID;
  }
  el.textContent = documentChromeCss(bg);
  // Keep it last so it wins over styles injected later at equal specificity.
  doc.head.appendChild(el);
}
