import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import type { AppColors } from '../../../../theme';
import { bookSrc } from '../../../student/learning-paths/lesson-screen/utils/book';
import { LearningPathTopic, TeacherBookPage } from '../types';
import { getBookSections, BookSectionOption, SubtopicSectionPick } from '../services/curriculumLearningPathService';

const gradeNo = (g?: string | number) => Number(String(g ?? '').replace(/\D/g, '')) || undefined;
const MAX_SECTIONS_PER_SUBTOPIC = 2;

type Props = {
  topic: LearningPathTopic;
  pathGrade?: string;
  subject?: string;
  colors: AppColors;
  // Present only when the teacher may edit: rebuilds this topic from the picked sections.
  onRebuild?: (picks: SubtopicSectionPick[]) => Promise<void>;
};

// Right side of the teacher edit panel: the NCERT page each subtopic is taught from (teacher can change them), or
// the teacher's own outline when no book section teaches the topic.
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
    <TouchableOpacity
      testID="change-book-pages"
      onPress={() => setPicking(true)}
      activeOpacity={0.7}
      style={{ borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{book ? 'Change book section' : 'Choose book section'}</Text>
    </TouchableOpacity>
  ) : null;

  if (!book) {
    return (
      <View testID="preview-no-book" style={{ flex: 0.8, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, gap: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>YOUR OUTLINE</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          No book is attached to this topic, so Learn was written for you from reference material. Please check it.
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
    section: current?.section,
  };
  const otherGrade = shown.grade && gradeNo(pathGrade) && shown.grade !== gradeNo(pathGrade) ? shown.grade : null;

  return (
    <View testID="preview-book-pane" style={{ flex: 0.8, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>THE BOOK THIS TOPIC IS TAUGHT FROM</Text>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.textMain }} numberOfLines={2}>
            {shown.bookTitle || 'Textbook'} · {shown.chapterTitle}{shown.section ? ` · ${shown.section}` : ''} · p.{shown.pdfPage}
          </Text>
          {!!otherGrade && (
            <Text testID="preview-book-other-grade" style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>From Grade {otherGrade} book</Text>
          )}
        </View>
        {changeButton}
      </View>
      {pages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
          {pages.map((p, i) => (
            <TouchableOpacity
              key={i}
              testID={`book-page-chip-${i}`}
              disabled={!p.pdfFile}
              onPress={() => setSelected(i)}
              activeOpacity={0.7}
              style={{ alignSelf: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderColor: i === selected && p.pdfFile ? colors.primary : colors.borderColor, opacity: p.pdfFile ? 1 : 0.6 }}
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
        style: { flex: 1, minHeight: 520, border: 'none', width: '100%', backgroundColor: colors.bgDark },
        title: `${topic.title || 'topic'} — real textbook page`,
      })}
    </View>
  );
}

function SectionPicker({ topic, pages, pathGrade, subject, colors, onCancel, onRebuild }: {
  topic: LearningPathTopic; pages: TeacherBookPage[]; pathGrade?: string; subject?: string; colors: AppColors;
  onCancel: () => void; onRebuild: (picks: SubtopicSectionPick[]) => Promise<void>;
}) {
  const subtopics = topic.subtopics.length ? topic.subtopics.map((s) => s.title) : [topic.title || ''];
  const [sections, setSections] = useState<BookSectionOption[] | null>(null);
  const [picks, setPicks] = useState<SubtopicSectionPick[]>(() => subtopics.map((title) => {
    const p = pages.find((x) => x.subtopic === title);
    if (p?.sections?.length) return p.sections.map((s) => ({ pdfFile: s.pdfFile, title: s.title }));
    return p?.pdfFile && p.section ? [{ pdfFile: p.pdfFile, title: p.section }] : [];
  }));
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const grade = gradeNo(pathGrade);

  React.useEffect(() => {
    getBookSections(pathGrade || '', subject || '')
      .then(({ sections: list }) => setSections(list))
      .catch((e) => setError(e.message || 'Could not load the book sections.'));
  }, [pathGrade, subject]);

  // The topic's own grade first, then the others; a search narrows by section or chapter name.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sections || [])
      .filter((s) => !q || `${s.title} ${s.chapterTitle || ''}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.grade === grade) - Number(a.grade === grade) || a.grade - b.grade);
  }, [sections, query, grade]);

  const isPicked = (s: BookSectionOption) => picks[active]?.some((p) => p.pdfFile === s.pdfFile && p.title === s.title);
  const toggle = (s: BookSectionOption) => setPicks((prev) => prev.map((list, i) => {
    if (i !== active) return list;
    if (list.some((p) => p.pdfFile === s.pdfFile && p.title === s.title)) return list.filter((p) => !(p.pdfFile === s.pdfFile && p.title === s.title));
    return [...list, { pdfFile: s.pdfFile, title: s.title }].slice(-MAX_SECTIONS_PER_SUBTOPIC);
  }));
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
  const row = (on: boolean) => ({ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: on ? colors.primary + '20' : 'transparent' });

  return (
    <View testID="book-section-picker" style={{ flex: 0.8, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>Change the book section</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>
        Each subtopic is taught from a section of the NCERT book. If a match is wrong, pick the right section for that
        subtopic (up to 2), then press Rebuild topic: Learn, AI Tutor and Practice are rebuilt from the book.
        Text you edited in this topic will be replaced.
      </Text>

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 4 }}>1. CHOOSE A SUBTOPIC</Text>
      {subtopics.map((title, i) => (
        <TouchableOpacity key={i} testID={`picker-subtopic-${i}`} onPress={() => setActive(i)} activeOpacity={0.7} style={row(i === active)}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.textMain }}>{title}</Text>
          <Text style={{ fontSize: 11.5, color: picks[i]?.length ? colors.textMuted : colors.accentRed }}>
            {picks[i]?.length ? picks[i].map((p) => p.title).join(' + ') : 'Not in the book — AI will explain it'}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 4 }}>
        2. PICK THE BOOK SECTION FOR “{subtopics[active]}”
      </Text>
      <TextInput
        testID="picker-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search sections, e.g. decimal, angle, fraction"
        placeholderTextColor={colors.textMuted}
        style={{ fontSize: 12.5, color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
      />
      {!sections && !error && <ActivityIndicator color={colors.primary} />}
      {!!sections && (
        <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
          <TouchableOpacity testID="picker-option-none" onPress={() => setPicks((prev) => prev.map((l, i) => (i === active ? [] : l)))} style={row(!picks[active]?.length)}>
            <Text style={{ fontSize: 12, color: colors.textMain }}>Not in the book — AI will explain it</Text>
          </TouchableOpacity>
          {visible.map((s, k) => (
            <TouchableOpacity key={`${s.pdfFile}-${s.title}`} testID={`picker-option-${k}`} onPress={() => toggle(s)} style={row(!!isPicked(s))}>
              <Text style={{ fontSize: 12, color: colors.textMain }}>{isPicked(s) ? '✓ ' : ''}{s.title} · p.{s.page}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Grade {s.grade} · {s.chapterTitle || s.pdfFile}</Text>
            </TouchableOpacity>
          ))}
          {!visible.length && <Text style={{ fontSize: 12, color: colors.textMuted, padding: 8 }}>No section matches “{query}”.</Text>}
        </ScrollView>
      )}
      {!!error && <Text testID="picker-error" style={{ fontSize: 12, color: colors.accentRed }}>{error}</Text>}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' }}>
        {busy && <Text style={{ fontSize: 11.5, color: colors.textMuted }}>Rebuilding… about a minute</Text>}
        <TouchableOpacity testID="picker-cancel" disabled={busy} onPress={onCancel}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="picker-rebuild" disabled={busy} onPress={rebuild}
          style={{ backgroundColor: busy ? colors.borderColor : colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Rebuild topic</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
