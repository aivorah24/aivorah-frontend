import { StyleSheet } from 'react-native';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';

export function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 1100, alignSelf: 'center' },

    tabs: {
      flexDirection: 'row', alignSelf: 'flex-start', gap: 4, padding: 4, marginBottom: 18,
      borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm - 2 },
    tabActive: { backgroundColor: colors.accentYellow + '1A' },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.textDim },
    tabTextActive: { color: colors.accentYellow, fontWeight: '800' },
  });
}
