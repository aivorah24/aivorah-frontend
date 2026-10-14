import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { makeStyles } from './styles';
import { SpreadsheetImportPanel } from './components/SpreadsheetImportPanel';
import { QuickAddPanel } from './components/QuickAddPanel';

const TABS = [
  ['sheet', 'Upload spreadsheet', 'file-text'],
  ['quick', 'Quick add (names)', 'edit-3'],
] as const;

export default function BulkImportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<'sheet' | 'quick'>('sheet');

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Bulk Import" subtitle="Create student accounts from a spreadsheet, or from a list of names." onMenuPress={() => navigation?.openDrawer?.()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.tabs}>
            {TABS.map(([key, label, icon]) => (
              <TouchableOpacity key={key} testID={`bulk-tab-${key}`} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)} activeOpacity={0.8}>
                <Feather name={icon} size={14} color={tab === key ? colors.accentYellow : colors.textDim} />
                <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {tab === 'sheet' ? <SpreadsheetImportPanel /> : <QuickAddPanel />}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
