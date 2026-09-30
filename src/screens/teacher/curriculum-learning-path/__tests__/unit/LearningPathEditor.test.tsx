import React from 'react';
import { render, screen, waitFor, userEvent, fireEvent } from '@testing-library/react-native';
import LearningPathEditor from '../../components/LearningPathEditor';
import { LearningPathContent } from '../../types';

const mockGetBookSections = jest.fn();
jest.mock('../../../../student/learning-paths/lesson-screen/LessonScreen', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => (
      <View testID="lesson-view">
        <Text testID="lesson-view-params">{JSON.stringify({
          topicName: props.route.params.topicName, grade: props.route.params.grade, subject: props.route.params.subject,
          embedded: props.embedded, pdfFile: props.route.params.teacherContent?.book?.pdfFile,
        })}</Text>
        {props.practiceSlot}
      </View>
    ),
  };
});
jest.mock('../../services/curriculumLearningPathService', () => ({ getBookSections: (...a: any[]) => mockGetBookSections(...a) }));

function baseContent(): LearningPathContent {
  return {
    version: 1,
    units: [{
      title: 'Numbers', order: 0,
      topics: [{
        title: 'Whole Numbers', order: 0,
        objectives: ['Add two numbers'],
        lessons: [{ title: 'Intro', summary: 'Basics' }],
        subtopics: [{ title: 'Addition', order: 0 }],
      }],
    }],
  };
}

