import { darkColors, lightColors } from '../index';
import { attendanceColor, attendanceTone } from '../attendanceColors';

describe('attendanceColor', () => {
  it.each([
    ['dark', darkColors],
    ['light', lightColors],
  ])('maps statuses to Aivorah tokens (%s)', (_n, c) => {
    expect(attendanceColor(c, 'present')).toBe(c.accentGreen);
    expect(attendanceColor(c, 'absent')).toBe(c.accentRed);
    expect(attendanceColor(c, 'late')).toBe(c.accentYellow);
    expect(attendanceColor(c, null)).toBe(c.textDim);
    expect(attendanceColor(c, 'unmarked')).toBe(c.textDim);
  });

  it('derives tinted bg/border from the token', () => {
    const t = attendanceTone(darkColors, 'absent');
    expect(t.fg).toBe(darkColors.accentRed);
    expect(t.bg.startsWith(darkColors.accentRed)).toBe(true);
    expect(t.border.startsWith(darkColors.accentRed)).toBe(true);
  });
});
