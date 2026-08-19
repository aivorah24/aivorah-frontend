// Smoke test #2 — proves React Native Testing Library can actually render a
// real React Native component and query it, not just that Jest runs.

import React from 'react';
import { Text, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';

function Hello() {
  return (
    <View>
      <Text>Hello Aivorah</Text>
    </View>
  );
}

test('renders a component and finds text on screen', async () => {
  await render(<Hello />);
  expect(screen.getByText('Hello Aivorah')).toBeTruthy();
});
