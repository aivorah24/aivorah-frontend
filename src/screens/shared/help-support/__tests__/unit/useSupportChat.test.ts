import { renderHook, act } from '@testing-library/react-native';
import { useSupportChat } from '../../hooks/useSupportChat';
import * as helpSupportService from '../../services/helpSupportService';

jest.mock('../../services/helpSupportService');

describe('useSupportChat', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('seeds the conversation with the given greeting', async () => {
    const { result } = await renderHook(() => useSupportChat('Priya', 'Hi there!'));
    expect(result.current.chatMsgs).toHaveLength(1);
    expect(result.current.chatMsgs[0]).toMatchObject({ role: 'ai', text: 'Hi there!' });
  });

  it('sendSupportMessage appends the user message and the AI reply', async () => {
    (helpSupportService.sendChatMessage as jest.Mock).mockResolvedValueOnce('Sure, here is how.');
    const { result } = await renderHook(() => useSupportChat('Priya', 'Hi there!'));
    await act(async () => result.current.sendSupportMessage('How do I add a teacher?'));
    expect(helpSupportService.sendChatMessage).toHaveBeenCalledWith('How do I add a teacher?', 'Priya');
    expect(result.current.chatMsgs).toHaveLength(3);
    expect(result.current.chatMsgs[1]).toMatchObject({ role: 'user', text: 'How do I add a teacher?' });
    expect(result.current.chatMsgs[2]).toMatchObject({ role: 'ai', text: 'Sure, here is how.' });
  });

  it('ignores an empty message', async () => {
    const { result } = await renderHook(() => useSupportChat('Priya', 'Hi there!'));
    await act(async () => result.current.sendSupportMessage('   '));
    expect(helpSupportService.sendChatMessage).not.toHaveBeenCalled();
    expect(result.current.chatMsgs).toHaveLength(1);
  });

  it('falls back to an error bubble when the service call fails', async () => {
    (helpSupportService.sendChatMessage as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    const { result } = await renderHook(() => useSupportChat('Priya', 'Hi there!'));
    await act(async () => result.current.sendSupportMessage('help'));
    expect(result.current.chatMsgs[2]).toMatchObject({ role: 'ai', text: 'Could not reach support. Please try again.' });
  });
});
