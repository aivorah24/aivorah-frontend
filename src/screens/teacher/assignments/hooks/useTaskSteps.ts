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
  selectedLanguage?: string;
}

// Owns the IB PYP task-step cards (add/update/remove + AI "Generate with
// AI" fill) — extracted verbatim (no behavior change) from
// TeacherAssignmentsScreen.tsx, fifth step of its hooks/components
// decomposition (2026-08-25).
export function useTaskSteps({ title, chapter, subject, effectiveGrade, effectiveCurriculum, selectedLanguage }: UseTaskStepsArgs) {
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([]);
  const [generatingSteps, setGeneratingSteps] = useState(false);
  const [stepsError, setStepsError] = useState('');
  const [fillingStepId, setFillingStepId] = useState<string | null>(null);

  // A new step starts blank — the teacher writes it or taps "Fill with AI";
  // generic default text would reach students with nothing to act on
  function addTaskStep(type: StepType) {
    setTaskSteps(prev => [...prev, {
      ...STEP_DEFAULTS[type],
      id: Date.now().toString(),
      type,
      label: '',
      instructions: '',
    } as TaskStep]);
  }

  async function fillStepWithAI(id: string) {
    const step = taskSteps.find(s => s.id === id);
    if (!step) return;
    const topic = (chapter || title || '').trim();
    if (!topic && !step.label?.trim()) { setStepsError('Add a Chapter / Topic or a step title first.'); return; }
    setStepsError('');
    setFillingStepId(id);
    try {
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/generate-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: step.type, label: step.label?.trim() || undefined, topic, subject,
          grade: effectiveGrade, curriculum: effectiveCurriculum,
          language: subject === 'Language Acquisition' ? selectedLanguage : undefined,
          otherSteps: taskSteps.filter(s => s.id !== id).map(s => ({ type: s.type, label: s.label })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.step) { setStepsError(data.error || 'AI could not write this step. Try again.'); return; }
      const s = data.step;
      setTaskSteps(prev => prev.map(p => p.id !== id ? p : {
        ...p,
        label: s.label || p.label,
        instructions: s.instructions || p.instructions,
        provocation: s.provocation ?? p.provocation,
        sections: Array.isArray(s.sections) && s.sections.length ? s.sections : p.sections,
        problems: Array.isArray(s.problems) && s.problems.length ? s.problems : p.problems,
        reflectionPrompts: Array.isArray(s.reflectionPrompts) && s.reflectionPrompts.length ? s.reflectionPrompts : p.reflectionPrompts,
        wordBank: Array.isArray(s.wordBank) && s.wordBank.length ? s.wordBank : p.wordBank,
      }));
    } catch (e: any) {
      setStepsError(`Failed: ${e.message || 'Cannot reach the assignments server'}`);
    } finally {
      setFillingStepId(null);
    }
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
        body: JSON.stringify({
          topic, subject, grade: effectiveGrade, curriculum: effectiveCurriculum,
          language: subject === 'Language Acquisition' ? selectedLanguage : undefined,
        }),
      });
      const data = await res.json();
      console.log('[generateSteps] response:', JSON.stringify(data));
      if (!res.ok) { setStepsError(data.error || 'Server returned an error'); return; }
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        // The server decides how many steps and which kinds; keep all of them
        const aiSteps: TaskStep[] = data.steps.map((s: any) => {
          const type = s.type as StepType;
          const defaults = STEP_DEFAULTS[type] || {};
          return {
            ...defaults,
            id: Date.now().toString() + Math.random(),
            type,
            label: s.label || defaults.label || '',
            instructions: s.instructions || defaults.instructions || '',
            provocation: s.provocation ?? defaults.provocation,
            sections: Array.isArray(s.sections) && s.sections.length ? s.sections : (defaults.sections || []),
            wordBank: Array.isArray(s.wordBank) ? s.wordBank : [],
            problems: Array.isArray(s.problems) ? s.problems : (defaults.problems || []),
            reflectionPrompts: Array.isArray(s.reflectionPrompts) ? s.reflectionPrompts : (defaults.reflectionPrompts || []),
          } as TaskStep;
        });
        setTaskSteps(aiSteps);
      } else {
        setStepsError('AI returned no steps — check browser console (F12) for details.');
      }
    } catch (e: any) {
      console.error('[generateSteps] fetch error:', e);
      setStepsError(`Failed: ${e.message || 'Cannot reach the assignments server'}`);
    } finally {
      setGeneratingSteps(false);
    }
  }

  return {
    taskSteps, setTaskSteps, generatingSteps, stepsError,
    addTaskStep, updateTaskStep, removeTaskStep, generateSteps, fillStepWithAI, fillingStepId,
  };
}
