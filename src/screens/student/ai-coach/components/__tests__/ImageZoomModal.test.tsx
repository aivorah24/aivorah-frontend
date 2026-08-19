import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import ImageZoomModal from '../ImageZoomModal';

describe('ImageZoomModal', () => {
  test('renders the real caption when provided', async () => {
    await render(<ImageZoomModal zoomedImage={{ url: 'https://x/a.png', caption: 'A diagram of the water cycle' }} onClose={() => {}} />);
    expect(screen.getByText('A diagram of the water cycle')).toBeTruthy();
  });

  test('an empty caption renders no caption text', async () => {
    await render(<ImageZoomModal zoomedImage={{ url: 'https://x/a.png', caption: '' }} onClose={() => {}} />);
    expect(screen.queryByText('')).toBeNull();
  });

  test('pressing the backdrop calls onClose', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<ImageZoomModal zoomedImage={{ url: 'https://x/a.png', caption: 'caption' }} onClose={onClose} />);

    // The Pressable backdrop wraps everything; pressing the caption text bubbles to it.
    await user.press(screen.getByText('caption'));

    expect(onClose).toHaveBeenCalled();
  });
});
