import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import SERVER_URL from '../../../../config/serverUrl';
import { pickAndUploadPicture } from '../utils/pictureUpload';
import type { PictureSlot } from '../utils/quizEditing';

// One picture in the Edit tab (the task picture, or a question's own): shown
// as in Preview, with Move to / Replace / Remove under it. With no picture it
// is a small "Add picture" button.

const resolveUri = (url: string) => (url.startsWith('http') || url.startsWith('data:') ? url : `${SERVER_URL}${url}`);

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

const chip = { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(195,220,216,0.25)', backgroundColor: '#252525' } as const;
const chipText = { fontSize: 12, fontWeight: '600', color: '#D8E8E6' } as const;

export function EditablePicture({ url, height, addLabel, moveTargets, onSet, onMove, testID }: {
  url: string | null;
  height: number;
  addLabel: string;
  moveTargets: { slot: PictureSlot; label: string }[];
  onSet: (url: string | null) => void;
  onMove: (to: PictureSlot) => void;
  testID?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [moving, setMoving] = React.useState(false);

  const pick = async () => {
    setBusy(true);
    try {
      const next = await pickAndUploadPicture();
      if (next) onSet(next);
    } catch (e: any) {
      notify('Picture not added', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!url) {
    return (
      <TouchableOpacity testID={testID ? `${testID}-add` : undefined} onPress={pick} disabled={busy} activeOpacity={0.75}
        style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(195,220,216,0.35)' }}>
        {busy ? <ActivityIndicator size="small" color="#BAA467" /> : <Feather name="image" size={14} color="#A8B5B3" />}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#A8B5B3' }}>{busy ? 'Uploading…' : addLabel}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View testID={testID} style={{ marginBottom: 12 }}>
      <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(195,220,216,0.2)', backgroundColor: '#fff', padding: 8 }}>
        <Image source={{ uri: resolveUri(url) }} style={{ width: '100%', height, resizeMode: 'contain' }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {moveTargets.length > 0 && (
          <TouchableOpacity testID={testID ? `${testID}-move` : undefined} style={chip} onPress={() => setMoving(m => !m)} activeOpacity={0.75}>
            <Feather name="move" size={13} color="#D8E8E6" />
            <Text style={chipText}>Move to…</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity testID={testID ? `${testID}-replace` : undefined} style={chip} onPress={pick} disabled={busy} activeOpacity={0.75}>
          {busy ? <ActivityIndicator size="small" color="#BAA467" /> : <Feather name="refresh-cw" size={13} color="#D8E8E6" />}
          <Text style={chipText}>{busy ? 'Uploading…' : 'Replace'}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={testID ? `${testID}-remove` : undefined} style={chip} onPress={() => onSet(null)} activeOpacity={0.75}>
          <Feather name="trash-2" size={13} color="#f85149" />
          <Text style={[chipText, { color: '#f85149' }]}>Remove</Text>
        </TouchableOpacity>
      </View>
      {moving && (
        <View style={{ marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', gap: 6 }}>
          <Text style={{ fontSize: 11, color: '#8b949e' }}>Move this picture to (a picture already there comes here):</Text>
          {moveTargets.map((t, i) => (
            <TouchableOpacity key={i} testID={testID ? `${testID}-move-${i}` : undefined} style={chip} activeOpacity={0.75}
              onPress={() => { setMoving(false); onMove(t.slot); }}>
              <Feather name="corner-down-right" size={13} color="#BAA467" />
              <Text style={chipText}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
