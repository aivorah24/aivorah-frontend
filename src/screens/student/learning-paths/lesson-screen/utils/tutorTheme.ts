import type { AppColors } from '../../../../../theme';

// Board colours for the Maths AI Tutor. Dark mode: solid Aivorah gold with dark text. Light mode: the soft butter
// yellow the student dashboard uses, with dark text and a gold edge (solid deep gold looks muddy on cream).
export function boardColors(colors: AppColors) {
  const light = parseInt(colors.bgDark.slice(1, 3), 16) > 128;
  return light
    ? { bg: '#F6E6BE', text: colors.textMain, label: colors.accentYellow, border: colors.accentYellow + '66', rule: colors.accentYellow + '55' }
    : { bg: colors.accentYellow, text: colors.bgDark, label: colors.bgDark, border: colors.accentYellow, rule: colors.bgDark + '44' };
}
