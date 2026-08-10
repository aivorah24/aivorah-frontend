import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function EditProfileModal({
  visible, onClose, editName, setEditName, email, editPhone, setEditPhone,
  editCity, setEditCity, saving, onSave, colors, s,
}: {
  visible: boolean; onClose: () => void;
  editName: string; setEditName: (v: string) => void;
  email: string;
  editPhone: string; setEditPhone: (v: string) => void;
  editCity: string; setEditCity: (v: string) => void;
  saving: boolean; onSave: () => void; colors: any; s: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalCard}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={s.modalLabel}>Full Name</Text>
          <TextInput style={s.modalInput} value={editName} onChangeText={setEditName}
            placeholder="Your full name" placeholderTextColor={colors.textDim} autoCapitalize="words" />
          <Text style={s.modalLabel}>Email Address</Text>
          <View style={[s.modalInput, { justifyContent: 'center', opacity: 0.5 }]}>
            <Text style={{ fontSize: 14, color: colors.textMain }}>{email}</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: -8 }}>You can update your email address anytime from Settings</Text>
          <Text style={s.modalLabel}>Contact Number</Text>
          <TextInput style={s.modalInput} value={editPhone} onChangeText={setEditPhone}
            placeholder="e.g. +91 98765 43210" placeholderTextColor={colors.textDim} keyboardType="phone-pad" />
          <Text style={s.modalLabel}>City</Text>
          <TextInput style={s.modalInput} value={editCity} onChangeText={setEditCity}
            placeholder="e.g. Hyderabad" placeholderTextColor={colors.textDim} />
          <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.85}>
            <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
