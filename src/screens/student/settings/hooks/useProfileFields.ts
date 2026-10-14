import { useState } from 'react';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import { ALL_GRADES } from '../constants';
import { normalizeCurriculum } from '../../../../utils/curriculum';

// Name / Grade / Curriculum / Location edits - each saves independently on
// its own PATCH, not a whole-form save.
export function useProfileFields(user: any, updateUser: (patch: any) => void, closeModal: () => void) {
  const [newName, setNewName] = useState(user?.name || '');
  const [nameError, setNameError] = useState('');

  // Bug #27: this used to slice to "current grade and higher only", so a
  // mistakenly-entered grade (e.g. Grade 10 when the student is really in
  // Grade 9) could never be corrected back down — Grade 9 was never even
  // offered as an option. Full edit control means every real grade is
  // always selectable, regardless of the account's current value.
  const GRADES = ALL_GRADES;
  const [selectedGrade, setSelectedGrade] = useState(user?.grade || '');
  const [gradeLoading, setGradeLoading] = useState(false);

  const [selectedCurriculum, setSelectedCurriculum] = useState(user?.curriculum || '');
  const [curriculumLoading, setCurriculumLoading] = useState(false);

  const [newLocation, setNewLocation] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  function resetForm() {
    setNewName(user?.name || '');
    setNameError('');
    setSelectedGrade(user?.grade || '');
    setSelectedCurriculum(user?.curriculum || '');
    setNewLocation(user?.location || '');
  }

  async function handleSaveName() {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError('Please enter a name.'); return; }
    updateUser({ name: trimmed });
    closeModal();
    // Persist to the users table so teacher & parent views (which read users.name) update.
    try {
      await fetch(`${PROFILE_SERVER_URL}/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, name: trimmed }),
      });
    } catch {}
  }

  async function handleSaveGrade() {
    if (!selectedGrade) return;
    setGradeLoading(true);
    try {
      await fetch(`${PROFILE_SERVER_URL}/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, grade: selectedGrade }),
      });
      updateUser({ grade: selectedGrade });
      closeModal();
    } catch {
      // silently fail — updateUser already updated locally
      updateUser({ grade: selectedGrade });
      closeModal();
    } finally {
      setGradeLoading(false);
    }
  }

  async function handleSaveCurriculum() {
    if (!selectedCurriculum) return;
    const curriculum = normalizeCurriculum(selectedCurriculum);
    setCurriculumLoading(true);
    try {
      await fetch(`${PROFILE_SERVER_URL}/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, curriculum }),
      });
      updateUser({ curriculum });
      closeModal();
    } catch {
      updateUser({ curriculum });
      closeModal();
    } finally {
      setCurriculumLoading(false);
    }
  }

  async function handleSaveLocation() {
    const loc = newLocation.trim();
    setLocationLoading(true);
    try {
      await fetch(`${PROFILE_SERVER_URL}/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, location: loc }),
      });
      updateUser({ location: loc });
      closeModal();
    } catch {
      updateUser({ location: loc });
      closeModal();
    } finally {
      setLocationLoading(false);
    }
  }

  return {
    newName, setNewName, nameError, setNameError, handleSaveName,
    GRADES, selectedGrade, setSelectedGrade, gradeLoading, handleSaveGrade,
    selectedCurriculum, setSelectedCurriculum, curriculumLoading, handleSaveCurriculum,
    newLocation, setNewLocation, locationLoading, handleSaveLocation,
    resetForm,
  };
}
