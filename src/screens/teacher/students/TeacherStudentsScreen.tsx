import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';

import { makeStyles } from './styles';
import type { AddTab } from './types';
import { buildGradeTabs, computeStats, filterStudents } from './utils/studentFilters';
import { useStudentsList } from './hooks/useStudentsList';
import { useCreateStudent } from './hooks/useCreateStudent';
import { useLinkStudents } from './hooks/useLinkStudents';
import { useBulkImport } from './hooks/useBulkImport';
import { usePromoteStudents } from './hooks/usePromoteStudents';
import StudentCard from './components/StudentCard';
import StudentStatsRow from './components/StudentStatsRow';
import StudentFilterTabs from './components/StudentFilterTabs';
import AddStudentModal from './components/AddStudentModal';
import CredentialsModal from './components/CredentialsModal';
import TeacherPromoteDialog from './components/TeacherPromoteDialog';

export default function TeacherStudentsScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const gold = colors.accentYellow;
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [search, setSearch] = useState('');
  const initialTab = route?.params?.initialTab || 'All';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Add student modal
  const [addModal, setAddModal] = useState(false);
  const [addTab,   setAddTab]   = useState<AddTab>('create');

  // Re-apply the requested tab whenever navigation passes a new initialTab — the
  // screen instance can be reused (not remounted) when re-navigating from the
  // dashboard, so a useState initializer alone would only apply on first mount.
  // Adjusted during render (React's documented "adjusting state when a prop
  // changes" pattern) instead of an effect.
  const [prevInitialTab, setPrevInitialTab] = useState(route?.params?.initialTab);
  if (prevInitialTab !== route?.params?.initialTab) {
    setPrevInitialTab(route?.params?.initialTab);
    if (route?.params?.initialTab) setActiveTab(route.params.initialTab);
  }

  const {
    students, loading, refreshing, setRefreshing, load,
    fetchedGrades, fetchedCurricula, teacherGrades, allowedGrades, allowedCurricula,
    removingId, handleRemoveStudent,
  } = useStudentsList(user);

  const create  = useCreateStudent(user, load);
  const link    = useLinkStudents(user, load);
  const bulk    = useBulkImport(user, load);
  const promote = usePromoteStudents(user, load);

  const closeAddModal = () => setAddModal(false);
  const reloadLinkable = () => link.loadLinkableStudents(allowedGrades, teacherGrades);

  function openAddModal() {
    // Default to the teacher's first taught grade/curriculum so the preselected
    // values are always valid (allowed) options.
    const firstGrade = fetchedGrades[0] || user?.teaches?.[0]?.grade || user?.grade || 'Grade 3';
    const firstCurr  = fetchedCurricula[0] || user?.teaches?.[0]?.curriculum || user?.curriculum || 'IB PYP';
    setAddTab('create');
    create.resetCreateForm(firstGrade, firstCurr);
    link.setLinkEmail(''); link.setLinkError('');
    link.setLinkSearch(''); link.setSelectedStudents([]);
    bulk.setBulkResults(null); bulk.setBulkSummary(null); bulk.setBulkError('');
    bulk.setBulkGrade(firstGrade);
    bulk.setBulkCurriculum(firstCurr);
    reloadLinkable();
    setAddModal(true);
  }

  const todayISO = new Date().toISOString().split('T')[0];
  const filtered = filterStudents(students, search, activeTab, todayISO);
  const gradeTabs = buildGradeTabs(students);
  const stats = computeStats(students, todayISO);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Students"
          subtitle={`${stats.total} enrolled`}
          onMenuPress={() => navigation.openDrawer()}
        />
        {/* Add Student / Promote Students buttons */}
        <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'flex-end', marginHorizontal: spacing.xl, marginBottom: 4 }}>
          <TouchableOpacity testID="teacher-students-add-button" style={[styles.addBtn, { marginHorizontal: 0, marginBottom: 0, alignSelf: 'auto' }]} onPress={openAddModal} activeOpacity={0.8}>
            <Feather name="user-plus" size={14} color="#0B0B0B" />
            <Text style={styles.addBtnText}>Add Student</Text>
          </TouchableOpacity>
          {students.length > 0 && (
            promote.promoteMode ? (
              <TouchableOpacity testID="teacher-students-promote-cancel" style={styles.promoteBtnActive} onPress={promote.exitPromoteMode} activeOpacity={0.8}>
                <Feather name="x" size={14} color={colors.textMuted} />
                <Text style={styles.promoteBtnActiveText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity testID="teacher-students-promote-mode-button" style={styles.promoteBtn} onPress={() => promote.setPromoteMode(true)} activeOpacity={0.8}>
                <Feather name="arrow-up-circle" size={14} color="#0B0B0B" />
                <Text style={styles.promoteBtnText}>Promote Students</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {promote.promoteMode && (
          <View testID="teacher-students-promote-bar" style={styles.promoteBar}>
            <Text style={styles.promoteBarText}>
              {promote.selectedForPromote.size === 0 ? 'Tap students to select them' : `${promote.selectedForPromote.size} selected`}
            </Text>
            <TouchableOpacity
              testID="teacher-students-promote-confirm-button"
              style={[styles.promoteConfirmBtn, promote.selectedForPromote.size === 0 && { opacity: 0.5 }]}
              onPress={() => promote.setPromoteDialogOpen(true)}
              disabled={promote.selectedForPromote.size === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.promoteConfirmBtnText}>Promote</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          testID="teacher-students-scroll"
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accentYellow} />}
        >
          {/* Stats Row */}
          <StudentStatsRow stats={stats} colors={colors} gold={gold} styles={styles} />

          {/* Search */}
          <View style={styles.searchWrap}>
            <Feather name="search" size={15} color={colors.textDim} />
            <TextInput
              testID="teacher-students-search-input"
              style={styles.searchInput}
              placeholder="Search students..."
              placeholderTextColor={colors.textDim}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x" size={15} color={colors.textDim} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Tabs */}
          <StudentFilterTabs
            gradeTabs={gradeTabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            stats={stats}
            styles={styles}
          />

          {/* Student List */}
          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : filtered.length === 0 ? (
            <View testID="teacher-students-empty-state" style={styles.empty}>
              <Feather name="users" size={36} color={colors.textDim} />
              <Text style={styles.emptyText}>
                {students.length === 0 ? 'No students yet' : 'No students match'}
              </Text>
              {students.length === 0 && (
                <TouchableOpacity testID="teacher-students-empty-add-button" style={styles.emptyAddBtn} onPress={openAddModal} activeOpacity={0.8}>
                  <Feather name="user-plus" size={14} color="#fff" />
                  <Text style={styles.emptyAddBtnText}>Add your first student</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.studentGrid}>
              {filtered.map((s) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  colors={colors}
                  gold={gold}
                  styles={styles}
                  promoteMode={promote.promoteMode}
                  isSelectedForPromote={promote.selectedForPromote.has(s.id)}
                  removingId={removingId}
                  onPress={() => promote.promoteMode
                    ? promote.togglePromoteSelect(s.id)
                    : navigation.navigate('TeacherProgress' as any, { studentId: s.id })}
                  onRemove={() => handleRemoveStudent(s.id, reloadLinkable)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── Add Student Modal ── */}
      <AddStudentModal
        visible={addModal}
        onClose={() => { setAddModal(false); bulk.resetBulkState(); }}
        colors={colors}
        gold={gold}
        isDark={isDark}
        styles={styles}
        addTab={addTab}
        onSelectCreateTab={() => { setAddTab('create'); create.setCreateError(''); link.setLinkError(''); }}
        onSelectLinkTab={() => {
          setAddTab('link'); create.setCreateError(''); link.setLinkError('');
          link.setSelectedStudents([]); link.setLinkSearch(''); link.setLinkGradeFilter('All');
          reloadLinkable();
        }}
        onSelectBulkTab={() => {
          setAddTab('bulk'); create.setCreateError(''); link.setLinkError('');
          bulk.setBulkResults(null); bulk.setBulkSummary(null); bulk.setBulkError('');
        }}
        createProps={{
          colors, gold, styles, allowedGrades, allowedCurricula,
          newName: create.newName, setNewName: create.setNewName,
          newEmail: create.newEmail, setNewEmail: create.setNewEmail,
          newPassword: create.newPassword, setNewPassword: create.setNewPassword,
          newGrade: create.newGrade, setNewGrade: create.setNewGrade,
          newCurriculum: create.newCurriculum, setNewCurriculum: create.setNewCurriculum,
          creating: create.creating, createError: create.createError,
          onCancel: closeAddModal,
          onSubmit: () => create.handleCreateStudent(closeAddModal),
        }}
        linkProps={{
          colors, gold, isDark, styles, allowedGrades,
          linkSearch: link.linkSearch, setLinkSearch: link.setLinkSearch,
          linkGradeFilter: link.linkGradeFilter, setLinkGradeFilter: link.setLinkGradeFilter,
          linkableStudents: link.linkableStudents, linkableLoading: link.linkableLoading,
          selectedStudents: link.selectedStudents, toggleSelectedStudent: link.toggleSelectedStudent,
          linkEmail: link.linkEmail, linking: link.linking, linkError: link.linkError,
          onCancel: closeAddModal,
          onSubmit: () => link.handleLinkStudent(closeAddModal),
        }}
        bulkProps={{
          colors, styles, allowedGrades, allowedCurricula,
          bulkGrade: bulk.bulkGrade, setBulkGrade: bulk.setBulkGrade,
          bulkCurriculum: bulk.bulkCurriculum, setBulkCurriculum: bulk.setBulkCurriculum,
          bulkImporting: bulk.bulkImporting, bulkResults: bulk.bulkResults,
          bulkSummary: bulk.bulkSummary, bulkError: bulk.bulkError,
          selectedRows: bulk.selectedRows, toggleRow: bulk.toggleRow,
          fileInputRef: bulk.fileInputRef, previewBulkImport: bulk.previewBulkImport,
          onCommit: () => bulk.commitBulkImport(closeAddModal),
          onPreviewCancel: bulk.resetBulkState,
          downloadTemplate: bulk.downloadTemplate,
          downloadTemplateXlsx: bulk.downloadTemplateXlsx,
        }}
      />

      {/* ── Credentials Modal (shown after creating a new student) ── */}
      <CredentialsModal
        visible={create.credsModal}
        onClose={() => create.setCredsModal(false)}
        colors={colors}
        gold={gold}
        styles={styles}
        credsName={create.credsName}
        credsEmail={create.credsEmail}
        credsPassword={create.credsPassword}
        credsCopiedField={create.credsCopiedField}
        copyCredsField={create.copyCredsField}
        shareCredsToStudent={create.shareCredsToStudent}
        invited={create.credsInvited}
        inviteWarning={create.inviteWarning}
      />

      <TeacherPromoteDialog
        visible={promote.promoteDialogOpen}
        selectedStudents={students.filter((s) => promote.selectedForPromote.has(s.id))}
        colors={colors}
        onClose={() => promote.setPromoteDialogOpen(false)}
        onConfirm={promote.applyPromote}
      />
    </ScreenLayout>
  );
}
