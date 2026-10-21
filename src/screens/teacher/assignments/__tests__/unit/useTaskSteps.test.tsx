import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useTaskSteps } from '../../hooks/useTaskSteps';

jest.mock('../../../../../config/serverUrl', () => 'https://server.test');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

const ARGS = { title: 'Food Chains', chapter: '', subject: 'Science', effectiveGrade: 'Grade 4', effectiveCurriculum: 'IB PYP' };

function Harness(props: Partial<typeof ARGS> = {}) {
  const h = useTaskSteps({ ...ARGS, ...props });
  return (
    <View>
      <Text testID="count">{String(h.taskSteps.length)}</Text>
      <Text testID="generating">{String(h.generatingSteps)}</Text>
      <Text testID="error">{h.stepsError}</Text>
      <Text testID="firstType">{h.taskSteps[0]?.type ?? ''}</Text>
      <TouchableOpacity testID="add" onPress={() => h.addTaskStep('brainstorm')} />
      <TouchableOpacity testID="remove" onPress={() => h.removeTaskStep(h.taskSteps[0]?.id)} />
      <TouchableOpacity testID="generate" onPress={() => h.generateSteps()} />
    </View>
  );
}

describe('useTaskSteps', () => {
  test('addTaskStep appends a step with the given type and its STEP_DEFAULTS', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('add'));
    expect(screen.getByTestId('count').props.children).toBe('1');
    expect(screen.getByTestId('firstType').props.children).toBe('brainstorm');
  });

  test('removeTaskStep removes it by id', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('add'));
    expect(screen.getByTestId('count').props.children).toBe('1');
    await user.press(screen.getByTestId('remove'));
    expect(screen.getByTestId('count').props.children).toBe('0');
  });

  test('generateSteps refuses with no title/chapter/subject topic', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn();
    await render(<Harness title="" chapter="" subject="" />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toMatch(/Chapter \/ Topic/));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('generateSteps sends the chapter/topic, not the title, as the AI topic', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ steps: [] }) }) as any;
    await render(<Harness title="Chapter 5 Worksheet" chapter="Photosynthesis" />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).topic).toBe('Photosynthesis');
  });

  test('generateSteps populates taskSteps from a successful AI response', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ steps: [{ type: 'brainstorm', label: 'Think', instructions: 'Go' }] }),
    }) as any;
    await render(<Harness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('1'));
    expect(screen.getByTestId('firstType').props.children).toBe('brainstorm');
  });

  test('structured_writing steps from AI get the fixed Beginning/Middle/End sections', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ steps: [{ type: 'structured_writing', label: 'Write', instructions: 'Go' }] }),
    }) as any;
    let captured: any;
    function Capture() {
      const h = useTaskSteps(ARGS);
      React.useEffect(() => { captured = h; });
      return <TouchableOpacity testID="gen" onPress={() => h.generateSteps()} />;
    }
    await render(<Capture />);
    await user.press(screen.getByTestId('gen'));
    await waitFor(() => expect(captured.taskSteps.length).toBe(1));
    expect(captured.taskSteps[0].sections).toEqual(['Beginning', 'Middle', 'End']);
  });

  test('keeps exactly the steps the AI designed, with their fields', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        steps: [
          { type: 'reading_comprehension', label: 'Read the story', instructions: 'Read and answer.', sections: ['Who', 'Why'] },
          { type: 'problem_solving', label: 'Solve', instructions: 'Solve these.', problems: ['2+3'] },
        ],
        stepTypes: ['reading_comprehension', 'problem_solving'],
      }),
    }) as any;
    let captured: any;
    function Capture() {
      const h = useTaskSteps(ARGS);
      React.useEffect(() => { captured = h; });
      return <TouchableOpacity testID="gen" onPress={() => h.generateSteps()} />;
    }
    await render(<Capture />);
    await user.press(screen.getByTestId('gen'));
    await waitFor(() => expect(captured.taskSteps.length).toBe(2));
    expect(captured.taskSteps.map((s: any) => s.type)).toEqual(['reading_comprehension', 'problem_solving']);
    expect(captured.taskSteps[0].sections).toEqual(['Who', 'Why']);
    expect(captured.taskSteps[1].problems).toEqual(['2+3']);
  });

  test('an AI response with an empty steps array surfaces an error, adds nothing', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ steps: [] }) }) as any;
    await render(<Harness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toMatch(/no steps/));
    expect(screen.getByTestId('count').props.children).toBe('0');
  });

  test('a non-ok response surfaces the server error message', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Grade required' }) }) as any;
    await render(<Harness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Grade required'));
  });

  test('a network failure surfaces a Failed: message', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    await render(<Harness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toMatch(/^Failed:/));
  });
});
