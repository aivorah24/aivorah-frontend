export function sanitizeDisplayedAIText(text: string): string {
  return String(text || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`{1,3}/g, '')
    .replace(/\r/g, '')
    .replace(/\s+(Step\s*\d+[\s:→–])/g, '\n$1')
    .replace(/\s+(Answer\s*:)/gi, '\n$1')
    .replace(/\s+(Try this\s*:|Now,?\s*can you|Here'?s? a practice)/gi, '\n$1')
    .replace(/\bkeyboards and mice\b/gi, 'keyboards and a mouse')
    .replace(/\bmice\b(?=.*computer|\b)/gi, 'mouse');
}
