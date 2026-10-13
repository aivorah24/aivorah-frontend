import { useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';
import { fetchWithRetry } from '../../../../utils/fetchWithRetry';
import { FALLBACK_SUGGESTIONS } from '../constants';
import { NCERT_CONTENT_KEY } from '../../../../utils/curriculum';

const QUESTION_TEMPLATES = [
  (t: string) => `What is ${t}?`,
  (t: string) => `Can you explain ${t}?`,
  (t: string) => `How does ${t} work?`,
  (t: string) => `Tell me about ${t}`,
  (t: string) => `What do we learn in ${t}?`,
];

// Same junk-topic filter as `looksLikeRealTopicName()` in
// aivorah-learning-paths-service/services/qdrant.js (Bug #11) — the
// monolith's /curriculum route (still called here, see Bug #14 note above
// useSuggestions) returns raw, unfiltered Qdrant topic names, which include
// image-caption placeholders and bare PDF filename codes (e.g. "iemr101",
// "aemr101") whenever a subject's first ingested topic happens to be one of
// those instead of a real chapter title. Ported here (not imported) because
// this hook talks to the monolith directly from the frontend and has no
// access to that backend service's module — kept in exact sync with the
// original so both stay consistent if either needs tightening later.
function looksLikeRealTopicName(topic: string): boolean {
  const t = String(topic || '').trim();
  if (!t) return false;
  if (/^\[?IMAGE\]?/i.test(t) || /^this image/i.test(t)) return false;
  if (/^[a-z]+\d{2,4}$/i.test(t)) return false; // raw PDF code, e.g. "iemr101"
  return true;
}

export function useSuggestions(userGrade: string, userCurriculum: string) {
  const [suggestions, setSuggestions] = useState<string[]>(
    FALLBACK_SUGGESTIONS[userGrade] ?? FALLBACK_SUGGESTIONS['Grade 3']
  );

  useEffect(() => {
    const isIBPYP = !userCurriculum || userCurriculum.toLowerCase().includes('ib');
    const endpoint = isIBPYP
      ? `${SERVER_URL}/curriculum?curriculum=IB_PYP&grade=${encodeURIComponent(userGrade)}`
      : `${SERVER_URL}/curriculum?curriculum=${NCERT_CONTENT_KEY}&grade=${encodeURIComponent(userGrade)}`;

    // A single-attempt fetch here used to mean any grade whose one request
    // happened to hit a transient network blip (confirmed real on this dev
    // machine — see fetchWithRetry's own doc comment) got stuck showing the
    // generic Grade 3 fallback set for the rest of the session, silently,
    // with no distinction from "this student's real suggestions are just
    // these" (bug: Grade 9 CBSE student shown "What is colour theory?").
    fetchWithRetry(endpoint)
      .then(r => r.json())
      .then(data => {
        const topics: { topic: string; subject: string }[] = data.topics || [];
        if (!topics.length) return;
        const bySubject: Record<string, string> = {};
        for (const t of topics) {
          if (!bySubject[t.subject] && looksLikeRealTopicName(t.topic)) {
            bySubject[t.subject] = t.topic;
          }
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
