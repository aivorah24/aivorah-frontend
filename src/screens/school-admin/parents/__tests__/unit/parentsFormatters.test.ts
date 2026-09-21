import { statusTint, STATUS_LABEL } from '../../utils/parentsFormatters';

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
