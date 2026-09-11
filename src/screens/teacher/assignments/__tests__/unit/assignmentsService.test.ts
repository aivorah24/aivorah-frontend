import { buildUploadedExtractedQuestions, buildAssignmentPayload, postCreateAssignment } from '../../services/assignmentsService';
import ASSIGNMENTS_SERVER_URL from '../../../../../config/assignmentsServerUrl';

jest.mock('../../../../../config/serverUrl', () => 'https://server.test');

const baseArgs = {
  title: '  Area & Perimeter  ', subject: 'Maths', chapter: '  Ch 3  ', dueDate: '2026-04-01', type: 'assignment' as const,
  assignTo: 'all' as const, selectedStudentId: null, teacherEmail: 't@school.com', grade: 'Grade 4', curriculum: 'IB PYP',
  questions: ['Q1', '  '], uploadedExtracted: [], extractedQuestions: [], ibLearningOutcomes: [], successCriteria: ['Manual criterion'],
  taskSteps: [], ibWordBank: [], quizQuestions: [], interactiveQuiz: null, docFiles: [], ibPurpose: '', note: 'A note',
  unitOfInquiry: '', selectedLanguage: '', ibCentralIdea: '', ibLinesOfInquiry: [], ibLearnerProfile: '', ibAtlSkill: '', ibKeyConcept: '',
};

describe('buildUploadedExtractedQuestions', () => {
  test('maps extracted questions into the POST body shape', () => {
    const result = buildUploadedExtractedQuestions([{ question: 'Q1', answer: 'A1', comment: 'C1' }]);
    expect(result).toEqual([{ question: 'Q1', expectedAnswer: 'A1', comment: 'C1' }]);
  });
  test('missing answer/comment default to empty strings', () => {
    const result = buildUploadedExtractedQuestions([{ question: 'Q1', answer: '', comment: '' }]);
    expect(result).toEqual([{ question: 'Q1', expectedAnswer: '', comment: '' }]);
  });
});

