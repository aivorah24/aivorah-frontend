import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { HelpTopic } from '../types';
import { ARTICLE_CONTENT } from '../constants';

interface TopicModalProps {
  topic: HelpTopic | null;
  activeArticle: string | null;
  onSelectArticle: (article: string | null) => void;
  onClose: () => void;
  onGoToTopic: (topic: HelpTopic) => void;
  colors: AppColors;
}

export default function TopicModal({ topic, activeArticle, onSelectArticle, onClose, onGoToTopic, colors }: TopicModalProps) {
  const styles = makeStyles(colors);

  return (
    <Modal visible={!!topic} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View testID="topic-modal" style={[styles.modalBox, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
          {topic && (
            <>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={[styles.modalTopicIcon, { backgroundColor: topic.color + '18' }]}>
                    <Feather name={topic.icon} size={20} color={topic.color} />
                  </View>
                  <Text style={[styles.modalTitle, { color: colors.textMain }]}>{topic.label}</Text>
                </View>
                <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close topic details">
                  <Feather name="x" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{topic.desc}</Text>
              <Text style={[styles.modalArticlesLabel, { color: colors.textDim }]}>Articles in this topic</Text>
              {topic.articles.length === 0 && (
                <Text style={styles.emptyText}>No articles for this topic yet.</Text>
              )}
              {topic.articles.map((article, i) => (
                <View key={i}>
                  <TouchableOpacity
                    style={[styles.articleRow, { borderBottomColor: colors.borderColor }, activeArticle === article && { backgroundColor: topic.color + '12', borderRadius: 10 }]}
                    onPress={() => onSelectArticle(activeArticle === article ? null : article)}
                    activeOpacity={0.7}
                  >
                    <Feather name={activeArticle === article ? 'book-open' : 'file-text'} size={14} color={activeArticle === article ? topic.color : colors.textDim} />
                    <Text style={[styles.articleText, { color: colors.textMain }, activeArticle === article && { color: topic.color, fontWeight: '700' }]}>{article}</Text>
                    <Feather name={activeArticle === article ? 'chevron-down' : 'chevron-right'} size={14} color={activeArticle === article ? topic.color : colors.textDim} />
                  </TouchableOpacity>
                  {activeArticle === article && ARTICLE_CONTENT[article] && (
                    <View style={[styles.articleContent, { borderLeftColor: topic.color, backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                      <Text style={[styles.articleContentText, { color: colors.textMain }]}>{ARTICLE_CONTENT[article]}</Text>
                    </View>
                  )}
                </View>
              ))}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.borderColor }]} onPress={onClose}>
                  <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: topic.color }]} onPress={() => onGoToTopic(topic)}>
                  <Text style={styles.modalSaveText}>Go to {topic.label}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 480 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTopicIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, marginBottom: spacing.xl },
  modalArticlesLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md, marginTop: spacing.md },
  emptyText: { fontSize: 13, color: c.textDim, fontStyle: 'italic', paddingBottom: spacing.md },
  articleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 11, borderBottomWidth: 1 },
  articleText: { flex: 1, fontSize: 13 },
  articleContent: { marginHorizontal: 4, marginBottom: 6, marginTop: 2, paddingHorizontal: 14, paddingVertical: 10, borderLeftWidth: 3, borderRadius: 6 },
  articleContentText: { fontSize: 13, lineHeight: 21 },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalSaveBtn: { flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: 'white' },
});
