import SERVER_URL from '../../../../config/schoolAdminServerUrl';
import { GradeRow } from '../types';

export const fetchGradesSections = async (adminEmail: string): Promise<GradeRow[]> => {
  const res = await fetch(`${SERVER_URL}/school-admin/grades-sections?adminEmail=${encodeURIComponent(adminEmail)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load grades & sections');
  return Array.isArray(data.grades) ? data.grades : [];
};

export const addGrade = async (adminEmail: string, name: string): Promise<GradeRow[]> => {
  const res = await fetch(`${SERVER_URL}/school-admin/grades?adminEmail=${encodeURIComponent(adminEmail)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Something went wrong.');
  return data.grades;
};

export const addSection = async (adminEmail: string, grade: string, name: string): Promise<GradeRow[]> => {
  const res = await fetch(`${SERVER_URL}/school-admin/grades/${encodeURIComponent(grade)}/sections?adminEmail=${encodeURIComponent(adminEmail)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Something went wrong.');
  return data.grades;
};

export const renameGrade = async (adminEmail: string, grade: string, name: string): Promise<GradeRow[]> => {
  const res = await fetch(`${SERVER_URL}/school-admin/grades/${encodeURIComponent(grade)}?adminEmail=${encodeURIComponent(adminEmail)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Something went wrong.');
  return data.grades;
};

export const archiveGrade = async (adminEmail: string, grade: string, archived: boolean): Promise<GradeRow[] | null> => {
  const res = await fetch(`${SERVER_URL}/school-admin/grades/${encodeURIComponent(grade)}/archive?adminEmail=${encodeURIComponent(adminEmail)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.grades)) return null;
  return data.grades;
};
