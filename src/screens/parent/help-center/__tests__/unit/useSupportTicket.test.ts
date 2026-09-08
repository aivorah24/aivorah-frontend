import { renderHook, act } from '@testing-library/react-native';
import { useSupportTicket } from '../../hooks/useSupportTicket';
import * as helpCenterService from '../../services/helpCenterService';

jest.mock('../../services/helpCenterService');

describe('useSupportTicket', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an empty subject without calling the service', async () => {
    const { result } = await renderHook(() => useSupportTicket('parent@test.com'));
    await act(async () => result.current.handleSubmitTicket());
    expect(result.current.ticketError).toBe('Please enter a subject.');
    expect(helpCenterService.submitTicket).not.toHaveBeenCalled();
  });

  it('rejects an empty message without calling the service', async () => {
    const { result } = await renderHook(() => useSupportTicket('parent@test.com'));
    await act(() => result.current.setTicketSubject('Subject'));
    await act(async () => result.current.handleSubmitTicket());
    expect(result.current.ticketError).toBe('Please describe your issue.');
    expect(helpCenterService.submitTicket).not.toHaveBeenCalled();
  });

  it('on success, clears the form and sets a confirmation referencing the parent email', async () => {
    (helpCenterService.submitTicket as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = await renderHook(() => useSupportTicket('parent@test.com'));
    await act(() => {
      result.current.setTicketSubject('Subject');
      result.current.setTicketMessage('Message');
    });
    await act(async () => result.current.handleSubmitTicket());
    expect(helpCenterService.submitTicket).toHaveBeenCalledWith('parent@test.com', 'Subject', 'Message');
    expect(result.current.ticketSubject).toBe('');
    expect(result.current.ticketMessage).toBe('');
    expect(result.current.ticketSuccess).toContain('parent@test.com');
    expect(result.current.ticketError).toBe('');
  });

  it('on failure, surfaces the service error instead of a native alert', async () => {
    (helpCenterService.submitTicket as jest.Mock).mockRejectedValueOnce(new Error('Email service not configured.'));
    const { result } = await renderHook(() => useSupportTicket('parent@test.com'));
    await act(() => {
      result.current.setTicketSubject('Subject');
      result.current.setTicketMessage('Message');
    });
    await act(async () => result.current.handleSubmitTicket());
    expect(result.current.ticketError).toBe('Email service not configured.');
    expect(result.current.ticketSuccess).toBe('');
  });

  it('openTicket resets prior error/success state and opens the modal', async () => {
    const { result } = await renderHook(() => useSupportTicket('parent@test.com'));
    await act(() => result.current.openTicket());
    expect(result.current.ticketVisible).toBe(true);
    expect(result.current.ticketError).toBe('');
    expect(result.current.ticketSuccess).toBe('');
  });
});
