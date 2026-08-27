import { useEffect, useState } from 'react';
import type { Assignment } from '../types';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

// Owns the assignment Detail modal — submissions fetch on open/close, tab
// state, and per-submission teacher feedback. Both endpoints (GET
// /:id/submissions, PUT /:id/teacher-feedback) now route to
// aivorah-assignments-service (2026-08-25) — ported verbatim into that repo
// alongside this switch, no behavior change.
export function useAssignmentDetail() {
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'students' | 'questions'>('overview');
  const [detailSubmissions, setDetailSubmissions] = useState<any[]>([]);
  const [detailTotalLinked, setDetailTotalLinked] = useState(0);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    if (!detailAssignment) {
      // reset when the detail modal closes — the effect also owns the fetch
      // path below when it's open, so this stays as one effect
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetailSubmissions([]);
      setDetailTotalLinked(0);
      setDetailTab('overview');
      setExpandedStudent(null);
      setTeacherFeedback('');
      return;
    }
    setLoadingSubmissions(true);
    fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${detailAssignment.id}/submissions`)
      .then(r => r.ok ? r.json() : { submissions: [], totalLinked: 0 })
      .then(data => { setDetailSubmissions(data.submissions || []); setDetailTotalLinked(data.totalLinked || 0); })
      .catch(() => {})
      .finally(() => setLoadingSubmissions(false));
  }, [detailAssignment?.id]);

  async function sendFeedback(assignmentId: string, studentId: string) {
    if (!teacherFeedback.trim()) return;
    setSendingFeedback(true);
    try {
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${assignmentId}/teacher-feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, feedback: teacherFeedback.trim() }),
      });
      if (res.ok) {
        // Update the local submission with teacher feedback
        setDetailSubmissions(prev => prev.map(s => {
          if (s.studentId !== studentId) return s;
          let fbObj: any = {};
          try { fbObj = JSON.parse(s.aiFeedback || '{}'); } catch { fbObj = { text: s.aiFeedback || '' }; }
          fbObj.teacherFeedback = teacherFeedback.trim();
          fbObj.teacherFeedbackAt = new Date().toISOString();
          return { ...s, aiFeedback: JSON.stringify(fbObj) };
        }));
        setTeacherFeedback('');
      }
    } catch {/* ignore */}
    setSendingFeedback(false);
  }

  return {
    detailAssignment, setDetailAssignment, detailTab, setDetailTab,
    detailSubmissions, detailTotalLinked, loadingSubmissions,
    expandedStudent, setExpandedStudent,
    teacherFeedback, setTeacherFeedback, sendingFeedback, sendFeedback,
  };
}
