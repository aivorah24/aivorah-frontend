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
      { problem: 'Add 5/6 and 2/9', steps: ['Find a common denominator: 6x9=54'], answer: '19/18' },
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

  test('never throws on null/undefined content', () => {
    expect(() => adaptTeacherContentToTopic('X', null)).not.toThrow();
    expect(() => adaptTeacherContentToTopic('X', undefined)).not.toThrow();
    const topic = adaptTeacherContentToTopic('X', null);
    expect(topic.readText.intro).toBe('');
    expect(topic.readText.vocab).toEqual([]);
  });
});
