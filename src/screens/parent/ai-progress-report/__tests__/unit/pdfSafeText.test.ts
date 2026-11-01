import { pdfSafeText, pdfSafeDeep } from '../../utils/pdfSafeText';

describe('pdfSafeText — characters the PDF font (Helvetica) cannot draw', () => {
  test('the AI\'s non-breaking hyphen becomes a normal hyphen (it spread the whole line out)', () => {
    expect(pdfSafeText('a short, low\u2011stakes quiz')).toBe('a short, low-stakes quiz');
  });

  test('other dash and space variants are normalised', () => {
    expect(pdfSafeText('2\u20103 \u2012 x\u00A0y\u202Fz\u2009w')).toBe('2-3 - x y z w');
  });

  test('characters Helvetica already has are kept as they are', () => {
    const ok = 'I’m proud — “great” work… 50% €5 café – •';
    expect(pdfSafeText(ok)).toBe(ok);
  });

  test('Hindi and other scripts are kept (they are drawn by the browser, see pdfUnicodeText)', () => {
    expect(pdfSafeText('जयशंकर प्रसाद: जीवन और साहित्य')).toBe('जयशंकर प्रसाद: जीवन और साहित्य');
  });
});

describe('pdfSafeDeep', () => {
  test('cleans every string inside the report, leaving numbers and structure alone', () => {
    const report = { name: 'Sai', score: 26, actions: ['low\u2011stakes quiz'], nested: { a: 'x\u00A0y', ok: true, none: null } };
    expect(pdfSafeDeep(report)).toEqual({ name: 'Sai', score: 26, actions: ['low-stakes quiz'], nested: { a: 'x y', ok: true, none: null } });
  });

  test('tabs, carriage returns and invisible marks do not turn an English line into an image', () => {
    expect(pdfSafeText('Week\tplan\r\nnext\u200B step\uFEFF')).toBe('Week plan\nnext step');
  });

  test('Hindi joiners (ZWJ/ZWNJ) are kept — they change how letters join', () => {
    expect(pdfSafeText('क्\u200Dष')).toBe('क्\u200Dष');
  });
});
