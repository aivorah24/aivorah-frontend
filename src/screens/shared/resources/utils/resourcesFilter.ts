import { ResourceFolder, ResourceFile } from '../services/resourcesApi';

export function fileIcon(type: string | null): { name: any; color: string } {
  const t = (type || '').toLowerCase();
  if (t === 'pdf') return { name: 'file-text', color: '#C0392B' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(t)) return { name: 'image', color: '#2E7D5B' };
  return { name: 'file', color: '#6E6A60' };
}

export function filterFolders(folders: ResourceFolder[], search: string): ResourceFolder[] {
  const q = search.trim().toLowerCase();
  return folders.filter((f) => !q || f.name.toLowerCase().includes(q));
}

export function filterFiles(files: ResourceFile[], search: string): ResourceFile[] {
  const q = search.trim().toLowerCase();
  return files.filter((f) => !q || f.title.toLowerCase().includes(q));
}
