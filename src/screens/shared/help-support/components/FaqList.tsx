import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Faq } from '../types';

export function FaqList({
  colors, styles, search, openFaq, toggleFaq, filteredFaqs,
}: {
  colors: any; styles: any; search: string; openFaq: number | null; toggleFaq: (i: number) => void;
  filteredFaqs: Faq[];
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      {filteredFaqs.length === 0 && <Text style={styles.emptyText}>No FAQs match &quot;{search}&quot;</Text>}
      {filteredFaqs.map((faq, i) => (
        <TouchableOpacity
          key={i}
          accessibilityRole="button"
          accessibilityLabel={faq.q}
          style={[styles.faqItem, openFaq === i && styles.faqItemOpen]}
          onPress={() => toggleFaq(i)}
          activeOpacity={0.7}
        >
          <View style={styles.faqHeader}>
            <View style={styles.faqQWrap}>
              <View style={styles.faqNum}>
                <Text style={styles.faqNumText}>{String(i + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.faqQ}>{faq.q}</Text>
            </View>
            <Feather name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={16} color={openFaq === i ? colors.accentYellow : colors.textMuted} />
          </View>
          {openFaq === i && <Text style={styles.faqA}>{faq.a}</Text>}
        </TouchableOpacity>
      ))}
    </>
  );
}
