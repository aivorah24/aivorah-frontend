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
  selectedLanguage: '', setSelectedLanguage: () => {}, setSuccessCriteria: () => {}, setTeacherNotes: () => {},
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

  // 2026-10-13 manual test: the worksheet language was never passed to the
  // rendered quiz, so "change language" did nothing for students.
  describe('worksheet language', () => {
    const quizJob = (url: string, renders: any[]) => {
      if (String(url).includes('/quiz/generate-async')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ jobId: 'job-1' }) });
      if (String(url).includes('/jobs/')) return Promise.resolve({ json: () => Promise.resolve({ status: 'done', result: { quiz: { title: 'Q', language: 'Telugu', tasks: [{ title: 'T1', questions: [{ question: 'Q1', answer: 1 }] }] } } }) });
      return null;
    };

    function LangHarness({ lang }: { lang: string }) {
      const h = useUploadWorksheet({ ...BASE_ARGS, selectedLanguage: lang });
      React.useEffect(() => { h.setDocFiles([{ name: 'w.pdf', base64: 'X', mime: 'application/pdf', url: 'https://x/w.pdf' }]); }, []); // eslint-disable-line react-hooks/exhaustive-deps
      return (
        <View>
          <Text testID="lang">{h.interactiveQuiz ? `[${h.interactiveQuiz.language}]` : ''}</Text>
          <Text testID="html">{h.interactiveQuiz?._previewHTML ?? ''}</Text>
          <TouchableOpacity testID="generate" onPress={() => h.generateInteractiveQuiz()} />
        </View>
      );
    }

    test("the teacher's chosen language is sent to generation and stamped on the quiz", async () => {
      const renders: any[] = [];
      global.fetch = jest.fn().mockImplementation((url: string, opts: any) => {
        if (String(url).includes('/quiz/render-preview')) { renders.push(JSON.parse(opts.body).quiz); return Promise.resolve({ ok: true, text: () => Promise.resolve('<html>hi</html>') }); }
        return quizJob(url, renders);
      }) as any;
      const user = userEvent.setup();
      await render(<LangHarness lang="Hindi" />);
      await user.press(screen.getByTestId('generate'));
      await waitFor(() => expect(screen.getByTestId('lang').props.children).toBe('[Hindi]'));
      const genCall = (global.fetch as jest.Mock).mock.calls.find(c => String(c[0]).includes('/quiz/generate-async'));
      expect(JSON.parse(genCall[1].body).language).toBe('Hindi');
      expect(renders[0].language).toBe('Hindi');
    });

    test('Auto-detect keeps the language the server detected', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (String(url).includes('/quiz/render-preview')) return Promise.resolve({ ok: true, text: () => Promise.resolve('<html>') });
        return quizJob(url, []);
      }) as any;
      const user = userEvent.setup();
      await render(<LangHarness lang="" />);
      await user.press(screen.getByTestId('generate'));
      await waitFor(() => expect(screen.getByTestId('lang').props.children).toBe('[Telugu]'));
    });

    test('changing the language after generation re-renders the preview with the new language', async () => {
      const renders: any[] = [];
      global.fetch = jest.fn().mockImplementation((url: string, opts: any) => {
        if (String(url).includes('/quiz/render-preview')) {
          const q = JSON.parse(opts.body).quiz; renders.push(q);
          return Promise.resolve({ ok: true, text: () => Promise.resolve(`<html lang="${q.language}">`) });
        }
        return quizJob(url, renders);
      }) as any;
      const user = userEvent.setup();
      const r = await render(<LangHarness lang="Telugu" />);
      await user.press(screen.getByTestId('generate'));
      await waitFor(() => expect(screen.getByTestId('lang').props.children).toBe('[Telugu]'));
      await r.rerender(<LangHarness lang="Tamil" />);
      await waitFor(() => expect(screen.getByTestId('html').props.children).toBe('<html lang="Tamil">'));
      expect(screen.getByTestId('lang').props.children).toBe('[Tamil]');
      expect(renders[renders.length - 1].language).toBe('Tamil');
    });
  });
});
