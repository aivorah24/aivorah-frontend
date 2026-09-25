import { useState } from 'react';
import { Challenge, StudentItem, assignChallenge as assignChallengeApi } from '../services/teacherChallengesService';

function getDueDateLabel(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export function useAssignChallenge(teacherEmail: string | undefined, onAssigned?: () => void) {
  const [assignModal, setAssignModal]         = useState(false);
  const [assignChallengeItem, setAssignChallengeItem] = useState<Challenge | null>(null);
  const [studentSearch, setStudentSearch]     = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [assigning, setAssigning]             = useState(false);
  const [assignError, setAssignError]         = useState('');
  const [assignSuccess, setAssignSuccess]     = useState('');
  const [assignDueDate, setAssignDueDate]     = useState('');

  function openAssign(ch: Challenge) {
    setAssignChallengeItem(ch);
    setSelectedStudent(null);
    setStudentSearch('');
    setAssignError('');
    setAssignSuccess('');
    setAssignDueDate(getDueDateLabel(7));
    setAssignModal(true);
  }

  function closeAssign() {
    setAssignModal(false);
    setAssignChallengeItem(null);
    setSelectedStudent(null);
    setStudentSearch('');
    setAssignError('');
    setAssignSuccess('');
    setAssignDueDate('');
  }

  async function doAssign() {
    if (!assignChallengeItem || !selectedStudent) {
      setAssignError('Please select a student.');
      return;
    }
    if (!assignDueDate) { setAssignError('Please select a due date.'); return; }
    setAssigning(true);
    setAssignError('');
    try {
      const res = await assignChallengeApi({
        challengeId: assignChallengeItem.id,
        studentId: selectedStudent.id,
        teacherEmail: teacherEmail ?? '',
        dueDate: assignDueDate,
      });
      if (!res.ok) {
        setAssignError(res.error);
        return;
      }
      setAssignSuccess(
        res.alreadyAssigned
          ? `"${assignChallengeItem.title}" is already assigned to ${selectedStudent.name} — no new notification was sent.`
          : `"${assignChallengeItem.title}" assigned to ${selectedStudent.name}!`
      );
      onAssigned?.();
    } catch {
      setAssignError('Network error. Please try again.');
    } finally {
      setAssigning(false);
    }
  }

  return {
    assignModal, assignChallengeItem, studentSearch, setStudentSearch,
    selectedStudent, setSelectedStudent, assigning, assignError, assignSuccess,
    assignDueDate, setAssignDueDate, openAssign, closeAssign, doAssign, getDueDateLabel,
  };
}
