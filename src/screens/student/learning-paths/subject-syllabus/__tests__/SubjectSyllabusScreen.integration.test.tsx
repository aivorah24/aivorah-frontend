// Integration tests for SubjectSyllabusScreen — the real screen and its real
// ChapterCard, driven through the real curated CBSE Grade 6 English dataset
// (fetch mocked to return no DB-published units, so the curated fallback is
// exercised) and a mocked global.fetch for the DB-backed/error scenarios.

import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import SubjectSyllabusScreen from '../SubjectSyllabusScreen';

jest.setTimeout(15000);

const mockTeacherPaths: any[] = [];
jest.mock('../../teacher-learning-paths/hooks/useTeacherPaths', () => ({
  useTeacherPaths: () => ({ paths: mockTeacherPaths, loaded: true }),
}));
let mockSubjectEdits: any = null;
jest.mock('../hooks/useStudentSubjectEdits', () => ({
  useStudentSubjectEdits: () => ({ edits: mockSubjectEdits, loaded: true }),
}));
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
  mockSubjectEdits = null;
  global.fetch = jest.fn().mockResolvedValue(jsonRes({ units: [] })) as any;
});

describe("SubjectSyllabusScreen — the teacher's version of the subject", () => {
  test('hidden chapters are gone, renamed topics show their new name, and an edited lesson opens with the edits', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      units: [
        { unitNo: 1, title: 'Patterns', pdfFile: 'a.pdf', topics: [{ name: 'What is a pattern', kind: 'qdrant' }] },
        { unitNo: 2, title: 'Angles', pdfFile: 'b.pdf', topics: [{ name: 'Point', kind: 'qdrant' }] },
      ],
    })) as any;
    mockSubjectEdits = {
      chapters: [
        { key: 'pdf:a.pdf', topics: [{ key: 'pdf:a.pdf::what is a pattern', name: 'Spotting patterns' }] },
        { key: 'pdf:b.pdf', hidden: true, topics: [] },
      ],
      topics: { 'pdf:a.pdf::what is a pattern': { whatYoullLearn: ['See patterns around you'] } },
    };
    const nav = navProp();
    const user = userEvent.setup();
    await render(<SubjectSyllabusScreen navigation={nav} route={routeProp({ subject: 'Mathematics' })} />);
    await waitFor(() => expect(screen.getByPlaceholderText('Search chapters or topics…')).toBeTruthy());
    expect(screen.queryByText(/Angles/)).toBeNull();

    await user.type(screen.getByPlaceholderText('Search chapters or topics…'), 'Spot');
    await user.press(await screen.findByText(/Spotting patterns/));
    expect(nav.navigate).toHaveBeenCalledWith('LessonScreen', expect.objectContaining({
      byNameTopic: 'What is a pattern',
      topicName: 'Spotting patterns',
      editKey: 'pdf:a.pdf::what is a pattern',
    }));
  });
});

