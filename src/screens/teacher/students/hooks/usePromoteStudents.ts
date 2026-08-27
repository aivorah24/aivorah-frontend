import { useState } from 'react';
import { promoteStudents as promoteStudentsApi } from '../services/studentsService';

export function usePromoteStudents(user: any, onPromoted: () => void) {
  // Promote (grade/section move) — mirrors School Admin's bulk-grade flow but
  // scoped server-side to only this teacher's own linked students.
  const [promoteMode, setPromoteMode] = useState(false);
  const [selectedForPromote, setSelectedForPromote] = useState<Set<string>>(new Set());
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);

  function togglePromoteSelect(id: string) {
    setSelectedForPromote((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitPromoteMode() {
    setPromoteMode(false);
    setSelectedForPromote(new Set());
    setPromoteDialogOpen(false);
  }

  // Returns an error string on failure, null on success — mirrors the School
  // Admin promote flow so the dialog can stay open and show the message.
  async function applyPromote(targetGrade: string, targetSection: string): Promise<string | null> {
    if (!user?.email || selectedForPromote.size === 0) return 'Nothing selected';
    try {
      const body: any = { studentIds: Array.from(selectedForPromote), grade: targetGrade };
      if (targetSection.trim()) body.section = targetSection.trim();
      const res = await promoteStudentsApi(user.email, body);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data?.error || 'Failed to promote selected students.';
      exitPromoteMode();
      onPromoted(); // refetch — the students' new grade/section shows up immediately, same source the student's own dashboard reads from
      return null;
    } catch {
      return 'Failed to promote. Check your connection.';
    }
  }

  return {
    promoteMode, setPromoteMode, selectedForPromote,
    promoteDialogOpen, setPromoteDialogOpen,
    togglePromoteSelect, exitPromoteMode, applyPromote,
  };
}
