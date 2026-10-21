import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { SCHOOL_BOARDS } from '../../shared/academicLabels';
import { SelectField } from '../../shared/SelectField';

// Required board pick for a school whose schools.curriculum is still null; the import saves it.
export function SchoolCurriculumPicker({ testID, schoolName, value, onChange, minWidth = 180 }: {
  testID: string; schoolName: string; value: string; onChange: (v: string) => void; minWidth?: number;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <SelectField testID={testID} label="Curriculum (required)" placeholder="Select" value={value} options={SCHOOL_BOARDS} onChange={onChange} minWidth={minWidth} />
      <Text testID={`${testID}-hint`} style={[styles.hint, { color: value ? colors.textDim : colors.accentOrange }]}>
        {value ? `This will set ${schoolName}'s curriculum to ${value}` : `${schoolName} has no curriculum yet — choose one`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ hint: { fontSize: 11.5, marginTop: 4, lineHeight: 16 } });
