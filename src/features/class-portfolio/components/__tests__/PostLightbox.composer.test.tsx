import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import PostLightbox, { isSendKey } from '../PostLightbox';

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#c90', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { email: 'mom@x.com', role: 'parent' } }) }));
const mockAddComment = jest.fn();
jest.mock('../../api/classPortfolioApi', () => ({
  fetchComments: jest.fn(() => Promise.resolve([])),
  addComment: (...a: any[]) => mockAddComment(...a),
  toggleLike: jest.fn(),
}));

const POST: any = {
  id: 'p1', grade: 'Grade 5', section: 'A', caption: 'Hi', status: 'published', createdBy: 't@x.com', createdByName: 'Ms Rao',
  createdAt: '2026-10-13T09:00:00Z', attachments: [], tags: [], likeCount: 0, isLiked: false, commentCount: 0,
};

const key = (k: string, shiftKey = false) => {
  const preventDefault = jest.fn();
  return { nativeEvent: { key: k, shiftKey }, preventDefault };
};

beforeEach(() => {
  mockAddComment.mockReset().mockImplementation(async (_id: string, _e: string, body: string) => ({ id: `c-${body}`, body, createdAt: '2026-10-13T10:00:00Z', userId: 'u1' }));
});

const mount = async () => {
  await render(<PostLightbox post={POST} onClose={jest.fn()} onLikeChanged={jest.fn()} />);
  await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());
};
const type = (t: string) => fireEvent.changeText(screen.getByTestId('comment-input'), t);

describe('isSendKey', () => {
  test('Enter sends; Shift+Enter, other keys and IME composition do not', () => {
    expect(isSendKey(key('Enter'))).toBe(true);
    expect(isSendKey(key('Enter', true))).toBe(false);
    expect(isSendKey(key('a'))).toBe(false);
    expect(isSendKey({ nativeEvent: { key: 'Enter', isComposing: true } })).toBe(false);
  });
});

describe('web keyboard', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'web'));
  afterEach(() => jest.restoreAllMocks());

  test('Enter sends the trimmed comment, clears the box and blocks the default newline', async () => {
    await mount();
    await type('  Lovely photos  ');
    const e = key('Enter');
    await act(async () => { fireEvent(screen.getByTestId('comment-input'), 'keyPress', e); });
    await waitFor(() => expect(mockAddComment).toHaveBeenCalledWith('p1', 'mom@x.com', 'Lovely photos'));
    expect(e.preventDefault).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('comment-input').props.value).toBe(''));
    expect(screen.getByText('Lovely photos')).toBeTruthy();
  });

  test('Shift+Enter does not send (newline stays)', async () => {
    await mount();
    await type('line one');
    const e = key('Enter', true);
    await act(async () => { fireEvent(screen.getByTestId('comment-input'), 'keyPress', e); });
    expect(mockAddComment).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  test('empty / whitespace-only never sends', async () => {
    await mount();
    await type('   ');
    await act(async () => { fireEvent(screen.getByTestId('comment-input'), 'keyPress', key('Enter')); });
    expect(mockAddComment).not.toHaveBeenCalled();
  });

  test('a second Enter while the first send is in flight does not double-send', async () => {
    let resolve: (v: any) => void = () => {};
    mockAddComment.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    await mount();
    await type('Once');
    await act(async () => {
      fireEvent(screen.getByTestId('comment-input'), 'keyPress', key('Enter'));
      fireEvent(screen.getByTestId('comment-input'), 'keyPress', key('Enter'));
    });
    expect(mockAddComment).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ id: 'c1', body: 'Once', createdAt: '2026-10-13T10:00:00Z', userId: 'u1' }); });
    expect(mockAddComment).toHaveBeenCalledTimes(1);
  });
});

describe('native keyboard', () => {
  test('the return key ("send") submits', async () => {
    await mount();
    const input = screen.getByTestId('comment-input');
    expect(input.props.returnKeyType).toBe('send');
    await type('From the phone');
    await act(async () => { fireEvent(screen.getByTestId('comment-input'), 'submitEditing'); });
    await waitFor(() => expect(mockAddComment).toHaveBeenCalledWith('p1', 'mom@x.com', 'From the phone'));
  });
});

describe('send button', () => {
  test('disabled and dimmed when empty; enabled once there is text; 44px target labelled "Send comment"', async () => {
    await mount();
    const btn = () => screen.getByLabelText('Send comment');
    expect(btn().props.accessibilityState).toMatchObject({ disabled: true });
    expect(StyleSheet.flatten(btn().props.style)).toMatchObject({ width: 44, height: 44, opacity: 0.5 });
    await fireEvent.press(btn());
    expect(mockAddComment).not.toHaveBeenCalled();

    await type('Hello');
    expect(btn().props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(btn());
    await waitFor(() => expect(mockAddComment).toHaveBeenCalledWith('p1', 'mom@x.com', 'Hello'));
  });
});
