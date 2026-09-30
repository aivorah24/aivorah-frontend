import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { LessonEdit } from '../../../student/learning-paths/subject-syllabus/subjectEdits';
import { bookSrc, bookTitleFor } from '../../../student/learning-paths/lesson-screen/utils/book';
import { getBookSections, type BookSectionOption } from '../../curriculum-learning-path/services/curriculumLearningPathService';
import { pickLessonBook } from './pickLessonBook';

function Button({ icon, label, onPress, colors, primary, danger, testID, disabled }: {
  icon: any; label: string; onPress: () => void; colors: AppColors; primary?: boolean; danger?: boolean; testID?: string; disabled?: boolean;
}) {
  const fg = primary ? '#fff' : danger ? '#C0392B' : colors.primary;
  return (
    <TouchableOpacity testID={testID} disabled={disabled} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, opacity: disabled ? 0.5 : 1,
        backgroundColor: primary ? colors.primary : 'transparent', borderWidth: 1, borderColor: primary ? colors.primary : danger ? '#C0392B55' : colors.borderColor }}>
      <Feather name={icon} size={14} color={fg} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: fg }}>{label}</Text>
    </TouchableOpacity>
  );
}

// The book shown next to the lesson: a live preview of the page students see, and the choice to remove it, upload
// the teacher's own PDF, or pick another section of the standard book.
export default function BookEditor({ lesson, grade, subject, colors, onChange }: {
  lesson: LessonEdit; grade: string; subject: string; colors: AppColors; onChange: (patch: Partial<LessonEdit>) => void;
}) {
  const hasBook = !!(lesson.bookUrl || lesson.pdfFile);
  const page = lesson.pdfPage || 1;
  const [showSections, setShowSections] = useState(false);
  const [sections, setSections] = useState<BookSectionOption[] | null>(null);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!showSections || sections) return;
    getBookSections(grade.replace(/\D/g, ''), subject).then((r) => setSections(r.sections)).catch((e) => { setSections([]); setError(e.message); });
  }, [showSections, sections, grade, subject]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (sections || []).filter((s) => !q || `${s.title} ${s.chapterTitle || ''}`.toLowerCase().includes(q)).slice(0, 40), [sections, q]);
  const name = lesson.bookUrl ? (lesson.bookTitle || 'Your book') : hasBook ? `${bookTitleFor(grade, subject)} · ${lesson.pdfFile}` : 'No book';

  async function upload() {
    setError('');
    setUploading(true);
    try {
      const book = await pickLessonBook();
      if (book) onChange({ bookUrl: book.url, bookTitle: book.fileName.replace(/\.pdf$/i, ''), pdfFile: '', bookPath: '', pdfPage: 1 });
    } catch (e: any) {
      setError(e.message || 'Could not upload the book.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View testID="book-editor" style={{ gap: 12 }}>
      <View style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cardDark }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, flexWrap: 'wrap', borderBottomWidth: hasBook ? 1 : 0, borderBottomColor: colors.borderColor }}>
          <Feather name="book" size={16} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>BOOK STUDENTS SEE NEXT TO THIS LESSON</Text>
            {lesson.bookUrl ? (
              <TextInput testID="book-title" value={lesson.bookTitle || ''} onChangeText={(v) => onChange({ bookTitle: v })} placeholder="Book name"
                placeholderTextColor={colors.textMuted} style={{ fontSize: 14, fontWeight: '700', color: colors.textMain, paddingVertical: 2 }} />
            ) : (
              <Text testID="book-name" style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }}>{name}</Text>
            )}
          </View>
          {hasBook && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>Opens at page</Text>
              <TouchableOpacity testID="page-down" onPress={() => onChange({ pdfPage: Math.max(1, page - 1) })}><Feather name="chevron-left" size={18} color={colors.primary} /></TouchableOpacity>
              <TextInput testID="page-value" value={String(page)} keyboardType="number-pad"
                onChangeText={(v) => { const n = parseInt(v.replace(/\D/g, ''), 10); if (n > 0) onChange({ pdfPage: n }); }}
                style={{ width: 44, textAlign: 'center', fontSize: 14, fontWeight: '800', color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 6, paddingVertical: 3 }} />
              <TouchableOpacity testID="page-up" onPress={() => onChange({ pdfPage: page + 1 })}><Feather name="chevron-right" size={18} color={colors.primary} /></TouchableOpacity>
            </View>
          )}
        </View>
        {hasBook && Platform.OS === 'web' ? (
          React.createElement('iframe', {
            key: `${lesson.bookUrl || lesson.pdfFile}#${page}`,
            src: `${bookSrc(lesson, grade, subject)}#page=${page}&view=FitH`,
            style: { width: '100%', height: 520, border: 'none', backgroundColor: colors.bgDark },
            title: 'Book preview',
          })
        ) : !hasBook ? (
          <Text style={{ padding: 16, fontSize: 13, color: colors.textMuted }}>No book is shown with this lesson. Upload one or choose a book section below.</Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button testID="book-upload" primary icon="upload" label={uploading ? 'Uploading…' : hasBook ? 'Replace with my own book (PDF)' : 'Upload my own book (PDF)'} colors={colors} disabled={uploading} onPress={upload} />
        <Button testID="book-sections-toggle" icon="list" label={showSections ? 'Hide book sections' : 'Choose a section of the standard book'} colors={colors} onPress={() => setShowSections((v) => !v)} />
        {hasBook && <Button testID="book-remove" danger icon="trash-2" label="Remove book" colors={colors} onPress={() => onChange({ pdfFile: '', bookPath: '', bookUrl: '', bookTitle: '', pdfPage: undefined })} />}
        {uploading && <ActivityIndicator color={colors.primary} />}
      </View>
      <Text style={{ fontSize: 11.5, color: colors.textMuted }}>PDF up to 10MB — for a big textbook, upload just the chapter this lesson needs.</Text>
      {!!error && <Text style={{ fontSize: 12.5, color: '#C0392B' }}>{error}</Text>}

      {showSections && (
        <View style={{ gap: 8 }}>
          <TextInput value={query} onChangeText={setQuery} placeholder="Search sections…" placeholderTextColor={colors.textMuted}
            style={{ fontSize: 13.5, color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, padding: 8 }} />
          {!sections ? <ActivityIndicator color={colors.primary} /> : shown.map((s, i) => {
            const current = !lesson.bookUrl && s.pdfFile === lesson.pdfFile && s.page === page;
            return (
              <TouchableOpacity key={`${s.pdfFile}-${s.title}-${i}`} testID={`book-section-${i}`}
                onPress={() => onChange({ pdfFile: s.pdfFile, pdfPage: s.page || 1, bookPath: s.bookPath || '', bookUrl: '', bookTitle: '' })}
                style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: current ? colors.primary : colors.borderColor }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain }}>{s.title}</Text>
                <Text style={{ fontSize: 11.5, color: colors.textMuted }}>Grade {s.grade} · {s.chapterTitle || s.bookTitle} · page {s.page}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
