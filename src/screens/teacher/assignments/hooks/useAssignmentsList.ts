import { useCallback, useEffect, useState } from 'react';
import type { Assignment } from '../types';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

interface UseAssignmentsListArgs {
  teacherEmail: string;
}

// Owns the assignments list itself — load/refresh, mark-complete, delete —
// all three now routed to aivorah-assignments-service (2026-08-25).
// `load`/`markComplete` were verified byte-identical to the monolith's
// existing handlers before switching. `deleteAssignment`'s DELETE /:id was
// ported into the microservice in the same change (see that repo's
// routes/assignments.js) — self-contained, no dependency on the
// teacher-authoring pipeline that kept the rest of the monolith's
// assignment routes where they are.
export function useAssignmentsList({ teacherEmail }: UseAssignmentsListArgs) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments?teacherId=${encodeURIComponent(teacherEmail)}`);
      if (res.ok) setAssignments(await res.json());
    } catch {/* network */} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teacherEmail]);

  useEffect(() => {
    // data fetching effect — setState happens inside load, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function markComplete(id: string) {
    try {
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: null }),
      });
      if (res.ok) {
        setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
      }
    } catch {/* ignore */}
  }

  async function deleteAssignment(id: string) {
    try {
      await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${id}`, { method: 'DELETE' });
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch {/* ignore */}
  }

  return {
    assignments, setAssignments, loading, refreshing, setRefreshing,
    load, markComplete, deleteAssignment,
  };
}
