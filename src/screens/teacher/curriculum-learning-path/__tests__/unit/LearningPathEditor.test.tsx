import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import LearningPathEditor from '../../components/LearningPathEditor';
import { LearningPathContent } from '../../types';

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
});
