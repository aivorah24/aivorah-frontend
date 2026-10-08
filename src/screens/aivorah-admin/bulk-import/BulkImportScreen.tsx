import React, { useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { makeStyles } from './styles';
import { useBulkImport } from './hooks/useBulkImport';

export default function BulkImportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    namesText, setNamesText, names, grade, setGrade, section, setSection,
    school, setSchool, curriculum, setCurriculum, submitting, error, result, submit, reset,
  } = useBulkImport();

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Bulk Import" subtitle="Create several student accounts at once." onMenuPress={() => navigation?.openDrawer?.()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {result ? (
            <View style={styles.table}>
              <Text style={styles.tableHeading}>
                {result.created.length} account{result.created.length !== 1 ? 's' : ''} created
                {result.errors.length > 0 ? `, ${result.errors.length} failed` : ''}
              </Text>
              <Text style={styles.tableSubheading}>Save these — passwords are shown only once.</Text>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableHeaderCell}>NAME</Text>
                <Text style={styles.tableHeaderCell}>EMAIL</Text>
                <Text style={styles.tableHeaderCell}>PASSWORD</Text>
                <Text style={styles.tableHeaderCell}>GRADE</Text>
              </View>
              {result.created.map((s) => (
                <View key={s.email} style={styles.tableRow} testID={`bulk-created-row-${s.email}`}>
                  <Text style={styles.tableCell}>{s.name}</Text>
                  <Text style={[styles.tableCell, { color: colors.accentCyan }]}>{s.email}</Text>
                  <Text style={[styles.tableCell, styles.tableCellMono]}>{s.password}</Text>
                  <Text style={styles.tableCell}>{s.grade}{s.section ? ` · ${s.section}` : ''}</Text>
                </View>
              ))}
              {result.errors.map((e, i) => (
                <View key={`${e.name}-${i}`} style={[styles.tableRow, styles.errorRow]} testID={`bulk-error-row-${i}`}>
                  <Text style={styles.tableCell}>{e.name}</Text>
                  <Text style={[styles.tableCell, { color: colors.accentRed, flex: 3 }]}>{e.error}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.resetBtn} onPress={reset} testID="bulk-import-again">
                <Text style={styles.resetBtnText}>Import more</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Class details</Text>
                <View style={styles.row}>
                  <View style={styles.field}>
                    <Text style={styles.label}>SCHOOL</Text>
                    <TextInput testID="bulk-school" style={styles.input} value={school} onChangeText={setSchool} placeholder="e.g. TSRA" placeholderTextColor={colors.textDim} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>GRADE</Text>
                    <TextInput testID="bulk-grade" style={styles.input} value={grade} onChangeText={setGrade} placeholder="e.g. Grade 6" placeholderTextColor={colors.textDim} />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.field}>
                    <Text style={styles.label}>SECTION (optional)</Text>
                    <TextInput testID="bulk-section" style={styles.input} value={section} onChangeText={setSection} placeholder="e.g. A" placeholderTextColor={colors.textDim} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>CURRICULUM</Text>
                    <TextInput testID="bulk-curriculum" style={styles.input} value={curriculum} onChangeText={setCurriculum} placeholder="e.g. CBSE" placeholderTextColor={colors.textDim} />
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Student names ({names.length})</Text>
                <TextInput
                  testID="bulk-names"
                  style={styles.textarea}
                  value={namesText}
                  onChangeText={setNamesText}
                  placeholder={'One name per line, e.g.\nAsha Rao\nBen Kumar'}
                  placeholderTextColor={colors.textDim}
                  multiline
                />
                <Text style={styles.hint}>A login email and a one-time password are generated for each student.</Text>
              </View>

              {!!error && (
                <View style={styles.errorBanner} testID="bulk-import-error">
                  <Feather name="alert-circle" size={14} color={colors.accentRed} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity testID="bulk-import-submit" style={styles.submitBtn} onPress={submit} disabled={submitting} activeOpacity={0.85}>
                {submitting ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={styles.submitBtnText}>Create {names.length || ''} Account{names.length !== 1 ? 's' : ''}</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
