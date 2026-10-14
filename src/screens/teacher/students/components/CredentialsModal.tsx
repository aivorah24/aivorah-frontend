import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  colors: AppColors;
  gold: string;
  styles: any;
  credsName: string;
  credsEmail: string;
  credsPassword: string;
  credsCopiedField: string;
  copyCredsField: (text: string, field: string) => void;
  shareCredsToStudent: (name: string, email: string, password: string) => void;
  // Real-email student: invite + verification were emailed, no password to share.
  invited?: boolean;
  inviteWarning?: string;
}

export default function CredentialsModal({
  visible, onClose, colors, gold, styles,
  credsName, credsEmail, credsPassword, credsCopiedField,
  copyCredsField, shareCredsToStudent, invited = false, inviteWarning = '',
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View testID="teacher-students-creds-modal" style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#5A8A7020', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="check-circle" size={16} color={colors.accentGreen} />
              </View>
              <Text style={styles.modalTitle}>{invited ? 'Invite Sent' : 'Account Created'}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {invited ? (
            <>
              <Text testID="teacher-students-invite-sent" style={styles.modalNote}>
                {credsName} has been added to your class. We emailed {credsEmail} a link to set their password and verify their email — they can use Aivorah once verified.
              </Text>
              {inviteWarning ? <Text style={{ fontSize: 12, color: colors.accentRed, lineHeight: 18 }}>{inviteWarning}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.modalNote}>{credsName} has been added to your class. Share these credentials with the student.</Text>

              {[
                { label: 'Login Email / ID', value: credsEmail, field: 'cEmail' },
                { label: 'Password', value: credsPassword, field: 'cPass' },
              ].map(item => (
                <View key={item.label} style={{ marginBottom: 10 }}>
                  <Text style={styles.modalFieldLabel}>{item.label}</Text>
                  <View style={[styles.modalInput, { backgroundColor: colors.bgDark, flexDirection: 'row', alignItems: 'center' }]}>
                    <Text style={[styles.modalTextInput, { flex: 1, color: colors.textMain }]}>{item.value}</Text>
                    <TouchableOpacity onPress={() => copyCredsField(item.value, item.field)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 8 }}>
                      <Feather name={credsCopiedField === item.field ? 'check' : 'copy'} size={15} color={credsCopiedField === item.field ? colors.accentGreen : colors.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', justifyContent: 'center', gap: 6, backgroundColor: gold + '18', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginTop: 2, marginBottom: 4 }}
                onPress={() => shareCredsToStudent(credsName, credsEmail, credsPassword)}
                activeOpacity={0.8}
              >
                <Feather name="share-2" size={13} color={gold} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: gold }}>Share Login Details</Text>
              </TouchableOpacity>

              <View style={{ backgroundColor: gold + '18', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: gold + '30', marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                  The student can log in immediately with these credentials. Save them now — the password cannot be retrieved later.
                </Text>
              </View>
            </>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
            <TouchableOpacity
              testID="teacher-students-creds-done-button"
              style={[styles.modalSaveBtn, { flex: 0, alignSelf: 'center', height: 40, paddingHorizontal: 36 }]}
              onPress={onClose}
            >
              <Text style={styles.modalSaveText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
