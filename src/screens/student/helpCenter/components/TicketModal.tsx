import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface TicketModalProps {
  visible: boolean;
  onClose: () => void;
  userEmail: string | undefined;
  subject: string;
  setSubject: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  colors: AppColors;
}

export default function TicketModal({
  visible, onClose, userEmail, subject, setSubject, message, setMessage, loading, onSubmit, colors,
}: TicketModalProps) {
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textMain }]}>Submit Support Ticket</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close ticket form">
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.ticketNote, { color: colors.textMuted }]}>Submitting as: <Text style={{ color: colors.accentYellow }}>{userEmail || 'guest'}</Text></Text>
          <Text style={[styles.modalArticlesLabel, { color: colors.textDim }]}>Subject</Text>
          <View style={[styles.ticketInput, { borderColor: colors.borderColor, backgroundColor: colors.bgDark }]}>
            <TextInput style={[styles.ticketTextInput, { color: colors.textMain }]} value={subject} onChangeText={setSubject} placeholder="Brief summary of your issue" placeholderTextColor={colors.textDim} autoFocus />
          </View>
          <Text style={[styles.modalArticlesLabel, { color: colors.textDim }]}>Describe your issue</Text>
          <View style={[styles.ticketInput, { height: 100, alignItems: 'flex-start', paddingTop: spacing.md, borderColor: colors.borderColor, backgroundColor: colors.bgDark }]}>
            <TextInput style={[styles.ticketTextInput, { color: colors.textMain, textAlignVertical: 'top' }]} value={message} onChangeText={setMessage} placeholder="Please provide as much detail as possible..." placeholderTextColor={colors.textDim} multiline numberOfLines={4} />
          </View>
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.borderColor }]} onPress={onClose}>
              <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.accentYellow }]} onPress={onSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>Submit Ticket</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 480 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalArticlesLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md, marginTop: spacing.md },
  ticketNote: { fontSize: 13, marginBottom: spacing.sm },
  ticketInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, minHeight: 46 },
  ticketTextInput: { flex: 1, fontSize: 14, paddingVertical: spacing.md },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalSaveBtn: { flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: 'white' },
});
