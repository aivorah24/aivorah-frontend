import { useEffect, useState } from 'react';
import LEARNING_PATHS_SERVER_URL from '../config/learningPathsServerUrl';
import { normalizeCurriculum } from '../utils/curriculum';

const cache = new Map<string, Promise<string[]>>();

// Subject names the Learning Path has for this curriculum + grade (same list students see).
export function fetchLearningPathSubjects(curriculum: string, grade: string): Promise<string[]> {
  const c = normalizeCurriculum(curriculum) ?? '';
  const key = `${c}|${grade}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(`${LEARNING_PATHS_SERVER_URL}/curriculum/subjects?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(c)}`)
      .then((r) => (r.ok ? r.json() : { subjects: [] }))
      .then((d) => (d.subjects ?? []).map((s: any) => s?.subject).filter(Boolean) as string[])
      .catch(() => []);
    p.then((list) => { if (list.length === 0) cache.delete(key); });
    cache.set(key, p);
  }
  return p;
}

// Learning Path subjects for the pair; `fallback` only while loading or when the path has none.
export function useLearningPathSubjects(curriculum: string, grade: string, fallback: string[]) {
  const [state, setState] = useState<{ key: string; subjects: string[] | null }>({ key: '', subjects: null });
  const key = `${curriculum}|${grade}`;
  useEffect(() => {
    if (!curriculum || !grade) return;
    let active = true;
    fetchLearningPathSubjects(curriculum, grade).then((subjects) => { if (active) setState({ key, subjects }); });
    return () => { active = false; };
  }, [curriculum, grade, key]);
  const loaded = state.key === key ? state.subjects : null;
  return {
    subjects: loaded && loaded.length > 0 ? loaded : fallback,
    loading: !!curriculum && !!grade && loaded === null,
    fromLearningPath: !!loaded && loaded.length > 0,
  };
}

export function clearLearningPathSubjectsCache() {
  cache.clear();
}
