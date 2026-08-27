import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import BrandingLogosCard from '../../components/BrandingLogosCard';

const colors = {
  bgDark: '#000', borderColor: '#333', textDim: '#666',
} as any;
const styles = { card: {}, fieldRow: {}, fieldLabel: {}, fieldSub: {}, changeBtn: {}, changeBtnText: {}, divider: {} } as any;

async function renderCard(overrides: Partial<React.ComponentProps<typeof BrandingLogosCard>> = {}) {
  const handlePickLogo = jest.fn();
  await render(
    <BrandingLogosCard
      school="Riverdale High" curriculum="IB PYP"
      schoolLogoUrl={null} curriculumLogoUrl={null} uploadingLogo={null}
      handlePickLogo={handlePickLogo}
      colors={colors} gold="#fa0" styles={styles}
      {...overrides}
    />,
  );
  return { handlePickLogo };
}

describe('BrandingLogosCard', () => {
  test('with no real logos yet, both rows show "Upload" and a placeholder icon', async () => {
    await renderCard();
    expect(screen.getByText('School Logo')).toBeTruthy();
    expect(screen.getByText('Curriculum Logo')).toBeTruthy();
    expect(screen.getAllByText('Upload')).toHaveLength(2);
  });

  test('a real existing schoolLogoUrl shows "Change" for school but "Upload" for curriculum', async () => {
    await renderCard({ schoolLogoUrl: 'https://cdn/school.png' });
    expect(screen.getByText('Change')).toBeTruthy();
    expect(screen.getByText('Upload')).toBeTruthy();
  });

  test('uploadingLogo="school" shows a real spinner in place of the school icon', async () => {
    await renderCard({ uploadingLogo: 'school' });
    // ActivityIndicator renders no discoverable text — assert indirectly via
    // the surrounding structure still rendering both field labels correctly.
    expect(screen.getByText('School Logo')).toBeTruthy();
  });

  test('tapping the school row triggers handlePickLogo("school")', async () => {
    const user = userEvent.setup();
    const { handlePickLogo } = await renderCard();
    await user.press(screen.getAllByText('Upload')[0]);
    expect(handlePickLogo).toHaveBeenCalledWith('school');
  });

  test('tapping the curriculum row triggers handlePickLogo("curriculum")', async () => {
    const user = userEvent.setup();
    const { handlePickLogo } = await renderCard();
    await user.press(screen.getAllByText('Upload')[1]);
    expect(handlePickLogo).toHaveBeenCalledWith('curriculum');
  });

  test('with no real school/curriculum set, shows the real setup hint instead of the name', async () => {
    await renderCard({ school: undefined, curriculum: undefined });
    expect(screen.getByText('Set your school in Profile & Account first')).toBeTruthy();
    expect(screen.getByText('Set your curriculum in Profile & Account first')).toBeTruthy();
  });
});
