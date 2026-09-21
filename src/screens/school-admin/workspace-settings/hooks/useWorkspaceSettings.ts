import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchWorkspaceOverview, fetchSchoolLogo, saveWorkspaceSettings, uploadSchoolLogo } from '../services/workspaceSettingsService';
import type { WorkspaceSchool } from '../types';

const ACADEMIC_YEARS = ['2025-26', '2026-27', '2027-28'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useWorkspaceSettings(adminEmail: string | undefined) {
  const [school, setSchool] = useState<WorkspaceSchool>({ name: '', academicYear: '', contactEmail: '' });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WorkspaceSchool>({ name: '', academicYear: '', contactEmail: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = useCallback(async () => {
    if (!adminEmail) return;
    try {
      const data = await fetchWorkspaceOverview(adminEmail);
      setSchool(data);
      if (data.name) setLogoUrl(await fetchSchoolLogo(data.name));
    } catch {
      // Settings still renders with whatever it has — same as the legacy screen.
    } finally {
      setLoading(false);
    }
  }, [adminEmail]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const startEdit = useCallback(() => {
    setDraft({ name: school.name, academicYear: school.academicYear || ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1], contactEmail: school.contactEmail });
    setSaveError('');
    setEditing(true);
  }, [school]);

  const cancelEdit = useCallback(() => { setEditing(false); setSaveError(''); }, []);

  const setDraftField = useCallback((field: keyof WorkspaceSchool, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
  }, []);

  const save = useCallback(async () => {
    if (!adminEmail) return;
    const name = draft.name.trim();
    const contactEmail = draft.contactEmail.trim();
    if (!name) { setSaveError('School name cannot be empty.'); return; }
    if (contactEmail && !EMAIL_RE.test(contactEmail)) { setSaveError('Enter a valid contact email, or leave it blank.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const updated = await saveWorkspaceSettings(adminEmail, { name, academicYear: draft.academicYear, contactEmail });
      setSchool(updated);
      setEditing(false);
      return true;
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save. Check your connection and try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [adminEmail, draft]);

  const uploadLogo = useCallback(async (base64: string, mimeType: string) => {
    if (!school.name) return;
    setUploadingLogo(true);
    try {
      const url = await uploadSchoolLogo(school.name, base64, mimeType);
      setLogoUrl(url);
      return url;
    } finally {
      setUploadingLogo(false);
    }
  }, [school.name]);

  return {
    school, logoUrl, loading,
    editing, draft, saving, saveError, uploadingLogo,
    startEdit, cancelEdit, setDraftField, save, uploadLogo,
    academicYears: ACADEMIC_YEARS,
  };
}
