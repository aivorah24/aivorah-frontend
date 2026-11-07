/**
 * FaceLoginCard - turn face login on for this device, see where it is on, and
 * remove it. Used in each role's Settings ("manage") and on the Verify Email
 * screen right after sign-up when the user ticked "Add face login" ("setup").
 * Renders nothing where the browser / device can't do face login.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  faceLoginAvailable, addFaceLogin, listFaceLogins, removeFaceLogin, faceLoginErrorMessage, rememberFaceLoginOffer, FaceLogin,
} from '../../services/faceLogin';

type Colors = { cardDark: string; borderColor: string; textMain: string; textMuted: string; accentYellow: string; accentRed?: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso?: string | null) => {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export default function FaceLoginCard({ colors, variant = 'manage', onDone }: {
  colors: Colors;
  variant?: 'manage' | 'setup';
  onDone?: () => void;   // setup: added or skipped
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [items, setItems] = useState<FaceLogin[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const red = colors.accentRed || '#C98A8A';

  const load = useCallback(async () => {
    try { setItems(await listFaceLogins()); } catch { /* the add button still works */ }
  }, []);

  useEffect(() => {
    let alive = true;
    faceLoginAvailable().then((ok) => {
      if (!alive) return;
      setAvailable(ok);
      if (ok && variant === 'manage') load();
    });
    return () => { alive = false; };
  }, [variant, load]);

  if (!available) return null;

  const add = async () => {
    setBusy(true); setError('');
    try {
      await addFaceLogin();
      setAdded(true);
      rememberFaceLoginOffer(false);
      if (variant === 'manage') await load();
      else onDone?.();
    } catch (e: any) {
      setError(faceLoginErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setBusy(true); setError('');
    try { await removeFaceLogin(id); await load(); }
    catch (e: any) { setError(e?.message || 'Could not remove face login'); }
    finally { setBusy(false); }
  };

  return (
    <View testID="face-login-card" style={[s.card, { backgroundColor: colors.cardDark, borderColor: colors.accentYellow + '55' }]}>
      <View style={s.head}>
        <View style={[s.icon, { backgroundColor: colors.accentYellow + '22' }]}><Feather name="smile" size={18} color={colors.accentYellow} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.textMain }]}>{variant === 'setup' ? 'Add face login? (optional)' : 'Face login'}</Text>
          <Text style={[s.sub, { color: colors.textMuted }]}>
            Sign in with this device&apos;s face unlock (Face ID, Windows Hello or Android face / fingerprint) instead of typing your password. Your face never leaves your device.
          </Text>
        </View>
      </View>

      {variant === 'manage' && items.length > 0 && (
        <View style={{ gap: 6 }}>
          {items.map((it) => (
            <View key={it.id} testID="face-login-device" style={[s.row, { borderColor: colors.borderColor }]}>
              <Feather name="check-circle" size={14} color={colors.accentYellow} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 13.5 }}>{it.deviceLabel || 'A device'}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {`Added ${day(it.createdAt)}${it.lastUsedAt ? ` · last used ${day(it.lastUsedAt)}` : ''}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => remove(it.id)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Remove face login on ${it.deviceLabel || 'this device'}`}>
                <Text style={{ color: red, fontWeight: '700', fontSize: 12.5 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!!error && <Text style={[s.msg, { color: red }]}>{error}</Text>}
      {added && variant === 'manage' && <Text style={[s.msg, { color: colors.accentYellow }]}>Face login is on for this device.</Text>}

      <View style={s.btns}>
        <TouchableOpacity testID="face-login-add" onPress={add} disabled={busy} style={[s.btn, { backgroundColor: colors.accentYellow, opacity: busy ? 0.6 : 1 }]} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#fff" /> : (
            <>
              <Feather name="smile" size={14} color="#fff" />
              <Text style={s.btnText}>{variant === 'setup' ? 'Set up face login' : 'Add face login on this device'}</Text>
            </>
          )}
        </TouchableOpacity>
        {variant === 'setup' && (
          <TouchableOpacity testID="face-login-skip" onPress={() => { rememberFaceLoginOffer(false); onDone?.(); }} style={[s.btn, { borderWidth: 1, borderColor: colors.borderColor }]} accessibilityRole="button">
            <Text style={[s.btnText, { color: colors.textMuted }]}>Not now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 12, marginBottom: 16 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 10 },
  msg: { fontSize: 12.5, lineHeight: 18 },
  btns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
});