describe('LearningPathEditor', () => {
  function reviewContent(): LearningPathContent {
    const book = (pdfFile: string) => ({ pdfFile, bookPath: null, bookTitle: 'Ganita Prakash', chapterTitle: 'Ch', pdfPage: 3, confidence: 10 });
    return {
      version: 1,
      metadata: { grade: '6', subject: 'Mathematics', curriculum: 'CBSE' },
      units: [
        { title: 'Numbers', order: 0, topics: [
          { title: 'Number line', order: 0, objectives: ['x'], lessons: [], subtopics: [], groundingSource: 'ncert_book', status: 'ready',
            content: { whatYoullLearn: ['x'], blocks: [{ type: 'overview', text: 'o' }], book: book('fegp103.pdf'),
              practiceQuiz: [
                { type: 'mcq', question: '2 + 2?', options: ['3', '4'], correct: 1, explanation: 'Add them.' },
                { type: 'fill_blank', question: 'After 9 comes?', options: [], correct: '10' },
              ] } },
          { title: 'Whole Numbers', order: 1, objectives: ['x'], lessons: [], subtopics: [], groundingSource: 'ncert_book', status: 'ready',
            content: { whatYoullLearn: ['x'], blocks: [], aiWrittenSubtopics: ['Successor'] } as any },
        ] },
        { title: 'Shapes', order: 1, topics: [
          { title: 'Triangles', order: 0, objectives: ['x'], lessons: [], subtopics: [], groundingSource: 'model_knowledge', status: 'needs_teacher_input',
            teacherHint: 'Add content for: Triangles', content: null },
        ] },
      ],
    };
  }

  test('lists every unit and topic with where its content came from', async () => {
    await render(<LearningPathEditor content={reviewContent()} onChange={jest.fn()} />);
    expect(screen.getAllByText('Numbers').length).toBeGreaterThan(0);
    expect(screen.getByTestId('topic-badge-0-0').props.children).toBe('From the book');
    expect(screen.getByTestId('topic-badge-0-1').props.children).toBe('Book + AI parts');
    expect(screen.getByTestId('topic-badge-1-0').props.children).toBe('Needs your input');
  });

  test('the selected topic is shown in the real student lesson screen, embedded', async () => {
    await render(<LearningPathEditor content={reviewContent()} onChange={jest.fn()} />);
    expect(JSON.parse(screen.getByTestId('lesson-view-params').props.children)).toEqual({
      topicName: 'Number line', grade: 'Grade 6', subject: 'Mathematics', embedded: true, pdfFile: 'fegp103.pdf',
    });
  });

  test('picking another topic switches the lesson shown', async () => {
    const user = userEvent.setup();
    await render(<LearningPathEditor content={reviewContent()} onChange={jest.fn()} />);
    await user.press(screen.getByTestId('topic-0-1'));
    expect(JSON.parse(screen.getByTestId('lesson-view-params').props.children).topicName).toBe('Whole Numbers');
    expect(screen.getByTestId('ai-written-note').props.children).toEqual(['Not in the book, explained by AI — please check: ', 'Successor']);
  });

  test('Practice shows each question with the correct answer marked', async () => {
    await render(<LearningPathEditor content={reviewContent()} onChange={jest.fn()} />);
    expect(screen.getByTestId('practice-preview')).toBeTruthy();
    expect(screen.getByText('✓ 4')).toBeTruthy();
    expect(screen.getByText('○ 3')).toBeTruthy();
    expect(screen.getByText('Answer: 10')).toBeTruthy();
  });

  test('editing the topic title calls onChange with only that title changed', async () => {
    const content = reviewContent();
    const onChange = jest.fn();
    await render(<LearningPathEditor content={content} onChange={onChange} />);
    fireEvent.changeText(screen.getByTestId('topic-title-0-0'), 'The number line');
    const next = onChange.mock.calls[0][0];
    expect(next.units[0].topics[0].title).toBe('The number line');
    expect(next.units[0].topics[1]).toBe(content.units[0].topics[1]);
    expect(next.units[1]).toBe(content.units[1]);
  });

  test('a topic that needs input shows the hint, and says there is no lesson yet', async () => {
    const user = userEvent.setup();
    await render(<LearningPathEditor content={reviewContent()} onChange={jest.fn()} />);
    await user.press(screen.getByTestId('topic-1-0'));
    expect(screen.getByTestId('needs-input-banner-1-0')).toBeTruthy();
    expect(screen.getByTestId('teacher-hint-1-0').props.children).toBe('Add content for: Triangles');
    expect(screen.getByTestId('no-lesson-content')).toBeTruthy();
    expect(screen.queryByTestId('lesson-view')).toBeNull();
  });

  test('IB: topics say "From reference material", the Edit button has no book pages and there is no NCERT picker', async () => {
    const content = reviewContent();
    content.metadata = { grade: '6', subject: 'Mathematics', curriculum: 'IB MYP' };
    content.units[0].topics[0].groundingSource = 'reference_sources';
    content.units[0].topics[0].content!.book = undefined;
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} onRebuildTopic={jest.fn()} />);
    expect(screen.getByTestId('topic-badge-0-0').props.children).toBe('From reference material · check');
    expect(screen.getByText('Edit')).toBeTruthy();
    await user.press(screen.getByTestId('edit-topic-0-0'));
    expect(screen.getByTestId('preview-no-book')).toBeTruthy();
    expect(screen.queryByTestId('change-book-pages')).toBeNull();
  });

  test('style suggestions from the quality check are shown as advice the teacher can expand', async () => {
    const content = reviewContent();
    content.units[0].topics[0].quality = { readingGrade: 8.4, sentenceLength: 14, judgeScores: null, issues: ['Learn text reading grade 8.4 is too high for Grade 6', '1 explanation block(s) are too short (under 15 words)'] };
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
    expect(screen.getByText('▸ Suggestions to improve this topic (2)')).toBeTruthy();
    expect(screen.queryByTestId('quality-advice-0')).toBeNull();
    await user.press(screen.getByText('▸ Suggestions to improve this topic (2)'));
    expect(screen.getByTestId('quality-advice-1').props.children).toEqual(['•', ' ', '1 explanation block(s) are too short (under 15 words)']);
  });

  test('a topic without a lesson offers "Generate lesson again" and retries just that topic', async () => {
    const content = reviewContent();
    const onRebuildTopic = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} onRebuildTopic={onRebuildTopic} />);
    await user.press(screen.getByTestId('topic-1-0'));

    await user.press(screen.getByTestId('regenerate-topic'));
    expect(onRebuildTopic).toHaveBeenCalledWith(1, 0, [[]]);
  });

  test('a failed retry says so and keeps the button', async () => {
    const content = reviewContent();
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} onRebuildTopic={jest.fn().mockRejectedValue(new Error('AI busy, try later'))} />);
    await user.press(screen.getByTestId('topic-1-0'));
    await user.press(screen.getByTestId('regenerate-topic'));
    await waitFor(() => expect(screen.getByTestId('regenerate-error').props.children).toBe('AI busy, try later'));
    expect(screen.getByTestId('regenerate-topic')).toBeTruthy();
  });

  test('read only: the title cannot be edited and there is no Edit button', async () => {
    await render(<LearningPathEditor content={reviewContent()} onChange={jest.fn()} readOnly />);
    expect(screen.getByTestId('topic-title-0-0').props.editable).toBe(false);
    expect(screen.queryByTestId('edit-topic-0-0')).toBeNull();
  });

  test('Edit opens the edit panel for the selected topic, and closes it', async () => {
    const user = userEvent.setup();
    await render(<LearningPathEditor content={reviewContent()} onChange={jest.fn()} />);
    await user.press(screen.getByTestId('edit-topic-0-0'));
    expect(screen.getByTestId('student-preview-scroll')).toBeTruthy();
    await user.press(screen.getByTestId('close-student-preview'));
    expect(screen.queryByTestId('student-preview-scroll')).toBeNull();
  });

  test('the edit panel falls back to objectives/lessons when the topic has no lesson content', async () => {
    const content = baseContent();
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
    await user.press(screen.getByTestId('edit-topic-0-0'));
    expect(screen.getByTestId('student-preview-fallback')).toBeTruthy();
    expect(screen.getByText('Intro')).toBeTruthy();
  });

  describe('student preview — three tabs (Learn / Audio / Practice)', () => {
    function contentWithAudioAndPractice(): LearningPathContent {
      const content = baseContent();
      content.units[0].topics[0].content = {
        whatYoullLearn: ['Understand place value'],
        blocks: [{ type: 'explanation', text: 'A number line shows relative size.' }],
        listenParts: [{
          heading: 'Step 1', text: 'Numbers show how many.', keyIdea: 'Quantity',
          pauseThink: { question: 'What is a digit?', options: ['A symbol', 'A word', 'A shape', 'A color'], correctIndex: 0 },
        }],
        practiceQuiz: [{ type: 'mcq', question: 'What is 2+2?', options: ['3', '4', '5', '6'], correct: 1, hint: 'h', explanation: 'e' }],
      };
      return content;
    }

    test('switches between Learn, Audio and Practice tabs', async () => {
      const content = contentWithAudioAndPractice();
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));

      expect(screen.getByDisplayValue('A number line shows relative size.')).toBeTruthy();

      await user.press(screen.getByTestId('preview-tab-audio'));
      expect(screen.getByTestId('listen-part-0')).toBeTruthy();
      expect(screen.getByText('Step 1')).toBeTruthy();

      await user.press(screen.getByTestId('preview-tab-practice'));
      expect(screen.getByTestId('practice-question-0')).toBeTruthy();
    });

    test('labels the audio tab "AI Tutor" for a Math topic and "Listen" otherwise', async () => {
      const mathContent = contentWithAudioAndPractice();
      mathContent.units[0].topics[0].content!.contentType = 'mathematics';
      const user = userEvent.setup();
      await render(<LearningPathEditor content={mathContent} onChange={jest.fn()} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));
      expect(screen.getByText('AI Tutor')).toBeTruthy();
    });

    test('editing an audio part text updates via onChange (updateContent -> save path)', async () => {
      const content = contentWithAudioAndPractice();
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={onChange} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));
      await user.press(screen.getByTestId('preview-tab-audio'));

      await user.type(screen.getByTestId('listen-part-text-0'), 'X');

      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const updated = onChange.mock.calls[0][0];
      expect(updated.units[0].topics[0].content.listenParts[0].text).toBe('Numbers show how many.X');
    });

    test('changing the pause-think correct option updates correctIndex', async () => {
      const content = contentWithAudioAndPractice();
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={onChange} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));
      await user.press(screen.getByTestId('preview-tab-audio'));

      await user.press(screen.getByTestId('listen-part-correct-0-2'));

      const updated = onChange.mock.calls[0][0];
      expect(updated.units[0].topics[0].content.listenParts[0].pauseThink.correctIndex).toBe(2);
    });

    test('editing a practice question option and correct answer updates via onChange', async () => {
      const content = contentWithAudioAndPractice();
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={onChange} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));
      await user.press(screen.getByTestId('preview-tab-practice'));

      await user.press(screen.getByTestId('practice-correct-0-2'));

      const updated = onChange.mock.calls[0][0];
      expect(updated.units[0].topics[0].content.practiceQuiz[0].correct).toBe(2);
    });

    test('shows the teacher outline when the topic has no content.book', async () => {
      const content = contentWithAudioAndPractice();
      await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
      await userEvent.setup().press(screen.getByTestId('edit-topic-0-0'));
      expect(screen.getByTestId('preview-no-book')).toBeTruthy();
      expect(screen.getByText('YOUR OUTLINE')).toBeTruthy();
    });

    test('book pane: a page chip per subtopic, other-grade label, "not in book" chip disabled', async () => {
      const content = contentWithAudioAndPractice();
      content.metadata = { grade: '6', subject: 'Mathematics' };
      content.units[0].topics[0].groundingSource = 'ncert_book';
      content.units[0].topics[0].content!.book = {
        pdfFile: 'fegp102.pdf', bookPath: 'grade6/mathematics/fegp102.pdf', bookTitle: 'Ganita Prakash',
        chapterTitle: 'Lines and Angles', pdfPage: 3, confidence: 10, grade: 6,
        pages: [
          { subtopic: 'Rays', pdfFile: 'fegp102.pdf', bookPath: 'grade6/mathematics/fegp102.pdf', chapterTitle: 'Lines and Angles', grade: 6, pdfPage: 3, section: '2.4 Ray' },
          { subtopic: 'Comparing decimals', pdfFile: 'gegp103.pdf', bookPath: 'grade7/mathematics/gegp103.pdf', chapterTitle: 'A Peek Beyond the Point', grade: 7, pdfPage: 28, section: '3.6' },
          { subtopic: 'Successor', pdfFile: null },
        ],
      };
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));

      expect(screen.getByTestId('preview-source-note').props.children).toContain('2 of 3 subtopics in the book; the rest taught by AI');
      expect(screen.queryByTestId('preview-book-other-grade')).toBeNull();
      await user.press(screen.getByTestId('book-page-chip-1'));
      expect(screen.getByTestId('preview-book-other-grade').props.children).toEqual(['From Grade ', 7, ' book']);
      expect(screen.getByText('Successor · not in book, taught by AI · check')).toBeTruthy();
    });

    test('teacher picks book sections per subtopic and rebuilds the topic', async () => {
      const content = contentWithAudioAndPractice();
      content.metadata = { grade: '6', subject: 'Mathematics' };
      content.units[0].topics[0].subtopics = [{ title: 'Number line', order: 0 }, { title: 'Successor', order: 1 }];
      mockGetBookSections.mockResolvedValueOnce({ sections: [
        { grade: 6, pdfFile: 'fegp103.pdf', bookPath: null, bookTitle: null, chapterTitle: 'Number Play', title: '3.3 Patterns on the Number Line', page: 5 },
      ] });
      const onRebuildTopic = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={jest.fn()} onRebuildTopic={onRebuildTopic} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));
      await user.press(screen.getByTestId('change-book-pages'));

      await waitFor(() => expect(screen.getByTestId('picker-option-0')).toBeTruthy());
      expect(mockGetBookSections).toHaveBeenCalledWith('6', 'Mathematics');
      await user.press(screen.getByTestId('picker-option-0'));
      await user.press(screen.getByTestId('picker-rebuild'));

      expect(onRebuildTopic).toHaveBeenCalledWith(0, 0, [[{ pdfFile: 'fegp103.pdf', title: '3.3 Patterns on the Number Line' }], []]);
      await waitFor(() => expect(screen.queryByTestId('book-section-picker')).toBeNull());
    });

    test('a failed rebuild shows the error and keeps the picker open', async () => {
      const content = contentWithAudioAndPractice();
      content.metadata = { grade: '6', subject: 'Mathematics' };
      mockGetBookSections.mockResolvedValueOnce({ sections: [] });
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={jest.fn()} onRebuildTopic={jest.fn().mockRejectedValue(new Error('Try again later'))} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));
      await user.press(screen.getByTestId('change-book-pages'));
      await user.press(screen.getByTestId('picker-rebuild'));
      await waitFor(() => expect(screen.getByTestId('picker-error').props.children).toBe('Try again later'));
      expect(screen.getByTestId('book-section-picker')).toBeTruthy();
    });

    test('the Maths AI Tutor tab edits the tutor script the student actually hears', async () => {
      const content = contentWithAudioAndPractice();
      content.units[0].topics[0].content!.contentType = 'mathematics';
      content.units[0].topics[0].content!.mathTutor = {
        intro: 'Numbers sit on a line.',
        examples: [{ title: 'Placing 7', problem: 'Where is 7?', steps: [{ say: 'Count from 0', show: '0..7' }], answer: 'Right of 6', yourTurn: { question: 'After 9?', answer: '10' } }],
      };
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={onChange} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));
      await user.press(screen.getByTestId('preview-tab-audio'));

      expect(screen.getByTestId('math-tutor-editor')).toBeTruthy();
      await fireEvent.changeText(screen.getByTestId('tutor-say-0-0'), 'Start counting at zero');
      const tutor = onChange.mock.calls.at(-1)[0].units[0].topics[0].content.mathTutor;
      expect(tutor.examples[0].steps[0]).toEqual({ say: 'Start counting at zero', show: '0..7' });
      await fireEvent.changeText(screen.getByTestId('tutor-yourturn-a-0'), 'ten');
      expect(onChange.mock.calls.at(-1)[0].units[0].topics[0].content.mathTutor.examples[0].yourTurn).toEqual({ question: 'After 9?', answer: 'ten' });
    });

    test('book section picker: own grade first, search filters, up to two sections per subtopic', async () => {
      const content = contentWithAudioAndPractice();
      content.metadata = { grade: '6', subject: 'Mathematics' };
      content.units[0].topics[0].subtopics = [{ title: 'Rays and angles', order: 0 }];
      mockGetBookSections.mockResolvedValueOnce({ sections: [
        { grade: 7, pdfFile: 'gegp105.pdf', bookPath: null, bookTitle: null, chapterTitle: 'Parallel Lines', title: '5.1 Across the Line', page: 1 },
        { grade: 6, pdfFile: 'fegp102.pdf', bookPath: null, bookTitle: null, chapterTitle: 'Lines and Angles', title: '2.4 Ray', page: 3 },
        { grade: 6, pdfFile: 'fegp102.pdf', bookPath: null, bookTitle: null, chapterTitle: 'Lines and Angles', title: '2.5 Angle', page: 5 },
      ] });
      const onRebuildTopic = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={jest.fn()} onRebuildTopic={onRebuildTopic} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));
      await user.press(screen.getByTestId('change-book-pages'));
      await waitFor(() => expect(screen.getByTestId('picker-option-0')).toBeTruthy());

      expect(screen.getByText('2.4 Ray · p.3')).toBeTruthy();
      expect(screen.getByTestId('picker-option-2')).toBeTruthy();
      await fireEvent.changeText(screen.getByTestId('picker-search'), 'angle');
      expect(screen.queryByText('5.1 Across the Line · p.1')).toBeNull();
      await user.press(screen.getByText('2.5 Angle · p.5'));
      await fireEvent.changeText(screen.getByTestId('picker-search'), 'ray');
      await user.press(screen.getByText('2.4 Ray · p.3'));
      await user.press(screen.getByTestId('picker-rebuild'));

      expect(onRebuildTopic).toHaveBeenCalledWith(0, 0, [[
        { pdfFile: 'fegp102.pdf', title: '2.5 Angle' },
        { pdfFile: 'fegp102.pdf', title: '2.4 Ray' },
      ]]);
    });

    test('Learn text can be edited and saved via onChange', async () => {
      const content = contentWithAudioAndPractice();
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={onChange} />);
      await user.press(screen.getByTestId('edit-topic-0-0'));
      // The edit panel opens with Learn ready to edit.

      fireEvent.changeText(screen.getByTestId('block-0-text'), 'Edited by teacher.');
      expect(onChange.mock.calls.at(-1)[0].units[0].topics[0].content.blocks[0].text).toBe('Edited by teacher.');

      await user.press(screen.getByTestId('remove-block-0'));
      expect(onChange.mock.calls.at(-1)[0].units[0].topics[0].content.blocks).toEqual([]);
    });

    test('shows the real textbook pane when content.book is present', async () => {
      const content = contentWithAudioAndPractice();
      content.units[0].topics[0].content!.book = {
        pdfFile: 'fecu105.pdf', bookPath: 'grade6/science/fecu105.pdf', bookTitle: 'Curiosity',
        chapterTitle: 'Nutrition', pdfPage: 8, confidence: 0.9,
      };
      await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
      await userEvent.setup().press(screen.getByTestId('edit-topic-0-0'));
      expect(screen.getByTestId('preview-book-pane')).toBeTruthy();
    });

  });
});
