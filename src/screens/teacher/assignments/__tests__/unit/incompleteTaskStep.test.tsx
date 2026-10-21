import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { findIncompleteTaskStep } from '../../utils/validation';
import { useTaskSteps } from '../../hooks/useTaskSteps';

const step = (over: any = {}) => ({ id: 's1', type: 'drawing', label: 'Draw the air flow and pressure', instructions: '', sections: [], wordBank: [], ...over });

describe('findIncompleteTaskStep', () => {
  test('blocks blank or built-in default instructions', () => {
    expect(findIncompleteTaskStep([step()] as any)).toMatch(/Question 1 \("Draw the air flow and pressure"\) needs instructions/);
    expect(findIncompleteTaskStep([step({ instructions: 'Draw and label your answer.' })] as any)).toMatch(/needs instructions/);
  });
  test('blocks problems/passages that are missing', () => {
    expect(findIncompleteTaskStep([step({ type: 'problem_solving', instructions: 'Solve.', problems: [''] })] as any)).toMatch(/no problems/);
    expect(findIncompleteTaskStep([step({ type: 'reading_comprehension', instructions: 'Read and answer.' })] as any)).toMatch(/no reading passage/);
  });
  test('passes a complete step', () => {
    expect(findIncompleteTaskStep([step({ instructions: 'Draw a wing cross-section with faster air above; label high pressure, low pressure and lift.' })] as any)).toBeNull();
  });
});

describe('useTaskSteps manual steps', () => {
  test('a new step starts blank and Fill with AI writes it, keeping the title', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ step: {
      type: 'drawing', label: 'Draw the air flow and pressure',
      instructions: 'Draw a wing cross-section. Show faster air above with longer arrows; label high pressure, low pressure, lift.' } }) }) as any;
    let h: any;
    function Harness() {
      h = useTaskSteps({ title: 'Chapter 8', chapter: 'Air pressure', subject: 'Science', effectiveGrade: 'Grade 8', effectiveCurriculum: 'CBSE' });
      return <>
        <TouchableOpacity testID="add" onPress={() => h.addTaskStep('drawing')} />
        <TouchableOpacity testID="fill" onPress={() => h.fillStepWithAI(h.taskSteps[0].id)} />
      </>;
    }
    await render(<Harness />);
    await user.press(screen.getByTestId('add'));
    await waitFor(() => expect(h.taskSteps).toHaveLength(1));
    expect(h.taskSteps[0].instructions).toBe('');
    await user.press(screen.getByTestId('fill'));
    await waitFor(() => expect(h.taskSteps[0].instructions).toMatch(/label high pressure/));
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toMatchObject({ type: 'drawing', topic: 'Air pressure', grade: 'Grade 8', curriculum: 'CBSE' });
  });
});
