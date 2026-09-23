import { adaptTeacherContentToTopic } from '../adaptTeacherContent';

describe('adaptTeacherContentToTopic', () => {
  test('maps a real grounded Mathematics topic — worked_example, key_terms, explanation', () => {
    const content = {
      whatYoullLearn: ['Add fractions with different denominators'],
      contentType: 'mathematics',
      blocks: [
        { type: 'overview', text: 'This topic covers adding fractions with unlike denominators.' },
        { type: 'key_terms', items: [{ term: 'Common denominator', definition: 'A shared multiple of the denominators.' }] },
        {
          type: 'worked_example',
          problem: 'Add 5/6 and 2/9',
          concept: 'Adding unlike fractions',
          steps: [{ step: 1, action: 'Find a common denominator', equation: '6x9=54', why: 'so both fractions share a denominator' }],
          finalAnswer: '19/18',
        },
        { type: 'activity', text: 'Try adding 1/3 and 1/4 on your own.' },
      ],
    };

    const topic = adaptTeacherContentToTopic('Adding Fractions', content);

    expect(topic.name).toBe('Adding Fractions');
    expect(topic.readText.intro).toContain('adding fractions with unlike denominators');
    expect(topic.readText.keyLearnings).toEqual(['Add fractions with different denominators']);
    expect(topic.readText.vocab).toEqual([{ word: 'Common denominator', definition: 'A shared multiple of the denominators.' }]);
    expect(topic.readText.activity).toBe('Try adding 1/3 and 1/4 on your own.');
    expect(topic.readText.workedExamples).toEqual([
      { problem: 'Add 5/6 and 2/9', steps: ['Find a common denominator: 6x9=54'], answer: '19/18', synthetic: false },
    ]);
  });

  test('falls back to whatYoullLearn for intro when there is no overview/explanation block', () => {
    const topic = adaptTeacherContentToTopic('X', { whatYoullLearn: ['Learn X'], blocks: [] });
    expect(topic.readText.intro).toBe('Learn X');
  });

  test('handles vocabulary blocks (meaning field) as well as key_terms (definition field)', () => {
    const topic = adaptTeacherContentToTopic('X', {
      whatYoullLearn: [],
      blocks: [{ type: 'vocabulary', items: [{ term: 'Photosynthesis', meaning: 'How plants make food from light.' }] }],
    });
    expect(topic.readText.vocab).toEqual([{ word: 'Photosynthesis', definition: 'How plants make food from light.' }]);
  });

  test('produces no workedExamples field when the topic has none, so ListenTab falls back to prose steps', () => {
    const topic = adaptTeacherContentToTopic('X', { whatYoullLearn: [], blocks: [{ type: 'explanation', text: 'Plain theory text.' }] });
    expect(topic.readText.workedExamples).toBeUndefined();
    expect(topic.readText.intro).toBe('Plain theory text.');
  });

  test('maps an image block to figureUrl/figureCaption', () => {
    const topic = adaptTeacherContentToTopic('X', {
      whatYoullLearn: [],
      blocks: [{ type: 'image', url: 'https://cdn/x.png', caption: 'A number line', alt_text: 'A number line' }],
    });
    expect(topic.readText.figureUrl).toBe('https://cdn/x.png');
    expect(topic.readText.figureCaption).toBe('A number line');
  });

  test('maps the new step_number/explanation/calculation worked_example step shape and carries exampleType through', () => {
    const topic = adaptTeacherContentToTopic('X', {
      whatYoullLearn: [],
      blocks: [{
        type: 'worked_example',
        problem: '12 + 8 = ?',
        steps: [{ step_number: 1, explanation: 'Add the numbers', calculation: '12 + 8 = 20' }],
        finalAnswer: '20',
        synthetic: true,
        exampleType: 'GROUNDED_SYNTHETIC',
      }],
    });
    expect(topic.readText.workedExamples).toEqual([
      { problem: '12 + 8 = ?', steps: ['Add the numbers: 12 + 8 = 20'], answer: '20', synthetic: true, exampleType: 'GROUNDED_SYNTHETIC' },
    ]);
  });

  test('no image block means figureUrl stays undefined, never invented', () => {
    const topic = adaptTeacherContentToTopic('X', { whatYoullLearn: [], blocks: [] });
    expect(topic.readText.figureUrl).toBeUndefined();
  });

  test('maps content.listenParts to readText.listenParts (LessonScreen prefers these over prose narration)', () => {
    const listenParts = [{ heading: 'Intro', text: 'Numbers are everywhere.', keyIdea: 'Numbers describe quantity.', pauseThink: { question: 'What is a number?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 } }];
    const topic = adaptTeacherContentToTopic('X', { whatYoullLearn: [], blocks: [], listenParts });
    expect(topic.readText.listenParts).toEqual(listenParts);
  });

  test('maps content.book to pdfFile/bookPath/pdfPage so the existing BookPane/"View in Book" appears', () => {
    const book = { pdfFile: 'fecu105.pdf', bookPath: 'grade6/science/fecu105.pdf', bookTitle: 'Curiosity', chapterTitle: 'Nutrition', pdfPage: 8, confidence: 0.9 };
    const topic = adaptTeacherContentToTopic('X', { whatYoullLearn: [], blocks: [], book });
    expect(topic.pdfFile).toBe('fecu105.pdf');
    expect(topic.bookPath).toBe('grade6/science/fecu105.pdf');
    expect(topic.pdfPage).toBe(8);
  });

  test('older topics with no content.book leave pdfFile undefined, so no book pane/View in Book shows', () => {
    const topic = adaptTeacherContentToTopic('X', { whatYoullLearn: [], blocks: [] });
    expect(topic.pdfFile).toBeUndefined();
  });

  test('never throws on null/undefined content', () => {
    expect(() => adaptTeacherContentToTopic('X', null)).not.toThrow();
    expect(() => adaptTeacherContentToTopic('X', undefined)).not.toThrow();
    const topic = adaptTeacherContentToTopic('X', null);
    expect(topic.readText.intro).toBe('');
    expect(topic.readText.vocab).toEqual([]);
  });
});
