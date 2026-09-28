import React from 'react';
import { render, screen, waitFor, userEvent, fireEvent } from '@testing-library/react-native';
import LearningPathEditor from '../../components/LearningPathEditor';
import { LearningPathContent } from '../../types';

const mockGetBookSections = jest.fn();
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
  test('editing the unit title calls onChange with the updated content, everything else untouched', async () => {
    const content = baseContent();
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={onChange} />);

    await user.type(screen.getByTestId('unit-title-0'), 'X');

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const updated = onChange.mock.calls[0][0];
    expect(updated.units[0].topics[0].title).toBe('Whole Numbers');
  });

  test('adding an objective appends a new blank entry', async () => {
    const content = baseContent();
    let current = content;
    const onChange = jest.fn((next) => { current = next; });
    const user = userEvent.setup();
    const { rerender } = await render(<LearningPathEditor content={content} onChange={onChange} />);

    await user.press(screen.getByTestId('add-objective-0-0'));

    expect(current.units[0].topics[0].objectives).toEqual(['Add two numbers', '']);
    await rerender(<LearningPathEditor content={current} onChange={onChange} />);
    expect(screen.getByTestId('objective-0-0-1')).toBeTruthy();
  });

  test('removing a lesson drops it from the topic', async () => {
    const content = baseContent();
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={onChange} />);

    await user.press(screen.getByTestId('remove-lesson-0-0-0'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      units: [expect.objectContaining({ topics: [expect.objectContaining({ lessons: [] })] })],
    }));
  });

  test('readOnly disables every input and hides mutation controls', async () => {
    const content = baseContent();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} readOnly />);

    expect(screen.getByTestId('unit-title-0').props.editable).toBe(false);
    expect(screen.queryByTestId('add-objective-0-0')).toBeNull();
    expect(screen.queryByTestId('remove-lesson-0-0-0')).toBeNull();
  });

  test('renders subtopics read-only regardless of edit mode', async () => {
    const content = baseContent();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
    expect(screen.getByTestId('subtopic-0-0-0').props.children).toBe('Addition');
  });

  test('renders the needs-your-input badge and hint when a topic needs teacher input', async () => {
    const content = baseContent();
    content.units[0].topics[0].status = 'needs_teacher_input';
    content.units[0].topics[0].teacherHint = 'Specify whether this covers area formulas, angle sums, or proofs.';
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);

    expect(screen.getByTestId('needs-input-banner-0-0')).toBeTruthy();
    expect(screen.getByText('Needs your input')).toBeTruthy();
    expect(screen.getByTestId('teacher-hint-0-0').props.children).toBe(
      'Specify whether this covers area formulas, angle sums, or proofs.'
    );
  });

  test('does not render the banner when status is omitted', async () => {
    const content = baseContent();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
    expect(screen.queryByTestId('needs-input-banner-0-0')).toBeNull();
  });

  test('does not render the banner when status is "ready"', async () => {
    const content = baseContent();
    content.units[0].topics[0].status = 'ready';
    content.units[0].topics[0].teacherHint = null;
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
    expect(screen.queryByTestId('needs-input-banner-0-0')).toBeNull();
  });

  test('renders the AI-knowledge note when groundingSource is model_knowledge', async () => {
    const content = baseContent();
    content.units[0].topics[0].groundingSource = 'model_knowledge';
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
    expect(screen.getByTestId('model-knowledge-note-0-0')).toBeTruthy();
  });

  test('does not render the AI-knowledge note for other grounding sources', async () => {
    const content = baseContent();
    content.units[0].topics[0].groundingSource = 'ncert_vector';
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
    expect(screen.queryByTestId('model-knowledge-note-0-0')).toBeNull();
  });

  test('opens the student preview modal showing grounded content.blocks, and closes it', async () => {
    const content = baseContent();
    content.units[0].topics[0].content = {
      whatYoullLearn: ['Understand place value'],
      blocks: [{ type: 'explanation', text: 'A number line shows relative size.' }],
    };
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);

    expect(screen.queryByTestId('student-preview-scroll')).toBeNull();
    await user.press(screen.getByTestId('preview-as-student-0-0'));

    expect(screen.getByTestId('student-preview-scroll')).toBeTruthy();
    expect(screen.getByText('A number line shows relative size.')).toBeTruthy();
    expect(screen.queryByTestId('student-preview-fallback')).toBeNull();

    await user.press(screen.getByTestId('close-student-preview'));
    expect(screen.queryByTestId('student-preview-scroll')).toBeNull();
  });

  test('student preview falls back to objectives/lessons when the topic has no grounded content', async () => {
    const content = baseContent();
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);

    await user.press(screen.getByTestId('preview-as-student-0-0'));

    expect(screen.getByTestId('student-preview-fallback')).toBeTruthy();
    expect(screen.getByText(/Add two numbers/)).toBeTruthy();
    expect(screen.getByText('Intro')).toBeTruthy();
  });

  test('shows the visuals count for a topic with image blocks', async () => {
    const content = baseContent();
    content.units[0].topics[0].content = {
      whatYoullLearn: [],
      blocks: [
        { type: 'explanation', text: 'x' },
        { type: 'image', url: 'https://cdn/a.png', caption: 'A' },
        { type: 'image', url: 'https://cdn/b.png', caption: 'B' },
      ],
    };
    await render(<LearningPathEditor content={content} onChange={jest.fn()} />);

    expect(screen.getByText('Visuals: 2')).toBeTruthy();
  });

  test('removing an image drops only that image block via updateContent', async () => {
    const content = baseContent();
    content.units[0].topics[0].content = {
      whatYoullLearn: [],
      blocks: [
        { type: 'explanation', text: 'x' },
        { type: 'image', url: 'https://cdn/a.png', caption: 'A' },
        { type: 'image', url: 'https://cdn/b.png', caption: 'B' },
      ],
    };
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<LearningPathEditor content={content} onChange={onChange} />);

    await user.press(screen.getByTestId('remove-image-0-0-0'));

    const updated = onChange.mock.calls[0][0];
    const blocks = updated.units[0].topics[0].content.blocks;
    expect(blocks.filter((b: any) => b.type === 'image')).toHaveLength(1);
    expect(blocks.find((b: any) => b.type === 'image').url).toBe('https://cdn/b.png');
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
      await user.press(screen.getByTestId('preview-as-student-0-0'));

      expect(screen.getByText('A number line shows relative size.')).toBeTruthy();

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
      await user.press(screen.getByTestId('preview-as-student-0-0'));
      expect(screen.getByText('AI Tutor')).toBeTruthy();
    });

    test('editing an audio part text updates via onChange (updateContent -> save path)', async () => {
      const content = contentWithAudioAndPractice();
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={onChange} />);
      await user.press(screen.getByTestId('preview-as-student-0-0'));
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
      await user.press(screen.getByTestId('preview-as-student-0-0'));
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
      await user.press(screen.getByTestId('preview-as-student-0-0'));
      await user.press(screen.getByTestId('preview-tab-practice'));

      await user.press(screen.getByTestId('practice-correct-0-2'));

      const updated = onChange.mock.calls[0][0];
      expect(updated.units[0].topics[0].content.practiceQuiz[0].correct).toBe(2);
    });

    test('shows the teacher outline when the topic has no content.book', async () => {
      const content = contentWithAudioAndPractice();
      await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
      await userEvent.setup().press(screen.getByTestId('preview-as-student-0-0'));
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
      await user.press(screen.getByTestId('preview-as-student-0-0'));

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
      await user.press(screen.getByTestId('preview-as-student-0-0'));
      await user.press(screen.getByTestId('change-book-pages'));

      await waitFor(() => expect(screen.getByTestId('picker-option-0')).toBeTruthy());
      expect(mockGetBookSections).toHaveBeenCalledWith('6', 'Mathematics');
      await user.press(screen.getByTestId('picker-option-0'));
      await user.press(screen.getByTestId('picker-rebuild'));

      expect(onRebuildTopic).toHaveBeenCalledWith(0, 0, [{ pdfFile: 'fegp103.pdf', title: '3.3 Patterns on the Number Line' }, null]);
      await waitFor(() => expect(screen.queryByTestId('book-section-picker')).toBeNull());
    });

    test('a failed rebuild shows the error and keeps the picker open', async () => {
      const content = contentWithAudioAndPractice();
      content.metadata = { grade: '6', subject: 'Mathematics' };
      mockGetBookSections.mockResolvedValueOnce({ sections: [] });
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={jest.fn()} onRebuildTopic={jest.fn().mockRejectedValue(new Error('Try again later'))} />);
      await user.press(screen.getByTestId('preview-as-student-0-0'));
      await user.press(screen.getByTestId('change-book-pages'));
      await user.press(screen.getByTestId('picker-rebuild'));
      await waitFor(() => expect(screen.getByTestId('picker-error').props.children).toBe('Try again later'));
      expect(screen.getByTestId('book-section-picker')).toBeTruthy();
    });

    test('no Change pages button when read only', async () => {
      const content = contentWithAudioAndPractice();
      content.metadata = { grade: '6', subject: 'Mathematics' };
      await render(<LearningPathEditor content={content} onChange={jest.fn()} onRebuildTopic={jest.fn()} readOnly />);
      await userEvent.setup().press(screen.getByTestId('preview-as-student-0-0'));
      expect(screen.queryByTestId('change-book-pages')).toBeNull();
    });

    test('Learn text can be edited and saved via onChange', async () => {
      const content = contentWithAudioAndPractice();
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={onChange} />);
      await user.press(screen.getByTestId('preview-as-student-0-0'));
      await user.press(screen.getByTestId('toggle-edit-learn'));

      fireEvent.changeText(screen.getByTestId('block-0-text'), 'Edited by teacher.');
      expect(onChange.mock.calls.at(-1)[0].units[0].topics[0].content.blocks[0].text).toBe('Edited by teacher.');

      await user.press(screen.getByTestId('remove-block-0'));
      expect(onChange.mock.calls.at(-1)[0].units[0].topics[0].content.blocks).toEqual([]);
    });

    test('readOnly mode has no Learn edit button', async () => {
      const content = contentWithAudioAndPractice();
      await render(<LearningPathEditor content={content} onChange={jest.fn()} readOnly />);
      await userEvent.setup().press(screen.getByTestId('preview-as-student-0-0'));
      expect(screen.queryByTestId('toggle-edit-learn')).toBeNull();
    });

    test('shows the real textbook pane when content.book is present', async () => {
      const content = contentWithAudioAndPractice();
      content.units[0].topics[0].content!.book = {
        pdfFile: 'fecu105.pdf', bookPath: 'grade6/science/fecu105.pdf', bookTitle: 'Curiosity',
        chapterTitle: 'Nutrition', pdfPage: 8, confidence: 0.9,
      };
      await render(<LearningPathEditor content={content} onChange={jest.fn()} />);
      await userEvent.setup().press(screen.getByTestId('preview-as-student-0-0'));
      expect(screen.getByTestId('preview-book-pane')).toBeTruthy();
    });

    test('readOnly mode does not allow edits (no onChangeContent wired)', async () => {
      const content = contentWithAudioAndPractice();
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<LearningPathEditor content={content} onChange={onChange} readOnly />);
      await user.press(screen.getByTestId('preview-as-student-0-0'));
      await user.press(screen.getByTestId('preview-tab-audio'));

      expect(screen.getByTestId('listen-part-text-0').props.editable).toBe(false);
    });
  });
});
