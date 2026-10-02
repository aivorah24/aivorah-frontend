import { useCallback, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { trUpload } from '../../../../services/timetableResourcesClient';
import {
  fetchResources, createFolder, addFile, deleteFolder, deleteFile,
  ResourcesResponse, ResourceFolder, ResourceFile,
} from '../services/resourcesApi';
import { ViewerDoc } from '../components/PdfViewerModal';

// State + handlers for ResourcesScreen — mirrors the previous inline
// component state and behavior exactly. The web-only <input> upload trick
// and the window.confirm (web) vs Alert.alert (native) delete-confirmation
// branches are preserved verbatim, as are the silent per-action error
// messages surfaced only via the `error` state.
export function useResourcesState() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [data, setData] = useState<ResourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<ViewerDoc | null>(null);

  const load = useCallback(async (fid: string | null) => {
    setLoading(true); setError('');
    try {
      setData(await fetchResources(fid));
    } catch (e: any) {
      setError(e?.message || 'Failed to load resources'); setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const openFolder = (id: string) => { setSearch(''); setFolderId(id); };
  const goCrumb = (id: string | null) => { setSearch(''); setFolderId(id); };
  // Open in the in-app viewer modal (PDF/image) instead of leaving the app.
  const openFile = (f: ResourceFile) => { if (f.fileUrl) setViewerDoc({ title: f.title, fileUrl: f.fileUrl, fileType: f.fileType }); };

  const submitNewFolder = async () => {
    if (!newFolderName.trim()) return;
    setBusy(true);
    try {
      await createFolder({ name: newFolderName.trim(), parentFolderId: folderId, scope: 'school' });
      setShowNewFolder(false); setNewFolderName('');
      await load(folderId);
    } catch (e: any) { setError(e?.message || 'Failed to create folder'); }
    finally { setBusy(false); }
  };

  const uploadFile = () => {
    if (Platform.OS !== 'web') { Alert.alert('Upload', 'Please upload files from the web app.'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg,.gif,.webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) { setError('Files must be under 25 MB.'); return; }
      setBusy(true); setError('');
      try {
        const up = await trUpload(file, file.name);
        await addFile({ folderId, title: up.name || file.name, fileUrl: up.url, fileType: up.type, fileSize: up.size || file.size, scope: 'school' });
        await load(folderId);
      } catch (e: any) { setError(e?.message || 'Upload failed'); }
      finally { setBusy(false); }
    };
    input.click();
  };

  const confirmDeleteFolder = (f: ResourceFolder) => {
    const go = async () => { setBusy(true); try { await deleteFolder(f.id); await load(folderId); } catch (e: any) { setError(e?.message || 'Failed'); } finally { setBusy(false); } };
    if (Platform.OS === 'web') { if (window.confirm(`Delete folder "${f.name}" and everything inside it?`)) go(); }
    else Alert.alert('Delete folder', `Delete "${f.name}" and its contents?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };
  const confirmDeleteFile = (f: ResourceFile) => {
    const go = async () => { setBusy(true); try { await deleteFile(f.id); await load(folderId); } catch (e: any) { setError(e?.message || 'Failed'); } finally { setBusy(false); } };
    if (Platform.OS === 'web') { if (window.confirm(`Delete "${f.title}"?`)) go(); }
    else Alert.alert('Delete file', `Delete "${f.title}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  return {
    folderId, data, loading, error, search, setSearch, view, setView,
    showNewFolder, setShowNewFolder, newFolderName, setNewFolderName, busy, viewerDoc, setViewerDoc,
    load, openFolder, goCrumb, openFile, submitNewFolder, uploadFile, confirmDeleteFolder, confirmDeleteFile,
  };
}
