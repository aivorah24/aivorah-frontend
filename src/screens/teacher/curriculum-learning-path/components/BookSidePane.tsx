import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import type { AppColors } from '../../../../theme';
import { bookSrc } from '../../../student/learning-paths/lesson-screen/utils/book';
import { LearningPathTopic, TeacherBookPage } from '../types';
import { getBookSections, BookSectionOption, SubtopicSectionPick } from '../services/curriculumLearningPathService';

const gradeNo = (g?: string | number) => Number(String(g ?? '').replace(/\D/g, '')) || undefined;

type Props = {
  topic: LearningPathTopic;
  pathGrade?: string;
  subject?: string;
  colors: AppColors;
  // Present only when the teacher may edit: rebuilds this topic from the picked sections.
  onRebuild?: (picks: SubtopicSectionPick[]) => Promise<void>;
};

// Right side of the teacher preview: the matched NCERT page per subtopic (teacher can change them), or the
// teacher's own outline when no book section teaches the topic.
export default function BookSidePane({ topic, pathGrade, subject, colors, onRebuild }: Props) {
  const book = topic.content?.book;
  const pages: TeacherBookPage[] = book?.pages?.length ? book.pages : [];
  const [selected, setSelected] = useState(() => Math.max(0, pages.findIndex((p) => p.pdfFile)));
  const [picking, setPicking] = useState(false);

  if (picking && onRebuild) {
    return (
      <SectionPicker
        topic={topic} pages={pages} pathGrade={pathGrade} subject={subject} colors={colors}
        onCancel={() => setPicking(false)}
        onRebuild={async (picks) => { await onRebuild(picks); setPicking(false); setSelected(0); }}
      />
    );
  }

  const changeButton = onRebuild && pathGrade && subject ? (
    <TouchableOpacity testID="change-book-pages" onPress={() => setPicking(true)} activeOpacity={0.7}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{book ? 'Change pages' : 'Choose book pages'}</Text>
    </TouchableOpacity>
  ) : null;

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
        {changeButton}
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.textMuted }} numberOfLines={2}>
          {shown.bookTitle || 'Textbook'} · {shown.chapterTitle} · p.{shown.pdfPage}
        </Text>
        {changeButton}
      </View>
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
                {p.subtopic}{p.pdfFile ? ` · p.${p.pdfPage}` : ' · not in book, taught by AI · check'}
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

function SectionPicker({ topic, pages, pathGrade, subject, colors, onCancel, onRebuild }: {
  topic: LearningPathTopic; pages: TeacherBookPage[]; pathGrade?: string; subject?: string; colors: AppColors;
  onCancel: () => void; onRebuild: (picks: SubtopicSectionPick[]) => Promise<void>;
}) {
  const [sections, setSections] = useState<BookSectionOption[] | null>(null);
  const [picks, setPicks] = useState<SubtopicSectionPick[]>(() => topic.subtopics.map((s) => {
    const p = pages.find((x) => x.subtopic === s.title);
    return p?.pdfFile && p.section ? { pdfFile: p.pdfFile, title: p.section } : null;
  }));
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    getBookSections(pathGrade || '', subject || '')
      .then(({ sections: list }) => setSections(list))
      .catch((e) => setError(e.message || 'Could not load the book sections.'));
  }, [pathGrade, subject]);

  const choose = (pick: SubtopicSectionPick) => setPicks((prev) => prev.map((p, i) => (i === active ? pick : p)));
  const isPicked = (s: BookSectionOption) => picks[active]?.pdfFile === s.pdfFile && picks[active]?.title === s.title;
  const rebuild = async () => {
    setBusy(true);
    setError('');
    try {
      await onRebuild(picks);
    } catch (e: any) {
      setError(e.message || 'Could not rebuild this topic.');
      setBusy(false);
    }
  };
  const row = (selectedRow: boolean) => ({ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: selectedRow ? colors.primary + '20' : 'transparent' });

  return (
    <View testID="book-section-picker" style={{ flex: 0.7, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 10, gap: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>PICK THE BOOK SECTION FOR EACH SUBTOPIC</Text>
      {topic.subtopics.map((s, i) => (
        <TouchableOpacity key={i} testID={`picker-subtopic-${i}`} onPress={() => setActive(i)} activeOpacity={0.7} style={row(i === active)}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.textMain }}>{s.title}</Text>
          <Text style={{ fontSize: 11.5, color: colors.textMuted }}>{picks[i] ? picks[i]!.title : 'Not in book — AI will teach it'}</Text>
        </TouchableOpacity>
      ))}
      <View style={{ height: 1, backgroundColor: colors.borderColor }} />
      {!sections && !error && <ActivityIndicator color={colors.primary} />}
      {!!sections && (
        <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
          <TouchableOpacity testID="picker-option-none" onPress={() => choose(null)} style={row(!picks[active])}>
            <Text style={{ fontSize: 12, color: colors.textMain }}>Not in book — AI will teach it</Text>
          </TouchableOpacity>
          {sections.map((s, k) => (
            <TouchableOpacity key={k} testID={`picker-option-${k}`} onPress={() => choose({ pdfFile: s.pdfFile, title: s.title })} style={row(isPicked(s))}>
              <Text style={{ fontSize: 12, color: colors.textMain }}>{s.title} · p.{s.page}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Grade {s.grade} · {s.chapterTitle || s.pdfFile}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {!!error && <Text testID="picker-error" style={{ fontSize: 12, color: colors.accentRed }}>{error}</Text>}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' }}>
        {busy && <Text style={{ fontSize: 11.5, color: colors.textMuted }}>Rebuilding… this can take a minute or two</Text>}
        <TouchableOpacity testID="picker-cancel" disabled={busy} onPress={onCancel}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="picker-rebuild" disabled={busy} onPress={rebuild}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: busy ? colors.textMuted : colors.primary }}>Rebuild topic</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
