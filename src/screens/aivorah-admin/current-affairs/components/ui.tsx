import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CaStyles } from '../styles';

export function Segment<T extends string>({ styles, options, value, onChange, testID }: {
  styles: CaStyles; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testID: string;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <TouchableOpacity key={o.value} testID={`${testID}-${o.value}`} style={[styles.segBtn, value === o.value && styles.segBtnOn]} onPress={() => onChange(o.value)}>
          <Text style={[styles.segText, value === o.value && styles.segTextOn]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function Button({ styles, label, icon, onPress, kind = 'plain', disabled, testID }: {
  styles: CaStyles; label: string; icon?: string; onPress: () => void; kind?: 'plain' | 'primary' | 'danger'; disabled?: boolean; testID?: string;
}) {
  const box = [styles.btn, kind === 'primary' && styles.btnPrimary, kind === 'danger' && styles.btnDanger, disabled && { opacity: 0.5 }];
  const text = [styles.btnText, kind === 'primary' && styles.btnPrimaryText, kind === 'danger' && styles.btnDangerText];
  return (
    <TouchableOpacity testID={testID} style={box} onPress={onPress} disabled={disabled}>
      {icon ? <Feather name={icon as any} size={13} color={StyleSheet.flatten(text).color as string} /> : null}
      <Text style={text}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Field({ styles, label, value, onChange, multiline, testID, placeholder }: {
  styles: CaStyles; label: string; value: string; onChange: (v: string) => void; multiline?: boolean; testID?: string; placeholder?: string;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholder={placeholder}
      />
    </View>
  );
}

export function LoadState({ styles, loading, error, onRetry, color }: {
  styles: CaStyles; loading: boolean; error: string; onRetry: () => void; color: string;
}) {
  if (loading) return <ActivityIndicator size="large" color={color} style={{ marginTop: 24 }} />;
  if (!error) return null;
  return (
    <View style={styles.emptyBox}>
      <Feather name="alert-circle" size={26} color={color} />
      <Text style={styles.emptyText}>{error}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );
}
