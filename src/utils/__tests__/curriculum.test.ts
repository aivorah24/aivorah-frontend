import {
  normalizeCurriculum, isCbseCurriculum, monolithContentCurriculum, normalizeUserCurricula, NCERT_CONTENT_KEY, isSyllabusOnlyCurriculum,
} from '../curriculum';

describe('normalizeCurriculum', () => {
  test.each(['NCERT', 'ncert', ' Ncert ', 'N CERT', 'CBSE', 'cbse', ' Cbse '])('%p -> CBSE', (v) => {
    expect(normalizeCurriculum(v)).toBe('CBSE');
    expect(isCbseCurriculum(v)).toBe(true);
  });

  test('other curricula are only trimmed', () => {
    expect(normalizeCurriculum(' IB PYP ')).toBe('IB PYP');
    expect(normalizeCurriculum('NCERT Books')).toBe('NCERT Books');
    expect(isCbseCurriculum('Cambridge')).toBe(false);
  });

  test('empty values pass through', () => {
    expect(normalizeCurriculum(undefined)).toBeUndefined();
    expect(normalizeCurriculum(null)).toBeUndefined();
    expect(isCbseCurriculum('')).toBe(false);
  });
});

describe('monolithContentCurriculum (the one CBSE -> NCERT content mapping)', () => {
  test('a CBSE student requests exactly what a legacy NCERT student did', () => {
    expect(monolithContentCurriculum('CBSE')).toBe(NCERT_CONTENT_KEY);
    expect(monolithContentCurriculum('NCERT')).toBe(NCERT_CONTENT_KEY);
    expect(monolithContentCurriculum('CBSE')).toBe(monolithContentCurriculum('NCERT'));
  });

  test('unset keeps the old default; other curricula pass through', () => {
    expect(monolithContentCurriculum(undefined)).toBe('NCERT');
    expect(monolithContentCurriculum('Cambridge')).toBe('Cambridge');
  });
});

describe('normalizeUserCurricula', () => {
  test('rewrites the user, children[] and teaches[] curricula', () => {
    const out = normalizeUserCurricula({
      curriculum: 'NCERT',
      children: [{ name: 'A', curriculum: 'ncert' }, { name: 'B' }],
      teaches: [{ grade: 'Grade 8', curriculum: 'NCERT' }, { grade: 'Grade 3', curriculum: 'IB PYP' }],
    });
    expect(out).toEqual({
      curriculum: 'CBSE',
      children: [{ name: 'A', curriculum: 'CBSE' }, { name: 'B' }],
      teaches: [{ grade: 'Grade 8', curriculum: 'CBSE' }, { grade: 'Grade 3', curriculum: 'IB PYP' }],
    });
  });

  test('returns the same object when nothing changes (stable React state)', () => {
    const user = { curriculum: 'CBSE', teaches: [{ curriculum: 'IB PYP' }] };
    expect(normalizeUserCurricula(user)).toBe(user);
    expect(normalizeUserCurricula(null)).toBeNull();
  });
});

describe('isSyllabusOnlyCurriculum', () => {
  test('ICSE and Cambridge (any case/spacing) have no textbook yet', () => {
    expect(isSyllabusOnlyCurriculum('ICSE')).toBe(true);
    expect(isSyllabusOnlyCurriculum(' cambridge ')).toBe(true);
  });
  test('every other curriculum keeps its textbook flow', () => {
    ['CBSE', 'NCERT', 'IB PYP', 'IB DP', '', null, undefined].forEach((c) => expect(isSyllabusOnlyCurriculum(c as any)).toBe(false));
  });
});
