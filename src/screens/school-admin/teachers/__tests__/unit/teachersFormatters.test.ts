import { statusTint, gradeSummary, STATUS_LABEL } from '../../utils/teachersFormatters';

const colors = { accentGreen: '#0f0', accentYellow: '#ff0', textDim: '#888' } as any;

describe('statusTint', () => {
  test('active is green', () => { expect(statusTint(colors, 'active')).toBe('#0f0'); });
  test('invited is yellow', () => { expect(statusTint(colors, 'invited')).toBe('#ff0'); });
  test('inactive/archived fall back to dim', () => {
    expect(statusTint(colors, 'inactive')).toBe('#888');
    expect(statusTint(colors, 'archived')).toBe('#888');
  });
});

describe('STATUS_LABEL', () => {
  test('covers all four statuses', () => {
    expect(STATUS_LABEL).toEqual({ invited: 'Invited', active: 'Active', inactive: 'Inactive', archived: 'Archived' });
  });
});

describe('gradeSummary', () => {
  test('joins multiple teaches entries by curriculum · grade', () => {
    const t = { teaches: [{ curriculum: 'IB PYP', grade: 'Grade 3', subjects: [] }, { curriculum: 'IB PYP', grade: 'Grade 4', subjects: [] }], curriculum: null, grade: null };
    expect(gradeSummary(t)).toBe('IB PYP · Grade 3, IB PYP · Grade 4');
  });

  test('falls back to curriculum/grade fields when teaches is empty', () => {
    expect(gradeSummary({ teaches: [], curriculum: 'CBSE', grade: 'Grade 5' })).toBe('CBSE · Grade 5');
  });

  test('falls back to an em dash when nothing is set', () => {
    expect(gradeSummary({ teaches: [], curriculum: null, grade: null })).toBe('—');
  });
});
