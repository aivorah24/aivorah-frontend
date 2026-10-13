import React from 'react';
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { usePortfolioPosts, POSTS_POLL_MS } from '../usePortfolioPosts';

jest.mock('@react-navigation/native', () => {
  const R = require('react');
  return { useFocusEffect: (cb: any) => R.useEffect(() => cb(), [cb]) };
});
let mockItems: any[] = [];
jest.mock('../../../../context/NotificationContext', () => ({ useNotification: () => ({ notificationItems: mockItems }) }));
const mockFetchPosts = jest.fn();
const mockFetchFolders = jest.fn();
jest.mock('../../api/classPortfolioApi', () => ({
  fetchPosts: (...a: any[]) => mockFetchPosts(...a),
  fetchFolders: (...a: any[]) => mockFetchFolders(...a),
}));

const post = (id: string) => ({ id, caption: id });

function Harness() {
  const { posts, loading, error } = usePortfolioPosts('Grade 5', 'A', 't@x.com');
  return <Text testID="out">{`${loading ? 'loading' : 'ready'}|${error}|${posts.map((p) => p.id).join(',')}`}</Text>;
}
const out = () => screen.getByTestId('out').props.children;

beforeEach(() => {
  jest.useFakeTimers();
  mockItems = [];
  mockFetchPosts.mockReset().mockResolvedValue([post('p1')]);
  mockFetchFolders.mockReset().mockResolvedValue([]);
});
afterEach(() => jest.useRealTimers());

const tick = async (ms = POSTS_POLL_MS) => { await act(async () => { jest.advanceTimersByTime(ms); }); };

test('new and deleted posts appear on the poll without a reload', async () => {
  await render(<Harness />);
  await waitFor(() => expect(out()).toBe('ready||p1'));
  mockFetchPosts.mockResolvedValue([post('p2'), post('p1')]);
  await tick();
  await waitFor(() => expect(out()).toBe('ready||p2,p1'));
  mockFetchPosts.mockResolvedValue([post('p2')]);
  await tick();
  await waitFor(() => expect(out()).toBe('ready||p2'));
});

test('a failed first load recovers on the next poll (was stuck on the error until reload)', async () => {
  mockFetchPosts.mockRejectedValueOnce(new Error('Failed to load posts'));
  await render(<Harness />);
  await waitFor(() => expect(out()).toBe('ready|Failed to load posts|'));
  await tick();
  await waitFor(() => expect(out()).toBe('ready||p1'));
});

test('a background failure keeps the last good feed', async () => {
  await render(<Harness />);
  await waitFor(() => expect(out()).toBe('ready||p1'));
  mockFetchPosts.mockRejectedValueOnce(new Error('boom'));
  await tick();
  expect(out()).toBe('ready||p1');
});

test('a slower stale response never overwrites a newer one', async () => {
  await render(<Harness />);
  await waitFor(() => expect(out()).toBe('ready||p1'));
  let resolveSlow: (v: any) => void = () => {};
  mockFetchPosts.mockImplementationOnce(() => new Promise((r) => { resolveSlow = r; }));
  await tick(); // slow poll in flight
  mockFetchPosts.mockResolvedValueOnce([post('p9')]);
  await tick(); // newer poll lands first
  await waitFor(() => expect(out()).toBe('ready||p9'));
  await act(async () => { resolveSlow([post('stale')]); });
  expect(out()).toBe('ready||p9');
});

test('a new class_post notification for this class refetches immediately', async () => {
  const { rerender } = await render(<Harness />);
  await waitFor(() => expect(out()).toBe('ready||p1'));
  const calls = mockFetchPosts.mock.calls.length;
  mockFetchPosts.mockResolvedValue([post('p3'), post('p1')]);
  mockItems = [{ id: 'n-other', type: 'portfolio', grade: 'Grade 6', section: 'A' }];
  await rerender(<Harness />);
  expect(mockFetchPosts.mock.calls.length).toBe(calls); // other class: ignored
  mockItems = [...mockItems, { id: 'n1', type: 'portfolio', grade: 'Grade 5', section: 'A' }];
  await rerender(<Harness />);
  await waitFor(() => expect(out()).toBe('ready||p3,p1'));
  expect(mockFetchPosts.mock.calls.length).toBe(calls + 1);
});

test('returning to the app (focus/foreground) refetches right away', async () => {
  const { AppState } = require('react-native');
  let onChange: (s: string) => void = () => {};
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_e: any, cb: any) => { onChange = cb; return { remove: jest.fn() } as any; });
  await render(<Harness />);
  await waitFor(() => expect(out()).toBe('ready||p1'));
  mockFetchPosts.mockResolvedValue([post('p4'), post('p1')]);
  await act(async () => { onChange('active'); });
  await waitFor(() => expect(out()).toBe('ready||p4,p1'));
  spy.mockRestore();
});
