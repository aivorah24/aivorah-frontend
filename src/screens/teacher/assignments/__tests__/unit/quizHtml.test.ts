import { generateQuizHTMLPreview, getAnsweredQuizHtml, stripInternalQuizFields } from '../../utils/quizHtml';

jest.mock('../../../../../config/serverUrl', () => 'https://server.test');

describe('generateQuizHTMLPreview', () => {
  test('renders a question per task and totals them into the score badge', () => {
    const quiz = {
      title: 'Area Quiz',
      tasks: [
        { title: 'Task 1', tier: 'MUST DO', questions: [{ question: 'What is 2+2?', answer: 4 }] },
        { title: 'Task 2', tier: 'COULD DO', questions: [{ question: 'What is 3+3?', answer: 6 }, { question: 'What is 5-2?', answer: 3 }] },
      ],
    };
    const html = generateQuizHTMLPreview(quiz);
    expect(html).toContain('0/3'); // 1 + 2 questions total
    expect(html).toContain('What is 2+2?');
    expect(html).toContain('What is 5-2?');
  });

  test('applies bold markdown formatting to question text', () => {
    const quiz = { tasks: [{ title: 'T', tier: 'MUST DO', questions: [{ question: 'Find **x** in the equation', answer: 1 }] }] };
    const html = generateQuizHTMLPreview(quiz);
    expect(html).toContain('<strong>x</strong>');
  });

  test('a quiz with no tasks still renders valid HTML with a 0-question total', () => {
    const html = generateQuizHTMLPreview({ tasks: [] });
    expect(html).toContain('0/0');
  });

  test('routes a relative imageUrl through SERVER_URL, leaves absolute URLs untouched', () => {
    const quiz = {
      tasks: [
        { title: 'T', tier: 'MUST DO', questions: [{ question: 'Q1', answer: 1, imageUrl: '/uploads/x.png' }] },
      ],
    };
    const html = generateQuizHTMLPreview(quiz);
    expect(html).toContain('https://server.test/uploads/x.png');
  });
});

describe('getAnsweredQuizHtml', () => {
  test('empty originalHtml returns empty string', () => {
    expect(getAnsweredQuizHtml('', { perQuestion: [] })).toBe('');
  });

  test('injects a script before </body> that pre-fills answers from perQuestion', () => {
    const html = '<html><body><div>quiz</div></body></html>';
    const result = getAnsweredQuizHtml(html, { perQuestion: [{ qId: 'q1', answer: '42', correct: true }] });
    expect(result).toContain('<script>');
    expect(result).toContain('"q1":"42"');
    expect(result.indexOf('<script>')).toBeLessThan(result.lastIndexOf('</body>'));
  });

  test('submission.studentAnswers is ignored — only perQuestion drives the injected answers', () => {
    const html = '<html><body></body></html>';
    const result = getAnsweredQuizHtml(html, {
      studentAnswers: { q1: 'should-not-appear' },
      perQuestion: [{ qId: 'q1', answer: 'real-answer' }],
    });
    expect(result).toContain('real-answer');
    expect(result).not.toContain('should-not-appear');
  });
});

describe('stripInternalQuizFields', () => {
  test('removes every underscore-prefixed key, keeps the rest', () => {
    const quiz = { title: 'Q', _previewHTML: '<html>', _editMode: true, tasks: [] };
    expect(stripInternalQuizFields(quiz)).toEqual({ title: 'Q', tasks: [] });
  });
  test('a quiz with no internal fields is returned unchanged in content', () => {
    const quiz = { title: 'Q', tasks: [] };
    expect(stripInternalQuizFields(quiz)).toEqual(quiz);
  });
});

describe('generateQuizHTMLPreview — worksheet pictures', () => {
  const quizWith = (q: any) => ({ tasks: [{ title: 'T', tier: 'MUST DO', questions: [{ question: 'Look', answer: 1, ...q }] }] });

  test('hosted and inline pictures are used as-is; only legacy relative paths get the server prefix', () => {
    expect(generateQuizHTMLPreview(quizWith({ imageUrl: 'https://res.cloudinary.com/a.png' }))).toContain('src="https://res.cloudinary.com/a.png"');
    expect(generateQuizHTMLPreview(quizWith({ imageUrl: 'data:image/png;base64,AAAA' }))).toContain('src="data:image/png;base64,AAAA"');
    expect(generateQuizHTMLPreview(quizWith({ imageUrl: '/data/images/quiz/x.png' }))).toContain('src="https://server.test/data/images/quiz/x.png"');
  });

  test('pictures are responsive (aspect kept), escaped, and fall back to a note if they fail', () => {
    const html = generateQuizHTMLPreview(quizWith({ imageUrl: 'https://x.test/a.png', diagramDescription: 'A "big" cat' }));
    expect(html).toContain('class="wk-img"');
    expect(html).toMatch(/\.wk-img\{[^}]*max-width:100%[^}]*\}/);
    expect(html).toMatch(/\.wk-img\{[^}]*height:auto[^}]*\}/);
    expect(html).toContain('alt="A &quot;big&quot; cat"');
    expect(html).toContain('onerror="wkImgError(this)"');
    expect(html.slice(0, html.indexOf('</head>'))).toContain('function wkImgError');
  });
});
