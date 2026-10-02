import { trRequest } from '../../../../services/timetableResourcesClient';

export interface ResourceFolder {
  id: string; name: string; scope: string; author: string; updatedAt: string;
}
export interface ResourceFile {
  id: string; title: string; fileUrl: string; fileType: string | null;
  fileSize: number; scope: string; author: string; updatedAt: string;
}
export interface ResourcesResponse {
  canManage: boolean;
  scopeLabel: string | null;
  breadcrumb: { id: string; name: string }[];
  folders: ResourceFolder[];
  files: ResourceFile[];
}

export function fetchResources(folderId?: string | null): Promise<ResourcesResponse> {
  const q = folderId ? `?${new URLSearchParams({ folderId })}` : '';
  return trRequest<ResourcesResponse>(`/resources${q}`, {}, 'Failed to load resources');
}

export async function createFolder(body: { name: string; parentFolderId?: string | null; scope?: string }) {
  await trRequest('/resources/folder', { method: 'POST', body }, 'Failed to create folder');
}

export async function addFile(body: { folderId?: string | null; title: string; fileUrl: string; fileType?: string; fileSize?: number; scope?: string }) {
  await trRequest('/resources/file', { method: 'POST', body }, 'Failed to add file');
}

export async function deleteFolder(id: string) {
  await trRequest(`/resources/folder/${encodeURIComponent(id)}`, { method: 'DELETE' }, 'Failed to delete folder');
}

export async function deleteFile(id: string) {
  await trRequest(`/resources/file/${encodeURIComponent(id)}`, { method: 'DELETE' }, 'Failed to delete file');
}

// bytes → "13.55 MB" / "820 KB"
export function fmtSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ISO → "16 Jul 2026, 7:04 PM"
export function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${day} ${mon} ${d.getFullYear()}, ${h}:${m} ${ampm}`;
}
