import React from 'react';
import { Image } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import ZoomableImage from '../ZoomableImage';

const colors: any = { cardDark: '#eee', textMain: '#000', textMuted: '#666', borderColor: '#ccc' };

describe('ZoomableImage', () => {
  beforeEach(() => {
    // jest-expo's fake image loader does not match this React Native version's promise-style getSize.
    jest.spyOn(Image, 'getSize').mockImplementation(((_u: string, ok?: (w: number, h: number) => void) => { ok?.(1500, 820); }) as any);
  });
  afterEach(() => jest.restoreAllMocks());

  test('shows the picture with a tap-to-zoom hint, viewer closed', async () => {
    await render(<ZoomableImage url="https://example.com/a.png" alt="Diagram" colors={colors} />);
    expect(screen.getByText('Tap to zoom')).toBeTruthy();
    expect(screen.queryByTestId('zoom-image-modal')).toBeNull();
  });

  test('tap opens the viewer; zoom in/out change the percentage; close hides it', async () => {
    const user = userEvent.setup();
    await render(<ZoomableImage url="https://example.com/a.png" alt="Diagram" colors={colors} />);

    await user.press(screen.getByTestId('zoom-image-open'));
    expect(screen.getByTestId('zoom-image-modal')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();

    await user.press(screen.getByTestId('zoom-in'));
    expect(screen.getByText('150%')).toBeTruthy();
    await user.press(screen.getByTestId('zoom-in'));
    expect(screen.getByText('200%')).toBeTruthy();
    await user.press(screen.getByTestId('zoom-out'));
    expect(screen.getByText('150%')).toBeTruthy();

    await user.press(screen.getByTestId('zoom-close'));
    expect(screen.queryByTestId('zoom-image-modal')).toBeNull();
  });

  test('reopening starts back at 100%', async () => {
    const user = userEvent.setup();
    await render(<ZoomableImage url="https://example.com/a.png" colors={colors} />);
    await user.press(screen.getByTestId('zoom-image-open'));
    await user.press(screen.getByTestId('zoom-in'));
    await user.press(screen.getByTestId('zoom-close'));
    await user.press(screen.getByTestId('zoom-image-open'));
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
