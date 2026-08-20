import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { CURRICULA, getGradesForCurriculum } from '../../../onboarding/OnboardingScreen';
import { SelectField, locateFull } from '../../../onboarding/OnboardingSharedFields';
import { ALL_CITIES } from '../constants';
import type { makeStyles } from '../ProfileScreen';

interface EditProfileModalProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  visible: boolean;
  onClose: () => void;
  editName: string;
  setEditName: (v: string) => void;
  editCurriculum: string;
  setEditCurriculum: (v: string) => void;
  editGrade: string;
  setEditGrade: (v: string) => void;
  editLocation: string;
  setEditLocation: (v: string) => void;
  editSchool: string;
  setEditSchool: (v: string) => void;
  editBio: string;
  setEditBio: (v: string) => void;
  locating: boolean;
  setLocating: (v: boolean) => void;
  saveProfileLoading: boolean;
  saveProfileError: string;
  onSave: () => void;
}

// Edit Profile modal — name, curriculum (radio tiles reused from onboarding),
// grade (chips scoped to the chosen curriculum), location (searchable city
// picker + "use my location" on web), school, and bio.
export function EditProfileModal({
  styles,
  colors,
  visible,
  onClose,
  editName,
  setEditName,
  editCurriculum,
  setEditCurriculum,
  editGrade,
  setEditGrade,
  editLocation,
  setEditLocation,
  editSchool,
  setEditSchool,
  editBio,
  setEditBio,
  locating,
  setLocating,
  saveProfileLoading,
  saveProfileError,
  onSave,
}: EditProfileModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={20} color={colors.textMuted} /></TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.inputRow}>
              <Feather name="user" size={14} color={colors.textDim} />
              <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={colors.textDim} value={editName} onChangeText={setEditName} autoCapitalize="words" />
            </View>

            {/* Curriculum — same radio-tile picker as onboarding */}
            <Text style={styles.fieldLabel}>Curriculum</Text>
            <View style={styles.radioGrid}>
              {CURRICULA.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.radioTile, editCurriculum === c && styles.radioTileActive]}
                  onPress={() => {
                    setEditCurriculum(c);
                    if (!getGradesForCurriculum(c).includes(editGrade)) setEditGrade('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipTxt, editCurriculum === c && styles.chipTxtActive]}>{c}</Text>
                  <View style={[styles.radio, editCurriculum === c && { borderColor: colors.accentYellow }]}>
                    {editCurriculum === c && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Grade — same chip picker as onboarding, scoped to the chosen curriculum */}
            <Text style={styles.fieldLabel}>Grade</Text>
            <View style={styles.chipRow}>
              {getGradesForCurriculum(editCurriculum).map(g => (
                <TouchableOpacity key={g} style={[styles.chip, editGrade === g && styles.chipActive]}
                  onPress={() => setEditGrade(g)} activeOpacity={0.8}>
                  <Text style={[styles.chipTxt, editGrade === g && styles.chipTxtActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
              {!editCurriculum && <Text style={styles.hintTxt}>Pick a curriculum above to see grade options.</Text>}
            </View>

            {/* Location — searchable city dropdown (city name only) + "use my location" */}
            <View style={styles.lblRow}>
              <Text style={styles.fieldLabel}>Location</Text>
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={styles.locateBtn}
                  onPress={() => locateFull(({ city }) => { if (city) setEditLocation(city); }, setLocating)}
                  disabled={locating}
                  activeOpacity={0.8}
                >
                  <Feather name="crosshair" size={12} color={colors.accentYellow} />
                  <Text style={styles.locateTxt}>{locating ? 'Locating...' : 'Use my location'}</Text>
                </TouchableOpacity>
              )}
            </View>
            <SelectField
              value={editLocation}
              onChange={setEditLocation}
              options={ALL_CITIES}
              placeholder="Select your city"
              searchPlaceholder="Search city..."
              colors={colors}
              styles={{ ...styles, input: styles.pickerInput }}
            />

            <Text style={styles.fieldLabel}>School</Text>
            <View style={styles.inputRow}>
              <Feather name="home" size={14} color={colors.textDim} />
              <TextInput style={styles.input} placeholder="e.g. DPS Bengaluru" placeholderTextColor={colors.textDim} value={editSchool} onChangeText={setEditSchool} autoCapitalize="words" />
            </View>

            <Text style={styles.fieldLabel}>Bio</Text>
            <View style={styles.inputRow}>
              <Feather name="edit-2" size={14} color={colors.textDim} />
              <TextInput style={styles.input} placeholder="A short tagline…" placeholderTextColor={colors.textDim} value={editBio} onChangeText={setEditBio} autoCapitalize="sentences" />
            </View>

            {!!saveProfileError && (
              <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{saveProfileError}</Text>
            )}
          </ScrollView>
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saveProfileLoading}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saveProfileLoading && { opacity: 0.6 }]} onPress={onSave} disabled={saveProfileLoading}>
              {saveProfileLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
