import React from 'react';
import { Text, Platform } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import { createLazyScreenGroup } from '../lazyScreens';

jest.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ colors: { bgDark: '#fff', primary: '#000' } }) }));

function setConnection(conn: any) {
  Object.defineProperty(globalThis.navigator, 'connection', { value: conn, configurable: true });
}

describe('lazyScreens', () => {
  afterEach(() => setConnection(undefined));

  test('renders the screen once its chunk has loaded, passing props through', async () => {
    const group = createLazyScreenGroup();
    const Hello = group.lazyScreen(() => Promise.resolve({ default: ({ name }: { name: string }) => <Text>Hello {name}</Text> }));
    await render(<Hello name="Asha" />);
    expect(await screen.findByText('Hello Asha')).toBeTruthy();
  });

  test('shows a centered #B4A467 spinner while the chunk loads', async () => {
    const group = createLazyScreenGroup();
    const Pending = group.lazyScreen(() => new Promise(() => {}));
    await render(<Pending />);
    const spinner = screen.getByTestId('screen-loading');
    expect(spinner.props.color).toBe('#B4A467');
  });

  test('a screen that crashes shows Reload for that screen instead of blanking the app', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const group = createLazyScreenGroup();
    const Broken = group.lazyScreen(() => Promise.resolve({ default: () => { throw new Error("Cannot read properties of undefined (reading 'rose')"); } }));
    await render(<><Text>Sidebar stays</Text><Broken /></>);
    expect(await screen.findByTestId('screen-crashed')).toBeTruthy();
    expect(screen.getByText('Something went wrong loading this page.')).toBeTruthy();
    expect(screen.getByText('Reload')).toBeTruthy();
    expect(screen.getByText('Sidebar stays')).toBeTruthy();
    error.mockRestore();
  });

  test('retries a failed chunk load once', async () => {
    jest.useFakeTimers();
    const loader = jest.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ default: () => <Text>Loaded</Text> });
    const group = createLazyScreenGroup();
    const Screen = group.lazyScreen(loader);
    await render(<Screen />);
    await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
    jest.useRealTimers();
    expect(await screen.findByText('Loaded')).toBeTruthy();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test('prefetchAll loads every screen once on a good connection', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setConnection({ effectiveType: '4g' });
    const a = jest.fn().mockResolvedValue({ default: () => null });
    const b = jest.fn().mockResolvedValue({ default: () => null });
    const group = createLazyScreenGroup();
    group.lazyScreen(a);
    group.lazyScreen(b);
    await group.prefetchAll();
    await group.prefetchAll();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  test('prefetchAll downloads nothing on a slow connection / Data Saver', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setConnection({ effectiveType: '3g', saveData: true });
    const a = jest.fn().mockResolvedValue({ default: () => null });
    const group = createLazyScreenGroup();
    group.lazyScreen(a);
    await group.prefetchAll();
    expect(a).not.toHaveBeenCalled();
  });
});
