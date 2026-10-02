/**
 * School Policies & Resources — a browsable folder/file library (Toddle-style).
 * Parents browse read-only; teachers/admins get New folder + Upload. Students
 * are never routed here. Reuses the /messages/upload Cloudinary endpoint.
 */
import React, { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { fmtSize, fmtWhen } from './services/resourcesApi';
import { fileIcon, filterFolders, filterFiles } from './utils/resourcesFilter';
import { useResourcesState } from './hooks/useResourcesState';
import PdfViewerModal from './components/PdfViewerModal';

export default function ResourcesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    folderId, data, loading, error, search, setSearch, view, setView,
    showNewFolder, setShowNewFolder, newFolderName, setNewFolderName, busy, viewerDoc, setViewerDoc,
    load, openFolder, goCrumb, openFile, submitNewFolder, uploadFile, confirmDeleteFolder, confirmDeleteFile,
  } = useResourcesState();

  useFocusEffect(useCallback(() => { load(folderId); }, [load, folderId]));

  const canManage = !!data?.canManage;
  const q = search.trim().toLowerCase();
  const folders = filterFolders(data?.folders || [], search);
  const files = filterFiles(data?.files || [], search);

  const subtitle = data?.scopeLabel ? `${data.scopeLabel} · handbooks, policies & documents` : 'Handbooks, policies & documents';

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="School Policies & Resources" subtitle={subtitle} onMenuPress={() => navigation?.openDrawer?.()} />

        {/* Centered, max-width column (Google-Drive style) so the list stays
            compact instead of stretching edge-to-edge — same with or without
            the app sidebar. */}
        <View style={styles.centerWrap}>
        {/* Toolbar: breadcrumb + search + view toggle + manager actions */}
        <View style={styles.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.crumbs}>
            <TouchableOpacity onPress={() => goCrumb(null)}><Text style={[styles.crumb, !folderId && styles.crumbActive]}>Library</Text></TouchableOpacity>
            {(data?.breadcrumb || []).map((c, i, arr) => (
              <View key={c.id} style={styles.crumbRow}>
                <Feather name="chevron-right" size={13} color={colors.textDim} />
                <TouchableOpacity onPress={() => goCrumb(c.id)}><Text style={[styles.crumb, i === arr.length - 1 && styles.crumbActive]} numberOfLines={1}>{c.name}</Text></TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <View style={styles.toolRight}>
            <TouchableOpacity style={styles.viewToggle} onPress={() => setView(view === 'list' ? 'grid' : 'list')} accessibilityRole="button" accessibilityLabel={view === 'list' ? 'Grid view' : 'List view'}>
              <Feather name={view === 'list' ? 'grid' : 'list'} size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color={colors.textDim} />
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search for a folder or file" placeholderTextColor={colors.textDim} />
          {canManage && (
            <View style={styles.mgrBtns}>
              <TouchableOpacity style={styles.mgrBtn} onPress={() => setShowNewFolder(true)} accessibilityRole="button"><Feather name="folder-plus" size={14} color={colors.accentYellow} /><Text style={styles.mgrBtnText}>New folder</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.mgrBtn, styles.mgrBtnPrimary]} onPress={uploadFile} disabled={busy} accessibilityRole="button">{busy ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="upload" size={14} color="#fff" /><Text style={[styles.mgrBtnText, { color: '#fff' }]}>Upload</Text></>}</TouchableOpacity>
            </View>
          )}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : folders.length === 0 && files.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="folder" size={28} color={colors.textDim} />
              <Text style={styles.emptyText}>{q ? `Nothing matches "${search}"` : 'No resources here yet.'}</Text>
              {canManage && !q && <Text style={styles.emptySub}>Create a folder or upload a document to get started.</Text>}
            </View>
          ) : view === 'list' ? (
            <View>
              {/* Column header */}
              <View style={styles.listHead}>
                <Text style={[styles.colName, styles.headText]}>Name</Text>
                <Text style={[styles.colMeta, styles.headText]}>Last modified</Text>
                <Text style={[styles.colSize, styles.headText]}>Size</Text>
                {canManage && <View style={styles.colAct} />}
              </View>
              {folders.map((f) => (
                <TouchableOpacity key={f.id} style={styles.listRow} onPress={() => openFolder(f.id)} activeOpacity={0.7}>
                  <View style={styles.colName}><Feather name="folder" size={18} color={colors.accentYellow} /><Text style={styles.rowName} numberOfLines={1}>{f.name}</Text></View>
                  <Text style={styles.colMeta} numberOfLines={1}>{f.author} · {fmtWhen(f.updatedAt)}</Text>
                  <Text style={styles.colSize}>—</Text>
                  {canManage && <TouchableOpacity style={styles.colAct} onPress={() => confirmDeleteFolder(f)}><Feather name="trash-2" size={15} color={colors.accentRed} /></TouchableOpacity>}
                </TouchableOpacity>
              ))}
              {files.map((f) => { const ic = fileIcon(f.fileType); return (
                <TouchableOpacity key={f.id} style={styles.listRow} onPress={() => openFile(f)} activeOpacity={0.7}>
                  <View style={styles.colName}><Feather name={ic.name} size={18} color={ic.color} /><Text style={styles.rowName} numberOfLines={1}>{f.title}</Text></View>
                  <Text style={styles.colMeta} numberOfLines={1}>{f.author} · {fmtWhen(f.updatedAt)}</Text>
                  <Text style={styles.colSize}>{fmtSize(f.fileSize)}</Text>
                  {canManage && <TouchableOpacity style={styles.colAct} onPress={() => confirmDeleteFile(f)}><Feather name="trash-2" size={15} color={colors.accentRed} /></TouchableOpacity>}
                </TouchableOpacity>
              );})}
            </View>
          ) : (
            <View style={styles.grid}>
              {folders.map((f) => (
                <TouchableOpacity key={f.id} style={styles.gridCard} onPress={() => openFolder(f.id)} activeOpacity={0.75}>
                  <Feather name="folder" size={28} color={colors.accentYellow} />
                  <Text style={styles.gridName} numberOfLines={2}>{f.name}</Text>
                  <Text style={styles.gridMeta} numberOfLines={1}>{fmtWhen(f.updatedAt)}</Text>
                </TouchableOpacity>
              ))}
              {files.map((f) => { const ic = fileIcon(f.fileType); return (
                <TouchableOpacity key={f.id} style={styles.gridCard} onPress={() => openFile(f)} activeOpacity={0.75}>
                  <Feather name={ic.name} size={28} color={ic.color} />
                  <Text style={styles.gridName} numberOfLines={2}>{f.title}</Text>
                  <Text style={styles.gridMeta} numberOfLines={1}>{fmtSize(f.fileSize)}</Text>
                </TouchableOpacity>
              );})}
            </View>
          )}
        </ScrollView>
        </View>

        {/* New folder modal */}
        <Modal visible={showNewFolder} transparent animationType="fade" onRequestClose={() => setShowNewFolder(false)}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New folder</Text>
              <TextInput style={styles.modalInput} value={newFolderName} onChangeText={setNewFolderName} placeholder="Folder name" placeholderTextColor={colors.textDim} autoFocus />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowNewFolder(false); setNewFolderName(''); }}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalCreate, (!newFolderName.trim() || busy) && { opacity: 0.6 }]} disabled={!newFolderName.trim() || busy} onPress={submitNewFolder}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalCreateText}>Create</Text>}</TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <PdfViewerModal visible={!!viewerDoc} doc={viewerDoc} onClose={() => setViewerDoc(null)} />
      </View>
    </ScreenLayout>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgDark },
    centerWrap: { flex: 1, width: '100%', maxWidth: 1000, alignSelf: 'center' },
    toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 6 },
    crumbs: { alignItems: 'center', gap: 4 },
    crumbRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    crumb: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, maxWidth: 180 },
    crumbActive: { color: c.textHeading, fontWeight: '800' },
    toolRight: { marginLeft: 'auto', flexDirection: 'row', gap: 8 },
    viewToggle: { width: 34, height: 34, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.lg, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark },
    searchInput: { flex: 1, fontFamily: fonts.serif, fontSize: 13.5, color: c.textHeading, padding: 0 },
    mgrBtns: { flexDirection: 'row', gap: 6 },
    mgrBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor },
    mgrBtnPrimary: { backgroundColor: c.accentYellow, borderColor: c.accentYellow },
    mgrBtnText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: c.accentYellow },
    error: { fontFamily: fonts.serif, fontSize: 12.5, color: c.accentRed, marginHorizontal: spacing.lg, marginBottom: 4 },
    content: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 8 },
    emptyText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: c.textMuted },
    emptySub: { fontFamily: fonts.serif, fontSize: 12.5, color: c.textDim },
    listHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.borderColor },
    headText: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '800', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderColor },
    colName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
    rowName: { flex: 1, fontFamily: fonts.serif, fontSize: 13.5, fontWeight: '600', color: c.textHeading },
    colMeta: { width: 210, fontFamily: fonts.serif, fontSize: 11.5, color: c.textMuted },
    colSize: { width: 70, fontFamily: fonts.serif, fontSize: 11.5, color: c.textMuted, textAlign: 'right', fontVariant: ['tabular-nums'] },
    colAct: { width: 36, alignItems: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8 },
    gridCard: { width: 132, gap: 6, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark, alignItems: 'flex-start' },
    gridName: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: c.textHeading },
    gridMeta: { fontFamily: fonts.serif, fontSize: 10.5, color: c.textDim },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalCard: { backgroundColor: c.cardDark, borderRadius: 16, borderWidth: 1, borderColor: c.borderColor, padding: 20, width: '100%', maxWidth: 380, gap: 12 },
    modalTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '800', color: c.textHeading },
    modalInput: { borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.serif, fontSize: 14, color: c.textHeading, backgroundColor: c.bgDark },
    modalBtns: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    modalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor },
    modalCancelText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: c.textMuted },
    modalCreate: { backgroundColor: c.accentYellow, borderRadius: radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
    modalCreateText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '800', color: '#fff' },
  });
}
