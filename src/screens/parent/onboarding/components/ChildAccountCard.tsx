import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CardHeader } from '../../../onboarding/OnboardingSharedFields';
import type { ChildEntry } from '../types';

const TEAL = '#5F8A86';
const FOREST = '#5A8A70';

export function ChildAccountCard({
  colors, styles, teal = TEAL, forest = FOREST, done,
  childrenList, activeChildIdx, activeChild, selectChild, updateChild,
  showChildPassword, setShowChildPassword,
  otp,
}: {
  colors: any; styles: any; teal?: string; forest?: string; done: boolean;
  childrenList: ChildEntry[]; activeChildIdx: number; activeChild: ChildEntry;
  selectChild: (idx: number) => void;
  updateChild: (field: keyof ChildEntry, value: string) => void;
  showChildPassword: boolean; setShowChildPassword: (updater: (v: boolean) => boolean) => void;
  otp: {
    otpSent: boolean; otpCode: string; setOtpCode: (v: string) => void; otpErr: string;
    otpSending: boolean; otpVerifying: boolean; otpCooldown: number;
    onChildEmailChange: (v: string) => void; sendOtp: () => void; verifyOtp: () => void;
    childEmailValid: boolean; childEmailVerified: boolean;
  };
}) {
  const isTeenOrOlder = (activeChild.age ? parseInt(activeChild.age, 10) : 0) >= 14;

  return (
    <View style={[styles.card, styles.cardFull]}>
      <CardHeader icon="key" title="4. Child's Account" subtitle="Link or create their login." done={done} styles={styles} />

      {childrenList.length > 1 && (
        <View style={styles.chipRow}>
          {childrenList.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, activeChildIdx === i && styles.chipActive]}
              onPress={() => selectChild(i)}
              activeOpacity={0.8}>
              <Text style={[styles.chipTxt, activeChildIdx === i && styles.chipTxtActive]}>
                {c.name.trim() || `Child ${i + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isTeenOrOlder ? (
        <>
          <View style={[styles.hintBox, { backgroundColor: teal + '12', borderColor: teal + '30' }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: teal, marginBottom: 4 }}>Link {activeChild.name || 'your child'}&apos;s Account</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
              Students 14+ have their own Aivorah account. Ask your child for their registered email, then enter it below to link it to your parent dashboard.
            </Text>
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, styles.fieldThird]}>
              <Text style={styles.lbl}>Child&apos;s Registered Email</Text>
              <TextInput style={styles.input} value={activeChild.linkEmail} onChangeText={(v) => updateChild('linkEmail', v)}
                placeholder="child@email.com" placeholderTextColor={colors.textDim}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={[styles.fieldGroup, styles.fieldThird, { justifyContent: 'center' }]}>
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
                If your child hasn&apos;t signed up yet, ask them to create a Student account first, then come back to complete this step.
              </Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.hintBox, { backgroundColor: forest + '12', borderColor: forest + '30' }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: forest, marginBottom: 4 }}>Create {activeChild.name || 'your child'}&apos;s Login</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
              Aivorah will set up a Student account for {activeChild.name || 'your child'} using the details below — you&apos;ll get their login ID and password to share with them.
            </Text>
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, styles.fieldHalf]}>
              <Text style={styles.lbl}>{childrenList.length > 1 ? `${activeChild.name || 'Child'}'s Email (optional)` : "Child's Email (optional)"}</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput style={[styles.input, { flex: 1 }]} value={activeChild.email} onChangeText={otp.onChildEmailChange}
                  placeholder="child@email.com" placeholderTextColor={colors.textDim}
                  keyboardType="email-address" autoCapitalize="none" editable={!otp.childEmailVerified} />
                {otp.childEmailValid && !otp.childEmailVerified && (
                  <TouchableOpacity
                    onPress={otp.sendOtp}
                    disabled={otp.otpSending || otp.otpCooldown > 0}
                    style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8, backgroundColor: teal, opacity: (otp.otpSending || otp.otpCooldown > 0) ? 0.5 : 1 }}
                    activeOpacity={0.85}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0b0b0b' }}>
                      {otp.otpSending ? 'Sending…' : otp.otpCooldown > 0 ? `Resend (${otp.otpCooldown}s)` : (otp.otpSent ? 'Resend' : 'Send Code')}
                    </Text>
                  </TouchableOpacity>
                )}
                {otp.childEmailVerified && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(143,230,174,0.15)', borderWidth: 1, borderColor: 'rgba(143,230,174,0.4)' }}>
                    <Feather name="check-circle" size={14} color="#8FE6AE" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#8FE6AE' }}>Verified</Text>
                  </View>
                )}
              </View>
              {otp.otpSent && !otp.childEmailVerified && (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={otp.otpCode} onChangeText={otp.setOtpCode}
                    placeholder="Enter 6-digit code" placeholderTextColor={colors.textDim}
                    keyboardType="number-pad" maxLength={6} />
                  <TouchableOpacity onPress={otp.verifyOtp} disabled={otp.otpVerifying}
                    style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, backgroundColor: teal, opacity: otp.otpVerifying ? 0.5 : 1 }}
                    activeOpacity={0.85}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0b0b0b' }}>{otp.otpVerifying ? 'Verifying…' : 'Verify'}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {otp.otpErr !== '' && <Text style={[styles.subHint, { color: '#E07F7F' }]}>{otp.otpErr}</Text>}
              <Text style={styles.subHint}>
                {otp.childEmailVerified
                  ? 'Email verified. You can continue.'
                  : 'Leave blank — Aivorah auto-generates a login ID. If you enter a real email, verify it with the code we send.'}
              </Text>
            </View>
            <View style={[styles.fieldGroup, styles.fieldHalf]}>
              <Text style={styles.lbl}>Password (optional)</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[styles.input, { paddingRight: 48 }]}
                  value={activeChild.password}
                  onChangeText={(v) => updateChild('password', v)}
                  placeholder="Leave blank to auto-generate"
                  placeholderTextColor={colors.textDim}
                  secureTextEntry={!showChildPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  importantForAutofill="no"
                />
                <TouchableOpacity
                  style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
                  onPress={() => setShowChildPassword((v) => !v)}
                  activeOpacity={0.7}>
                  <Feather name={showChildPassword ? 'eye-off' : 'eye'} size={16} color={colors.textDim} />
                </TouchableOpacity>
              </View>
              {activeChild.password.length > 0 && activeChild.password.length < 6 && (
                <Text style={{ fontSize: 12, color: '#ef4444' }}>Password must be at least 6 characters.</Text>
              )}
              <Text style={styles.subHint}>Set a password your child will remember, or leave blank to auto-generate one.</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
