import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useAssignmentDetail } from '../../hooks/useAssignmentDetail';
import type { Assignment } from '../../types';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

const ASSIGNMENT = { id: 'a1' } as Assignment;

function Harness() {
  const h = useAssignmentDetail();
  return (
    <View>
      <Text testID="loading">{String(h.loadingSubmissions)}</Text>
      <Text testID="subCount">{String(h.detailSubmissions.length)}</Text>
      <Text testID="totalLinked">{String(h.detailTotalLinked)}</Text>
      <Text testID="tab">{h.detailTab}</Text>
      <TextInput testID="feedbackInput" value={h.teacherFeedback} onChangeText={h.setTeacherFeedback} />
      <TouchableOpacity testID="open" onPress={() => h.setDetailAssignment(ASSIGNMENT)} />
      <TouchableOpacity testID="close" onPress={() => h.setDetailAssignment(null)} />
      <TouchableOpacity testID="send" onPress={() => h.sendFeedback('a1', 'stu-1')} />
      <Text testID="feedback0">{h.detailSubmissions[0]?.aiFeedback ?? ''}</Text>
      <Text testID="editing">{String(h.editingFeedbackFor)}</Text>
      <TouchableOpacity testID="edit" onPress={() => h.setEditingFeedbackFor('stu-1')} />
    </View>
  );
}

describe('useAssignmentDetail', () => {
  test('opening a detail assignment fetches its submissions', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ submissions: [{ studentId: 'stu-1' }], totalLinked: 5 }),
    }) as any;
    await render(<Harness />);
    await user.press(screen.getByTestId('open'));
    await waitFor(() => expect(screen.getByTestId('subCount').props.children).toBe('1'));
    expect(screen.getByTestId('totalLinked').props.children).toBe('5');
  });

  test('closing (setDetailAssignment(null)) resets submissions, tab, and feedback', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ submissions: [{ studentId: 'stu-1' }], totalLinked: 1 }),
    }) as any;
    await render(<Harness />);
    await user.press(screen.getByTestId('open'));
    await waitFor(() => expect(screen.getByTestId('subCount').props.children).toBe('1'));
    await user.press(screen.getByTestId('close'));
    await waitFor(() => expect(screen.getByTestId('subCount').props.children).toBe('0'));
    expect(screen.getByTestId('tab').props.children).toBe('overview');
  });

  test('a failed submissions fetch leaves the list empty without throwing', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;
    await render(<Harness />);
    await user.press(screen.getByTestId('open'));
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('subCount').props.children).toBe('0');
  });

  test('sendFeedback does nothing when the feedback text is blank', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ submissions: [], totalLinked: 0 }) }) as any;
    await render(<Harness />);
    await user.press(screen.getByTestId('send'));
    // Only the (never-triggered) submissions-fetch call would exist — no PUT should fire.
    expect((global.fetch as jest.Mock).mock.calls.some(c => String(c[0]).includes('teacher-feedback'))).toBe(false);
  });

  test('sendFeedback merges teacherFeedback into the matching submission on success', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ submissions: [{ studentId: 'stu-1', aiFeedback: '{}' }], totalLinked: 1 }) })
      .mockResolvedValueOnce({ ok: true });
    await render(<Harness />);
    await user.press(screen.getByTestId('open'));
    await waitFor(() => expect(screen.getByTestId('subCount').props.children).toBe('1'));
    screen.getByTestId('feedbackInput').props.onChangeText('Great work!');
    await user.press(screen.getByTestId('send'));
    await waitFor(() => expect(screen.getByTestId('feedback0').props.children).toContain('Great work!'));
  });

  test('saving an edit keeps the sent text in the box, closes the editor and stamps the edit', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ submissions: [{ studentId: 'stu-1', aiFeedback: JSON.stringify({ teacherFeedback: 'Good' }) }], totalLinked: 1 }) })
      .mockResolvedValueOnce({ ok: true });
    await render(<Harness />);
    await user.press(screen.getByTestId('open'));
    await waitFor(() => expect(screen.getByTestId('subCount').props.children).toBe('1'));
    await user.press(screen.getByTestId('edit'));
    expect(screen.getByTestId('editing').props.children).toBe('stu-1');
    screen.getByTestId('feedbackInput').props.onChangeText('Good, show your working');
    await user.press(screen.getByTestId('send'));
    await waitFor(() => expect(screen.getByTestId('editing').props.children).toBe('null'));
    expect(screen.getByTestId('feedbackInput').props.value).toBe('Good, show your working');
    const fb = JSON.parse(screen.getByTestId('feedback0').props.children);
    expect(fb.teacherFeedback).toBe('Good, show your working');
    expect(fb.teacherFeedbackEditedAt).toBeTruthy();
  });
});
