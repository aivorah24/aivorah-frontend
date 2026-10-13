import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../config/firebase';
import { BLOCKED_ACCOUNT_MESSAGE } from '../../../constants/supportContact';

// A dedicated sign-in page for the Aivorah Admin page (Platform Overview
// etc.) — not the student/teacher/parent signup flow. Still a real Firebase
// email+password sign-in (no separate password store), and access is still
// decided server-side by the ADMIN_EMAILS allowlist — this page just gives
// admin sign-in its own clean entry point instead of only being reachable
// as a shield icon inside an already-signed-in persona account. On success
// the normal App.tsx auth listener takes over and routes in as usual; the
// allowed account then uses the Header's shield icon as before.

const PRIMARY = '#BAA467';
const BG = '#0B0B0B';
const CARD = '#141414';
const BORDER = 'rgba(245,243,238,0.14)';
const TEXT = '#F5F3EE';
const MUTED = '#A9B0AC';
const RED = '#E07A7A';

export default function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setSigning(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // App.tsx's auth-state listener takes it from here.
    } catch (e: any) {
      setError(e?.code === 'auth/invalid-credential' ? 'Incorrect email or password.'
        : e?.code === 'auth/user-disabled' ? BLOCKED_ACCOUNT_MESSAGE
        : (e?.message || 'Sign-in failed. Please try again.'));
      setSigning(false);
    }
  }

  return (
    <View style={s.screen}>
      <View style={s.card} testID="admin-login-card">
        <View style={s.logoRow}>
          <View style={s.logoBox}>
            <Feather name="shield" size={20} color="#fff" />
          </View>
          <Text style={s.logoText}>Aivorah Admin</Text>
        </View>
        <Text style={s.mutedText}>Sign in with your admin account.</Text>

        <View style={s.field}>
          <Text style={s.label}>Email</Text>
          <View style={s.inputRow}>
            <TextInput
              testID="admin-login-email"
              style={s.input}
              placeholder="you@aivorah.ai"
              placeholderTextColor={MUTED}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Password</Text>
          <View style={s.inputRow}>
            <TextInput
              testID="admin-login-password"
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              onSubmitEditing={handleSignIn}
            />
            <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={s.eyeBtn} accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
              <Feather name={showPw ? 'eye-off' : 'eye'} size={16} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {!!error && (
          <View style={s.errorRow} testID="admin-login-error">
            <Feather name="alert-circle" size={13} color={RED} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity testID="admin-login-submit" style={[s.btn, signing && { opacity: 0.6 }]} onPress={handleSignIn} disabled={signing} activeOpacity={0.85}>
          {signing ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={s.btnText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 32, gap: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  logoBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: '800', color: TEXT },
  mutedText: { fontSize: 14, color: MUTED },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 10, overflow: 'hidden' },
  input: { flex: 1, backgroundColor: BG, paddingHorizontal: 14, paddingVertical: 13, color: TEXT, fontSize: 14 },
  eyeBtn: { paddingHorizontal: 14 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: RED + '12', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: RED + '30' },
  errorText: { fontSize: 13, color: RED, flex: 1 },
  btn: { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#0B0B0B', fontWeight: '700', fontSize: 15 },
});
