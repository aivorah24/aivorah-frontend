// jsPDF's built-in fonts only cover Windows-1252 and it cannot shape Hindi, so any line with other characters
// is drawn by the browser on a canvas (correct shaping, system fonts) and placed in the PDF as an image.
const WIN_1252_EXTRAS = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const PX_PER_MM = 12;
const PT_TO_MM = 25.4 / 72;
const ASCENT = 1.2; // em above the baseline (room for Hindi matras)
const HEIGHT = 1.75; // em, including descenders
const PAD_PX = 2;

type CanvasFactory = () => HTMLCanvasElement;

export function needsUnicode(text: string): boolean {
  return [...text].some((ch) => !/[\n\x20-\x7E\u00A0-\u00FF]/.test(ch) && !WIN_1252_EXTRAS.includes(ch));
}

export function enableUnicodeText(doc: any, createCanvas: CanvasFactory = () => document.createElement('canvas')) {
  const jsText = doc.text.bind(doc);
  const jsWidth = doc.getTextWidth.bind(doc);
  const jsSplit = doc.splitTextToSize.bind(doc);
  const measureCtx = createCanvas().getContext('2d') as CanvasRenderingContext2D;

  const sizePx = () => doc.getFontSize() * PT_TO_MM * PX_PER_MM;
  const font = () => {
    const style = String(doc.getFont().fontStyle || '');
    return `${/italic/.test(style) ? 'italic ' : ''}${/bold/.test(style) ? 'bold' : 'normal'} ${sizePx()}px Helvetica, Arial, "Nirmala UI", "Noto Sans Devanagari", Mangal, sans-serif`;
  };
  const widthMm = (text: string) => {
    measureCtx.font = font();
    return measureCtx.measureText(text).width / PX_PER_MM;
  };

  doc.getTextWidth = (text: string) => (needsUnicode(text) ? widthMm(text) : jsWidth(text));

  doc.splitTextToSize = (text: string, maxWidth: number, opts?: any) => {
    if (!needsUnicode(text)) return jsSplit(text, maxWidth, opts);
    const lines: string[] = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && widthMm(next) > maxWidth) { lines.push(line); line = word; } else line = next;
      }
      lines.push(line);
    }
    return lines;
  };

  doc.text = (text: string, x: number, y: number, opts?: any) => {
    if (typeof text !== 'string' || !needsUnicode(text)) return jsText(text, x, y, opts);
    const px = sizePx();
    const w = widthMm(text);
    const canvas = createCanvas();
    canvas.width = Math.ceil(w * PX_PER_MM) + PAD_PX * 2;
    canvas.height = Math.ceil(px * HEIGHT);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.font = font();
    ctx.fillStyle = doc.getTextColor();
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, PAD_PX, px * ASCENT);
    const left = opts?.align === 'right' ? x - w : opts?.align === 'center' ? x - w / 2 : x;
    const sizeMm = px / PX_PER_MM;
    doc.addImage(canvas, 'PNG', left - PAD_PX / PX_PER_MM, y - sizeMm * ASCENT, canvas.width / PX_PER_MM, canvas.height / PX_PER_MM);
    return doc;
  };
}
