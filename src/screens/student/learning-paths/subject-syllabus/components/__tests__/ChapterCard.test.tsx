// Regression for Bug #11 follow-up (BUGS_AND_FIXES.md): `isPending` used to
// OR the server's own `pending` field with `chapter.topics.length === 0` —
// since `chapter.topics` (syllabus_topics DB rows) stays empty for virtually
// all NCERT content regardless of real Qdrant content, that second
// condition silently discarded the server's correct `pending: false` answer
// for exactly the case Bug #11's backend fix targeted. A chapter server-
// confirmed as NOT pending must render as available, not "Coming soon".

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ChapterCard from '../ChapterCard';
import { makeStyles } from '../../styles';

const colors = {
  bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888',
  primary: '#fa0', textDim: '#666',
} as any;
const styles = makeStyles(colors);

function renderCard(chapter: any) {
  return render(
    <ChapterCard
      chapter={chapter}
      ci={0}
      topics={chapter.topics}
      isOpen={false}
      completedSet={new Set()}
      isUnitShaped={false}
      colors={colors}
      styles={styles}
      onToggle={() => {}}
      onOpenTopic={() => {}}
    />
  );
}

describe('ChapterCard — pending/"Coming soon" (Bug #11 follow-up)', () => {
  test('server says pending: false -> renders as available, even with an empty topics array', async () => {
    await renderCard({
      unitNo: 1, title: 'Learning Objectives', pending: false, topics: [], subtopics: ['Meaning of Accounting'],
    });
    expect(screen.queryByText('Coming soon')).toBeNull();
  });

  test('server says pending: true -> renders "Coming soon"', async () => {
    await renderCard({
      unitNo: 2, title: 'Unwritten Chapter', pending: true, topics: [], subtopics: [],
    });
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });

  test('no server pending field at all (curated syllabus) -> falls back to the topics-empty heuristic', async () => {
    await renderCard({ title: 'Curated Chapter', topics: [] });
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });

  test('no server pending field, but real topics present -> not pending', async () => {
    await renderCard({ title: 'Curated Chapter', topics: [{ name: 'A Topic' }] });
    expect(screen.queryByText('Coming soon')).toBeNull();
  });
});

describe('ChapterCard — single-lesson chapters (Lessons coming soon only when it really is)', () => {
  const title = 'अंतिम दौर - दो: राष्ट्रीयता बनाम साम्राज्यवाद';

  test('a CBSE chapter that is one lesson with content does not say "Lessons coming soon"', async () => {
    await renderCard({ unitNo: 39, title, pending: false, topics: [{ name: title, kind: 'section', page: 1 }] });

    expect(screen.queryByText('Lessons coming soon')).toBeNull();
    expect(screen.queryByText('Coming soon')).toBeNull();
    expect(screen.getByText('1 topic')).toBeTruthy();
  });

  test('an ICSE syllabus-only chapter (server marks comingSoon) still says "Lessons coming soon"', async () => {
    await renderCard({ unitNo: 1, title: 'Numbers', pending: false, comingSoon: true, topics: [{ name: 'Numbers', comingSoon: true }] });

    expect(screen.getByText('Lessons coming soon')).toBeTruthy();
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });
});
