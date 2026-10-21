import { useState } from 'react';
import type { StepType, TaskStep } from '../types';
import { STEP_DEFAULTS } from '../constants';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

interface UseIBGenerationArgs {
  title: string;
  chapter: string;
  unitOfInquiry: string;
  subject: string;
  effectiveGrade: string;
  effectiveCurriculum: string;
  selectedLanguage: string;
  setFormError: (v: string) => void;
  setIbPurpose: (v: string) => void;
  setIbCentralIdea: (v: string) => void;
  setIbLinesOfInquiry: (v: string[]) => void;
  setIbLearnerProfile: (v: string) => void;
  setIbAtlSkill: (v: string) => void;
  setIbKeyConcept: (v: string) => void;
  setIbLearningOutcomes: (v: string[]) => void;
  setTaskSteps: React.Dispatch<React.SetStateAction<TaskStep[]>>;
  setSuccessCriteria: (v: string[]) => void;
  setIbWordBank: (v: string[]) => void;
  setIbStamps: (v: string[]) => void;
}

// Owns the "Generate with AI" IB PYP assignment flow (purpose, central idea,
// lines of inquiry, task steps, success criteria, word bank, stamps) —
// extracted verbatim (no behavior change) from TeacherAssignmentsScreen.tsx,
// sixth step of its hooks/components decomposition (2026-08-25).
export function useIBGeneration({
  title, chapter, unitOfInquiry, subject, effectiveGrade, effectiveCurriculum, selectedLanguage,
  setFormError, setIbPurpose, setIbCentralIdea, setIbLinesOfInquiry, setIbLearnerProfile,
  setIbAtlSkill, setIbKeyConcept, setIbLearningOutcomes, setTaskSteps, setSuccessCriteria,
  setIbWordBank, setIbStamps,
}: UseIBGenerationArgs) {
  const [generatingIB, setGeneratingIB] = useState(false);

  async function generateIBAssignment() {
    const topic = (chapter || unitOfInquiry || title || '').trim();
    if (!topic) { setFormError('Pick or type a Chapter / Topic above before generating'); return; }
    setGeneratingIB(true); setFormError('');
    try {
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/generate-ibpyp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject,
          grade: effectiveGrade,
          curriculum: effectiveCurriculum,
          language: subject === 'Language Acquisition' ? selectedLanguage : undefined,
          unitOfInquiry: unitOfInquiry.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'IB generation failed'); return; }
      if (data.purpose) setIbPurpose(data.purpose);
      if (data.centralIdea) setIbCentralIdea(data.centralIdea);
      if (Array.isArray(data.linesOfInquiry) && data.linesOfInquiry.length > 0) setIbLinesOfInquiry(data.linesOfInquiry);
      if (data.learnerProfile) setIbLearnerProfile(data.learnerProfile);
      if (data.atlSkill) setIbAtlSkill(data.atlSkill);
      if (data.keyConcept) setIbKeyConcept(data.keyConcept);
      if (Array.isArray(data.learningOutcomes) && data.learningOutcomes.length > 0) {
        setIbLearningOutcomes(data.learningOutcomes);
      }
      if (Array.isArray(data.taskSteps) && data.taskSteps.length > 0) {
        // The server designs the steps (count + kinds); keep them as sent
        setTaskSteps(data.taskSteps.slice(0, 5).map((s: any) => {
          const enforcedType: StepType = s.type;
          const defaults = STEP_DEFAULTS[enforcedType] || {};
          const sections = Array.isArray(s.sections) && s.sections.length ? s.sections : (defaults.sections || []);
          const HOOK_TYPES: StepType[] = ['tuning_in','text_connection','social_inquiry','language_culture','artistic_exploration','digital_awareness','movement_exploration'];
          const REFLECTION_TYPES: StepType[] = ['math_reflection','writing_reflection','social_synthesis','communication','artistic_reflection','digital_citizenship','physical_reflection'];
          return {
            id: Date.now().toString() + Math.random(),
            type: enforcedType,
            label: s.label || (defaults.label as string) || '',
            instructions: s.instructions || (defaults.instructions as string) || '',
            provocation: HOOK_TYPES.includes(enforcedType) ? (s.provocation || '') : undefined,
            sections,
            wordBank: [],
            problems: enforcedType === 'problem_solving' ? (Array.isArray(s.problems) ? s.problems : []) : [],
            reflectionPrompts: REFLECTION_TYPES.includes(enforcedType) ? (Array.isArray(s.reflectionPrompts) ? s.reflectionPrompts : []) : [],
          };
        }));
      }
      if (Array.isArray(data.successCriteria) && data.successCriteria.length > 0) {
        setSuccessCriteria(data.successCriteria);
      }
      if (Array.isArray(data.wordBank) && data.wordBank.length > 0) {
        setIbWordBank(data.wordBank);
      }
      if (Array.isArray(data.stamps) && data.stamps.length > 0) {
        setIbStamps(data.stamps);
      }
    } catch (e: any) {
      setFormError(`IB generation failed: ${e.message}`);
    } finally {
      setGeneratingIB(false);
    }
  }

  return { generatingIB, generateIBAssignment };
}
