import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { normalizeCurriculum } from '../../../../../utils/curriculum';

interface Props {
  colors: AppColors;
  styles: any;
  allowedGrades: string[];
  allowedCurricula: string[];
  bulkGrade: string; setBulkGrade: (v: string) => void;
  bulkCurriculum: string; setBulkCurriculum: (v: string) => void;
  bulkImporting: boolean;
  bulkResults: any[] | null;
  bulkSummary: any | null;
  bulkError: string;
  selectedRows: Set<number>;
  toggleRow: (rowIndex: number) => void;
  fileInputRef: any;
  previewBulkImport: (file: File) => void;
  onCommit: () => void;
  onPreviewCancel: () => void;
  downloadTemplate: () => void;
  downloadTemplateXlsx: () => void;
}

export default function BulkImportTab({
  colors, styles, allowedGrades, allowedCurricula,
  bulkGrade, setBulkGrade, bulkCurriculum, setBulkCurriculum,
  bulkImporting, bulkResults, bulkSummary, bulkError,
  selectedRows, toggleRow, fileInputRef, previewBulkImport,
  onCommit, onPreviewCancel, downloadTemplate, downloadTemplateXlsx,
}: Props) {
  const gold = colors.accentYellow;

  return (
    <View style={{ gap: 12 }}>
      {!bulkResults ? (
        <>
          <Text style={styles.modalNote}>
            Upload a CSV or Excel file with columns: <Text style={{ color: colors.textMain, fontWeight: '700' }}>Name</Text>, Email (optional), Grade, Curriculum, School, Parent Name, Parent Email, Parent Phone. When a Parent Name is filled in, the parent gets their own account too. Students with a real email get an invite to set their password and verify their email; everyone else is asked to set a new password on first sign-in.
          </Text>

          {/* Default Grade / Curriculum for rows without those columns */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalFieldLabel}>Default Grade</Text>
              {allowedGrades.map(g => (
                <TouchableOpacity key={g} activeOpacity={0.8} onPress={() => setBulkGrade(g)}
                  style={[styles.modalOption, { borderColor: bulkGrade === g ? gold : colors.borderColor, backgroundColor: bulkGrade === g ? gold + '18' : 'transparent' }]}>
                  <Text style={{ fontSize: 12, color: bulkGrade === g ? gold : colors.textMuted, fontWeight: '600' }}>{g}</Text>
                  {bulkGrade === g && <Feather name="check" size={12} color={gold} />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalFieldLabel}>Default Curriculum</Text>
              {allowedCurricula.map(c => (
                <TouchableOpacity
                  key={c} activeOpacity={0.8}
                  onPress={() => setBulkCurriculum(c)}
                  disabled={allowedCurricula.length <= 1}
                  style={[styles.modalOption, { borderColor: bulkCurriculum === c ? gold : colors.borderColor, backgroundColor: bulkCurriculum === c ? gold + '18' : 'transparent' }]}
                >
                  <Text style={{ fontSize: 12, color: bulkCurriculum === c ? gold : colors.textMuted, fontWeight: '600', flex: 1 }}>{c}</Text>
                  {bulkCurriculum === c && <Feather name={allowedCurricula.length <= 1 ? 'lock' : 'check'} size={11} color={gold} />}
                </TouchableOpacity>
              ))}
              <Text style={{ fontSize: 10, color: colors.textDim, marginTop: 5, lineHeight: 14 }}>
                {allowedCurricula.length > 1 ? 'Pick the curriculum for imported students.' : 'Matches your curriculum. Contact admin to change.'}
              </Text>
            </View>
          </View>

          {bulkError ? (
            <Text style={{ color: colors.accentRed, fontSize: 13 }}>{bulkError}</Text>
          ) : null}

          {/* Hidden file input for web */}
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              data-testid="teacher-students-bulk-file-input"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              style={{ display: 'none' }}
              onChange={(e: any) => {
                const f = e.target.files?.[0];
                if (f) previewBulkImport(f);
                e.target.value = '';
              }}
            />
          )}

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity
              testID="teacher-students-bulk-template-csv"
              style={[styles.modalCancelBtn, { flex: 1 }]}
              onPress={downloadTemplate}
              activeOpacity={0.8}
            >
              <Feather name="download" size={14} color={colors.textMuted} />
              <Text style={styles.modalCancelText}>Template (CSV)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="teacher-students-bulk-template-xlsx"
              style={[styles.modalCancelBtn, { flex: 1 }]}
              onPress={downloadTemplateXlsx}
              activeOpacity={0.8}
            >
              <Feather name="file-text" size={14} color={colors.textMuted} />
              <Text style={styles.modalCancelText}>Template (Excel)</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity
              testID="teacher-students-bulk-choose-file-button"
              style={[styles.modalSaveBtn, { flex: 1 }, bulkImporting && { opacity: 0.6 }]}
              onPress={() => {
                if (Platform.OS === 'web') fileInputRef.current?.click();
              }}
              disabled={bulkImporting}
              activeOpacity={0.8}
            >
              {bulkImporting
                ? <><ActivityIndicator color="white" size="small" /><Text style={styles.modalSaveText}>Importing...</Text></>
                : <><Feather name="upload" size={14} color="#fff" /><Text style={styles.modalSaveText}>Choose File</Text></>}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Preview / selection view — NOTHING has been created yet. The
           only way anyone gets created is the explicit "Import Selected"
           tap below, which closes this modal itself once it succeeds. */
        <>
          {bulkSummary && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              {[
                { label: 'Matches Your Class', value: bulkSummary.matched ?? 0, color: colors.accentGreen },
                { label: 'Needs Review', value: bulkSummary.needsConfirmation ?? 0, color: '#B8797E' },
                { label: 'Already Exists', value: bulkSummary.skipped ?? 0, color: colors.accentYellow },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, minWidth: 70, backgroundColor: s.color + '15', borderWidth: 1, borderColor: s.color + '30', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.modalNote}>
            Nothing has been created yet. Uncheck anyone you don&apos;t want to import, then tap &quot;Import Selected&quot;.
          </Text>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {bulkResults.filter((r: any) => r.status !== 'skipped').map((r: any) => {
              const isChecked = selectedRows.has(r.rowIndex);
              const dotColor = r.status === 'needs_confirmation' ? '#B8797E' : colors.accentGreen;
              return (
                <TouchableOpacity
                  key={r.rowIndex} activeOpacity={0.7} onPress={() => toggleRow(r.rowIndex)}
                  testID={`teacher-students-bulk-row-${r.rowIndex}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
                >
                  <View style={{
                    width: 18, height: 18, borderRadius: 4, borderWidth: 2,
                    borderColor: isChecked ? dotColor : colors.borderColor,
                    backgroundColor: isChecked ? dotColor : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isChecked && <Feather name="check" size={12} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMain }}>{r.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                      {r.grade} · {normalizeCurriculum(r.curriculum)}{r.email ? ` · ${r.email}` : ''}
                    </Text>
                    {r.parentName ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                        <Feather name="users" size={10} color={colors.textDim} />
                        <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1 }} numberOfLines={1}>
                          {r.parentName}{r.parentEmail ? ` · ${r.parentEmail}` : ''}
                        </Text>
                      </View>
                    ) : null}
                    {r.error ? <Text style={{ fontSize: 11, color: dotColor }}>{r.error}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {bulkResults.filter((r: any) => r.status === 'skipped').map((r: any) => (
              <View key={r.rowIndex} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderColor, opacity: 0.6 }}>
                <Feather name="skip-forward" size={14} color={colors.accentYellow} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMain }}>{r.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.accentYellow }}>{r.error}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {bulkError ? (
            <Text testID="teacher-students-bulk-error" style={{ color: colors.accentRed, fontSize: 13 }}>{bulkError}</Text>
          ) : null}

          <View style={styles.modalBtns}>
            <TouchableOpacity testID="teacher-students-bulk-preview-cancel" style={styles.modalCancelBtn} onPress={onPreviewCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="teacher-students-bulk-commit-button"
              style={[styles.modalSaveBtn, (bulkImporting || selectedRows.size === 0) && { opacity: 0.6 }]}
              onPress={onCommit}
              disabled={bulkImporting || selectedRows.size === 0}
            >
              {bulkImporting
                ? <><ActivityIndicator color="white" size="small" /><Text style={styles.modalSaveText}>Importing...</Text></>
                : <Text style={styles.modalSaveText}>Import Selected ({selectedRows.size})</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
