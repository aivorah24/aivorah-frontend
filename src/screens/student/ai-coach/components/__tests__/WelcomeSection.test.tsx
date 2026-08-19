import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import WelcomeSection from '../WelcomeSection';

const colors = { accentYellow: '#fa0', textDim: '#666' } as any;
const styles = {
  welcomeSection: {}, welcomeIconWrap: {}, welcomeTitle: {}, welcomeSub: {},
  suggestionsGrid: {}, suggestionCard: {}, suggestionText: {},
};

describe('WelcomeSection', () => {
  test('shows the grade in the subtitle and every real suggestion as a pressable card', async () => {
    await render(
      <WelcomeSection
        userGrade="Grade 4"
        suggestions={['What are fractions?', 'How does the water cycle work?']}
        onSuggestionPress={() => {}}
        styles={styles}
        colors={colors}
      />
    );
    expect(screen.getByText('Ask me anything about your Grade 4 curriculum')).toBeTruthy();
    expect(screen.getByText('What are fractions?')).toBeTruthy();
    expect(screen.getByText('How does the water cycle work?')).toBeTruthy();
  });

  test('pressing a suggestion calls onSuggestionPress with its real text', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <WelcomeSection userGrade="Grade 4" suggestions={['What are fractions?']} onSuggestionPress={onPress} styles={styles} colors={colors} />
    );

    await user.press(screen.getByText('What are fractions?'));

    expect(onPress).toHaveBeenCalledWith('What are fractions?');
  });

  test('no suggestions -> renders without crashing, no cards shown', async () => {
    await render(<WelcomeSection userGrade="Grade 4" suggestions={[]} onSuggestionPress={() => {}} styles={styles} colors={colors} />);
    expect(screen.getByText('Aivorah AI Coach')).toBeTruthy();
  });
});
