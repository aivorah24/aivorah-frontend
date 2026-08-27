import React from 'react';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import TeacherPreferencesCard from '../../components/TeacherPreferencesCard';

const colors = { accentBlue: '#08f', borderColor: '#333' } as any;
const styles = { card: {}, toggleRow: {}, fieldLabel: {}, fieldSub: {}, fieldRow: {}, changeBtn: {}, changeBtnText: {}, divider: {} } as any;

async function renderCard(overrides: Partial<React.ComponentProps<typeof TeacherPreferencesCard>> = {}) {
  const setAutoGrading = jest.fn();
  const setShareProgress = jest.fn();
  const saveTeacherPref = jest.fn();
  const onOpenCurriculumModal = jest.fn();
  await render(
    <TeacherPreferencesCard
      user={{ curriculum: 'IB PYP', grade: 'Grade 3' }}
      autoGrading={true} setAutoGrading={setAutoGrading}
      shareProgress={true} setShareProgress={setShareProgress}
      saveTeacherPref={saveTeacherPref}
      teacherRoleVal={null} experienceVal={null}
      onOpenCurriculumModal={onOpenCurriculumModal}
      colors={colors} gold="#fa0" styles={styles}
      {...overrides}
    />,
  );
  return { setAutoGrading, setShareProgress, saveTeacherPref, onOpenCurriculumModal };
}

describe('TeacherPreferencesCard', () => {
  test('real curriculum + grade renders as a single combined label', async () => {
    await renderCard();
    expect(screen.getByText('IB PYP · Grade 3')).toBeTruthy();
  });

  test('no real curriculum/grade at all still shows the real IB PYP default (curriculumLabel\'s own fallback)', async () => {
    await renderCard({ user: {} });
    expect(screen.getByText('IB PYP')).toBeTruthy();
  });

  test('real teaches entries with no curriculum/grade fields at all show the real "not set" hint', async () => {
    await renderCard({ user: { teaches: [{}] } });
    expect(screen.getByText('Not set — tap Update to add your grades')).toBeTruthy();
  });

  test('multiple real teaches entries combine into a real multi-grade label', async () => {
    await renderCard({
      user: { teaches: [{ curriculum: 'CBSE', grade: 'Grade 6' }, { curriculum: 'CBSE', grade: 'Grade 7' }] },
    });
    expect(screen.getByText('CBSE · Grades 6, 7')).toBeTruthy();
  });

  test('teacherRoleVal/experienceVal render only when at least one real value exists', async () => {
    await renderCard({ teacherRoleVal: 'Subject Teacher', experienceVal: '5-10 years' });
    expect(screen.getByText('Subject Teacher · 5-10 years')).toBeTruthy();
  });

  test('neither teacherRoleVal nor experienceVal set -> no Role & Experience row at all', async () => {
    await renderCard();
    expect(screen.queryByText(/Role/)).toBeNull();
  });

  test('toggling AI Auto-Grading calls setAutoGrading and saveTeacherPref with the real new value', async () => {
    const { setAutoGrading, saveTeacherPref } = await renderCard({ autoGrading: true });
    fireEvent(screen.getByTestId('teacher-settings-toggle-autoGrading'), 'valueChange', false);
    expect(setAutoGrading).toHaveBeenCalledWith(false);
    expect(saveTeacherPref).toHaveBeenCalledWith('autoGrading', false);
  });

  test('toggling Share Progress calls setShareProgress and saveTeacherPref with the real new value', async () => {
    const { setShareProgress, saveTeacherPref } = await renderCard({ shareProgress: true });
    fireEvent(screen.getByTestId('teacher-settings-toggle-shareProgress'), 'valueChange', false);
    expect(setShareProgress).toHaveBeenCalledWith(false);
    expect(saveTeacherPref).toHaveBeenCalledWith('shareProgress', false);
  });

  test('tapping Update on Curriculum opens the real curriculum modal', async () => {
    const user = userEvent.setup();
    const { onOpenCurriculumModal } = await renderCard();
    await user.press(screen.getByText('Update'));
    expect(onOpenCurriculumModal).toHaveBeenCalledTimes(1);
  });
});
