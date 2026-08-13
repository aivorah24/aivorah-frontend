import React from 'react';
import { Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal } from './shared';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  newLocation: string;
  setNewLocation: (v: string) => void;
  locationLoading: boolean;
  onSave: () => void;
  colors: any;
  styles: any;
}

export default function LocationModal({ visible, onClose, newLocation, setNewLocation, locationLoading, onSave, colors, styles }: LocationModalProps) {
  return (
    <AppModal visible={visible} title="Update Location" onClose={onClose} styles={styles} colors={colors} testID="settings-modal-location">
      <Text style={styles.modalFieldLabel}>City or region</Text>
      <View style={styles.modalInput}>
        <Feather name="map-pin" size={15} color={colors.textDim} />
        <TextInput
          testID="settings-modal-location-input"
          style={[styles.modalTextInput, { flex: 1 }]}
          value={newLocation}
          onChangeText={setNewLocation}
          placeholder="e.g. Hyderabad"
          placeholderTextColor={colors.textDim}
          autoFocus
        />
      </View>
      <View style={[styles.modalBtns, { marginTop: 20 }]}>
        <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} testID="settings-modal-location-cancel-button">
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="settings-modal-location-save-button"
          style={[styles.modalSaveBtn, locationLoading && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={locationLoading}
        >
          {locationLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}
