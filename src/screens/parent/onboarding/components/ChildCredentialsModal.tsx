import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChildCredential } from '../types';

const TEAL = '#5F8A86';

export function ChildCredentialsModal({
  colors, styles, teal = TEAL, visible, onClose, creds, copiedField, onCopy, onShare,
}: {
  colors: any; styles: any; teal?: string; visible: boolean; onClose: () => void;
  creds: ChildCredential[]; copiedField: string;
  onCopy: (text: string, field: string) => void;
  onShare: (cred: { name: string; loginId: string; password: string }) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { maxHeight: '80%' as any }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: teal + '20', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="key" size={17} color={teal} />
            </View>
            <View>
              <Text style={styles.modalTitle}>{creds.length > 1 ? 'Child Accounts Created' : 'Child Account Created'}</Text>
              <Text style={styles.modalText}>Share these login details with your {creds.length > 1 ? 'children' : 'child'}</Text>
            </View>
          </View>
          <ScrollView style={{ flexGrow: 0 }}>
            {creds.map((cred, idx) => (
              <View key={idx} style={{ backgroundColor: colors.bgDark, borderRadius: 10, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.borderColor, marginBottom: idx < creds.length - 1 ? 12 : 0 }}>
                {creds.length > 1 && <Text style={{ fontSize: 14, fontWeight: '700', color: teal }}>{cred.name}</Text>}
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>Save these — {cred.name} uses them to log in as a Student on any device.</Text>
                {[
                  { label: 'Login ID (Email)', value: cred.loginId, field: `loginId-${idx}` },
                  ...(cred.password ? [{ label: 'Password', value: cred.password, field: `password-${idx}` }] : []),
                ].map(({ label, value, field }) => (
                  <View key={field} style={{ gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardDark, borderWidth: 1, borderColor: copiedField === field ? teal : colors.borderColor, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
                      onPress={() => onCopy(value, field)} activeOpacity={0.7}>
                      <Text style={{ flex: 1, color: colors.textMain, fontSize: 13, fontFamily: 'monospace' }} selectable>{value}</Text>
                      <Feather name={copiedField === field ? 'check' : 'copy'} size={14} color={copiedField === field ? teal : colors.textDim} />
                    </TouchableOpacity>
                  </View>
                ))}
                {cred.verificationRequired && (
                  <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
                    Login details were also emailed to <Text style={{ fontWeight: '700', color: colors.textMain }}>{cred.loginId}</Text>.
                  </Text>
                )}
                {!!cred.password && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: teal + '15', borderWidth: 1, borderColor: teal + '40', borderRadius: 8, paddingVertical: 9 }}
                    onPress={() => onShare(cred)} activeOpacity={0.8}>
                    <Feather name="share-2" size={13} color={teal} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: teal }}>Share credentials</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.modalBtnText}>Got it, I&apos;ve saved these</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
