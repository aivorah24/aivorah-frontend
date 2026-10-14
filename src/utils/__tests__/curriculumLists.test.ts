import fs from 'fs';
import path from 'path';
import { curriculaForBase as childCurriculaForBase } from '../../screens/school-admin/parents/utils/childEntry';
import { curriculaForBase, defaultCurriculumForBase } from '../../screens/school-admin/teachers/utils/teachingEntries';

const SRC = path.join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name.startsWith('.legacy') ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

describe('curriculum dropdowns never offer NCERT', () => {
  test('every CURRICULA list in the app is NCERT-free and offers CBSE', () => {
    const lists = sourceFiles(SRC).flatMap((f) =>
      [...fs.readFileSync(f, 'utf8').matchAll(/CURRICULA\s*=\s*\[([^\]]*)\]/g)].map((m) => ({ f, body: m[1] })));
    expect(lists.length).toBeGreaterThanOrEqual(5);
    for (const { f, body } of lists) {
      expect({ f, hasNcert: /ncert/i.test(body) }).toEqual({ f, hasNcert: false });
      expect({ f, hasCbse: /'CBSE'/.test(body) }).toEqual({ f, hasCbse: true });
    }
  });

  test('a school whose stored base is legacy "NCERT" offers (and presets) only CBSE', () => {
    expect(curriculaForBase('NCERT')).toEqual(['CBSE']);
    expect(childCurriculaForBase(' ncert ')).toEqual(['CBSE']);
    expect(defaultCurriculumForBase('NCERT')).toBe('CBSE');
  });

  test('other bases unchanged', () => {
    expect(curriculaForBase('IB')).toEqual(['IB PYP', 'IB MYP', 'IB DP']);
    expect(curriculaForBase(null)).not.toContain('NCERT');
  });
});
