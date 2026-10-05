import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTopicUnlock } from '../useTopicUnlock';

function Harness({ topic = 'Rivers' }: { topic?: string }) {
  const { unlocked, markLearned } = useTopicUnlock('s@a.com', 'CBSE|Grade 7|Science', topic);
  return (
    <>
      <Text testID="unlocked">{String(unlocked)}</Text>
      <TouchableOpacity testID="learned" onPress={markLearned}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => AsyncStorage.clear());

describe('useTopicUnlock', () => {
  test('a topic starts locked and unlocks once it has been learned', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    expect(screen.getByTestId('unlocked').props.children).toBe('false');
    await user.press(screen.getByTestId('learned'));
    expect(screen.getByTestId('unlocked').props.children).toBe('true');
  });

  test('the unlock is saved, and is remembered for that topic only', async () => {
    await AsyncStorage.setItem('@lp_learned_s@a.com_CBSE|Grade 7|Science|Rivers', '1');
    const r = await render(<Harness />);
    await waitFor(() => expect(r.getByTestId('unlocked').props.children).toBe('true'));
    await r.rerender(<Harness topic="Soil" />);
    await new Promise((x) => setTimeout(x, 20));
    expect(r.getByTestId('unlocked').props.children).toBe('false');
  });

  test('learning a topic saves it so the next visit stays unlocked', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('learned'));
    expect(await AsyncStorage.getItem('@lp_learned_s@a.com_CBSE|Grade 7|Science|Rivers')).toBe('1');
  });
});
