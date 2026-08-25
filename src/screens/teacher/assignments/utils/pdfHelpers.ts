import { Platform } from 'react-native';

// @ts-ignore — pdfjs-dist v3 CommonJS import
const pdfjsLib = Platform.OS === 'web' ? require('pdfjs-dist/build/pdf') : null;
// @ts-ignore
const pdfjsWorker = Platform.OS === 'web' ? require('pdfjs-dist/build/pdf.worker.entry') : null;
if (pdfjsLib && typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  (window as any).__pdfjsLib = pdfjsLib;
}

/** Convert a PDF file (base64) into per-page JPEG images using browser canvas */
export async function pdfToImages(pdfBase64: string): Promise<{ base64: string; mime: string; name: string }[]> {
  if (Platform.OS !== 'web') return [];
  try {
    console.log('[pdfToImages] Starting, pdfjs version:', pdfjsLib.version);
    const raw = atob(pdfBase64);
    const data = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);

    const doc = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
    console.log('[pdfToImages] PDF parsed, pages:', doc.numPages);

    const pages: { base64: string; mime: string; name: string }[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { console.error('[pdfToImages] No canvas context for page', i); continue; }
      await page.render({ canvasContext: ctx, viewport }).promise;
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.85);
      pages.push({ base64: jpegUrl.split(',')[1], mime: 'image/jpeg', name: `page-${i}.jpg` });
      console.log('[pdfToImages] Rendered page', i, '/', doc.numPages);
    }
    return pages;
  } catch (err: any) {
    console.error('[pdfToImages] FAILED:', err?.message || err, err?.stack);
    return [];
  }
}

/** Combine several worksheet page IMAGES (base64) into ONE multi-page PDF, so a
 *  multi-image upload can go through the exact same all-pages PDF quiz pipeline
 *  a real PDF uses — instead of only the first image being read (the previous
 *  behaviour, which silently dropped pages 2+). Web-only (uses the DOM Image +
 *  jsPDF), which is fine since this teacher tool runs in the browser. */
export async function imagesToPdfBase64(images: { base64: string; mime: string }[]): Promise<string | null> {
  if (Platform.OS !== 'web' || images.length === 0) return null;
  try {
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    // Re-encode each page through a canvas capped at MAX_PX on its longest side,
    // as JPEG. Directly embedding the raw uploaded images (e.g. multi-MB phone
    // photos) blew past the server's 4MB PDF cap — the job then failed with
    // "File too large". ~2000px keeps 3-digit arithmetic crisply readable while
    // keeping the combined PDF small.
    const MAX_PX = 2000;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const dataUri = `data:${img.mime};base64,${img.base64}`;
      const el = await new Promise<any>((resolve, reject) => {
        const im = new (window as any).Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error('image decode failed'));
        im.src = dataUri;
      });
      const srcW = el.width || pageW;
      const srcH = el.height || pageH;
      const scale = Math.min(1, MAX_PX / Math.max(srcW, srcH));
      const cw = Math.round(srcW * scale);
      const ch = Math.round(srcH * scale);
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); // flatten any transparency
      ctx.drawImage(el, 0, 0, cw, ch);
      const jpeg = canvas.toDataURL('image/jpeg', 0.82);
      // Fit inside the A4 page, preserving aspect ratio.
      const ratio = Math.min(pageW / cw, pageH / ch);
      const w = cw * ratio;
      const h = ch * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      if (i > 0) doc.addPage();
      doc.addImage(jpeg, 'JPEG', x, y, w, h);
    }
    return (doc.output('datauristring') as string).split(',')[1] || null;
  } catch (err: any) {
    console.error('[imagesToPdfBase64] FAILED:', err?.message || err);
    return null;
  }
}
