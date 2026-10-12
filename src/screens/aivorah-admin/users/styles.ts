import { StyleSheet } from 'react-native';
import type { AppColors } from '../../../theme';

export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgDark },
    content: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 72, width: '100%', maxWidth: 1320, alignSelf: 'center', gap: 14 },

    toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
    searchBox: {
      flex: 1, minWidth: 240, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12,
      borderRadius: 12, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.textMain },
    outlineBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18,
      borderRadius: 12, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark,
    },
    outlineBtnText: { fontSize: 13.5, fontWeight: '700', color: c.textMain },
    goldBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18, borderRadius: 12 },
    goldBtnText: { fontSize: 13.5, fontWeight: '700' },

    notice: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11,
      borderRadius: 14, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark,
    },
    noticeText: { flex: 1, fontSize: 13, color: c.textMain },

    selBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
    selCount: { fontSize: 14, fontWeight: '800', color: c.textMain },
    selBtn: { height: 38, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: c.borderColor, justifyContent: 'center' },
    selBtnText: { fontSize: 13, fontWeight: '700', color: c.textMain },
    clearText: { fontSize: 13, fontWeight: '600', color: c.textMuted, paddingHorizontal: 6 },

    card: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: 20, padding: 24 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: c.textMain },
    cardSub: { fontSize: 12.5, color: c.textDim, marginTop: 4, marginBottom: 16 },

    table: { minWidth: 960, flexGrow: 1, borderWidth: 1, borderColor: c.borderColor, borderRadius: 14, overflow: 'hidden' },
    headRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, backgroundColor: c.bgDark },
    th: { fontSize: 13, fontWeight: '700', color: c.textMain },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 68, borderTopWidth: 1, borderTopColor: c.borderColor },
    rowAlt: { backgroundColor: c.bgDark },
    checkCell: { width: 48, paddingLeft: 16, justifyContent: 'center' },
    check: { width: 17, height: 17, borderRadius: 4, borderWidth: 1.5, borderColor: c.textDim, backgroundColor: c.cardDark, alignItems: 'center', justifyContent: 'center' },
    userCell: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, paddingRight: 8 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 12, fontWeight: '700' },
    name: { fontSize: 13.5, fontWeight: '800', color: c.textMain },
    email: { fontSize: 12, color: c.textMuted, marginTop: 1 },
    td: { fontSize: 13.5, color: c.textMain, paddingRight: 8 },
    muted: { color: c.textMuted },
    pill: { alignSelf: 'flex-start', fontSize: 11.5, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, borderWidth: 1, overflow: 'hidden' },
    actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', paddingRight: 16 },
    actBtn: { height: 34, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: c.borderColor, justifyContent: 'center' },
    actBtnText: { fontSize: 12.5, fontWeight: '700', color: c.textMain },

    emptyRow: { padding: 28, textAlign: 'center', fontSize: 13, color: c.textDim },
    emptyBox: { alignItems: 'center', gap: 12, paddingVertical: 28 },
    emptyText: { fontSize: 13, color: c.textMuted, textAlign: 'center' },
  });
}