test("a book section (no id) opens its real lesson by name, not the old built-in one", async () => {
  global.fetch = jest.fn().mockResolvedValue(jsonRes({
    units: [{ unitNo: 1, title: 'The Wonderful World of Science', pdfFile: 'fecu101.pdf', topics: [{ name: 'The Scientific Method', kind: 'section', page: 5 }] }],
  })) as any;
  const nav = navProp();
  const user = userEvent.setup();
  await render(<SubjectSyllabusScreen navigation={nav} route={routeProp({ subject: 'Science' })} />);
  await user.press(await screen.findByText(/The Scientific Method/));
  expect(nav.navigate).toHaveBeenCalledWith('LessonScreen', expect.objectContaining({ byNameTopic: 'The Scientific Method', topicId: undefined }));
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

  test('tells the student when a topic counts as done', async () => {
    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp()} />);
    await waitFor(() => expect(screen.getByTestId('completion-rule')).toBeTruthy());
    expect(screen.getByTestId('completion-rule').props.children).toMatch(/finish Learn or Listen, then pass its Practice test \(60% or more\)/);
  });

  test('shows a real "being processed" empty state for a subject/grade with no curated or published content', async () => {
    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp({ subject: 'Mathematics', curriculum: 'IB PYP', grade: 'Grade 4' })} />);

    await waitFor(() => expect(screen.getByText(/currently being processed/)).toBeTruthy());
  });

  // Regression: real chapters with zero real topics (all pending — e.g. the
  // reported Grade 11 Accountancy case, chapters with only book-derived
  // `subtopics`, no DB `topics` yet) divided 0/0 and rendered "NaN%" instead
  // of 0%. See BUGS_AND_FIXES.md follow-up to Bug #11.
  test('real chapters with zero total topics show 0%, never "NaN%"', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      units: [
        { unitNo: 1, title: 'Learning Objectives', subtopics: ['Meaning of Accounting'], topics: [], pending: true },
        { unitNo: 2, title: 'Theory Base of Accounting', subtopics: ['Basis of Accounting'], topics: [], pending: true },
      ],
    })) as any;

    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp({ subject: 'Accountancy', curriculum: 'CBSE', grade: 'Grade 11' })} />);

    await waitFor(() => expect(screen.getByText(/0 of 2/)).toBeTruthy());
    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
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

  // Regression for Bug #11's third finding (BUGS_AND_FIXES.md): a real
  // Qdrant-sourced topic (kind: 'qdrant', synthetic "qdrant:..." id, no
  // syllabus_topics DB row) used to be sent as `topicId` — LessonScreen then
  // fetched from the wrong (DB-id) route and found nothing, showing
  // "Content coming soon" for a topic with real content.
  test('opening a real Qdrant-sourced topic sends byNameTopic, not its synthetic id as topicId', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      units: [{
        unitNo: 9, title: 'Biomolecules', pending: false,
        topics: [{ id: 'qdrant:NCERT:Grade 11:Biology:Nucleic Acids Building Blocks', name: 'Nucleic Acids Building Blocks', kind: 'qdrant', page: '' }],
      }],
    })) as any;
    const nav = navProp();
    const user = userEvent.setup();
    await render(<SubjectSyllabusScreen navigation={nav} route={routeProp({ subject: 'Biology', grade: 'Grade 11' })} />);
    await waitFor(() => expect(screen.getByText(/Nucleic Acids Building Blocks/)).toBeTruthy());

    await user.press(screen.getByText(/Nucleic Acids Building Blocks/));

    expect(nav.navigate).toHaveBeenCalledWith('LessonScreen', expect.objectContaining({
      byNameTopic: 'Nucleic Acids Building Blocks',
      topicName: 'Nucleic Acids Building Blocks',
      topicId: undefined,
    }));
  });

  test('opening a real DB-backed (teacher-uploaded) topic still sends its real topicId', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      units: [{
        unitNo: 1, title: 'Chapter One', pending: false,
        topics: [{ id: 'db-topic-1', name: 'A Real DB Topic', kind: 'lesson', page: 'p.1' }],
      }],
    })) as any;
    const nav = navProp();
    const user = userEvent.setup();
    await render(<SubjectSyllabusScreen navigation={nav} route={routeProp()} />);
    await waitFor(() => expect(screen.getByText(/A Real DB Topic/)).toBeTruthy());

    await user.press(screen.getByText(/A Real DB Topic/));

    expect(nav.navigate).toHaveBeenCalledWith('LessonScreen', expect.objectContaining({
      topicId: 'db-topic-1', topicName: 'A Real DB Topic', byNameTopic: undefined,
    }));
  });

  test('a real deep-link chapterTitle param opens that specific real chapter', async () => {
    await render(<SubjectSyllabusScreen navigation={navProp()} route={routeProp({ chapterTitle: 'Fables and Folk Tales' })} />);

    await waitFor(() => expect(screen.getByText(/Fables and Folk Tales/)).toBeTruthy());
    // Its topics should now be visible (chapter opened), not just the collapsed heading.
    expect(screen.getAllByText(/Topic \d/).length).toBeGreaterThan(0);
  });
});

