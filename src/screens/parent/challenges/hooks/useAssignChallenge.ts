import { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { assignChallenge, Challenge, Child } from '../services/parentChallengesService';

function getDueDateLabel(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export function useAssignChallenge(onAssigned: () => void) {
  const { user } = useAuth();
  const [assignModal, setAssignModal] = useState(false);
  const [assignChallengeTarget, setAssignChallengeTarget] = useState<Challenge | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  function openAssign(ch: Challenge) {
    setAssignChallengeTarget(ch);
    setAssignError('');
    setAssignSuccess('');
    setAssignDueDate(getDueDateLabel(7));
    setAssignModal(true);
  }

  function closeAssign() {
    setAssignModal(false);
    setAssignChallengeTarget(null);
    setAssignError('');
    setAssignSuccess('');
    setAssignDueDate('');
  }

  async function doAssign(child: Child | null) {
    if (!assignChallengeTarget || !child) return;
    if (!assignDueDate) { setAssignError('Please select a due date'); return; }
    setAssigning(true);
    setAssignError('');
    try {
      const result = await assignChallenge({
        challengeId: assignChallengeTarget.id,
        studentId: child.id,
        parentEmail: user?.email ?? '',
        dueDate: assignDueDate,
      });
      if (!result.ok) { setAssignError(result.error); return; }
      setAssignSuccess(
        result.alreadyAssigned
          ? `"${assignChallengeTarget.title}" is already assigned to ${child.name} — no new notification was sent.`
          : `"${assignChallengeTarget.title}" assigned to ${child.name}!`
      );
      onAssigned();
    } catch {
      setAssignError('Network error. Please try again.');
    } finally {
      setAssigning(false);
    }
  }

  return {
    assignModal, assignChallengeTarget, assigning, assignError, assignSuccess, assignDueDate,
    setAssignDueDate, openAssign, closeAssign, doAssign, getDueDateLabel,
  };
}
