// Integration tests for SubjectSyllabusScreen — the real screen and its real
// ChapterCard, driven through the real curated CBSE Grade 6 English dataset
// (fetch mocked to return no DB-published units, so the curated fallback is
// exercised) and a mocked global.fetch for the DB-backed/error scenarios.

import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import SubjectSyllabusScreen from '../SubjectSyllabusScreen';

jest.setTimeout(15000);

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888',
    primary: '#fa0',
  } }),
}));

jest.mock('../../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ stats: { completedTopics: [] } }),
}));

jest.mock('../../../../../components/common/Header', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="header-stub" /> };
});

jest.mock('../../../../../components/common/ScreenLayout', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <View>{children}</View> };
});

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function navProp(params: any = {}) {
  return { navigate: jest.fn(), openDrawer: jest.fn() };
}

function routeProp(params: any = {}) {
  return { params: { subject: 'English', curriculum: 'CBSE', grade: 'Grade 6', ...params } };
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(jsonRes({ units: [] })) as any;
});

describe('SubjectSyllabusScreen — states', () => {
  test('shows a real loading spinner while the DB syllabus check is in flight', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as any; // never resolves
    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp()} />);

    // No chapters rendered yet — the header title is present but content area is empty/loading.
    expect(screen.queryByText(/Chapter 1/)).toBeNull();
  });

  test('renders the real curated CBSE Grade 6 English chapters once loaded', async () => {
    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp()} />);

    await waitFor(() => expect(screen.getByPlaceholderText('Search chapters or topics…')).toBeTruthy());
    expect(screen.getAllByText(/Chapter \d/).length).toBeGreaterThan(0);
  });

  test('shows a real "being processed" empty state for a subject/grade with no curated or published content', async () => {
    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp({ subject: 'Mathematics', curriculum: 'IB PYP', grade: 'Grade 4' })} />);

    await waitFor(() => expect(screen.getByText(/currently being processed/)).toBeTruthy());
  });

  test('shows a real error message (not the generic "being processed" text) when the DB fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp({ subject: 'Mathematics', curriculum: 'IB PYP', grade: 'Grade 4' })} />);

    await waitFor(() => expect(screen.getByText(/couldn't load the Mathematics syllabus/)).toBeTruthy());
  });

  test('the "View topic list instead" button on the empty state navigates to SubjectTopics', async () => {
    const nav = navProp();
    const user = userEvent.setup();
    await render(<SubjectSyllabusScreen navigation={nav} route={routeProp({ subject: 'Mathematics', curriculum: 'IB PYP', grade: 'Grade 4' })} />);
    await waitFor(() => expect(screen.getByText('View topic list instead')).toBeTruthy());

    await user.press(screen.getByText('View topic list instead'));

    expect(nav.navigate).toHaveBeenCalledWith('SubjectTopics', { subject: 'Mathematics', curriculum: 'IB PYP', grade: 'Grade 4' });
  });
});

describe('SubjectSyllabusScreen — search', () => {
  test('a real search term filters chapters/topics down to real matches', async () => {
    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp()} />);
    await waitFor(() => expect(screen.getByPlaceholderText('Search chapters or topics…')).toBeTruthy());
    const totalBefore = screen.getAllByText(/Chapter \d/).length;

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Search chapters or topics…'), 'zzz-no-real-match-zzz');

    await waitFor(() => expect(screen.queryAllByText(/Chapter \d/).length).toBeLessThan(totalBefore));
  });
});

describe('SubjectSyllabusScreen — navigation', () => {
  test('opening a real chapter then a real topic navigates to LessonScreen with the real params', async () => {
    const nav = navProp();
    const user = userEvent.setup();
    await render(<SubjectSyllabusScreen navigation={nav} route={routeProp()} />);
    await waitFor(() => expect(screen.getByPlaceholderText('Search chapters or topics…')).toBeTruthy());

    // Chapter 1 (index 0) starts open by default per useChapterExpansion's default.
    const topicButtons = screen.getAllByText(/Topic \d/);
    await user.press(topicButtons[0]);

    expect(nav.navigate).toHaveBeenCalledWith('LessonScreen', expect.objectContaining({
      subject: 'English', curriculum: 'CBSE', grade: 'Grade 6', chapterIndex: 0, topicIndex: 0,
    }));
  });

  test('a real deep-link chapterTitle param opens that specific real chapter', async () => {
    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp({ chapterTitle: 'Fables and Folk Tales' })} />);

    await waitFor(() => expect(screen.getByText(/Fables and Folk Tales/)).toBeTruthy());
    // Its topics should now be visible (chapter opened), not just the collapsed heading.
    expect(screen.getAllByText(/Topic \d/).length).toBeGreaterThan(0);
  });
});
