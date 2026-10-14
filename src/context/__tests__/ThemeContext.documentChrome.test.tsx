import React from 'react';
import { Platform } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../ThemeContext';
import { lightColors } from '../../theme';
import { applyDocumentChrome } from '../../utils/documentChrome';

jest.mock('../../utils/documentChrome', () => ({ applyDocumentChrome: jest.fn() }));

describe('ThemeProvider document chrome', () => {
  afterEach(() => jest.restoreAllMocks());

  it('syncs the web document background with the active theme', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await render(<ThemeProvider>{null}</ThemeProvider>);
    await waitFor(() => expect(applyDocumentChrome).toHaveBeenCalledWith(lightColors.bgDark));
  });
});
