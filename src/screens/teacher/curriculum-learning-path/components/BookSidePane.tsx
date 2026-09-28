import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import type { AppColors } from '../../../../theme';
import { bookSrc } from '../../../student/learning-paths/lesson-screen/utils/book';
import { LearningPathTopic, TeacherBookPage } from '../types';

const gradeNo = (g?: string | number) => Number(String(g ?? '').replace(/\D/g, '')) || undefined;

// Right side of the teacher preview: the matched NCERT page per subtopic, or the teacher's own outline when
// no book section teaches the topic.
export default function BookSidePane({ topic, pathGrade, colors }: { topic: LearningPathTopic; pathGrade?: string; colors: AppColors }) {
  const book = topic.content?.book;
  const pages: TeacherBookPage[] = book?.pages?.length ? book.pages : [];
  const [selected, setSelected] = useState(() => Math.max(0, pages.findIndex((p) => p.pdfFile)));

  if (!book) {
    return (
      <View testID="preview-no-book" style={{ flex: 0.7, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, gap: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>YOUR OUTLINE</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          No NCERT section teaches this topic, so Learn was written from your outline. Please check it.
        </Text>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.textMain }}>{topic.title}</Text>
        {topic.subtopics.map((s, i) => (
          <Text key={i} style={{ fontSize: 13, color: colors.textMain }}>{'•'} {s.title}</Text>
        ))}
      </View>
    );
  }

  const current = pages[selected]?.pdfFile ? pages[selected] : null;
  const shown = {
    pdfFile: current?.pdfFile || book.pdfFile,
    bookPath: current ? current.bookPath : book.bookPath,
    pdfPage: current?.pdfPage || book.pdfPage,
    grade: current?.grade ?? book.grade,
    chapterTitle: current?.chapterTitle || book.chapterTitle,
    bookTitle: current?.bookTitle || book.bookTitle,
  };
  const otherGrade = shown.grade && gradeNo(pathGrade) && shown.grade !== gradeNo(pathGrade) ? shown.grade : null;

  return (
    <View testID="preview-book-pane" style={{ flex: 0.7, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 8, gap: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }} numberOfLines={2}>
        {shown.bookTitle || 'Textbook'} · {shown.chapterTitle} · p.{shown.pdfPage}
      </Text>
      {!!otherGrade && (
        <Text testID="preview-book-other-grade" style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>From Grade {otherGrade} book</Text>
      )}
      {pages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {pages.map((p, i) => (
            <TouchableOpacity
              key={i}
              testID={`book-page-chip-${i}`}
              disabled={!p.pdfFile}
              onPress={() => setSelected(i)}
              activeOpacity={0.7}
              style={{ borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderColor: i === selected && p.pdfFile ? colors.primary : colors.borderColor, opacity: p.pdfFile ? 1 : 0.6 }}
            >
              <Text style={{ fontSize: 11, color: p.pdfFile ? colors.textMain : colors.textMuted }}>
                {p.subtopic}{p.pdfFile ? ` · p.${p.pdfPage}` : ' · not in book'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {React.createElement('iframe', {
        key: `${shown.pdfFile}-${shown.pdfPage}`,
        src: `${bookSrc(shown, pathGrade || '', '')}#page=${shown.pdfPage}&view=FitH`,
        style: { flex: 1, minHeight: 300, border: 'none', width: '100%', backgroundColor: colors.bgDark },
        title: `${topic.title || 'topic'} — real textbook page`,
      })}
    </View>
  );
}
