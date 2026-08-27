import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface Faq { q: string; a: string; }

interface FaqListProps {
  faqs: Faq[];
  search: string;
  openFaq: number | null;
  onToggleFaq: (index: number) => void;
  colors: AppColors;
}

export default function FaqList({ faqs, search, openFaq, onToggleFaq, colors }: FaqListProps) {
  const styles = makeStyles(colors);

  return (
    <>
      {faqs.length === 0 && <Text style={styles.emptyText}>No FAQs match &quot;{search}&quot;</Text>}
      {faqs.map((faq, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.faqItem, openFaq === i && { borderColor: colors.accentYellow + '40', backgroundColor: colors.accentYellow + '06' }]}
          onPress={() => onToggleFaq(i)}
          activeOpacity={0.7}
        >
          <View style={styles.faqHeader}>
            <View style={[styles.faqNum, { backgroundColor: colors.accentYellow + '22' }]}>
              <Text style={[styles.faqNumText, { color: colors.accentYellow }]}>{String(i + 1).padStart(2, '0')}</Text>
            </View>
            <Text style={[styles.faqQ, { color: colors.textMain }]}>{faq.q}</Text>
            <Feather name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={16} color={openFaq === i ? colors.accentYellow : colors.textMuted} />
          </View>
          {openFaq === i && <Text style={[styles.faqA, { color: colors.textMuted }]}>{faq.a}</Text>}
        </TouchableOpacity>
      ))}
    </>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  emptyText: { fontSize: 14, color: c.textDim, fontStyle: 'italic', padding: spacing.lg },
  faqItem: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  faqNum: { minWidth: 28, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  faqNumText: { fontSize: 10, fontWeight: '700' },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  faqA: { fontSize: 13, lineHeight: 21, marginTop: spacing.md, paddingLeft: 36 },
});
