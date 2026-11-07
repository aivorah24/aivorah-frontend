import {
  taskPicture, questionPicture, setPicture, movePicture, setQuestionField, setAnswer, setOption, markCorrectOption,
} from '../quizEditing';

// MHLE-31 Task 3 as generated: the matching chart landed on item a).
const matchingQuiz = () => ({
  _previewHTML: '<html>old</html>',
  tasks: [{
    title: 'Task 3: Match the length and width to the area and perimeter',
    _matchTask: true,
    _wordBank: ['Area = 4, Perimeter = 8', 'Area = 12, Perimeter = 14'],
    questions: [
      { id: 'a', question: '1) Length = 2, Width = 2', answer: 'Area = 4, Perimeter = 8', imageUrl: 'https://x.test/chart.png',
        type: 'mcq', options: [{ label: 'Area = 12, Perimeter = 14', correct: false }, { label: 'Area = 4, Perimeter = 8', correct: true }] },
      { id: 'b', question: '2) Length = 3, Width = 4', answer: 'Area = 12, Perimeter = 14',
        type: 'mcq', options: [{ label: 'Area = 4, Perimeter = 8', correct: false }, { label: 'Area = 12, Perimeter = 14', correct: true }] },
    ],
  }],
});

describe('pictures', () => {
  test('a picture in an answer box (item a) moves up to the task, out of the item', () => {
    const before = matchingQuiz();
    const after = movePicture(before, 0, { kind: 'question', qi: 0 }, { kind: 'task' });
    expect(taskPicture(after.tasks[0])).toBe('https://x.test/chart.png');
    expect(questionPicture(after.tasks[0], 0)).toBeNull();
    expect(after.tasks[0].sharedImage).toBe(true);
    expect(after._previewHTML).toBeNull();
    expect(before.tasks[0].questions[0].imageUrl).toBe('https://x.test/chart.png'); // original untouched
  });

  test('a generated task picture (sharedImage on question 1) can be moved to another item', () => {
    const quiz = { tasks: [{ sharedImage: true, questions: [{ question: 'Q1', imageUrl: 'https://x.test/t.png' }, { question: 'Q2' }] }] };
    expect(taskPicture(quiz.tasks[0])).toBe('https://x.test/t.png');
    expect(questionPicture(quiz.tasks[0], 0)).toBeNull();
    const after = movePicture(quiz, 0, { kind: 'task' }, { kind: 'question', qi: 1 });
    expect(taskPicture(after.tasks[0])).toBeNull();
    expect(questionPicture(after.tasks[0], 0)).toBeNull();
    expect(questionPicture(after.tasks[0], 1)).toBe('https://x.test/t.png');
  });

  test('moving onto a picture swaps the two, so nothing is lost', () => {
    const quiz = { tasks: [{ questions: [{ question: 'Q1', imageUrl: 'https://x.test/1.png' }, { question: 'Q2', imageUrl: 'https://x.test/2.png' }] }] };
    const after = movePicture(quiz, 0, { kind: 'question', qi: 0 }, { kind: 'question', qi: 1 });
    expect(after.tasks[0].questions.map((q: any) => q.imageUrl)).toEqual(['https://x.test/2.png', 'https://x.test/1.png']);
  });

  test('question 1 can have its own picture next to the task picture', () => {
    const quiz = { tasks: [{ sharedImage: true, questions: [{ question: 'Q1', imageUrl: 'https://x.test/t.png' }] }] };
    const after = setPicture(quiz, 0, { kind: 'question', qi: 0 }, 'https://x.test/own.png');
    expect(taskPicture(after.tasks[0])).toBe('https://x.test/t.png');
    expect(questionPicture(after.tasks[0], 0)).toBe('https://x.test/own.png');
  });

  test('pictures can be removed and added', () => {
    const removed = setPicture(matchingQuiz(), 0, { kind: 'question', qi: 0 }, null);
    expect(removed.tasks[0].questions[0].imageUrl).toBeUndefined();
    expect(removed.tasks[0].questions[0].hasImage).toBe(false);
    const added = setPicture(removed, 0, { kind: 'task' }, 'https://x.test/new.png');
    expect(taskPicture(added.tasks[0])).toBe('https://x.test/new.png');
    const cleared = setPicture(added, 0, { kind: 'task' }, null);
    expect(taskPicture(cleared.tasks[0])).toBeNull();
  });
});

describe('text', () => {
  test('question, hint and solution are editable', () => {
    let q = setQuestionField(matchingQuiz(), 0, 1, 'question', '2) Length = 3, Width = 4 cm');
    q = setQuestionField(q, 0, 1, 'hint', 'Multiply');
    q = setQuestionField(q, 0, 1, 'solution', '3 x 4 = 12');
    expect(q.tasks[0].questions[1]).toMatchObject({ question: '2) Length = 3, Width = 4 cm', hint: 'Multiply', solution: '3 x 4 = 12' });
  });

  test('in a matching task an answer change renames that chip everywhere', () => {
    const after = setAnswer(matchingQuiz(), 0, 1, 'Area = 12, Perimeter = 14 cm');
    const labels = after.tasks[0].questions.map((q: any) => q.options.map((o: any) => o.label));
    expect(labels.flat().filter((l: string) => l.startsWith('Area = 12'))).toEqual(['Area = 12, Perimeter = 14 cm', 'Area = 12, Perimeter = 14 cm']);
    expect(after.tasks[0]._wordBank).toContain('Area = 12, Perimeter = 14 cm');
    expect(after.tasks[0].questions[1].options[1].correct).toBe(true);
  });

  test('MCQ: editing the correct option keeps it the answer; another option can be made correct', () => {
    const quiz = { tasks: [{ questions: [{ question: '2+2?', type: 'mcq', answer: '4', options: ['3', '4', '5'] }] }] };
    const edited = setOption(quiz, 0, 0, 1, 'four');
    expect(edited.tasks[0].questions[0]).toMatchObject({ answer: 'four', options: ['3', 'four', '5'] });
    const marked = markCorrectOption(edited, 0, 0, 2);
    expect(marked.tasks[0].questions[0].answer).toBe('5');
  });
});
