import {
  applySubjectEdits, outlineOf, chapterKeyOf, topicKeyOf, EMPTY_EDITS,
  renameChapter, toggleChapterHidden, moveChapter, addChapter, renameTopic, toggleTopicHidden, moveTopic, addTopic,
  removeAdded, setLesson, resetLesson, lessonAsTeacherContent, type SubjectEdits,
} from '../subjectEdits';

const BASE = [
  { title: 'Patterns', pdfFile: 'fegp101.pdf', topics: [{ name: 'What is a pattern' }, { name: 'Number patterns' }] },
  { title: 'Lines and Angles', pdfFile: 'fegp102.pdf', topics: [{ name: 'Point' }, { name: 'Line' }] },
  { title: 'Number Play', pdfFile: 'fegp103.pdf', topics: [{ name: 'Numbers' }] },
];
const C1 = chapterKeyOf(BASE[0]);
const C2 = chapterKeyOf(BASE[1]);
const T11 = topicKeyOf(C1, 'What is a pattern');
const run = (...ops: ((b: any, e: SubjectEdits) => SubjectEdits)[]) => ops.reduce((e, op) => op(BASE, e), EMPTY_EDITS);

test('no edits gives the standard path', () => {
  const out = applySubjectEdits(BASE, null);
  expect(out.map((c) => c.title)).toEqual(['Patterns', 'Lines and Angles', 'Number Play']);
  expect(out[0].topics.map((t) => t.name)).toEqual(['What is a pattern', 'Number patterns']);
});

test('rename, reorder and hide chapters and topics', () => {
  const edits = run(
    renameChapter(C1, 'Patterns Everywhere'),
    moveChapter(C2, -1),
    toggleChapterHidden(chapterKeyOf(BASE[2])),
    renameTopic(C1, T11, 'Spotting patterns'),
    moveTopic(C1, T11, 1),
    toggleTopicHidden(C2, topicKeyOf(C2, 'Point')),
  );
  const student = applySubjectEdits(BASE, edits);
  expect(student.map((c) => c.title)).toEqual(['Lines and Angles', 'Patterns Everywhere']);
  expect(student[0].topics.map((t) => t.name)).toEqual(['Line']);
  expect(student[1].topics.map((t) => t.name)).toEqual(['Number patterns', 'Spotting patterns']);

  const teacher = applySubjectEdits(BASE, edits, { keepHidden: true });
  expect(teacher).toHaveLength(3);
  expect(teacher[2].hidden).toBe(true);
  expect(teacher[1].renamed).toBe(true);
});

test('added chapters and topics carry the teacher lesson; only added ones can be removed', () => {
  let edits = run(addChapter('Revision', 'new-chapter:r'), addTopic('new-chapter:r', 'Mixed practice', 'new-chapter:r::t'));
  edits = setLesson('new-chapter:r::t', { blocks: [{ type: 'explanation', text: 'Try these.' }] })(BASE, edits);
  const out = applySubjectEdits(BASE, edits);
  expect(out[3]).toEqual(expect.objectContaining({ title: 'Revision', added: true }));
  expect(out[3].topics[0]).toEqual(expect.objectContaining({ name: 'Mixed practice', added: true, lessonEdit: { blocks: [{ type: 'explanation', text: 'Try these.' }] } }));

  expect(removeAdded(C1)(BASE, edits)).toBe(edits);
  const removed = removeAdded('new-chapter:r')(BASE, edits);
  expect(applySubjectEdits(BASE, removed)).toHaveLength(3);
  expect(removed.topics).toEqual({});
});

test('a chapter newly added to the book appears after its neighbour, not lost', () => {
  const edits = run(moveChapter(C2, -1));
  const grown = [...BASE.slice(0, 1), { title: 'Fractions', pdfFile: 'fegp10x.pdf', topics: [] }, ...BASE.slice(1)];
  expect(outlineOf(grown, edits).map((c) => c.key)).toEqual([C2, C1, 'pdf:fegp10x.pdf', 'pdf:fegp103.pdf']);
});

test('reset brings the original lesson back', () => {
  const edits = run(setLesson(T11, { whatYoullLearn: ['x'] }), resetLesson(T11));
  expect(edits.topics).toEqual({});
});

test('a written-from-scratch lesson becomes teacher content for the lesson screen', () => {
  expect(lessonAsTeacherContent({ practiceQuiz: [{ question: 'Q', options: ['a', 'b'], correctIndex: 1 }], listenScript: [{ heading: 'H', text: 'T', card: 0 }] })).toEqual({
    whatYoullLearn: [], blocks: [], listenParts: [{ heading: 'H', text: 'T' }],
    practiceQuiz: [{ type: 'mcq', question: 'Q', options: ['a', 'b'], correct: 1, explanation: '' }],
  });
});
