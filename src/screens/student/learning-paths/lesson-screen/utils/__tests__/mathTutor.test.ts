import { buildMathTutorSteps } from '../mathTutor';

const tutor = {
  intro: 'In this unit we learn square roots.',
  keyIdea: 'If y = x^2, then x is the square root of y.',
  examples: [
    {
      title: 'Repeated subtraction', problem: 'Consider $\\sqrt{81}$.', page: 8,
      steps: [{ say: 'Take away 1', show: '81 − 1 = 80' }, { say: 'Count the steps.', show: '' }],
      answer: '9', why: 'A square is a sum of odd numbers.', hint: 'Start from 1.',
      yourTurn: { question: 'Find √64 the same way.', answer: '8, because 8 × 8 = 64' },
    },
    { title: 'Broken', problem: '', steps: [{ say: 'x' }], answer: '1' },
  ],
};

describe('buildMathTutorSteps', () => {
  test('intro first with its key idea, then one step per valid book example; broken examples are skipped', () => {
    const steps = buildMathTutorSteps({ mathTutor: tutor })!;
    expect(steps.map((s) => s.label)).toEqual(['Introduction', 'Repeated subtraction']);
    expect(steps[0].keyIdea).toBe('If y = x², then x is the square root of y.');
  });

  test('each spoken line is a tutor line and the board gets one working line per step, with maths made readable', () => {
    const ex = buildMathTutorSteps({ mathTutor: tutor })![1];
    expect(ex.lines).toEqual([{ speaker: 'Tutor', text: 'Take away 1.' }, { speaker: 'Tutor', text: 'Count the steps.' }]);
    expect(ex.math).toEqual({
      problem: 'Consider √81.', shows: ['81 − 1 = 80', ''], answer: '9', why: 'A square is a sum of odd numbers.', hint: 'Start from 1.', page: 8,
      yourTurn: { question: 'Find √64 the same way.', answer: '8, because 8 × 8 = 64' },
    });
  });

  test('no tutor, or no valid example, means the old behaviour', () => {
    expect(buildMathTutorSteps({})).toBeNull();
    expect(buildMathTutorSteps({ mathTutor: { examples: [tutor.examples[1]] } })).toBeNull();
  });
});
