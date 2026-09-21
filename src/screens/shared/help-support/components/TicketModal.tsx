import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../../theme';

export function TicketModal({
  colors, styles, visible, onClose, email,
  ticketSubject, setTicketSubject, ticketMessage, setTicketMessage,
  ticketLoading, ticketError, ticketSuccess, onSubmit,
}: {
  colors: any; styles: any; visible: boolean; onClose: () => void; email?: string;
  ticketSubject: string; setTicketSubject: (v: string) => void;
  ticketMessage: string; setTicketMessage: (v: string) => void;
  ticketLoading: boolean; ticketError: string; ticketSuccess: string;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submit Support Ticket</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {ticketSuccess ? (
            <>
              <View style={[styles.hintBox, { backgroundColor: colors.accentYellow + '15', borderColor: colors.accentYellow + '40' }]}>
                <Text style={{ color: colors.textMain, fontWeight: '700', marginBottom: 4 }}>Ticket Submitted!</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{ticketSuccess}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" style={styles.modalSaveBtn} onPress={onClose}>
                <Text style={styles.modalSaveText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.ticketNote}>
                Submitting as: <Text style={{ color: colors.accentYellow }}>{email || 'guest'}</Text>
              </Text>
              <Text style={styles.modalFieldLabel}>Subject</Text>
              <View style={styles.ticketInput}>
                <TextInput
                  style={styles.ticketTextInput} value={ticketSubject} onChangeText={setTicketSubject}
                  placeholder="Brief summary of your issue" placeholderTextColor={colors.textDim} autoFocus
                />
              </View>
              <Text style={styles.modalFieldLabel}>Describe your issue</Text>
              <View style={[styles.ticketInput, { height: 100, alignItems: 'flex-start', paddingTop: spacing.md }]}>
                <TextInput
                  style={[styles.ticketTextInput, { textAlignVertical: 'top' }]}
                  value={ticketMessage} onChangeText={setTicketMessage}
                  placeholder="Please provide as much detail as possible..."
                  placeholderTextColor={colors.textDim} multiline numberOfLines={4}
                />
              </View>
              {ticketError ? <Text style={styles.errorTxt}>{ticketError}</Text> : null}
              <View style={styles.modalBtns}>
                <TouchableOpacity accessibilityRole="button" style={styles.modalCancelBtn} onPress={onClose}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.modalSaveBtn} onPress={onSubmit} disabled={ticketLoading}>
                  {ticketLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>Submit Ticket</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
