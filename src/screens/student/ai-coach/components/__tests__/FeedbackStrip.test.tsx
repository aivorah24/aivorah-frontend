import React from 'react';
import { Animated } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import FeedbackStrip from '../FeedbackStrip';

const colors = { textDim: '#666' } as any;
const styles = {
  feedbackStrip: {}, feedbackLabel: {}, feedbackBtns: {}, feedbackBtn: {},
  feedbackBtnText: {}, feedbackBtnNum: {}, feedbackSkip: {},
};

describe('FeedbackStrip', () => {
  test('renders all three rating options', async () => {
    await render(<FeedbackStrip feedbackAnim={new Animated.Value(1)} onSubmit={() => {}} onDismiss={() => {}} styles={styles} colors={colors} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  test('pressing a rating calls onSubmit with the real rating number', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<FeedbackStrip feedbackAnim={new Animated.Value(1)} onSubmit={onSubmit} onDismiss={() => {}} styles={styles} colors={colors} />);

    await user.press(screen.getByText('👍'));

    expect(onSubmit).toHaveBeenCalledWith(3);
  });

  test('pressing the dismiss (x) button calls onDismiss', async () => {
    const onDismiss = jest.fn();
    const user = userEvent.setup();
    await render(<FeedbackStrip feedbackAnim={new Animated.Value(1)} onSubmit={() => {}} onDismiss={onDismiss} styles={styles} colors={colors} />);

    await user.press(screen.getByTestId('feedbackDismiss'));

    expect(onDismiss).toHaveBeenCalled();
  });
});
