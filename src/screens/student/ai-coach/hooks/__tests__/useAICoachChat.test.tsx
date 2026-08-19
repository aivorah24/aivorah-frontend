// askAIMentorStream is mocked at the module boundary — it's a shared service
// (services/aiMentorApi.ts) used elsewhere too, and its own SSE-parsing logic
// is out of scope for this hook's tests.

const mockAskAIMentorStream = jest.fn();
jest.mock('../../../../../services/aiMentorApi', () => ({
  askAIMentorStream: (...args: any[]) => mockAskAIMentorStream(...args),
}));

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useAICoachChat } from '../useAICoachChat';

function Harness({ exploreTopic }: { exploreTopic: () => void }) {
  const hook = useAICoachChat({
    firstName: 'Sai',
    userGrade: 'Grade 4',
    userCurriculum: 'IB PYP',
    userEmail: 'a@a.com',
    userRole: 'student',
    exploreTopic,
    onScrollToEnd: () => {},
  });
  return (
    <>
      <Text testID="messageCount">{hook.messages.length}</Text>
      <Text testID="isTyping">{String(hook.isTyping)}</Text>
      <Text testID="lastMessage">{hook.messages[hook.messages.length - 1]?.text ?? ''}</Text>
      <Text testID="lastRole">{hook.messages[hook.messages.length - 1]?.role ?? ''}</Text>
      <Text testID="lastIsError">{String(hook.messages[hook.messages.length - 1]?.isError)}</Text>
      <Text testID="showFeedback">{String(hook.showFeedback)}</Text>
      <TouchableOpacity testID="sendHello" onPress={() => hook.sendMessage('Hello')}><Text>send</Text></TouchableOpacity>
      <TouchableOpacity testID="submitFeedback" onPress={() => hook.submitFeedback(3)}><Text>feedback</Text></TouchableOpacity>
      <TouchableOpacity testID="clearChat" onPress={() => hook.clearChat()}><Text>clear</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('useAICoachChat — initial state', () => {
  test('starts with a single AI welcome message mentioning the student and curriculum', async () => {
    await render(<Harness exploreTopic={() => {}} />);
    expect(screen.getByTestId('messageCount').props.children).toBe(1);
    expect(screen.getByTestId('lastRole').props.children).toBe('ai');
    expect(screen.getByTestId('lastMessage').props.children).toContain('Sai');
    expect(screen.getByTestId('lastMessage').props.children).toContain('IB PYP');
  });
});

describe('useAICoachChat — sendMessage', () => {
  test('a successful reply appends the user message then the real AI answer', async () => {
    mockAskAIMentorStream.mockResolvedValueOnce({ answer: 'A fraction is a part of a whole.', sources: [], images: [] });
    const user = userEvent.setup();
    await render(<Harness exploreTopic={() => {}} />);

    await user.press(screen.getByTestId('sendHello'));

    await waitFor(() => expect(screen.getByTestId('lastMessage').props.children).toBe('A fraction is a part of a whole.'));
    expect(screen.getByTestId('messageCount').props.children).toBe(3); // welcome + user + AI
    expect(screen.getByTestId('isTyping').props.children).toBe('false');
  });

  test('streamed tokens are appended live to the placeholder AI message', async () => {
    mockAskAIMentorStream.mockImplementationOnce(async (_q: any, _g: any, _s: any, _c: any, _t: any, _e: any, _r: any, _h: any, onToken: any) => {
      onToken('Hello ');
      onToken('there.');
      return { answer: 'Hello there.', sources: [], images: [] };
    });
    const user = userEvent.setup();
    await render(<Harness exploreTopic={() => {}} />);

    await user.press(screen.getByTestId('sendHello'));

    await waitFor(() => expect(screen.getByTestId('lastMessage').props.children).toBe('Hello there.'));
  });

  test('an error response marks the message as an error and shows the error text', async () => {
    mockAskAIMentorStream.mockResolvedValueOnce({ answer: '', sources: [], images: [], error: 'Could not connect to Aivorah.' });
    const user = userEvent.setup();
    await render(<Harness exploreTopic={() => {}} />);

    await user.press(screen.getByTestId('sendHello'));

    await waitFor(() => expect(screen.getByTestId('lastIsError').props.children).toBe('true'));
    expect(screen.getByTestId('lastMessage').props.children).toBe('Could not connect to Aivorah.');
  });

  test('a successful reply calls exploreTopic', async () => {
    mockAskAIMentorStream.mockResolvedValueOnce({ answer: 'answer', sources: [], images: [] });
    const exploreTopic = jest.fn();
    const user = userEvent.setup();
    await render(<Harness exploreTopic={exploreTopic} />);

    await user.press(screen.getByTestId('sendHello'));

    await waitFor(() => expect(exploreTopic).toHaveBeenCalled());
  });

  test('an error reply does NOT call exploreTopic', async () => {
    mockAskAIMentorStream.mockResolvedValueOnce({ answer: '', sources: [], images: [], error: 'down' });
    const exploreTopic = jest.fn();
    const user = userEvent.setup();
    await render(<Harness exploreTopic={exploreTopic} />);

    await user.press(screen.getByTestId('sendHello'));

    await waitFor(() => expect(screen.getByTestId('lastIsError').props.children).toBe('true'));
    expect(exploreTopic).not.toHaveBeenCalled();
  });

  test('the 3rd successful AI response shows the feedback strip', async () => {
    mockAskAIMentorStream.mockResolvedValue({ answer: 'ok', sources: [], images: [] });
    const user = userEvent.setup();
    await render(<Harness exploreTopic={() => {}} />);

    await user.press(screen.getByTestId('sendHello'));
    await waitFor(() => expect(screen.getByTestId('isTyping').props.children).toBe('false'));
    await user.press(screen.getByTestId('sendHello'));
    await waitFor(() => expect(screen.getByTestId('isTyping').props.children).toBe('false'));
    await user.press(screen.getByTestId('sendHello'));

    await waitFor(() => expect(screen.getByTestId('showFeedback').props.children).toBe('true'), { timeout: 3000 });
  }, 10000);
});

describe('useAICoachChat — submitFeedback', () => {
  test('posts the real rating to the feedback endpoint', async () => {
    const user = userEvent.setup();
    await render(<Harness exploreTopic={() => {}} />);

    await user.press(screen.getByTestId('submitFeedback'));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/ask/feedback'),
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"rating":3') })
    );
  });
});

describe('useAICoachChat — clearChat', () => {
  test('resets to the single welcome message once the user confirms the "Clear" alert button', async () => {
    mockAskAIMentorStream.mockResolvedValueOnce({ answer: 'answer', sources: [], images: [] });
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title: any, _msg: any, buttons: any) => {
      buttons.find((b: any) => b.text === 'Clear')?.onPress?.();
    });
    const user = userEvent.setup();
    await render(<Harness exploreTopic={() => {}} />);
    await user.press(screen.getByTestId('sendHello'));
    await waitFor(() => expect(screen.getByTestId('messageCount').props.children).toBe(3));

    await user.press(screen.getByTestId('clearChat'));

    await waitFor(() => expect(screen.getByTestId('messageCount').props.children).toBe(1));
    alertSpy.mockRestore();
  });

  test('dismissing the alert (Cancel) leaves the conversation untouched', async () => {
    mockAskAIMentorStream.mockResolvedValueOnce({ answer: 'answer', sources: [], images: [] });
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); // never invokes any button
    const user = userEvent.setup();
    await render(<Harness exploreTopic={() => {}} />);
    await user.press(screen.getByTestId('sendHello'));
    await waitFor(() => expect(screen.getByTestId('messageCount').props.children).toBe(3));

    await user.press(screen.getByTestId('clearChat'));

    expect(screen.getByTestId('messageCount').props.children).toBe(3);
    alertSpy.mockRestore();
  });
});
