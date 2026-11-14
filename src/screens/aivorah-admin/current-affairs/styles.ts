import { StyleSheet } from 'react-native';
import { radius } from '../../../theme';
import type { AppColors } from '../../../theme';

// Same card / segment / table look as the other admin pages (llm-usage/styles.ts).
export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgDark },
    content: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 72, width: '100%', maxWidth: 1320, alignSelf: 'center', gap: 14 },

    toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    toolbarText: { fontSize: 12.5, color: c.textDim, marginRight: 'auto' as any },
    segment: { flexDirection: 'row', flexWrap: 'wrap', padding: 3, borderRadius: 12, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark },
    segBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
    segBtnOn: { backgroundColor: c.textMain },
    segText: { fontSize: 12, fontWeight: '700', color: c.textMuted },
    segTextOn: { color: c.bgDark },

    card: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: 20, padding: 20 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: c.textMain },
    cardSub: { fontSize: 12.5, color: c.textDim, marginTop: 3 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },

    listRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borderColor, gap: 4 },
    listRowOn: { backgroundColor: c.bgDark, borderRadius: 12, paddingHorizontal: 10 },
    listTitle: { fontSize: 14, fontWeight: '800', color: c.textMain },
    listMeta: { fontSize: 12, color: c.textDim },
    notes: { fontSize: 12, color: c.accentYellow, lineHeight: 18 },

    chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: c.borderColor, fontSize: 11, fontWeight: '700', color: c.textMuted, overflow: 'hidden' },

    label: { fontSize: 12, fontWeight: '700', color: c.textMuted, marginTop: 10, marginBottom: 4 },
    input: {
      borderWidth: 1, borderColor: c.borderColor, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
      fontSize: 13.5, color: c.textMain, backgroundColor: c.bgDark,
    },
    inputMulti: { minHeight: 76, textAlignVertical: 'top' },
    ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    ageCol: { flexGrow: 1, flexBasis: 280, minWidth: 240 },
    ageHead: { fontSize: 13, fontWeight: '800', color: c.accentYellow, marginTop: 6 },

    btn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: c.borderColor },
    btnText: { fontSize: 12.5, fontWeight: '700', color: c.textMain },
    btnPrimary: { backgroundColor: c.primary || c.accentGreen, borderColor: c.primary || c.accentGreen },
    btnPrimaryText: { color: '#fff' },
    btnDanger: { borderColor: c.accentRed },
    btnDangerText: { color: c.accentRed },

    option: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: c.primary || c.accentGreen, backgroundColor: c.primary || c.accentGreen },

    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    kpiCard: { flexGrow: 1, flexBasis: 230, minWidth: 220, borderWidth: 1, borderColor: c.borderColor, borderRadius: 20, padding: 18, backgroundColor: c.cardDark },
    kpiLabel: { fontSize: 13, color: c.textMuted },
    kpiValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: c.textMain, marginTop: 6 },
    kpiHint: { fontSize: 12, color: c.textDim, marginTop: 6, lineHeight: 17 },

    thRow: { flexDirection: 'row', gap: 8, marginTop: 14, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.bgDark },
    th: { flex: 1, fontSize: 12, fontWeight: '600', color: c.textMuted },
    tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.borderColor },
    td: { flex: 1, fontSize: 13, color: c.textMain },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 420 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor },
    retryText: { fontSize: 12.5, fontWeight: '700', color: c.accentYellow },
    message: { fontSize: 12.5, color: c.textMuted },
    error: { fontSize: 12.5, color: c.accentRed },
  });
}

export type CaStyles = ReturnType<typeof makeStyles>;
