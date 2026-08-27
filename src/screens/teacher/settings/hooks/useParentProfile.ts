import { useState } from 'react';
import { addRole, createChildStudent, linkExistingChild } from '../services/settingsService';

// "Add a parent profile" — a teacher can also monitor their own child. First
// adds the 'parent' role to their account, then either creates a brand-new
// student account for the child or links an existing one by email.
export function useParentProfile(email: string | undefined, updateUser: (patch: any) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createChild(child: {
    name: string; email?: string; password?: string; grade: string; curriculum: string; school?: string;
  }): Promise<boolean> {
    if (!email) return false;
    if (!child.name.trim()) { setError("Child's name is required."); return false; }
    setLoading(true);
    setError('');
    const roleResult = await addRole(email, 'parent');
    if (roleResult.error) { setError(roleResult.error); setLoading(false); return false; }

    const result = await createChildStudent(email, child);
    setLoading(false);
    if (result.error) { setError(result.error); return false; }
    updateUser({ roles: roleResult.roles });
    return true;
  }

  async function linkChild(childEmail: string): Promise<boolean> {
    if (!email) return false;
    if (!childEmail.trim()) { setError('Please enter the student email.'); return false; }
    setLoading(true);
    setError('');
    const roleResult = await addRole(email, 'parent');
    if (roleResult.error) { setError(roleResult.error); setLoading(false); return false; }

    const result = await linkExistingChild(email, childEmail);
    setLoading(false);
    if (result.error) { setError(result.error); return false; }
    updateUser({ roles: roleResult.roles });
    return true;
  }

  return { loading, error, setError, createChild, linkChild };
}
