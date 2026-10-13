import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

// Inline form error shown directly above the submit row, with an optional
// follow-up action (e.g. "Link to existing parent").
export default function FormSubmitError({ message, colors, action }: {
  message: string;
  colors: AppColors;
  action?: { label: string; onPress: () => void; busy?: boolean };
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!message) return null;
  return (
    <View style={styles.box} accessibilityRole="alert" testID="form-submit-error">
      <Feather name="alert-circle" size={15} color={colors.accentRed} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.text}>{message}</Text>
        {!!action && (
          <TouchableOpacity style={styles.actionBtn} onPress={action.onPress} disabled={action.busy} accessibilityRole="button">
            {action.busy
              ? <ActivityIndicator size="small" color={colors.accentYellow} />
              : <Text style={styles.actionText}>{action.label}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    box: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, borderColor: `${colors.accentRed}55`, backgroundColor: `${colors.accentRed}12`, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
    text: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMain, lineHeight: 18 },
    actionBtn: { alignSelf: 'flex-start', marginTop: 8, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: `${colors.accentYellow}18` },
    actionText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.accentYellow },
  });
}
