import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SortDir } from '../../shared/tableControls';

interface Props {
  label: string;
  active: boolean;
  dir: SortDir;
  onPress: () => void;
  colors: any;
  styles: any;
  flexGrow?: number;
  testID: string;
}

// A clickable table-header cell that shows an up/down arrow when it's the
// active sort column — used by Students/Teachers/Parents (the only tables
// with enough rows for sorting to matter).
export default function SortableHeaderCell({ label, active, dir, onPress, colors, styles, flexGrow = 1, testID }: Props) {
  return (
    <TouchableOpacity style={[styles.tableHeaderCellBtn, { flex: flexGrow }]} onPress={onPress} activeOpacity={0.7} testID={testID}>
      <Text style={styles.tableHeaderCell}>{label}</Text>
      {active && <Feather name={dir === 'asc' ? 'arrow-up' : 'arrow-down'} size={10} color={colors.accentYellow} />}
    </TouchableOpacity>
  );
}
