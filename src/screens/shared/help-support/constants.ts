import type { Faq } from './types';

export const TEACHER_FAQS: Faq[] = [
  { q: 'How do I create an assignment for all students?', a: "Go to Assignments → tap '+'. Leave the student field set to 'All Students' to broadcast to everyone enrolled. The assignment appears instantly in every student's app and is auto-tracked in their schedule." },
  { q: 'How do I see which students need help?', a: "Every student has a status tag: Getting Started (first week), Excelling, On Track, Keep Going, or Needs Attention (not active for 7+ days). Your Dashboard shows a 'Needs Attention' count, and the Students screen has a filter for it." },
  { q: 'How is student progress calculated?', a: "Progress = completed topics ÷ total curriculum topics × 100. Students earn XP for each topic they complete via the Learn screen. You can view per-student breakdowns in the Progress tab." },
  { q: 'How does AI auto-grading work?', a: "When a student submits a scaffolded assignment (brainstorm, drawing, writing), the AI analyses each step against the topic and grade level. It returns a score (0–100%) and step-by-step feedback. You can review grades in Assignments." },
  { q: 'Can I message parents directly?', a: "Yes — go to Messages in the sidebar. Your conversation list shows all parent threads. Parents can only see messages related to their own child. Tap the compose icon to start a new conversation." },
  { q: 'How do I create a challenge for my class?', a: "Go to Challenges → '+'. Set the title, subject, time limit, and difficulty. Challenges are broadcast to all enrolled students. Per-student challenges and paid challenge flows are coming soon." },
  { q: 'What does the AI Suggested Action mean?', a: "The AI analyses class data — scores, engagement, topic completion — and recommends the single most impactful action you can take today. It could be a re-teach prompt, a challenge suggestion, or flagging a struggling student." },
  { q: 'How do I track assignment submissions?', a: "Go to Assignments → tap any assignment to see submission status. Completed assignments show the student's score and AI feedback. The status badge turns green when all students have submitted." },
  { q: 'Can students use the AI Coach without my permission?', a: "Yes — the AI Coach is always available for self-directed learning. It stays within the enrolled curriculum (IB PYP or CBSE) and grade level. You can see AI Coach usage in the student's Progress screen." },
  { q: 'How do I contact Aivorah support?', a: "Use the 'Submit Ticket' button below to send us a message, or chat with Aivorah 24/7 for instant answers. Our support team responds to tickets within 24 hours on business days." },
];

export const SCHOOL_ADMIN_FAQS: Faq[] = [
  { q: 'How do I add a student?', a: "Go to Students → 'Add Student' for one student, or 'Bulk Import' to upload a CSV/Excel file of many at once. New accounts get login credentials emailed automatically, and you can review/download them right after an import." },
  { q: 'How does Bulk Import work?', a: "Upload a CSV or Excel file, map its columns to Aivorah's fields, review the rows we flagged as invalid, then confirm. Every import — including who ran it and how many rows were imported or skipped — is logged in Import History." },
  { q: 'How do I set up Grades & Sections and Classes?', a: "Grades & Sections defines your school's academic structure. Classes is every Grade×Section pair — assign a Class Teacher to each from there so parents and students see the right contact." },
  { q: 'How do I add or manage Teachers?', a: "Go to Teachers → 'Add Teacher' for one, or 'Import Teachers' for a bulk CSV/Excel upload. You can edit a teacher's assigned grades and subjects at any time from their profile." },
  { q: 'How do I create a school-wide Announcement?', a: "Go to Announcements → compose a new one, choose the audience (e.g. all parents, a specific grade), and publish or schedule it. Published announcements also show as Active on your Overview." },
  { q: 'How do I archive or restore a student?', a: "Open a student from Students and choose Archive — this preserves their record but disables sign-in. Archived Students lists everyone you've archived, with a one-tap Restore." },
  { q: 'What does the Import History page show?', a: "Every bulk-import run for your school — the file, who ran it, rows imported vs. skipped, and the outcome — so you always have a record of what changed and when." },
  { q: 'What can I edit in Workspace Settings?', a: "Academic year, timezone, and contact email are editable from Workspace Settings → Academic Setup → Edit. School name and logo are managed by the Aivorah team for now." },
  { q: 'How do I contact Aivorah support?', a: "Use the 'Submit Ticket' button below to send us a message, or chat with Aivorah 24/7 for instant answers. Our support team responds to tickets within 24 hours on business days." },
];

export const TEACHER_CHAT_SUGGESTIONS = [
  'How do I create an assignment?',
  'How does AI grading work?',
  'How do I message parents?',
  'How is progress calculated?',
  'Can I create challenges?',
];

export const SCHOOL_ADMIN_CHAT_SUGGESTIONS = [
  'How do I add a student?',
  'How does Bulk Import work?',
  'How do I add a teacher?',
  'How do I create an announcement?',
  'What can I edit in Workspace Settings?',
];

export function faqsForRole(isSchoolAdmin: boolean): Faq[] {
  return isSchoolAdmin ? SCHOOL_ADMIN_FAQS : TEACHER_FAQS;
}

export function chatSuggestionsForRole(isSchoolAdmin: boolean): string[] {
  return isSchoolAdmin ? SCHOOL_ADMIN_CHAT_SUGGESTIONS : TEACHER_CHAT_SUGGESTIONS;
}

export function chatGreetingForRole(isSchoolAdmin: boolean): string {
  return isSchoolAdmin
    ? `Hi! I'm your Aivorah 24/7 Support Assistant. Ask me anything about managing students, teachers, bulk imports, and announcements!`
    : `Hi! I'm your Aivorah 24/7 Support Assistant. Ask me anything about managing your class, assignments, grading, and more!`;
}

export function chatPlaceholderForRole(isSchoolAdmin: boolean): string {
  return isSchoolAdmin ? 'Ask about students, teachers, imports...' : 'Ask about assignments, grading, students...';
}