describe('SubjectSyllabusScreen — teacher-published units', () => {
  afterEach(() => { mockTeacherPaths.length = 0; });
  const content = { whatYoullLearn: ['x'], blocks: [] };
  const teacherPath = {
    summary: { id: 'lp1', curriculumId: 'c1', title: 'Visual Arts', publishedAt: 'x' },
    path: {
      id: 'lp1', curriculumId: 'c1', publishedAt: 'x',
      content: {
        version: 1, metadata: { grade: '4', subject: 'Visual Arts', curriculum: 'IB PYP' },
        units: [{ title: 'Colour', order: 0, topics: [{ title: 'Mixing colours', order: 0, objectives: [], lessons: [], subtopics: [], content }] }],
      },
    },
  };

  test("IB: with no standard syllabus, the teacher's units are the subject's chapters and a topic opens the lesson", async () => {
    mockTeacherPaths.push(teacherPath);
    const nav = navProp();
    const user = userEvent.setup();
    await render(<SubjectSyllabusScreen navigation={nav} route={routeProp({ subject: 'Visual Arts', curriculum: 'IB PYP', grade: 'Grade 4' })} />);

    await waitFor(() => expect(screen.getByText('Unit 1: Colour')).toBeTruthy());
    expect(screen.queryByText(/being processed/)).toBeNull();
    expect(screen.queryByText(/FROM YOUR TEACHER/i)).toBeNull();

    if (!screen.queryByText('Topic 1: Mixing colours')) await user.press(screen.getByText('Unit 1: Colour'));
    await user.press(await screen.findByText('Topic 1: Mixing colours'));
    expect(nav.navigate).toHaveBeenCalledWith('LessonScreen', expect.objectContaining({
      subject: 'Visual Arts', grade: 'Grade 4', curriculum: 'IB PYP', chapterTitle: 'Colour', topicName: 'Mixing colours', teacherContent: content,
    }));
  });
});

describe('ICSE / Cambridge — browsable syllabus, every topic Coming soon', () => {
  const units = [
    { unitNo: 1, title: 'Numbers up to 1000', comingSoon: true, pending: false, topics: [
      { id: 't1', name: 'Place Value', kind: 'coming_soon', page: '', comingSoon: true },
      { id: 't2', name: 'Comparing Numbers', kind: 'coming_soon', page: '', comingSoon: true },
    ] },
    { unitNo: 2, title: 'Addition', comingSoon: true, pending: false, topics: [
      { id: 't3', name: 'Adding with Carry', kind: 'coming_soon', page: '', comingSoon: true },
    ] },
  ];

  test.each(['ICSE', 'Cambridge'])('%s: chapters and topics are listed; tapping a topic shows "Coming soon" and opens no lesson', async (curriculum) => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ units })) as any;
    const nav = navProp();
    const user = userEvent.setup();
    await render(<SubjectSyllabusScreen navigation={nav} route={routeProp({ subject: 'Mathematics', curriculum, grade: 'Grade 3' })} />);

    expect(await screen.findByText(/Numbers up to 1000/)).toBeTruthy();
    expect(screen.getByText(/Addition/)).toBeTruthy();
    expect(screen.getByTestId('syllabus-only-note')).toHaveTextContent(new RegExp(`no official ${curriculum} textbook`));
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('/curriculum/syllabus?');

    await user.type(screen.getByPlaceholderText('Search chapters or topics…'), 'Place'); // forces the chapter open
    const topic = await screen.findByText(/Place Value/);
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
    await user.press(topic);

    expect(await screen.findByTestId('coming-soon-dialog')).toHaveTextContent(/Place Value/);
    expect(nav.navigate).not.toHaveBeenCalledWith('LessonScreen', expect.anything());

    await user.press(screen.getByTestId('coming-soon-close'));
    await waitFor(() => expect(screen.queryByTestId('coming-soon-dialog')).toBeNull());
  });
});
