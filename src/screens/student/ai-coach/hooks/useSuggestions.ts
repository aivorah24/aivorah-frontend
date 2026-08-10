import { useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';
import { FALLBACK_SUGGESTIONS } from '../constants';

const QUESTION_TEMPLATES = [
  (t: string) => `What is ${t}?`,
  (t: string) => `Can you explain ${t}?`,
  (t: string) => `How does ${t} work?`,
  (t: string) => `Tell me about ${t}`,
  (t: string) => `What do we learn in ${t}?`,
];

export function useSuggestions(userGrade: string, userCurriculum: string) {
  const [suggestions, setSuggestions] = useState<string[]>(
    FALLBACK_SUGGESTIONS[userGrade] ?? FALLBACK_SUGGESTIONS['Grade 3']
  );

  useEffect(() => {
    const isIBPYP = !userCurriculum || userCurriculum.toLowerCase().includes('ib');
    const endpoint = isIBPYP
      ? `${SERVER_URL}/curriculum?curriculum=IB_PYP&grade=${encodeURIComponent(userGrade)}`
      : `${SERVER_URL}/curriculum?curriculum=NCERT&grade=${encodeURIComponent(userGrade)}`;

    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        const topics: { topic: string; subject: string }[] = data.topics || [];
        if (!topics.length) return;
        const bySubject: Record<string, string> = {};
        for (const t of topics) {
          if (!bySubject[t.subject]) bySubject[t.subject] = t.topic;
        }
        const chips = Object.values(bySubject)
          .slice(0, 6)
          .map((topic, i) => QUESTION_TEMPLATES[i % QUESTION_TEMPLATES.length](topic));
        setSuggestions(chips);
      })
      .catch(() => {});
  }, [userGrade, userCurriculum]);

  return suggestions;
}
