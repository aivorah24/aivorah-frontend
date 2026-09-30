import { LIVE_SERVICE as BOOKS_HOST } from '../../../../../config/authServerUrl';

// The source PDFs live in server/data/ncert_books/grade6/<folder>/ — folder
// names don't always match the subject label shown in the UI (e.g. "Social
// Science" → "social_science"), so this maps between them.
export function subjectToBookFolder(subject: string): string {
  const s = subject.trim().toLowerCase();
  // The compound "... Science" subjects must be matched BEFORE the bare
  // `includes('science')` test, or Computer Science and Political Science both
  // resolve to the /science/ folder and their textbooks 404 — which is most of
  // the senior-grade catalogue.
  if (s.includes('computer')) return 'computer_science';
  if (s.includes('political')) return 'political_science';
  if (s.includes('social')) return 'social_science';
  if (s.includes('home')) return 'home_science';
  if (s.includes('evs') || s.includes('environ')) return 'evs';
  if (s.includes('science')) return 'science';
  if (s.includes('math')) return 'mathematics';
  if (s.includes('english')) return 'english';
  if (s.includes('business')) return 'business_studies';
  if (s.includes('physical education')) return 'physical_education';
  if (s.includes('fine art')) return 'fine_arts';
  return s.replace(/\s+/g, '_');
}

// Where the textbook PDF lives. The lesson payload carries `bookPath`
// ("grade11/mathematics/kemh101.pdf") resolved from the syllabus map, which is
// authoritative; only fall back to rebuilding the path from grade+subject for
// older lessons published before the map existed.
export function bookSrc(topic: any, grade: string, subject: string): string {
  // A book the teacher uploaded for this lesson.
  if (topic?.bookUrl) return topic.bookUrl;
  const rel = topic?.bookPath
    || `grade${grade.replace(/[^0-9]/g, '')}/${subjectToBookFolder(subject)}/${topic?.pdfFile}`;
  // Signed-URL redirect route lives on the auth service, not the (dead)
  // monolith SERVER_URL — see aivorah-auth-service/index.js's
  // /data/ncert_books/* route and its comment for why.
  // Books are the same everywhere, so even local dev reads them from the live service.
  return `${BOOKS_HOST}/data/ncert_books/${rel}`;
}

// The real NCERT book title varies by grade + subject — "Poorvi" is only the
// Grade 6 English reader. Using it as a blanket label mislabels every other
// book (e.g. Grade 6 Science is "Curiosity"). Map the ones we ship; fall back
// to a neutral, non-misleading label for the rest.
// The teacher's own book keeps the name they gave it.
export function bookLabel(topic: any, grade: string, subject: string): string {
  return topic?.bookUrl ? (topic.bookTitle || "Your teacher's book") : bookTitleFor(grade, subject);
}

export function bookTitleFor(grade: string, subject: string): string {
  const g = grade.replace(/[^0-9]/g, '');
  const s = subject.trim().toLowerCase();
  const G6: Record<string, string> = {
    english: 'Poorvi',
    science: 'Curiosity',
    'social science': 'Exploring Society: India and Beyond',
    mathematics: 'Ganita Prakash',
  };
  const key = s.includes('social') ? 'social science'
    : s.includes('science') ? 'science'
    : s.includes('math') ? 'mathematics'
    : s.includes('english') ? 'english' : s;
  if (g === '6' && G6[key]) return G6[key];
  return `${grade} ${subject} Textbook`;
}
