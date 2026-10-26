// A Hindi assignment's answer boxes get English→Hindi typing (हि/EN toggle).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ScaffoldedModal } from '../components/ScaffoldedModal';

jest.mock('../../../../context/StudentDataContext', () => ({ useStudentData: () => ({ studentId: 's1' }) }));

const colors = new Proxy({}, { get: () => '#888' }) as any;
const base = {
  id: 'a1', subject: 'Language Acquisition', grade: 'Grade 4', note: '',
  taskSteps: [{ id: 'st1', type: 'brainstorm', label: 'शब्द', instructions: 'प्रकृति के बारे में शब्द लिखें।', sections: [], wordBank: [] }],
  successCriteria: [],
} as any;

describe('ScaffoldedModal native-script typing', () => {
  test('Hindi assignment shows the हि toggle on the keyword box', async () => {
    await render(<ScaffoldedModal assignment={{ ...base, title: 'प्रकृति के संदेश' }} colors={colors} onClose={jest.fn()} onSubmitted={jest.fn()} />);
    await fireEvent.press(screen.getByText('Start Assignment'));
    expect(screen.getByLabelText('Switch to English typing')).toBeTruthy();
    expect(screen.getByText('हि')).toBeTruthy();
  });

  test('English assignment keeps a plain box', async () => {
    await render(<ScaffoldedModal assignment={{ ...base, subject: 'Science', title: 'Plants', taskSteps: [{ ...base.taskSteps[0], label: 'Words', instructions: 'Write words.' }] }} colors={colors} onClose={jest.fn()} onSubmitted={jest.fn()} />);
    await fireEvent.press(screen.getByText('Start Assignment'));
    expect(screen.getByPlaceholderText('Type a keyword and press Add...')).toBeTruthy();
    expect(screen.queryByLabelText('Switch to English typing')).toBeNull();
  });
});

describe('ScaffoldedModal reading step', () => {
  test('shows the passage and each question above its own answer box', async () => {
    const passage = 'The Monsoon. Every June, dark clouds gather over Kerala and the first rains arrive. Farmers plant rice and children play in the puddles.';
    await render(<ScaffoldedModal assignment={{ ...base, subject: 'English', title: 'The Monsoon',
      taskSteps: [{ id: 'r1', type: 'reading_comprehension', label: 'Read: The Monsoon', instructions: 'Read the passage and answer each question.', provocation: passage,
        sections: ['Where do the first monsoon rains arrive?', 'Why do you think farmers plant rice in June?', 'How does the monsoon affect children?'], wordBank: [] }] }}
      colors={colors} onClose={jest.fn()} onSubmitted={jest.fn()} />);
    await fireEvent.press(screen.getByText('Start Assignment'));
    expect(screen.getByTestId('reading-passage')).toBeTruthy();
    expect(screen.getByText(passage)).toBeTruthy();
    expect(screen.getByText('1. Where do the first monsoon rains arrive?')).toBeTruthy();
    expect(screen.getAllByPlaceholderText('Write your answer here...')).toHaveLength(3);
  });
});
