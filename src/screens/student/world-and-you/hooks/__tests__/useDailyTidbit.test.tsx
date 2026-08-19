import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useDailyTidbit } from '../useDailyTidbit';

jest.setTimeout(15000);

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function Harness({ grade = 'Grade 4', onReload = jest.fn() }: any) {
  const hook = useDailyTidbit(grade, onReload);
  return (
    <>
      <Text testID="loading">{String(hook.loading)}</Text>
      <Text testID="error">{String(hook.error)}</Text>
      <Text testID="tab">{hook.tab}</Text>
      <Text testID="gkFact">{hook.data?.gk?.fact ?? ''}</Text>
      <TouchableOpacity testID="setNews" onPress={() => hook.setTab('news')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="reload" onPress={() => hook.loadTidbit()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('useDailyTidbit — cache miss (fresh fetch)', () => {
  test('fetches real tidbit content from the server and caches it', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ grade: 'Grade 4', gk: { fact: 'Octopuses have three hearts.' } })) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('gkFact').props.children).toBe('Octopuses have three hearts.');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('a non-ok server response sets the real error flag', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({}, false)) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe('true');
  });

  test('a network failure sets the real error flag', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe('true');
  });
});

describe('useDailyTidbit — cache hit', () => {
  test('a real cached entry for today is served without hitting the network', async () => {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(`daily_tidbit_v3_Grade 4_${today}`, JSON.stringify({ gk: { fact: 'Cached fact.' } }));
    global.fetch = jest.fn() as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('gkFact').props.children).toBe('Cached fact.');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useDailyTidbit — tabs and reload', () => {
  test('setTab switches the real active tab', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ gk: { fact: 'A fact' } })) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('setNews'));

    expect(screen.getByTestId('tab').props.children).toBe('news');
  });

  test('calling loadTidbit again calls the real onReload callback', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ gk: { fact: 'A fact' } })) as any;
    const onReload = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onReload={onReload} />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    onReload.mockClear();
    await user.press(screen.getByTestId('reload'));

    expect(onReload).toHaveBeenCalled();
  });
});
