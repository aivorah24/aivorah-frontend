// The words a first line (wrapped narrower, after a label) did not take, so the following lines can carry on from there.
export function textAfterFirstLine(text: string, firstLine: string): string {
  const taken = firstLine.split(/\s+/).filter(Boolean).length;
  return text.split(/\s+/).filter(Boolean).slice(taken).join(' ');
}
