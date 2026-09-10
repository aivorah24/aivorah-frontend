// Integration test for useUploadWorksheet's generateInteractiveQuiz +
// generateQuizFromExtracted — the two network-driven flows that don't need
// real File/FileReader DOM APIs (pickDoc itself needs those and is accepted
// as uncovered here, see the coverage report notes).
//
// Specifically targets the documented content-fidelity concern from
// memory/teacher_assignments_upload_worksheet.md: the quiz object must be
// stamped with a _sourceDocKey tied to the CURRENT docFiles set, which is
// what validateInteractiveQuizForPublish (utils/validation.ts) later checks
// before allowing publish — this test locks in that stamping actually happens
// and reflects the real files, not a stale one.
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useUploadWorksheet } from '../../hooks/useUploadWorksheet';
import { validateInteractiveQuizForPublish } from '../../utils/validation';

jest.mock('../../../../../config/serverUrl', () => 'https://server.test');

const realFetch = global.fetch;
let alertSpy: jest.SpyInstance;
beforeEach(() => { alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => { global.fetch = realFetch; alertSpy.mockRestore(); });

const BASE_ARGS = {
  user: { school: 'Green Valley' }, title: '', setTitle: () => {}, chapter: '', setChapter: () => {},
  subject: 'Maths', setSubject: () => {}, grade: 'Grade 4', setGrade: () => {}, curriculum: 'IB PYP', setCurriculum: () => {},
  gradeOptions: ['Grade 4'], effectiveGrade: 'Grade 4', effectiveCurriculum: 'IB PYP',
  setSelectedLanguage: () => {}, setSuccessCriteria: () => {}, setTeacherNotes: () => {},
  setIbWordBank: () => {}, setIbStamps: () => {}, setFormError: () => {},
  quizDifficulty: 'medium' as const, setQuizQuestions: () => {}, setType: () => {},
};

function Harness({ docFiles }: { docFiles: any[] }) {
  const h = useUploadWorksheet(BASE_ARGS);
  React.useEffect(() => { h.setDocFiles(docFiles); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View>
      <Text testID="generating">{String(h.generatingInteractiveQuiz)}</Text>
      <Text testID="docCount">{String(h.docFiles.length)}</Text>
      <Text testID="sourceDocKey">{h.interactiveQuiz?._sourceDocKey ?? ''}</Text>
      <Text testID="curriculum">{h.interactiveQuiz?.curriculum ?? ''}</Text>
      <Text testID="school">{h.interactiveQuiz?.school ?? ''}</Text>
      <TouchableOpacity testID="generate" onPress={() => h.generateInteractiveQuiz()} />
    </View>
  );
}

describe('useUploadWorksheet.generateInteractiveQuiz integration', () => {
  test('stamps the generated quiz with a _sourceDocKey matching the CURRENT docFiles — the guard against publishing against a stale/swapped worksheet', async () => {
    const docFiles = [{ name: 'worksheet.pdf', base64: 'BASE64PDF', mime: 'application/pdf', url: 'https://x/worksheet.pdf' }];
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/quiz/generate-async')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ jobId: 'job-1' }) });
      }
      if (String(url).includes('/jobs/')) {
        return Promise.resolve({ json: () => Promise.resolve({ status: 'done', result: { quiz: { title: 'Area Quiz', tasks: [{ title: 'T1', questions: [{ question: 'Q1', answer: 1 }] }] } } }) });
      }
      if (String(url).includes('/quiz/render-preview')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('<html>preview</html>') });
      }
      throw new Error('unexpected url: ' + url);
    }) as any;

    const user = userEvent.setup();
    await render(<Harness docFiles={docFiles} />);
    await waitFor(() => expect(screen.getByTestId('docCount').props.children).toBe('1'));
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('sourceDocKey').props.children).toBe('https://x/worksheet.pdf'));
    // The quiz always carries the teacher's REAL account curriculum/school, never
    // whatever the AI echoed back or read off a photocopied worksheet's letterhead.
    expect(screen.getByTestId('curriculum').props.children).toBe('IB PYP');
    expect(screen.getByTestId('school').props.children).toBe('Green Valley');
  });

  test("a quiz's sourceDocKey no longer matches after the worksheet set changes — validateInteractiveQuizForPublish then blocks publish", async () => {
    const originalDocFiles = [{ name: 'telugu.pdf', base64: 'X', mime: 'application/pdf', url: 'https://x/telugu.pdf' }];
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/quiz/generate-async')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ jobId: 'job-1' }) });
      if (String(url).includes('/jobs/')) return Promise.resolve({ json: () => Promise.resolve({ status: 'done', result: { quiz: { title: 'Telugu Quiz', tasks: [{ title: 'T1', questions: [{ question: 'Q1', answer: 1 }] }] } } }) });
      if (String(url).includes('/quiz/render-preview')) return Promise.resolve({ ok: true, text: () => Promise.resolve('<html>') });
      throw new Error('unexpected url: ' + url);
    }) as any;

    let hookRef: any;
    function CaptureHarness({ docFiles }: { docFiles: any[] }) {
      const h = useUploadWorksheet(BASE_ARGS);
      React.useEffect(() => { hookRef = h; });
      React.useEffect(() => { h.setDocFiles(docFiles); }, []); // eslint-disable-line react-hooks/exhaustive-deps
      return <TouchableOpacity testID="generate" onPress={() => h.generateInteractiveQuiz()} />;
    }
    const user = userEvent.setup();
    await render(<CaptureHarness docFiles={originalDocFiles} />);
    await waitFor(() => expect(hookRef.docFiles.length).toBe(1));
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(hookRef.interactiveQuiz?._sourceDocKey).toBe('https://x/telugu.pdf'));

    // Now the teacher swaps in a DIFFERENT worksheet without re-generating —
    // the quiz object itself is untouched, but validation must compare against
    // the NEW current file set and refuse to publish the stale quiz.
    const newDocFiles = [{ name: 'math.pdf', base64: 'Y', mime: 'application/pdf', url: 'https://x/math.pdf' }];
    const result = validateInteractiveQuizForPublish(hookRef.interactiveQuiz, newDocFiles);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/worksheet has changed/i);
  });

  test('a failed quiz-generation job surfaces without crashing and interactiveQuiz stays null', async () => {
    const docFiles = [{ name: 'worksheet.pdf', base64: 'X', mime: 'application/pdf', url: 'https://x/worksheet.pdf' }];
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/quiz/generate-async')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ jobId: 'job-1' }) });
      if (String(url).includes('/jobs/')) return Promise.resolve({ json: () => Promise.resolve({ status: 'failed', error: 'AI extraction failed' }) });
      throw new Error('unexpected url: ' + url);
    }) as any;
    const user = userEvent.setup();
    await render(<Harness docFiles={docFiles} />);
    await waitFor(() => expect(screen.getByTestId('docCount').props.children).toBe('1'));
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('generating').props.children).toBe('false'));
    expect(screen.getByTestId('sourceDocKey').props.children).toBe('');
  });

  test('generateInteractiveQuiz is a no-op with zero docFiles', async () => {
    global.fetch = jest.fn();
    const user = userEvent.setup();
    await render(<Harness docFiles={[]} />);
    await user.press(screen.getByTestId('generate'));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// B04 — generateQuizFromExtracted() must never force a drawing-response
// question through MCQ conversion (the original reported bug: the teacher's
// generated activity treated "Draw your farm" as a paper-only task with no
// submission path, because it got converted into a multiple-choice question
// like every other extracted question).
describe('useUploadWorksheet.generateQuizFromExtracted — drawing question preservation (B04)', () => {
  // Renders the hook, seeds extractedQuestions, waits for that state update
  // to actually land (avoids a stale-closure bug: capturing the hook object
  // BEFORE setExtractedQuestions's re-render would call
  // generateQuizFromExtracted against the OLD, empty extractedQuestions),
  // then calls generateQuizFromExtracted from the freshest hook reference.
  async function runWithExtractedQuestions(extracted: any[], extraArgs: any = {}) {
    let latest: any;
    const args = { ...BASE_ARGS, ...extraArgs };
    function Harness2() {
      const h = useUploadWorksheet(args);
      latest = h;
      return null;
    }
    await render(<Harness2 />);
    await waitFor(() => expect(latest).toBeDefined());
    latest.setExtractedQuestions(extracted);
    await waitFor(() => expect(latest.extractedQuestions).toHaveLength(extracted.length));
    await latest.generateQuizFromExtracted();
  }

  test('THE ORIGINAL GAP: a drawing question used to be sent through MCQ conversion along with every text question', async () => {
    let mcqCallBody: any = null;
    global.fetch = jest.fn().mockImplementation((url: string, opts: any) => {
      if (String(url).includes('/pdf-to-quiz')) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      if (String(url).includes('/generate-quiz')) {
        mcqCallBody = JSON.parse(opts.body);
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [{ question: 'Mock MCQ', type: 'mcq', options: ['A', 'B', 'C', 'D'], correct: 'A' }] }) });
      }
      throw new Error('unexpected url: ' + url);
    }) as any;

    await runWithExtractedQuestions([
      { question: 'Draw your farm in the space provided.', answer: '', comment: '', responseType: 'drawing' },
    ]);

    // Before the fix, this would be called with the drawing question's text
    // baked into the "Convert these worksheet questions into MCQ format"
    // prompt - documented here as the gap, verified not to happen below.
    expect(mcqCallBody).toBeNull();
  });

  test('a drawing-only worksheet is preserved as its own quiz question type, not converted to MCQ, with zero network calls', async () => {
    const setQuizQuestions = jest.fn();
    const setType = jest.fn();
    // No text questions at all - generateQuizFromExtracted must not call
    // pdf-to-quiz/generate-quiz for a drawing-only extraction.
    global.fetch = jest.fn().mockImplementation((url: string) => {
      throw new Error('unexpected url: ' + url);
    }) as any;

    await runWithExtractedQuestions(
      [{ question: 'Draw your farm in the space provided.', answer: '', comment: '', responseType: 'drawing' }],
      { setQuizQuestions, setType },
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(setQuizQuestions).toHaveBeenCalledWith([{ question: 'Draw your farm in the space provided.', type: 'drawing', correct: '' }]);
    expect(setType).toHaveBeenCalledWith('quiz');
  });

  test('a mix of text and drawing questions: text goes through MCQ conversion, drawing is preserved, both end up in the final quiz', async () => {
    const setQuizQuestions = jest.fn();
    const setType = jest.fn();
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/pdf-to-quiz')) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      if (String(url).includes('/generate-quiz')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [{ question: 'What is 2+2?', type: 'mcq', options: ['3', '4', '5', '6'], correct: '4' }] }) });
      throw new Error('unexpected url: ' + url);
    }) as any;

    await runWithExtractedQuestions(
      [
        { question: 'What is 2+2?', answer: '', comment: '', responseType: 'text' },
        { question: 'Draw your farm in the space provided.', answer: '', comment: '', responseType: 'drawing' },
      ],
      { setQuizQuestions, setType },
    );

    expect(setQuizQuestions).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ type: 'mcq' }),
      expect.objectContaining({ type: 'drawing', question: 'Draw your farm in the space provided.' }),
    ]));
  });

  test('REGRESSION: a worksheet with ONLY text questions still converts to MCQ exactly as before', async () => {
    const setQuizQuestions = jest.fn();
    const setType = jest.fn();
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/pdf-to-quiz')) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      if (String(url).includes('/generate-quiz')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [{ question: 'What is 2+2?', type: 'mcq', options: ['3', '4', '5', '6'], correct: '4' }] }) });
      throw new Error('unexpected url: ' + url);
    }) as any;

    await runWithExtractedQuestions(
      [{ question: 'What is 2+2?', answer: '', comment: '', responseType: 'text' }],
      { setQuizQuestions, setType },
    );

    expect(setQuizQuestions).toHaveBeenCalledWith([{ question: 'What is 2+2?', type: 'mcq', options: ['3', '4', '5', '6'], correct: '4' }]);
    expect(setType).toHaveBeenCalledWith('quiz');
  });
});
