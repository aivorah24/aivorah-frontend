import { useState } from 'react';
import type { StepType, TaskStep } from '../types';
import { STEP_DEFAULTS } from '../constants';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

interface UseTaskStepsArgs {
  title: string;
  chapter: string;
  subject: string;
  effectiveGrade: string;
  effectiveCurriculum: string;
}

// Owns the IB PYP task-step cards (add/update/remove + AI "Generate with
// AI" fill) — extracted verbatim (no behavior change) from
// TeacherAssignmentsScreen.tsx, fifth step of its hooks/components
// decomposition (2026-08-25).
export function useTaskSteps({ title, chapter, subject, effectiveGrade, effectiveCurriculum }: UseTaskStepsArgs) {
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([]);
  const [generatingSteps, setGeneratingSteps] = useState(false);
  const [stepsError, setStepsError] = useState('');

  function addTaskStep(type: StepType) {
    setTaskSteps(prev => [...prev, {
      id: Date.now().toString(),
      type,
      ...STEP_DEFAULTS[type],
    } as TaskStep]);
  }
  function updateTaskStep(id: string, patch: Partial<TaskStep>) {
    setTaskSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }
  function removeTaskStep(id: string) {
    setTaskSteps(prev => prev.filter(s => s.id !== id));
  }

  async function generateSteps() {
    const topic = (chapter || title || subject || '').trim();
    setStepsError('');
    if (!topic) {
      setStepsError('Pick or type a Chapter / Topic above first (e.g. "Food Chain").');
      return;
    }
    setGeneratingSteps(true);
    try {
      console.log('[generateSteps] Calling API with topic:', topic, 'grade:', effectiveGrade, 'curriculum:', effectiveCurriculum, 'ASSIGNMENTS_SERVER_URL:', ASSIGNMENTS_SERVER_URL);
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/generate-steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, grade: effectiveGrade, curriculum: effectiveCurriculum }),
      });
      const data = await res.json();
      console.log('[generateSteps] response:', JSON.stringify(data));
      if (!res.ok) { setStepsError(data.error || 'Server returned an error'); return; }
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        const aiSteps = data.steps.map((s: any) => ({
          id: Date.now().toString() + Math.random(),
          type: s.type as StepType,
          label: s.label,
          instructions: s.instructions,
          sections: s.type === 'structured_writing' ? ['Beginning', 'Middle', 'End'] : [],
          wordBank: [],
        }));
        // Any step the AI still left out is filled from STEP_DEFAULTS, in the
        // server's step order, so the teacher always gets the full set.
        const expected: StepType[] = Array.isArray(data.stepTypes) ? data.stepTypes : [];
        const filled = expected.length
          ? expected.flatMap(type => {
              const aiStep = aiSteps.find((s: TaskStep) => s.type === type);
              if (aiStep) return [aiStep];
              return STEP_DEFAULTS[type] ? [{ id: Date.now().toString() + Math.random(), type, ...STEP_DEFAULTS[type] } as TaskStep] : [];
            })
          : aiSteps;
        setTaskSteps(filled);
      } else {
        setStepsError('AI returned no steps — check browser console (F12) for details.');
      }
    } catch (e: any) {
      console.error('[generateSteps] fetch error:', e);
      setStepsError(`Failed: ${e.message || 'Cannot reach server on port 3006'}`);
    } finally {
      setGeneratingSteps(false);
    }
  }

  return {
    taskSteps, setTaskSteps, generatingSteps, stepsError,
    addTaskStep, updateTaskStep, removeTaskStep, generateSteps,
  };
}
