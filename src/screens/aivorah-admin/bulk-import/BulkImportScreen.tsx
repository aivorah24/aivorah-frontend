import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { makeStyles } from './styles';
import { SpreadsheetImportPanel } from './components/SpreadsheetImportPanel';
import { TeacherImportPanel } from './components/TeacherImportPanel';

type ImportKind = 'students-parents' | 'students' | 'teachers';

const KINDS = [
  ['students-parents', 'Students + parents', 'users'],
  ['students', 'Students only', 'user'],
  ['teachers', 'Teachers', 'briefcase'],
] as const;

export default function BulkImportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [kind, setKind] = useState<ImportKind>('students-parents');

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Bulk Import" subtitle="Create student, parent or teacher accounts from a spreadsheet." onMenuPress={() => navigation?.openDrawer?.()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.tabs}>
            {KINDS.map(([key, label, icon]) => (
              <TouchableOpacity key={key} testID={`bulk-kind-${key}`} style={[styles.tab, kind === key && styles.tabActive]} onPress={() => setKind(key)} activeOpacity={0.8}>
                <Feather name={icon} size={14} color={kind === key ? colors.accentYellow : colors.textDim} />
                <Text style={[styles.tabText, kind === key && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {kind === 'teachers'
            ? <TeacherImportPanel />
            : <SpreadsheetImportPanel includeParents={kind === 'students-parents'} />}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
