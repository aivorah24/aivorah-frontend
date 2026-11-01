import { enableUnicodeText, needsUnicode } from '../../utils/pdfUnicodeText';

// Fake canvas: every character is 10px wide, so widths are easy to reason about.
function fakeCanvasFactory() {
  const drawn: { text: string; font: string; fill: string }[] = [];
  const make = () => {
    const ctx: any = {
      font: '',
      fillStyle: '',
      textBaseline: '',
      measureText: (t: string) => ({ width: t.length * 10 }),
      fillText: (t: string) => drawn.push({ text: t, font: ctx.font, fill: ctx.fillStyle }),
    };
    return { width: 0, height: 0, getContext: () => ctx } as any;
  };
  return { make, drawn };
}

function fakeDoc(): any {
  return {
    text: jest.fn(),
    getTextWidth: jest.fn(() => 99),
    splitTextToSize: jest.fn(() => ['latin-split']),
    addImage: jest.fn(),
    getFontSize: () => 10,
    getFont: () => ({ fontName: 'helvetica', fontStyle: 'bold' }),
    getTextColor: () => '#161a22',
  };
}

const HINDI = 'जयशंकर प्रसाद: जीवन और साहित्य';

describe('needsUnicode', () => {
  test('Latin text the PDF font can draw does not', () => {
    expect(needsUnicode('Sai is doing well — 80% “great”')).toBe(false);
  });
  test('Hindi does', () => {
    expect(needsUnicode(`solid performance in ${HINDI} (80%)`)).toBe(true);
  });
});

describe('enableUnicodeText — Hindi drawn by the browser, English left to jsPDF', () => {
  test('English text goes to jsPDF unchanged', () => {
    const doc = fakeDoc();
    const original = doc.text;
    const { make, drawn } = fakeCanvasFactory();
    enableUnicodeText(doc as any, make);

    doc.text('Learning Pattern', 20, 30, { align: 'center' });

    expect(original).toHaveBeenCalledWith('Learning Pattern', 20, 30, { align: 'center' });
    expect(doc.addImage).not.toHaveBeenCalled();
    expect(drawn).toHaveLength(0);
  });

  test('a Hindi topic name is drawn (not dropped) in the current font, size and colour', () => {
    const doc = fakeDoc();
    const original = doc.text;
    const { make, drawn } = fakeCanvasFactory();
    enableUnicodeText(doc as any, make);

    doc.text(HINDI, 20, 30);

    expect(original).not.toHaveBeenCalled();
    expect(drawn.map((d) => d.text)).toEqual([HINDI]);
    expect(drawn[0].font).toMatch(/bold/);
    expect(drawn[0].fill).toBe('#161a22');
    expect(doc.addImage).toHaveBeenCalledTimes(1);
    const [, format, x, top, w, h] = doc.addImage.mock.calls[0];
    expect(format).toBe('PNG');
    expect(x).toBeLessThanOrEqual(20);
    expect(top).toBeLessThan(30); // sits above the baseline like normal text
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
  });

  test('right / centre alignment is kept for Hindi', () => {
    const doc = fakeDoc();
    const { make } = fakeCanvasFactory();
    enableUnicodeText(doc as any, make);
    const width = doc.getTextWidth(HINDI);

    doc.text(HINDI, 100, 30, { align: 'right' });
    doc.text(HINDI, 100, 40, { align: 'center' });

    const leftRight = doc.addImage.mock.calls[0][2];
    const leftCentre = doc.addImage.mock.calls[1][2];
    expect(leftRight).toBeCloseTo(100 - width, 0);
    expect(leftCentre).toBeCloseTo(100 - width / 2, 0);
  });

  test('width and wrapping of Hindi use the browser measurement; English keeps jsPDF', () => {
    const doc = fakeDoc();
    const { make } = fakeCanvasFactory();
    enableUnicodeText(doc as any, make);

    expect(doc.getTextWidth('Plain English')).toBe(99);
    expect(doc.splitTextToSize('Plain English', 50)).toEqual(['latin-split']);

    const hindiWidth = doc.getTextWidth(HINDI);
    expect(hindiWidth).not.toBe(99);
    const long = `${HINDI} ${HINDI} ${HINDI}`;
    const lines: string[] = doc.splitTextToSize(long, hindiWidth * 1.5);
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((l) => expect(doc.getTextWidth(l)).toBeLessThanOrEqual(hindiWidth * 1.5));
    expect(lines.join(' ')).toBe(long); // no words lost
  });
});
