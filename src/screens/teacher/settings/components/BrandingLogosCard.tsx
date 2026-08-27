import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { spacing } from '../../../../theme';
import SectionHeader from './SectionHeader';

// School + curriculum logo — uploaded once here, reused on every worksheet
// header for this school/curriculum.
export default function BrandingLogosCard({
  school, curriculum, schoolLogoUrl, curriculumLogoUrl, uploadingLogo, handlePickLogo,
  colors, gold, styles,
}: {
  school: string | undefined;
  curriculum: string | undefined;
  schoolLogoUrl: string | null;
  curriculumLogoUrl: string | null;
  uploadingLogo: 'school' | 'curriculum' | null;
  handlePickLogo: (kind: 'school' | 'curriculum') => void;
  colors: AppColors;
  gold: string;
  styles: any;
}) {
  return (
    <>
      <SectionHeader icon="image" label="Worksheet Branding" color={gold} styles={styles} />
      <View style={styles.card}>
        <View style={styles.fieldRow}>
          <TouchableOpacity onPress={() => handlePickLogo('school')} activeOpacity={0.85}
            style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {uploadingLogo === 'school' ? <ActivityIndicator size="small" color={gold} />
              : schoolLogoUrl ? <Image source={{ uri: schoolLogoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              : <Feather name="upload" size={16} color={colors.textDim} />}
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.fieldLabel}>School Logo</Text>
            <Text style={styles.fieldSub}>{school || 'Set your school in Profile & Account first'}</Text>
          </View>
          <TouchableOpacity style={styles.changeBtn} onPress={() => handlePickLogo('school')} activeOpacity={0.7}>
            <Text style={styles.changeBtnText}>{schoolLogoUrl ? 'Change' : 'Upload'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
        <View style={styles.fieldRow}>
          <TouchableOpacity onPress={() => handlePickLogo('curriculum')} activeOpacity={0.85}
            style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {uploadingLogo === 'curriculum' ? <ActivityIndicator size="small" color={gold} />
              : curriculumLogoUrl ? <Image source={{ uri: curriculumLogoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              : <Feather name="upload" size={16} color={colors.textDim} />}
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.fieldLabel}>Curriculum Logo</Text>
            <Text style={styles.fieldSub}>{curriculum || 'Set your curriculum in Profile & Account first'}</Text>
          </View>
          <TouchableOpacity style={styles.changeBtn} onPress={() => handlePickLogo('curriculum')} activeOpacity={0.7}>
            <Text style={styles.changeBtnText}>{curriculumLogoUrl ? 'Change' : 'Upload'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.fieldSub, { marginTop: spacing.sm, fontStyle: 'italic' }]}>
          These two logos appear on every worksheet header for your school/curriculum.
        </Text>
      </View>
    </>
  );
}
