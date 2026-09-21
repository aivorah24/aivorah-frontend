import { useState, useCallback } from 'react';
import { GradeRow, PromptState } from '../types';
import {
  fetchGradesSections,
  addGrade as addGradeApi,
  addSection as addSectionApi,
  renameGrade as renameGradeApi,
  archiveGrade as archiveGradeApi,
} from '../services/schoolAdminGradesSectionsService';

export function useGradesSections(userEmail: string | undefined | null) {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [prompt, setPrompt] = useState<PromptState>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptError, setPromptError] = useState('');
  const [promptBusy, setPromptBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userEmail) return;
    setError('');
    try {
      const data = await fetchGradesSections(userEmail);
      setGrades(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load grades & sections. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  function openPrompt(state: PromptState, initial = '') {
    setPrompt(state);
    setPromptValue(initial);
    setPromptError('');
  }

  function closePrompt() {
    setPrompt(null);
    setPromptValue('');
  }

  async function submitPrompt() {
    if (!userEmail || !prompt) return;
    const name = promptValue.trim();
    if (!name) {
      setPromptError('Please enter a name.');
      return;
    }
    setPromptBusy(true);
    setPromptError('');
    try {
      let updated: GradeRow[];
      if (prompt.kind === 'addGrade') {
        updated = await addGradeApi(userEmail, name);
      } else if (prompt.kind === 'addSection') {
        updated = await addSectionApi(userEmail, prompt.grade, name);
      } else {
        updated = await renameGradeApi(userEmail, prompt.grade, name);
      }
      setGrades(updated);
      closePrompt();
    } catch (err: any) {
      setPromptError(err.message || 'Something went wrong. Check your connection.');
    } finally {
      setPromptBusy(false);
    }
  }

  async function toggleArchiveGrade(grade: GradeRow) {
    if (!userEmail) return;
    try {
      const updated = await archiveGradeApi(userEmail, grade.name, !grade.archived);
      if (updated) setGrades(updated);
    } catch {
      // silent — the row just won't change
    }
  }

  return {
    grades,
    loading,
    error,
    showArchived,
    setShowArchived,
    prompt,
    promptValue,
    setPromptValue,
    promptError,
    promptBusy,
    load,
    openPrompt,
    closePrompt,
    submitPrompt,
    toggleArchiveGrade,
  };
}