describe('buildAssignmentPayload', () => {
  test('trims title and chapter', () => {
    const payload = buildAssignmentPayload(baseArgs);
    expect(payload.title).toBe('Area & Perimeter');
    expect(payload.chapter).toBe('Ch 3');
  });

  test('filters blank plain questions when no extracted questions exist', () => {
    const payload = buildAssignmentPayload(baseArgs);
    expect(payload.questions).toEqual(['Q1']);
  });

  test('uploaded extracted questions take priority over plain questions', () => {
    const payload = buildAssignmentPayload({
      ...baseArgs,
      uploadedExtracted: [{ question: 'Extracted Q', expectedAnswer: 'A', comment: '' }],
    });
    expect(payload.questions).toEqual([{ question: 'Extracted Q', expectedAnswer: 'A', comment: '' }]);
  });

  test('assignTo "specific" carries the selected student id through', () => {
    const payload = buildAssignmentPayload({ ...baseArgs, assignTo: 'specific', selectedStudentId: 'stu-1' });
    expect(payload.studentId).toBe('stu-1');
  });

  test('assignTo "all" always nulls studentId, even if one is set', () => {
    const payload = buildAssignmentPayload({ ...baseArgs, assignTo: 'all', selectedStudentId: 'stu-1' });
    expect(payload.studentId).toBeNull();
  });

  test('IB learning outcomes override manual successCriteria when present', () => {
    const payload = buildAssignmentPayload({ ...baseArgs, ibLearningOutcomes: ['Outcome 1', '  '] });
    expect(payload.successCriteria).toEqual(['Outcome 1']);
  });

  test('falls back to manual successCriteria when no IB outcomes are set', () => {
    const payload = buildAssignmentPayload(baseArgs);
    expect(payload.successCriteria).toEqual(['Manual criterion']);
  });

  test('merges ibWordBank into structured_writing task steps only', () => {
    const payload = buildAssignmentPayload({
      ...baseArgs,
      ibWordBank: ['photosynthesis', 'chlorophyll'],
      taskSteps: [
        { type: 'structured_writing', wordBank: [] } as any,
        { type: 'multiple_choice', wordBank: [] } as any,
      ],
    });
    expect(payload.taskSteps[0].wordBank).toEqual(['photosynthesis', 'chlorophyll']);
    expect(payload.taskSteps[1].wordBank).toEqual([]);
  });

  test('strips internal (_-prefixed) fields from the interactive quiz before sending', () => {
    const payload = buildAssignmentPayload({
      ...baseArgs,
      interactiveQuiz: { title: 'Quiz', _previewHTML: '<html>should not be in interactiveQuiz field</html>', _editMode: true },
    });
    expect(payload.interactiveQuiz).toEqual({ title: 'Quiz' });
    expect(payload.interactiveQuizHtml).toBe('<html>should not be in interactiveQuiz field</html>');
  });

  test('ibPurpose overrides the plain note field when both are set', () => {
    const payload = buildAssignmentPayload({ ...baseArgs, ibPurpose: '  The IB purpose  ', note: 'plain note' });
    expect(payload.note).toBe('The IB purpose');
  });

  test('falls back to the plain note when ibPurpose is blank', () => {
    const payload = buildAssignmentPayload({ ...baseArgs, ibPurpose: '  ', note: 'plain note' });
    expect(payload.note).toBe('plain note');
  });

  test('language is only set for Language Acquisition subject', () => {
    const withLang = buildAssignmentPayload({ ...baseArgs, subject: 'Language Acquisition', selectedLanguage: 'Spanish' });
    expect(withLang.language).toBe('Spanish');
    const withoutLang = buildAssignmentPayload({ ...baseArgs, subject: 'Maths', selectedLanguage: 'Spanish' });
    expect(withoutLang.language).toBeNull();
  });

  test('documentUrl is the first docFile url; documentUrls collects every non-empty one', () => {
    const payload = buildAssignmentPayload({
      ...baseArgs,
      docFiles: [{ url: 'https://x/1.pdf' }, { url: undefined as any }, { url: 'https://x/2.pdf' }],
    });
    expect(payload.documentUrl).toBe('https://x/1.pdf');
    expect(payload.documentUrls).toEqual(['https://x/1.pdf', 'https://x/2.pdf']);
  });

  test('questionAnswers maps only questions with a non-blank answer', () => {
    const payload = buildAssignmentPayload({
      ...baseArgs,
      extractedQuestions: [{ question: 'Q1', answer: 'A1', comment: '' }, { question: 'Q2', answer: '  ', comment: '' }],
    });
    expect(payload.questionAnswers).toEqual({ Q1: 'A1' });
  });
});

describe('postCreateAssignment', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  test('a 200 response returns { ok: true, data }', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ id: 'a1' })) }) as any;
    const result = await postCreateAssignment({ title: 'X' });
    expect(result).toEqual({ ok: true, data: { id: 'a1' } });
  });

  test('posts to aivorah-assignments-service, not the monolith', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{}') }) as any;
    await postCreateAssignment({ title: 'X' });
    expect(fetch).toHaveBeenCalledWith(`${ASSIGNMENTS_SERVER_URL}/assignments`, expect.objectContaining({ method: 'POST' }));
  });

  test('a non-ok response with a parseable error body surfaces that message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve(JSON.stringify({ error: 'Bad grade' })) }) as any;
    const result = await postCreateAssignment({ title: 'X' });
    expect(result).toEqual({ ok: false, error: 'Bad grade' });
  });

  test('a non-ok response with an unparseable body falls back to a generic error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('<html>gateway error</html>') }) as any;
    const result = await postCreateAssignment({ title: 'X' });
    expect(result).toEqual({ ok: false, error: 'Failed to create' });
  });

  test('a network failure (fetch throws) returns a network error message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    const result = await postCreateAssignment({ title: 'X' });
    expect(result).toEqual({ ok: false, error: 'Network error. Check server connection.' });
  });
});
