import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import type { ChildData } from '../../types';

export default function CredentialsModal({
  credsChild, creds, loading, copiedField, onCopy, onClose, colors, s,
}: {
  credsChild: ChildData | null; creds: any; loading: boolean; copiedField: string;
  onCopy: (text: string, field: string) => void; onClose: () => void;
  colors: AppColors; s: any;
}) {
  return (
    <Modal visible={!!credsChild} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentYellow + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="key" size={16} color={colors.accentYellow} />
              </View>
              <View>
                <Text style={s.modalTitle}>Login Info</Text>
                <Text style={s.modalDesc}>{credsChild?.name}&apos;s credentials</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ paddingVertical: 24 }} />
          ) : (
            <View style={{ backgroundColor: colors.bgDark, borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.borderColor }}>
              <Text style={[s.modalDesc, { textAlign: 'center' }]}>Your child uses these to log in as a Student.</Text>
              {[
                creds?.studentId    ? { label: 'Student ID',       value: creds.studentId,        field: 'dstu'   } : null,
                creds?.loginId      ? { label: 'Login ID (Email)', value: creds.loginId,           field: 'dlogin' } : null,
                creds?.initialPassword ? { label: 'Password',      value: creds.initialPassword,  field: 'dpass'  } : null,
              ].filter(Boolean).map(({ label, value, field }: any) => (
                <View key={field} style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: copiedField === field ? colors.accentYellow : colors.borderColor, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: colors.cardDark }}
                    onPress={() => onCopy(value, field)} activeOpacity={0.7}
                  >
                    <Text style={{ flex: 1, color: colors.textMain, fontSize: 13, fontFamily: 'monospace' }} selectable>{value}</Text>
                    <Feather name={copiedField === field ? 'check' : 'copy'} size={14} color={copiedField === field ? colors.accentYellow : colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              {!creds?.initialPassword && (
                <View style={{ backgroundColor: '#ef444415', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ef444430' }}>
                  <Text style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', lineHeight: 18 }}>
                    Password not saved for this account.{'\n'}
                    {creds?.loginId?.includes('@aivorah.')
                      ? 'Remove and re-add this child to generate fresh credentials.'
                      : 'Your child can use "Forgot Password" on the login screen.'}
                  </Text>
                </View>
              )}
            </View>
          )}
          <TouchableOpacity
            style={{ backgroundColor: colors.accentYellow, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 }}
            onPress={onClose} activeOpacity={0.8}
          >
            <Text style={{ color: '#0B0B0B', fontWeight: '700', fontSize: 15 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
